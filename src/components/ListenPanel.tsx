import { useEffect, useState } from 'react';
import { obdService } from '../obd.service';

interface Props {
  isConnected: boolean;
}

export function ListenPanel({ isConnected }: Props) {
  const [canId, setCanId] = useState('');
  const [frames, setFrames] = useState<string[]>([]);
  const [listening, setListening] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const sub = obdService.listenFrames$.subscribe(line => {
      setFrames(prev => [line, ...prev]);
    });
    return () => sub.unsubscribe();
  }, []);

  // Stop listening when disconnected
  useEffect(() => {
    if (!isConnected && listening) {
      setListening(false);
    }
  }, [isConnected, listening]);

  const handleStart = async () => {
    setError(null);
    if (!/^[0-9a-fA-F]{1,3}$/.test(canId)) {
      setError('Invalid CAN ID: must be 1–3 hex characters (e.g. 5C5)');
      return;
    }
    try {
      await obdService.startListening(canId.toUpperCase());
      setListening(true);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  const handleStop = async () => {
    try {
      await obdService.stopListening();
    } finally {
      setListening(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2 flex-wrap">
        <input
          type="text"
          value={canId}
          onChange={e => setCanId(e.target.value)}
          placeholder="e.g. 5C5"
          disabled={listening || !isConnected}
          className="border rounded px-2 py-1 text-sm font-mono w-24 disabled:opacity-50"
        />
        {!listening ? (
          <button
            onClick={handleStart}
            disabled={!isConnected}
            className="px-3 py-1.5 text-sm bg-green-600 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-green-700"
          >
            Start
          </button>
        ) : (
          <button
            onClick={handleStop}
            className="px-3 py-1.5 text-sm bg-red-600 text-white rounded hover:bg-red-700"
          >
            Stop
          </button>
        )}
        <button
          onClick={() => setFrames([])}
          className="px-3 py-1.5 text-sm bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
        >
          Clear
        </button>
      </div>

      {!isConnected && (
        <p className="text-sm text-gray-400">Connect first to listen.</p>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="h-64 overflow-y-auto bg-gray-900 rounded p-2 font-mono text-xs text-green-400">
        {frames.length === 0 ? (
          <span className="text-gray-500">No frames yet...</span>
        ) : (
          frames.map((frame, i) => (
            <div key={i}>{frame}</div>
          ))
        )}
      </div>
    </div>
  );
}
