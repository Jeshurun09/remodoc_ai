import React, { useState, useEffect } from 'react';
import { MapPin, Clock, Star } from 'lucide-react';

interface Doctor {
  id: string;
  name: string;
  specialization: string;
  experience: number;
  isOnline: boolean;
  isAvailable: boolean;
  waitTime: number;
  acceptanceRate: number;
  cancellationRate: number;
  verified: boolean;
  credentialVerified: boolean;
  location?: { lat: number; lng: number };
}

export default function DoctorAvailabilityMap() {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({ specialization: '', onlineOnly: true });
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    // Get user's location
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((pos) => {
        setUserLocation({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        });
      });
    }
    fetchDoctors();
  }, [filter]);

  const fetchDoctors = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        onlineOnly: filter.onlineOnly.toString(),
        ...(filter.specialization && { specialization: filter.specialization }),
        ...(userLocation && {
          lat: userLocation.lat.toString(),
          lng: userLocation.lng.toString(),
          radius: '50',
        }),
      });

      const res = await fetch(`/api/doctors/availability?${params}`);
      const data = await res.json();
      setDoctors(data.doctors || []);
    } catch (error) {
      console.error('Error fetching doctors:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow">
      <h2 className="text-2xl font-bold mb-4">Available Doctors</h2>

      {/* Filters */}
      <div className="mb-6 flex gap-4">
        <div>
          <label className="block text-sm font-medium mb-2">Specialization</label>
          <select
            value={filter.specialization}
            onChange={(e) => setFilter({ ...filter, specialization: e.target.value })}
            className="border rounded-lg p-2"
          >
            <option value="">All Specializations</option>
            <option value="Cardiology">Cardiology</option>
            <option value="Neurology">Neurology</option>
            <option value="Orthopedics">Orthopedics</option>
          </select>
        </div>
        <div className="flex items-end">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={filter.onlineOnly}
              onChange={(e) => setFilter({ ...filter, onlineOnly: e.target.checked })}
            />
            Online Only
          </label>
        </div>
      </div>

      {/* Doctor Cards */}
      {loading ? (
        <div className="text-center text-gray-500">Loading doctors...</div>
      ) : doctors.length === 0 ? (
        <div className="text-center text-gray-500">No doctors available</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {doctors.map((doctor) => (
            <div
              key={doctor.id}
              className={`border rounded-lg p-4 hover:shadow-lg transition-shadow ${
                doctor.isAvailable ? 'border-green-200 bg-green-50' : 'border-gray-200'
              }`}
            >
              {/* Status Badge */}
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h3 className="font-bold text-lg">{doctor.name}</h3>
                  <p className="text-sm text-gray-600">{doctor.specialization}</p>
                  <p className="text-xs text-gray-500">{doctor.experience}+ years</p>
                </div>
                <div className="flex gap-1">
                  {doctor.isOnline && (
                    <span className="w-3 h-3 bg-green-500 rounded-full" title="Online" />
                  )}
                  {doctor.credentialVerified && (
                    <span className="text-blue-600 text-sm" title="Verified">✓</span>
                  )}
                </div>
              </div>

              {/* Metrics */}
              <div className="space-y-2 text-sm mb-3">
                <div className="flex items-center gap-2 text-gray-700">
                  <Clock size={16} />
                  <span>Wait: {doctor.waitTime} min</span>
                </div>
                <div className="flex items-center gap-2 text-gray-700">
                  <Star size={16} className="fill-yellow-400 text-yellow-400" />
                  <span>{(doctor.acceptanceRate * 100).toFixed(0)}% acceptance rate</span>
                </div>
                <div className="text-gray-700">
                  Cancellations: {(doctor.cancellationRate * 100).toFixed(1)}%
                </div>
              </div>

              {/* Availability Status */}
              {doctor.isAvailable ? (
                <button className="w-full bg-green-600 text-white py-2 rounded hover:bg-green-700 font-medium">
                  Book Appointment
                </button>
              ) : (
                <button disabled className="w-full bg-gray-300 text-gray-600 py-2 rounded opacity-50">
                  Unavailable
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
