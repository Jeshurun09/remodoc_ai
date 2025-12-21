'use client';
import React, { useEffect, useState } from 'react';

export default function AdminPayoutsPage() {
  const [payouts, setPayouts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetchPayouts();
  }, []);

  async function fetchPayouts() {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/payouts');
      const json = await res.json();
      if (!json.ok) throw new Error(json.error || 'Failed');
      setPayouts(json.data || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function toggleSelect(id: string) {
    setSelected(prev => ({ ...prev, [id]: !prev[id] }));
  }

  async function bulkAction(action: 'approve' | 'trigger') {
    setLoading(true);
    try {
      const ids = Object.keys(selected).filter(k => selected[k]);
      if (ids.length === 0) throw new Error('No payouts selected');
      const res = await fetch('/api/admin/payouts/bulk', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-admin-id': 'admin_demo' }, body: JSON.stringify({ action, ids }) });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error || 'Bulk action failed');
      await fetchPayouts();
      setSelected({});
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  }

  async function exportCsv() {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/payouts/export', { headers: { 'x-admin-id': 'admin_demo' } });
      if (!res.ok) throw new Error('Export failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'payouts.csv';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function doAction(id: string, action: string) {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/payouts/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, adminId: 'admin_demo' }),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error || 'Action failed');
      await fetchPayouts();
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  }

  return (
    <div style={{ padding: 20 }}>
      <h1>Admin — Doctor Payouts</h1>
      {error && <div style={{ color: 'red' }}>{error}</div>}
      {loading && <div>Loading…</div>}
      <div style={{ marginBottom: 12 }}>
        <button onClick={() => bulkAction('approve')} disabled={loading} style={{ marginRight: 8 }}>Bulk Approve</button>
        <button onClick={() => bulkAction('trigger')} disabled={loading} style={{ marginRight: 8 }}>Bulk Trigger</button>
        <button onClick={() => exportCsv()} disabled={loading}>Export CSV</button>
      </div>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th></th>
            <th>Doctor</th>
            <th>Period</th>
            <th>Count</th>
            <th>Amount</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {payouts.map((p) => (
            <tr key={p.id} style={{ borderTop: '1px solid #eee' }}>
              <td><input type="checkbox" checked={!!selected[p.id]} onChange={() => toggleSelect(p.id)} /></td>
              <td>{p.doctor?.user?.name || p.doctorId}</td>
              <td>{new Date(p.periodStart).toLocaleDateString()} - {new Date(p.periodEnd).toLocaleDateString()}</td>
              <td>{p.consultationsCount}</td>
              <td>{p.amountDue} {p.currency}</td>
              <td>{p.status}</td>
              <td>
                <button onClick={() => doAction(p.id, 'approve')} disabled={p.status !== 'READY' && p.status !== 'PENDING'}>Approve</button>
                <button onClick={() => doAction(p.id, 'trigger')} style={{ marginLeft: 8 }} disabled={p.status === 'PROCESSING' || p.status === 'PAID'}>Trigger</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
