// ─── KÉO CO LIVE · sound.js ────────────────────────────────────────────────
// Âm thanh tổng hợp bằng WebAudio — không dùng file âm thanh nào.
// Tiếng kéo, bụp, té bùn, kèn thắng... đều vẽ bằng sóng dao động.
// Ngoại lệ: TIẾNG ĐÁNH (2026-11-22) dùng file MP3 thật (Pixabay Content
// License — dùng thương mại được, không cần ghi nguồn) vì tiếng vung kiếm
// + va chạm kim loại vẽ bằng sóng không giống. File trong public/sounds/,
// load lười (lazy) sau lần chạm đầu, hỏng thì về lại tiếng tổng hợp.

// ─── Tiếng đánh: file thật (Pixabay Content License) ───────────────────────
// Nguồn từng file (trang Pixabay, dùng thương mại được, không cần ghi nguồn):
// - sword_swing.mp3: "Real Swish 3" (304242) — tiếng vung kiếm/dao (whoosh)
//   https://pixabay.com/sound-effects/real-swish-3-304242/
// - sword_hit.mp3: "Sword Hit" (7160) — tiếng kiếm chạm đích (impact ngắn)
//   https://pixabay.com/sound-effects/sword-hit-7160/
// - punch_hit.mp3: "Punch" (140236) — tiếng đấm trúng, chỉ dùng cho quà to
//   https://pixabay.com/sound-effects/punch-140236/
// Cả 3 đều < 2s, tổng ~89 KB. File là nhị phân nên phải upload lên repo
// bằng GitHub web (push-files từ chối file nhị phân), giống GLB + webp.
export const ATTACK_SFX = {
  swing: '/sounds/sword_swing.mp3',
  hit: '/sounds/sword_hit.mp3',
  punch: '/sounds/punch_hit.mp3',
}
// Va chạm vang lên giữa animation đấm (~1/3 nhịp 1s — tay chạm đích).
export const ATTACK_SFX_HIT_DELAY_S = 0.3
// Chống chồng tiếng khi quà tới dồn dập: 1 tiếng đánh mỗi 250ms là đủ,
// quà tới nhanh hơn thì tiếng sau bị bỏ (animation vẫn đánh).
export const ATTACK_SFX_MIN_INTERVAL_MS = 250

// Thuần, test được bằng node: power → các lớp tiếng đánh.
// - Quà nhỏ/tim/follow/cmt: vung (ngay lúc bắt đầu đánh) + va chạm (+0,3s).
// - Quà to (>= 25 lực): thêm lớp đấm trúng cùng lúc va chạm cho nặng hơn.
// - celebrate (quà 100 xu): nhân vật đang ĂN MỪNG (Cheer) chứ không đấm
//   nên không vung kiếm — chỉ va chạm + đấm ngay lúc quà tới (quà đáp xuống).
export function attackSfxFor(power = 0, { celebrate = false } = {}) {
  const big = (power || 0) >= 25
  const files = []
  if (!celebrate) files.push({ key: 'swing', src: ATTACK_SFX.swing, delay: 0, vol: 0.9, fallback: 'pull' })
  files.push({ key: 'hit', src: ATTACK_SFX.hit, delay: celebrate ? 0 : ATTACK_SFX_HIT_DELAY_S, vol: 1, fallback: 'noise' })
  if (big) files.push({ key: 'punch', src: ATTACK_SFX.punch, delay: celebrate ? 0 : ATTACK_SFX_HIT_DELAY_S, vol: 0.9, fallback: null })
  return { big, celebrate, files }
}

export class SoundEngine {
  constructor() {
    this.ctx = null
    this.enabled = true
    this.master = null
    // File tiếng đánh: buffer đã giải mã (null = tải/giải mã lỗi).
    this.buffers = {}
    this._sfxState = {} // key -> 'ok' | 'failed'
    this._sfxPromises = {}
    this._lastAttackAt = 0
    // Đếm chẩn đoán (xem qua window.__nvnSfx ở headless): played = số lần
    // tiếng file thật đã phát, fallback = số lần về tiếng tổng hợp,
    // skippedSuspended = số lần bỏ vì chưa chạm màn hình (autoplay).
    this.sfx = { played: { swing: 0, hit: 0, punch: 0 }, fallback: 0, skippedSuspended: 0 }
  }

  // Tải + giải mã 1 file tiếng đánh (lười: chỉ tải khi sắp phát lần đầu,
  // hoặc khi preloadAttackSfx() gọi sau lần chạm đầu). Lỗi (file chưa
  // upload lên repo / mạng lỗi) thì trả null để về tiếng tổng hợp.
  _loadBuffer(key, src) {
    if (this._sfxPromises[key]) return this._sfxPromises[key]
    const p = (async () => {
      try {
        // Dùng ctx đã có (ensure() gọi trước ở _playLayer / preload) —
        // không gọi ensure() ở đây để tránh đệ quy (ensure gọi preload).
        const ctx = this.ctx
        if (!ctx) return null
        const res = await fetch(src)
        if (!res.ok) return null
        const ab = await res.arrayBuffer()
        const buf = await ctx.decodeAudioData(ab)
        this.buffers[key] = buf
        this._sfxState[key] = 'ok'
        return buf
      } catch { return null }
    })()
    p.then((buf) => { if (!buf) this._sfxState[key] = 'failed' })
    this._sfxPromises[key] = p
    return p
  }

  // Bắt đầu tải cả 3 file tiếng đánh (gọi sau lần chạm đầu để khỏi chặn
  // lần phát đầu tiên — gọi lại bao nhiêu lần cũng chỉ tải 1 lần).
  preloadAttackSfx() {
    if (typeof window === 'undefined') return
    for (const [key, src] of Object.entries(ATTACK_SFX)) this._loadBuffer(key, src)
  }

  // Phát 1 lớp tiếng file thật, hẹn giờ theo delay (giây). Chưa chạm màn
  // hình (AudioContext còn suspended — trình duyệt chặn autoplay) thì BỎ
  // tiếng này luôn thay vì dồn lại phát 1 lúc khi mở khóa. File lỗi thì
  // về tiếng tổng hợp (fallback) để game không bao giờ câm.
  _playLayer(key, src, delay = 0, vol = 1, fallback = null) {
    const ctx = this.ensure()
    if (!ctx) return
    if (ctx.state !== 'running') { this.sfx.skippedSuspended++; return }
    const playBuf = (buf) => {
      if (!buf || !this.enabled) return
      const t0 = ctx.currentTime + delay
      const srcNode = ctx.createBufferSource()
      srcNode.buffer = buf
      const g = ctx.createGain()
      g.gain.value = vol
      srcNode.connect(g).connect(this.master)
      srcNode.start(t0)
      this.sfx.played[key] = (this.sfx.played[key] || 0) + 1
    }
    if (this._sfxState[key] === 'ok' && this.buffers[key]) { playBuf(this.buffers[key]); return }
    if (this._sfxState[key] === 'failed') {
      this.sfx.fallback++
      if (fallback === 'pull') this.pull()
      else if (fallback === 'noise') this.noise({ dur: 0.15, vol: 0.3, lowpass: 1500 })
      return
    }
    this._loadBuffer(key, src).then((buf) => {
      if (buf) playBuf(buf)
      else {
        this.sfx.fallback++
        if (fallback === 'pull') this.pull()
        else if (fallback === 'noise') this.noise({ dur: 0.15, vol: 0.3, lowpass: 1500 })
      }
    })
  }

  // Tiếng đánh cho 1 cú tấn công (khớp animation: vung lúc bắt đầu, va
  // chạm giữa nhịp). nowMs truyền vào để test được; mặc định Date.now().
  // Trả false khi bị chống chồng (quà tới < 250ms sau cú trước) hoặc khi
  // đang tắt tiếng — animation vẫn đánh, chỉ không có tiếng.
  playAttack(power = 0, opts = {}, nowMs = Date.now()) {
    if (!this.enabled) return false
    if (nowMs - this._lastAttackAt < ATTACK_SFX_MIN_INTERVAL_MS) return false
    this._lastAttackAt = nowMs
    const plan = attackSfxFor(power, opts)
    for (const layer of plan.files) this._playLayer(layer.key, layer.src, layer.delay, layer.vol, layer.fallback)
    return true
  }

  ensure() {
    if (typeof window === 'undefined') return null
    if (!this.ctx) {
      try {
        const AC = window.AudioContext || window.webkitAudioContext
        if (!AC) return null
        this.ctx = new AC()
        this.master = this.ctx.createGain()
        this.master.gain.value = 0.35
        this.master.connect(this.ctx.destination)
      } catch { return null }
    }
    if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {})
    // Vừa mở khóa âm thanh: bắt đầu tải trước 3 file tiếng đánh để cú
    // đánh đầu tiên không phải chờ tải (tải lười, lỗi thì về tổng hợp).
    this.preloadAttackSfx()
    return this.ctx
  }

  tone({ freq = 440, freqEnd = null, dur = 0.15, type = 'sine', vol = 0.5, delay = 0 }) {
    if (!this.enabled) return
    const ctx = this.ensure()
    if (!ctx) return
    const t0 = ctx.currentTime + delay
    const osc = ctx.createOscillator()
    const g = ctx.createGain()
    osc.type = type
    osc.frequency.setValueAtTime(freq, t0)
    if (freqEnd !== null) osc.frequency.exponentialRampToValueAtTime(Math.max(30, freqEnd), t0 + dur)
    g.gain.setValueAtTime(0.0001, t0)
    g.gain.exponentialRampToValueAtTime(vol, t0 + 0.015)
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur)
    osc.connect(g).connect(this.master)
    osc.start(t0)
    osc.stop(t0 + dur + 0.05)
  }

  noise({ dur = 0.2, vol = 0.3, delay = 0, lowpass = 1200 }) {
    if (!this.enabled) return
    const ctx = this.ensure()
    if (!ctx) return
    const t0 = ctx.currentTime + delay
    const len = Math.max(1, Math.floor(ctx.sampleRate * dur))
    const buf = ctx.createBuffer(1, len, ctx.sampleRate)
    const data = buf.getChannelData(0)
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len)
    const src = ctx.createBufferSource()
    src.buffer = buf
    const filter = ctx.createBiquadFilter()
    filter.type = 'lowpass'
    filter.frequency.value = lowpass
    const g = ctx.createGain()
    g.gain.value = vol
    src.connect(filter).connect(g).connect(this.master)
    src.start(t0)
  }

  // ── Từng hiệu ứng ──
  pull() { // kéo nhẹ: bụp ngắn
    this.tone({ freq: 220, freqEnd: 140, dur: 0.12, type: 'triangle', vol: 0.45 })
    this.noise({ dur: 0.08, vol: 0.15, lowpass: 900 })
  }
  bigPull() { // kéo mạnh: gầm + bụp lớn
    this.tone({ freq: 160, freqEnd: 320, dur: 0.25, type: 'sawtooth', vol: 0.3 })
    this.tone({ freq: 110, freqEnd: 60, dur: 0.2, type: 'triangle', vol: 0.6, delay: 0.05 })
    this.noise({ dur: 0.15, vol: 0.25, lowpass: 1200 })
  }
  splash() { // té bùn: bõm + xì xì
    this.tone({ freq: 300, freqEnd: 70, dur: 0.35, type: 'sine', vol: 0.55 })
    this.noise({ dur: 0.4, vol: 0.3, lowpass: 700 })
  }
  cheer() { // reo hò khi thắng: kèn vui
    ;[523, 659, 784, 1046].forEach((f, i) => this.tone({ freq: f, dur: 0.22, type: 'triangle', vol: 0.4, delay: i * 0.12 }))
  }
  fanfare() { this.cheer() }
  countdown() { this.tone({ freq: 660, dur: 0.12, type: 'square', vol: 0.3 }) }
  go() { this.tone({ freq: 880, dur: 0.3, type: 'square', vol: 0.35 }); this.tone({ freq: 1320, dur: 0.3, type: 'sine', vol: 0.3, delay: 0.05 }) }
  coin() { this.tone({ freq: 988, dur: 0.08, type: 'sine', vol: 0.35 }); this.tone({ freq: 1319, dur: 0.18, type: 'sine', vol: 0.35, delay: 0.07 }) }
  comeback() { // còi báo "cơ hội cuối"
    this.tone({ freq: 784, dur: 0.15, type: 'square', vol: 0.3 })
    this.tone({ freq: 1046, dur: 0.2, type: 'square', vol: 0.3, delay: 0.15 })
  }

  playForPull(effect) {
    // Giữ tên cũ cho các chỗ gọi trước đây: giờ là tiếng đánh bằng file thật
    // (vung + va chạm, quà to thêm lớp đấm); file lỗi thì về tiếng tổng hợp.
    this.playAttack(effect)
  }
}
