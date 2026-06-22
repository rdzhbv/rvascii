import { convertImageData } from '../core/ascii-converter'
import type { AsciiConfig, AsciiGrid } from '../types'

export class VideoProcessor {
  private video: HTMLVideoElement | null = null
  private canvas: HTMLCanvasElement
  private ctx: CanvasRenderingContext2D | null
  private animFrameId: number | null = null
  private onFrame: ((grid: AsciiGrid) => void) | null = null
  private config: AsciiConfig
  private _isPlaying = false
  private recordedFrames: AsciiGrid[] = []
  private isRecording = false
  private sourceUrl: string | null = null

  constructor(config: AsciiConfig) {
    this.canvas = document.createElement('canvas')
    this.ctx = this.canvas.getContext('2d')
    this.config = config
  }

  get isPlaying(): boolean {
    return this._isPlaying
  }

  get videoElement(): HTMLVideoElement | null {
    return this.video
  }

  get sourceURL(): string | null {
    return this.sourceUrl
  }

  loadVideo(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      this.video = document.createElement('video')
      this.video.muted = true
      this.video.playsInline = true
      this.video.loop = true
      this.sourceUrl = URL.createObjectURL(file)
      this.video.src = this.sourceUrl
      this.video.addEventListener('loadedmetadata', () => {
        this.canvas.width = this.video!.videoWidth
        this.canvas.height = this.video!.videoHeight
      })
      this.video.addEventListener('seeked', () => {
        resolve(this.sourceUrl!)
      }, { once: true })
      this.video.addEventListener('error', () => reject(new Error('Failed to load video')))
      this.video.addEventListener('ended', () => {
        if (this.video) this.video.currentTime = 0
      })
      this.video.load()
    })
  }

  setOnFrame(cb: (grid: AsciiGrid) => void): void {
    this.onFrame = cb
  }

  updateConfig(config: AsciiConfig): void {
    this.config = config
  }

  play(): void {
    if (!this.video || this._isPlaying) return
    this._isPlaying = true
    this.video.play()
    this.processLoop()
  }

  pause(): void {
    if (!this._isPlaying) return
    this._isPlaying = false
    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId)
      this.animFrameId = null
    }
    this.video?.pause()
  }

  seekTo(time: number): void {
    if (!this.video) return
    this.video.currentTime = time
  }

  async seekAndCapture(time: number): Promise<AsciiGrid | null> {
    if (!this.video || !this.ctx) return null
    this.video.currentTime = time
    return new Promise((resolve) => {
      const onSeeked = () => {
        this.video!.removeEventListener('seeked', onSeeked)
        if (!this.video || !this.ctx) { resolve(null); return }
        this.ctx.drawImage(this.video, 0, 0)
        const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height)
        resolve(convertImageData(imageData, this.config))
      }
      this.video!.addEventListener('seeked', onSeeked)
    })
  }

  captureCurrentFrame(): AsciiGrid | null {
    if (!this.video || !this.ctx) return null
    this.ctx.drawImage(this.video, 0, 0)
    const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height)
    return convertImageData(imageData, this.config)
  }

  startRecording(fps: number = 10): void {
    this.recordedFrames = []
    this.isRecording = true
  }

  stopRecording(): AsciiGrid[] {
    this.isRecording = false
    const frames = [...this.recordedFrames]
    this.recordedFrames = []
    return frames
  }

  async getAllFrames(fps: number): Promise<AsciiGrid[]> {
    if (!this.video || !this.ctx) return []

    this.pause()
    this.video.pause()

    const duration = this.video.duration
    if (!duration || !isFinite(duration) || duration <= 0) return []

    const totalFrames = Math.ceil(duration * fps)
    const frameInterval = 1 / fps
    const frames: AsciiGrid[] = []

    for (let i = 0; i < totalFrames; i++) {
      const time = Math.min(i * frameInterval, duration - 0.001)
      this.video.currentTime = time

      await new Promise<void>((resolve) => {
        const onSeeked = () => {
          this.video!.removeEventListener('seeked', onSeeked)
          resolve()
        }
        this.video!.addEventListener('seeked', onSeeked)
      })

      this.ctx!.drawImage(this.video, 0, 0)
      const imageData = this.ctx!.getImageData(0, 0, this.canvas.width, this.canvas.height)
      frames.push(convertImageData(imageData, this.config))
    }

    return frames
  }

  private processLoop(): void {
    if (!this._isPlaying || !this.video || !this.ctx) return

    if (!this.video.paused && !this.video.ended) {
      this.ctx.drawImage(this.video, 0, 0)
      const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height)
      const grid = convertImageData(imageData, this.config)

      if (this.isRecording) {
        this.recordedFrames.push(grid)
      }

      this.onFrame?.(grid)
    }

    this.animFrameId = requestAnimationFrame(() => this.processLoop())
  }

  destroy(): void {
    this.pause()
    this.video = null
    this.onFrame = null
    if (this.sourceUrl) {
      URL.revokeObjectURL(this.sourceUrl)
      this.sourceUrl = null
    }
  }
}
