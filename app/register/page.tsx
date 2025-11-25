'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTheme } from '@/components/theme/ThemeProvider'

const countries = [
  { name: 'Afghanistan', dialCode: '+93' },
  { name: 'Albania', dialCode: '+355' },
  { name: 'Algeria', dialCode: '+213' },
  { name: 'Andorra', dialCode: '+376' },
  { name: 'Angola', dialCode: '+244' },
  { name: 'Argentina', dialCode: '+54' },
  { name: 'Armenia', dialCode: '+374' },
  { name: 'Aruba', dialCode: '+297' },
  { name: 'Ascension Island', dialCode: '+247' },
  { name: 'Australia', dialCode: '+61' },
  { name: 'Austria', dialCode: '+43' },
  { name: 'Azerbaijan', dialCode: '+994' },
  { name: 'Bahrain', dialCode: '+973' },
  { name: 'Bangladesh', dialCode: '+880' },
  { name: 'Belarus', dialCode: '+375' },
  { name: 'Belgium', dialCode: '+32' },
  { name: 'Belize', dialCode: '+501' },
  { name: 'Benin', dialCode: '+229' },
  { name: 'Bhutan', dialCode: '+975' },
  { name: 'Bolivia', dialCode: '+591' },
  { name: 'Bosnia and Herzegovina', dialCode: '+387' },
  { name: 'Botswana', dialCode: '+267' },
  { name: 'Brazil', dialCode: '+55' },
  { name: 'British Indian Ocean Territory', dialCode: '+246' },
  { name: 'Brunei', dialCode: '+673' },
  { name: 'Bulgaria', dialCode: '+359' },
  { name: 'Burkina Faso', dialCode: '+226' },
  { name: 'Burundi', dialCode: '+257' },
  { name: 'Cabo Verde', dialCode: '+238' },
  { name: 'Cambodia', dialCode: '+855' },
  { name: 'Cameroon', dialCode: '+237' },
  { name: 'Canada', dialCode: '+1' },
  { name: 'Central African Republic', dialCode: '+236' },
  { name: 'Chad', dialCode: '+235' },
  { name: 'Chile', dialCode: '+56' },
  { name: 'China', dialCode: '+86' },
  { name: 'Colombia', dialCode: '+57' },
  { name: 'Comoros', dialCode: '+269' },
  { name: 'Congo (Brazzaville)', dialCode: '+242' },
  { name: 'Congo (Kinshasa)', dialCode: '+243' },
  { name: 'Cook Islands', dialCode: '+682' },
  { name: 'Costa Rica', dialCode: '+506' },
  { name: "Cote d'Ivoire", dialCode: '+225' },
  { name: 'Croatia', dialCode: '+385' },
  { name: 'Cuba', dialCode: '+53' },
  { name: 'Curacao', dialCode: '+599' },
  { name: 'Cyprus', dialCode: '+357' },
  { name: 'Czech Republic', dialCode: '+420' },
  { name: 'Denmark', dialCode: '+45' },
  { name: 'Diego Garcia', dialCode: '+246' },
  { name: 'Djibouti', dialCode: '+253' },
  { name: 'Timor-Leste', dialCode: '+670' },
  { name: 'Ecuador', dialCode: '+593' },
  { name: 'Egypt', dialCode: '+20' },
  { name: 'El Salvador', dialCode: '+503' },
  { name: 'Equatorial Guinea', dialCode: '+240' },
  { name: 'Eritrea', dialCode: '+291' },
  { name: 'Estonia', dialCode: '+372' },
  { name: 'Eswatini', dialCode: '+268' },
  { name: 'Ethiopia', dialCode: '+251' },
  { name: 'Falkland Islands', dialCode: '+500' },
  { name: 'Faroe Islands', dialCode: '+298' },
  { name: 'Fiji', dialCode: '+679' },
  { name: 'Finland', dialCode: '+358' },
  { name: 'France', dialCode: '+33' },
  { name: 'French Guiana', dialCode: '+594' },
  { name: 'French Polynesia', dialCode: '+689' },
  { name: 'Gabon', dialCode: '+241' },
  { name: 'Gambia', dialCode: '+220' },
  { name: 'Georgia', dialCode: '+995' },
  { name: 'Germany', dialCode: '+49' },
  { name: 'Ghana', dialCode: '+233' },
  { name: 'Gibraltar', dialCode: '+350' },
  { name: 'Greece', dialCode: '+30' },
  { name: 'Greenland', dialCode: '+299' },
  { name: 'Guatemala', dialCode: '+502' },
  { name: 'Guinea', dialCode: '+224' },
  { name: 'Guinea-Bissau', dialCode: '+245' },
  { name: 'Guyana', dialCode: '+592' },
  { name: 'Haiti', dialCode: '+509' },
  { name: 'Honduras', dialCode: '+504' },
  { name: 'Hong Kong', dialCode: '+852' },
  { name: 'Hungary', dialCode: '+36' },
  { name: 'Iceland', dialCode: '+354' },
  { name: 'India', dialCode: '+91' },
  { name: 'Indonesia', dialCode: '+62' },
  { name: 'Iran', dialCode: '+98' },
  { name: 'Iraq', dialCode: '+964' },
  { name: 'Ireland', dialCode: '+353' },
  { name: 'Israel', dialCode: '+972' },
  { name: 'Italy / Vatican City', dialCode: '+39' },
  { name: 'Japan', dialCode: '+81' },
  { name: 'Jordan', dialCode: '+962' },
  { name: 'Kazakhstan', dialCode: '+7' },
  { name: 'Kenya', dialCode: '+254' },
  { name: 'Kiribati', dialCode: '+686' },
  { name: 'Kosovo', dialCode: '+383' },
  { name: 'Kuwait', dialCode: '+965' },
  { name: 'Kyrgyzstan', dialCode: '+996' },
  { name: 'Laos', dialCode: '+856' },
  { name: 'Latvia', dialCode: '+371' },
  { name: 'Lebanon', dialCode: '+961' },
  { name: 'Lesotho', dialCode: '+266' },
  { name: 'Liberia', dialCode: '+231' },
  { name: 'Libya', dialCode: '+218' },
  { name: 'Liechtenstein', dialCode: '+423' },
  { name: 'Lithuania', dialCode: '+370' },
  { name: 'Luxembourg', dialCode: '+352' },
  { name: 'Macau', dialCode: '+853' },
  { name: 'Madagascar', dialCode: '+261' },
  { name: 'Malawi', dialCode: '+265' },
  { name: 'Malaysia', dialCode: '+60' },
  { name: 'Maldives', dialCode: '+960' },
  { name: 'Mali', dialCode: '+223' },
  { name: 'Malta', dialCode: '+356' },
  { name: 'Marshall Islands', dialCode: '+692' },
  { name: 'Mauritania', dialCode: '+222' },
  { name: 'Mauritius', dialCode: '+230' },
  { name: 'Mexico', dialCode: '+52' },
  { name: 'Micronesia', dialCode: '+691' },
  { name: 'Moldova', dialCode: '+373' },
  { name: 'Monaco', dialCode: '+377' },
  { name: 'Mongolia', dialCode: '+976' },
  { name: 'Montenegro', dialCode: '+382' },
  { name: 'Morocco', dialCode: '+212' },
  { name: 'Mozambique', dialCode: '+258' },
  { name: 'Myanmar (Burma)', dialCode: '+95' },
  { name: 'Namibia', dialCode: '+264' },
  { name: 'Nauru', dialCode: '+674' },
  { name: 'Nepal', dialCode: '+977' },
  { name: 'Netherlands', dialCode: '+31' },
  { name: 'New Caledonia', dialCode: '+687' },
  { name: 'New Zealand', dialCode: '+64' },
  { name: 'Nicaragua', dialCode: '+505' },
  { name: 'Niger', dialCode: '+227' },
  { name: 'Nigeria', dialCode: '+234' },
  { name: 'Niue', dialCode: '+683' },
  { name: 'North Korea', dialCode: '+850' },
  { name: 'North Macedonia', dialCode: '+389' },
  { name: 'Norway', dialCode: '+47' },
  { name: 'Oman', dialCode: '+968' },
  { name: 'Pakistan', dialCode: '+92' },
  { name: 'Palau', dialCode: '+680' },
  { name: 'Palestine (Gaza/West Bank)', dialCode: '+970' },
  { name: 'Panama', dialCode: '+507' },
  { name: 'Papua New Guinea', dialCode: '+675' },
  { name: 'Paraguay', dialCode: '+595' },
  { name: 'Peru', dialCode: '+51' },
  { name: 'Philippines', dialCode: '+63' },
  { name: 'Poland', dialCode: '+48' },
  { name: 'Portugal', dialCode: '+351' },
  { name: 'Qatar', dialCode: '+974' },
  { name: 'Reunion / Mayotte', dialCode: '+262' },
  { name: 'Romania', dialCode: '+40' },
  { name: 'Russia', dialCode: '+7' },
  { name: 'Rwanda', dialCode: '+250' },
  { name: 'Samoa', dialCode: '+685' },
  { name: 'San Marino', dialCode: '+378' },
  { name: 'Sao Tome and Principe', dialCode: '+239' },
  { name: 'Saudi Arabia', dialCode: '+966' },
  { name: 'Senegal', dialCode: '+221' },
  { name: 'Serbia', dialCode: '+381' },
  { name: 'Seychelles', dialCode: '+248' },
  { name: 'Sierra Leone', dialCode: '+232' },
  { name: 'Singapore', dialCode: '+65' },
  { name: 'Slovakia', dialCode: '+421' },
  { name: 'Slovenia', dialCode: '+386' },
  { name: 'Solomon Islands', dialCode: '+677' },
  { name: 'Somalia', dialCode: '+252' },
  { name: 'South Africa', dialCode: '+27' },
  { name: 'South Korea', dialCode: '+82' },
  { name: 'South Sudan', dialCode: '+211' },
  { name: 'Spain', dialCode: '+34' },
  { name: 'Sri Lanka', dialCode: '+94' },
  { name: 'St. Helena / Tristan da Cunha', dialCode: '+290' },
  { name: 'Sudan', dialCode: '+249' },
  { name: 'Suriname', dialCode: '+597' },
  { name: 'Sweden', dialCode: '+46' },
  { name: 'Switzerland', dialCode: '+41' },
  { name: 'Syria', dialCode: '+963' },
  { name: 'Taiwan', dialCode: '+886' },
  { name: 'Tajikistan', dialCode: '+992' },
  { name: 'Tanzania', dialCode: '+255' },
  { name: 'Thailand', dialCode: '+66' },
  { name: 'Togo', dialCode: '+228' },
  { name: 'Tokelau', dialCode: '+690' },
  { name: 'Tonga', dialCode: '+676' },
  { name: 'Tunisia', dialCode: '+216' },
  { name: 'Turkey', dialCode: '+90' },
  { name: 'Turkmenistan', dialCode: '+993' },
  { name: 'Tuvalu', dialCode: '+688' },
  { name: 'Uganda', dialCode: '+256' },
  { name: 'Ukraine', dialCode: '+380' },
  { name: 'United Arab Emirates', dialCode: '+971' },
  { name: 'United Kingdom', dialCode: '+44' },
  { name: 'United States', dialCode: '+1' },
  { name: 'Uruguay', dialCode: '+598' },
  { name: 'Uzbekistan', dialCode: '+998' },
  { name: 'Vanuatu', dialCode: '+678' },
  { name: 'Venezuela', dialCode: '+58' },
  { name: 'Vietnam', dialCode: '+84' },
  { name: 'Wallis and Futuna', dialCode: '+681' },
  { name: 'Yemen', dialCode: '+967' },
  { name: 'Zambia', dialCode: '+260' },
  { name: 'Zimbabwe', dialCode: '+263' },
] as const

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'PATIENT' as 'PATIENT' | 'DOCTOR' | 'ADMIN',
    phone: '',
    countryCode: countries[0].dialCode,
    adminAccessCode: '',
    licenseNumber: '',
    specialization: ''
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const router = useRouter()
  const { isDark, setTheme } = useTheme()

  const toggleTheme = () => {
    setTheme(isDark ? 'light' : 'dark')
  }

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Only allow alphabets, spaces, hyphens, and apostrophes
    const value = e.target.value.replace(/[^a-zA-Z\s'-]/g, '')
    setFormData({ ...formData, name: value })
  }

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Only allow numerical digits and basic formatting characters
    const value = e.target.value.replace(/[^\d\s()-]/g, '')
    setFormData({ ...formData, phone: value })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    // Validate name format
    if (!/^[a-zA-Z\s'-]+$/.test(formData.name.trim())) {
      setError('Name should only contain letters, spaces, hyphens, and apostrophes')
      return
    }

    // Validate phone format (if provided)
    if (formData.phone && !/^[\d\s()-]+$/.test(formData.phone.trim())) {
      setError('Phone number should only contain digits and formatting characters (spaces, hyphens, parentheses)')
      return
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match')
      return
    }

    setLoading(true)

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          phone: `${formData.countryCode}${formData.phone.replace(/\D/g, '')}`
        })
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Registration failed')
        return
      }

      const normalizedEmail = formData.email.trim().toLowerCase()
      if (typeof window !== 'undefined') {
        sessionStorage.setItem(
            'remodocPendingCredentials',
            JSON.stringify({
              email: normalizedEmail,
              password: formData.password
            })
        )
      }
      setFormData({
        name: '',
        email: '',
        password: '',
        confirmPassword: '',
        role: 'PATIENT',
        phone: '',
        countryCode: countries[0].dialCode,
        adminAccessCode: '',
        licenseNumber: '',
        specialization: ''
      })
      router.push(`/verify?email=${encodeURIComponent(normalizedEmail)}`)
    } catch (err) {
      setError('An error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="page-shell flex items-center justify-center py-12 relative">
      <button
        onClick={toggleTheme}
        className={`absolute top-4 right-4 px-4 py-2 border rounded-lg text-lg transition-all duration-200 ${
          isDark 
            ? 'border-white/40 hover:bg-white/10 text-yellow-400 hover:text-yellow-300' 
            : 'border-gray-300 hover:bg-gray-100 text-yellow-500 hover:text-yellow-600'
        }`}
        title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      >
        {isDark ? '🌙' : '☀️'}
      </button>
      <div className="max-w-md w-full surface rounded-lg shadow-xl p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-green-600">Create Account</h1>
          <p className="text-green-600 mt-2">Join RemoDoc today</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-blue-600 mb-2">
              Full Name
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={handleNameChange}
              required
              pattern="[a-zA-Z\s'-]+"
              title="Name should only contain letters, spaces, hyphens, and apostrophes"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-[var(--foreground)] bg-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-blue-600 mb-2">
              Email
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
              autoComplete="email"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-[var(--foreground)] bg-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-blue-600 mb-2">
              Phone
            </label>
            <div className="flex gap-3">
              <div className="w-40">
                <label className="sr-only" htmlFor="country-code">
                  Country Code
                </label>
                <select
                  id="country-code"
                  value={formData.countryCode}
                  onChange={(e) => setFormData({ ...formData, countryCode: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-black bg-transparent"
                >
                  {countries.map((country) => (
                    <option key={country.name} value={country.dialCode} style={{ color: 'black' }}>
                      {country.name} ({country.dialCode})
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex-1">
                <div className="flex">
                  <span className="px-3 py-2 border border-gray-300 border-r-0 rounded-l-lg bg-gray-100 text-black">
                    {formData.countryCode}
                  </span>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={handlePhoneChange}
                    pattern="[\d\s()-]+"
                    title="Phone number should only contain digits, spaces, hyphens, and parentheses"
                    placeholder="123 456 789"
                    className="w-full px-4 py-2 border border-gray-300 rounded-r-lg focus:ring-2 focus:ring-blue-500 text-black bg-transparent"
                  />
                </div>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-red-600 mb-2">
              Role
            </label>
            <select
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value as 'PATIENT' | 'DOCTOR' | 'ADMIN' })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-red-600 bg-transparent"
            >
              <option value="PATIENT">Patient</option>
              <option value="DOCTOR">Doctor</option>
              <option value="ADMIN">Admin</option>
            </select>
          </div>

          {formData.role === 'ADMIN' && (
            <div>
              <label className="block text-sm font-medium text-red-600 mb-2">
                Admin Access Code
              </label>
              <input
                type="password"
                value={formData.adminAccessCode}
                onChange={(e) => setFormData({ ...formData, adminAccessCode: e.target.value })}
                required
                placeholder="Enter the admin access code"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-[var(--foreground)] bg-transparent"
              />
              <p className="text-xs text-[var(--foreground)]/70 mt-1">
                Only authorized personnel should use this form. Contact the platform owner for the access code.
              </p>
            </div>
          )}

          {formData.role === 'DOCTOR' && (
            <>
              <div>
                <label className="block text-sm font-medium text-blue-600 mb-2">
                  License Number
                </label>
                <input
                  type="text"
                  value={formData.licenseNumber}
                  onChange={(e) => setFormData({ ...formData, licenseNumber: e.target.value })}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-[var(--foreground)] bg-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-blue-600 mb-2">
                  Specialization
                </label>
                <input
                  type="text"
                  value={formData.specialization}
                  onChange={(e) => setFormData({ ...formData, specialization: e.target.value })}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-[var(--foreground)] bg-transparent"
                />
              </div>
            </>
          )}

          <div>
            <label className="block text-sm font-medium text-blue-600 mb-2">
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required
                autoComplete="new-password"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-[var(--foreground)] pr-24 bg-transparent"
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute inset-y-0 right-0 px-4 text-sm font-medium text-blue-600 hover:text-blue-700"
              >
                {showPassword ? 'Hide Password' : 'Show Password'}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-blue-600 mb-2">
              Confirm Password
            </label>
            <div className="relative">
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                required
                autoComplete="new-password"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-[var(--foreground)] pr-24 bg-transparent"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword((prev) => !prev)}
                className="absolute inset-y-0 right-0 px-4 text-sm font-medium text-blue-600 hover:text-blue-700"
              >
                {showConfirmPassword ? 'Hide Password' : 'Show Password'}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {loading ? 'Creating account...' : 'Register'}
          </button>
        </form>

        <div className="mt-6 text-center text-[var(--foreground)]">
          <a href="/login" className="text-blue-600 hover:text-blue-700 text-sm">
            Already have an account? Sign in
          </a>
        </div>
      </div>
    </div>
  )
}

