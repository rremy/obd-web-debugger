import { useEffect, useState } from 'react';
import { obdService } from '../obd.service';

const CUSTOM_VALUE = '__custom__';
const ALL_VALUE = '__all__';

const CAN1_EV_BUS = [
  { id: '1D4', label: '1D4 – Charge Status Extended' },
  { id: '1DA', label: '1DA – Motor / Inverter Data' },
  { id: '1DB', label: '1DB – Battery Voltage / Current' },
  { id: '1DC', label: '1DC – Battery Power Limits' },
  { id: '284', label: '284 – Vehicle Speed' },
  { id: '390', label: '390 – Charger Status (AZE0/ZE1)' },
  { id: '50A', label: '50A – Battery Heater Request' },
  { id: '54A', label: '54A – Climate Setpoint' },
  { id: '54B', label: '54B – Climate Status' },
  { id: '54C', label: '54C – Ambient Temperature' },
  { id: '54F', label: '54F – Cabin Temperature' },
  { id: '55A', label: '55A – Motor / Inverter Temps' },
  { id: '55B', label: '55B – SOC (Battery)' },
  { id: '59E', label: '59E – SOH by Battery Type' },
  { id: '5A9', label: '5A9 – Range (Instrument)' },
  { id: '5B3', label: '5B3 – SOH (ZE0)' },
  { id: '5B9', label: '5B9 – Remaining Charge Bars' },
  { id: '5BC', label: '5BC – GIDs / Capacity' },
  { id: '5C0', label: '5C0 – Battery Temperature (LBC)' },
];

const CAN2_CAR_BUS = [
  { id: '180', label: '180 – Throttle Position' },
  { id: '292', label: '292 – Brake Pedal' },
  { id: '355', label: '355 – Odometer' },
  { id: '385', label: '385 – TPMS Pressures' },
  { id: '421', label: '421 – Gear / Ignition / Locks' },
  { id: '5C5', label: '5C5 – Handbrake / Odometer' },
  { id: '60D', label: '60D – Door States' },
];

interface Props {
  isConnected: boolean;
}

export function ListenPanel({ isConnected }: Props) {
  const [selectedPreset, setSelectedPreset] = useState(CUSTOM_VALUE);
  const [customCanId, setCustomCanId] = useState('');
  const [frames, setFrames] = useState<string[]>([]);
  const [listening, setListening] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canId = selectedPreset === CUSTOM_VALUE
    ? customCanId
    : selectedPreset === ALL_VALUE
      ? ''
      : selectedPreset;

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
    if (selectedPreset !== ALL_VALUE && !/^[0-9a-fA-F]{1,3}$/.test(canId)) {
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
      <div className="flex flex-col gap-2">
        <select
          value={selectedPreset}
          onChange={e => setSelectedPreset(e.target.value)}
          disabled={listening}
          className="border rounded px-2 py-1 text-sm font-mono disabled:opacity-50 w-full"
        >
          <option value={ALL_VALUE}>All Messages (no filter)</option>
          <option value={CUSTOM_VALUE}>Custom CAN ID...</option>
          <optgroup label="CAN1 – EV Bus (500 kbps)">
            {CAN1_EV_BUS.map(c => (
              <option key={c.id} value={c.id}>{c.label}</option>
            ))}
          </optgroup>
          <optgroup label="CAN2 – CAR Bus (500 kbps)">
            {CAN2_CAR_BUS.map(c => (
              <option key={c.id} value={c.id}>{c.label}</option>
            ))}
          </optgroup>
        </select>
        <div className="flex items-center gap-2">
        {selectedPreset === CUSTOM_VALUE && (
          <input
            type="text"
            value={customCanId}
            onChange={e => setCustomCanId(e.target.value)}
            placeholder="e.g. 5C5"
            disabled={listening}
            className="border rounded px-2 py-1 text-sm font-mono w-24 disabled:opacity-50"
          />
        )}
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
