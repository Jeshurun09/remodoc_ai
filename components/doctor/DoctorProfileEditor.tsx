'use client'

import { useState, useEffect } from 'react'

export default function DoctorProfileEditor() {
  const [form, setForm] = useState<Record<string, any>>({
    fullLegalName: '',
    nationalId: '',
    registrationNumber: '',
    registrationStatusUrl: '',
    licenseUrl: '',
    degreeUrl: '',
    internshipLetterUrl: '',
    postgraduateUrl: '',
    facilityName: '',
    facilityAddress: '',
    facilityOfficialEmail: '',
    passportPhotoUrl: '',
    phoneNumber: '',
    signedOathUrl: '',
    optionalDocuments: [] as string[]
  })

  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [otpSent, setOtpSent] = useState(false)
  const [otpCode, setOtpCode] = useState('')
  const [otpMethod, setOtpMethod] = useState<'phone' | 'email'>('phone')
  const [userEmail, setUserEmail] = useState('')

  useEffect(() => {
    // Fetch user email and existing verification requests
    ;(async () => {
      try {
        // Get current user email from session/profile
        const sessionRes = await fetch('/api/debug/session')
        if (sessionRes.ok) {
          const sessionData = await sessionRes.json()
          if (sessionData.user?.email) {
            setUserEmail(sessionData.user.email)
          }
        }

        // Fetch existing verification requests and prefill latest if any
        const res = await fetch('/api/doctor/verification')
        if (res.ok) {
          const data = await res.json()
          if (data.requests && data.requests.length > 0) {
            const latest = data.requests[0]
            setForm((prev: Record<string, any>) => ({ ...prev, ...latest }))
          }
        }
      } catch (err) {
        console.error('Failed to load existing verification:', err)
      }
    })()
  }, [])

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>, field: string) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = async () => {
      const base64 = (reader.result as string).split(',')[1]
      setLoading(true)
      try {
        const res = await fetch('/api/uploads', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ fileName: file.name, contentBase64: base64 }) })
        if (res.ok) {
          const data = await res.json()
          setForm((prev: any) => ({ ...prev, [field]: data.url }))
          setMessage('File uploaded')
        } else {
          setMessage('Upload failed')
        }
      } catch (err) {
        console.error('Upload error', err)
        setMessage('Upload failed')
      } finally {
        setLoading(false)
      }
    }
    reader.readAsDataURL(file)
  }

  const sendOtp = async () => {
    if (otpMethod === 'phone' && !form.phoneNumber) {
      return setMessage('Enter phone number first')
    }
    if (otpMethod === 'email' && !userEmail) {
      return setMessage('No email found in your profile')
    }

    try {
      const payload = otpMethod === 'phone'
        ? { method: 'phone', phone: form.phoneNumber }
        : { method: 'email', email: userEmail }

      const res = await fetch('/api/doctor/verification/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      if (res.ok) {
        setOtpSent(true)
        setMessage(`OTP sent to ${otpMethod}`)
      } else {
        const error = await res.json()
        setMessage(error.error || 'Failed to send OTP')
      }
    } catch (err) {
      console.error(err)
      setMessage('Failed to send OTP')
    }
  }

  const verifyOtp = async () => {
    if (!otpCode) return setMessage('Enter the OTP code')

    try {
      const payload = otpMethod === 'phone'
        ? { method: 'phone', phone: form.phoneNumber, code: otpCode }
        : { method: 'email', email: userEmail, code: otpCode }

      const res = await fetch('/api/doctor/verification/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      if (res.ok) {
        setMessage(`${otpMethod} verified successfully`)
        setOtpSent(false)
        setOtpCode('')
      } else {
        const data = await res.json()
        setMessage(data.error || 'Verification failed')
      }
    } catch (err) {
      console.error(err)
      setMessage('Verification failed')
    }
  }

  const submit = async () => {
    setLoading(true)
    setMessage(null)
    try {
      const payload = { ...form }
      const res = await fetch('/api/doctor/verification', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      if (res.ok) {
        const data = await res.json()
        setMessage('Verification submitted successfully')
      } else {
        const data = await res.json()
        setMessage(data.error || 'Submission failed')
      }
    } catch (err) {
      console.error(err)
      setMessage('Submission failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Doctor Credential Verification</h3>
      {message && <div className="p-2 bg-yellow-50 border rounded text-sm">{message}</div>}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <input placeholder="Full legal name" value={form.fullLegalName || ''} onChange={e => setForm({ ...form, fullLegalName: e.target.value })} className="input" />
        <input placeholder="National ID" value={form.nationalId || ''} onChange={e => setForm({ ...form, nationalId: e.target.value })} className="input" />
        <input placeholder="Medical registration number" value={form.registrationNumber || ''} onChange={e => setForm({ ...form, registrationNumber: e.target.value })} className="input" />
        <input placeholder="Registration status URL" value={form.registrationStatusUrl || ''} onChange={e => setForm({ ...form, registrationStatusUrl: e.target.value })} className="input" />
        <label className="block">Medical license (PDF/image)
          <input type="file" onChange={e => handleFile(e, 'licenseUrl')} />
        </label>
        <label className="block">Degree certificate
          <input type="file" onChange={e => handleFile(e, 'degreeUrl')} />
        </label>
        <label className="block">Internship completion letter
          <input type="file" onChange={e => handleFile(e, 'internshipLetterUrl')} />
        </label>
        <label className="block">Postgraduate qualification
          <input type="file" onChange={e => handleFile(e, 'postgraduateUrl')} />
        </label>
        <input placeholder="Work facility name" value={form.facilityName || ''} onChange={e => setForm({ ...form, facilityName: e.target.value })} className="input" />
        <input placeholder="Facility address" value={form.facilityAddress || ''} onChange={e => setForm({ ...form, facilityAddress: e.target.value })} className="input" />
        <input placeholder="Official facility email" value={form.facilityOfficialEmail || ''} onChange={e => setForm({ ...form, facilityOfficialEmail: e.target.value })} className="input" />
        <label className="block">Passport photo
          <input type="file" onChange={e => handleFile(e, 'passportPhotoUrl')} />
        </label>
        <input placeholder="Phone number" value={form.phoneNumber || ''} onChange={e => setForm({ ...form, phoneNumber: e.target.value })} className="input" />
        <label className="block">Signed oath (PDF/image)
          <input type="file" onChange={e => handleFile(e, 'signedOathUrl')} />
        </label>
      </div>

      {/* OTP Verification Section */}
      <div className="border-t pt-4 mt-4">
        <h4 className="text-md font-semibold mb-3">Phone/Email Verification (OTP)</h4>
        <div className="space-y-3">
          {/* Method Selection */}
          <div className="flex gap-4 items-center">
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="otpMethod"
                value="phone"
                checked={otpMethod === 'phone'}
                onChange={e => setOtpMethod(e.target.value as 'phone' | 'email')}
              />
              <span>Send to Phone</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="otpMethod"
                value="email"
                checked={otpMethod === 'email'}
                onChange={e => setOtpMethod(e.target.value as 'phone' | 'email')}
              />
              <span>Send to Email</span>
            </label>
          </div>

          {/* Display selected target */}
          {otpMethod === 'phone' ? (
            <div className="text-sm text-gray-600">
              Phone: <strong>{form.phoneNumber || '(not set)'}</strong>
            </div>
          ) : (
            <div className="text-sm text-gray-600">
              Email: <strong>{userEmail || '(not found)'}</strong>
            </div>
          )}

          {/* OTP Send/Verify */}
          {!otpSent ? (
            <button onClick={sendOtp} className="btn btn-secondary">
              Send OTP to {otpMethod === 'phone' ? 'Phone' : 'Email'}
            </button>
          ) : (
            <div className="flex gap-2 items-center">
              <input
                placeholder="Enter OTP code"
                value={otpCode}
                onChange={e => setOtpCode(e.target.value)}
                className="input flex-1"
              />
              <button onClick={verifyOtp} className="btn btn-primary">
                Verify
              </button>
              <button
                onClick={() => {
                  setOtpSent(false)
                  setOtpCode('')
                }}
                className="btn btn-secondary"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button onClick={submit} disabled={loading} className="btn btn-primary">
          {loading ? 'Submitting...' : 'Submit Verification'}
        </button>
      </div>
    </div>
  )
}
