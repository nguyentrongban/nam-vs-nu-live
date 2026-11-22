// ─── NAM vs NỮ LIVE · guide.js ────────────────────────────────────────────
// Bảng hướng dẫn gọn trên màn game — dữ liệu thuần để test được.
// LUẬT V2 chốt 2026-11-21 + bổ sung 2026-11-21 17:51: chỉ tặng quà mới đẩy
// (món quà quyết phe), 100 tim → +10 Nữ, 1 follow → +10 Nam, cmt boy/nam
// +1 Nam, girl/nữ +1 Nữ. Bảng phe quà: hoa hồng → Nữ, TikTok → Nam,
// Nước hoa (20 xu) → Nam, Bánh vòng (30 xu) → Nữ.
// 2026-11-21 19:25 (tấn chê bảng chưa liệt kê quà 100 xu): thêm 2 dòng
// rộng liệt kê đủ 14 món quà 100 lực đã gán phe cố định (Nữ 7 + Nam 7,
// kể cả Hạc giấy 99 xu = 100 lực).
// 2026-11-21 19:42 (tấn chê 2 dòng 100 xu ghi chữ): 2 dòng rộng KHÔNG ghi
// tên món bằng chữ nữa — chỉ giữ nhãn "Quà 100 xu → Nữ/Nam" rồi xếp
// 7 icon quà TikTok thật (gifts: tên đầy đủ, App render bằng GiftIcon
// từ đúng map src/game/giftImages.js — cùng map với toast/BXH; món chưa
// có ảnh đúng tên thì GiftIcon tự lấy ảnh cùng bậc lực, power=100).
// 7 dòng gọn + 2 dòng rộng = 9 dòng: 4 dòng quà dùng ẢNH THẬT của TikTok
// (public/gifts/*.webp — ảnh gốc TikTok, đối chiếu bảng quà trên điện
// thoại streamer), 3 dòng tương tác dùng icon UI của game (Lucide — cùng
// bộ với nút nhạc/nút trợ giúp; TikTok không có ảnh quà nào cho "follow"/
// "bình luận"), 2 dòng rộng 100 xu dùng emoji 💯 + nhãn + icon quà thật.
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
  // gifts = tên đầy đủ để tra icon thật trong giftImages.js; KHÔNG ghi
  // tên món bằng chữ lên bảng (tấn 19:42: dùng icon, ai kêu ghi chữ).
  { wide: true, side: 'A', label: 'Quà lớn → Nữ:', gifts: ['bó hoa', 'thả tim', 'tim', 'hộp quà bóng bay', 'buổi sáng tốt lành', 'cuối tuần vui vẻ', 'hạc giấy'] },
  { wide: true, side: 'B', label: 'Quà lớn → Nam:', gifts: ['tay cầm chơi game', 'súng bắn tiền', 'gg siêu khủng', 'mũ và ria mép', 'thiên hà', 'ú òa', 'chó corgi'] },
]
