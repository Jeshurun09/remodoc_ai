const { MongoClient } = require('mongodb')
const fs = require('fs')
const dns = require('dns').promises

// Load .env manually
try {
  const env = fs.readFileSync('.env', 'utf8')
  env.split(/\r?\n/).forEach(line => {
    const m = line.match(/^\s*([A-Z0-9_]+)=(.*)$/i)
    if (m) {
      const key = m[1]
      let val = m[2]
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1)
      }
      if (!process.env[key]) process.env[key] = val
    }
  })
} catch (e) {}

(async () => {
  const uri = process.env.DATABASE_URL
  if (!uri) {
    console.error('DATABASE_URL not set')
    process.exit(1)
  }

  console.log('Using DATABASE_URL prefix:', uri.slice(0, 40))

  // If mongodb+srv, print SRV records
  try {
    const m = uri.match(/mongodb\+srv:\/\/(.*?)(?:\/|\?|$)/)
    if (m) {
      const host = m[1]
      console.log('Resolving SRV for:', host)
      try {
        const srv = await dns.resolveSrv(`_mongodb._tcp.${host}`)
        console.log('SRV records:', srv)
      } catch (e) {
        console.error('SRV lookup failed:', e && e.message)
      }
    }
  } catch (e) {
    console.error('SRV check error:', e && e.message)
  }

  const client = new MongoClient(uri, { serverSelectionTimeoutMS: 20000 })
  try {
    await client.connect()
    console.log('MongoDB: connected')
    await client.db().admin().ping()
    console.log('MongoDB: ping ok')
  } catch (e) {
    console.error('MongoDB: connection error (full):', e)
  } finally {
    try { await client.close() } catch {}
    process.exit(0)
  }
})()
