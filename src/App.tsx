import { useState } from 'react';
import { ConnectionPanel } from './components/ConnectionPanel';
import { PollingPanel } from './components/PollingPanel';
import { ListenPanel } from './components/ListenPanel';
import { ControlPanel } from './components/ControlPanel';
import { obdService } from './obd.service';
import { useObservable } from './hooks/useObservable';

type Mode = 'polling' | 'listening' | 'control';

function App() {
  const [mode, setMode] = useState<Mode>('polling');
  const status = useObservable(obdService.connectionStatus$, 'disconnected');
  const isConnected = status === 'connected';

  const handleModeChange = (newMode: Mode) => {
    if (mode === 'listening' && newMode === 'polling') {
      obdService.stopListening().catch(() => {});
    }
    setMode(newMode);
  };

  if (!navigator.bluetooth) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow p-6 max-w-md w-full">
          <div className="bg-yellow-100 border border-yellow-300 rounded p-3 text-yellow-800 text-sm">
            Web Bluetooth is not supported. Please use Chrome or Edge.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="max-w-2xl mx-auto p-4 flex flex-col gap-4">
        {/* Header */}
        <header className="bg-white rounded-lg shadow p-4 flex items-center justify-between">
          <h1 className="text-lg font-bold text-gray-800">Leaf OBD</h1>
          <span className={`text-xs px-2 py-1 rounded-full font-medium ${
            status === 'connected' ? 'bg-green-100 text-green-700' :
            status === 'connecting' ? 'bg-yellow-100 text-yellow-700' :
            status === 'error' ? 'bg-red-100 text-red-700' :
            'bg-gray-100 text-gray-600'
          }`}>
            {status}
          </span>
        </header>

        {/* Connection Panel */}
        <div className="bg-white rounded-lg shadow p-4">
          <h2 className="text-sm font-semibold text-gray-600 mb-3">Connection</h2>
          <ConnectionPanel />
        </div>

        {/* Mode Tabs */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="flex border-b">
            {(['polling', 'listening', 'control'] as Mode[]).map(m => (
              <button
                key={m}
                onClick={() => handleModeChange(m)}
                className={`flex-1 py-2 text-sm font-medium transition-colors ${
                  mode === m
                    ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-600'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
              >
                {m === 'polling' ? 'Polling' : m === 'listening' ? 'Static Listening' : 'Control'}
              </button>
            ))}
          </div>

          <div className="p-4">
            {mode === 'polling' ? (
              <PollingPanel isConnected={isConnected} />
            ) : mode === 'listening' ? (
              <ListenPanel isConnected={isConnected} />
            ) : (
              <ControlPanel isConnected={isConnected} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
