// Lazy-initialize Prisma Client to avoid crashing at module import time
// if `@prisma/client` hasn't been generated yet. This is especially helpful
// during `npm install`/build steps or when developers forget to run
// `npx prisma generate` after cloning.

let _PrismaClient: any = null
let _prismaInstance: any = undefined

function loadPrismaClient() {
  if (_PrismaClient) return _PrismaClient
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const pkg = require('@prisma/client')
    _PrismaClient = pkg.PrismaClient || pkg.default?.PrismaClient || pkg
    return _PrismaClient
  } catch (err) {
    // Don't throw here so the server can start; throw when someone actually
    // attempts to use the client so we can provide a helpful message then.
    _PrismaClient = null
    return null
  }
}

function createPrismaInstance() {
  if (typeof globalThis !== 'undefined') {
    const g = globalThis as any
    if (g.__prisma_instance) return g.__prisma_instance
    const PrismaClientClass = loadPrismaClient()
    if (!PrismaClientClass) {
      throw new Error('Prisma client not generated. Run `npx prisma generate` and restart the server.')
    }
    const inst = new PrismaClientClass()
    if (process.env.NODE_ENV !== 'production') g.__prisma_instance = inst
    return inst
  }
  const PrismaClientClass = loadPrismaClient()
  if (!PrismaClientClass) throw new Error('Prisma client not generated. Run `npx prisma generate` and restart the server.')
  return new PrismaClientClass()
}

// Export a proxy object so existing imports using `prisma.user.findUnique(...)`
// continue to work. The proxy will create the real PrismaClient on first use
// and surface a clear error if the generated client is missing.
export const prisma: any = new Proxy(
  {},
  {
    get(_, prop) {
      if (!_prismaInstance) {
        _prismaInstance = createPrismaInstance()
      }
      return Reflect.get(_prismaInstance, prop)
    },
    apply(_, thisArg, args) {
      if (!_prismaInstance) {
        _prismaInstance = createPrismaInstance()
      }
      return Reflect.apply(_prismaInstance, thisArg, args)
    },
  }
)

