// ─── NAM vs NỮ LIVE · guide.js ────────────────────────────────────────────
// Bảng hướng dẫn gọn trên màn game — dữ liệu thuần để test được.
// LUẬT V2 chốt 2026-11-21 + bổ sung 2026-11-21 17:51: chỉ tặng quà mới đẩy
// (món quà quyết phe), 100 tim → +10 Nữ, 1 follow → +10 Nam, cmt boy/nam
// +1 Nam, girl/nữ +1 Nữ. Bảng phe quà: hoa hồng → Nữ, TikTok → Nam,
// Nước hoa (20 xu) → Nam, Bánh vòng (30 xu) → Nữ.
// 2026-11-21 19:25 (tấn chê bảng chưa liệt kê quà 100 xu): thêm 2 dòng
// rộng liệt kê đủ 14 món quà 100 lực đã gán phe cố định (Nữ 7 + Nam 7,
// kể cả Hạc giấy 99 xu = 100 lực). Tên rút gọn cho vừa 2 dòng/bảng.
// 7 dòng gọn + 2 dòng rộng = 9 dòng: 4 dòng quà dùng ẢNH THẬT của TikTok
// (public/gifts/*.webp — ảnh gốc TikTok, đối chiếu bảng quà trên điện
// thoại streamer), 3 dòng tương tác dùng icon UI của game (Lucide — cùng
// bộ với nút nhạc/nút trợ giúp; TikTok không có ảnh quà nào cho "follow"/
// "bình luận"), 2 dòng rộng 100 xu dùng emoji 💯 + chữ (tên rút gọn).
// side: 'A' = Nữ (hồng), 'B' = Nam (xanh), null = cả 2 phe.
// wide: true = dòng chiếm trọn 2 cột (cmt + 2 dòng 100 xu).
export const GUIDE_ROWS = [
  { img: '/gifts/rose.webp', alt: 'Hoa hồng', left: 'Hoa hồng', right: 'Nữ', side: 'A' },
  { img: '/gifts/tiktok.webp', alt: 'Quà TikTok', left: 'Quà TikTok', right: 'Nam', side: 'B' },
  { img: '/gifts/perfume.webp', alt: 'Nước hoa', left: 'Nước hoa', right: 'Nam', side: 'B' },
  { img: '/gifts/cheese_donuts.webp', alt: 'Bánh vòng', left: 'Bánh vòng', right: 'Nữ', side: 'A' },
  { lucide: 'Heart', left: '100 tim', right: 'Nữ +10', side: 'A' },
  { lucide: 'UserPlus', left: '1 follow', right: 'Nam +10', side: 'B' },
  { lucide: 'MessageCircle', left: 'Cmt boy/nam · girl/nữ', right: '+1', side: null, wide: true, center: true },
  // Quà 100 lực đã gán phe cố định (2026-11-21): Nữ 7 món, Nam 7 món.
  { wide: true, side: 'A', label: 'Quà 100 xu → Nữ:', list: 'Bó hoa · Thả tim · Tim · Hộp quà · Buổi sáng · Cuối tuần · Hạc giấy' },
  { wide: true, side: 'B', label: 'Quà 100 xu → Nam:', list: 'Tay cầm · Súng tiền · GG siêu khủng · Mũ ria mép · Thiên hà · Ú òa · Corgi' },
]
