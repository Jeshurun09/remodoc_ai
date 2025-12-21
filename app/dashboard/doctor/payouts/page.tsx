'use client';
import React, { useEffect, useState } from 'react';

export default function DoctorPayoutsPage() {
  const [payouts, setPayouts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchPayouts();
  }, []);

  async function fetchPayouts() {
    setLoading(true);
    try {
      // For demo, pass doctorId via header 'x-user-id' or query param
      const res = await fetch('/api/doctor/payouts?doctorId=', { headers: { 'x-user-id': 'demo_doctor_id' } });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error || 'Failed');
      setPayouts(json.data || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ padding: 20 }}>
      <h1>Your Payouts</h1>
      {error && <div style={{ color: 'red' }}>{error}</div>}
      {loading && <div>Loading…</div>}
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th>Period</th>
            <th>Count</th>
            <th>Amount</th>
            <th>Status</th>
            <th>Provider Ref</th>
          </tr>
        </thead>
        <tbody>
          {payouts.map((p) => (
            <tr key={p.id} style={{ borderTop: '1px solid #eee' }}>
              <td>{new Date(p.periodStart).toLocaleDateString()} - {new Date(p.periodEnd).toLocaleDateString()}</td>
              <td>{p.consultationsCount}</td>
              <td>{p.amountDue} {p.currency}</td>
              <td>{p.status}</td>
              <td>{p.providerReference || '-'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
