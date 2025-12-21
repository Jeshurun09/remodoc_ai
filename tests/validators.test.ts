import { describe, it, expect } from 'vitest'
import { isValidEmail, isValidUrl, isLikelyNationalId, sanitizeShort } from '../lib/validators'

describe('validators', () => {
  it('validates emails', () => {
    expect(isValidEmail('test@example.com')).toBe(true)
    expect(isValidEmail('invalid@com')).toBe(false)
  })

  it('validates urls', () => {
    expect(isValidUrl('https://example.com')).toBe(true)
    expect(isValidUrl('ftp://example.com')).toBe(false)
  })

  it('national id heuristic', () => {
    expect(isLikelyNationalId('A1234567')).toBe(true)
    expect(isLikelyNationalId('!@#$')).toBe(false)
  })

  it('sanitizes strings', () => {
    const out = sanitizeShort('<script>bad</script>')
    expect(out).not.toContain('<')
    expect(out).not.toContain('>')
    expect(out).toContain('bad')
  })
})
