export function isDbUnavailable(err: any): boolean {
  if (!err) return false
  const msg = (err.message || '').toString().toLowerCase()
  return (
    msg.includes('server selection') ||
    msg.includes('timed out') ||
    msg.includes('no available servers') ||
    msg.includes('replicaset') ||
    msg.includes('failed to connect')
  )
}
