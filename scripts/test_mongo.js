const { MongoClient } = require('mongodb')
const fs = require('fs')
// Load .env manually if dotenv is not installed
try {
  const env = fs.readFileSync('.env', 'utf8')
  env.split(/\r?\n/).forEach(line => {
    const m = line.match(/^\s*([A-Z0-9_]+)=(.*)$/i)
    if (m) {
      const key = m[1]
      let val = m[2]
      // Remove optional surrounding quotes
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1)
      }
      if (!process.env[key]) process.env[key] = val
    }
  })
} catch (e) {
  // ignore if .env not present
}

;(async () => {
  const uri = process.env.DATABASE_URL
  if (!uri) {
    console.error('DATABASE_URL not set')
    process.exit(1)
  }

  const client = new MongoClient(uri, { serverSelectionTimeoutMS: 5000 })
  try {
    await client.connect()
    console.log('MongoDB: connected')
    await client.db().admin().ping()
    console.log('MongoDB: ping ok')
  } catch (e) {
    console.error('MongoDB: connection error:', e.message)
  } finally {
    try { await client.close() } catch {}
    process.exit(0)
  }
})()
