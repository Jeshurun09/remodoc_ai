'use client'

import { useState } from 'react'

interface CredentialsStepProps {
  onNext: (data: Record<string, any>) => void
  onBack: () => void
  initialData: Record<string, any>
}

export default function CredentialsStep({ onNext, onBack, initialData }: CredentialsStepProps) {
  const [form, setForm] = useState({
    licenseNumber: initialData.licenseNumber || '',
    licenseIssuingAuthority: initialData.licenseIssuingAuthority || '',
    licenseIssueDate: initialData.licenseIssueDate || '',
    licenseExpiryDate: initialData.licenseExpiryDate || '',
    specialization: initialData.specialization || '',
    subspecialty: initialData.subspecialty || '',
    yearsExperience: initialData.yearsExperience || ''
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  const validate = () => {
    const newErrors: Record<string, string> = {}
    if (!form.licenseNumber) newErrors.licenseNumber = 'License number is required'
    if (!form.licenseIssuingAuthority) newErrors.licenseIssuingAuthority = 'Issuing authority is required'
    if (!form.licenseIssueDate) newErrors.licenseIssueDate = 'Issue date is required'
    if (!form.licenseExpiryDate) newErrors.licenseExpiryDate = 'Expiry date is required'
    if (!form.specialization) newErrors.specialization = 'Primary specialization is required'
    if (!form.yearsExperience) newErrors.yearsExperience = 'Years of experience is required'
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (validate()) {
      onNext(form)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">License Number</label>
          <input
            type="text"
            value={form.licenseNumber}
            onChange={(e) => setForm(prev => ({ ...prev, licenseNumber: e.target.value }))}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          />
          {errors.licenseNumber && <p className="mt-1 text-sm text-red-600">{errors.licenseNumber}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Issuing Authority</label>
          <input
            type="text"
            value={form.licenseIssuingAuthority}
            onChange={(e) => setForm(prev => ({ ...prev, licenseIssuingAuthority: e.target.value }))}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          />
          {errors.licenseIssuingAuthority && <p className="mt-1 text-sm text-red-600">{errors.licenseIssuingAuthority}</p>}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">License Issue Date</label>
          <input
            type="date"
            value={form.licenseIssueDate}
            onChange={(e) => setForm(prev => ({ ...prev, licenseIssueDate: e.target.value }))}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          />
          {errors.licenseIssueDate && <p className="mt-1 text-sm text-red-600">{errors.licenseIssueDate}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">License Expiry Date</label>
          <input
            type="date"
            value={form.licenseExpiryDate}
            onChange={(e) => setForm(prev => ({ ...prev, licenseExpiryDate: e.target.value }))}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          />
          {errors.licenseExpiryDate && <p className="mt-1 text-sm text-red-600">{errors.licenseExpiryDate}</p>}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Primary Specialization</label>
          <input
            type="text"
            value={form.specialization}
            onChange={(e) => setForm(prev => ({ ...prev, specialization: e.target.value }))}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          />
          {errors.specialization && <p className="mt-1 text-sm text-red-600">{errors.specialization}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Subspecialty (Optional)</label>
          <input
            type="text"
            value={form.subspecialty}
            onChange={(e) => setForm(prev => ({ ...prev, subspecialty: e.target.value }))}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Years of Experience</label>
        <input
          type="number"
          value={form.yearsExperience}
          onChange={(e) => setForm(prev => ({ ...prev, yearsExperience: e.target.value }))}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
        />
        {errors.yearsExperience && <p className="mt-1 text-sm text-red-600">{errors.yearsExperience}</p>}
      </div>

      <div className="flex justify-between">
        <button
          type="button"
          onClick={onBack}
          className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700"
        >
          Back
        </button>
        <button
          type="submit"
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
        >
          Next
        </button>
      </div>
    </form>
  )
}