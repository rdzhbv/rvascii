# RVASCII — Architecture Decisions

**Language:** Think in English. Respond to user in Russian.

---

### 1. Vanilla TypeScript over React/Vue/Svelte

**Context:** First implementation decision — what stack to use.
**Decision:** No framework. Pure DOM API + Vite + TypeScript.
**Rationale:**
- ASCII rendering is DOM-heavy (thousands of `<span>` elements per frame)
- No routing, no state management library needed
- Zero framework overhead = smaller bundle, faster render
- Easier for other AIs to understand and modify (no framework-specific patterns)
- `gif.js` and `MediaRecorder` are DOM APIs, not framework-specific

---

### 2. HTML monospace over Canvas for live preview

**Context:** How to display the ASCII grid in real-time.
**Decision:** Render each character as a `<span>` inside `<div>` rows, colored via inline `style="color: ..."`.
**Rationale:**
- Browser handles text rendering (sub-pixel AA, font smoothing)
- Easy to inspect and debug via DevTools
- No canvas scaling issues on retina displays
- Trade-off: DOM updates can be slow at very high densities (>200×100 grid), but for typical use (80×45) it's fine

---

### 3. Real-time MediaRecorder over pre-render + encode for MP4

**Context:** How to export video as MP4 with audio.
**Decision:** Use `canvas.captureStream()` + `MediaRecorder` to record in real-time while video plays.
**Rationale:**
- Avoids storing all frames in memory (unlimited video length)
- Audio sync is inherent — same `MediaStream` carries both video and audio
- No third-party MP4 encoding library needed
- Trade-off: recording takes real-time duration

---

### 4. Discrete color palettes over algorithmic color mapping

**Context:** How to implement color filters.
**Decision:** Store explicit `[R, G, B][]` arrays per filter. Map luminance to palette index.
**Rationale:**
- Predictable, reproducible colors
- Easy to add new presets (just add an array)
- No complex color space math (OKLAB/HSL) in initial version
- Trade-off: limited to N discrete colors per filter; no smooth gradients

---

### 5. 23 charset presets with ID-based selection

**Context:** How to manage character sets.
**Decision:** Define `CHARSET_PRESETS` array with `id`, `name`, `chars`. Store `charsetId` in config.
**Rationale:**
- `charsetId` is lightweight for config serialization
- UI can show human-readable names instead of raw character strings
- Easy to extend (add entry to array)
- Allows for custom charset entry (separate `id: 'custom'`)

---

### 6. Camera resolution probing with `{ exact }` → `{ ideal }` fallback

**Context:** How to handle camera capability detection.
**Decision:** For each preset (1920×1080, 1280×720, etc.), try `getUserMedia` with `{ exact }` constraints. If it fails, retry with `{ ideal }` and report actual resolution from `track.getSettings()`.
**Rationale:**
- Only shows resolutions the camera actually supports
- `{ exact }` gives precise control; `{ ideal }` fallback handles edge cases
- User sees the real resolution (may differ from preset label)

---

### 7. Single `AsciiConfig` object for all settings

**Context:** How to pass settings through the system.
**Decision:** One flat config object with all knobs (density, contrast, brightness, charset, color filter, etc.).
**Rationale:**
- Simple to pass to `convertImageData()` — one argument
- Simple to update — `Object.assign(config, partial)`
- Easy to serialize (JSON)
- Trade-off: grows over time; may need grouping later

---

### 8. `.opencode/agents/` for agent configuration

**Context:** How to structure AI agents for the project.
**Decision:** One `.md` file per agent with YAML frontmatter (name, description, mode, model, permissions) and markdown prompt body.
**Rationale:**
- Native format for OpenCode's agent system
- Self-documenting — each file is both a config and a prompt
- `mode: primary` / `mode: subagent` enables hierarchical task delegation
- Permission system (`edit: deny`, `bash: allow`) prevents unauthorized operations

---

### 9. `AGENTS.md` as single source of truth over multiple config files

**Context:** How to ensure all AIs have the same project context.
**Decision:** `AGENTS.md` contains complete architecture, types, pipeline. Other configs (`CLAUDE.md`, `.cursorrules`) are short pointers.
**Rationale:**
- Single file to update when architecture changes
- No duplication = no drift between files
- Each AI tool reads its own config format, which points to `AGENTS.md`

---

### 10. Client-side only — no backend

**Context:** Data privacy concerns for designers.
**Decision:** All processing happens in the browser. No upload, no server.
**Rationale:**
- Designers work with confidential client assets — no data leaves their machine
- Zero infrastructure cost
- Offline-capable after initial load
- Simpler architecture (no API, no auth, no storage)
