import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id || session.user.role !== 'DOCTOR') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const data = await request.json()
    const doctorId = session.user.id

    // Update User
    await prisma.user.update({
      where: { id: doctorId },
      data: {
        name: data.name,
        email: data.email,
        phone: data.phone,
        dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : null,
        nationality: data.nationality
      }
    })

    // Update or create DoctorProfile
    const profileData = {
      licenseNumber: data.licenseNumber,
      licenseIssuingAuthority: data.licenseIssuingAuthority,
      licenseIssueDate: data.licenseIssueDate ? new Date(data.licenseIssueDate) : null,
      licenseExpiryDate: data.licenseExpiryDate ? new Date(data.licenseExpiryDate) : null,
      specialization: data.specialization,
      subspecialty: data.subspecialty,
      yearsExperience: parseInt(data.yearsExperience),
      medicalSchool: data.medicalSchool,
      graduationYear: data.graduationYear ? parseInt(data.graduationYear) : null,
      medicalDegree: data.medicalDegree,
      currentInstitution: data.currentInstitution,
      professionalContact: data.professionalContact
    }

    await prisma.doctorProfile.upsert({
      where: { userId: doctorId },
      update: profileData,
      create: {
        userId: doctorId,
        ...profileData
      }
    })

    // Handle board certifications
    if (data.certifications && Array.isArray(data.certifications)) {
      // Delete existing certifications
      await prisma.doctorBoardCertification.deleteMany({
        where: { doctorId }
      })

      // Create new ones
      for (const cert of data.certifications) {
        if (cert.certificationName && cert.issuingBody) {
          await prisma.doctorBoardCertification.create({
            data: {
              doctorId,
              certificationName: cert.certificationName,
              issuingBody: cert.issuingBody,
              issueDate: cert.issueDate ? new Date(cert.issueDate) : null,
              expiryDate: cert.expiryDate ? new Date(cert.expiryDate) : null,
              certificateUrl: cert.certificateUrl || null
            }
          })
        }
      }
    }

    // Handle references
    if (data.references && Array.isArray(data.references)) {
      // Delete existing references
      await prisma.doctorReference.deleteMany({
        where: { doctorId }
      })

      // Create new ones
      for (const ref of data.references) {
        if (ref.name && ref.email) {
          await prisma.doctorReference.create({
            data: {
              doctorId,
              name: ref.name,
              title: ref.title,
              institution: ref.institution,
              email: ref.email,
              phone: ref.phone,
              relationship: ref.relationship
            }
          })
        }
      }
    }

    // Handle documents
    const documentTypes = ['license', 'degree', 'gov_id', 'headshot', 'cv']
    for (const type of documentTypes) {
      const urlKey = `${type}Url`
      if (data[urlKey]) {
        await prisma.doctorDocument.upsert({
          where: {
            doctorId_documentType: {
              doctorId,
              documentType: type
            }
          },
          update: {
            fileUrl: data[urlKey]
          },
          create: {
            doctorId,
            documentType: type,
            fileUrl: data[urlKey]
          }
        })
      }
    }

    return NextResponse.json({ success: true, message: 'Profile updated successfully' })
  } catch (error) {
    console.error('Profile update error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}