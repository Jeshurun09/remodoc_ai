'use client'

import { useState, useEffect } from 'react'

interface Hospital {
  id: string
  name: string
  address: string
  city: string
  state: string
  phone: string
  latitude: number
  longitude: number
  emergency: boolean
  active: boolean
}

export default function HospitalManagement() {
  const [hospitals, setHospitals] = useState<Hospital[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    phone: '',
    latitude: '',
    longitude: '',
    emergency: false,
    specialties: ''
  })

  useEffect(() => {
    fetchHospitals()
  }, [])

  const fetchHospitals = async () => {
    try {
      const response = await fetch('/api/admin/hospitals')
      const data = await response.json()
      if (response.ok) {
        setHospitals(data.hospitals || [])
      }
    } catch (error) {
      console.error('Error fetching hospitals:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const response = await fetch('/api/admin/hospitals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          latitude: parseFloat(formData.latitude),
          longitude: parseFloat(formData.longitude),
          specialties: JSON.stringify(formData.specialties.split(',').map(s => s.trim()))
        })
      })
      if (response.ok) {
        setShowForm(false)
        fetchHospitals()
      }
    } catch (error) {
      console.error('Error creating hospital:', error)
    }
  }

  if (loading) {
    return <div className="text-center py-8">Loading...</div>
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Hospital Management</h2>
          <p className="text-gray-600">Manage hospital listings</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          + Add Hospital
        </button>
      </div>

      {showForm && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4">Add New Hospital</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <input
                type="text"
                placeholder="Hospital Name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                className="px-4 py-2 border border-gray-300 rounded-lg"
              />
              <input
                type="text"
                placeholder="Address"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                required
                className="px-4 py-2 border border-gray-300 rounded-lg"
              />
              <input
                type="text"
                placeholder="City"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                required
                className="px-4 py-2 border border-gray-300 rounded-lg"
              />
              <input
                type="text"
                placeholder="State"
                value={formData.state}
                onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                required
                className="px-4 py-2 border border-gray-300 rounded-lg"
              />
              <input
                type="text"
                placeholder="Zip Code"
                value={formData.zipCode}
                onChange={(e) => setFormData({ ...formData, zipCode: e.target.value })}
                required
                className="px-4 py-2 border border-gray-300 rounded-lg"
              />
              <input
                type="tel"
                placeholder="Phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                required
                className="px-4 py-2 border border-gray-300 rounded-lg"
              />
              <input
                type="number"
                step="any"
                placeholder="Latitude"
                value={formData.latitude}
                onChange={(e) => setFormData({ ...formData, latitude: e.target.value })}
                required
                className="px-4 py-2 border border-gray-300 rounded-lg"
              />
              <input
                type="number"
                step="any"
                placeholder="Longitude"
                value={formData.longitude}
                onChange={(e) => setFormData({ ...formData, longitude: e.target.value })}
                required
                className="px-4 py-2 border border-gray-300 rounded-lg"
              />
            </div>
            <input
              type="text"
              placeholder="Specialties (comma-separated)"
              value={formData.specialties}
              onChange={(e) => setFormData({ ...formData, specialties: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
            />
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={formData.emergency}
                onChange={(e) => setFormData({ ...formData, emergency: e.target.checked })}
              />
              <span>Emergency Services Available</span>
            </label>
            <div className="flex space-x-2">
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Create
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {hospitals.map((hospital) => (
          <div
            key={hospital.id}
            className="bg-white border border-gray-200 rounded-lg p-4"
          >
            <h3 className="font-semibold text-gray-900 mb-2">{hospital.name}</h3>
            <p className="text-sm text-gray-600 mb-2">{hospital.address}</p>
            <p className="text-sm text-gray-600 mb-2">{hospital.city}, {hospital.state}</p>
            <p className="text-sm text-gray-600 mb-2">Phone: {hospital.phone}</p>
            {hospital.emergency && (
              <span className="inline-block bg-red-100 text-red-800 text-xs px-2 py-1 rounded">
                Emergency
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

