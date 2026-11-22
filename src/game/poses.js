// ─── NAM vs NỮ LIVE · poses.js ─────────────────────────────────────────────
// Chọn dáng nhân vật 3D (KayKit) theo thế trận. Logic thuần, test được bằng node.
// rope (-1..+1): > 0 là Nữ (phe A) đang dẫn, < 0 là Nam (phe B) đang dẫn.
//   phe dẫn → ĐẨY (clip đấm), phe bị đẩy → PHÒNG THỦ (clip Blocking),
//   hòa (|rope| <= 0.05) → đứng yên (Idle).
// CLIP ĐẨY: gói KayKit Character Animations (161 clip, CC0) KHÔNG có clip
// đẩy 2 tay kiểu xô đối thủ — danh mục chỉ có general / movement / melee /
// ranged / simulation / tools, không có push/shove. Nên thế đẩy dùng clip
// Unarmed_Melee_Attack_Punch_A có sẵn trong GLB (đấm 1 tay, đã chốt với tấn).

export const POSE_IDLE = 'idle'
export const POSE_PUSH = 'push'
export const POSE_DEFEND = 'defend'
export const POSE_CELEBRATE = 'celebrate'

export const POSE_CLIPS = {
  [POSE_IDLE]: 'Idle',
  [POSE_PUSH]: 'Unarmed_Melee_Attack_Punch_A',
  [POSE_DEFEND]: 'Blocking',
  [POSE_CELEBRATE]: 'Cheer',
}

// Ăn mừng khi phe mình nhận quà 100 xu (spotlight): clip Cheer có sẵn
// trong cả 2 GLB đã lược (rogue + knight đều giữ Cheer). Thời gian ăn
// mừng = thời gian spotlight (4,5 giây) để 2 hiệu ứng hết cùng lúc.
export const CELEBRATE_MS = 4500

// celebrate = { team: 'A'|'B', until: ms (Date.now) } hoặc null.
// Chỉ phe nhận quà mới ăn mừng, phe còn lại giữ dáng cũ; hết giờ thì về
// dáng theo thế trận. until = Infinity = ăn mừng liên tục (chỉ dùng cho
// chụp ảnh kiểm tra qua ?celebrate=a|b, không dùng trong game thật).
export function isCelebrating(celebrate, side, nowMs) {
  if (!celebrate || celebrate.team !== side) return false
  const until = celebrate.until
  if (typeof until !== 'number' || !Number.isFinite(until)) return until === Infinity
  return nowMs < until
}

export function poseForSideWithCelebrate(rope, side, celebrate, nowMs) {
  if (isCelebrating(celebrate, side, nowMs)) return POSE_CELEBRATE
  return poseForSide(rope, side)
}

// ─── Tấn công theo từng món quà (2026-11-22, theo lệnh tấn) ───────────────
// Trước đây dáng chỉ theo THẾ TRẬN (phe dẫn thì đẩy, phe thua thì thủ) nên
// phe nào được tặng nhiều sẽ đánh mãi, phe kia thủ mãi không bao giờ được
// tấn công. Giờ: CỨ CÓ ĐIỂM MỚI LÀ PHE ĐÓ TẤN CÔNG, PHE KIA PHÒNG THỦ.
// Trigger là effect 'pull'/'like'/'follow' MỚI NHẤT (applyPull đẩy 1 effect
// 'pull' cho MỌI lần ghi điểm — quà, tim, follow, cmt — nên cmt +1 cũng
// tính là 1 cú). Ưu tiên dáng: ĂN MỪNG (100 xu) > TẤN CÔNG theo quà >
// DÁNG theo thế trận.
export const ATTACK_MS_SMALL = 1000 // quà nhỏ / tim / follow / cmt
export const ATTACK_MS_BIG = 1500 // quà to (>= 25 lực) — cho đã mắt hơn

export function attackDurationFor(power) {
  return (power || 0) >= 25 ? ATTACK_MS_BIG : ATTACK_MS_SMALL
}

// attack = { team: 'A'|'B', until: ms (Date.now) } hoặc null — giống
// celebrate, chỉ khác: phe tấn công ĐẨY, phe còn lại PHÒNG THỦ.
export function isAttacking(attack, side, nowMs) {
  if (!attack || attack.team !== side) return false
  const until = attack.until
  if (typeof until !== 'number' || !Number.isFinite(until)) return until === Infinity
  return nowMs < until
}

export function resolveFighterPose(rope, side, celebrate, attack, pressure, nowMs) {
  if (isCelebrating(celebrate, side, nowMs)) return POSE_CELEBRATE
  // ÉP SÂN (quà 100 xu): phe đang ép đánh liên tục, phe bị ép chỉ thủ —
  // thắng cả tấn công thường, nên quà nhỏ của phe bị ép không đổi được dáng.
  if (pressure && pressure.team && isPressuring(pressure, pressure.team, nowMs)) {
    return pressure.team === side ? POSE_PUSH : POSE_DEFEND
  }
  if (attack && attack.team && isAttacking(attack, attack.team, nowMs)) {
    return attack.team === side ? POSE_PUSH : POSE_DEFEND
  }
  return poseForSide(rope, side)
}

// ─── ÉP SÂN (2026-11-22, theo lệnh tấn) ───────────────────────────────────
// CHỈ quà 100 xu liên tục mới ÉP được đối thủ không tấn công lại được: phe
// nào nhận quà 100 xu thì ÉP phe kia 10 GIÂY kể từ món 100 xu mới nhất
// (món 100 xu mới của cùng phe thì làm mới lại 10s). Trong lúc ép: phe ép
// tấn công liên tục, phe bị ép BỊ KHÓA ở dáng phòng thủ — quà nhỏ / tim /
// follow / cmt của phe bị ép vẫn cộng điểm bình thường nhưng KHÔNG kích
// hoạt animation tấn công, KHÔNG phá thế ép. Chỉ quà 100 xu của phe bị ép
// mới PHÁ thế ép và LẬT NGƯỢC lại (giành thế ép về mình). Hết 10s không
// có món 100 xu mới thì thế ép tự hết, về luật thường.
// Ưu tiên dáng: ĂN MỪNG (100 xu, 4,5s) > ÉP SÂN > TẤN CÔNG theo quà (~1s)
// > DÁNG theo thế trận. Món 100 xu tới → phe nhận ăn mừng 4,5s trước, hết
// ăn mừng mà vẫn còn trong 10s ép thì chuyển sang đấm liên tục.
export const PRESSURE_MS = 10000

// pressure = { team: 'A'|'B', until: ms (Date.now) } hoặc null.
export function isPressuring(pressure, side, nowMs) {
  if (!pressure || pressure.team !== side) return false
  const until = pressure.until
  if (typeof until !== 'number' || !Number.isFinite(until)) return until === Infinity
  return nowMs < until
}

// Cập nhật thế ép khi có quà 100 xu mới (evt = { team, id } từ spotlight,
// hoặc null khi không có spotlight mới). Món 100 xu mới của phe nào thì
// phe đó giành thế ép (làm mới 10s nếu cùng phe, lật ngược nếu khác phe).
// id 'perm' = ép liên tục (chỉ dùng cho chụp ảnh ?pressure=).
export function nextPressureState(prev, evt, nowMs) {
  if (!evt || !evt.team || !evt.id) return prev
  const seq = fxSeq(evt.id)
  if (prev && prev.lastId && !fxSeqNewer(seq, fxSeq(prev.lastId))) return prev
  return {
    team: evt.team,
    until: evt.id === 'perm' ? Infinity : nowMs + PRESSURE_MS,
    lastId: evt.id,
  }
}

// id effect dạng fx_<timestamp base36>_<số tăng dần> — so sánh đơn điệu để
// hiệu ứng CŨ không bật lại khi hiệu ứng mới hơn hết hạn trước nó (vd quà
// to dur 3,5s còn sống sau khi quà nhỏ dur 2s đã hết). id 'perm' (khóa để
// chụp ảnh ?attack=) luôn coi là mới nhất.
export function fxSeq(id) {
  if (id === 'perm') return [Infinity, Infinity]
  if (typeof id !== 'string') return null
  const m = /^fx_([0-9a-z]+)_(\d+)$/.exec(id)
  if (!m) return null
  return [parseInt(m[1], 36), parseInt(m[2], 10)]
}

function fxSeqNewer(a, b) {
  if (!a) return true
  if (!b) return false
  if (a[0] !== b[0]) return a[0] > b[0]
  return a[1] > b[1]
}

// Cập nhật trạng thái tấn công khi có effect ghi điểm mới (evt = { team,
// id, ms } hoặc null khi không có effect nào). Trả prev nếu evt null, id
// cũ hơn id đã nhận, hoặc id trùng (quà tới dồn dập cùng id thì không
// reset — mỗi món quà có id riêng nên món mới luôn gia hạn).
// state = { team, until, lastId } — until = Infinity khi id 'perm'.
// pressuringTeam: phe đang ÉP — phe bị ép tặng quà nhỏ/tim/follow/cmt thì
// vẫn cộng điểm nhưng KHÔNG được tấn công, KHÔNG phá thế ép: chỉ ghi nhận
// id để hết ép cũng không đánh bù cho món quà đã qua.
export function nextAttackState(prev, evt, nowMs, pressuringTeam = null) {
  if (!evt || !evt.team || !evt.id) return prev
  const seq = fxSeq(evt.id)
  if (prev && prev.lastId && !fxSeqNewer(seq, fxSeq(prev.lastId))) return prev
  if (pressuringTeam && evt.team !== pressuringTeam) {
    return { team: prev?.team ?? null, until: prev?.until ?? 0, lastId: evt.id }
  }
  return {
    team: evt.team,
    until: evt.id === 'perm' ? Infinity : nowMs + (evt.ms || ATTACK_MS_SMALL),
    lastId: evt.id,
  }
}

// Nghiêng người cho nhân vật blocky 2D dự phòng (độ, giống công thức cũ
// trong BattleScene): tấn công thì chúi mạnh về trước, bị tấn công thì ngả
// mạnh về sau, không có tấn công thì theo thế trận như cũ.
export function blockyLeanForSide(side, rope, attackTeam) {
  if (attackTeam === 'A' || attackTeam === 'B') {
    if (attackTeam === side) return side === 'A' ? -18 : 18
    return side === 'A' ? 18 : -18
  }
  if (side === 'A') return rope > 0 ? -7 : 11
  return rope < 0 ? 7 : -11
}

// Ngưỡng hòa: rope trong [-0.05, 0.05] thì cả 2 đứng yên.
export const POSE_DEADZONE = 0.05

export function poseForSide(rope, side) {
  const r = typeof rope === 'number' && Number.isFinite(rope) ? rope : 0
  if (r > POSE_DEADZONE) return side === 'A' ? POSE_PUSH : POSE_DEFEND
  if (r < -POSE_DEADZONE) return side === 'B' ? POSE_PUSH : POSE_DEFEND
  return POSE_IDLE
}

export function posesForRope(rope) {
  return { A: poseForSide(rope, 'A'), B: poseForSide(rope, 'B') }
}

// ─── Nguồn file GLB (KayKit Adventurers, CC0) ──────────────────────────────
// local: file tự host trong public/characters/ (Render phục vụ sau khi GLB
// được upload lên repo — push-files không đẩy được file nhị phân nên GLB
// phải upload qua GitHub web). cdn: bản gốc trên GitHub KayKit, commit đã
// ghim — file knight.glb local đã kiểm chứng sha256 trùng đúng commit này,
// raw.githubusercontent.com trả Access-Control-Allow-Origin: * nên trình
// duyệt load được cross-origin. Loader thử local trước, rồi jsDelivr, rồi
// raw.githubusercontent — game không bao giờ thiếu nhân vật vì thiếu GLB.
const KAYKIT_PIN = '672074b73ba276876a19e8816ecdc5241817ab47'
const KAYKIT_BASE = 'KayKit-Game-Assets/KayKit-Character-Pack-Adventures-1.0'
const KAYKIT_PATH = 'addons/kaykit_character_pack_adventures/Characters/gltf'

export const FIGHTER_GLB = {
  // A = Nữ · Rogue (tóc đỏ, áo xanh lá, dao găm)
  A: {
    local: '/characters/rogue.glb',
    cdn: [
      `https://cdn.jsdelivr.net/gh/${KAYKIT_BASE}@${KAYKIT_PIN}/${KAYKIT_PATH}/Rogue.glb`,
      `https://raw.githubusercontent.com/${KAYKIT_BASE}/${KAYKIT_PIN}/${KAYKIT_PATH}/Rogue.glb`,
    ],
  },
  // B = Nam · Knight (giáp sắt, kiếm + khiên)
  B: {
    local: '/characters/knight.glb',
    cdn: [
      `https://cdn.jsdelivr.net/gh/${KAYKIT_BASE}@${KAYKIT_PIN}/${KAYKIT_PATH}/Knight.glb`,
      `https://raw.githubusercontent.com/${KAYKIT_BASE}/${KAYKIT_PIN}/${KAYKIT_PATH}/Knight.glb`,
    ],
  },
}

export function glbUrlsFor(side) {
  const f = FIGHTER_GLB[side]
  return [f.local, ...f.cdn]
}

// ─── Vũ khí giữ lại (đúng ảnh mẫu tấn đã chọn) ────────────────────────────
// GLB KayKit gắn SẴN mọi phụ kiện lên tay (nỏ, dao ném, 2 kiếm, 4 khiên…)
// — không ẩn thì Rogue hiện cả nỏ trên tay, Knight hiện 2 kiếm + 4 khiên
// chồng lên nhau. Chỉ giữ lại đúng bộ trong ảnh mẫu, ẩn hết phần còn lại.
export const KEEP_ACCESSORIES = {
  A: ['Knife'], // dao găm tay phải (dao tay trái Knife_Offhand ẩn)
  B: ['1H_Sword', 'Round_Shield'], // kiếm tay phải + khiên tròn tay trái
}
