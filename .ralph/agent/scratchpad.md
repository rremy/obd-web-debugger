# Leaf OBD BLE Web App — Implementation

## Completed (2026-03-29)

All 10 steps from the plan implemented in a single iteration:

1. Scaffolded Vite 5 + React + TypeScript (strict) + Tailwind CSS v3 + RxJS
2. Created types.ts (ConnectionStatus, OBDCommand, OBDResponse), decoders.ts (21 decoder functions), commands.ts (AZE0_24KWH_COMMANDS array with 21 commands from Python source)
3. Implemented ISO-TP parser in iso-tp.ts — handles single frames and multi-frame (FF + CF)
4-6. Implemented OBDService in obd.service.ts — BLE connect/disconnect, AT init, sendCommand with header caching, startListening/stopListening
7-10. Built ConnectionPanel, PollingPanel, ListenPanel, and wired in App.tsx with Tailwind styling

## Key decisions
- Used @types/web-bluetooth for Web Bluetooth API types
- Combined steps 4/5/6 into one commit since _setHeader/_lastHeader created circular unused-var issue
- Plan said 22 commands but Python source has 21 — implemented all 21
- Added HV battery current field to lbc decoder (28-bit at d[2:6]) — not in Python source but mentioned in plan
- Dynamic import of iso-tp in sendCommand to keep initial bundle smaller (Vite code-splits it automatically)

## Build status
- `npm run build` passes with no errors
- TypeScript strict mode + noUnusedLocals/noUnusedParameters all satisfied
