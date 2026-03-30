import { useState } from 'react';
import { obdService } from '../obd.service';

interface Props {
  isConnected: boolean;
}

export function ControlPanel({ isConnected }: Props) {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [wakeupEnabled, setWakeupEnabled] = useState(true);

  const sendClimate = async (enable: boolean) => {
    if (!isConnected || loading) return;
    setLoading(true);
    setStatus(null);
    try {
      await obdService.sendClimateControl(enable, wakeupEnabled);
      setStatus(enable ? 'Climate ON sent' : 'Climate OFF sent');
    } catch (err) {
      setStatus(`Error: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium">Climate Control (Pre-2016 AZE0)</label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={wakeupEnabled}
            onChange={e => setWakeupEnabled(e.target.checked)}
          />
          Wakeup before send
        </label>
        <div className="flex items-center gap-2">
          <button
            onClick={() => sendClimate(true)}
            disabled={!isConnected || loading}
            className="px-3 py-1.5 text-sm bg-green-600 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-green-700"
          >
            {loading ? 'Sending...' : 'Turn ON'}
          </button>
          <button
            onClick={() => sendClimate(false)}
            disabled={!isConnected || loading}
            className="px-3 py-1.5 text-sm bg-red-600 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-red-700"
          >
            {loading ? 'Sending...' : 'Turn OFF'}
          </button>
        </div>
      </div>

      {!isConnected && (
        <p className="text-sm text-gray-400">Connect first to use controls.</p>
      )}

      {status && (
        <p className={`text-sm ${status.startsWith('Error') ? 'text-red-600' : 'text-green-600'}`}>
          {status}
        </p>
      )}
    </div>
  );
}
