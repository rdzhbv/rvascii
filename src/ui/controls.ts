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
    const decimals = String(step).includes('.') ? String(step).split('.')[1].length : 0
    const rnd = (v: number) => v.toFixed(decimals)

    const wrap = document.createElement('div')
    wrap.className = 'control-row'
    const lbl = document.createElement('label')
    lbl.textContent = label

    const inp = document.createElement('input')
    inp.type = 'range'
    inp.min = String(min)
    inp.max = String(max)
    inp.step = String(step)
    inp.value = String(value)

    const valSpan = document.createElement('span')
    valSpan.className = 'control-value'
    valSpan.textContent = rnd(value)
    valSpan.dataset.value = String(value)
    valSpan.tabIndex = 0

    inp.addEventListener('input', () => {
      const v = parseFloat(inp.value)
      valSpan.textContent = rnd(v)
      valSpan.dataset.value = String(v)
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
  const camBtn = document.createElement('button')
  camBtn.textContent = 'Start Camera'
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

  // Charset
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

  // Settings
  const settingsSection = section('Settings')
  slider('Density', 0.25, 2, 0.05, config.density, (v) => callbacks.onConfigChange({ density: v }))
  slider('Contrast', 0, 2, 0.05, config.contrast, (v) => callbacks.onConfigChange({ contrast: v }))
  slider('Brightness', 0.1, 2, 0.05, config.brightness, (v) => callbacks.onConfigChange({ brightness: v }))
  slider('Font Scale', 0.5, 3, 0.05, config.fontScale, (v) => callbacks.onConfigChange({ fontScale: v }))
  toggle('Invert', config.invert, (v) => callbacks.onConfigChange({ invert: v }))
  toggle('Color', config.colorEnabled, (v) => callbacks.onConfigChange({ colorEnabled: v }))

  // Color Filter
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
      filterSel.disabled = !config.colorEnabled
      for (let i = 0; i < filterSel.options.length; i++) {
        if (filterSel.options[i].value === config.colorFilterId) {
          filterSel.selectedIndex = i
          break
        }
      }
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
      camBtn.textContent = active ? 'Stop Camera' : 'Start Camera'
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
