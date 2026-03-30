import { useEffect, useRef, useState } from 'react';
import { AZE0_24KWH_COMMANDS } from '../commands';
import { obdService } from '../obd.service';
import type { OBDResponse } from '../types';

interface Props {
  isConnected: boolean;
}

export function PollingPanel({ isConnected }: Props) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [response, setResponse] = useState<OBDResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [pollingEnabled, setPollingEnabled] = useState(false);
  const [pollInterval, setPollInterval] = useState(2);
  const [wakeupEnabled, setWakeupEnabled] = useState(false);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const selectedCommand = AZE0_24KWH_COMMANDS[selectedIndex];

  const doSend = async () => {
    if (!isConnected || loading) return;
    setLoading(true);
    try {
      if (wakeupEnabled) {
        await obdService.sendWakeup();
      }
      const res = await obdService.sendCommand(selectedCommand);
      setResponse(res);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (pollingEnabled && isConnected) {
      pollingRef.current = setInterval(doSend, pollInterval * 1000);
    }
    return () => {
      if (pollingRef.current !== null) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pollingEnabled, pollInterval, isConnected, selectedIndex]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium">Command</label>
        <select
          value={selectedIndex}
          onChange={e => {
            setSelectedIndex(Number(e.target.value));
            setResponse(null);
          }}
          className="border rounded px-2 py-1 text-sm bg-white"
        >
          {AZE0_24KWH_COMMANDS.map((cmd, i) => (
            <option key={cmd.name} value={i}>
              {cmd.name} — {cmd.description}
            </option>
          ))}
        </select>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <button
          onClick={doSend}
          disabled={!isConnected || loading}
          className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-700"
        >
          {loading ? 'Sending...' : 'Send'}
        </button>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={pollingEnabled}
            onChange={e => setPollingEnabled(e.target.checked)}
            disabled={!isConnected}
          />
          Poll every
        </label>
        <input
          type="number"
          min={1}
          value={pollInterval}
          onChange={e => setPollInterval(Math.max(1, Number(e.target.value)))}
          disabled={!isConnected}
          className="w-16 border rounded px-2 py-1 text-sm disabled:opacity-50"
        />
        <span className="text-sm">seconds</span>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={wakeupEnabled}
            onChange={e => setWakeupEnabled(e.target.checked)}
          />
          Wakeup before send
        </label>
      </div>

      {!isConnected && (
        <p className="text-sm text-gray-400">Connect first to use polling.</p>
      )}

      {response && (
        <div className="flex flex-col gap-2">
          <div>
            <p className="text-xs font-medium text-gray-500 mb-1">Raw</p>
            <pre className="bg-gray-900 text-green-400 text-xs rounded p-2 overflow-x-auto">{response.raw || '(empty)'}</pre>
          </div>
          {response.error && (
            <p className="text-sm text-red-600">{response.error}</p>
          )}
          {response.parsed && (
            <div>
              <p className="text-xs font-medium text-gray-500 mb-1">Parsed</p>
              <ul className="text-sm space-y-1">
                {Object.entries(response.parsed).map(([key, val]) => (
                  <li key={key} className="flex gap-2">
                    <span className="font-mono text-gray-600">{key}:</span>
                    <span>{String(val)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
