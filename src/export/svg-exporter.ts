import type { AsciiGrid } from '../types'

export function exportSVG(grid: AsciiGrid, fontSize: number): Blob {
  const cols = grid[0]?.length || 1
  const rows = grid.length
  const charW = fontSize * 0.6
  const charH = fontSize * 1.2
  const w = Math.round(cols * charW)
  const h = Math.round(rows * charH)

  let textElements = ''
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const cell = grid[r][c]
      if (cell.char !== ' ') {
        const x = c * charW
        const y = r * charH + fontSize * 0.85
        const color = `rgb(${cell.r},${cell.g},${cell.b})`
        const escaped = cell.char === '&' ? '&amp;' : cell.char === '<' ? '&lt;' : cell.char === '>' ? '&gt;' : cell.char === '"' ? '&quot;' : cell.char
        textElements += `<text x="${x}" y="${y}" fill="${color}" font-family="monospace" font-size="${fontSize}">${escaped}</text>\n`
      }
    }
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <rect width="${w}" height="${h}" fill="#000"/>
  ${textElements}</svg>`

  return new Blob([svg], { type: 'image/svg+xml' })
}
