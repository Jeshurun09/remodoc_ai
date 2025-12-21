'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Stepper from '@/components/theme/Stepper'
import PersonalInfoStep from '@/components/doctor/profile-update/PersonalInfoStep'
import CredentialsStep from '@/components/doctor/profile-update/CredentialsStep'
import EducationStep from '@/components/doctor/profile-update/EducationStep'
import ProfessionalStep from '@/components/doctor/profile-update/ProfessionalStep'
import DocumentsStep from '@/components/doctor/profile-update/DocumentsStep'

const steps = [
  { title: 'Personal Information', description: 'Basic details' },
  { title: 'Professional Credentials', description: 'License and experience' },
  { title: 'Education Background', description: 'Medical education' },
  { title: 'Professional Details', description: 'References and contacts' },
  { title: 'Document Upload', description: 'Required documents' }
]

export default function DoctorProfileUpdatePage() {
  const [currentStep, setCurrentStep] = useState(0)
  const [formData, setFormData] = useState<Record<string, any>>({})
  const router = useRouter()

  const handleNext = (data: Record<string, any>) => {
    setFormData(prev => ({ ...prev, ...data }))
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1)
    } else {
      // Submit all data
      handleSubmit()
    }
  }

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleSubmit = async () => {
    try {
      const res = await fetch('/api/doctor/profile-update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })
      if (res.ok) {
        router.push('/dashboard/doctor')
      } else {
        alert('Error updating profile')
      }
    } catch (error) {
      console.error('Error:', error)
      alert('Error updating profile')
    }
  }

  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return <PersonalInfoStep onNext={handleNext} initialData={formData} />
      case 1:
        return <CredentialsStep onNext={handleNext} onBack={handleBack} initialData={formData} />
      case 2:
        return <EducationStep onNext={handleNext} onBack={handleBack} initialData={formData} />
      case 3:
        return <ProfessionalStep onNext={handleNext} onBack={handleBack} initialData={formData} />
      case 4:
        return <DocumentsStep onNext={handleNext} onBack={handleBack} initialData={formData} />
      default:
        return null
    }
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-8">Update Doctor Profile</h1>
      <Stepper steps={steps} currentStep={currentStep} />
      <div className="mt-8">
        {renderStep()}
      </div>
    </div>
  )
}