import { BehaviorSubject, Subject } from 'rxjs';
import { ConnectionStatus } from './types';

const SERVICE_UUID = '0000fff0-0000-1000-8000-00805f9b34fb';
const CHAR_READ_UUID = '0000fff1-0000-1000-8000-00805f9b34fb';
const CHAR_WRITE_UUID = '0000fff2-0000-1000-8000-00805f9b34fb';

const AT_TIMEOUT_MS = 5000;

export class OBDService {
  private _statusSubject = new BehaviorSubject<ConnectionStatus>('disconnected');
  readonly connectionStatus$ = this._statusSubject.asObservable();

  private _listenSubject = new Subject<string>();
  readonly listenFrames$ = this._listenSubject.asObservable();

  private _device: BluetoothDevice | null = null;
  private _writeChar: BluetoothRemoteGATTCharacteristic | null = null;
  private _readChar: BluetoothRemoteGATTCharacteristic | null = null;
  private _rxBuffer = '';
  private _lastHeader = '';
  private _listening = false;

  private _decoder = new TextDecoder();
  private _encoder = new TextEncoder();

  async connect(): Promise<void> {
    this._statusSubject.next('connecting');
    try {
      const device = await navigator.bluetooth.requestDevice({
        filters: [{ services: [SERVICE_UUID] }],
      });
      this._device = device;

      device.addEventListener('gattserverdisconnected', () => {
        this._resetState();
        this._statusSubject.next('error');
      });

      const server = await device.gatt!.connect();
      const service = await server.getPrimaryService(SERVICE_UUID);

      this._readChar = await service.getCharacteristic(CHAR_READ_UUID);
      this._writeChar = await service.getCharacteristic(CHAR_WRITE_UUID);

      await this._readChar.startNotifications();
      this._readChar.addEventListener('characteristicvaluechanged', (event) => {
        const value = (event.target as BluetoothRemoteGATTCharacteristic).value!;
        const text = this._decoder.decode(value.buffer);
        this._rxBuffer += text;
        if (this._listening) {
          this._drainListenBuffer();
        }
      });

      // Global AT init sequence
      await this._sendAT('ATZ', 1000);
      await this._assertOK(await this._sendAT('ATE0'));
      await this._assertOK(await this._sendAT('ATSP6'));
      await this._assertOK(await this._sendAT('ATH1'));
      await this._assertOK(await this._sendAT('ATL0'));
      await this._assertOK(await this._sendAT('ATS0'));
      await this._assertOK(await this._sendAT('ATCAF0'));

      const rvResponse = await this._sendAT('AT RV');
      const voltage = parseFloat(rvResponse.replace(/[^0-9.]/g, ''));
      if (isNaN(voltage) || voltage < 6) {
        throw new Error(`Low voltage: ${rvResponse}`);
      }

      this._statusSubject.next('connected');
    } catch (err) {
      this._resetState();
      this._statusSubject.next('error');
      throw err;
    }
  }

  async disconnect(): Promise<void> {
    if (this._listening) {
      await this.stopListening().catch(() => {});
    }
    if (this._readChar) {
      await this._readChar.stopNotifications().catch(() => {});
    }
    if (this._device?.gatt?.connected) {
      this._device.gatt.disconnect();
    }
    this._resetState();
    this._statusSubject.next('disconnected');
  }

  private _resetState(): void {
    this._rxBuffer = '';
    this._lastHeader = '';
    this._listening = false;
    this._writeChar = null;
    this._readChar = null;
    this._device = null;
  }

  private _assertOK(response: string): void {
    // Allow echo — check the response contains OK after stripping echoed command
    if (!response.toUpperCase().includes('OK')) {
      throw new Error(`Expected OK, got: ${response}`);
    }
  }

  private _sendAT(cmd: string, delayMs?: number): Promise<string> {
    this._rxBuffer = '';
    const data = this._encoder.encode(cmd + '\r');
    this._writeChar!.writeValue(data);

    return new Promise<string>((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error(`Timeout waiting for response to ${cmd}`));
      }, AT_TIMEOUT_MS);

      if (delayMs !== undefined) {
        setTimeout(() => {
          clearTimeout(timeoutId);
          resolve(this._rxBuffer);
        }, delayMs);
        return;
      }

      const checkInterval = setInterval(() => {
        if (this._rxBuffer.includes('>')) {
          clearInterval(checkInterval);
          clearTimeout(timeoutId);
          const response = this._rxBuffer
            .replace('>', '')
            .split('\r')
            .map(l => l.trim())
            .filter(l => l.length > 0)
            .join('\n');
          this._rxBuffer = '';
          resolve(response);
        }
      }, 10);
    });
  }

  private _drainListenBuffer(): void {
    const lines = this._rxBuffer.split('\r');
    // Keep the last element (may be incomplete line)
    this._rxBuffer = lines.pop() ?? '';
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.length > 0) {
        this._listenSubject.next(trimmed);
      }
    }
  }

  async startListening(canId: string): Promise<void> {
    if (this._statusSubject.value !== 'connected') {
      throw new Error('Not connected');
    }
    await this._assertOK(await this._sendAT(canId ? `AT CRA ${canId}` : 'AT CRA'));
    this._listening = true;
    this._rxBuffer = '';
    this._writeChar!.writeValue(this._encoder.encode('AT MA\r'));
  }

  private async _setHeader(header: string): Promise<void> {
    if (header === this._lastHeader) return;
    await this._assertOK(await this._sendAT(`AT SH ${header}`));
    await this._assertOK(await this._sendAT(`AT FC SH ${header}`));
    await this._assertOK(await this._sendAT('AT FC SD 30 00 00'));
    await this._assertOK(await this._sendAT('AT FC SM 1'));
    this._lastHeader = header;
  }

  async sendWakeup(): Promise<void> {
    if (this._statusSubject.value !== 'connected') {
      throw new Error('Not connected');
    }
    // Gen2 AZE0 (2013+) wakeup sequence matching OVMS behavior:
    // Send 0x679 (VCM wakeup) and 0x5C0 (battery heater spoof) 24 times
    await this._assertOK(await this._sendAT('AT SH 679'));
    for (let i = 0; i < 24; i++) {
      await this._sendAT('00', 100);
    }
    await this._assertOK(await this._sendAT('AT SH 5C0'));
    for (let i = 0; i < 24; i++) {
      await this._sendAT('00 00 00 00 00 00 00 00', 100);
    }
    this._lastHeader = '';
  }

  async sendClimateControl(enable: boolean, wakeup = true): Promise<void> {
    if (this._statusSubject.value !== 'connected') {
      throw new Error('Not connected');
    }
    // Pre-2016 AZE0: 1-byte command on CAN1 via 0x56E
    // Enable: 0x4E, Disable: 0x56, Auto-disable: 0x46
    if (wakeup) {
      await this.sendWakeup();
    }
    await this._assertOK(await this._sendAT('AT SH 56E'));
    const cmdByte = enable ? '4E' : '56';
    for (let i = 0; i < 24; i++) {
      await this._sendAT(cmdByte, 100);
    }
    if (enable) {
      // Auto-disable after 1 second, matching OVMS m_ccDisableTimer
      await new Promise(resolve => setTimeout(resolve, 1000));
      await this._sendAT('46', 100);
    }
    this._lastHeader = '';
  }

  async sendCommand(cmd: import('./types').OBDCommand): Promise<import('./types').OBDResponse> {
    if (this._statusSubject.value !== 'connected') {
      throw new Error('Not connected');
    }
    await this._setHeader(cmd.header);
    this._rxBuffer = '';
    this._writeChar!.writeValue(this._encoder.encode(cmd.commandHex + '\r'));

    const rawResponse = await new Promise<string>((resolve, reject) => {
      const timeoutId = setTimeout(() => reject(new Error('Timeout')), AT_TIMEOUT_MS);
      const checkInterval = setInterval(() => {
        if (this._rxBuffer.includes('>')) {
          clearInterval(checkInterval);
          clearTimeout(timeoutId);
          resolve(this._rxBuffer);
          this._rxBuffer = '';
        }
      }, 10);
    }).catch(() => null);

    if (rawResponse === null) {
      return { raw: '', parsed: null, error: 'Timeout' };
    }

    const lines = rawResponse
      .replace('>', '')
      .split('\r')
      .map(l => l.trim())
      .filter(l => l.length > 0);

    const upper = lines.join('\n').toUpperCase();
    for (const errToken of ['NO DATA', 'ERROR', 'CAN ERROR', '?']) {
      if (upper.includes(errToken)) {
        return { raw: lines.join('\n'), parsed: null, error: errToken };
      }
    }

    if (cmd.expectedBytes === 0) {
      // unknown command — pass raw bytes as-is
      const allHex = lines.join('').replace(/\s/g, '');
      const bytes = new Uint8Array(allHex.length / 2);
      for (let i = 0; i < bytes.length; i++) {
        bytes[i] = parseInt(allHex.slice(i * 2, i * 2 + 2), 16);
      }
      return { raw: lines.join('\n'), parsed: cmd.decoder(bytes), error: null };
    }

    const { parseISOTP } = await import('./iso-tp');
    const payload = parseISOTP(lines);
    if (payload === null) {
      return { raw: lines.join('\n'), parsed: null, error: 'Parse error' };
    }

    return { raw: lines.join('\n'), parsed: cmd.decoder(payload), error: null };
  }

  async stopListening(): Promise<void> {
    this._listening = false;
    this._writeChar!.writeValue(this._encoder.encode('\r'));

    // Wait for > prompt (up to 3s)
    await new Promise<void>((resolve) => {
      const timeoutId = setTimeout(resolve, 3000);
      const checkInterval = setInterval(() => {
        if (this._rxBuffer.includes('>')) {
          clearInterval(checkInterval);
          clearTimeout(timeoutId);
          this._rxBuffer = '';
          resolve();
        }
      }, 10);
    });

    await this._sendAT('AT AR');
    this._rxBuffer = '';
    this._lastHeader = '';
  }
}

export const obdService = new OBDService();
