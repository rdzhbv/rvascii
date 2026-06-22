import type { AsciiGrid } from '../types'

export function renderGrid(
  grid: AsciiGrid,
  container: HTMLElement,
  fontSize: number
): void {
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

export function renderGridToCanvas(
  canvas: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D,
  grid: AsciiGrid,
  fontSize: number
): void {
  const cols = grid[0]?.length || 1
  const rows = grid.length
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
  container.innerHTML = '<div style="color:#666;text-align:center;padding:20px">No image loaded</div>'
}
