# DRL Task Runner (Process User Module)

This module provides:
- DRL task selection from a controller list,
- Play/Pause toggle behavior,
- Stop immediate action,
- runtime state badge (Idle / Running / Paused / Stopped / Error),
- bottom log banner,
- FR/EN i18n.

## Important integration note

`src/services/taskControllerService.ts` currently contains a safe scaffold.

When generated and opened via Dr.Dart-IDE, replace placeholders with real SDK5 calls from:
- `libs/dart-api`
- imports via `from 'dart-api'`

Do not use relative import for dart-api.
