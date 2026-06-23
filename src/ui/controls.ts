import { CHARSET_PRESETS, COLOR_FILTERS, type AsciiConfig, type CameraResolution, type EffectType, type ExportFormat } from '../types'
import { EFFECT_REGISTRY } from '../core/effects/registry'

export interface ControlsCallbacks {
  onFileLoad: (file: File) => void
  onConfigChange: (config: Partial<AsciiConfig>) => void
  onExport: (format: ExportFormat) => void
  onCameraToggle: () => void
  onCameraResolutionChange: (res: CameraResolution) => void
  onClear: () => void
  onResetSettings: () => void
}

export interface ControlsAPI {
  updateConfig: (config: AsciiConfig) => void
  setExportEnabled: (enabled: boolean) => void
  setCameraUIEnabled: (enabled: boolean) => void
  setCameraActive: (active: boolean) => void
  setCameraResolutions: (resolutions: CameraResolution[]) => void
  setCameraResolution: (res: CameraResolution) => void
}

export function createControlsUI(
  container: HTMLElement,
  config: AsciiConfig,
  callbacks: ControlsCallbacks
): ControlsAPI {
  container.innerHTML = ''

  const section = (title: string): HTMLDivElement => {
    const s = document.createElement('div')
    s.className = 'control-section'
    const h = document.createElement('h3')
    h.textContent = title
    s.appendChild(h)
    container.appendChild(s)
    return s
  }

  const slider = (label: string, min: number, max: number, step: number, value: number, cb: (v: number) => void): HTMLElement => {
    const decimals = String(step).includes('.') ? String(step).split('.')[1].length : 0
    const rnd = (v: number) => v.toFixed(decimals)

    const wrap = document.createElement('div')
    wrap.className = 'control-row'
    wrap.dataset.control = label.toLowerCase().replace(/\s+/g, '-')
    const lbl = document.createElement('label')
    lbl.textContent = label

    const inp = document.createElement('input')
    inp.type = 'range'
    inp.min = String(min)
    inp.max = String(max)
    inp.step = String(step)
    inp.value = String(value)

    // Track fill — sync CSS custom property for gradient fill on the slider track
    const updateTrackFill = () => {
      const mn = parseFloat(inp.min)
      const mx = parseFloat(inp.max)
      const v = parseFloat(inp.value)
      const pct = ((v - mn) / (mx - mn)) * 100
      inp.style.setProperty('--track-fill', `${pct}%`)
    }
    updateTrackFill()

    const valSpan = document.createElement('span')
    valSpan.className = 'control-value'
    valSpan.textContent = rnd(value)
    valSpan.dataset.value = String(value)
    valSpan.tabIndex = 0

    inp.addEventListener('input', () => {
      const v = parseFloat(inp.value)
      valSpan.textContent = rnd(v)
      valSpan.dataset.value = String(v)
      updateTrackFill()
      cb(v)
    })

    valSpan.addEventListener('click', () => {
      const current = valSpan.dataset.value || valSpan.textContent!
      const input = document.createElement('input')
      input.type = 'number'
      input.className = 'control-value-input'
      input.value = current
      input.min = String(min)
      input.max = String(max)
      input.step = String(step)
      input.tabIndex = 0

      const commit = () => {
        let v = parseFloat(input.value)
        if (isNaN(v)) v = parseFloat(valSpan.dataset.value || '0')
        v = Math.max(min, Math.min(max, v))
        inp.value = String(v)
        valSpan.textContent = rnd(v)
        valSpan.dataset.value = String(v)
        valSpan.style.display = ''
        input.replaceWith(valSpan)
        cb(v)
      }

      input.addEventListener('blur', commit)
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') { input.blur(); e.preventDefault() }
        if (e.key === 'Escape') { valSpan.style.display = ''; input.replaceWith(valSpan); e.preventDefault() }
      })
      input.addEventListener('focus', () => input.select())

      valSpan.style.display = 'none'
      valSpan.after(input)
      input.focus()
    })

    wrap.appendChild(lbl)
    wrap.appendChild(inp)
    wrap.appendChild(valSpan)
    const lastSection = container.lastElementChild as HTMLDivElement
    if (lastSection) lastSection.appendChild(wrap)
    return wrap
  }

  const selectControl = (label: string, options: { value: string; text: string }[], value: string, cb: (v: string) => void): HTMLElement => {
    const wrap = document.createElement('div')
    wrap.className = 'control-row'
    wrap.dataset.control = label.toLowerCase().replace(/\s+/g, '-')
    const lbl = document.createElement('label')
    lbl.textContent = label
    const sel = document.createElement('select')
    for (const opt of options) {
      const el = document.createElement('option')
      el.value = opt.value
      el.textContent = opt.text
      if (opt.value === value) el.selected = true
      sel.appendChild(el)
    }
    sel.addEventListener('change', () => cb(sel.value))
    wrap.appendChild(lbl)
    wrap.appendChild(sel)
    const lastSection = container.lastElementChild as HTMLDivElement
    if (lastSection) lastSection.appendChild(wrap)
    return wrap
  }

  const toggle = (label: string, value: boolean, cb: (v: boolean) => void): HTMLElement => {
    const wrap = document.createElement('div')
    wrap.className = 'control-row'
    wrap.dataset.control = label.toLowerCase().replace(/\s+/g, '-')
    const lbl = document.createElement('label')
    lbl.textContent = label
    const inp = document.createElement('input')
    inp.type = 'checkbox'
    inp.checked = value
    inp.addEventListener('change', () => cb(inp.checked))
    wrap.appendChild(lbl)
    wrap.appendChild(inp)
    const lastSection = container.lastElementChild as HTMLDivElement
    if (lastSection) lastSection.appendChild(wrap)
    return wrap
  }

  const btn = (label: string, cb: () => void): void => {
    const b = document.createElement('button')
    b.textContent = label
    b.className = 'control-btn'
    b.addEventListener('click', cb)
    container.appendChild(b)
  }

  // ═══════════════════════════════════════════════════════════
  // 1. FILE INPUT
  // ═══════════════════════════════════════════════════════════
  const fileSection = section('Input')
  const fileArea = document.createElement('div')
  fileArea.className = 'file-drop-area'
  const fileLabel = document.createElement('label')
  fileLabel.className = 'file-label'
  fileLabel.innerHTML = `
    <span class="file-icon">⤴</span>
    <span class="file-text">Drop image or video here</span>
    <span class="file-hint">or click to browse</span>
  `
  const fileInput = document.createElement('input')
  fileInput.type = 'file'
  fileInput.accept = 'image/*,video/*'
  fileInput.addEventListener('change', () => {
    const f = fileInput.files?.[0]
    if (f) {
      callbacks.onFileLoad(f)
      const textEl = fileArea.querySelector('.file-text') as HTMLElement
      if (textEl) textEl.textContent = f.name
    }
  })
  fileLabel.appendChild(fileInput)
  fileArea.appendChild(fileLabel)
  fileSection.appendChild(fileArea)

  const clearBtn = document.createElement('button')
  clearBtn.className = 'control-clear-btn'
  clearBtn.textContent = 'Clear'
  clearBtn.addEventListener('click', () => callbacks.onClear())
  fileSection.appendChild(clearBtn)

  // ═══════════════════════════════════════════════════════════
  // 2. CAMERA
  // ═══════════════════════════════════════════════════════════
  const cameraSection = section('Camera')
  const camBtn = document.createElement('button')
  camBtn.innerHTML = `<span class="cam-indicator"></span> Start Camera`
  camBtn.className = 'cam-btn'
  camBtn.addEventListener('click', () => callbacks.onCameraToggle())
  cameraSection.appendChild(camBtn)

  const resRow = document.createElement('div')
  resRow.className = 'control-row'
  const resLbl = document.createElement('label')
  resLbl.textContent = 'Resolution'
  const resSel = document.createElement('select')
  resSel.id = 'cam-resolution'
  resSel.disabled = true
  resSel.addEventListener('change', () => {
    const idx = parseInt(resSel.value)
    const avail: CameraResolution[] = []
    try { avail.push(...JSON.parse(resSel.dataset.resolutions || '[]')) } catch {}
    if (avail[idx]) callbacks.onCameraResolutionChange(avail[idx])
  })
  resRow.appendChild(resLbl)
  resRow.appendChild(resSel)
  cameraSection.appendChild(resRow)

  // ═══════════════════════════════════════════════════════════
  // 3. EFFECT SELECTOR
  // ═══════════════════════════════════════════════════════════
  const effectSection = section('Effect')
  const effectDesc = document.createElement('div')
  effectDesc.className = 'effect-description'
  effectSection.appendChild(effectDesc)

  const effectRow = document.createElement('div')
  effectRow.className = 'effect-grid'
  effectRow.id = 'effect-grid'

  const effectTypes = Object.keys(EFFECT_REGISTRY) as EffectType[]
  for (const eid of effectTypes) {
    const def = EFFECT_REGISTRY[eid].definition
    const btn = document.createElement('button')
    btn.className = 'effect-btn'
    btn.dataset.effect = eid
    btn.innerHTML = `<span class="effect-btn-label">${def.name}</span>`
    if (eid === config.effect) btn.classList.add('effect-btn-active')
    btn.title = def.description
    btn.addEventListener('click', () => {
      callbacks.onConfigChange({ effect: eid } as Partial<AsciiConfig>)
    })
    effectRow.appendChild(btn)
  }
  effectSection.appendChild(effectRow)

  function updateEffectDescription(effect: EffectType) {
    const def = EFFECT_REGISTRY[effect]?.definition
    effectDesc.textContent = def?.description ?? ''
  }
  updateEffectDescription(config.effect)

  // ═══════════════════════════════════════════════════════════
  // 4. CHARSET (ASCII only)
  // ═══════════════════════════════════════════════════════════
  const charSection = section('Characters')
  const charRow = document.createElement('div')
  charRow.className = 'control-row'
  const charLbl = document.createElement('label')
  charLbl.textContent = 'Preset'
  const charSel = document.createElement('select')
  charSel.id = 'charset'

  const categories = [...new Set(CHARSET_PRESETS.map((p) => p.category))]
  for (const cat of categories) {
    const group = document.createElement('optgroup')
    group.label = cat
    const presets = CHARSET_PRESETS.filter((p) => p.category === cat)
    for (const p of presets) {
      const opt = document.createElement('option')
      opt.value = p.id
      opt.textContent = `${p.name} (${p.chars.length} chars)`
      if (p.id === config.charsetId) opt.selected = true
      group.appendChild(opt)
    }
    charSel.appendChild(group)
  }
  const customOpt = document.createElement('option')
  customOpt.value = 'custom'
  customOpt.textContent = 'Custom...'
  charSel.appendChild(customOpt)

  charSel.addEventListener('change', () => {
    const v = charSel.value
    if (v === 'custom') {
      const c = prompt('Enter custom characters (bright to dim):', config.charset)
      if (c) callbacks.onConfigChange({ charset: c, charsetId: 'custom' })
    } else {
      const entry = CHARSET_PRESETS.find((p) => p.id === v)
      if (entry) callbacks.onConfigChange({ charset: entry.chars, charsetId: v })
    }
  })
  charRow.appendChild(charLbl)
  charRow.appendChild(charSel)
  charSection.appendChild(charRow)

  // ═══════════════════════════════════════════════════════════
  // 5. COMMON SETTINGS (shown for all effects)
  // ═══════════════════════════════════════════════════════════
  const settingsSection = section('Settings')
  const densityRow = slider('Density', 0.25, 2, 0.05, config.density, (v) => callbacks.onConfigChange({ density: v }))
  const contrastRow = slider('Contrast', 0, 2, 0.05, config.contrast, (v) => callbacks.onConfigChange({ contrast: v }))
  const brightnessRow = slider('Brightness', 0.1, 2, 0.05, config.brightness, (v) => callbacks.onConfigChange({ brightness: v }))
  const fontScaleRow = slider('Font Scale', 0.5, 3, 0.05, config.fontScale, (v) => callbacks.onConfigChange({ fontScale: v }))
  const invertRow = toggle('Invert', config.invert, (v) => callbacks.onConfigChange({ invert: v }))
  const colorRow = toggle('Color', config.colorEnabled, (v) => callbacks.onConfigChange({ colorEnabled: v }))

  // Reset Settings button
  const resetBtn = document.createElement('button')
  resetBtn.className = 'control-btn'
  resetBtn.textContent = 'Reset Settings'
  resetBtn.addEventListener('click', () => callbacks.onResetSettings())
  settingsSection.appendChild(resetBtn)

  // ═══════════════════════════════════════════════════════════
  // 6. EFFECT-SPECIFIC SETTINGS
  // ═══════════════════════════════════════════════════════════
  const effectSettingsSection = section('Effect Settings')
  const edgeThresholdRow = slider('Edge Threshold', 0.02, 0.5, 0.01, config.edgeThreshold, (v) => callbacks.onConfigChange({ edgeThreshold: v }))
  const silhouetteThresholdRow = slider('Threshold', 0.1, 0.9, 0.05, config.silhouetteThreshold, (v) => callbacks.onConfigChange({ silhouetteThreshold: v }))
  const ditherAlgoRow = selectControl('Algorithm', [
    { value: 'floyd-steinberg', text: 'Floyd-Steinberg' },
    { value: 'bayer', text: 'Bayer 4×4' },
  ], config.ditherAlgorithm, (v) => callbacks.onConfigChange({ ditherAlgorithm: v as 'floyd-steinberg' | 'bayer' }))
  const halftoneDotRow = slider('Dot Size', 0.5, 3, 0.1, config.halftoneDotSize, (v) => callbacks.onConfigChange({ halftoneDotSize: v }))
  const waveAmplitudeRow = slider('Amplitude', 0.01, 0.2, 0.005, config.waveAmplitude, (v) => callbacks.onConfigChange({ waveAmplitude: v }))
  const waveFreqRow = slider('Frequency', 1, 8, 0.5, config.waveFrequency, (v) => callbacks.onConfigChange({ waveFrequency: v }))
  const oilRadiusRow = slider('Radius', 1, 8, 1, config.oilPaintRadius, (v) => callbacks.onConfigChange({ oilPaintRadius: v }))

  // ═══════════════════════════════════════════════════════════
  // 7. COLOR FILTER
  // ═══════════════════════════════════════════════════════════
  const colorSection = section('Color Filter')
  const filterTypes: Record<string, string> = {
    source: 'Original',
    invert: 'Invert',
    monochrome: 'Monochrome',
    palette: 'Palettes',
  }
  const filterRow = document.createElement('div')
  filterRow.className = 'control-row'
  const filterLbl = document.createElement('label')
  filterLbl.textContent = 'Filter'
  const filterSel = document.createElement('select')
  filterSel.id = 'color-filter'

  const filterTypeOrder = ['source', 'invert', 'monochrome', 'palette']
  for (const type of filterTypeOrder) {
    const filters = COLOR_FILTERS.filter((f) => f.type === type)
    if (filters.length === 0) continue
    const group = document.createElement('optgroup')
    group.label = filterTypes[type] || type
    for (const f of filters) {
      const opt = document.createElement('option')
      opt.value = f.id
      opt.textContent = f.name
      if (f.id === config.colorFilterId) opt.selected = true
      group.appendChild(opt)
    }
    filterSel.appendChild(group)
  }

  filterSel.addEventListener('change', () => {
    callbacks.onConfigChange({ colorFilterId: filterSel.value })
  })
  filterRow.appendChild(filterLbl)
  filterRow.appendChild(filterSel)
  colorSection.appendChild(filterRow)

  function updateColorFilterDisabled() {
    filterSel.disabled = !config.colorEnabled
  }
  updateColorFilterDisabled()

  // ═══════════════════════════════════════════════════════════
  // 8. EXPORT
  // ═══════════════════════════════════════════════════════════
  const exportSection = section('Export')
  const exportRow = document.createElement('div')
  exportRow.className = 'export-row'
  const formats: ExportFormat[] = ['png', 'svg', 'jpg', 'gif', 'mp4']
  for (const fmt of formats) {
    const b = document.createElement('button')
    b.innerHTML = `<span>${fmt.toUpperCase()}</span>`
    b.className = 'export-btn'
    b.disabled = true
    b.addEventListener('click', () => callbacks.onExport(fmt))
    exportRow.appendChild(b)
  }
  exportSection.appendChild(exportRow)

  // ═══════════════════════════════════════════════════════════
  // VISIBILITY MAP: which controls are visible per effect
  // ═══════════════════════════════════════════════════════════
  const allControlRows: Record<string, HTMLElement> = {
    'charset': charSection,
    'invert': invertRow,
    'font-scale': fontScaleRow,
    'edge-threshold': edgeThresholdRow,
    'threshold': silhouetteThresholdRow,
    'algorithm': ditherAlgoRow,
    'dot-size': halftoneDotRow,
    'amplitude': waveAmplitudeRow,
    'frequency': waveFreqRow,
    'radius': oilRadiusRow,
  }

  // ═══════════════════════════════════════════════════════════
  // HALFTONE-SPECIFIC CONTROLS
  // ═══════════════════════════════════════════════════════════
  const htFreqRow = slider('Frequency', 1, 12, 1, config.halftoneFrequency, (v) => callbacks.onConfigChange({ halftoneFrequency: v }))
  const htShapeRow = selectControl('Dot Shape', [
    { value: 'round', text: 'Round' },
    { value: 'elliptical', text: 'Elliptical' },
    { value: 'square', text: 'Square' },
    { value: 'diamond', text: 'Diamond' },
    { value: 'line-horizontal', text: 'Line Horizontal' },
    { value: 'line-vertical', text: 'Line Vertical' },
  ], config.halftoneShape, (v) => callbacks.onConfigChange({ halftoneShape: v as typeof config.halftoneShape }))
  const htAngleRow = slider('Screen Angle', 0, 180, 1, config.halftoneAngle, (v) => callbacks.onConfigChange({ halftoneAngle: v }))
  const htColorModeRow = selectControl('Color Mode', [
    { value: 'bw', text: '1-bit B&W' },
    { value: 'color', text: 'Color Halftone' },
    { value: 'duotone', text: 'Duotone' },
  ], config.halftoneColorMode, (v) => callbacks.onConfigChange({ halftoneColorMode: v as typeof config.halftoneColorMode }))

  // Register halftone controls
  allControlRows['ht-freq'] = htFreqRow
  allControlRows['ht-shape'] = htShapeRow
  allControlRows['ht-angle'] = htAngleRow
  allControlRows['ht-color'] = htColorModeRow

  // ═══════════════════════════════════════════════════════════
  // BITMAP-SPECIFIC CONTROLS
  // ═══════════════════════════════════════════════════════════
  const bitmapDitherRow = selectControl('Dither', [
    { value: 'none', text: 'None (Threshold)' },
    { value: 'floyd-steinberg', text: 'Floyd-Steinberg' },
    { value: 'atkinson', text: 'Atkinson' },
    { value: 'stucki', text: 'Stucki' },
    { value: 'jarvis', text: 'Jarvis' },
    { value: 'sierra', text: 'Sierra' },
    { value: 'sierra-lite', text: 'Sierra Lite' },
    { value: 'burkes', text: 'Burkes' },
    { value: 'bayer-2x2', text: 'Bayer 2×2' },
    { value: 'bayer-4x4', text: 'Bayer 4×4' },
    { value: 'bayer-8x8', text: 'Bayer 8×8' },
    { value: 'halftone', text: 'Halftone Dots' },
    { value: 'line-horizontal', text: 'Line Horizontal' },
    { value: 'line-vertical', text: 'Line Vertical' },
    { value: 'crosshatch', text: 'Crosshatch' },
    { value: 'random', text: 'Random' },
  ], config.bitmapDither as string, (v) => callbacks.onConfigChange({ bitmapDither: v as typeof config.bitmapDither }))

  const bitmapScaleRow = slider('Pattern Scale', 0.5, 4, 0.25, config.bitmapPatternScale, (v) => callbacks.onConfigChange({ bitmapPatternScale: v }))
  const bitmapThresholdRow = slider('Threshold', 1, 255, 1, config.bitmapThreshold, (v) => callbacks.onConfigChange({ bitmapThreshold: v }))
  const bitmapColorRow = selectControl('Color Mode', [
    { value: 'bw', text: '1-bit B&W' },
    { value: 'color', text: 'Color Dither' },
  ], config.bitmapColorMode, (v) => callbacks.onConfigChange({ bitmapColorMode: v as 'bw' | 'color' }))

  // Add bitmap rows to allControlRows
  allControlRows['bitmap-dither'] = bitmapDitherRow
  allControlRows['bitmap-scale'] = bitmapScaleRow
  allControlRows['bitmap-threshold'] = bitmapThresholdRow
  allControlRows['bitmap-color'] = bitmapColorRow

  const effectControlMap: Record<EffectType, string[]> = {
    'ascii':         ['charset', 'invert', 'font-scale'],
    'bitmap':        ['bitmap-dither', 'bitmap-scale', 'bitmap-threshold', 'bitmap-color', 'invert', 'font-scale'],
    'edge-detect':   ['edge-threshold', 'font-scale'],
    'silhouette':    ['threshold'],
    'dither':        ['algorithm'],
    'halftone':      ['ht-freq', 'ht-shape', 'ht-angle', 'ht-color', 'invert', 'font-scale'],
    'wave':          ['amplitude', 'frequency'],
    'oil-paint':     ['radius'],
  }

  function applyEffectVisibility(effect: EffectType) {
    const def = EFFECT_REGISTRY[effect]?.definition
    const visibleControls = effectControlMap[effect] ?? []

    // Show/hide each control
    for (const [key, el] of Object.entries(allControlRows)) {
      el.style.display = visibleControls.includes(key) ? '' : 'none'
    }

    // Show effect-specific settings section label if any controls are visible
    const hasEffectControls = visibleControls.some((c) =>
      !['charset', 'invert', 'font-scale'].includes(c)
    )
    effectSettingsSection.style.display = hasEffectControls ? '' : 'none'

    // Update labels
    if (def) {
      const isBlock = def.renderMode === 'block'
      const fl = fontScaleRow.querySelector('label')
      if (fl) fl.textContent = isBlock ? 'Block Size' : 'Font Scale'
    }

    // Update effect buttons
    effectRow.querySelectorAll('.effect-btn').forEach((b) => {
      (b as HTMLButtonElement).classList.toggle('effect-btn-active', (b as HTMLButtonElement).dataset.effect === effect)
    })

    // Update description
    updateEffectDescription(effect)
  }

  // Apply initial state
  applyEffectVisibility(config.effect)

  return {
    updateConfig(newConfig: AsciiConfig) {
      config = newConfig

      // Update color filter
      filterSel.disabled = !config.colorEnabled
      for (let i = 0; i < filterSel.options.length; i++) {
        if (filterSel.options[i].value === config.colorFilterId) {
          filterSel.selectedIndex = i
          break
        }
      }

      applyEffectVisibility(config.effect)
    },
    setExportEnabled(enabled: boolean) {
      const btns = container.querySelectorAll('.export-btn')
      btns.forEach((b) => (b as HTMLButtonElement).disabled = !enabled)
    },
    setCameraUIEnabled(enabled: boolean) {
      camBtn.disabled = !enabled
      if (resSel) resSel.disabled = !enabled
    },
    setCameraActive(active: boolean) {
      camBtn.innerHTML = active
        ? '<span class="cam-indicator"></span> Stop Camera'
        : '<span class="cam-indicator"></span> Start Camera'
      camBtn.classList.toggle('cam-active', active)
      if (resSel) resSel.disabled = !active
    },
    setCameraResolutions(resolutions: CameraResolution[]) {
      resSel.innerHTML = ''
      resSel.dataset.resolutions = JSON.stringify(resolutions)
      for (let i = 0; i < resolutions.length; i++) {
        const opt = document.createElement('option')
        opt.value = String(i)
        opt.textContent = resolutions[i].label
        resSel.appendChild(opt)
      }
      resSel.disabled = false
    },
    setCameraResolution(res: CameraResolution) {
      const resolutions: CameraResolution[] = []
      try { resolutions.push(...JSON.parse(resSel.dataset.resolutions || '[]')) } catch {}
      const idx = resolutions.findIndex((r) => r.width === res.width && r.height === res.height)
      if (idx >= 0) resSel.selectedIndex = idx
    },
  }
}
