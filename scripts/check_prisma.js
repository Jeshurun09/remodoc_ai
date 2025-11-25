const fs = require('fs')
const path = require('path')

function checkPrismaClient() {
  const projectRoot = path.resolve(__dirname, '..')
  const clientPath = path.join(projectRoot, 'node_modules', '.prisma', 'client')
  const indexPath = path.join(clientPath, 'index.js')

  console.log('Project root:', projectRoot)
  console.log('Expecting Prisma client at:', clientPath)

  if (fs.existsSync(clientPath)) {
    console.log('Found .prisma/client folder.')
    if (fs.existsSync(indexPath)) {
      console.log('Found index.js inside .prisma/client — Prisma client appears generated.')
      process.exit(0)
    } else {
      console.error('No index.js inside .prisma/client — generation may be incomplete.')
      const files = fs.readdirSync(clientPath)
      console.error('Files in .prisma/client:', files)
      process.exit(2)
    }
  } else {
    console.error('.prisma/client not found under node_modules. Prisma client is not generated.')
    // Show node_modules listing for debugging
    const nmExists = fs.existsSync(path.join(projectRoot, 'node_modules'))
    console.error('node_modules exists:', nmExists)
    if (nmExists) {
      try {
        const entries = fs.readdirSync(path.join(projectRoot, 'node_modules'))
        console.error('Top-level node_modules entries (first 50):', entries.slice(0, 50))
      } catch (e) {
        console.error('Failed to list node_modules:', e.message)
      }
    }
    process.exit(1)
  }
}

checkPrismaClient()
