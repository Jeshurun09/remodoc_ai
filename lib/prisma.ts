import { PrismaClient } from '@prisma/client'

/**
 * Resolve and sanitize the MongoDB connection string.
 * Common Vercel misconfigurations that trigger:
 *   "the URL must start with the protocol `mongo`"
 * include wrapping quotes, leading/trailing whitespace, or accidentally
 * pasting `DATABASE_URL=` into the value field.
 */
function resolveDatabaseUrl(): string {
  // Bracket access avoids some bundlers statically replacing the identifier
  // with a build-time empty/wrong literal.
  const raw = process.env['DATABASE_URL']

  // Temporary diagnostics (never log the full secret)
  const exists = typeof raw === 'string' && raw.length > 0
  const preview = exists ? raw.slice(0, 15) : '(missing)'
  console.log('[prisma] DATABASE_URL exists:', exists)
  console.log('[prisma] DATABASE_URL prefix:', preview)

  if (!exists) {
    throw new Error(
      'DATABASE_URL is not set. Add a mongodb:// or mongodb+srv:// connection string to the environment.'
    )
  }

  let url = raw.trim()

  // Strip accidental wrapping quotes from Vercel / .env paste
  if (
    (url.startsWith('"') && url.endsWith('"')) ||
    (url.startsWith("'") && url.endsWith("'"))
  ) {
    url = url.slice(1, -1).trim()
  }

  // Strip accidental `DATABASE_URL=` prefix if the whole line was pasted as the value
  if (url.startsWith('DATABASE_URL=')) {
    url = url.slice('DATABASE_URL='.length).trim()
  }

  if (!url.startsWith('mongo')) {
    throw new Error(
      `Invalid DATABASE_URL: value must start with "mongodb://" or "mongodb+srv://". ` +
        `Received prefix: ${JSON.stringify(url.slice(0, 15))}`
    )
  }

  return url
}

const globalForPrisma = globalThis as unknown as {
  __prisma?: PrismaClient
}

function createPrismaClient(): PrismaClient {
  const datasourceUrl = resolveDatabaseUrl()
  return new PrismaClient({
    datasourceUrl,
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  })
}

export const prisma: any =
  globalForPrisma.__prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.__prisma = prisma
}
