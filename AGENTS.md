# RVASCII

Image/Video/Camera → ASCII / Bitmap / effects converter. Web app, fully client-side.

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
│   ├── process-image.ts    # convertImageData() — dispatches via EFFECT_REGISTRY
│   ├── ascii-converter.ts  # convertToAscii(imageData, config) → AsciiGrid
│   ├── bitmap-converter.ts # convertToBitmap(imageData, config) → AsciiGrid
│   ├── color-filter.ts     # applyColorFilter() — shared color filter logic
│   ├── character-mapper.ts # luminanceToChar(lum, charset, invert) → string
│   ├── pixel-processor.ts  # getImageData(), extractLuminance(), sampleGrid()
│   └── effects/
│       ├── registry.ts     # EFFECT_REGISTRY — all effect definitions + processors
│       ├── edge-detect.ts  # Sobel edge detection
│       ├── silhouette.ts   # Binary threshold
│       ├── dither.ts       # Floyd-Steinberg / Bayer dithering
│       ├── halftone.ts     # Halftone dot pattern
│       ├── wave.ts         # Sinusoidal wave distortion
│       └── oil-paint.ts    # Oil painting filter
├── camera/
│   └── camera-controller.ts# CameraController — webcam management
├── export/
│   ├── png-exporter.ts     # exportPNG(grid, fontSize, effect) → Blob
│   ├── svg-exporter.ts     # exportSVG(grid, fontSize, effect) → Blob
│   ├── jpg-exporter.ts     # exportJPG(grid, fontSize, effect) → Blob
│   ├── gif-exporter.ts     # exportGIF(frames[], fontSize, delay, effect) → Blob
│   └── mp4-exporter.ts     # exportMP4(sourceUrl, config, ...) → Blob (real-time recording with audio)
├── ui/
│   ├── controls.ts         # Sidebar UI: file input, effect grid, settings, camera, export
│   ├── preview.ts          # renderGrid(grid, container, fontSize, effect) — DOM render
│   └── video-player.ts     # VideoPlayerUI — play/pause, seek bar, time display
└── video/
    └── video-processor.ts  # VideoProcessor — load, play/pause, seek, frame extraction
```

## Key Types (src/types.ts)

```typescript
EffectType = 'ascii' | 'bitmap' | 'edge-detect' | 'silhouette' | 'dither' | 'halftone' | 'wave' | 'oil-paint'

AsciiConfig {
  effect, charset, charsetId, density, invert, contrast, brightness,
  colorEnabled, colorFilterId, fontScale,
  edgeThreshold, silhouetteThreshold, ditherAlgorithm,
  halftoneDotSize, waveAmplitude, waveFrequency, oilPaintRadius
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

## Effects

The app supports 8 effects selected via the effect grid in the sidebar. Each effect has a `renderMode` ('text' or 'block') that determines how it's rendered in preview and export.

| Effect | Render | Description | Key Controls |
|--------|--------|-------------|-------------|
| **ASCII** | Text | Classic text-based art | charset, invert, font scale |
| **Bitmap** | Block | Colored pixel blocks (mosaic) | block size |
| **Edge Detect** | Text | Sobel edge detection — outlines only | edge threshold, font scale |
| **Silhouette** | Block | High-contrast binary threshold | threshold |
| **Dither** | Block | Error diffusion dithering (Floyd-Steinberg / Bayer) | algorithm |
| **Halftone** | Text | Offset printing dot pattern | dot size, font scale |
| **Wave** | Block | Sinusoidal wave distortion | amplitude, frequency |
| **Oil Paint** | Block | Oil painting color blobs | radius |

### Effect Registry (core/effects/registry.ts)

```typescript
interface EffectDefinition {
  id: EffectType
  name: string
  description: string
  renderMode: 'text' | 'block'
  hasCharset: boolean
  hasInvert: boolean
}

EFFECT_REGISTRY: Record<EffectType, RegisteredEffect>
```

`convertImageData()` in `process-image.ts` dispatches via:
```ts
getEffectProcessor(config.effect)(imageData, config)
```

Exporters use `isBlockEffect(effect)` from the registry to decide rendering strategy:
- Block effects → `fillRect()` (or `<rect>` for SVG)
- Text effects → `fillText()` (or SVG `<path>` via opentype.js)

## Pipeline

```
Upload (image/video) or Camera
  → ImageData (pixels)
  → sampleImageDataGrid() → sampled {lum, r, g, b}
  → convertImageData() [dispatches via EFFECT_REGISTRY]
      → effect-specific converter produces AsciiGrid {char, r, g, b}
  → renderGrid() → HTML display (text: spans, block: divs with bg)
  → export*() → blob → download
```

## Adding a new effect

1. Create `src/core/effects/<name>.ts` with `process<Name>(imageData, config) → AsciiGrid`
2. Add its type to `EffectType` in `types.ts`
3. Add its config params to `AsciiConfig` + defaults to `DEFAULT_CONFIG`
4. Register it in `src/core/effects/registry.ts` (definition + import + entry)
5. Add control visibility in `src/ui/controls.ts` (effectControlMap + allControlRows)
6. No changes needed to preview.ts or exporters — they use `renderMode` from registry

## Camera

`CameraController` wraps `getUserMedia`:
- `checkAvailableResolutions()` — probes presets, returns supported
- `start(resolution)` — opens camera with `{ exact }` constraints
- `startPreview(onFrame)` — RAF loop: frame → processed grid → callback
- `captureFrame()` — single snapshot → AsciiGrid
- `stop()` — releases stream

## Video

`VideoProcessor` handles video files:
- `loadVideo(file)` — creates hidden `<video>`, resolves after `seeked`
- `play()`/`pause()` — toggles RAF loop that renders processed frames in real-time
- `seekAndCapture(time)` — seeks to time, captures frame as AsciiGrid
- `getAllFrames(fps)` — extracts all frames sequentially for GIF/MP4 export

## Export

| Format | Method | Notes |
|--------|--------|-------|
| PNG | Canvas `toBlob()` | Renders text monospace on canvas |
| JPG | Canvas `toBlob('image/jpeg')` | Same as PNG, JPEG compression |
| SVG | `opentype.js` — text → SVG `<path>` elements | Vector shapes, editable in Figma as curves |
| GIF | gif.js library | Frames pre-extracted then encoded |
| MP4 | Real-time `canvas.captureStream()` + `MediaRecorder` | Captures ASCII frames + original audio simultaneously |

All exporters accept an `effect` parameter. When `renderMode === 'block'`, they draw filled rectangles instead of text characters. SVG block export uses `<rect>` elements.

## UI States

- **Image loaded**: preview shows converted content (ASCII or Bitmap), export buttons enabled
- **Video loaded**: first frame shown paused, player bar at bottom
  - Play/Pause toggles real-time processing
  - Seek bar updates preview on drag
- **Camera active**: live processed stream replaces preview
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
