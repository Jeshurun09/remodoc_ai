import { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import { prisma } from './prisma'
import bcrypt from 'bcryptjs'

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials) {
        try {
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
        } catch (error) {
          // Re-throw errors so they're handled properly by NextAuth
          // NextAuth will pass the error message to the client
          if (error instanceof Error) {
            throw error
          }
          // Log other errors and return null to show generic error
          console.error('[NextAuth Authorize] Error:', error)
          return null
        }
      }
    })
  ],
  callbacks: {
    async jwt({ token, user, trigger }) {
      try {
        // On initial sign-in, user object is provided with all user data
        if (user) {
          token.role = user.role
          token.id = user.id
          token.isVerified = user.isVerified
          token.doctorProfile = user.doctorProfile
          token.patientProfile = user.patientProfile
          token.email = user.email
          token.name = user.name
        }
        // If role is missing from token or session is being updated, fetch from database
        if ((!token.role || trigger === 'update') && token.id) {
          try {
            const dbUser = await prisma.user.findUnique({
              where: { id: token.id as string },
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
              token.email = dbUser.email
              token.name = dbUser.name
            }
          } catch (dbError) {
            // If database query fails, log but don't break the token
            console.error('[NextAuth JWT] Database error:', dbError)
            // Keep existing token data
          }
        }
        return token
      } catch (error) {
        console.error('[NextAuth JWT] Error:', error)
        return token
      }
    },
    async session({ session, token }) {
      try {
        // Ensure session and session.user exist
        if (!session) {
          return session
        }
        
        if (!session.user) {
          session.user = {
            id: '',
            email: '',
            name: '',
            role: '',
          }
        }

        // Set email from token if available (required by NextAuth)
        if (token.email) {
          session.user.email = token.email as string
        }

        // Set name from token if available
        if (token.name) {
          session.user.name = token.name as string
        }

        // Ensure role is always set from token
        if (token.role) {
          session.user.role = token.role as string
        }
        
        if (token.id) {
          session.user.id = token.id as string
        }
        
        if (token.isVerified !== undefined) {
          session.user.isVerified = token.isVerified as boolean
        }
        
        // Only set these if they exist
        if (token.doctorProfile) {
          session.user.doctorProfile = token.doctorProfile as any
        }
        
        if (token.patientProfile) {
          session.user.patientProfile = token.patientProfile as any
        }

        return session
      } catch (error) {
        console.error('[NextAuth Session] Error:', error)
        // Return a minimal valid session object on error
        return {
          ...session,
          user: {
            id: token?.id as string || '',
            email: token?.email as string || '',
            name: token?.name as string || '',
            role: token?.role as string || '',
          }
        }
      }
    }
  },
  pages: {
    signIn: '/login',
    error: '/login', // Redirect errors back to login page
  },
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  secret: process.env.NEXTAUTH_SECRET,
  debug: false,
  logger: {
    error(code, metadata) {
      // Only log errors in development, suppress in production to avoid _log endpoint issues
      if (process.env.NODE_ENV === 'development') {
        console.error('[NextAuth Error]', code, metadata)
      }
    },
    warn(code) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('[NextAuth Warning]', code)
      }
    },
    debug(code, metadata) {
      // Suppress debug logs
    },
  },
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

