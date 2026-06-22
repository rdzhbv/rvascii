import * as opentype from 'opentype.js'
import type { AsciiGrid } from '../types'

let fontPromise: Promise<opentype.Font> | null = null

async function getFont(): Promise<opentype.Font> {
  if (!fontPromise) {
    fontPromise = (async () => {
      const resp = await fetch('/jetbrains-mono-latin-400-normal.woff')
      const buf = await resp.arrayBuffer()
      return opentype.parse(buf)
    })()
  }
  return fontPromise
}

export async function exportSVG(grid: AsciiGrid, fontSize: number): Promise<Blob> {
  const font = await getFont()
  const cols = grid[0]?.length || 1
  const rows = grid.length
  const charW = fontSize * 0.6
  const charH = fontSize * 1.2
  const w = Math.round(cols * charW)
  const h = Math.round(rows * charH)

  const cells: { path: string; color: string }[] = []

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const cell = grid[r][c]
      if (cell.char === ' ') continue
      const x = c * charW
      const y = r * charH
      const color = `rgb(${cell.r},${cell.g},${cell.b})`
      const path = font.getPath(cell.char, x, y + fontSize * 0.85, fontSize)
      cells.push({ path: path.toPathData(), color })
    }
  }

  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <rect width="${w}" height="${h}" fill="#000"/>
`
  for (const { path, color } of cells) {
    svg += `  <path d="${path}" fill="${color}"/>\n`
  }
  svg += '</svg>'

  return new Blob([svg], { type: 'image/svg+xml' })
}
