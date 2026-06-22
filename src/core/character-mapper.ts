export function luminanceToChar(
  luminance: number,
  charset: string,
  invert: boolean = false
): string {
  const len = charset.length
  if (len === 0) return ' '
  let idx: number
  if (invert) {
    idx = Math.round((1 - luminance) * (len - 1))
  } else {
    idx = Math.round(luminance * (len - 1))
  }
  idx = Math.max(0, Math.min(len - 1, idx))
  return charset[idx]
}

export function charWidth(): number {
  return 1
}

export function charHeight(fontSize: number): number {
  return fontSize * 1.2
}
