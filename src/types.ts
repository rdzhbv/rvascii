export interface AsciiConfig {
  charset: string
  charsetId: string
  density: number
  invert: boolean
  contrast: number
  brightness: number
  colorEnabled: boolean
  colorFilterId: string
  fontScale: number
}

export interface AsciiCell {
  char: string
  r: number
  g: number
  b: number
}

export type AsciiGrid = AsciiCell[][]

export type ExportFormat = 'png' | 'svg' | 'jpg' | 'gif' | 'mp4'

export interface CameraResolution {
  label: string
  width: number
  height: number
}

export const CAMERA_PRESETS: CameraResolution[] = [
  { label: '1920 × 1080', width: 1920, height: 1080 },
  { label: '1280 × 720', width: 1280, height: 720 },
  { label: '640 × 480', width: 640, height: 480 },
  { label: '320 × 240', width: 320, height: 240 },
]

export interface VideoExportState {
  processing: boolean
  progress: number
  totalFrames: number
  currentFrame: number
  cancel: boolean
}

export interface CharsetEntry {
  id: string
  name: string
  chars: string
}

export const CHARSET_PRESETS: CharsetEntry[] = [
  { id: 'classic',    name: 'Classic',            chars: '@%#*+=-:. ' },
  { id: 'extended',   name: 'Extended',           chars: '$@B%8&WM#*oahkbdpqwmZO0QLCJUYXzcvunxrjft/\\|()1{}[]?-_+~<>i!lI;:,"^`\'. ' },
  { id: 'dense',      name: 'Dense',              chars: ' .:;+=xX$#@█' },
  { id: 'minimal',    name: 'Minimal',            chars: ' .:-=+#@' },
  { id: 'binary',     name: 'Binary  ',            chars: ' █' },
  { id: 'blocks',     name: 'Blocks',             chars: ' ░▒▓█▄▀▐▌' },
  { id: 'blocks-ext', name: 'Blocks Extended',    chars: ' ▖▗▘▙▚▛▜▝▞▟░▒▓█' },
  { id: 'gradient',   name: 'Gradient',           chars: ' ░▒▓█' },
  { id: 'shade',      name: 'Shade',              chars: ' ░▒▓█▇▆▅▄▃▂▁' },
  { id: 'dots',       name: 'Dots',               chars: ' ⋅∘∙●◉◎◆✦★' },
  { id: 'stars',      name: 'Stars',              chars: ' ·✧✦✩✨★✶✳✸' },
  { id: 'braille',    name: 'Braille',            chars: ' ⠁⠂⠃⠄⠅⠆⠇⠈⠉⠊⠋⠌⠍⠎⠏⠐⠑⠒⠓⠔⠕⠖⠗⠘⠙⠚⠛⠜⠝⠞⠟⠿' },
  { id: 'katakana',   name: 'Katakana',           chars: ' ｡｢｣､･ｦｧｨｩｪｫｬｭｮｯｰｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃ' },
  { id: 'greek',      name: 'Greek',              chars: ' αβγδεζηθικλμνξπρστφχψω' },
  { id: 'runes',      name: 'Runes',              chars: ' ᚠᚢᚦᚨᚱᚲᚷᚹᚺᚾᛁᛃᛇᛈᛉᛊᛏᛒᛖᛗᛚᛝᛟᛞᛡᛣ' },
  { id: 'box',        name: 'Box Drawing',        chars: ' ─│┌┐└┘├┤┬┴┼═║╔╗╚╝╠╣╦╩╬' },
  { id: 'math',       name: 'Math Symbols',       chars: ' ·∘∙°±×÷≈≠≡≤≥∞∫∑√∏∂∆Ω' },
  { id: 'circtuit',   name: 'Circuit',            chars: ' .·─│┌┐└┘┼○●□■△▲≡' },
  { id: 'music',      name: 'Music',              chars: ' ♪♫♬♩♭♮♯○●' },
  { id: 'arrows',     name: 'Arrows',             chars: ' ←↑→↓↔↕↖↗↘↙↩↪↻➡' },
  { id: 'halffill',   name: 'Half Fill',          chars: ' ◔◑◕◐◒◓◖◗◙' },
  { id: 'hatch',      name: 'Crosshatch',         chars: ' ▣▤▥▦▧▨▩' },
]

export const CHARSET_MAP: Record<string, string> = {}
for (const e of CHARSET_PRESETS) {
  CHARSET_MAP[e.id] = e.chars
}

// ── Color Filters ─────────────────────────────────────

export interface ColorFilterEntry {
  id: string
  name: string
  type: 'source' | 'palette' | 'monochrome' | 'duotone' | 'invert'
  colors: [number, number, number][]
}

export const COLOR_FILTERS: ColorFilterEntry[] = [
  { id: 'source',     name: 'Original',         type: 'source',    colors: [] },
  { id: 'invert',     name: 'Invert',           type: 'invert',    colors: [] },
  { id: 'grayscale',  name: 'Grayscale',        type: 'monochrome', colors: [] },
  { id: 'neon',       name: 'Neon',             type: 'palette',   colors: [[255,0,102],[0,255,153],[102,0,255],[255,255,0],[0,204,255]] },
  { id: 'pastel',     name: 'Pastel',           type: 'palette',   colors: [[255,179,186],[255,223,186],[255,255,186],[186,255,201],[186,225,255]] },
  { id: 'cyberpunk',  name: 'Cyberpunk',        type: 'palette',   colors: [[255,0,60],[0,255,200],[180,0,255],[255,200,0]] },
  { id: 'vaporwave',  name: 'Vaporwave',        type: 'palette',   colors: [[255,113,206],[1,205,254],[185,103,255],[5,255,161]] },
  { id: 'monogreen',  name: 'Mono Green',       type: 'monochrome', colors: [[0,40,0],[0,80,0],[0,140,0],[0,200,0],[0,255,0]] },
  { id: 'monoamber',  name: 'Mono Amber',       type: 'monochrome', colors: [[40,20,0],[80,50,0],[140,90,0],[200,140,0],[255,191,0]] },
  { id: 'monoblue',   name: 'Mono Blue',        type: 'monochrome', colors: [[10,10,50],[20,30,120],[30,60,200],[50,100,240],[80,160,255]] },
  { id: 'fire',       name: 'Fire',             type: 'palette',   colors: [[80,0,0],[140,10,10],[200,20,20],[255,50,30],[255,100,80]] },
  { id: 'ice',        name: 'Ice',              type: 'palette',   colors: [[200,230,255],[150,200,240],[100,170,230],[60,130,210],[30,80,180]] },
  { id: 'forest',     name: 'Forest',           type: 'palette',   colors: [[10,30,10],[20,60,15],[30,100,20],[50,150,30],[80,200,50]] },
  { id: 'sepia',      name: 'Sepia',            type: 'palette',   colors: [[50,30,10],[100,65,20],[160,105,40],[210,150,80],[245,210,150]] },
  { id: 'retro',      name: 'Retro Arcade',     type: 'palette',   colors: [[0,0,0],[255,0,0],[0,255,0],[0,0,255],[255,255,0],[255,0,255],[0,255,255]] },
  { id: 'sunset',     name: 'Sunset',           type: 'palette',   colors: [[50,10,30],[120,20,60],[200,60,30],[255,140,20],[255,210,100]] },
]

export const DEFAULT_CONFIG: AsciiConfig = {
  charset: CHARSET_PRESETS[0].chars,
  charsetId: 'classic',
  density: 1,
  invert: false,
  contrast: 1,
  brightness: 1,
  colorEnabled: false,
  colorFilterId: 'source',
  fontScale: 1,
}
