import React, { useState, useEffect } from 'react';

interface TriageResult {
  urgencyLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  urgencyScore: number;
  routedToDoctorId?: string;
  estimatedWaitTime?: number;
  autoAssigned: boolean;
}

export default function TriageSystem() {
  const [symptoms, setSymptoms] = useState('');
  const [triage, setTriage] = useState<TriageResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // First create symptom report
      const reportRes = await fetch('/api/symptoms/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symptoms }),
      });

      const reportData = await reportRes.json();

      // Then trigger triage
      const triageRes = await fetch('/api/triage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symptomReportId: reportData.id }),
      });

      const triageData = await triageRes.json();
      setTriage(triageData.triage);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error processing symptoms');
    } finally {
      setLoading(false);
    }
  };

  const getUrgencyColor = (level: string) => {
    const colors: Record<string, string> = {
      LOW: 'bg-green-100 border-green-300 text-green-900',
      MEDIUM: 'bg-yellow-100 border-yellow-300 text-yellow-900',
      HIGH: 'bg-orange-100 border-orange-300 text-orange-900',
      CRITICAL: 'bg-red-100 border-red-300 text-red-900',
    };
    return colors[level] || colors.MEDIUM;
  };

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow">
      <h2 className="text-2xl font-bold mb-4">Smart Medical Triage</h2>

      <form onSubmit={handleSubmit} className="mb-6">
        <textarea
          value={symptoms}
          onChange={(e) => setSymptoms(e.target.value)}
          placeholder="Describe your symptoms in detail..."
          className="w-full p-3 border rounded-lg mb-4"
          rows={4}
        />
        <button
          type="submit"
          disabled={loading || !symptoms.trim()}
          className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Analyzing...' : 'Submit for Triage'}
        </button>
      </form>

      {error && (
        <div className="bg-red-100 border border-red-300 text-red-900 p-4 rounded-lg mb-4">
          {error}
        </div>
      )}

      {triage && (
        <div className="border-l-4 p-4 rounded-lg" style={{
          borderColor: triage.urgencyLevel === 'CRITICAL' ? '#dc2626' : '#f59e0b'
        }}>
          <div className={`p-4 rounded-lg ${getUrgencyColor(triage.urgencyLevel)}`}>
            <h3 className="font-bold mb-2">Urgency Level: {triage.urgencyLevel}</h3>
            <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
              <div
                className="bg-blue-600 h-2 rounded-full"
                style={{ width: `${triage.urgencyScore * 100}%` }}
              />
            </div>
            <p className="text-sm mb-2">Confidence Score: {(triage.urgencyScore * 100).toFixed(1)}%</p>

            {triage.autoAssigned && (
              <div className="bg-green-50 p-3 rounded mt-3">
                ✓ Auto-assigned to available doctor
                {triage.estimatedWaitTime && (
                  <p className="text-sm">Estimated wait: {triage.estimatedWaitTime} minutes</p>
                )}
              </div>
            )}

            {triage.urgencyLevel === 'CRITICAL' && (
              <div className="bg-red-50 p-3 rounded mt-3 border border-red-200">
                ⚠️ CRITICAL - Seek immediate medical attention or call emergency services
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
