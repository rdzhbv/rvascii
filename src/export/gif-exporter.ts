import GIF from 'gif.js'
import type { AsciiGrid } from '../types'

export async function exportGIF(
  frames: AsciiGrid[],
  fontSize: number,
  frameDelay: number,
  onProgress?: (current: number, total: number) => void
): Promise<Blob | null> {
  const cols = frames[0]?.[0]?.length || 1
  const rows = frames[0]?.length || 1
  const charW = fontSize * 0.6
  const charH = fontSize * 1.2
  const w = Math.round(cols * charW)
  const h = Math.round(rows * charH)

  const gif = new GIF({
    workers: 2,
    quality: 10,
    width: w,
    height: h,
    workerScript: './gif.worker.js',
  })

  for (let i = 0; i < frames.length; i++) {
    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d')!
    ctx.fillStyle = '#000'
    ctx.fillRect(0, 0, w, h)
    ctx.font = `${fontSize}px monospace`
    ctx.textBaseline = 'top'

    const grid = frames[i]
    for (let r = 0; r < grid.length; r++) {
      for (let c = 0; c < grid[r].length; c++) {
        const cell = grid[r][c]
        ctx.fillStyle = `rgb(${cell.r},${cell.g},${cell.b})`
        ctx.fillText(cell.char, c * charW, r * charH)
      }
    }

    gif.addFrame(canvas, { copy: true, delay: frameDelay })
    onProgress?.(i + 1, frames.length)
  }

  return new Promise((resolve) => {
    gif.on('progress', (p: number) => {
      onProgress?.(Math.round(p * frames.length), frames.length)
    })
    gif.on('finished', (blob: Blob) => {
      resolve(blob)
    })
    gif.render()
  })
}
