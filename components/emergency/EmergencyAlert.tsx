'use client';

import { useState, useEffect } from 'react';

interface Emergency {
  id: string;
  type: string;
  severity: string;
  description: string;
  location?: string;
  status: string;
  symptoms: string[];
  medicalConditions: string[];
  medications: string[];
  allergies: string[];
  createdAt: string;
  resolvedAt?: string;
  patient: {
    user: {
      name: string;
    };
  };
}

export default function EmergencyAlert() {
  const [emergencies, setEmergencies] = useState<Emergency[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showForm, setShowForm] = useState(false);

  // Form state
  const [type, setType] = useState('');
  const [severity, setSeverity] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [symptoms, setSymptoms] = useState('');
  const [medicalConditions, setMedicalConditions] = useState('');
  const [medications, setMedications] = useState('');
  const [allergies, setAllergies] = useState('');

  useEffect(() => {
    fetchEmergencies();
  }, []);

  const fetchEmergencies = async () => {
    try {
      const response = await fetch('/api/emergency');
      if (response.ok) {
        const data = await response.json();
        setEmergencies(data);
      }
    } catch (error) {
      console.error('Failed to fetch emergencies:', error);
    } finally {
      setLoading(false);
    }
  };

  const createEmergency = async () => {
    if (!type || !severity || !description) return;

    setCreating(true);
    try {
      const emergencyData = {
        type,
        severity,
        description,
        location: location || undefined,
        symptoms: symptoms ? symptoms.split(',').map(s => s.trim()) : [],
        medicalConditions: medicalConditions ? medicalConditions.split(',').map(c => c.trim()) : [],
        medications: medications ? medications.split(',').map(m => m.trim()) : [],
        allergies: allergies ? allergies.split(',').map(a => a.trim()) : [],
      };

      const response = await fetch('/api/emergency', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(emergencyData),
      });

      if (response.ok) {
        const newEmergency = await response.json();
        setEmergencies(prev => [newEmergency, ...prev]);
        resetForm();
        setShowForm(false);
      }
    } catch (error) {
      console.error('Failed to create emergency:', error);
    } finally {
      setCreating(false);
    }
  };

  const resetForm = () => {
    setType('');
    setSeverity('');
    setDescription('');
    setLocation('');
    setSymptoms('');
    setMedicalConditions('');
    setMedications('');
    setAllergies('');
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-5 h-5 bg-red-500 rounded"></div>
          <h2 className="text-lg font-semibold">Emergency System</h2>
        </div>
        <div className="animate-pulse space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-20 bg-gray-200 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Emergency Alert Button */}
      <div className="bg-white rounded-lg shadow p-6 border-red-200 border">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 bg-red-500 rounded mx-auto"></div>
          <div>
            <h3 className="text-lg font-semibold">Emergency Assistance</h3>
            <p className="text-gray-600">
              Trigger an emergency alert to notify medical professionals and emergency contacts
            </p>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="bg-red-600 text-white px-6 py-3 rounded-lg hover:bg-red-700 font-medium"
          >
            {showForm ? 'Cancel Emergency Alert' : 'Trigger Emergency Alert'}
          </button>
        </div>
      </div>

      {/* Emergency Form */}
      {showForm && (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="mb-4">
            <h3 className="text-lg font-semibold">Create Emergency Alert</h3>
            <p className="text-gray-600">Provide details about your emergency situation</p>
          </div>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="block text-sm font-medium">Emergency Type</label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  className="w-full p-2 border rounded-lg"
                >
                  <option value="">Select type</option>
                  <option value="MEDICAL">Medical Emergency</option>
                  <option value="ACCIDENT">Accident</option>
                  <option value="HEART">Heart Attack</option>
                  <option value="STROKE">Stroke</option>
                  <option value="BREATHING">Breathing Difficulty</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium">Severity</label>
                <select
                  value={severity}
                  onChange={(e) => setSeverity(e.target.value)}
                  className="w-full p-2 border rounded-lg"
                >
                  <option value="">Select severity</option>
                  <option value="CRITICAL">Critical</option>
                  <option value="HIGH">High</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="LOW">Low</option>
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium">Description</label>
              <textarea
                placeholder="Describe your emergency situation..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full p-2 border rounded-lg h-20"
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium">Location (optional)</label>
              <input
                type="text"
                placeholder="Your current location"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full p-2 border rounded-lg"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="block text-sm font-medium">Symptoms (comma-separated)</label>
                <input
                  type="text"
                  placeholder="e.g., chest pain, shortness of breath"
                  value={symptoms}
                  onChange={(e) => setSymptoms(e.target.value)}
                  className="w-full p-2 border rounded-lg"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium">Medical Conditions (comma-separated)</label>
                <input
                  type="text"
                  placeholder="e.g., diabetes, hypertension"
                  value={medicalConditions}
                  onChange={(e) => setMedicalConditions(e.target.value)}
                  className="w-full p-2 border rounded-lg"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="block text-sm font-medium">Current Medications (comma-separated)</label>
                <input
                  type="text"
                  placeholder="e.g., aspirin, insulin"
                  value={medications}
                  onChange={(e) => setMedications(e.target.value)}
                  className="w-full p-2 border rounded-lg"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium">Allergies (comma-separated)</label>
                <input
                  type="text"
                  placeholder="e.g., penicillin, nuts"
                  value={allergies}
                  onChange={(e) => setAllergies(e.target.value)}
                  className="w-full p-2 border rounded-lg"
                />
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={createEmergency}
                disabled={creating || !type || !severity || !description}
                className="flex-1 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                {creating ? 'Creating Alert...' : 'Send Emergency Alert'}
              </button>
              <button
                onClick={() => setShowForm(false)}
                className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Emergency History */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="mb-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <div className="w-5 h-5 bg-gray-500 rounded"></div>
            Emergency History
          </h3>
          <p className="text-gray-600">Your previous emergency alerts and their status</p>
        </div>
        <div>
          {emergencies.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No emergency alerts yet
            </div>
          ) : (
            <div className="space-y-4">
              {emergencies.map((emergency) => (
                <div key={emergency.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        emergency.severity.toLowerCase() === 'critical' || emergency.severity.toLowerCase() === 'high'
                          ? 'bg-red-100 text-red-800'
                          : emergency.severity.toLowerCase() === 'medium'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {emergency.severity}
                      </span>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        emergency.status.toLowerCase() === 'active'
                          ? 'bg-red-100 text-red-800'
                          : emergency.status.toLowerCase() === 'responding'
                          ? 'bg-blue-100 text-blue-800'
                          : emergency.status.toLowerCase() === 'resolved'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {emergency.status}
                      </span>
                    </div>
                    <span className="text-sm text-gray-500">
                      {new Date(emergency.createdAt).toLocaleString()}
                    </span>
                  </div>

                  <h4 className="font-medium mb-2">{emergency.type}</h4>
                  <p className="text-sm text-gray-600 mb-3">
                    {emergency.description}
                  </p>

                  {emergency.location && (
                    <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
                      <div className="w-4 h-4 bg-gray-400 rounded"></div>
                      {emergency.location}
                    </div>
                  )}

                  {(emergency.symptoms.length > 0 || emergency.medicalConditions.length > 0) && (
                    <div className="space-y-2">
                      {emergency.symptoms.length > 0 && (
                        <div>
                          <span className="text-sm font-medium">Symptoms:</span>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {emergency.symptoms.map((symptom, index) => (
                              <span key={index} className="px-2 py-1 border rounded text-xs">
                                {symptom}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {emergency.medicalConditions.length > 0 && (
                        <div>
                          <span className="text-sm font-medium">Conditions:</span>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {emergency.medicalConditions.map((condition, index) => (
                              <span key={index} className="px-2 py-1 border rounded text-xs">
                                {condition}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}