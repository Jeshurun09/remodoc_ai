# Integration Guide - Adding Verification Components to Dashboards

## Overview

This guide shows you exactly how to integrate the doctor credential verification system into your existing dashboards.

---

## Doctor Dashboard Integration

### 1. Locate Your Doctor Dashboard File

Find your doctor dashboard component, typically at:
```
app/dashboard/doctor/page.tsx
```

### 2. Add the Import

```tsx
import DoctorProfileEditor from '@/components/doctor/DoctorProfileEditor'
```

### 3. Add to Your JSX

**Minimal Integration:**
```tsx
'use client'

import DoctorProfileEditor from '@/components/doctor/DoctorProfileEditor'

export default function DoctorDashboard() {
  return (
    <div className="p-6">
      <h1>Doctor Dashboard</h1>
      
      {/* Your existing content */}
      <div className="mt-8">
        <h2>Doctor Profile & Verification</h2>
        <DoctorProfileEditor />
      </div>
    </div>
  )
}
```

**With Tabs (Recommended):**
```tsx
'use client'

import { useState } from 'react'
import DoctorProfileEditor from '@/components/doctor/DoctorProfileEditor'

export default function DoctorDashboard() {
  const [activeTab, setActiveTab] = useState('overview')

  return (
    <div className="p-6">
      <h1>Doctor Dashboard</h1>
      
      {/* Tab Navigation */}
      <div className="flex gap-4 mb-6 border-b">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-2 font-medium ${
            activeTab === 'overview' ? 'border-b-2 border-blue-600' : ''
          }`}
        >
          Overview
        </button>
        <button
          onClick={() => setActiveTab('verification')}
          className={`px-4 py-2 font-medium ${
            activeTab === 'verification' ? 'border-b-2 border-blue-600' : ''
          }`}
        >
          Credential Verification
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div>
          {/* Your existing overview content */}
        </div>
      )}

      {activeTab === 'verification' && (
        <DoctorProfileEditor />
      )}
    </div>
  )
}
```

**In a Modal/Dialog (Alternative):**
```tsx
'use client'

import { useState } from 'react'
import DoctorProfileEditor from '@/components/doctor/DoctorProfileEditor'

export default function DoctorDashboard() {
  const [showVerification, setShowVerification] = useState(false)

  return (
    <div className="p-6">
      <h1>Doctor Dashboard</h1>

      {/* Existing content */}
      <div className="mb-6">
        <button
          onClick={() => setShowVerification(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded"
        >
          Update Credentials
        </button>
      </div>

      {/* Modal */}
      {showVerification && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-screen overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2>Credential Verification</h2>
              <button
                onClick={() => setShowVerification(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            <DoctorProfileEditor />
          </div>
        </div>
      )}
    </div>
  )
}
```

---

## Admin Dashboard Integration

### 1. Locate Your Admin Dashboard

Find your admin dashboard component, typically at:
```
app/dashboard/admin/page.tsx
```

### 2. Add the Import

```tsx
import DoctorVerificationReview from '@/components/admin/DoctorVerificationReview'
```

### 3. Add to Your JSX

**Minimal Integration:**
```tsx
'use client'

import DoctorVerificationReview from '@/components/admin/DoctorVerificationReview'

export default function AdminDashboard() {
  return (
    <div className="p-6">
      <h1>Admin Dashboard</h1>

      {/* Your existing content */}
      <div className="mt-8">
        <h2>Doctor Verification Management</h2>
        <DoctorVerificationReview filter="PENDING" />
      </div>
    </div>
  )
}
```

**With Tab for Each Status:**
```tsx
'use client'

import { useState } from 'react'
import DoctorVerificationReview from '@/components/admin/DoctorVerificationReview'

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('PENDING')

  return (
    <div className="p-6">
      <h1>Admin Dashboard</h1>

      {/* Tab Navigation */}
      <div className="flex gap-4 mb-6 border-b">
        {['PENDING', 'APPROVED', 'REJECTED'].map((status) => (
          <button
            key={status}
            onClick={() => setActiveTab(status)}
            className={`px-4 py-2 font-medium ${
              activeTab === status ? 'border-b-2 border-blue-600' : ''
            }`}
          >
            {status}
          </button>
        ))}
      </div>

      {/* Doctor Verification Component */}
      <DoctorVerificationReview filter={activeTab as any} />
    </div>
  )
}
```

**Full Admin Page with Multiple Sections:**
```tsx
'use client'

import { useState } from 'react'
import DoctorVerificationReview from '@/components/admin/DoctorVerificationReview'

export default function AdminDashboard() {
  const [activeSection, setActiveSection] = useState('verifications')
  const [verificationFilter, setVerificationFilter] = useState<'PENDING' | 'APPROVED' | 'REJECTED'>('PENDING')

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <h1 className="text-3xl font-bold mb-6">Admin Dashboard</h1>

      {/* Main Navigation */}
      <div className="flex gap-4 mb-6">
        <button
          onClick={() => setActiveSection('verifications')}
          className={`px-4 py-2 rounded font-medium ${
            activeSection === 'verifications'
              ? 'bg-blue-600 text-white'
              : 'bg-white border'
          }`}
        >
          Doctor Verifications
        </button>
        <button
          onClick={() => setActiveSection('analytics')}
          className={`px-4 py-2 rounded font-medium ${
            activeSection === 'analytics'
              ? 'bg-blue-600 text-white'
              : 'bg-white border'
          }`}
        >
          Analytics
        </button>
        <button
          onClick={() => setActiveSection('users')}
          className={`px-4 py-2 rounded font-medium ${
            activeSection === 'users'
              ? 'bg-blue-600 text-white'
              : 'bg-white border'
          }`}
        >
          Users
        </button>
      </div>

      {/* Verification Section */}
      {activeSection === 'verifications' && (
        <div className="bg-white rounded-lg p-6 shadow">
          {/* Filter Buttons */}
          <div className="flex gap-2 mb-6">
            {(['PENDING', 'APPROVED', 'REJECTED'] as const).map((status) => (
              <button
                key={status}
                onClick={() => setVerificationFilter(status)}
                className={`px-4 py-2 rounded text-sm font-medium ${
                  verificationFilter === status
                    ? 'bg-blue-100 text-blue-700 border border-blue-300'
                    : 'bg-gray-100 text-gray-700 border'
                }`}
              >
                {status}
              </button>
            ))}
          </div>

          {/* Verification Component */}
          <DoctorVerificationReview filter={verificationFilter} />
        </div>
      )}

      {/* Other Sections */}
      {activeSection === 'analytics' && (
        <div className="bg-white rounded-lg p-6 shadow">
          {/* Your analytics content */}
        </div>
      )}

      {activeSection === 'users' && (
        <div className="bg-white rounded-lg p-6 shadow">
          {/* Your users content */}
        </div>
      )}
    </div>
  )
}
```

---

## Component Props Reference

### DoctorProfileEditor

No required props. The component handles everything internally.

```tsx
<DoctorProfileEditor />
```

Optional: Customize styling
```tsx
<div className="max-w-4xl mx-auto">
  <DoctorProfileEditor />
</div>
```

### DoctorVerificationReview

Optional prop for filtering by status:

```tsx
// Show PENDING requests
<DoctorVerificationReview filter="PENDING" />

// Show APPROVED requests
<DoctorVerificationReview filter="APPROVED" />

// Show REJECTED requests
<DoctorVerificationReview filter="REJECTED" />

// No filter (shows all)
<DoctorVerificationReview />
```

---

## Common Integration Patterns

### Pattern 1: Sidebar Navigation

```tsx
'use client'

import DoctorProfileEditor from '@/components/doctor/DoctorProfileEditor'
import DoctorVerificationReview from '@/components/admin/DoctorVerificationReview'

export default function Dashboard() {
  const [currentPage, setCurrentPage] = useState('home')
  const userRole = 'doctor' // Get from session

  return (
    <div className="flex h-screen">
      {/* Sidebar */}
      <div className="w-64 bg-gray-900 text-white p-4">
        <h2 className="text-xl font-bold mb-6">RemoDoc</h2>
        <nav className="space-y-2">
          {userRole === 'doctor' && (
            <>
              <button onClick={() => setCurrentPage('home')} className="block w-full text-left px-4 py-2 rounded hover:bg-gray-800">
                Dashboard
              </button>
              <button onClick={() => setCurrentPage('verification')} className="block w-full text-left px-4 py-2 rounded hover:bg-gray-800">
                Credential Verification
              </button>
            </>
          )}
        </nav>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto p-6">
        {currentPage === 'home' && <div>Home content</div>}
        {currentPage === 'verification' && <DoctorProfileEditor />}
      </div>
    </div>
  )
}
```

### Pattern 2: Accordion/Collapsible Sections

```tsx
'use client'

import { useState } from 'react'
import DoctorProfileEditor from '@/components/doctor/DoctorProfileEditor'

export default function Dashboard() {
  const [expandedSections, setExpandedSections] = useState<string[]>([])

  const toggleSection = (section: string) => {
    setExpandedSections(prev =>
      prev.includes(section)
        ? prev.filter(s => s !== section)
        : [...prev, section]
    )
  }

  return (
    <div className="space-y-4">
      <div className="border rounded">
        <button
          onClick={() => toggleSection('verification')}
          className="w-full px-4 py-3 bg-gray-100 font-medium text-left hover:bg-gray-200"
        >
          📋 Credential Verification
        </button>
        {expandedSections.includes('verification') && (
          <div className="p-4 border-t">
            <DoctorProfileEditor />
          </div>
        )}
      </div>
    </div>
  )
}
```

---

## Styling & Customization

### With Tailwind CSS (Default)

Components use Tailwind by default. No additional styling needed.

### With Custom CSS

Wrap components in divs with custom classes:

```tsx
<div className="custom-verification-container">
  <DoctorProfileEditor />
</div>
```

```css
.custom-verification-container {
  max-width: 1000px;
  margin: 0 auto;
  background-color: #f5f5f5;
  border-radius: 8px;
  padding: 24px;
}
```

---

## Responsive Design

Components are fully responsive. They automatically adapt to screen size:

```tsx
<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
  <DoctorProfileEditor />
  <div>{/* Other content */}</div>
</div>
```

---

## Error Handling

Components handle errors internally and display user-friendly messages.

If you need to handle errors globally:

```tsx
// In parent component
import { useEffect, useState } from 'react'

export default function Dashboard() {
  const [error, setError] = useState<string | null>(null)

  const handleVerificationError = (error: string) => {
    setError(error)
    // Show error toast, alert, etc.
  }

  return (
    <div>
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}
      <DoctorProfileEditor />
    </div>
  )
}
```

---

## Testing the Integration

After adding components to your dashboards:

1. **Test Doctor Dashboard:**
   - Navigate to doctor dashboard
   - See the credential form
   - Fill in sample data
   - Submit verification
   - Check for success message

2. **Test Admin Dashboard:**
   - Navigate to admin dashboard
   - See verification requests list
   - Click on a request
   - Try approve/reject/background-check actions
   - Verify audit logs created

3. **Test Email Notifications:**
   - Doctor submits credentials → Check email
   - Admin approves → Check doctor email
   - Admin rejects → Check doctor email

---

## Quick Troubleshooting

| Issue | Solution |
|-------|----------|
| Components not rendering | Import path wrong or component not in app/components/ |
| Form not submitting | Check if user is authenticated, check console for errors |
| Email not sending | Verify TWILIO_* env vars configured |
| OTP not received | Check Twilio dashboard, verify phone number format |
| Admin can't approve | Check if user has ADMIN role |

---

## Next Steps

1. ✅ Add components to your dashboards
2. ✅ Test the complete flow end-to-end
3. ✅ Configure Twilio for OTP delivery
4. ✅ Deploy to staging for QA
5. ✅ Deploy to production

You're ready to go! 🚀
