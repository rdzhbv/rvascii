import type { AsciiConfig } from '../types'
import { isBlockEffect } from '../core/effects/registry'

function getSupportedMimeInfo(): { mime: string; ext: string } | null {
  const types: [string, string][] = [
    ['video/webm;codecs=vp9,opus', 'webm'],
    ['video/webm;codecs=vp8,opus', 'webm'],
    ['video/mp4;codecs=h264,aac', 'mp4'],
    ['video/webm', 'webm'],
    ['video/mp4', 'mp4'],
  ]
  for (const [mime, ext] of types) {
    if (MediaRecorder.isTypeSupported(mime)) return { mime, ext }
  }
  return null
}

function getASCIICharSize(fontSize: number): [number, number] {
  return [fontSize * 0.6, fontSize * 1.2]
}

function renderASCIIFrame(
  ctx: CanvasRenderingContext2D,
  imageData: ImageData,
  config: AsciiConfig,
  cols: number,
  rows: number,
  charW: number,
  charH: number,
  fontSize: number
): void {
  const { data, width, height } = imageData
  const xStep = width / cols
  const yStep = height / rows

  ctx.fillStyle = '#000'
  ctx.fillRect(0, 0, cols * charW, rows * charH)
  ctx.font = `${fontSize}px monospace`
  ctx.textBaseline = 'top'

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const sx = Math.min(Math.floor(c * xStep), width - 1)
      const sy = Math.min(Math.floor(r * yStep), height - 1)
      const idx = (sy * width + sx) * 4
      const pr = data[idx]
      const pg = data[idx + 1]
      const pb = data[idx + 2]
      const lum = (0.299 * pr + 0.587 * pg + 0.114 * pb) / 255
      let l = Math.max(0, Math.min(1, lum * config.brightness))

      if (config.contrast !== 1) {
        const factor = (259 * (config.contrast * 127 + 127)) / (255 * (259 - (config.contrast * 127 + 127)))
        l = Math.max(0, Math.min(1, factor * (l - 0.128) + 0.128))
      }

      const cl = config.charset.length
      let ci = config.invert
        ? Math.round((1 - l) * (cl - 1))
        : Math.round(l * (cl - 1))
      ci = Math.max(0, Math.min(cl - 1, ci))
      const char = config.charset[ci] || ' '

      if (config.colorEnabled) {
        ctx.fillStyle = `rgb(${pr},${pg},${pb})`
      } else {
        const v = Math.round(l * 255)
        ctx.fillStyle = `rgb(${v},${v},${v})`
      }
      ctx.fillText(char, c * charW, r * charH)
    }
  }
}

function renderBitmapFrame(
  ctx: CanvasRenderingContext2D,
  imageData: ImageData,
  config: AsciiConfig,
  cols: number,
  rows: number,
  blockSize: number
): void {
  const { data, width, height } = imageData
  const xStep = width / cols
  const yStep = height / rows
  const outW = Math.round(cols * blockSize)
  const outH = Math.round(rows * blockSize)

  ctx.fillStyle = '#000'
  ctx.fillRect(0, 0, outW, outH)

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const sx = Math.min(Math.floor(c * xStep), width - 1)
      const sy = Math.min(Math.floor(r * yStep), height - 1)
      const idx = (sy * width + sx) * 4
      const pr = data[idx]
      const pg = data[idx + 1]
      const pb = data[idx + 2]
      const lum = (0.299 * pr + 0.587 * pg + 0.114 * pb) / 255
      let l = Math.max(0, Math.min(1, lum * config.brightness))

      if (config.contrast !== 1) {
        const factor = (259 * (config.contrast * 127 + 127)) / (255 * (259 - (config.contrast * 127 + 127)))
        l = Math.max(0, Math.min(1, factor * (l - 0.128) + 0.128))
      }

      if (config.colorEnabled) {
        ctx.fillStyle = `rgb(${pr},${pg},${pb})`
      } else {
        const v = Math.round(l * 255)
        ctx.fillStyle = `rgb(${v},${v},${v})`
      }
      ctx.fillRect(c * blockSize, r * blockSize, blockSize, blockSize)
    }
  }
}

export async function exportMP4(
  sourceUrl: string,
  config: AsciiConfig,
  fontSize: number,
  fps: number,
  onProgress?: (current: number, total: number) => void
): Promise<{ blob: Blob; ext: string } | null> {
  const mimeInfo = getSupportedMimeInfo()
  if (!mimeInfo) return null

  const video = document.createElement('video')
  video.muted = false
  video.playsInline = true
  video.src = sourceUrl
  video.load()

  await new Promise<void>((resolve, reject) => {
    const onMeta = () => {
      video.removeEventListener('loadedmetadata', onMeta)
      video.removeEventListener('error', onError)
      resolve()
    }
    const onError = () => {
      video.removeEventListener('loadedmetadata', onMeta)
      video.removeEventListener('error', onError)
      reject(new Error('Failed to load video for export'))
    }
    video.addEventListener('loadedmetadata', onMeta)
    video.addEventListener('error', onError)
  })

  const vw = video.videoWidth
  const vh = video.videoHeight
  const aspect = vw / vh
  const targetCols = Math.max(20, Math.round(100 * config.density * (aspect > 1 ? aspect : 1)))
  const targetRows = Math.max(10, Math.round(targetCols / aspect * 0.55))
  const block = isBlockEffect(config.effect)
  const blockSize = fontSize
  const [charW, charH] = getASCIICharSize(fontSize)
  const outW = block ? Math.round(targetCols * blockSize) : Math.round(targetCols * charW)
  const outH = block ? Math.round(targetRows * blockSize) : Math.round(targetRows * charH)

  const canvas = document.createElement('canvas')
  canvas.width = outW
  canvas.height = outH
  const ctx = canvas.getContext('2d')!

  const videoStream = video.captureStream(fps)
  const audioTrack = videoStream.getAudioTracks()[0]

  const canvasStream = canvas.captureStream(fps)
  const videoTrack = canvasStream.getVideoTracks()[0]

  const tracks: MediaStreamTrack[] = [videoTrack]
  if (audioTrack) tracks.push(audioTrack)

  const combinedStream = new MediaStream(tracks)
  const recorder = new MediaRecorder(combinedStream, { mimeType: mimeInfo.mime })
  const chunks: Blob[] = []

  return new Promise((resolve) => {
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data)
    }
    recorder.onstop = () => {
      videoTrack.stop()
      audioTrack?.stop()
      canvasStream.getTracks().forEach((t: MediaStreamTrack) => t.stop())
      videoStream.getTracks().forEach((t: MediaStreamTrack) => t.stop())
      video.remove()
      const blob = new Blob(chunks, { type: mimeInfo.mime })
      resolve({ blob, ext: mimeInfo.ext })
    }

    const captureCanvas = document.createElement('canvas')
    captureCanvas.width = vw
    captureCanvas.height = vh
    const captureCtx = captureCanvas.getContext('2d')!

    recorder.start()
    video.play()

    let frameCount = 0
    const totalFrames = Math.ceil(video.duration * fps)

    function tick() {
      if (video.ended || video.paused) {
        recorder.stop()
        return
      }

      if (video.readyState >= 2) {
        captureCtx.drawImage(video, 0, 0)
        const imageData = captureCtx.getImageData(0, 0, vw, vh)
        if (block) {
          renderBitmapFrame(ctx, imageData, config, targetCols, targetRows, blockSize)
        } else {
          renderASCIIFrame(ctx, imageData, config, targetCols, targetRows, charW, charH, fontSize)
        }
        frameCount++
        onProgress?.(frameCount, totalFrames)
      }

      requestAnimationFrame(tick)
    }

    requestAnimationFrame(tick)
  })
}
