// ─── GiftIcon.jsx ────────────────────────────────────────────────────────
// Sticker cho hiệu ứng tặng quà: mỗi món quà TikTok hiện icon ĐÚNG món
// quà đó — CHỈ dùng ảnh thật của TikTok (public/gifts/*.webp, ảnh gốc
// TikTok, nền trong suốt), KHÔNG dùng icon bên ngoài (Lucide...). Món
// nào chưa có ảnh đúng tên thì hiện ảnh thật của món cùng bậc lực kéo
// (theo power) để lúc nào cũng là icon quà TikTok thật.
// Map tên → ảnh nằm ở src/game/giftImages.js (nguồn duy nhất, dùng chung
// với bảng hướng dẫn và test).
import { giftImageSrc, giftImageForPower } from '../game/giftImages.js'

export default function GiftIcon({ gift, power, size = 20, className = '' }) {
  // Có ảnh thật đúng tên → hiện ảnh thật; không có → ảnh thật cùng bậc
  // lực kéo; không có cả tên lẫn power → ảnh Hoa hồng (quà TikTok 1 xu)
  // làm ảnh chung. Không bao giờ dùng icon bên ngoài.
  const imgSrc = giftImageSrc(gift) || (power != null ? giftImageForPower(power) : null) || '/gifts/rose.webp'
  // width/height là attribute (không phải inline style) để CSS class như
  // .fw-gift-ic (vòng vàng 84px) vẫn ghi đè được khi cần.
  return (
    <img
      src={imgSrc}
      alt={String(gift || 'quà')}
      width={size}
      height={size}
      style={{ objectFit: 'contain', display: 'block' }}
      className={className}
    />
  )
}
