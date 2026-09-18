const tls = require('tls')

const hosts = [
  'ac-nbjadce-shard-00-00.acxt6x7.mongodb.net',
  'ac-nbjadce-shard-00-01.acxt6x7.mongodb.net',
  'ac-nbjadce-shard-00-02.acxt6x7.mongodb.net'
]

function check(host) {
  return new Promise(resolve => {
    const socket = tls.connect({ host, port: 27017, servername: host, timeout: 10000 }, () => {
      console.log(`${host} - secureConnect: authorized=${socket.authorized}`)
      socket.end()
      resolve()
    })

    socket.on('error', (e) => {
      console.error(`${host} - error:`, e && e.message)
      resolve()
    })

    socket.on('timeout', () => {
      console.error(`${host} - timeout`)
      socket.destroy()
      resolve()
    })
  })
}

(async () => {
  for (const h of hosts) await check(h)
  process.exit(0)
})()
