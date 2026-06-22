export interface VideoPlayerCallbacks {
  onPlayPause: () => void
  onSeek: (time: number) => void
}

export class VideoPlayerUI {
  private container: HTMLElement
  private playBtn: HTMLButtonElement
  private seekBar: HTMLInputElement
  private currentTimeEl: HTMLSpanElement
  private durationEl: HTMLSpanElement
  private callbacks: VideoPlayerCallbacks
  private isSeeking = false
  private isVideoMode = false

  constructor(container: HTMLElement, callbacks: VideoPlayerCallbacks) {
    this.container = container
    this.callbacks = callbacks
    container.innerHTML = ''
    container.className = 'video-player'

    const left = document.createElement('div')
    left.className = 'vp-left'

    this.playBtn = document.createElement('button')
    this.playBtn.className = 'vp-btn vp-play-btn'
    this.playBtn.textContent = '▶'
    this.playBtn.addEventListener('click', () => this.callbacks.onPlayPause())
    left.appendChild(this.playBtn)

    this.currentTimeEl = document.createElement('span')
    this.currentTimeEl.className = 'vp-time'
    this.currentTimeEl.textContent = '0:00'
    left.appendChild(this.currentTimeEl)

    container.appendChild(left)

    this.seekBar = document.createElement('input')
    this.seekBar.type = 'range'
    this.seekBar.className = 'vp-seekbar'
    this.seekBar.min = '0'
    this.seekBar.max = '1'
    this.seekBar.step = '0.001'
    this.seekBar.value = '0'
    this.seekBar.addEventListener('input', () => {
      this.isSeeking = true
    })
    this.seekBar.addEventListener('change', () => {
      this.isSeeking = false
      const time = parseFloat(this.seekBar.value)
      this.callbacks.onSeek(time)
    })
    container.appendChild(this.seekBar)

    const right = document.createElement('div')
    right.className = 'vp-right'

    this.durationEl = document.createElement('span')
    this.durationEl.className = 'vp-time'
    this.durationEl.textContent = '0:00'
    right.appendChild(this.durationEl)

    container.appendChild(right)

    this.hide()
  }

  show(): void {
    this.isVideoMode = true
    this.container.style.display = 'flex'
  }

  hide(): void {
    this.isVideoMode = false
    this.container.style.display = 'none'
  }

  setPlaying(playing: boolean): void {
    this.playBtn.textContent = playing ? '⏸' : '▶'
  }

  setTime(current: number, duration: number): void {
    this.currentTimeEl.textContent = formatTime(current)
    this.durationEl.textContent = formatTime(duration)
    if (!this.isSeeking && isFinite(duration) && duration > 0) {
      this.seekBar.max = String(duration)
      this.seekBar.value = String(Math.min(current, duration))
    }
  }

  setDuration(duration: number): void {
    if (isFinite(duration) && duration > 0) {
      this.seekBar.max = String(duration)
    }
  }
}

function formatTime(seconds: number): string {
  if (!isFinite(seconds) || seconds < 0) return '0:00'
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}
