'use client'

import { useState, useEffect } from 'react'

interface TimelineEvent {
  id: string
  type: string
  title: string
  description: string
  date: string
  category: string
  metadata?: any
}

export default function HealthTimeMachine() {
  const [timeline, setTimeline] = useState<TimelineEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [dateRange, setDateRange] = useState({ start: '', end: '' })
  const [selectedCategory, setSelectedCategory] = useState<string>('all')

  useEffect(() => {
    fetchTimeline()
  }, [dateRange])

  const fetchTimeline = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (dateRange.start) params.append('startDate', dateRange.start)
      if (dateRange.end) params.append('endDate', dateRange.end)

      const res = await fetch(`/api/health-timeline?${params.toString()}`)
      if (res.ok) {
        const data = await res.json()
        setTimeline(data.timeline || [])
      }
    } catch (error) {
      console.error('Error fetching timeline:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredTimeline = selectedCategory === 'all'
    ? timeline
    : timeline.filter(event => event.category === selectedCategory)

  const categories = ['all', 'medical', 'medication', 'diagnostic', 'lifestyle']

  const getEventIcon = (type: string) => {
    const icons: Record<string, string> = {
      symptom: '🩺',
      appointment: '📅',
      medication: '💊',
      vital: '📊',
      scan: '🔬',
      report: '📄',
      custom: '📝'
    }
    return icons[type] || '📋'
  }

  const getEventColor = (category: string) => {
    const colors: Record<string, string> = {
      medical: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400',
      medication: 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400',
      diagnostic: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400',
      lifestyle: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400'
    }
    return colors[category] || 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400'
  }

  // Group events by date
  const groupedEvents = filteredTimeline.reduce((acc, event) => {
    const date = new Date(event.date).toLocaleDateString()
    if (!acc[date]) {
      acc[date] = []
    }
    acc[date].push(event)
    return acc
  }, {} as Record<string, TimelineEvent[]>)

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-cyan-500 mb-2">Health Time Machine</h2>
        <p className="text-gray-600 dark:text-gray-400">
          Visualize your health journey over time. Great for patient engagement and tracking your health progress.
        </p>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="space-y-4 mb-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Start Date:
              </label>
              <input
                type="date"
                value={dateRange.start}
                onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                End Date:
              </label>
              <input
                type="date"
                value={dateRange.end}
                onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Filter by Category:
            </label>
            <div className="flex flex-wrap gap-2">
              {categories.map(category => (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`px-4 py-2 rounded-lg font-semibold text-sm ${
                    selectedCategory === category
                      ? 'bg-cyan-500 text-white'
                      : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  {category.charAt(0).toUpperCase() + category.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <p className="text-gray-500 dark:text-gray-400">Loading timeline...</p>
          </div>
        ) : filteredTimeline.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 dark:text-gray-400">No events found in the selected time range.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(groupedEvents)
              .sort(([dateA], [dateB]) => new Date(dateB).getTime() - new Date(dateA).getTime())
              .map(([date, events]) => (
                <div key={date}>
                  <h3 className="text-lg font-bold text-cyan-500 mb-3 sticky top-0 bg-white dark:bg-gray-800 py-2">
                    {date}
                  </h3>
                  <div className="space-y-3 ml-4 border-l-2 border-cyan-200 dark:border-cyan-800 pl-4">
                    {events.map((event) => (
                      <div
                        key={event.id}
                        className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow"
                      >
                        <div className="flex items-start space-x-3">
                          <span className="text-2xl">{getEventIcon(event.type)}</span>
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-1">
                              <h4 className="font-semibold text-gray-900 dark:text-gray-100">
                                {event.title}
                              </h4>
                              <span className={`px-2 py-1 rounded text-xs font-semibold ${getEventColor(event.category)}`}>
                                {event.category}
                              </span>
                            </div>
                            {event.description && (
                              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                                {event.description}
                              </p>
                            )}
                            <p className="text-xs text-gray-500 dark:text-gray-500">
                              {new Date(event.date).toLocaleTimeString()}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>

      {timeline.length > 0 && (
        <div className="bg-cyan-50 dark:bg-cyan-900/20 rounded-lg p-4 border border-cyan-200 dark:border-cyan-800">
          <h3 className="font-semibold text-cyan-700 dark:text-cyan-300 mb-2">Timeline Statistics</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-2xl font-bold text-cyan-600 dark:text-cyan-400">{timeline.length}</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Events</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-cyan-600 dark:text-cyan-400">
                {new Set(timeline.map(e => e.category)).size}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Categories</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-cyan-600 dark:text-cyan-400">
                {timeline.filter(e => e.type === 'symptom').length}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Symptoms</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-cyan-600 dark:text-cyan-400">
                {timeline.filter(e => e.type === 'appointment').length}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Appointments</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

