export function isValidEmail(email: string) {
  if (!email || typeof email !== 'string') return false
  const re = /^[\w.-]+@[\w.-]+\.[A-Za-z]{2,}$/
  return re.test(email)
}

export function isValidUrl(url: string) {
  if (!url || typeof url !== 'string') return false
  try {
    const u = new URL(url)
    return ['http:', 'https:'].includes(u.protocol)
  } catch (e) {
    return false
  }
}

export function isLikelyNationalId(id: string) {
  if (!id || typeof id !== 'string') return false
  // basic heuristic: 6-20 alphanumeric
  return /^[A-Za-z0-9\-]{6,20}$/.test(id)
}

export function sanitizeShort(str: string) {
  if (!str || typeof str !== 'string') return ''
  return str.trim().replace(/[<>"'`]/g, '')
}
