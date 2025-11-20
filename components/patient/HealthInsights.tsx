'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'

interface HealthInsight {
  id: string
  type: string
  title: string
  content: string
  source?: string
  createdAt: string
  read: boolean
}

interface LifestyleData {
  sleepHours?: number
  hydration?: number
  steps?: number
  activityMinutes?: number
  notes?: string
}

export default function HealthInsights() {
  const { data: session } = useSession()
  const [insights, setInsights] = useState<HealthInsight[]>([])
  const [lifestyleData, setLifestyleData] = useState<LifestyleData>({})
  const [alerts, setAlerts] = useState<string[]>([])
  const [healthGoals, setHealthGoals] = useState({
    sleep: 8,
    water: 2000,
    steps: 10000,
    activity: 30
  })

  useEffect(() => {
    fetchInsights()
    fetchLifestyleData()
    fetchAlerts()
  }, [])

  const fetchInsights = async () => {
    if (!session?.user?.id) return
    try {
      const res = await fetch('/api/health-insights')
      if (res.ok) {
        const data = await res.json()
        setInsights(data)
      } else {
        // Mock data for demo
        setInsights([
          {
            id: '1',
            type: 'tip',
            title: 'Stay Hydrated',
            content: 'Drink at least 8 glasses of water daily to maintain optimal health.',
            source: 'WHO',
            createdAt: new Date().toISOString(),
            read: false
          },
          {
            id: '2',
            type: 'alert',
            title: 'Flu Season Alert',
            content: 'CDC reports increased flu activity in your area. Consider getting vaccinated.',
            source: 'CDC',
            createdAt: new Date().toISOString(),
            read: false
          }
        ])
      }
    } catch (error) {
      console.error('Failed to fetch insights:', error)
    }
  }

  const fetchLifestyleData = async () => {
    if (!session?.user?.id) return
    try {
      const res = await fetch('/api/lifestyle-tracking')
      if (res.ok) {
        const data = await res.json()
        if (data.length > 0) {
          setLifestyleData(data[0])
        }
      }
    } catch (error) {
      console.error('Failed to fetch lifestyle data:', error)
    }
  }

  const fetchAlerts = async () => {
    // Mock WHO/CDC alerts
    setAlerts([
      'COVID-19: New variant detected in your region',
      'Seasonal flu: Vaccination recommended',
      'Heat advisory: Stay hydrated and avoid prolonged sun exposure'
    ])
  }

  const saveLifestyleData = async () => {
    if (!session?.user?.id) return
    try {
      const res = await fetch('/api/lifestyle-tracking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(lifestyleData)
      })
      if (res.ok) {
        alert('Lifestyle data saved successfully!')
        fetchLifestyleData()
      }
    } catch (error) {
      console.error('Failed to save lifestyle data:', error)
    }
  }

  const markInsightAsRead = async (id: string) => {
    try {
      const res = await fetch(`/api/health-insights/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ read: true })
      })
      if (res.ok) {
        setInsights(insights.map(i => i.id === id ? { ...i, read: true } : i))
      }
    } catch (error) {
      console.error('Failed to mark insight as read:', error)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-cyan-500">Preventive & Personal Health Insights</h2>
        <Link href="/premium" className="text-sm text-cyan-500 hover:underline">
          Upgrade to Premium
        </Link>
      </div>

      {/* Health Tips */}
      <div className="surface rounded-lg p-6 border subtle-border">
        <h3 className="text-lg font-semibold text-cyan-500 mb-4">Personalized Health Tips</h3>
        <div className="space-y-3">
          {insights.filter(i => i.type === 'tip').map((insight) => (
            <div
              key={insight.id}
              className={`p-4 rounded-lg border ${
                insight.read ? 'bg-gray-50' : 'bg-blue-50 border-blue-200'
              }`}
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="font-semibold text-cyan-500">{insight.title}</div>
                  <div className="text-sm text-cyan-500 mt-1">{insight.content}</div>
                  {insight.source && (
                    <div className="text-xs text-gray-500 mt-2">Source: {insight.source}</div>
                  )}
                </div>
                {!insight.read && (
                  <button
                    onClick={() => markInsightAsRead(insight.id)}
                    className="ml-4 text-xs text-blue-500 hover:underline"
                  >
                    Mark as read
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Outbreak Alerts */}
      <div className="surface rounded-lg p-6 border subtle-border">
        <h3 className="text-lg font-semibold text-cyan-500 mb-4">Outbreak Alerts (WHO/CDC)</h3>
        <div className="space-y-2">
          {alerts.map((alert, idx) => (
            <div key={idx} className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-start">
                <span className="text-yellow-600 mr-2">⚠️</span>
                <span className="text-sm text-cyan-500">{alert}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Lifestyle Tracking */}
      <div className="surface rounded-lg p-6 border subtle-border">
        <h3 className="text-lg font-semibold text-cyan-500 mb-4">Lifestyle Tracking</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-cyan-500 mb-1">Sleep Hours</label>
            <input
              type="number"
              value={lifestyleData.sleepHours || ''}
              onChange={(e) => setLifestyleData({ ...lifestyleData, sleepHours: parseFloat(e.target.value) })}
              placeholder="8"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 text-black"
            />
            <div className="text-xs text-gray-500 mt-1">Goal: {healthGoals.sleep} hours</div>
          </div>
          <div>
            <label className="block text-sm font-medium text-cyan-500 mb-1">Water Intake (ml)</label>
            <input
              type="number"
              value={lifestyleData.hydration || ''}
              onChange={(e) => setLifestyleData({ ...lifestyleData, hydration: parseInt(e.target.value) })}
              placeholder="2000"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 text-black"
            />
            <div className="text-xs text-gray-500 mt-1">Goal: {healthGoals.water} ml</div>
          </div>
          <div>
            <label className="block text-sm font-medium text-cyan-500 mb-1">Steps</label>
            <input
              type="number"
              value={lifestyleData.steps || ''}
              onChange={(e) => setLifestyleData({ ...lifestyleData, steps: parseInt(e.target.value) })}
              placeholder="10000"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 text-black"
            />
            <div className="text-xs text-gray-500 mt-1">Goal: {healthGoals.steps} steps</div>
          </div>
          <div>
            <label className="block text-sm font-medium text-cyan-500 mb-1">Activity Minutes</label>
            <input
              type="number"
              value={lifestyleData.activityMinutes || ''}
              onChange={(e) => setLifestyleData({ ...lifestyleData, activityMinutes: parseInt(e.target.value) })}
              placeholder="30"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 text-black"
            />
            <div className="text-xs text-gray-500 mt-1">Goal: {healthGoals.activity} minutes</div>
          </div>
        </div>
        <div className="mb-4">
          <label className="block text-sm font-medium text-cyan-500 mb-1">Notes</label>
          <textarea
            value={lifestyleData.notes || ''}
            onChange={(e) => setLifestyleData({ ...lifestyleData, notes: e.target.value })}
            placeholder="Add any notes about your day..."
            rows={3}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 text-black"
          />
        </div>
        <button
          onClick={saveLifestyleData}
          className="px-6 py-2 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600"
        >
          Save Daily Check-in
        </button>
      </div>

      {/* Health Goals */}
      <div className="surface rounded-lg p-6 border subtle-border">
        <h3 className="text-lg font-semibold text-cyan-500 mb-4">Health Goals</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 bg-gray-50 rounded-lg">
            <div className="text-sm text-gray-500">Sleep</div>
            <div className="text-2xl font-bold text-cyan-500">{healthGoals.sleep}h</div>
          </div>
          <div className="p-4 bg-gray-50 rounded-lg">
            <div className="text-sm text-gray-500">Water</div>
            <div className="text-2xl font-bold text-cyan-500">{healthGoals.water}ml</div>
          </div>
          <div className="p-4 bg-gray-50 rounded-lg">
            <div className="text-sm text-gray-500">Steps</div>
            <div className="text-2xl font-bold text-cyan-500">{healthGoals.steps.toLocaleString()}</div>
          </div>
          <div className="p-4 bg-gray-50 rounded-lg">
            <div className="text-sm text-gray-500">Activity</div>
            <div className="text-2xl font-bold text-cyan-500">{healthGoals.activity}m</div>
          </div>
        </div>
      </div>
    </div>
  )
}

