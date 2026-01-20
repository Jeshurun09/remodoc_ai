'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { SubscriptionPlan } from '@prisma/client'

export default function CreateGroupPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan>('FAMILY')
  const [maxMembers, setMaxMembers] = useState(5)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const planDetails: Record<SubscriptionPlan, { description: string; price: number; minMembers: number; maxMembersAllowed: number }> = {
    FREE: { description: 'Not available for groups', price: 0, minMembers: 1, maxMembersAllowed: 1 },
    STUDENT: { description: 'Not available for groups', price: 2999, minMembers: 1, maxMembersAllowed: 1 },
    INDIVIDUAL: { description: 'Not available for groups', price: 9999, minMembers: 1, maxMembersAllowed: 1 },
    SMALL_GROUP: { description: '2-3 person groups', price: 19999, minMembers: 2, maxMembersAllowed: 3 },
    FAMILY: { description: 'Family plans up to 5 people', price: 29999, minMembers: 2, maxMembersAllowed: 10 }
  }

  const handleCreateGroup = async () => {
    if (selectedPlan === 'INDIVIDUAL' || selectedPlan === 'STUDENT' || selectedPlan === 'FREE') {
      setError('Please select a group plan (SMALL_GROUP or FAMILY)')
      return
    }

    if (maxMembers < 2 || maxMembers > 10) {
      setError('Maximum members must be between 2 and 10')
      return
    }

    setLoading(true)

    try {
      const res = await fetch('/api/subscription/group', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create',
          plan: selectedPlan,
          maxMembers
        })
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to create group')
      }

      const data = await res.json()
      alert('Group created successfully!')
      router.push(`/premium/group/${data.group.id}`)
    } catch (err: any) {
      setError(err.message || 'Failed to create group')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-100 p-6">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link href="/premium/profile" className="text-purple-600 hover:text-purple-700 text-sm font-medium mb-4 inline-block">
            ← Back to Premium Profile
          </Link>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Create Group Plan</h1>
          <p className="text-gray-600">Set up a subscription for your family or team</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-700">{error}</p>
          </div>
        )}

        <div className="bg-white rounded-lg shadow-lg p-8">
          {/* Plan Selection */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Select Plan</h2>
            
            <div className="space-y-3">
              {Object.entries(planDetails).map(([plan, details]) => (
                <button
                  key={plan}
                  onClick={() => {
                    if (plan === 'SMALL_GROUP' || plan === 'FAMILY') {
                      setSelectedPlan(plan as SubscriptionPlan)
                    }
                  }}
                  disabled={plan === 'FREE' || plan === 'STUDENT' || plan === 'INDIVIDUAL'}
                  className={`w-full p-4 rounded-lg border-2 transition text-left ${
                    selectedPlan === plan && (plan === 'SMALL_GROUP' || plan === 'FAMILY')
                      ? 'bg-purple-100 border-purple-500'
                      : plan === 'FREE' || plan === 'STUDENT' || plan === 'INDIVIDUAL'
                      ? 'bg-gray-50 border-gray-200 opacity-50 cursor-not-allowed'
                      : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                  }`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <p className="font-bold text-gray-900">{plan}</p>
                    <p className="text-lg font-bold text-purple-600">KES {(details.price / 100).toFixed(2)}</p>
                  </div>
                  <p className="text-sm text-gray-600">{details.description}</p>
                  <p className="text-xs text-gray-500 mt-2">Up to {details.maxMembersAllowed} members</p>
                </button>
              ))}
            </div>
          </div>

          {/* Max Members Selection */}
          {(selectedPlan === 'SMALL_GROUP' || selectedPlan === 'FAMILY') && (
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Maximum Members</h2>
              
              <div className="space-y-4">
                <p className="text-gray-600">How many people do you want in this group?</p>
                
                <div className="flex gap-2">
                  <button
                    onClick={() => setMaxMembers(Math.max(2, maxMembers - 1))}
                    className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-900 font-bold rounded-lg transition"
                  >
                    −
                  </button>
                  
                  <input
                    type="number"
                    value={maxMembers}
                    onChange={e => {
                      const val = parseInt(e.target.value) || 0
                      setMaxMembers(Math.min(Math.max(2, val), 10))
                    }}
                    min={2}
                    max={10}
                    className="flex-1 px-4 py-2 text-center text-2xl font-bold border-2 border-purple-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                  
                  <button
                    onClick={() => setMaxMembers(Math.min(10, maxMembers + 1))}
                    className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-900 font-bold rounded-lg transition"
                  >
                    +
                  </button>
                </div>
                
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                  <p className="text-purple-900">
                    <span className="font-bold">Group size: </span>{maxMembers} members
                    <span className="text-purple-700"> (including you as moderator)</span>
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Summary */}
          <div className="bg-gray-50 rounded-lg p-6 mb-8">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Summary</h3>
            <div className="space-y-2 text-gray-700">
              <div className="flex justify-between">
                <p>Plan:</p>
                <p className="font-semibold">{selectedPlan}</p>
              </div>
              <div className="flex justify-between">
                <p>Maximum Members:</p>
                <p className="font-semibold">{maxMembers}</p>
              </div>
              <div className="flex justify-between">
                <p>Monthly Price:</p>
                <p className="font-semibold text-purple-600">KES {(planDetails[selectedPlan]?.price / 100).toFixed(2)}</p>
              </div>
              <div className="border-t pt-2 flex justify-between text-lg">
                <p className="font-bold">Total:</p>
                <p className="font-bold text-purple-600">KES {(planDetails[selectedPlan]?.price / 100).toFixed(2)}/month</p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              onClick={handleCreateGroup}
              disabled={loading || selectedPlan === 'FREE' || selectedPlan === 'STUDENT' || selectedPlan === 'INDIVIDUAL'}
              className="flex-1 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white font-bold py-3 px-6 rounded-lg transition"
            >
              {loading ? 'Creating...' : 'Create Group'}
            </button>
            <Link
              href="/premium/profile"
              className="px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-900 font-bold rounded-lg transition text-center"
            >
              Cancel
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
