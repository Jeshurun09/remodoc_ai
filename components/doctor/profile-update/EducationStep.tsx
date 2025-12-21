'use client'

import { useState } from 'react'

interface EducationStepProps {
  onNext: (data: Record<string, any>) => void
  onBack: () => void
  initialData: Record<string, any>
}

interface Certification {
  certificationName: string
  issuingBody: string
  issueDate: string
  expiryDate: string
}

export default function EducationStep({ onNext, onBack, initialData }: EducationStepProps) {
  const [form, setForm] = useState({
    medicalSchool: initialData.medicalSchool || '',
    graduationYear: initialData.graduationYear || '',
    medicalDegree: initialData.medicalDegree || '',
    certifications: initialData.certifications || [] as Certification[]
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  const validate = () => {
    const newErrors: Record<string, string> = {}
    if (!form.medicalSchool) newErrors.medicalSchool = 'Medical school is required'
    if (!form.graduationYear) newErrors.graduationYear = 'Graduation year is required'
    if (!form.medicalDegree) newErrors.medicalDegree = 'Medical degree is required'
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (validate()) {
      onNext(form)
    }
  }

  const addCertification = () => {
    setForm(prev => ({
      ...prev,
      certifications: [...prev.certifications, {
        certificationName: '',
        issuingBody: '',
        issueDate: '',
        expiryDate: ''
      }]
    }))
  }

  const updateCertification = (index: number, field: string, value: string) => {
    setForm(prev => ({
      ...prev,
      certifications: prev.certifications.map((cert: Certification, i: number) =>
        i === index ? { ...cert, [field]: value } : cert
      )
    }))
  }

  const removeCertification = (index: number) => {
    setForm(prev => ({
      ...prev,
      certifications: prev.certifications.filter((_: Certification, i: number) => i !== index)
    }))
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Medical School</label>
          <input
            type="text"
            value={form.medicalSchool}
            onChange={(e) => setForm(prev => ({ ...prev, medicalSchool: e.target.value }))}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          />
          {errors.medicalSchool && <p className="mt-1 text-sm text-red-600">{errors.medicalSchool}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Graduation Year</label>
          <input
            type="number"
            value={form.graduationYear}
            onChange={(e) => setForm(prev => ({ ...prev, graduationYear: e.target.value }))}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          />
          {errors.graduationYear && <p className="mt-1 text-sm text-red-600">{errors.graduationYear}</p>}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Medical Degree</label>
        <select
          value={form.medicalDegree}
          onChange={(e) => setForm(prev => ({ ...prev, medicalDegree: e.target.value }))}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
        >
          <option value="">Select degree</option>
          <option value="MD">MD (Doctor of Medicine)</option>
          <option value="DO">DO (Doctor of Osteopathic Medicine)</option>
          <option value="MBBS">MBBS (Bachelor of Medicine, Bachelor of Surgery)</option>
          <option value="MBChB">MBChB (Bachelor of Medicine, Bachelor of Surgery)</option>
          <option value="Other">Other</option>
        </select>
        {errors.medicalDegree && <p className="mt-1 text-sm text-red-600">{errors.medicalDegree}</p>}
      </div>

      <div>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium">Board Certifications</h3>
          <button
            type="button"
            onClick={addCertification}
            className="bg-green-600 text-white px-3 py-1 rounded-md hover:bg-green-700 text-sm"
          >
            Add Certification
          </button>
        </div>

        {form.certifications.map((cert: Certification, index: number) => (
          <div key={index} className="border rounded-md p-4 mb-4">
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Certification Name</label>
                <input
                  type="text"
                  value={cert.certificationName}
                  onChange={(e) => updateCertification(index, 'certificationName', e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Issuing Body</label>
                <input
                  type="text"
                  value={cert.issuingBody}
                  onChange={(e) => updateCertification(index, 'issuingBody', e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Issue Date</label>
                <input
                  type="date"
                  value={cert.issueDate}
                  onChange={(e) => updateCertification(index, 'issueDate', e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Expiry Date</label>
                <input
                  type="date"
                  value={cert.expiryDate}
                  onChange={(e) => updateCertification(index, 'expiryDate', e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
            </div>
            <button
              type="button"
              onClick={() => removeCertification(index)}
              className="bg-red-600 text-white px-3 py-1 rounded-md hover:bg-red-700 text-sm"
            >
              Remove
            </button>
          </div>
        ))}
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