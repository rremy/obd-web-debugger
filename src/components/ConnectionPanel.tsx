import { useState } from 'react';
import { obdService } from '../obd.service';
import { useObservable } from '../hooks/useObservable';

export function ConnectionPanel() {
  const status = useObservable(obdService.connectionStatus$, 'disconnected');
  const [error, setError] = useState<string | null>(null);

  if (!navigator.bluetooth) {
    return (
      <div className="rounded-md bg-yellow-100 border border-yellow-300 p-4 text-yellow-800 text-sm">
        Web Bluetooth is not supported. Please use Chrome or Edge.
      </div>
    );
  }

  const statusDot: Record<string, string> = {
    disconnected: 'bg-gray-400',
    connecting: 'bg-yellow-400',
    connected: 'bg-green-500',
    error: 'bg-red-500',
  };

  const statusLabel: Record<string, string> = {
    disconnected: 'Disconnected',
    connecting: 'Connecting...',
    connected: 'Connected',
    error: 'Error',
  };

  const handleConnect = () => {
    setError(null);
    obdService.connect().catch((e: unknown) => {
      setError(e instanceof Error ? e.message : String(e));
    });
  };

  const handleDisconnect = () => {
    obdService.disconnect();
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <span className={`inline-block w-3 h-3 rounded-full ${statusDot[status]}`} />
        <span className="text-sm font-medium">{statusLabel[status]}</span>
      </div>
      <div className="flex gap-2">
        <button
          onClick={handleConnect}
          disabled={status === 'connecting' || status === 'connected'}
          className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-700"
        >
          Connect
        </button>
        <button
          onClick={handleDisconnect}
          disabled={status !== 'connected'}
          className="px-3 py-1.5 text-sm bg-gray-600 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-700"
        >
          Disconnect
        </button>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
