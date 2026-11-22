// ─── NAM vs NỮ LIVE · ThreeFighters.jsx ─────────────────────────────────────
// 2 nhân vật 3D KayKit (Nữ Rogue + Nam Knight, CC0) đứng đối mặt nhau ngay
// vạch giữa, trên nền 2D hiện tại. Canvas trong suốt phủ lên màn battle.
// Dáng đổi theo thế trận (xem src/game/poses.js): phe dẫn → ĐẨY (clip đấm
// lặp lại, nghiêng người về trước), phe bị đẩy → PHÒNG THỦ (clip Blocking,
// ngả về sau), hòa → Idle. Chuyển dáng crossfade 0,3s, không giật.
// Vũ khí GIỮ NGUYÊN như ảnh mẫu tấn đã chọn (dao găm / kiếm + khiên tròn);
// các phụ kiện thừa gắn sẵn trong GLB (nỏ, dao ném, kiếm phụ, 3 khiên còn
// lại…) được ẩn đi — không ẩn thì Rogue hiện cả nỏ, Knight hiện 2 kiếm +
// 4 khiên chồng lên nhau.
// Load GLB: thử file tự host /characters/ trước, rồi CDN KayKit (jsDelivr /
// raw.githubusercontent, đã ghim commit, CORS *). Load lỗi hết hoặc quá
// 20s → báo onStatus('failed') để BattleScene hiện lại nhân vật blocky 2D.
import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { POSE_CLIPS, POSE_DEFEND, POSE_IDLE, POSE_PUSH, POSE_CELEBRATE, CELEBRATE_MS, isCelebrating, isAttacking, isPressuring, resolveFighterPose, nextAttackState, nextPressureState, glbUrlsFor, KEEP_ACCESSORIES, poseForSide } from '../game/poses.js'
import { CHAR_HEIGHT, VISIBLE_HALF_H, fighterWorldPositions } from '../game/stage3d.js'

// Phụ kiện gắn sẵn trong GLB KayKit (tên node). Chỉ giữ lại những cái trong
// KEEP_ACCESSORIES, còn lại ẩn hết.
const ACCESSORY_NAMES = new Set([
  'Knife', 'Knife_Offhand', '1H_Crossbow', '2H_Crossbow', 'Throwable',
  '1H_Sword', '2H_Sword', '1H_Sword_Offhand',
  'Badge_Shield', 'Rectangle_Shield', 'Round_Shield', 'Spike_Shield',
])

const LOAD_TIMEOUT_MS = 20000

function pickClip(gltf, pose) {
  const name = POSE_CLIPS[pose]
  return THREE.AnimationClip.findByName(gltf.animations, name)
    || THREE.AnimationClip.findByName(gltf.animations, 'Idle')
    || gltf.animations[0]
}

export default function ThreeFighters({ rope = 0, divider = 50, jolt = null, joltId = '', celebrateTeam = null, celebrateId = '', attackTeam = null, attackId = '', attackMs = 1000, pressureTeam = null, pressureId = '', onStatus = () => {} }) {
  const wrapRef = useRef(null)
  const canvasRef = useRef(null)
  const propsRef = useRef({ rope, divider, jolt, celebrateTeam, celebrateId, attackTeam, attackId, attackMs, pressureTeam, pressureId })
  propsRef.current = { rope, divider, jolt, celebrateTeam, celebrateId, attackTeam, attackId, attackMs, pressureTeam, pressureId }
  // Ăn mừng quà 100 xu: { team, until (Date.now), lastId }. Quà 100 xu mới
  // tới (id khác) thì gia hạn thêm 4,5s; hết giờ thì tự về dáng theo thế trận.
  // celebrateId 'perm' = ăn mừng liên tục (chỉ dùng cho chụp ảnh ?celebrate=).
  const celebrateRef = useRef({ team: null, until: 0, lastId: '' })
  // Tấn công theo từng món quà: { team, until, lastId } — giống ăn mừng
  // nhưng ngắn (1s quà nhỏ, 1,5s quà to). id 'perm' = đánh liên tục (chỉ
  // dùng cho chụp ảnh ?attack=). Effect cũ không bật lại khi effect mới
  // hơn hết hạn trước (nextAttackState so sánh id đơn điệu).
  const attackRef = useRef({ team: null, until: 0, lastId: '' })
  // Ép sân (quà 100 xu): { team, until, lastId } — phe nhận quà 100 xu ép
  // phe kia 10s kể từ món 100 xu mới nhất. id 'perm' = ép liên tục (chỉ
  // dùng cho chụp ảnh ?pressure=).
  const pressureRef = useRef({ team: null, until: 0, lastId: '' })
  const statusRef = useRef('loading')

  const setStatus = (s) => {
    if (statusRef.current === s) return
    statusRef.current = s
    if (typeof window !== 'undefined') {
      window.__fightersStatus = s
      if (s === 'ready') window.__fightersReady = true
    }
    onStatus(s)
  }

  // Rung màn hình khi có quà: khởi động lại animation mà không remount canvas
  // (remount là load lại GLB — cấm).
  useEffect(() => {
    const el = wrapRef.current
    if (!el || !joltId) return
    el.style.animation = 'none'
    void el.offsetWidth // eslint-disable-line no-unused-expressions
    el.style.animation = ''
  }, [joltId])

  useEffect(() => {
    let cancelled = false
    let renderer = null
    let raf = 0
    let ro = null
    const clock = new THREE.Clock()
    const fighters = [] // { group, mixer, actions, pose, lean, side }
    let halfW = 1.15

    const canvas = canvasRef.current
    const wrap = wrapRef.current
    if (!canvas || !wrap) return undefined

    try {
      renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true })
    } catch (e) {
      console.error('[3D] Không tạo được WebGL:', e)
      setStatus('failed')
      return undefined
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
    renderer.outputColorSpace = THREE.SRGBColorSpace
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.05

    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100)
    const dist = VISIBLE_HALF_H / Math.tan(THREE.MathUtils.degToRad(17.5))
    camera.position.set(0, 1.15, dist)
    camera.lookAt(0, 0.85, 0)

    scene.add(new THREE.HemisphereLight(0xffffff, 0x8a97a8, 1.25))
    const sun = new THREE.DirectionalLight(0xffffff, 2.2)
    sun.position.set(3, 6, 4)
    scene.add(sun)
    const fill = new THREE.DirectionalLight(0xdfeaff, 0.6)
    fill.position.set(-4, 3, 2)
    scene.add(fill)

    const resize = () => {
      const w = wrap.clientWidth || 1
      const h = wrap.clientHeight || 1
      renderer.setSize(w, h, false)
      camera.aspect = w / h
      halfW = VISIBLE_HALF_H * camera.aspect
      camera.updateProjectionMatrix()
    }
    resize()
    ro = new ResizeObserver(resize)
    ro.observe(wrap)

    const normalize = (obj) => {
      const box = new THREE.Box3().setFromObject(obj)
      const size = new THREE.Vector3()
      box.getSize(size)
      obj.scale.setScalar(CHAR_HEIGHT / Math.max(size.y, 0.01))
      const box2 = new THREE.Box3().setFromObject(obj)
      obj.position.y -= box2.min.y // chân chạm đất (y = 0)
      obj.traverse((o) => { if (o.isMesh) o.castShadow = false })
    }

    const loadOne = async (side) => {
      const loader = new GLTFLoader()
      let lastErr = null
      for (const url of glbUrlsFor(side)) {
        try {
          const gltf = await loader.loadAsync(url)
          return gltf
        } catch (e) { lastErr = e }
      }
      throw lastErr || new Error(`Không tải được GLB phe ${side}`)
    }

    const setupFighter = (side, gltf) => {
      const obj = gltf.scene
      // Ẩn phụ kiện thừa, chỉ giữ bộ trong ảnh mẫu.
      const keep = new Set(KEEP_ACCESSORIES[side])
      obj.traverse((o) => {
        if (ACCESSORY_NAMES.has(o.name) && !keep.has(o.name)) o.visible = false
      })
      normalize(obj)
      const inner = new THREE.Group()
      inner.add(obj)
      const group = new THREE.Group()
      group.add(inner)
      group.rotation.y = side === 'A' ? Math.PI / 2 : -Math.PI / 2 // đối mặt nhau
      scene.add(group)
      const mixer = new THREE.AnimationMixer(obj)
      const actions = {}
      for (const pose of [POSE_IDLE, POSE_PUSH, POSE_DEFEND, POSE_CELEBRATE]) {
        const clip = pickClip(gltf, pose)
        if (clip) actions[pose] = mixer.clipAction(clip)
      }
      // Đèn vàng phát sáng khi ăn mừng: gắn vào nhóm nhân vật, ngay trước
      // mặt (local +Z sau khi xoay sẽ hướng về phía đối thủ) để ánh sáng
      // rọi thẳng vào người đang nhảy. Bình thường cường độ 0.
      const glow = new THREE.PointLight(0xffc94d, 0, 7, 1.5)
      glow.position.set(0, 1.7, 1.6)
      group.add(glow)
      const f = { side, group, inner, mixer, actions, pose: null, lean: 0, lunge: 0, glow }
      fighters.push(f)
      return f
    }

    const playPose = (f, pose) => {
      if (f.pose === pose) return
      const next = f.actions[pose] || f.actions[POSE_IDLE]
      const prev = f.pose ? f.actions[f.pose] : null
      if (prev && prev !== next) prev.fadeOut(0.3)
      if (next) {
        next.reset().setLoop(THREE.LoopRepeat).fadeIn(0.3).play()
        // Đẩy là clip đấm 1 phát: chạy lặp + hơi nhanh để đọc thành xô liên tục.
        next.timeScale = pose === POSE_PUSH ? 1.15 : 1
      }
      f.pose = pose
    }

    const timeoutId = setTimeout(() => {
      if (statusRef.current === 'loading') {
        console.warn('[3D] Hết 20s vẫn chưa load xong GLB — về nhân vật 2D.')
        setStatus('failed')
      }
    }, LOAD_TIMEOUT_MS)

    ;(async () => {
      try {
        const [gltfA, gltfB] = await Promise.all([loadOne('A'), loadOne('B')])
        if (cancelled) return
        setupFighter('A', gltfA)
        setupFighter('B', gltfB)
        setStatus('ready')
      } catch (e) {
        console.error('[3D] Load GLB lỗi:', e)
        if (!cancelled) setStatus('failed')
      }
    })()

    const tick = () => {
      raf = requestAnimationFrame(tick)
      const dt = Math.min(clock.getDelta(), 0.05)
      const { rope: r, divider: d, celebrateTeam: cTeam, celebrateId: cId, attackTeam: aTeam, attackId: aId, attackMs: aMs, pressureTeam: pTeam, pressureId: pId } = propsRef.current
      // Quà 100 xu mới (id khác id lần trước) → phe nhận quà ăn mừng 4,5s.
      // id 'perm' (chụp ảnh ?celebrate=) thì ăn mừng liên tục không hết giờ.
      if (cId && cId !== celebrateRef.current.lastId) {
        celebrateRef.current = {
          team: cTeam,
          until: cId === 'perm' ? Infinity : Date.now() + CELEBRATE_MS,
          lastId: cId,
        }
      }
      // Cú ghi điểm mới (quà/tim/follow/cmt, id khác id lần trước) → phe
      // đó tấn công 1–1,5s, phe kia phòng thủ. id 'perm' (?attack=) thì
      // đánh liên tục. Effect cũ không bật lại (xem nextAttackState).
      // Phe đang BỊ ÉP tặng quà nhỏ/tim/follow/cmt thì KHÔNG được tấn
      // công, KHÔNG phá thế ép — chỉ ghi nhận id để hết ép cũng không
      // đánh bù (xem nextAttackState, pressuringTeam).
      const nowMs = Date.now()
      pressureRef.current = nextPressureState(pressureRef.current, pId ? { team: pTeam, id: pId } : null, nowMs)
      const pressuringTeam = isPressuring(pressureRef.current, pressureRef.current.team, nowMs) ? pressureRef.current.team : null
      attackRef.current = nextAttackState(attackRef.current, aId ? { team: aTeam, id: aId, ms: aMs } : null, nowMs, pressuringTeam)
      const poseDebug = {}
      // Vị trí: 2 nhân vật luôn cách nhau 2×CHAR_OFFSET quanh vạch giữa
      // (xem src/game/stage3d.js — BattleScene dùng chung công thức này để
      // đặt nhãn GIRL/BOY nên nhãn không bao giờ lệch khỏi nhân vật).
      const { girlX, boyX } = fighterWorldPositions(d, halfW)
      const divX = (d / 100 - 0.5) * 2 * halfW
      if (typeof window !== 'undefined') {
        window.__fighterPos = { girlX, boyX, halfW, divX, divider: d }
      }
      for (const f of fighters) {
        // Ưu tiên dáng: ĂN MỪNG (100 xu) > ÉP SÂN > TẤN CÔNG theo quà >
        // thế trận. Phe vừa được tặng thì ĐẨY, phe còn lại PHÒNG THỦ — dù
        // thế trận đang nghiêng về bên nào, nên không còn chuyện 1 phe thủ mãi.
        const celebrating = isCelebrating(celebrateRef.current, f.side, nowMs)
        const attacking = isAttacking(attackRef.current, f.side, nowMs) || isPressuring(pressureRef.current, f.side, nowMs)
        const pose = resolveFighterPose(r, f.side, celebrateRef.current, attackRef.current, pressureRef.current, nowMs)
        poseDebug[f.side] = pose
        playPose(f, pose)
        f.mixer.update(dt)
        const targetX = f.side === 'A' ? girlX : boyX
        // Tấn công thì nhào người về phía đối thủ (A: +X, B: -X) cho cú
        // đấm đọc rõ là đang xô tới, không chỉ đứng yên vung tay.
        const lungeDir = f.side === 'A' ? 1 : -1
        const targetLunge = attacking ? 0.16 : 0
        f.lunge += (targetLunge - f.lunge) * Math.min(1, dt * 8)
        f.group.position.x += ((targetX + lungeDir * f.lunge) - f.group.position.x) * Math.min(1, dt * 8)
        // Nghiêng: phe đẩy nghiêng về trước (tấn công theo quà thì nghiêng
        // mạnh hơn 1 chút), phe thủ ngả về sau, ăn mừng thì đứng thẳng
        // (clip Cheer tự nhảy lên).
        // Girl quay mặt +X: nghiêng trước = rotation.z âm; Boy quay mặt -X: ngược lại.
        const dir = f.side === 'A' ? -1 : 1
        const targetLean = celebrating ? 0 : pose === POSE_PUSH ? (attacking ? 0.18 : 0.14) : pose === POSE_DEFEND ? -0.16 : 0
        f.lean += (targetLean - f.lean) * Math.min(1, dt * 6)
        f.inner.rotation.z = dir * f.lean
        // Nhảy ăn mừng: clip Cheer của Knight cầm khiên+kiếm nhìn từ bên
        // hông rất giống thế phòng thủ (khiên giơ trước mặt) — nhún lên
        // xuống cho rõ là đang nhảy ăn mừng, không phải đang thủ.
        const targetBounce = celebrating ? Math.abs(Math.sin(nowMs / 220)) * 0.14 : 0
        f.inner.position.y += (targetBounce - f.inner.position.y) * Math.min(1, dt * 10)
        // Phát sáng vàng khi ăn mừng, mờ dần trong 1 giây cuối rồi tắt.
        const remaining = celebrateRef.current.until - nowMs
        const fade = celebrating ? Math.min(1, remaining / 1000) : 0
        const targetGlow = celebrating ? 2.2 * fade : 0
        f.glow.intensity += (targetGlow - f.glow.intensity) * Math.min(1, dt * 8)
      }
      if (typeof window !== 'undefined') window.__fighterPose = poseDebug
      renderer.render(scene, camera)
    }
    tick()

    return () => {
      cancelled = true
      clearTimeout(timeoutId)
      cancelAnimationFrame(raf)
      if (ro) ro.disconnect()
      for (const f of fighters) {
        f.mixer.stopAllAction()
        f.group.traverse((o) => {
          if (o.isMesh) {
            o.geometry?.dispose()
            const mats = Array.isArray(o.material) ? o.material : [o.material]
            mats.forEach((m) => m?.dispose?.())
          }
        })
      }
      renderer?.dispose()
    }
    // Chỉ mount 1 lần — rope/divider/jolt đọc qua propsRef để không load lại GLB.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div ref={wrapRef} className={`nvb-3d ${jolt === 'big' ? 'nvb-shake-hard' : jolt === 'small' ? 'nvb-shake-soft' : ''}`}>
      <canvas ref={canvasRef} aria-hidden="true" />
    </div>
  )
}
