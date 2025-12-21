'use client';

import { useState, useEffect } from 'react';

interface TwoFactorStatus {
  isEnabled: boolean;
  setupDate?: string;
  verifiedAt?: string;
}

interface TwoFactorStatus {
  isEnabled: boolean;
  setupDate?: string;
  verifiedAt?: string;
}

export default function TwoFactorSettings() {
  const [status, setStatus] = useState<TwoFactorStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [setupLoading, setSetupLoading] = useState(false);
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [disableLoading, setDisableLoading] = useState(false);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [token, setToken] = useState('');
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    fetchStatus();
  }, []);

  const fetchStatus = async () => {
    try {
      const response = await fetch('/api/auth/2fa/status');
      if (response.ok) {
        const data = await response.json();
        setStatus(data);
      }
    } catch (error) {
      console.error('Failed to fetch 2FA status:', error);
    } finally {
      setLoading(false);
    }
  };

  const setup2FA = async () => {
    setSetupLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/auth/2fa/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'setup' }),
      });

      const data = await response.json();

      if (response.ok) {
        setQrCode(data.qrCode);
        setSecret(data.secret);
        setSuccess('2FA setup initiated. Scan the QR code with your authenticator app.');
      } else {
        setError(data.error || 'Failed to setup 2FA');
      }
    } catch (error) {
      setError('Failed to setup 2FA');
    } finally {
      setSetupLoading(false);
    }
  };

  const verify2FA = async () => {
    if (!token) return;

    setVerifyLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/auth/2fa/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'verify', token }),
      });

      const data = await response.json();

      if (response.ok) {
        setBackupCodes(data.backupCodes);
        setQrCode(null);
        setSecret(null);
        setToken('');
        setSuccess('2FA enabled successfully! Save your backup codes in a safe place.');
        await fetchStatus();
      } else {
        setError(data.error || 'Failed to verify token');
      }
    } catch (error) {
      setError('Failed to verify token');
    } finally {
      setVerifyLoading(false);
    }
  };

  const disable2FA = async () => {
    if (!token) return;

    setDisableLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/auth/2fa/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'disable', token }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess('2FA disabled successfully');
        setQrCode(null);
        setSecret(null);
        setToken('');
        setBackupCodes([]);
        await fetchStatus();
      } else {
        setError(data.error || 'Failed to disable 2FA');
      }
    } catch (error) {
      setError('Failed to disable 2FA');
    } finally {
      setDisableLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-5 h-5 bg-gray-200 rounded"></div>
          <h2 className="text-lg font-semibold">Two-Factor Authentication</h2>
        </div>
        <div className="animate-pulse">Loading...</div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-5 h-5 bg-gray-200 rounded"></div>
        <h2 className="text-lg font-semibold">Two-Factor Authentication</h2>
      </div>
      <p className="text-gray-600 mb-6">Add an extra layer of security to your account with 2FA</p>

      {/* Status */}
      <div className="flex items-center gap-2 mb-6">
        <span>Status:</span>
        <span className={`px-2 py-1 rounded text-xs ${status?.isEnabled ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
          {status?.isEnabled ? 'Enabled' : 'Disabled'}
        </span>
        {status?.setupDate && (
          <span className="text-sm text-gray-500">
            (Setup: {new Date(status.setupDate).toLocaleDateString()})
          </span>
        )}
      </div>
        {/* Status */}
        <div className="flex items-center gap-2">
          <span>Status:</span>
          <span className={`px-2 py-1 rounded text-sm ${
            status?.isEnabled ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
          }`}>
            {status?.isEnabled ? 'Enabled' : 'Disabled'}
          </span>
          {status?.setupDate && (
            <span className="text-sm text-muted-foreground">
              (Setup: {new Date(status.setupDate).toLocaleDateString()})
            </span>
          )}
        </div>

      {/* Setup Section */}
      {!status?.isEnabled && !qrCode && (
        <div className="space-y-4">
          <button
            onClick={setup2FA}
            disabled={setupLoading}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {setupLoading ? 'Setting up...' : 'Setup 2FA'}
          </button>
        </div>
      )}

      {/* QR Code Section */}
      {qrCode && (
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-4 h-4 bg-blue-500 rounded"></div>
              <span className="font-medium">Setup Required</span>
            </div>
            <p className="text-sm">Scan this QR code with your authenticator app (Google Authenticator, Authy, etc.)</p>
          </div>

          <div className="flex justify-center">
            <img src={qrCode} alt="2FA QR Code" className="border rounded" />
          </div>

          {secret && (
            <div className="space-y-2">
              <label className="block text-sm font-medium">Manual Entry Code:</label>
              <code className="block p-2 bg-gray-100 rounded text-sm">{secret}</code>
            </div>
          )}

          <div className="space-y-2">
            <label htmlFor="token" className="block text-sm font-medium">Enter verification code:</label>
            <input
              id="token"
              type="text"
              placeholder="000000"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              maxLength={6}
              className="w-full p-2 border rounded"
            />
          </div>

          <button
            onClick={verify2FA}
            disabled={verifyLoading || !token}
            className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:opacity-50"
          >
            {verifyLoading ? 'Verifying...' : 'Verify & Enable 2FA'}
          </button>
        </div>
      )}

      {/* Backup Codes */}
      {backupCodes.length > 0 && (
        <div className="space-y-4">
          <div className="bg-yellow-50 border border-yellow-200 rounded p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-4 h-4 bg-yellow-500 rounded"></div>
              <span className="font-medium">Important</span>
            </div>
            <p className="text-sm">Save these backup codes in a safe place. You can use them to access your account if you lose your device.</p>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {backupCodes.map((code, index) => (
              <code key={index} className="block p-2 bg-gray-100 rounded text-center">
                {code}
              </code>
            ))}
          </div>

          <button
            onClick={() => {
              navigator.clipboard.writeText(backupCodes.join('\n'));
              setSuccess('Backup codes copied to clipboard');
            }}
            className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700"
          >
            Copy Codes
          </button>
        </div>
      )}

      {/* Disable Section */}
      {status?.isEnabled && !qrCode && (
        <div className="space-y-4">
          <div className="bg-red-50 border border-red-200 rounded p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-4 h-4 bg-red-500 rounded"></div>
              <span className="font-medium">Disable 2FA</span>
            </div>
            <p className="text-sm">To disable 2FA, enter a verification code from your authenticator app.</p>
          </div>

          <div className="space-y-2">
            <label htmlFor="disable-token" className="block text-sm font-medium">Verification code:</label>
            <input
              id="disable-token"
              type="text"
              placeholder="000000"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              maxLength={6}
              className="w-full p-2 border rounded"
            />
          </div>

          <button
            onClick={disable2FA}
            disabled={disableLoading || !token}
            className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 disabled:opacity-50"
          >
            {disableLoading ? 'Disabling...' : 'Disable 2FA'}
          </button>
        </div>
      )}

      {/* Messages */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded p-4">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 rounded p-4">
          <p className="text-green-800">{success}</p>
        </div>
      )}
    </div>
  );
}