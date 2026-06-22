# RVASCII — Tasks

**Language:** Think in English. Respond to user in Russian.

Legend: `[ ]` pending · `[~]` in progress · `[x]` done · `[!]` blocked

---

## Milestone 1: MVP (done)

- [x] Project setup (Vite + TS)
- [x] Core conversion pipeline (pixel → luminance → char)
- [x] Image upload and ASCII preview
- [x] Video upload, play/pause/seek, frame extraction
- [x] Webcam access, live ASCII stream, resolution selection
- [x] Export: PNG, SVG, JPG
- [x] Export: GIF (video frames → animated GIF)
- [x] Export: MP4 (ASCII video with audio via MediaRecorder)
- [x] 23 charset presets + custom
- [x] 16 color filter presets
- [x] Dark theme, minimal UI
- [x] Video player (seek bar, play/pause, time display)
- [x] Git, GitHub, AGENTS.md, agent configs

## Milestone 2: Polish

- [ ] Volume control in video player
- [ ] Playback speed control (0.5x — 2x)
- [ ] Keyboard shortcuts (Space for play/pause, arrows for seek)
- [ ] Drag-and-drop on main area (not just file input)
- [ ] Export format selection dialog (filename, quality slider for JPG)
- [ ] Responsive sidebar (collapsible on small screens)

## Milestone 3: Advanced processing

- [ ] Dithering algorithms (Floyd-Steinberg, Bayer)
- [ ] Edge detection for sharper ASCII (Sobel)
- [ ] Gamma-corrected character mapping
- [ ] Multi-grid rendering (dense background + sparse foreground)
- [ ] Per-character font size / weight variation

## Milestone 4: Export enhancements

- [ ] MP4 configurable quality / bitrate
- [ ] GIF configurable color palette (256 → 64 → 16 colors)
- [ ] Batch export (multiple images → ZIP)
- [ ] Copy ASCII to clipboard as plain text

## Known Issues

- Video player seek bar updates via RAF but can feel laggy on long videos
- No loading indicator during MP4/GIF export (status text only)
- Camera tab loses access if user switches to another app that uses camera
- Large videos (>500MB) may cause memory issues during frame extraction
