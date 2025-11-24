import { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import GoogleProvider from 'next-auth/providers/google'
import FacebookProvider from 'next-auth/providers/facebook'
import TwitterProvider from 'next-auth/providers/twitter'
import { prisma } from './prisma'
import bcrypt from 'bcryptjs'

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    }),
    FacebookProvider({
      clientId: process.env.FACEBOOK_CLIENT_ID || '',
      clientSecret: process.env.FACEBOOK_CLIENT_SECRET || '',
    }),
    TwitterProvider({
      clientId: process.env.TWITTER_CLIENT_ID || '',
      clientSecret: process.env.TWITTER_CLIENT_SECRET || '',
      version: '2.0',
    }),
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
          include: {
            patientProfile: true,
            doctorProfile: true
          }
        })

        if (!user) {
          return null
        }

        if (!user.isVerified) {
          throw new Error('Please verify your email before signing in.')
        }

        const isValid = await bcrypt.compare(credentials.password, user.password)

        if (!isValid) {
          return null
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          isVerified: user.isVerified,
          doctorProfile: user.doctorProfile,
          patientProfile: user.patientProfile
        }
      }
    })
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      // Handle social login - create or update user in database
      if (account?.provider !== 'credentials' && user.email) {
        try {
          const existingUser = await prisma.user.findUnique({
            where: { email: user.email }
          })

          if (!existingUser) {
            // Create new user from social login
            await prisma.user.create({
              data: {
                email: user.email,
                name: user.name || 'User',
                password: '', // No password for social logins
                role: 'PATIENT',
                isVerified: true, // Social logins are pre-verified
                phone: null,
                patientProfile: {
                  create: {}
                }
              }
            })
          }
        } catch (error) {
          console.error('Error creating user from social login:', error)
          return false
        }
      }
      return true
    },
    async jwt({ token, user, account }) {
      if (user) {
        // Fetch user from database to get role
        const dbUser = await prisma.user.findUnique({
          where: { email: user.email! },
          include: {
            patientProfile: true,
            doctorProfile: true
          }
        })

        if (dbUser) {
          token.role = dbUser.role
          token.id = dbUser.id
          token.isVerified = dbUser.isVerified
          token.doctorProfile = dbUser.doctorProfile
          token.patientProfile = dbUser.patientProfile
        }
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        ;(session.user as any).role = token.role as string
        ;(session.user as any).id = token.id as string
        ;(session.user as any).isVerified = token.isVerified as boolean
        ;(session.user as any).doctorProfile = token.doctorProfile as any
        ;(session.user as any).patientProfile = token.patientProfile as any
      }
      return session
    }
  },
  pages: {
    signIn: '/login',
  },
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  secret: process.env.NEXTAUTH_SECRET,
  cookies: {
    sessionToken: {
      name: `next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
      },
    },
  },
}

