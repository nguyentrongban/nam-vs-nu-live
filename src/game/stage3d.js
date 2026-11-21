// ─── NAM vs NỮ LIVE · stage3d.js ──────────────────────────────────────────
// Vị trí nhân vật 3D trên màn battle — DÙNG CHUNG cho 2 nơi để không lệch:
//   - ThreeFighters.jsx (canvas 3D): vị trí thật của nhân vật trong scene.
//   - BattleScene.jsx (nhãn GIRL/BOY bằng HTML): nhãn luôn nằm đúng dưới
//     nhân vật, kể cả khi vạch giữa chạy tới mép (trước đây nhãn tính bằng
//     công thức riêng nên tới mép thì lệch hẳn sang phe kia / bị cắt nửa).
// Logic thuần, test được bằng node. Đơn vị: mét trong scene 3D; camera nhìn
// nửa chiều cao VISIBLE_HALF_H, tỉ lệ khung hình aspect = rộng / cao màn.
export const CHAR_HEIGHT = 1.55 // scale nhân vật về cao 1,55m
export const VISIBLE_HALF_H = 2.5 // nửa chiều cao khung nhìn (nhân vật ≈ 31% chiều cao màn)
export const CHAR_OFFSET = 0.78 // mỗi nhân vật cách vạch giữa 0,78m — mặt không chạm nhau
const EDGE_PAD = 0.32 // khi vạch tới mép, trượt CẢ CẶP vào trong (giữ nguyên khoảng cách)

// Vị trí X (mét, gốc ở giữa màn) của 2 nhân vật theo vạch giữa divider (0..100).
export function fighterWorldPositions(divider, halfW) {
  const d = typeof divider === 'number' && Number.isFinite(divider) ? divider : 50
  const divX = (d / 100 - 0.5) * 2 * halfW
  const minX = -halfW + EDGE_PAD
  const maxX = halfW - EDGE_PAD
  let girlX = divX - CHAR_OFFSET
  let boyX = divX + CHAR_OFFSET
  // Trượt cả cặp, không kẹp từng người (kẹp riêng là 2 đứa dính vào nhau).
  if (boyX > maxX) { const s = boyX - maxX; girlX -= s; boyX -= s }
  if (girlX < minX) { const s = minX - girlX; girlX += s; boyX += s }
  return { girlX, boyX }
}

// Vị trí theo tỉ lệ màn hình (0..1) — dùng để đặt nhãn HTML.
export function fighterFractions(divider, aspect) {
  const a = typeof aspect === 'number' && Number.isFinite(aspect) && aspect > 0 ? aspect : 0.462
  const halfW = VISIBLE_HALF_H * a
  const { girlX, boyX } = fighterWorldPositions(divider, halfW)
  return { girl: (girlX + halfW) / (2 * halfW), boy: (boyX + halfW) / (2 * halfW) }
}
