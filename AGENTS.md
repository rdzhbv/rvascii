# RVASCII

Image/Video/Camera → ASCII converter. Web app, fully client-side.

**Language:** Respond to the user in **Russian**. Think and reason in **English**.

## Stack

- **Vite** + **TypeScript** (vanilla, no framework)
- **Canvas API** — pixel manipulation
- **gif.js** — GIF export (worker-based)
- **MediaRecorder API** — real-time MP4/WebM recording
- **MediaDevices API** — webcam access

## Commands

```bash
npm run dev     # Dev server at localhost:5173
npm run build   # Production build → dist/
npm run preview # Preview production build
```

## Directory Structure

```
src/
├── main.ts                 # App entry, class App, wires everything
├── types.ts                # All types, presets (charsets, color filters)
├── style.css               # All styles
├── vendor.d.ts             # Type declarations (gif.js, captureStream)
├── core/
│   ├── ascii-converter.ts  # convertImageData(imageData, config) → AsciiGrid
│   ├── character-mapper.ts # luminanceToChar(lum, charset, invert) → string
│   └── pixel-processor.ts  # getImageData(), extractLuminance(), sampleGrid()
├── camera/
│   └── camera-controller.ts# CameraController — webcam management
├── export/
│   ├── png-exporter.ts     # exportPNG(grid, fontSize) → Blob
│   ├── svg-exporter.ts     # exportSVG(grid, fontSize) → Blob (SVG text elements)
│   ├── jpg-exporter.ts     # exportJPG(grid, fontSize) → Blob
│   ├── gif-exporter.ts     # exportGIF(frames[], fontSize, delay) → Blob
│   └── mp4-exporter.ts     # exportMP4(sourceUrl, config, ...) → Blob (real-time recording with audio)
├── ui/
│   ├── controls.ts         # Sidebar UI: file input, settings, camera, export buttons
│   ├── preview.ts          # renderGrid(grid, container, fontSize) — DOM render
│   └── video-player.ts     # VideoPlayerUI — play/pause, seek bar, time display
└── video/
    └── video-processor.ts  # VideoProcessor — load, play/pause, seek, frame extraction
```

## Key Types (src/types.ts)

```typescript
AsciiConfig {
  charset, charsetId, density, invert, contrast, brightness,
  colorEnabled, colorFilterId, fontScale
}

AsciiCell { char: string, r: number, g: number, b: number }
AsciiGrid = AsciiCell[][]
ExportFormat = 'png' | 'svg' | 'jpg' | 'gif' | 'mp4'
CameraResolution { label, width, height }
ColorFilterEntry { id, name, type: 'source'|'palette'|'monochrome'|'invert', colors }
```

### Presets

- **CHARSET_PRESETS**: 27 entries across 5 categories (Standard, Blocks, Symbols, Dots, Scripts)
- **COLOR_FILTERS**: 16 entries (original, invert, neon, cyberpunk, vaporwave, fire, ice, forest, sepia, etc.)
- **CAMERA_PRESETS**: 4 entries (1920×1080, 1280×720, 640×480, 320×240)

## Pipeline

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

## Camera

`CameraController` wraps `getUserMedia`:
- `checkAvailableResolutions()` — probes presets, returns supported
- `start(resolution)` — opens camera with `{ exact }` constraints
- `startPreview(onFrame)` — RAF loop: frame → ASCII → callback
- `captureFrame()` — single snapshot → AsciiGrid
- `stop()` — releases stream

## Video

`VideoProcessor` handles video files:
- `loadVideo(file)` — creates hidden `<video>`, resolves after `seeked`
- `play()`/`pause()` — toggles RAF loop that renders ASCII in real-time
- `seekAndCapture(time)` — seeks to time, captures frame as AsciiGrid
- `getAllFrames(fps)` — extracts all frames sequentially for GIF/MP4 export

## Export

| Format | Method | Notes |
|--------|--------|-------|
| PNG | Canvas `toBlob()` | Renders text monospace on canvas |
| JPG | Canvas `toBlob('image/jpeg')` | Same as PNG, JPEG compression |
| SVG | DOM-generated `<svg>` with `<text>` elements | Vector output |
| GIF | gif.js library | Frames pre-extracted then encoded |
| MP4 | Real-time `canvas.captureStream()` + `MediaRecorder` | Captures ASCII frames + original audio simultaneously |

## UI States

- **Image loaded**: preview shows ASCII, export buttons enabled
- **Video loaded**: first frame shown paused, player bar at bottom
  - Play/Pause toggles real-time ASCII processing
  - Seek bar updates preview on drag
- **Camera active**: live ASCII stream replaces preview
  - Resolution select shows only supported presets
- **No content**: placeholder text centered
- **Exporting**: status bar shows progress

## Constraints

- No dark/light toggle — dark mode only
- No emoji icons — pure CSS/HTML controls
- All interactive elements have `cursor: pointer`
- Smooth transitions: 150ms

---

*This file is the single source of truth for project architecture. Update it whenever the project structure, types, or features change.*
