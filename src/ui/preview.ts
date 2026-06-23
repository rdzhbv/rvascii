import type { AsciiGrid, EffectType } from '../types'
import { getEffectDefinition } from '../core/effects/registry'

// Store ResizeObserver globally so we can disconnect on cleanup
let resizeObserver: ResizeObserver | null = null
let contentWrapper: HTMLElement | null = null
let currentContainer: HTMLElement | null = null

export function renderGrid(
  grid: AsciiGrid,
  container: HTMLElement,
  fontSize: number,
  effect: EffectType = 'ascii'
): void {
  clearPlaceholder(container)

  const def = getEffectDefinition(effect)
  const isBlock = def.renderMode === 'block'

  // Get or create content wrapper
  let wrapper = container.querySelector<HTMLElement>('.preview-content')
  if (!wrapper) {
    wrapper = document.createElement('div')
    wrapper.className = 'preview-content'
    container.appendChild(wrapper)
  }
  contentWrapper = wrapper
  currentContainer = container

  // Render into wrapper
  if (isBlock) {
    renderBlockGrid(grid, wrapper, fontSize)
  } else {
    renderTextGrid(grid, wrapper, fontSize)
  }

  // Setup ResizeObserver for auto-scale
  setupAutoScale(container, wrapper)
}

function renderTextGrid(
  grid: AsciiGrid,
  wrapper: HTMLElement,
  fontSize: number
): void {
  const lineHeight = fontSize * 1.2
  wrapper.style.fontSize = `${fontSize}px`
  wrapper.style.lineHeight = `${lineHeight}px`
  wrapper.textContent = ''
  wrapper.style.display = ''

  for (const row of grid) {
    const rowEl = document.createElement('div')
    rowEl.style.whiteSpace = 'pre'
    rowEl.style.fontFamily = 'monospace'
    rowEl.style.letterSpacing = '0px'
    rowEl.style.height = `${lineHeight}px`

    for (const cell of row) {
      const span = document.createElement('span')
      const hex = `#${cell.r.toString(16).padStart(2, '0')}${cell.g.toString(16).padStart(2, '0')}${cell.b.toString(16).padStart(2, '0')}`
      span.style.color = hex
      span.textContent = cell.char === ' ' ? '\u00A0' : cell.char
      rowEl.appendChild(span)
    }
    wrapper.appendChild(rowEl)
  }
}

function renderBlockGrid(
  grid: AsciiGrid,
  wrapper: HTMLElement,
  blockSize: number
): void {
  wrapper.textContent = ''
  wrapper.style.fontSize = ''
  wrapper.style.lineHeight = ''
  wrapper.style.display = 'inline-flex'
  wrapper.style.flexDirection = 'column'

  for (const row of grid) {
    const rowEl = document.createElement('div')
    rowEl.style.display = 'flex'
    rowEl.style.flexDirection = 'row'
    rowEl.style.height = `${blockSize}px`

    for (const cell of row) {
      const block = document.createElement('div')
      block.style.width = `${blockSize}px`
      block.style.height = `${blockSize}px`
      block.style.flexShrink = '0'
      const hex = `#${cell.r.toString(16).padStart(2, '0')}${cell.g.toString(16).padStart(2, '0')}${cell.b.toString(16).padStart(2, '0')}`
      block.style.backgroundColor = hex
      rowEl.appendChild(block)
    }
    wrapper.appendChild(rowEl)
  }
}

function setupAutoScale(container: HTMLElement, wrapper: HTMLElement): void {
  // Disconnect old observer
  if (resizeObserver) {
    resizeObserver.disconnect()
  }

  const doScale = () => {
    const cw = container.clientWidth
    const ch = container.clientHeight
    if (cw === 0 || ch === 0) return

    // Measure content natural size
    wrapper.style.transform = 'none'
    wrapper.style.width = ''
    wrapper.style.height = ''

    // Force layout to get natural dimensions
    const rect = wrapper.getBoundingClientRect()
    const naturalW = rect.width
    const naturalH = rect.height
    if (naturalW === 0 || naturalH === 0) return

    // Calculate scale to fit with padding
    const pad = 0.92
    const scale = Math.min(cw / naturalW, ch / naturalH) * pad

    if (scale >= 1 && !wrapper.dataset.forceScale) {
      // Content fits natively, no scaling needed
      wrapper.style.transform = ''
      wrapper.style.width = ''
      wrapper.style.height = ''
      return
    }

    wrapper.style.transform = `scale(${scale})`
    wrapper.style.width = `${naturalW}px`
    wrapper.style.height = `${naturalH}px`
  }

  // Observe container size changes
  resizeObserver = new ResizeObserver(() => {
    doScale()
  })
  resizeObserver.observe(container)

  // Also run after layout settles
  requestAnimationFrame(() => doScale())
  requestAnimationFrame(() => doScale())
}

function clearPlaceholder(container: HTMLElement): void {
  const ph = container.querySelector('.preview-placeholder')
  if (ph) ph.remove()
}

export function renderGridToCanvas(
  canvas: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D,
  grid: AsciiGrid,
  fontSize: number,
  effect: EffectType = 'ascii'
): void {
  const cols = grid[0]?.length || 1
  const rows = grid.length
  const def = getEffectDefinition(effect)

  if (def.renderMode === 'block') {
    const blockSize = fontSize
    const w = Math.round(cols * blockSize)
    const h = Math.round(rows * blockSize)
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w
      canvas.height = h
    }
    ctx.fillStyle = '#000'
    ctx.fillRect(0, 0, w, h)
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const cell = grid[r][c]
        ctx.fillStyle = `rgb(${cell.r},${cell.g},${cell.b})`
        ctx.fillRect(c * blockSize, r * blockSize, blockSize, blockSize)
      }
    }
    return
  }

  const charW = fontSize * 0.6
  const charH = fontSize * 1.2
  const w = Math.round(cols * charW)
  const h = Math.round(rows * charH)

  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w
    canvas.height = h
  }

  ctx.fillStyle = '#000'
  ctx.fillRect(0, 0, w, h)
  ctx.font = `${fontSize}px monospace`
  ctx.textBaseline = 'top'

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const cell = grid[r][c]
      ctx.fillStyle = `rgb(${cell.r},${cell.g},${cell.b})`
      ctx.fillText(cell.char, c * charW, r * charH)
    }
  }
}

export function clearPreview(container: HTMLElement): void {
  // Disconnect observer
  if (resizeObserver) {
    resizeObserver.disconnect()
    resizeObserver = null
  }
  contentWrapper = null
  currentContainer = null

  container.textContent = ''
  const placeholder = document.createElement('div')
  placeholder.className = 'preview-placeholder'
  placeholder.innerHTML = `
    <div class="preview-placeholder-icon">A</div>
    <div class="preview-placeholder-text">No content loaded</div>
    <div class="preview-placeholder-hint">Drop an image or video to begin</div>
  `
  container.appendChild(placeholder)
}
