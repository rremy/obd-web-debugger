export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

export interface OBDCommand {
  name: string;
  description: string;
  commandHex: string;
  header: string;
  expectedBytes: number;
  decoder: (data: Uint8Array) => Record<string, unknown>;
}

export interface OBDResponse {
  raw: string;
  parsed: Record<string, unknown> | null;
  error: string | null;
}
