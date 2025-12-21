'use client'

import { useState } from 'react'

interface ProfessionalStepProps {
  onNext: (data: Record<string, any>) => void
  onBack: () => void
  initialData: Record<string, any>
}

interface Reference {
  name: string
  title: string
  institution: string
  email: string
  phone: string
  relationship: string
}

export default function ProfessionalStep({ onNext, onBack, initialData }: ProfessionalStepProps) {
  const [form, setForm] = useState({
    currentInstitution: initialData.currentInstitution || '',
    professionalContact: initialData.professionalContact || '',
    references: initialData.references || [] as Reference[]
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  const validate = () => {
    const newErrors: Record<string, string> = {}
    if (!form.currentInstitution) newErrors.currentInstitution = 'Current institution is required'
    if (form.references.length < 2) newErrors.references = 'At least 2 professional references are required'
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (validate()) {
      onNext(form)
    }
  }

  const addReference = () => {
    setForm(prev => ({
      ...prev,
      references: [...prev.references, {
        name: '',
        title: '',
        institution: '',
        email: '',
        phone: '',
        relationship: ''
      }]
    }))
  }

  const updateReference = (index: number, field: string, value: string) => {
    setForm(prev => ({
      ...prev,
      references: prev.references.map((ref: Reference, i: number) =>
        i === index ? { ...ref, [field]: value } : ref
      )
    }))
  }

  const removeReference = (index: number) => {
    setForm(prev => ({
      ...prev,
      references: prev.references.filter((_: Reference, i: number) => i !== index)
    }))
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-700">Current Hospital/Institution</label>
        <input
          type="text"
          value={form.currentInstitution}
          onChange={(e) => setForm(prev => ({ ...prev, currentInstitution: e.target.value }))}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
        />
        {errors.currentInstitution && <p className="mt-1 text-sm text-red-600">{errors.currentInstitution}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Professional Contact Information</label>
        <input
          type="text"
          value={form.professionalContact}
          onChange={(e) => setForm(prev => ({ ...prev, professionalContact: e.target.value }))}
          placeholder="e.g., Office phone, extension, etc."
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
        />
      </div>

      <div>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium">Professional References</h3>
          <button
            type="button"
            onClick={addReference}
            className="bg-green-600 text-white px-3 py-1 rounded-md hover:bg-green-700 text-sm"
          >
            Add Reference
          </button>
        </div>
        {errors.references && <p className="mb-4 text-sm text-red-600">{errors.references}</p>}

        {form.references.map((ref: Reference, index: number) => (
          <div key={index} className="border rounded-md p-4 mb-4">
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Full Name</label>
                <input
                  type="text"
                  value={ref.name}
                  onChange={(e) => updateReference(index, 'name', e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Title/Position</label>
                <input
                  type="text"
                  value={ref.title}
                  onChange={(e) => updateReference(index, 'title', e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700">Institution</label>
              <input
                type="text"
                value={ref.institution}
                onChange={(e) => updateReference(index, 'institution', e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Email</label>
                <input
                  type="email"
                  value={ref.email}
                  onChange={(e) => updateReference(index, 'email', e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Phone</label>
                <input
                  type="tel"
                  value={ref.phone}
                  onChange={(e) => updateReference(index, 'phone', e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700">Relationship to You</label>
              <input
                type="text"
                value={ref.relationship}
                onChange={(e) => updateReference(index, 'relationship', e.target.value)}
                placeholder="e.g., Supervisor, Colleague, Mentor"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
            <button
              type="button"
              onClick={() => removeReference(index)}
              className="bg-red-600 text-white px-3 py-1 rounded-md hover:bg-red-700 text-sm"
            >
              Remove Reference
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