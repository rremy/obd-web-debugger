// Helper functions
function int16BE(data: Uint8Array, offset: number): number {
  return new DataView(data.buffer, data.byteOffset).getInt16(offset, false);
}

function uint16BE(data: Uint8Array, offset: number): number {
  return new DataView(data.buffer, data.byteOffset).getUint16(offset, false);
}

function uint32BE(data: Uint8Array, offset: number): number {
  return new DataView(data.buffer, data.byteOffset).getUint32(offset, false);
}

// LBC 28-bit signed integer (big-endian, stored in 4 bytes)
function int28BE(data: Uint8Array, offset: number): number {
  let raw = uint32BE(data, offset);
  if (raw & 0x8000000) {
    raw = raw | -0x10000000;
  }
  return raw;
}

function uint24BE(data: Uint8Array, offset: number): number {
  return (data[offset] << 16) | (data[offset + 1] << 8) | data[offset + 2];
}

export function unknown(_data: Uint8Array): Record<string, unknown> {
  return {};
}

export function power_switch(data: Uint8Array): Record<string, unknown> {
  return { power_switch: (data[3] & 0x80) === 0x80 };
}

export function gear_position(data: Uint8Array): Record<string, unknown> {
  const gears: Record<number, string> = { 1: 'Park', 2: 'Reverse', 3: 'Neutral', 4: 'Drive', 5: 'Eco' };
  return { gear_position: gears[data[3]] ?? 'Unknown' };
}

export function bat_12v_voltage(data: Uint8Array): Record<string, unknown> {
  return { bat_12v_voltage: data[3] * 0.08 };
}

export function bat_12v_current(data: Uint8Array): Record<string, unknown> {
  return { bat_12v_current: int16BE(data, 3) / 256 };
}

export function ambient_temp(data: Uint8Array): Record<string, unknown> {
  return { ambient_temp: data[3] / 2 - 40 };
}

export function estimated_ac_power(data: Uint8Array): Record<string, unknown> {
  return { estimated_ac_power: data[3] * 50 };
}

export function estimated_ptc_power(data: Uint8Array): Record<string, unknown> {
  return { estimated_ptc_power: data[3] * 250 };
}

export function aux_power(data: Uint8Array): Record<string, unknown> {
  return { aux_power: data[3] * 100 };
}

export function ac_power(data: Uint8Array): Record<string, unknown> {
  return { ac_power: data[3] * 250 };
}

export function plug_state(data: Uint8Array): Record<string, unknown> {
  const states: Record<number, string> = { 0: 'Not plugged', 1: 'Partial plugged', 2: 'Plugged' };
  return { plug_state: states[data[3]] ?? 'Unknown' };
}

export function charge_mode(data: Uint8Array): Record<string, unknown> {
  const modes: Record<number, string> = { 0: 'Not charging', 1: 'L1 charging', 2: 'L2 charging', 3: 'L3 charging' };
  return { charge_mode: modes[data[3]] ?? 'Unknown' };
}

export function obc_out_power(data: Uint8Array): Record<string, unknown> {
  return { obc_out_power: int16BE(data, 3) * 100 };
}

export function ac_on(data: Uint8Array): Record<string, unknown> {
  return { ac_on: data[3] === 0x01 };
}

export function odometer(data: Uint8Array): Record<string, unknown> {
  return { odometer: uint24BE(data, 3) };
}

export function tp_fr(data: Uint8Array): Record<string, unknown> {
  return { tp_fr: data[3] * 1.7236894 };
}

export function tp_fl(data: Uint8Array): Record<string, unknown> {
  return { tp_fl: data[3] * 1.7236894 };
}

export function tp_rr(data: Uint8Array): Record<string, unknown> {
  return { tp_rr: data[3] * 1.7236894 };
}

export function tp_rl(data: Uint8Array): Record<string, unknown> {
  return { tp_rl: data[3] * 1.7236894 };
}

export function range_remaining(data: Uint8Array): Record<string, unknown> {
  return { range_remaining: int16BE(data, 3) / 10 };
}

export function lbc(data: Uint8Array): Record<string, unknown> {
  if (data.length === 0) return {};
  return {
    hv_battery_current: int28BE(data, 2) / 1000,
    hv_battery_voltage: uint16BE(data, 20) / 100,
    hv_battery_health: uint16BE(data, 30) / 102.4,
    state_of_charge: uint24BE(data, 33) / 10000,
  };
}
