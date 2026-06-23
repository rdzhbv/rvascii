import type { AsciiConfig, AsciiGrid, BitmapDitherMode } from '../types'

const NBSP = '\u00A0'

// ── Bayer matrices ────────────────────────────────────────────

const BAYER_2x2 = [
  0/4, 2/4,
  3/4, 1/4,
]

const BAYER_4x4 = [
   0/16,  8/16,  2/16, 10/16,
  12/16,  4/16, 14/16,  6/16,
   3/16, 11/16,  1/16,  9/16,
  15/16,  7/16, 13/16,  5/16,
]

const BAYER_8x8 = [
   0/64, 32/64,  8/64, 40/64,  2/64, 34/64, 10/64, 42/64,
  48/64, 16/64, 56/64, 24/64, 50/64, 18/64, 58/64, 26/64,
  12/64, 44/64,  4/64, 36/64, 14/64, 46/64,  6/64, 38/64,
  60/64, 28/64, 52/64, 20/64, 62/64, 30/64, 54/64, 22/64,
   3/64, 35/64, 11/64, 43/64,  1/64, 33/64,  9/64, 41/64,
  51/64, 19/64, 59/64, 27/64, 49/64, 17/64, 57/64, 25/64,
  15/64, 47/64,  7/64, 39/64, 13/64, 45/64,  5/64, 37/64,
  63/64, 31/64, 55/64, 23/64, 61/64, 29/64, 53/64, 21/64,
]

// ── Pattern dithering matrices ────────────────────────────────

// Halftone clustered dot (4x4)
const HALFTONE_4x4 = [
  12/16,  5/16,  6/16, 13/16,
   4/16,  0/16,  1/16,  7/16,
  11/16,  3/16,  2/16,  8/16,
  15/16, 10/16,  9/16, 14/16,
]

// Horizontal line pattern (8x1)
function makeLineMatrix(thickness: number, horizontal: boolean): number[] {
  const size = 8
  const m: number[] = []
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const lineIdx = horizontal ? y : x
      const ratio = lineIdx / size
      m.push(ratio)
    }
  }
  return m
}

function getBayerMatrix(size: 'bayer-2x2' | 'bayer-4x4' | 'bayer-8x8'): { m: number[]; dim: number } {
  switch (size) {
    case 'bayer-2x2': return { m: BAYER_2x2, dim: 2 }
    case 'bayer-4x4': return { m: BAYER_4x4, dim: 4 }
    case 'bayer-8x8': return { m: BAYER_8x8, dim: 8 }
  }
}

// ── Error diffusion matrices ──────────────────────────────────

interface DiffMatrix {
  divisor: number
  // Offsets relative to current pixel: [dx, dy, weight]
  taps: [number, number, number][]
}

const DIFFUSION_MATRICES: Record<string, DiffMatrix> = {
  'floyd-steinberg': {
    divisor: 16,
    taps: [
      [1, 0, 7],
      [-1, 1, 3],
      [0, 1, 5],
      [1, 1, 1],
    ],
  },
  'atkinson': {
    divisor: 8,
    taps: [
      [1, 0, 1],
      [2, 0, 1],
      [-1, 1, 1],
      [0, 1, 1],
      [1, 1, 1],
      [0, 2, 1],
    ],
  },
  'stucki': {
    divisor: 42,
    taps: [
      [1, 0, 8],
      [2, 0, 4],
      [-2, 1, 2],
      [-1, 1, 4],
      [0, 1, 8],
      [1, 1, 4],
      [2, 1, 2],
      [-1, 2, 1],
      [0, 2, 2],
      [1, 2, 1],
    ],
  },
  'jarvis': {
    divisor: 48,
    taps: [
      [1, 0, 7],
      [2, 0, 5],
      [-2, 1, 3],
      [-1, 1, 5],
      [0, 1, 7],
      [1, 1, 5],
      [2, 1, 3],
      [-2, 2, 1],
      [-1, 2, 3],
      [0, 2, 5],
      [1, 2, 3],
      [2, 2, 1],
    ],
  },
  'sierra': {
    divisor: 32,
    taps: [
      [1, 0, 5],
      [2, 0, 3],
      [-2, 1, 2],
      [-1, 1, 4],
      [0, 1, 5],
      [1, 1, 4],
      [2, 1, 2],
      [-1, 2, 2],
      [0, 2, 3],
      [1, 2, 2],
    ],
  },
  'sierra-lite': {
    divisor: 4,
    taps: [
      [1, 0, 2],
      [-1, 1, 1],
      [0, 1, 1],
    ],
  },
  'burkes': {
    divisor: 32,
    taps: [
      [1, 0, 8],
      [2, 0, 4],
      [-2, 1, 2],
      [-1, 1, 4],
      [0, 1, 8],
      [1, 1, 4],
      [2, 1, 2],
    ],
  },
}

// ── Threshold (no dither) ─────────────────────────────────────

function processThreshold(
  gray: Float32Array,
  width: number, height: number,
  threshold: number
): Uint8Array {
  const out = new Uint8Array(width * height)
  for (let i = 0; i < gray.length; i++) {
    out[i] = gray[i] * 255 >= threshold ? 255 : 0
  }
  return out
}

// ── Error diffusion (generic) ─────────────────────────────────

function processErrorDiffusion(
  gray: Float32Array,
  width: number, height: number,
  matrix: DiffMatrix,
  threshold: number,
  serpentine: boolean = true
): Uint8Array {
  const out = new Float32Array(gray)
  const result = new Uint8Array(width * height)

  for (let y = 0; y < height; y++) {
    const leftToRight = !serpentine || (y % 2 === 0)
    const startX = leftToRight ? 0 : width - 1
    const endX = leftToRight ? width : -1
    const stepX = leftToRight ? 1 : -1

    for (let x = startX; x !== endX; x += stepX) {
      const idx = y * width + x
      const oldPixel = out[idx]
      const newPixel = oldPixel * 255 >= threshold ? 255 : 0
      result[idx] = newPixel

      const err = oldPixel - (newPixel / 255)
      if (err === 0) continue

      for (const [dx, dy, w] of matrix.taps) {
        const nx = leftToRight ? x + dx : x - dx
        const ny = y + dy
        if (nx < 0 || nx >= width || ny >= height) continue
        out[ny * width + nx] += err * (w / matrix.divisor)
      }
    }
  }

  return result
}

// ── Ordered dither (Bayer / pattern) ──────────────────────────

function processOrdered(
  gray: Float32Array,
  width: number, height: number,
  matrix: number[],
  dim: number,
  threshold: number,
  scale: number
): Uint8Array {
  const out = new Uint8Array(width * height)
  const s = Math.max(1, Math.round(scale))
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x
      const mx = Math.floor(x / s) % dim
      const my = Math.floor(y / s) % dim
      const thresh = matrix[my * dim + mx] * 255
      out[idx] = gray[idx] * 255 + thresh >= threshold ? 255 : 0
    }
  }
  return out
}

// ── Halftone clustered dot ────────────────────────────────────

function processHalftoneDots(
  gray: Float32Array,
  width: number, height: number,
  threshold: number,
  scale: number
): Uint8Array {
  return processOrdered(gray, width, height, HALFTONE_4x4, 4, threshold, scale)
}

// ── Line patterns ─────────────────────────────────────────────

function processLinePattern(
  gray: Float32Array,
  width: number, height: number,
  horizontal: boolean,
  threshold: number,
  scale: number
): Uint8Array {
  const dim = Math.max(2, Math.round(8 * scale))
  const out = new Uint8Array(width * height)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x
      const patternIdx = horizontal ? (y % dim) : (x % dim)
      const thresh = (patternIdx / dim) * 255
      // Invert line pattern: lines are dark
      out[idx] = gray[idx] * 255 + (255 - thresh) >= threshold ? 255 : 0
    }
  }
  return out
}

// ── Crosshatch pattern ────────────────────────────────────────

function processCrosshatch(
  gray: Float32Array,
  width: number, height: number,
  threshold: number,
  scale: number
): Uint8Array {
  const dim = Math.max(2, Math.round(8 * scale))
  const out = new Uint8Array(width * height)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x
      const px = (x % dim) / dim
      const py = (y % dim) / dim
      const thresh = Math.min(1, px + py) / 2 * 255
      out[idx] = gray[idx] * 255 + thresh >= threshold ? 255 : 0
    }
  }
  return out
}

// ── Random (white noise) ──────────────────────────────────────

function processRandom(
  gray: Float32Array,
  width: number, height: number,
  threshold: number
): Uint8Array {
  const out = new Uint8Array(width * height)
  for (let i = 0; i < gray.length; i++) {
    const noise = Math.random() * 255
    out[i] = gray[i] * 255 + noise >= threshold ? 255 : 0
  }
  return out
}

// ── Main dispatch ─────────────────────────────────────────────

export function convertToBitmap(imageData: ImageData, config: AsciiConfig): AsciiGrid {
  const { width, height, data } = imageData
  const aspect = width / height
  const targetCols = Math.max(20, Math.round(100 * config.density * (aspect > 1 ? aspect : 1)))
  const targetRows = Math.max(10, Math.round(targetCols / aspect * 0.55))

  const dither = config.bitmapDither || 'floyd-steinberg'
  const threshold = config.bitmapThreshold || 128
  const scale = config.bitmapPatternScale || 1
  const colorMode = config.bitmapColorMode || 'bw'
  const invert = config.invert

  // Build full-resolution grayscale + color arrays
  const gray = new Float32Array(width * height)
  const red = new Float32Array(width * height)
  const green = new Float32Array(width * height)
  const blue = new Float32Array(width * height)

  for (let i = 0; i < width * height; i++) {
    const idx = i * 4
    let r = data[idx], g = data[idx + 1], b = data[idx + 2]
    // Apply brightness/contrast
    let lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255
    lum = Math.max(0, Math.min(1, lum * config.brightness))
    if (config.contrast !== 1) {
      const factor = (259 * (config.contrast * 127 + 127)) / (255 * (259 - (config.contrast * 127 + 127)))
      lum = Math.max(0, Math.min(1, factor * (lum - 0.128) + 0.128))
    }
    gray[i] = lum
    red[i] = r
    green[i] = g
    blue[i] = b
  }

  // Dither luminance (always 1-bit for the base mask)
  let bw: Uint8Array

  switch (dither) {
    case 'none':
      bw = processThreshold(gray, width, height, threshold)
      break
    case 'floyd-steinberg':
    case 'atkinson':
    case 'stucki':
    case 'jarvis':
    case 'sierra':
    case 'sierra-lite':
    case 'burkes': {
      const matrix = DIFFUSION_MATRICES[dither]
      bw = processErrorDiffusion(gray, width, height, matrix, threshold)
      break
    }
    case 'bayer-2x2':
    case 'bayer-4x4':
    case 'bayer-8x8': {
      const { m, dim } = getBayerMatrix(dither)
      bw = processOrdered(gray, width, height, m, dim, threshold, scale)
      break
    }
    case 'halftone':
      bw = processHalftoneDots(gray, width, height, threshold, scale)
      break
    case 'line-horizontal':
      bw = processLinePattern(gray, width, height, true, threshold, scale)
      break
    case 'line-vertical':
      bw = processLinePattern(gray, width, height, false, threshold, scale)
      break
    case 'crosshatch':
      bw = processCrosshatch(gray, width, height, threshold, scale)
      break
    case 'random':
      bw = processRandom(gray, width, height, threshold)
      break
    default:
      bw = processThreshold(gray, width, height, threshold)
  }

  // Sample at target resolution
  const xStep = width / targetCols
  const yStep = height / targetRows

  const grid: AsciiGrid = []

  for (let row = 0; row < targetRows; row++) {
    const gridRow = []
    for (let col = 0; col < targetCols; col++) {
      const sx = Math.min(Math.floor(col * xStep), width - 1)
      const sy = Math.min(Math.floor(row * yStep), height - 1)
      const srcIdx = sy * width + sx

      const isWhite = bw[srcIdx] > 0

      if (colorMode === 'color') {
        // Color dither: pick original color for white pixels, black for black pixels
        if (isWhite) {
          const r = red[srcIdx], g = green[srcIdx], b = blue[srcIdx]
          gridRow.push({ char: NBSP, r, g, b })
        } else {
          gridRow.push({ char: NBSP, r: 0, g: 0, b: 0 })
        }
      } else {
        // 1-bit black and white
        if (invert) {
          gridRow.push({ char: NBSP, r: isWhite ? 0 : 255, g: isWhite ? 0 : 255, b: isWhite ? 0 : 255 })
        } else {
          gridRow.push({ char: NBSP, r: isWhite ? 255 : 0, g: isWhite ? 255 : 0, b: isWhite ? 255 : 0 })
        }
      }
    }
    grid.push(gridRow)
  }

  return grid
}
