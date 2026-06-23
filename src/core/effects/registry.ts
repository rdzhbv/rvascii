import type { AsciiConfig, AsciiGrid, EffectDefinition, EffectType } from '../../types'
import { convertToAscii } from '../ascii-converter'
import { convertToBitmap } from '../bitmap-converter'
import { processEdgeDetect } from './edge-detect'
import { processSilhouette } from './silhouette'
import { processDither } from './dither'
import { processHalftone } from './halftone'
import { processWave } from './wave'
import { processOilPaint } from './oil-paint'

export type EffectProcessor = (imageData: ImageData, config: AsciiConfig) => AsciiGrid

export interface RegisteredEffect {
  definition: EffectDefinition
  process: EffectProcessor
}

export const EFFECT_REGISTRY: Record<EffectType, RegisteredEffect> = {
  'ascii': {
    definition: {
      id: 'ascii',
      name: 'ASCII',
      description: 'Classic text-based art with configurable character sets',
      renderMode: 'text',
      hasCharset: true,
      hasInvert: true,
    },
    process: convertToAscii,
  },
  'bitmap': {
    definition: {
      id: 'bitmap',
      name: 'Bitmap',
      description: '1-bit black & white dithering — 16 dither modes for retro pixel aesthetics',
      renderMode: 'block',
      hasCharset: false,
      hasInvert: true,
    },
    process: convertToBitmap,
  },
  'edge-detect': {
    definition: {
      id: 'edge-detect',
      name: 'Edge Detect',
      description: 'Sobel edge detection — outlines only',
      renderMode: 'text',
      hasCharset: false,
      hasInvert: false,
    },
    process: processEdgeDetect,
  },
  'silhouette': {
    definition: {
      id: 'silhouette',
      name: 'Silhouette',
      description: 'High-contrast binary threshold — black and white',
      renderMode: 'block',
      hasCharset: false,
      hasInvert: false,
    },
    process: processSilhouette,
  },
  'dither': {
    definition: {
      id: 'dither',
      name: 'Dither',
      description: 'Floyd-Steinberg error diffusion dithering',
      renderMode: 'block',
      hasCharset: false,
      hasInvert: false,
    },
    process: processDither,
  },
  'halftone': {
    definition: {
      id: 'halftone',
      name: 'Halftone',
      description: 'Offset printing dot pattern simulation',
      renderMode: 'text',
      hasCharset: false,
      hasInvert: false,
    },
    process: processHalftone,
  },
  'wave': {
    definition: {
      id: 'wave',
      name: 'Wave',
      description: 'Sinusoidal wave distortion of the image',
      renderMode: 'block',
      hasCharset: false,
      hasInvert: false,
    },
    process: processWave,
  },
  'oil-paint': {
    definition: {
      id: 'oil-paint',
      name: 'Oil Paint',
      description: 'Oil painting effect — color blobs and smears',
      renderMode: 'block',
      hasCharset: false,
      hasInvert: false,
    },
    process: processOilPaint,
  },
}

export function getEffectDefinition(effect: EffectType): EffectDefinition {
  return EFFECT_REGISTRY[effect]?.definition ?? EFFECT_REGISTRY['ascii'].definition
}

export function getEffectProcessor(effect: EffectType): EffectProcessor {
  return EFFECT_REGISTRY[effect]?.process ?? EFFECT_REGISTRY['ascii'].process
}

/** Convenience helper for exporters: returns true if effect renders as colored blocks */
export function isBlockEffect(effect: EffectType): boolean {
  return getEffectDefinition(effect).renderMode === 'block'
}
