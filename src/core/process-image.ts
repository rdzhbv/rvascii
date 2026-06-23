import type { AsciiConfig, AsciiGrid } from '../types'
import { getEffectProcessor } from './effects/registry'

/**
 * Dispatches to the appropriate effect processor based on config.effect.
 * This is the single entry point for all image-to-grid conversions.
 */
export function convertImageData(
  imageData: ImageData,
  config: AsciiConfig
): AsciiGrid {
  return getEffectProcessor(config.effect)(imageData, config)
}
