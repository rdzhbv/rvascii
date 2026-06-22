interface HTMLVideoElement {
  captureStream(fps?: number): MediaStream
}

interface HTMLCanvasElement {
  captureStream(fps?: number): MediaStream
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
