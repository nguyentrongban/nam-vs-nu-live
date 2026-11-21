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

export const POSE_CLIPS = {
  [POSE_IDLE]: 'Idle',
  [POSE_PUSH]: 'Unarmed_Melee_Attack_Punch_A',
  [POSE_DEFEND]: 'Blocking',
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
