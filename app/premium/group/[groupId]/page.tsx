'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { useParams } from 'next/navigation'

interface GroupMember {
  id: string
  userId: string
  email: string
  name: string
}

interface GroupData {
  id: string
  plan: string
  maxMembers: number
  memberCount: number
  isModerator: boolean
  members: GroupMember[]
}

interface Feature {
  name: string
  description: string
  allowed: boolean
}

const ALL_FEATURES = [
  { name: 'aiSymptomChecker', description: 'AI Symptom Checker' },
  { name: 'appointmentBooking', description: 'Appointment Booking' },
  { name: 'messaging', description: 'Doctor Messaging' },
  { name: 'healthRecordStorage', description: 'Health Records' },
  { name: 'vitalsTracking', description: 'Vitals Tracking' },
  { name: 'appointmentHistory', description: 'Appointment History' },
  { name: 'advancedAnalytics', description: 'Advanced Analytics' },
  { name: 'prioritySupport', description: 'Priority Support' },
  { name: 'prescriptionManagement', description: 'Prescription Management' },
  { name: 'lifeStyleTracking', description: 'Lifestyle Tracking' },
  { name: 'emergencyAlerts', description: 'Emergency Alerts' },
  { name: 'familySharing', description: 'Family Sharing' }
]

export default function GroupManagementPage() {
  const params = useParams()
  const groupId = params.groupId as string
  const { data: session } = useSession()
  const [groupData, setGroupData] = useState<GroupData | null>(null)
  const [selectedMember, setSelectedMember] = useState<GroupMember | null>(null)
  const [memberFeatures, setMemberFeatures] = useState<Feature[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [inviteEmail, setInviteEmail] = useState('')
  const [showInviteForm, setShowInviteForm] = useState(false)
  const [inviteCode, setInviteCode] = useState('')
  const [copiedInvite, setCopiedInvite] = useState(false)

  useEffect(() => {
    fetchGroupData()
  }, [groupId, session])

  const fetchGroupData = async () => {
    if (!session?.user?.id) return

    try {
      const res = await fetch('/api/subscription/group')
      if (!res.ok) throw new Error('Failed to fetch group data')
      const data = await res.json()
      setGroupData(data.group)
    } catch (err) {
      console.error('Error fetching group data:', err)
      setError('Failed to load group data')
    } finally {
      setLoading(false)
    }
  }

  const fetchMemberFeatures = async (memberId: string) => {
    try {
      const res = await fetch(
        `/api/subscription/group-features?groupId=${groupId}&memberId=${memberId}`
      )
      if (!res.ok) throw new Error('Failed to fetch features')
      const data = await res.json()
      
      const features = ALL_FEATURES.map(f => ({
        ...f,
        allowed: data.features[f.name] ?? true
      }))
      setMemberFeatures(features)
    } catch (err) {
      console.error('Error fetching member features:', err)
      setError('Failed to load member features')
    }
  }

  const handleSelectMember = (member: GroupMember) => {
    setSelectedMember(member)
    fetchMemberFeatures(member.userId)
  }

  const handleFeatureToggle = (featureName: string) => {
    setMemberFeatures(prev =>
      prev.map(f =>
        f.name === featureName ? { ...f, allowed: !f.allowed } : f
      )
    )
  }

  const saveFeatures = async () => {
    if (!selectedMember) return

    try {
      const res = await fetch('/api/subscription/group-features', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          groupId,
          memberId: selectedMember.userId,
          features: memberFeatures.map(f => ({
            name: f.name,
            allowed: f.allowed
          }))
        })
      })

      if (!res.ok) throw new Error('Failed to save features')
      alert('Features updated successfully')
    } catch (err) {
      setError('Failed to save features')
    }
  }

  const handleRemoveMember = async (memberId: string) => {
    if (!confirm('Are you sure you want to remove this member?')) return

    try {
      const res = await fetch('/api/subscription/group', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'remove-member',
          groupId,
          memberId
        })
      })

      if (!res.ok) throw new Error('Failed to remove member')
      alert('Member removed successfully')
      fetchGroupData()
      setSelectedMember(null)
    } catch (err) {
      setError('Failed to remove member')
    }
  }

  const generateInviteLink = async () => {
    try {
      const inviteCode = Math.random().toString(36).substring(2, 15)
      setInviteCode(inviteCode)
      
      // Store in localStorage for now (in production, would save to DB)
      const inviteLink = `${window.location.origin}/premium/join-group?code=${inviteCode}&groupId=${groupId}`
      setInviteCode(inviteLink)
    } catch (err) {
      setError('Failed to generate invite link')
    }
  }

  const copyInviteLink = () => {
    navigator.clipboard.writeText(inviteCode)
    setCopiedInvite(true)
    setTimeout(() => setCopiedInvite(false), 2000)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-green-200 border-t-green-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading group data...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 p-6">
        <div className="max-w-6xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <h2 className="text-red-800 font-semibold mb-2">Error</h2>
            <p className="text-red-700">{error}</p>
            <Link href="/premium/profile" className="text-red-600 hover:text-red-700 mt-4 inline-block underline">
              Back to Premium Profile
            </Link>
          </div>
        </div>
      </div>
    )
  }

  if (!groupData?.isModerator) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 p-6">
        <div className="max-w-6xl mx-auto">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
            <h2 className="text-yellow-800 font-semibold mb-2">Access Denied</h2>
            <p className="text-yellow-700 mb-4">Only group moderators can access this page</p>
            <Link href="/premium/profile" className="text-yellow-600 hover:text-yellow-700 inline-block underline">
              Back to Premium Profile
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link href="/premium/profile" className="text-green-600 hover:text-green-700 text-sm font-medium mb-4 inline-block">
            ← Back to Premium Profile
          </Link>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Group Management</h1>
          <p className="text-gray-600">Manage group members and their features</p>
        </div>

        {/* Group Info */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="grid grid-cols-4 gap-4">
            <div className="text-center">
              <p className="text-gray-600 text-sm mb-1">Plan</p>
              <p className="text-2xl font-bold text-green-600">{groupData?.plan}</p>
            </div>
            <div className="text-center">
              <p className="text-gray-600 text-sm mb-1">Members</p>
              <p className="text-2xl font-bold text-green-600">{groupData?.memberCount}/{groupData?.maxMembers}</p>
            </div>
            <div className="text-center">
              <p className="text-gray-600 text-sm mb-1">Slots Available</p>
              <p className="text-2xl font-bold text-green-600">{(groupData?.maxMembers || 0) - (groupData?.memberCount || 0)}</p>
            </div>
            <div className="text-center">
              <button
                onClick={() => {
                  setShowInviteForm(!showInviteForm)
                  if (!inviteCode) generateInviteLink()
                }}
                className="bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded-lg transition"
              >
                {showInviteForm ? 'Close' : 'Invite Members'}
              </button>
            </div>
          </div>
        </div>

        {/* Invite Form */}
        {showInviteForm && (
          <div className="bg-white rounded-lg shadow-lg p-6 mb-6 border-2 border-green-200">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Invite Members to Group</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Invite Link</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={inviteCode}
                    readOnly
                    className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg border border-gray-300"
                  />
                  <button
                    onClick={copyInviteLink}
                    className={`px-4 py-2 rounded-lg font-semibold transition ${
                      copiedInvite
                        ? 'bg-green-600 text-white'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    {copiedInvite ? '✓ Copied' : 'Copy'}
                  </button>
                </div>
                <p className="text-xs text-gray-600 mt-2">Share this link to invite members to your group</p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Or Enter Email</label>
                <div className="flex gap-2">
                  <input
                    type="email"
                    value={inviteEmail}
                    onChange={e => setInviteEmail(e.target.value)}
                    placeholder="member@example.com"
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                  <button
                    className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition"
                  >
                    Send Invite
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Members List */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Members ({groupData?.memberCount})</h2>
              
              <div className="space-y-2">
                {groupData?.members.map(member => (
                  <button
                    key={member.userId}
                    onClick={() => handleSelectMember(member)}
                    className={`w-full text-left p-3 rounded-lg transition border-2 ${
                      selectedMember?.userId === member.userId
                        ? 'bg-green-100 border-green-500'
                        : 'bg-gray-50 border-transparent hover:bg-gray-100'
                    }`}
                  >
                    <p className="font-semibold text-gray-900">{member.name}</p>
                    <p className="text-xs text-gray-600">{member.email}</p>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Feature Control */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-lg p-6">
              {selectedMember ? (
                <>
                  <h2 className="text-xl font-bold text-gray-900 mb-2">{selectedMember.name}</h2>
                  <p className="text-gray-600 mb-6">{selectedMember.email}</p>

                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Feature Access</h3>
                  
                  <div className="grid grid-cols-2 gap-3 mb-6">
                    {memberFeatures.map(feature => (
                      <button
                        key={feature.name}
                        onClick={() => handleFeatureToggle(feature.name)}
                        className={`p-4 rounded-lg border-2 transition text-left ${
                          feature.allowed
                            ? 'bg-green-50 border-green-400 hover:bg-green-100'
                            : 'bg-gray-50 border-gray-300 hover:bg-gray-100'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <p className="font-semibold text-gray-900">{feature.description}</p>
                          <div className={`px-3 py-1 rounded text-xs font-bold ${
                            feature.allowed
                              ? 'bg-green-100 text-green-700'
                              : 'bg-gray-200 text-gray-600'
                          }`}>
                            {feature.allowed ? 'ON' : 'OFF'}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={saveFeatures}
                      className="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-6 rounded-lg transition"
                    >
                      Save Features
                    </button>
                    <button
                      onClick={() => handleRemoveMember(selectedMember.userId)}
                      className="px-6 py-3 bg-red-100 hover:bg-red-200 text-red-700 font-semibold rounded-lg transition"
                    >
                      Remove Member
                    </button>
                  </div>
                </>
              ) : (
                <div className="text-center py-12">
                  <p className="text-gray-600 mb-4">Select a member to manage their features</p>
                  <p className="text-gray-500 text-sm">Click on any member to get started</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
