import { DEFAULT_CONFIG, type AsciiConfig, type CameraResolution, type ExportFormat, type EffectType } from './types'
import { convertImageData } from './core/process-image'
import { getImageData } from './core/pixel-processor'
import { renderGrid, clearPreview } from './ui/preview'
import { createControlsUI } from './ui/controls'
import { VideoPlayerUI, type VideoPlayerCallbacks } from './ui/video-player'
import { VideoProcessor } from './video/video-processor'
import { CameraController } from './camera/camera-controller'
import { exportPNG } from './export/png-exporter'
import { exportSVG } from './export/svg-exporter'
import { exportJPG } from './export/jpg-exporter'
import './style.css'

class App {
  private config: AsciiConfig = { ...DEFAULT_CONFIG }
  private previewEl: HTMLElement
  private controlsEl: HTMLElement
  private controls: ReturnType<typeof createControlsUI> | null = null
  private currentGrid: import('./types').AsciiGrid | null = null
  private videoProcessor: VideoProcessor | null = null
  private videoPlayer: VideoPlayerUI | null = null
  private cameraController: CameraController | null = null
  private isVideoMode = false
  private isCameraMode = false
  private currentFile: File | null = null
  private statusEl: HTMLElement
  private videoPlayerEl: HTMLElement
  private lastImageData: ImageData | null = null

  constructor() {
    const app = document.getElementById('app')!
    app.innerHTML = `
      <div class="app-layout">
        <div class="sidebar" id="sidebar">
          <div class="logo">
            <div class="logo-icon">R</div>
            <span class="logo-text">RVASCII</span>
            <span class="logo-badge">v2</span>
          </div>
          <div class="controls" id="controls"></div>
        </div>
        <div class="resize-handle" id="resize-handle"></div>
        <div class="main-area">
          <div class="preview" id="preview"></div>
          <div class="video-player" id="video-player"></div>
          <div class="status" id="status"></div>
        </div>
      </div>
    `

    this.initResizableSidebar()

    this.previewEl = document.getElementById('preview')!
    this.controlsEl = document.getElementById('controls')!
    this.videoPlayerEl = document.getElementById('video-player')!
    this.statusEl = document.getElementById('status')!

    this.controls = createControlsUI(this.controlsEl, this.config, {
      onFileLoad: (file) => this.handleFile(file),
      onConfigChange: (partial) => this.updateConfig(partial),
      onExport: (format) => this.handleExport(format),
      onCameraToggle: () => this.toggleCamera(),
      onCameraResolutionChange: (res) => this.changeCameraResolution(res),
      onClear: () => this.handleClear(),
    })

    const playerCallbacks: VideoPlayerCallbacks = {
      onPlayPause: () => this.togglePlayPause(),
      onSeek: (time) => this.seekVideo(time),
    }
    this.videoPlayer = new VideoPlayerUI(this.videoPlayerEl, playerCallbacks)

    this.initDragDrop()

    clearPreview(this.previewEl)
    this.setStatus('Drop an image or video to begin')
  }

  private initDragDrop(): void {
    const area = document.querySelector('.main-area')!
    const prevent = (e: Event) => { e.preventDefault(); e.stopPropagation() }

    area.addEventListener('dragenter', (e) => {
      prevent(e)
      area.classList.add('drag-over')
    })
    area.addEventListener('dragover', (e) => {
      prevent(e)
      area.classList.add('drag-over')
    })
    area.addEventListener('dragleave', (e) => {
      prevent(e)
      area.classList.remove('drag-over')
    })
    area.addEventListener('drop', (e: Event) => {
      prevent(e)
      area.classList.remove('drag-over')
      const de = e as DragEvent
      const file = de.dataTransfer?.files?.[0]
      if (file && (file.type.startsWith('image/') || file.type.startsWith('video/'))) {
        this.handleFile(file)
        // Sync the file input and update drop zone text
        const fileInput = document.querySelector<HTMLInputElement>('.file-drop-area input[type="file"]')
        if (fileInput) {
          const dt = new DataTransfer()
          dt.items.add(file)
          fileInput.files = dt.files
        }
        const textEl = document.querySelector<HTMLElement>('.file-drop-area .file-text')
        if (textEl) textEl.textContent = file.name
      }
    })
  }

  private setStatus(msg: string, isExporting = false): void {
    this.statusEl.textContent = msg
    this.statusEl.classList.toggle('status-exporting', isExporting)
  }

  private initResizableSidebar(): void {
    const sidebar = document.getElementById('sidebar')!
    const handle = document.getElementById('resize-handle')!
    let isDragging = false

    const onMove = (e: MouseEvent) => {
      if (!isDragging) return
      const w = Math.max(180, Math.min(480, e.clientX))
      sidebar.style.width = w + 'px'
    }

    const onUp = () => {
      isDragging = false
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
    }

    handle.addEventListener('mousedown', (e) => {
      e.preventDefault()
      isDragging = true
      document.body.style.cursor = 'col-resize'
      document.body.style.userSelect = 'none'
      document.addEventListener('mousemove', onMove)
      document.addEventListener('mouseup', onUp)
    })
  }

  private handleFile(file: File): void {
    this.stopCamera()
    this.currentFile = file
    this.isVideoMode = file.type.startsWith('video/')
    this.controls?.setExportEnabled(false)
    this.videoPlayer?.hide()

    if (this.isVideoMode) {
      this.loadVideo(file)
    } else {
      this.loadImage(file)
    }
  }

  private loadImage(file: File): void {
    const reader = new FileReader()
    reader.onload = () => {
      const img = new Image()
      img.onload = () => {
        const imageData = getImageData(img)
        if (!imageData) {
          this.setStatus('Failed to process image')
          return
        }
        this.convertAndRender(imageData)
      }
      img.src = reader.result as string
    }
    reader.readAsDataURL(file)
    this.setStatus('Processing image...')
  }

  private loadVideo(file: File): void {
    this.videoProcessor?.destroy()
    this.videoProcessor = new VideoProcessor(this.config)
    this.videoPlayer?.show()

    this.videoProcessor.loadVideo(file).then(() => {
      const vp = this.videoProcessor!

      vp.setOnFrame((grid) => {
        this.currentGrid = grid
        const fontSize = Math.max(4, Math.round(14 * this.config.fontScale))
        renderGrid(grid, this.previewEl, fontSize, this.config.effect)

        const video = vp.videoElement
        if (video) {
          this.videoPlayer?.setTime(video.currentTime, video.duration)
          this.videoPlayer?.setPlaying(!video.paused)
        }
      })

      vp.seekTo(0)
      const firstGrid = vp.captureCurrentFrame()
      if (firstGrid) {
        this.currentGrid = firstGrid
        const fontSize = Math.max(4, Math.round(14 * this.config.fontScale))
        renderGrid(this.currentGrid, this.previewEl, fontSize, this.config.effect)
      }

      const video = vp.videoElement
      if (video) {
        this.videoPlayer?.setDuration(video.duration)
        this.videoPlayer?.setTime(0, video.duration)
        this.videoPlayer?.setPlaying(false)
      }

      this.controls?.setExportEnabled(true)
      this.setStatus('Video loaded — use player controls')
    }).catch(() => {
      this.setStatus('Failed to load video')
    })
  }

  private togglePlayPause(): void {
    if (!this.videoProcessor) return
    if (this.videoProcessor.isPlaying) {
      this.videoProcessor.pause()
    } else {
      this.videoProcessor.play()
    }
  }

  private async seekVideo(time: number): Promise<void> {
    if (!this.videoProcessor) return
    const grid = await this.videoProcessor.seekAndCapture(time)
    if (grid) {
      this.currentGrid = grid
      const fontSize = Math.max(4, Math.round(14 * this.config.fontScale))
      renderGrid(grid, this.previewEl, fontSize, this.config.effect)
    }
  }

  // ── Camera ──────────────────────────────────────────────

  private async toggleCamera(): Promise<void> {
    if (this.isCameraMode) {
      this.stopCamera()
    } else {
      await this.startCamera()
    }
  }

  private async startCamera(): Promise<void> {
    try {
      this.controls?.setExportEnabled(false)
      this.videoProcessor?.pause()
      this.videoPlayer?.hide()

      this.cameraController = new CameraController(this.config)

      const resolutions = await this.cameraController.checkAvailableResolutions()
      if (resolutions.length === 0) {
        this.setStatus('No camera resolutions available')
        this.cameraController = null
        return
      }

      const best = resolutions[0]
      await this.cameraController.start(best)
      this.isCameraMode = true

      this.controls?.setCameraResolutions(resolutions)
      this.controls?.setCameraResolution(best)

      this.cameraController.setOnFrame((grid) => {
        this.currentGrid = grid
        const fontSize = Math.max(4, Math.round(14 * this.config.fontScale))
        renderGrid(grid, this.previewEl, fontSize, this.config.effect)
      })

      this.cameraController.startPreview()
      this.controls?.setCameraActive(true)
      this.controls?.setExportEnabled(true)
      this.setStatus(`Camera — ${best.label}`)
    } catch (e) {
      this.setStatus('Camera access denied or unavailable')
      this.controls?.setCameraActive(false)
    }
  }

  private stopCamera(): void {
    if (this.cameraController) {
      this.cameraController.stop()
      this.cameraController = null
    }
    this.isCameraMode = false
    this.controls?.setCameraActive(false)
    this.controls?.setExportEnabled(false)

    if (this.currentFile) {
      if (this.isVideoMode) {
        this.loadVideo(this.currentFile)
      } else {
        this.loadImage(this.currentFile)
      }
    } else {
      clearPreview(this.previewEl)
      this.setStatus('Drop an image or video to begin')
    }
  }

  private handleClear(): void {
    this.stopCamera()
    if (this.videoProcessor) {
      this.videoProcessor.destroy()
      this.videoProcessor = null
    }
    this.videoPlayer?.hide()
    this.currentFile = null
    this.currentGrid = null
    this.lastImageData = null
    this.isVideoMode = false
    this.isCameraMode = false
    this.controls?.setExportEnabled(false)
    clearPreview(this.previewEl)
    this.setStatus('Drop an image or video to begin')

    // Reset file input display
    const textEl = document.querySelector<HTMLElement>('.file-drop-area .file-text')
    if (textEl) textEl.textContent = 'Drop image or video here'
    const fileInput = document.querySelector<HTMLInputElement>('.file-drop-area input[type="file"]')
    if (fileInput) fileInput.value = ''
  }

  private async changeCameraResolution(res: CameraResolution): Promise<void> {
    if (!this.cameraController) return
    try {
      this.cameraController.stopPreview()
      await this.cameraController.start(res)
      this.cameraController.setOnFrame((grid) => {
        this.currentGrid = grid
        const fontSize = Math.max(4, Math.round(14 * this.config.fontScale))
        renderGrid(grid, this.previewEl, fontSize, this.config.effect)
      })
      this.cameraController.startPreview()
      this.controls?.setCameraResolution(res)
      this.setStatus(`Camera — ${res.label}`)
    } catch {
      this.setStatus(`Failed to switch to ${res.label}`)
    }
  }

  // ── Config & Export ─────────────────────────────────────

  private updateConfig(partial: Partial<AsciiConfig>): void {
    this.config = { ...this.config, ...partial }
    this.controls?.updateConfig(this.config)
    this.videoProcessor?.updateConfig(this.config)
    this.cameraController?.updateConfig(this.config)

    // Image mode — reconvert from saved pixels
    if (this.lastImageData) {
      this.convertAndRender(this.lastImageData)
      return
    }

    // Video mode paused — capture current frame and reconvert
    if (this.videoProcessor && this.isVideoMode && !this.videoProcessor.isPlaying) {
      const grid = this.videoProcessor.captureCurrentFrame()
      if (grid) {
        this.currentGrid = grid
        const fontSize = Math.max(4, Math.round(14 * this.config.fontScale))
        renderGrid(grid, this.previewEl, fontSize, this.config.effect)
      }
      return
    }

    // Camera paused — capture frame and reconvert
    if (this.cameraController && this.isCameraMode) {
      const grid = this.cameraController.captureFrame()
      if (grid) {
        this.currentGrid = grid
        const fontSize = Math.max(4, Math.round(14 * this.config.fontScale))
        renderGrid(grid, this.previewEl, fontSize, this.config.effect)
      }
      return
    }

    // Fallback: just re-render existing grid
    if (this.currentGrid && !this.isCameraMode) {
      const fontSize = Math.max(4, Math.round(14 * this.config.fontScale))
      renderGrid(this.currentGrid, this.previewEl, fontSize, this.config.effect)
    }
  }

  private convertAndRender(imageData: ImageData): void {
    this.lastImageData = imageData
    this.currentGrid = convertImageData(imageData, this.config)
    const fontSize = Math.max(4, Math.round(14 * this.config.fontScale))
    renderGrid(this.currentGrid, this.previewEl, fontSize, this.config.effect)
    this.controls?.setExportEnabled(true)
    this.setStatus(`Ready - ${this.currentGrid.length} rows x ${this.currentGrid[0].length} cols`)
  }

  private async handleExport(format: ExportFormat): Promise<void> {
    let blob: Blob | null = null
    let videoExt: string | null = null
    const fontSize = Math.max(4, Math.round(14 * this.config.fontScale))

    if (format === 'mp4' && this.videoProcessor && this.isVideoMode && !this.isCameraMode) {
      this.setStatus(`Recording ${this.config.effect} video with audio...`, true)
      this.controls?.setExportEnabled(false)
      const sourceUrl = this.videoProcessor.sourceURL
      if (!sourceUrl) {
        this.setStatus('Export failed: no video source')
        this.controls?.setExportEnabled(true)
        return
      }
      const { exportMP4 } = await import('./export/mp4-exporter')
      const result = await exportMP4(sourceUrl, this.config, fontSize, 24, (current, total) => {
        this.setStatus(`Recording: ${current}/${total} frames`, true)
      })
      if (result) {
        blob = result.blob
        videoExt = result.ext
      }
      this.controls?.setExportEnabled(true)
    } else if (format === 'gif' && this.videoProcessor && this.isVideoMode && !this.isCameraMode) {
      this.setStatus('Extracting video frames...', true)
      this.controls?.setExportEnabled(false)
      const frames = await this.videoProcessor.getAllFrames(10)
      if (frames.length === 0) {
        this.setStatus('No frames to export')
        this.controls?.setExportEnabled(true)
        return
      }
      this.setStatus(`Generating GIF (${frames.length} frames)...`, true)
      const { exportGIF } = await import('./export/gif-exporter')
      blob = await exportGIF(frames, fontSize, 100, this.config.effect, (current, total) => {
        this.setStatus(`Rendering GIF: ${current}/${total} frames`, true)
      })
      this.controls?.setExportEnabled(true)
    } else if (this.currentGrid) {
      const effect = this.config.effect
      switch (format) {
        case 'png':
          blob = await exportPNG(this.currentGrid, fontSize, effect)
          break
        case 'svg':
          blob = await exportSVG(this.currentGrid, fontSize, effect)
          break
        case 'jpg':
          blob = await exportJPG(this.currentGrid, fontSize, effect)
          break
      }
    }

    if (!blob) {
      this.setStatus('Export failed')
      return
    }

    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    const ext = format === 'jpg' ? 'jpg' : format === 'mp4' && videoExt ? videoExt : format
    a.download = `${this.config.effect}-art.${ext}`
    a.click()
    URL.revokeObjectURL(url)
    this.setStatus(`Exported as ${format.toUpperCase()}`, false)
  }
}

new App()
