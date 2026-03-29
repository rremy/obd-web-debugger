// Parses ELM327 response lines (with ATH1 headers) into ISO-TP reassembled payload.
// Input: array of hex strings like ["79B1035612101...", "79B2100A0B0C..."]
// Each line has a 3-char CAN header prefix (e.g. "79B") followed by frame bytes (hex, may contain spaces).
// Returns: reassembled data payload, or null on failure.

function hexToBytes(hex: string): Uint8Array {
  const clean = hex.replace(/\s/g, '');
  if (clean.length % 2 !== 0 || clean.length === 0) return new Uint8Array(0);
  const bytes = new Uint8Array(clean.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

export function parseISOTP(lines: string[]): Uint8Array | null {
  if (lines.length === 0) return null;

  // Separate into single frame vs multi-frame
  let totalLen = 0;
  let isMultiFrame = false;
  const dataChunks: Uint8Array[] = [];

  for (const line of lines) {
    if (line.length < 3) continue;

    // Strip the 3-char header prefix
    const bytes = hexToBytes(line.slice(3));
    if (bytes.length === 0) continue;

    const frameType = bytes[0] & 0xF0;

    if (frameType === 0x00) {
      // Single frame: length in low nibble, payload follows
      const len = bytes[0] & 0x0F;
      if (len === 0) return null;
      return bytes.slice(1, 1 + len);
    } else if (frameType === 0x10) {
      // First frame: 12-bit total length in bytes 0-1, data from byte 2
      isMultiFrame = true;
      totalLen = ((bytes[0] & 0x0F) << 8) | bytes[1];
      if (totalLen === 0) return null;
      dataChunks.push(bytes.slice(2));
    } else if (frameType === 0x20) {
      // Consecutive frame: sequence index in low nibble, data from byte 1
      dataChunks.push(bytes.slice(1));
    } else {
      return null;
    }
  }

  if (!isMultiFrame || dataChunks.length === 0) return null;

  // Concatenate all chunks and trim to totalLen
  const totalRaw = dataChunks.reduce((acc, c) => acc + c.length, 0);
  const result = new Uint8Array(totalRaw);
  let offset = 0;
  for (const chunk of dataChunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }

  return result.slice(0, totalLen);
}
