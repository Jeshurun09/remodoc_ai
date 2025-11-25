import 'next-auth'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      email: string
      name: string
      role: string
      isVerified?: boolean
    }
  }

  interface User {
    id: string
    email: string
    name: string
    role: string
    isVerified?: boolean
    doctorProfile?: any
    patientProfile?: any
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string
    email?: string
    role: string
    isVerified?: boolean
    doctorProfile?: any
    patientProfile?: any
  }
}

