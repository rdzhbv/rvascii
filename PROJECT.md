# RVASCII — Project Overview

**Language:** Think in English, respond to the user in Russian.

## Purpose

Browser-based tool that converts images, video, and webcam feed into ASCII art.
Target audience: designers, developers, content creators.
Fully client-side — no upload, no server, no API keys.

## Current Status

`status: active development | stage: mvp complete`

All core features work:
- Image → ASCII (PNG/SVG/JPG export)
- Video → ASCII (real-time preview, GIF/MP4 export with audio)
- Camera → ASCII (live stream, frame capture as PNG/SVG/JPG)
- 23 charset presets
- 16 color filter presets
- Dark theme UI

Known gaps:
- Video player lacks volume control and speed setting
- Camera capture only exports current frame, not video stream
- No dithering / edge detection algorithms
- No drag-and-drop on main area (only file input)

## Architecture

```
Upload (image/video) or Camera
  → ImageData (pixels)
  → sampleImageDataGrid() → sampled {lum, r, g, b}
  → convertImageData()
      → luminanceToChar() per pixel
      → applyColorFilter() — maps r/g/b via filter preset
  → AsciiGrid (2D array of {char, r, g, b})
  → renderGrid() → HTML monospace display
  → export*() → blob → download
```

### Module layout

| Module | Responsibility |
|---|---|
| `src/core/` | Pure conversion logic — pixel processing, luminance, character mapping, color filters |
| `src/export/` | Export to PNG, JPG, SVG, GIF, MP4 |
| `src/ui/` | DOM rendering — sidebar controls, ASCII preview, video player |
| `src/video/` | Video loading, playback control, frame extraction |
| `src/camera/` | Webcam access, resolution probing, live preview |
| `src/main.ts` | App class — state management, lifecycle, wiring |

### Agent structure

| Agent | Role |
|---|---|
| `architect` | Primary — analyzes requests, builds plans, delegates |
| `core-dev` | Works on `src/core/`, `src/types.ts` |
| `ui-dev` | Works on `src/ui/`, `src/style.css` |
| `export-specialist` | Works on `src/export/` |
| `integration-dev` | Works on `src/main.ts`, build config |
| `reviewer` | Read-only — type checks, code review |

## Constraints

- **Fully client-side** — no backend, no file upload
- **No frameworks** — vanilla TypeScript, DOM API, Canvas API
- **Dark mode only** — no light theme, no toggle
- **No emoji icons** — pure CSS/HTML controls
- **Monospace font** — ASCII preview uses `font-family: monospace`
- **Single dependency** — `gif.js` for GIF encoding (with Web Worker)

## Agent Checklist — Before Any Response

Before writing code or answering, verify:

1. **Read AGENTS.md** — single source of truth. If it changed since your last session, re-read.
2. **Check TASKS.md** — are you working on something already tracked?
3. **Check DECISIONS.md** — don't violate previous architectural decisions without discussion.
4. **Run `npx tsc --noEmit`** — after any code change, ensure no type errors.
5. **Run `npm run build`** — for export or config changes.
6. **Update AGENTS.md** — if you changed types, added a module, or altered the pipeline.
7. **Update SUMMARY.md** — one line after every significant change.
8. **Respond in Russian** — user speaks Russian.

### Practical scheme

```
Request from user
  → 1. Read AGENTS.md (if first time or stale)
  → 2. Check TASKS.md for context
  → 3. Check DECISIONS.md for constraints
  → 4. Design solution
  → 5. Write code
  → 6. npx tsc --noEmit
  → 7. npm run build (if needed)
  → 8. Update AGENTS.md (if architecture changed)
  → 9. Update SUMMARY.md
  → 10. Commit (git add + git commit + git push)
  → 11. Respond to user in Russian
```

## Key Technologies

| Tech | Purpose |
|---|---|
| Vite | Build tool, dev server |
| TypeScript | Type safety |
| Canvas API | Pixel reading, ASCII rendering for export |
| MediaRecorder API | MP4/WebM recording with audio |
| MediaDevices API | Webcam access (`getUserMedia`) |
| gif.js | GIF encoding (worker-based) |
