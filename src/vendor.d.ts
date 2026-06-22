interface HTMLVideoElement {
  captureStream(fps?: number): MediaStream
}

interface HTMLCanvasElement {
  captureStream(fps?: number): MediaStream
}

declare module 'opentype.js' {
  interface Path {
    toSVG(decimalPlaces?: number): string
    toPathData(decimalPlaces?: number): string
  }

  interface Font {
    getPath(text: string, x: number, y: number, fontSize: number): Path
    getAdvanceWidth(text: string, fontSize: number): number
    unitsPerEm: number
  }

  export function load(url: string): Promise<Font>
  export function parse(buffer: ArrayBuffer): Font
}

declare module 'gif.js' {
  interface GIFOptions {
    workers?: number
    quality?: number
    width?: number
    height?: number
    workerScript?: string
    background?: string
    repeat?: number
    transparent?: string | null
  }

  interface GIFFrameOptions {
    copy?: boolean
    delay?: number
  }

  class GIF {
    constructor(options: GIFOptions)
    addFrame(element: HTMLCanvasElement | HTMLImageElement | CanvasRenderingContext2D, options?: GIFFrameOptions): void
    on(event: 'progress', callback: (progress: number) => void): void
    on(event: 'finished', callback: (blob: Blob) => void): void
    render(): void
    abort(): void
  }

  export default GIF
}
