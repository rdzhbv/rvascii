import { convertImageData } from '../core/ascii-converter'
import type { AsciiConfig, AsciiGrid, CameraResolution } from '../types'
import { CAMERA_PRESETS } from '../types'

export class CameraController {
  private stream: MediaStream | null = null
  private video: HTMLVideoElement | null = null
  private canvas: HTMLCanvasElement
  private ctx: CanvasRenderingContext2D | null
  private frameId: number | null = null
  private onFrame: ((grid: AsciiGrid) => void) | null = null
  private config: AsciiConfig
  private _activeResolution: CameraResolution | null = null

  constructor(config: AsciiConfig) {
    this.canvas = document.createElement('canvas')
    this.ctx = this.canvas.getContext('2d')
    this.config = config
  }

  get activeResolution(): CameraResolution | null {
    return this._activeResolution
  }

  get isActive(): boolean {
    return this.stream !== null
  }

  updateConfig(config: AsciiConfig): void {
    this.config = config
  }

  setOnFrame(cb: (grid: AsciiGrid) => void): void {
    this.onFrame = cb
  }

  async checkAvailableResolutions(): Promise<CameraResolution[]> {
    const available: CameraResolution[] = []

    for (const preset of CAMERA_PRESETS) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { exact: preset.width },
            height: { exact: preset.height },
          },
        })
        stream.getTracks().forEach((t) => t.stop())
        available.push(preset)
      } catch {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({
            video: {
              width: { ideal: preset.width },
              height: { ideal: preset.height },
            },
          })
          const track = stream.getVideoTracks()[0]
          const settings = track.getSettings()
          track.stop()
          if (settings.width && settings.height) {
            available.push({
              label: `${settings.width} × ${settings.height}`,
              width: settings.width,
              height: settings.height,
            })
          }
        } catch {
          // skip unavailable preset
        }
      }
    }

    return available
  }

  async start(resolution: CameraResolution): Promise<void> {
    this.stop()

    this.stream = await navigator.mediaDevices.getUserMedia({
      video: {
        width: { exact: resolution.width },
        height: { exact: resolution.height },
      },
    })

    this._activeResolution = resolution

    this.video = document.createElement('video')
    this.video.srcObject = this.stream
    this.video.playsInline = true
    this.video.muted = true
    await this.video.play()

    this.canvas.width = resolution.width
    this.canvas.height = resolution.height
  }

  stop(): void {
    this.stopPreview()
    if (this.stream) {
      this.stream.getTracks().forEach((t) => t.stop())
      this.stream = null
    }
    if (this.video) {
      this.video.srcObject = null
      this.video = null
    }
    this._activeResolution = null
  }

  startPreview(): void {
    this.stopPreview()
    this.loop()
  }

  private loop(): void {
    if (!this.video || !this.ctx || !this.stream) return
    if (this.video.readyState >= 2) {
      this.ctx.drawImage(this.video, 0, 0)
      const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height)
      const grid = convertImageData(imageData, this.config)
      this.onFrame?.(grid)
    }
    this.frameId = requestAnimationFrame(() => this.loop())
  }

  stopPreview(): void {
    if (this.frameId !== null) {
      cancelAnimationFrame(this.frameId)
      this.frameId = null
    }
  }

  captureFrame(): AsciiGrid | null {
    if (!this.video || !this.ctx || !this.stream) return null
    if (this.video.readyState >= 2) {
      this.ctx.drawImage(this.video, 0, 0)
      const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height)
      return convertImageData(imageData, this.config)
    }
    return null
  }
}
