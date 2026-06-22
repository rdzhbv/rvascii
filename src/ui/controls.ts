import { CHARSET_PRESETS, COLOR_FILTERS, type AsciiConfig, type CameraResolution, type ExportFormat } from '../types'

export interface ControlsCallbacks {
  onFileLoad: (file: File) => void
  onConfigChange: (config: Partial<AsciiConfig>) => void
  onExport: (format: ExportFormat) => void
  onCameraToggle: () => void
  onCameraResolutionChange: (res: CameraResolution) => void
}

export function createControlsUI(
  container: HTMLElement,
  config: AsciiConfig,
  callbacks: ControlsCallbacks
): {
  updateConfig: (config: AsciiConfig) => void
  setExportEnabled: (enabled: boolean) => void
  setCameraUIEnabled: (enabled: boolean) => void
  setCameraActive: (active: boolean) => void
  setCameraResolutions: (resolutions: CameraResolution[]) => void
  setCameraResolution: (res: CameraResolution) => void
} {
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

  const slider = (label: string, min: number, max: number, step: number, value: number, cb: (v: number) => void): void => {
    const wrap = document.createElement('div')
    wrap.className = 'control-row'
    const lbl = document.createElement('label')
    lbl.textContent = label
    const valSpan = document.createElement('span')
    valSpan.className = 'control-value'
    valSpan.textContent = String(value)
    const inp = document.createElement('input')
    inp.type = 'range'
    inp.min = String(min)
    inp.max = String(max)
    inp.step = String(step)
    inp.value = String(value)
    inp.addEventListener('input', () => {
      const v = parseFloat(inp.value)
      valSpan.textContent = String(v)
      cb(v)
    })
    wrap.appendChild(lbl)
    wrap.appendChild(inp)
    wrap.appendChild(valSpan)
    const lastSection = container.lastElementChild as HTMLDivElement
    if (lastSection) lastSection.appendChild(wrap)
  }

  const select = (label: string, options: { value: string; text: string }[], value: string, cb: (v: string) => void): void => {
    const wrap = document.createElement('div')
    wrap.className = 'control-row'
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
  }

  const toggle = (label: string, value: boolean, cb: (v: boolean) => void): void => {
    const wrap = document.createElement('div')
    wrap.className = 'control-row'
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
  }

  const btn = (label: string, cb: () => void): void => {
    const b = document.createElement('button')
    b.textContent = label
    b.className = 'control-btn'
    b.addEventListener('click', cb)
    container.appendChild(b)
  }

  // File input
  const fileSection = section('Input')
  const fileRow = document.createElement('div')
  fileRow.className = 'control-row'
  const fileInput = document.createElement('input')
  fileInput.type = 'file'
  fileInput.accept = 'image/*,video/*'
  fileInput.addEventListener('change', () => {
    const f = fileInput.files?.[0]
    if (f) callbacks.onFileLoad(f)
  })
  fileRow.appendChild(fileInput)
  fileSection.appendChild(fileRow)

  // Camera
  const cameraSection = section('Camera')
  const camToggleRow = document.createElement('div')
  camToggleRow.className = 'control-row'
  const camLbl = document.createElement('label')
  camLbl.textContent = 'Camera'
  const camChk = document.createElement('input')
  camChk.type = 'checkbox'
  camChk.addEventListener('change', () => callbacks.onCameraToggle())
  camToggleRow.appendChild(camLbl)
  camToggleRow.appendChild(camChk)
  cameraSection.appendChild(camToggleRow)

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

  // Charset
  const charSection = section('Characters')
  const charsetPresets = CHARSET_PRESETS.map((p) => ({
    value: p.id,
    text: `${p.name} (${p.chars.length} chars)`,
  }))
  charsetPresets.push({ value: 'custom', text: 'Custom...' })
  select('Preset', charsetPresets, config.charsetId, (v) => {
    if (v === 'custom') {
      const c = prompt('Enter custom characters (bright to dim):', config.charset)
      if (c) callbacks.onConfigChange({ charset: c, charsetId: 'custom' })
    } else {
      const entry = CHARSET_PRESETS.find((p) => p.id === v)
      if (entry) callbacks.onConfigChange({ charset: entry.chars, charsetId: v })
    }
  })

  // Settings
  const settingsSection = section('Settings')
  slider('Density', 0.25, 2, 0.25, config.density, (v) => callbacks.onConfigChange({ density: v }))
  slider('Contrast', 0, 2, 0.1, config.contrast, (v) => callbacks.onConfigChange({ contrast: v }))
  slider('Brightness', 0.1, 2, 0.1, config.brightness, (v) => callbacks.onConfigChange({ brightness: v }))
  slider('Font Scale', 0.5, 3, 0.25, config.fontScale, (v) => callbacks.onConfigChange({ fontScale: v }))
  toggle('Invert', config.invert, (v) => callbacks.onConfigChange({ invert: v }))
  toggle('Color', config.colorEnabled, (v) => callbacks.onConfigChange({ colorEnabled: v }))

  // Color Filter
  const colorSection = section('Color Filter')
  const colorOpts = COLOR_FILTERS.map((f) => ({
    value: f.id,
    text: f.name,
  }))
  const colorFilterRow = document.createElement('div')
  colorFilterRow.className = 'control-row'
  const colorFilterLbl = document.createElement('label')
  colorFilterLbl.textContent = 'Filter'
  const colorFilterSel = document.createElement('select')
  colorFilterSel.id = 'color-filter'
  for (const opt of colorOpts) {
    const el = document.createElement('option')
    el.value = opt.value
    el.textContent = opt.text
    if (opt.value === config.colorFilterId) el.selected = true
    colorFilterSel.appendChild(el)
  }
  colorFilterSel.addEventListener('change', () => {
    callbacks.onConfigChange({ colorFilterId: colorFilterSel.value })
  })
  colorFilterRow.appendChild(colorFilterLbl)
  colorFilterRow.appendChild(colorFilterSel)
  colorSection.appendChild(colorFilterRow)

  function updateColorFilterDisabled() {
    colorFilterSel.disabled = !config.colorEnabled
  }
  updateColorFilterDisabled()

  // Export
  const exportSection = section('Export')
  const exportRow = document.createElement('div')
  exportRow.className = 'export-row'
  const formats: ExportFormat[] = ['png', 'svg', 'jpg', 'gif', 'mp4']
  for (const fmt of formats) {
    const b = document.createElement('button')
    b.textContent = fmt.toUpperCase()
    b.className = 'export-btn'
    b.disabled = true
    b.addEventListener('click', () => callbacks.onExport(fmt))
    exportRow.appendChild(b)
  }
  exportSection.appendChild(exportRow)

  return {
    updateConfig(newConfig: AsciiConfig) {
      config = newConfig
      colorFilterSel.disabled = !config.colorEnabled
      // Update filter selection
      const filterIdx = colorOpts.findIndex((o) => o.value === config.colorFilterId)
      if (filterIdx >= 0) colorFilterSel.selectedIndex = filterIdx
    },
    setExportEnabled(enabled: boolean) {
      const btns = container.querySelectorAll('.export-btn')
      btns.forEach((b) => (b as HTMLButtonElement).disabled = !enabled)
    },
    setCameraUIEnabled(enabled: boolean) {
      camChk.disabled = !enabled
      if (resSel) resSel.disabled = !enabled
    },
    setCameraActive(active: boolean) {
      camChk.checked = active
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
