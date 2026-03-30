# Leaf OBD Web Debugger

A browser-based OBD-II debugger for the Nissan Leaf, connecting to an ELM327-compatible Bluetooth adapter via Web Bluetooth.

## Features

- **BLE Connection** -- Pairs with ELM327 adapters over Web Bluetooth (Chrome / Edge)
- **Polling Mode** -- Send OBD-II commands and decode responses (battery, motor, climate, etc.)
- **Static Listening Mode** -- Passively monitor raw CAN frames, with preset filters for known Leaf CAN IDs on both EV Bus (CAN1) and CAR Bus (CAN2)
- **ISO-TP Parser** -- Reassembles multi-frame ISO 15765-2 responses

## Tech Stack

- React 18 + TypeScript
- Vite
- Tailwind CSS
- RxJS (reactive BLE data streams)
- Web Bluetooth API

## Getting Started

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Build for production
npm run build
```

Open the app in Chrome or Edge (Web Bluetooth is not supported in Firefox/Safari), then click **Connect** to pair with your ELM327 adapter.

## CAN Bus Reference

| Bus | Speed | Examples |
|-----|-------|---------|
| CAN1 -- EV Bus | 500 kbps | Battery SOC/SOH, motor temps, charge status, GIDs |
| CAN2 -- CAR Bus | 500 kbps | Throttle, brakes, odometer, TPMS, door states |

## Requirements

- A Chromium-based browser with Web Bluetooth support
- An ELM327-compatible BLE OBD-II adapter
- A Nissan Leaf (ZE0 / AZE0 / ZE1)
