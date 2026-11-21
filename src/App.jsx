// ─── NAM vs NỮ LIVE · App.jsx ──────────────────────────────────────────────
// Màn LIVE (/) — 2D THUẦN, giống ảnh mẫu TikTok GIRL vs BOY. CHỈ hiển thị.

import { useEffect, useRef, useState } from 'react'
import {
  BookOpen, Gift, Heart, MessageCircle, Pause, Sparkles, Star, Trophy,
  UserPlus, Users, Volume2, VolumeX, X, Zap,
} from 'lucide-react'
import BattleScene from './components/BattleScene'
import GiftIcon from './components/GiftIcon'
import AdminPage from './AdminPage'
import { useTugOfWar } from './game/useTugOfWar'
import { GUIDE_ROWS } from './game/guide.js'
import { WS_STATUS } from './game/wsClient'
import { TEAMS } from './game/engine'

const APP_VERSION = '3.0.0-nam-vs-nu-2d'

function Stars({ n, total = 2 }) {
  return (
    <span className="pml-stars">
      {Array.from({ length: total }, (_, i) => (
        <Star key={i} size={15} className={i < n ? 'star-on' : 'star-off'} fill={i < n ? 'currentColor' : 'none'} />
      ))}
    </span>
  )
}

// Icon 1 dòng trong bảng hướng dẫn: dòng quà = ảnh thật TikTok (guide.js
// cho img), dòng tương tác = icon UI của game (Lucide, cùng bộ nút nhạc).
function GuideIcon({ row }) {
  if (row.img) return <img src={row.img} alt={row.alt || ''} />
  if (row.lucide === 'Heart') return <Heart size={15} fill="currentColor" />
  if (row.lucide === 'UserPlus') return <UserPlus size={15} />
  return <MessageCircle size={15} />
}

// Avatar người tặng trong spotlight quà 100 xu: có ảnh thật thì hiện ảnh,
// không có (demo) hoặc ảnh lỗi thì hiện vòng tròn chữ cái như chỗ khác
// trong game (màu theo phe được tặng).
function SpotAvatar({ avatar, name, team }) {
  const [broken, setBroken] = useState(false)
  const letter = String(name || 'K').trim().charAt(0).toUpperCase() || 'K'
  if (avatar && !broken) {
    return <img className="nvb-spot-av" src={avatar} alt={name || 'người tặng'} onError={() => setBroken(true)} />
  }
  return <div className={`nvb-spot-letter ${team === 'B' ? 'blue' : 'pink'}`}>{letter}</div>
}

export default function App() {
  const isAdmin = typeof window !== 'undefined'
    && window.location.pathname.replace(/\/$/, '') === '/admin'
  if (isAdmin) return <AdminPage />
  return <DisplayGame />
}

function DisplayGame() {
  const game = useTugOfWar()
  const { snap, wsStatus, muted } = game
  const [guideOpen, setGuideOpen] = useState(false)
  const present = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('present') === '1'

  useEffect(() => { document.title = 'NAM vs NỮ LIVE — Đại chiến TikTok!' }, [])

  // Neo pill TEAM G/B ngay dưới đáy bảng hướng dẫn (2026-11-21 19:25):
  // đo đáy bảng thật bằng ResizeObserver rồi ghi vào biến CSS
  // --nvb-guide-bottom trên khung stage; pill TEAM dùng biến đó nên
  // không bao giờ bị bảng đè, dù bảng cao thêm hay màn ngắn lại. Khi
  // bảng ẩn (đếm ngược/kết thúc màn) thì giữ giá trị đo lần cuối.

  const s = snap
  const connected = wsStatus === WS_STATUS.OPEN
  const phase = s?.phase || 'waiting'
  // TREO MÁY (mặc định BẬT): thẻ chờ không bắt buộc chạm nữa.
  const autoPlay = s?.settings?.autoPlay !== false
  const countdown = s ? Math.ceil(s.countdown) : 3
  const rope = s?.rope ?? 0
  // ?pose=a|b|idle — khóa thế trận để chụp ảnh/kiểm tra dáng 3D (không ảnh
  // hưởng luật chơi; không có param thì rope chạy theo game bình thường).
  const poseParam = new URLSearchParams(window.location.search).get('pose')
  const previewRope = poseParam === 'a' ? 0.6 : poseParam === 'b' ? -0.6 : poseParam === 'idle' ? 0 : null
  const teamA = s?.teams?.A
  const teamB = s?.teams?.B
  // Điểm hiển thị: tổng lực quà + số người vào phe (vào phe là +1 điểm ngay).
  // Điểm hiển thị = ĐIỂM MÀN (chỉ cộng lên, reset 0-0 mỗi màn).
  const scoreA = Math.round(s?.roundScore?.A || 0)
  const scoreB = Math.round(s?.roundScore?.B || 0)
  const toastFx = (s?.effects || []).filter((e) => e.kind === 'toast').pop()
  const giftFx = (s?.effects || []).filter((e) => e.kind === 'gift').pop()
  // Spotlight quà 100 xu: lấy từ hiệu ứng spotlight MỚI NHẤT còn hiện,
  // không lấy theo giftFx (quà nhỏ tới sau sẽ thay giftFx nhưng spotlight
  // phải ở lại đủ 4,5 giây — xem ghi chú ở khối spotlight bên dưới).
  const spotFx = (s?.effects || []).filter((e) => e.kind === 'gift' && e.spotlight).pop()
  // Hiệu ứng đẩy theo tỉ lệ (luật chốt 14:58): quà to → rung mạnh + nhân
  // vật bị đẩy ngửa thêm; quà nhỏ → rung nhẹ; tim/follow → chỉ nhích vạch.
  const likeFx = (s?.effects || []).filter((e) => e.kind === 'like' || e.kind === 'follow').pop()
  // LẬT KÈO + tim: dùng cho cột hiệu ứng giữa màn (xem .nvb-fxstack).
  const flipFx = (s?.effects || []).find((e) => e.kind === 'flip')
  const likeOnlyFx = (s?.effects || []).filter((e) => e.kind === 'like').pop()
  const jolt = giftFx ? (giftFx.big ? 'big' : 'small') : (likeFx ? 'tiny' : null)
  const joltTeam = (giftFx || likeFx)?.team || null
  const joltId = (giftFx || likeFx)?.id || ''
  // Ăn mừng quà 100 xu: phe nhận spotlight (team + id của hiệu ứng) nhảy
  // clip Cheer + phát sáng vàng 4,5s, khớp thời gian spotlight. Phe còn
  // lại giữ dáng cũ. ?celebrate=a|b — khóa ăn mừng liên tục để chụp ảnh
  // kiểm tra (không ảnh hưởng luật chơi, không có param thì theo spotlight).
  const celebrateParam = new URLSearchParams(window.location.search).get('celebrate')
  const celebrateTeam = celebrateParam === 'a' ? 'A' : celebrateParam === 'b' ? 'B' : (spotFx?.team || null)
  const celebrateId = celebrateParam ? 'perm' : (spotFx?.id || '')
  const bxh = s?.bxh || { gifters: [], likers: [] }
  const hasBxh = (bxh.gifters?.length || 0) > 0 || (bxh.likers?.length || 0) > 0
  const winnerName = (teamId) => (teamId === 'A' ? 'GIRL' : 'BOY')

  // Đo đáy bảng hướng dẫn → --nvb-guide-bottom (xem ghi chú ở trên).
  const stageRef = useRef(null)
  const guideRef = useRef(null)
  useEffect(() => {
    const stage = stageRef.current
    const guide = guideRef.current
    if (!stage || !guide) return undefined
    const update = () => {
      const sr = stage.getBoundingClientRect()
      const gr = guide.getBoundingClientRect()
      stage.style.setProperty('--nvb-guide-bottom', `${Math.round(gr.bottom - sr.top)}px`)
    }
    update()
    const ro = new ResizeObserver(update)
    ro.observe(guide)
    window.addEventListener('resize', update)
    return () => { ro.disconnect(); window.removeEventListener('resize', update) }
  }, [phase])

  return (
    <div className="pml-app" data-version={APP_VERSION}>
      <div className="pml-stage nvb" ref={stageRef}>
        <BattleScene
          rope={previewRope ?? rope}
          scoreA={scoreA} scoreB={scoreB}
          countA={s?.teamCounts?.A || 0} countB={s?.teamCounts?.B || 0}
          winsA={teamA?.roundWins || 0} winsB={teamB?.roundWins || 0}
          matchWinsA={s?.matchWins?.A || 0} matchWinsB={s?.matchWins?.B || 0}
          round={s?.round || 1} timeLeft={s?.roundTimeLeft || 0} phase={phase}
          jolt={jolt} joltTeam={joltTeam} joltId={joltId}
          celebrateTeam={celebrateTeam} celebrateId={celebrateId}
        />

        {/* Góc trên phải để trống cho gọn (2026-11-21 19:25): nút loa +
             nút Cách chơi đã thu nhỏ, chuyển xuống thanh dưới cùng. */}

        {/* Bảng hướng dẫn gọn — dời lên 100px (nút góc trên đã xuống dưới)
             và siết chặt (font 12, padding 5px) để thêm 2 dòng quà 100 xu
             mà đáy bảng vẫn trên pill TEAM: bảng kết thúc ~251px, pill
             TEAM neo ngay dưới đáy bảng (xem --nvb-guide-bottom). Luôn
             hiện (trừ lúc đếm ngược 3s và lúc banner thắng chiếm giữa màn),
             bấm "Cách chơi" ở thanh dưới để xem bản đầy đủ. */}
        {phase !== 'roundEnd' && phase !== 'matchEnd' && phase !== 'countdown' && (
          <div className="nvb-guide" aria-label="Cách chơi" ref={guideRef}>
            {GUIDE_ROWS.map((r, i) => r.wide ? (
              <span key={i} className={`nvb-guide-cell wide ${r.center ? 'center' : ''} ${r.side === 'A' ? 'pink' : r.side === 'B' ? 'blue' : 'both'}`}>
                {r.label ? (
                  <><span className="nvb-guide-ic" aria-hidden="true">💯</span><span><b>{r.label}</b> {r.list}</span></>
                ) : (
                  <><span className="nvb-guide-ic" aria-hidden="true"><GuideIcon row={r} /></span><span>{r.left} <b>→ {r.right}</b></span></>
                )}
              </span>
            ) : (
              <span key={i} className={`nvb-guide-cell ${r.side === 'A' ? 'pink' : r.side === 'B' ? 'blue' : 'both'}`}>
                <span className="nvb-guide-ic" aria-hidden="true"><GuideIcon row={r} /></span>
                <span>{r.left} <b>→ {r.right}</b></span>
              </span>
            ))}
          </div>
        )}

        {/* Đếm ngược */}
        {phase === 'countdown' && (
          <div className="pml-countdown">{countdown > 0 ? countdown : 'ĐẨY!'}</div>
        )}

        {/* ── Cột hiệu ứng giữa màn: 3 khe cố định xếp dọc, không đè nhau ──
             Khe 1: toast vào xem/follow/chia sẻ (hoặc tim +10 nếu không có
             toast). Khe 2: quà — spotlight 100 xu ưu tiên nhất, rồi tên
             quà to (pháo hoa), rồi quà nhỏ. Khe 3: LẬT KÈO ở dưới cùng.
             Cột bắt đầu ngay dưới bảng hướng dẫn (278px) nên không che
             bảng; vòng spotlight nằm đúng khe giữa 2 mặt nhân vật; LẬT
             KÈO ở dưới nên không che mặt. Khe trống vẫn giữ chỗ nên hiệu
             ứng hiện/mất không làm các hiệu ứng khác nhảy lên xuống. */}
        <div className="nvb-fxstack">
          <div className="nvb-fxslot pill">
            {toastFx ? (
              <div className="pml-toast" key={toastFx.id}>{toastFx.text}</div>
            ) : likeOnlyFx ? (
              <div className="pml-timeflash"><Heart size={15} fill="currentColor" /> +10 lực kéo!</div>
            ) : null}
          </div>
          <div className="nvb-fxslot gift">
            {spotFx ? (
              <div className="nvb-spot" key={spotFx.id}>
                <div className="nvb-spot-ring">
                  <SpotAvatar avatar={spotFx.avatar} name={spotFx.sender} team={spotFx.team} />
                  <span className="nvb-spot-heart h1"><Heart size={16} fill="currentColor" /></span>
                  <span className="nvb-spot-heart h2"><Heart size={14} fill="currentColor" /></span>
                  <span className="nvb-spot-heart h3"><Heart size={14} fill="currentColor" /></span>
                  <span className="nvb-spot-heart h4"><Heart size={16} fill="currentColor" /></span>
                  <span className="nvb-spot-heart h5"><Heart size={14} fill="currentColor" /></span>
                  <span className="nvb-spot-heart h6"><Heart size={14} fill="currentColor" /></span>
                </div>
                <div className="nvb-spot-name">{spotFx.sender}</div>
                <div className="nvb-spot-sub">tặng {spotFx.gift || 'quà 100 xu'} · <Zap size={13} /> {Math.round(spotFx.power)} điểm</div>
              </div>
            ) : giftFx && giftFx.big ? (
              <div className="pml-fireworks-name" key={giftFx.id}>
                <div className="fw-crown"><Sparkles size={26} /> <GiftIcon gift={giftFx.gift} size={56} className="fw-gift-ic" /></div>
                <div className="fw-name">{giftFx.sender}</div>
                <div className="fw-sub">tặng {giftFx.gift || 'quà to'} · <Zap size={14} /> {Math.round(giftFx.power)} điểm!</div>
              </div>
            ) : giftFx ? (
              <div className="pml-gift" key={giftFx.id}>
                <div className="pml-gift-box">
                  <span className="pml-gift-sticker"><GiftIcon gift={giftFx.gift} size={40} /></span>
                  <span className="pml-gift-spark"><Sparkles size={22} /></span>
                </div>
                <div className="pml-gift-name">{giftFx.sender}</div>
                <div className="pml-gift-sub">tặng {giftFx.gift || 'quà'} · <Zap size={13} /> {Math.round(giftFx.power)} điểm</div>
              </div>
            ) : null}
          </div>
          <div className="nvb-fxslot flip">
            {phase === 'pulling' && flipFx ? (
              <div className="pml-flip">LẬT KÈO! {flipFx.sender || 'Ai đó'} 1 món quà cân cả phe kia!</div>
            ) : null}
          </div>
        </div>
        {/* Tia pháo hoa (chỉ tia nổ, không chữ) phủ toàn màn khi quà to —
             chữ tên người tặng nằm trong khe quà của cột hiệu ứng, không
             đè lên spotlight hay LẬT KÈO. */}
        {giftFx && giftFx.big && !giftFx.spotlight && (
          <div className="pml-fireworks" key={`fw-${giftFx.id}`}>
            <span className="fw-burst fw-1" />
            <span className="fw-burst fw-2" />
            <span className="fw-burst fw-3" />
            <span className="fw-burst fw-4" />
            <span className="fw-burst fw-5" />
          </div>
        )}

        {/* Thắng màn / vô địch: chữ to giữa màn hình */}
        {phase === 'roundEnd' && s?.roundWinner && (
          <div className="nvb-win">
            <div className={`nvb-win-word ${s.roundWinner === 'A' ? 'pink' : 'blue'}`}>{winnerName(s.roundWinner)} THẮNG!</div>
            <div className="nvb-win-sub">{TEAMS.A.name} {teamA?.roundWins || 0} — {teamB?.roundWins || 0} {TEAMS.B.name} · Màn {s.round + 1} sau {Math.max(0, Math.ceil(s.nextRoundIn || 0))}s…</div>
          </div>
        )}
        {phase === 'roundEnd' && !s?.roundWinner && (
          <div className="pml-result-banner">Hòa màn {s?.round}! · Màn {s.round + 1} sau {Math.max(0, Math.ceil(s.nextRoundIn || 0))}s…</div>
        )}
        {phase === 'matchEnd' && s?.matchWinner && (
          <div className="nvb-win">
            <div className={`nvb-win-word ${s.matchWinner === 'A' ? 'pink' : 'blue'}`}>{winnerName(s.matchWinner)} VÔ ĐỊCH!</div>
            <div className="nvb-win-sub"><Trophy size={16} /> {TEAMS.A.name} {teamA?.roundWins || 0} — {teamB?.roundWins || 0} {TEAMS.B.name} · WIN {s?.matchWins?.A || 0}–{s?.matchWins?.B || 0} · Trận mới sau {Math.max(0, Math.ceil(s.matchEndIn || 0))}s…</div>
          </div>
        )}

        {/* BXH nhỏ: ai tặng quà nhiều nhất */}
        {hasBxh && phase !== 'waiting' && (
          <div className="pml-bxh">
            <div className="pml-bxh-title"><Trophy size={15} /> BXH TẶNG QUÀ</div>
            {(bxh.gifters?.length || 0) > 0 && (
              <div className="pml-bxh-sec">
                {bxh.gifters.map((g, i) => (
                  <div className="pml-bxh-row" key={`g${i}`}>
                    <span className={`pml-bxh-rank r${i + 1}`}>{i + 1}</span>
                    <span className="pml-bxh-name">{g.nickname}</span>
                    <span className="pml-bxh-val"><Zap size={12} /> {Math.round(g.power)}</span>
                  </div>
                ))}
              </div>
            )}
            {(bxh.likers?.length || 0) > 0 && (
              <div className="pml-bxh-sec">
                <div className="pml-bxh-head"><Heart size={13} fill="currentColor" /> Thả tim nhiều nhất</div>
                {bxh.likers.map((g, i) => (
                  <div className="pml-bxh-row" key={`l${i}`}>
                    <span className={`pml-bxh-rank r${i + 1}`}>{i + 1}</span>
                    <span className="pml-bxh-name">{g.nickname}</span>
                    <span className="pml-bxh-val"><Heart size={12} fill="currentColor" /> {g.likes}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tạm dừng */}
        {s?.paused && (
          <div className="pml-result-banner"><Pause size={15} /> Tạm dừng — bình luận TIẾP để chơi tiếp</div>
        )}

        {/* Chờ bắt đầu: thẻ nhỏ ở dưới, chạm đâu cũng bắt đầu */}
        {phase === 'waiting' && !s?.paused && (
          <>
            <div className="pml-wait-tap" onClick={game.start} />
            <div className="pml-wait-card" onClick={game.start}>
              <div className="pml-wait-go">{autoPlay ? 'Đang tự động bắt đầu…' : 'Chạm màn hình để bắt đầu!'}</div>
              {s?.pendingJoins > 0 && <div className="pml-wait-sub">{s.pendingJoins} bạn đang chờ vào phe</div>}
            </div>
          </>
        )}

        {/* Hướng dẫn */}
        {guideOpen && (
          <div className="pml-guide">
            <button className="pml-guide-x" onClick={() => setGuideOpen(false)} aria-label="Đóng hướng dẫn"><X size={18} /></button>
            <h3><BookOpen size={17} /> CÁCH CHƠI</h3>
            <p><Gift size={14} /> Tặng quà — <b>chính món quà quyết định đẩy bên nào</b>: hoa hồng → đẩy <b>Nữ</b>; quà TikTok → đẩy <b>Nam</b>; nước hoa (20 xu) → đẩy <b>Nam</b>; bánh vòng (30 xu) → đẩy <b>Nữ</b>. Quà 100 xu cũng gán cố định: bó hoa, thả tim, tim, hộp quà, buổi sáng, cuối tuần, hạc giấy → <b>Nữ</b>; tay cầm, súng tiền, GG siêu khủng, mũ ria mép, thiên hà, ú òa, corgi → <b>Nam</b>. Điểm theo giá quà: 1 xu = 1 · 5 xu = 5 · 10 xu = 10 · 20 xu = 25 · 99 xu = <b>100 điểm!</b> Quà khác bảng thì tính cho phe đang thua.</p>
            <p><Zap size={14} /> Vạch giữa chạy theo chênh lệch điểm — phe nào mạnh hơn sẽ đẩy phe kia qua. Chạm mép bên kia là thắng màn ngay. Hết 60 giây thì phe điểm cao hơn thắng.</p>
            <p><Heart size={14} fill="currentColor" /> Thả tim — <b>mỗi người thả đủ 100 tim thì +10 cho Nữ</b> (tối đa +60/màn). Tim không đẩy cho Nam.</p>
            <p><Users size={14} /> Theo dõi — <b>1 lượt follow = +10 cho Nam</b> (tối đa +60/màn).</p>
            <p><MessageCircle size={14} /> Bình luận — cmt <b>boy/nam +1 cho Nam</b>, <b>girl/nữ +1 cho Nữ</b> (đẩy ngay mỗi bình luận, không cần vào đội).</p>
            <p><Trophy size={14} /> Thắng 2 màn trước thì vô địch trận (best of 3 — tối đa 3 màn).</p>
          </div>
        )}

        {/* Thanh dưới — 1 hàng: 3 ô thông tin + 2 nút nhỏ (loa + Cách
             chơi, thu nhỏ 28px, chuyển từ góc trên xuống đây 2026-11-21
             19:25 theo lệnh tấn). Ô điểm rút gọn "Nữ 310 · Nam 226". */}
        <div className="pml-bottombar">
          <span>Nữ {scoreA} · Nam {scoreB}</span>
          <span><Heart size={14} fill="currentColor" /> {s?.likes || 0}</span>
          <span>{connected ? <><span className="pml-dot on sm" /> Đã nối live</> : <><span className="pml-dot sm" /> Chưa nối live</>}</span>
          <button className="pml-bb-btn" onClick={game.toggleMute} aria-label="Bật/tắt tiếng">
            {muted ? <VolumeX size={14} /> : <Volume2 size={14} />}
          </button>
          {!present && <button className="pml-bb-btn" onClick={() => setGuideOpen(!guideOpen)} aria-label="Cách chơi"><BookOpen size={14} /></button>}
        </div>
      </div>
    </div>
  )
}
