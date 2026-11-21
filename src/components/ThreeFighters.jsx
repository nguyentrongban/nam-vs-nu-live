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
import { POSE_CLIPS, POSE_DEFEND, POSE_IDLE, POSE_PUSH, glbUrlsFor, KEEP_ACCESSORIES, poseForSide } from '../game/poses.js'

// Phụ kiện gắn sẵn trong GLB KayKit (tên node). Chỉ giữ lại những cái trong
// KEEP_ACCESSORIES, còn lại ẩn hết.
const ACCESSORY_NAMES = new Set([
  'Knife', 'Knife_Offhand', '1H_Crossbow', '2H_Crossbow', 'Throwable',
  '1H_Sword', '2H_Sword', '1H_Sword_Offhand',
  'Badge_Shield', 'Rectangle_Shield', 'Round_Shield', 'Spike_Shield',
])

const LOAD_TIMEOUT_MS = 20000
const CHAR_HEIGHT = 1.55 // scale nhân vật về cao 1,55m
const VISIBLE_HALF_H = 2.5 // nửa chiều cao khung nhìn (nhân vật ≈ 31% chiều cao màn)
const CHAR_OFFSET = 0.62 // khoảng cách mỗi nhân vật tới vạch giữa (đứng xa nhau, không chạm mặt)

function pickClip(gltf, pose) {
  const name = POSE_CLIPS[pose]
  return THREE.AnimationClip.findByName(gltf.animations, name)
    || THREE.AnimationClip.findByName(gltf.animations, 'Idle')
    || gltf.animations[0]
}

export default function ThreeFighters({ rope = 0, divider = 50, jolt = null, joltId = '', onStatus = () => {} }) {
  const wrapRef = useRef(null)
  const canvasRef = useRef(null)
  const propsRef = useRef({ rope, divider, jolt })
  propsRef.current = { rope, divider, jolt }
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
      for (const pose of [POSE_IDLE, POSE_PUSH, POSE_DEFEND]) {
        const clip = pickClip(gltf, pose)
        if (clip) actions[pose] = mixer.clipAction(clip)
      }
      const f = { side, group, inner, mixer, actions, pose: null, lean: 0 }
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
      const { rope: r, divider: d } = propsRef.current
      // Vị trí: 2 nhân vật luôn cách nhau 2×CHAR_OFFSET quanh vạch giữa.
      // Khiên/kiếm chìa sang 2 bên ~0,55 nên khoảng cách này mới không rối
      // vào nhau. Khi vạch chạy tới mép thì trượt CẢ CẶP vào trong (giữ
      // nguyên khoảng cách), không kẹp từng người (kẹp riêng là 2 đứa dính
      // vào nhau như ảnh chụp lỗi trước đó).
      const divX = (d / 100 - 0.5) * 2 * halfW
      const minX = -halfW + 0.32
      const maxX = halfW - 0.32
      let girlX = divX - CHAR_OFFSET
      let boyX = divX + CHAR_OFFSET
      if (boyX > maxX) { const s = boyX - maxX; girlX -= s; boyX -= s }
      if (girlX < minX) { const s = minX - girlX; girlX += s; boyX += s }
      if (typeof window !== 'undefined') {
        window.__fighterPos = { girlX, boyX, halfW, divX, divider: d }
      }
      for (const f of fighters) {
        const pose = poseForSide(r, f.side)
        playPose(f, pose)
        f.mixer.update(dt)
        const targetX = f.side === 'A' ? girlX : boyX
        f.group.position.x += (targetX - f.group.position.x) * Math.min(1, dt * 8)
        // Nghiêng: phe đẩy nghiêng về trước, phe thủ ngả về sau.
        // Girl quay mặt +X: nghiêng trước = rotation.z âm; Boy quay mặt -X: ngược lại.
        const dir = f.side === 'A' ? -1 : 1
        const targetLean = pose === POSE_PUSH ? 0.14 : pose === POSE_DEFEND ? -0.16 : 0
        f.lean += (targetLean - f.lean) * Math.min(1, dt * 6)
        f.inner.rotation.z = dir * f.lean
      }
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
