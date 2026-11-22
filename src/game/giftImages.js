// ─── NAM vs NỮ LIVE · giftImages.js ────────────────────────────────────────
// Map tên quà TikTok → ảnh thật của TikTok (public/gifts/*.webp) — KHÔNG
// dùng icon bên ngoài. Món nào chưa có ảnh đúng tên thì hiện ảnh thật của
// món cùng bậc lực kéo (theo power) để lúc nào cũng là icon quà TikTok thật.
// Đây là nguồn duy nhất: GiftIcon.jsx (toast/BXH/spotlight), bảng hướng
// dẫn (guide.js) và test đều dùng chung map này.
// Giá xu đã xác nhận theo bảng quà trên điện thoại streamer (2026-11-21):
// Hoa hồng 1, Kem ốc quế 1, GG 1, TikTok 1, Đỉnh 1, Bắn tim 5,
// Bing Chilling 5, Rosa 10, Cỏ bốn lá 10, Chú heo may mắn 10,
// Nước hoa 20, little kisses 20, Bánh vòng 30, Hạc giấy 99,
// Mũ và ria mép 99, Bó hoa/Thả tim/Tay cầm/Hộp quà bóng bay/GG siêu
// khủng 100, Tim 199, Chó Corgi 299, Súng bắn tiền 500, Thiên hà 1000
// (khớp beetgames.com — ảnh đã đối chiếu bằng mắt với ảnh streamer gửi).
// Chưa có ảnh đúng tên: Bing Chilling, LIVE FEST 26, Đỉnh, Gói Quà tặng
// (khóa), Rương Báu là quà tương tác (không có giá xu) — các món này dùng
// ảnh cùng bậc lực kéo.
// Buổi sáng tốt lành (399 xu) + Cuối tuần vui vẻ (599 xu) ĐÃ có ảnh đúng
// tên từ 2026-11-22: cắt từ chính ảnh bảng quà TikTok trên điện thoại
// streamer (IMG_3467.png) — artwork thật của TikTok, không tải được file
// rời ở bất cứ trang danh sách quà nào (đã thử beetgames, scrollplay,
// powerlive, streamtoearn, overtok, BetterTok, vcgamers, TikFinity —
// không nơi nào có file ảnh 2 món này). Nền tối của bảng quà đã tách
// bằng flood-fill từ viền, còn quầng sáng xanh mờ nhẹ quanh artwork.
export const GIFT_IMAGES = [
  { keys: ['hoa hồng', 'rose'], src: '/gifts/rose.webp', power: 1 },
  { keys: ['tiktok'], src: '/gifts/tiktok.webp', power: 1 },
  { keys: ['kem ốc quế', 'ice cream cone', 'ice cream'], src: '/gifts/ice_cream_cone.webp', power: 1 },
  { keys: ['yêu bạn', 'love you'], src: '/gifts/love_you.webp', power: 1 },
  { keys: ['bánh sinh nhật', 'birthday cake'], src: '/gifts/birthday_cake.webp', power: 1 },
  { keys: ['gg'], src: '/gifts/gg.webp', power: 1 },
  { keys: ['thả tim cho tôi', 'heart me'], src: '/gifts/heart_me.webp', power: 1 },
  { keys: ['quả đào', 'peach'], src: '/gifts/peach.webp', power: 5 },
  { keys: ['bắn tim', 'finger heart'], src: '/gifts/finger_heart.webp', power: 5 },
  { keys: ['rosa'], src: '/gifts/rosa.webp', power: 10 },
  { keys: ['cỏ bốn lá', 'shamrock'], src: '/gifts/shamrock.webp', power: 10 },
  { keys: ['chú heo may mắn', 'lucky pig'], src: '/gifts/lucky_pig.webp', power: 10 },
  { keys: ['nước hoa', 'perfume'], src: '/gifts/perfume.webp', power: 25 },
  { keys: ['little kisses'], src: '/gifts/little_kisses.webp', power: 25 },
  { keys: ['bánh vòng', 'cheese donuts'], src: '/gifts/cheese_donuts.webp', power: 25 },
  { keys: ['hạc giấy', 'paper crane'], src: '/gifts/paper_crane.webp', power: 100 },
  { keys: ['buổi sáng tốt lành', 'good morning'], src: '/gifts/good_morning.webp', power: 100 },
  { keys: ['cuối tuần vui vẻ', 'happy weekend'], src: '/gifts/happy_weekend.webp', power: 100 },
  { keys: ['bó hoa', 'bouquet'], src: '/gifts/bouquet.webp', power: 100 },
  { keys: ['thả tim', 'hand hearts', 'hand heart'], src: '/gifts/hand_hearts.webp', power: 100 },
  { keys: ['tay cầm chơi game', 'game controller'], src: '/gifts/game_controller.webp', power: 100 },
  { keys: ['hộp quà bóng bay', 'balloon gift box'], src: '/gifts/balloon_gift_box.webp', power: 100 },
  { keys: ['gg siêu khủng'], src: '/gifts/gg.webp', power: 100 },
  { keys: ['mũ và ria mép', 'hat and mustache'], src: '/gifts/hat_and_mustache.webp', power: 100 },
  { keys: ['tim', 'hearts'], src: '/gifts/hearts.webp', power: 100 },
  { keys: ['chó corgi', 'corgi'], src: '/gifts/corgi.webp', power: 100 },
  { keys: ['súng bắn tiền', 'money gun'], src: '/gifts/money_gun.webp', power: 100 },
  { keys: ['thiên hà', 'galaxy'], src: '/gifts/galaxy.webp', power: 100 },
  { keys: ['ú òa', 'peeka-bro', 'peeka bro'], src: '/gifts/peeka_bro.webp', power: 100 },
  { keys: ['rương báu', 'treasure chest'], src: '/gifts/treasure_chest.webp', power: 100 },
]

export function giftImageSrc(giftName) {
  const name = String(giftName || '').toLowerCase().trim()
  if (!name) return null
  for (const entry of GIFT_IMAGES) {
    if (entry.keys.some((k) => name.includes(k))) return entry.src
  }
  return null
}

// Món quà lạ (không có ảnh đúng tên): lấy ảnh thật của món cùng bậc lực
// kéo gần nhất để hiệu ứng lúc nào cũng hiện icon quà TikTok thật.
export function giftImageForPower(power) {
  const p = Number(power) || 0
  if (p <= 1) return '/gifts/rose.webp'
  if (p <= 5) return '/gifts/peach.webp'
  if (p <= 10) return '/gifts/shamrock.webp'
  if (p <= 25) return '/gifts/perfume.webp'
  return '/gifts/paper_crane.webp'
}
