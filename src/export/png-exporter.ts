import type { AsciiGrid } from '../types'

export function exportPNG(grid: AsciiGrid, fontSize: number): Promise<Blob> {
  return new Promise((resolve) => {
    const cols = grid[0]?.length || 1
    const rows = grid.length
    const charW = fontSize * 0.6
    const charH = fontSize * 1.2
    const w = Math.round(cols * charW)
    const h = Math.round(rows * charH)

    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d')!
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

    canvas.toBlob((blob) => resolve(blob!), 'image/png')
  })
}
