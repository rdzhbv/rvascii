export function getImageData(
  source: HTMLImageElement | HTMLVideoElement | HTMLCanvasElement
): ImageData | null {
  const canvas = document.createElement('canvas')
  if (source instanceof HTMLVideoElement) {
    canvas.width = source.videoWidth
    canvas.height = source.videoHeight
  } else {
    canvas.width = source.width
    canvas.height = source.height
  }
  const ctx = canvas.getContext('2d')
  if (!ctx) return null
  ctx.drawImage(source, 0, 0)
  return ctx.getImageData(0, 0, canvas.width, canvas.height)
}

export function extractLuminance(imageData: ImageData): Float32Array {
  const { data, width, height } = imageData
  const len = width * height
  const lum = new Float32Array(len)
  for (let i = 0; i < len; i++) {
    const idx = i * 4
    lum[i] = (0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2]) / 255
  }
  return lum
}

export function applyContrast(lum: Float32Array, contrast: number): Float32Array {
  const factor = (259 * (contrast * 127 + 127)) / (255 * (259 - (contrast * 127 + 127)))
  const out = new Float32Array(lum.length)
  for (let i = 0; i < lum.length; i++) {
    out[i] = Math.max(0, Math.min(1, factor * (lum[i] - 0.128) + 0.128))
  }
  return out
}

export function applyBrightness(lum: Float32Array, brightness: number): Float32Array {
  const out = new Float32Array(lum.length)
  for (let i = 0; i < lum.length; i++) {
    out[i] = Math.max(0, Math.min(1, lum[i] * brightness))
  }
  return out
}

export function sampleGrid<T>(
  data: T[],
  srcWidth: number,
  srcHeight: number,
  cols: number,
  rows: number
): T[] {
  const sampled = new Array<T>(cols * rows)
  const xStep = srcWidth / cols
  const yStep = srcHeight / rows
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const sx = Math.min(Math.floor(c * xStep), srcWidth - 1)
      const sy = Math.min(Math.floor(r * yStep), srcHeight - 1)
      sampled[r * cols + c] = data[sy * srcWidth + sx]
    }
  }
  return sampled
}

export function sampleImageDataGrid(
  imageData: ImageData,
  cols: number,
  rows: number
): { lum: Float32Array; r: Float32Array; g: Float32Array; b: Float32Array } {
  const { data, width, height } = imageData
  const lum = new Float32Array(cols * rows)
  const r = new Float32Array(cols * rows)
  const g = new Float32Array(cols * rows)
  const b = new Float32Array(cols * rows)
  const xStep = width / cols
  const yStep = height / rows
  for (let rIdx = 0; rIdx < rows; rIdx++) {
    for (let cIdx = 0; cIdx < cols; cIdx++) {
      const sx = Math.min(Math.floor(cIdx * xStep), width - 1)
      const sy = Math.min(Math.floor(rIdx * yStep), height - 1)
      const idx = (sy * width + sx) * 4
      const ri = data[idx]
      const gi = data[idx + 1]
      const bi = data[idx + 2]
      const li = (0.299 * ri + 0.587 * gi + 0.114 * bi) / 255
      const pos = rIdx * cols + cIdx
      lum[pos] = li
      r[pos] = ri
      g[pos] = gi
      b[pos] = bi
    }
  }
  return { lum, r, g, b }
}
