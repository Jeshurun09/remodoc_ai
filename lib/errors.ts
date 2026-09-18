export function isDbUnavailable(err: unknown): boolean {
  if (!err) return false
  const msg = err instanceof Error
    ? err.message.toLowerCase()
    : String(err).toLowerCase()
  return (
    msg.includes('server selection') ||
    msg.includes('timed out') ||
    msg.includes('no available servers') ||
    msg.includes('replicaset') ||
    msg.includes('replicasetnoprimary') ||
    msg.includes('i/o error') ||
    msg.includes('econnreset') ||
    msg.includes('failed to connect')
  )
}
