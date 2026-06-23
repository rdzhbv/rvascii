import type { AsciiGrid, EffectType } from '../types'
import { getEffectDefinition } from '../core/effects/registry'

export function renderGrid(
  grid: AsciiGrid,
  container: HTMLElement,
  fontSize: number,
  effect: EffectType = 'ascii'
): void {
  clearPlaceholder(container)

  const def = getEffectDefinition(effect)

  if (def.renderMode === 'block') {
    renderBlockGrid(grid, container, fontSize)
    return
  }

  // ── Text render (ASCII, Edge Detect, Halftone) ──
  const lineHeight = fontSize * 1.2
  container.style.fontSize = `${fontSize}px`
  container.style.lineHeight = `${lineHeight}px`
  container.textContent = ''

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
    container.appendChild(rowEl)
  }
}

function renderBlockGrid(
  grid: AsciiGrid,
  container: HTMLElement,
  blockSize: number
): void {
  container.textContent = ''
  container.style.fontSize = ''
  container.style.lineHeight = ''

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
    container.appendChild(rowEl)
  }
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
