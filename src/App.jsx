// ─── NAM vs NỮ LIVE · App.jsx ──────────────────────────────────────────────
// Màn LIVE (/) — 2D THUẦN, giống ảnh mẫu TikTok GIRL vs BOY. CHỈ hiển thị.

import { useEffect, useState } from 'react'
import {
  BookOpen, Gift, Heart, MessageCircle, Pause, Sparkles, Star, Trophy,
  Users, Volume2, VolumeX, X, Zap,
} from 'lucide-react'
import BattleScene from './components/BattleScene'
import GiftIcon from './components/GiftIcon'
import AdminPage from './AdminPage'
import { useTugOfWar } from './game/useTugOfWar'
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

  const s = snap
  const connected = wsStatus === WS_STATUS.OPEN
  const phase = s?.phase || 'waiting'
  // TREO MÁY (mặc định BẬT): thẻ chờ không bắt buộc chạm nữa.
  const autoPlay = s?.settings?.autoPlay !== false
  const countdown = s ? Math.ceil(s.countdown) : 3
  const rope = s?.rope ?? 0
  const teamA = s?.teams?.A
  const teamB = s?.teams?.B
  const roundTimeLeft = s ? Math.max(0, Math.ceil(s.roundTimeLeft || 0)) : 0
  // Điểm hiển thị: tổng lực quà + số người vào phe (vào phe là +1 điểm ngay).
  // Điểm hiển thị = ĐIỂM MÀN (chỉ cộng lên, reset 0-0 mỗi màn).
  const scoreA = Math.round(s?.roundScore?.A || 0)
  const scoreB = Math.round(s?.roundScore?.B || 0)
  const toastFx = (s?.effects || []).filter((e) => e.kind === 'toast').pop()
  const giftFx = (s?.effects || []).filter((e) => e.kind === 'gift').pop()
  // Hiệu ứng đẩy theo tỉ lệ (luật chốt 14:58): quà to → rung mạnh + nhân
  // vật bị đẩy ngửa thêm; quà nhỏ → rung nhẹ; tim/follow → chỉ nhích vạch.
  const likeFx = (s?.effects || []).filter((e) => e.kind === 'like' || e.kind === 'follow').pop()
  const jolt = giftFx ? (giftFx.big ? 'big' : 'small') : (likeFx ? 'tiny' : null)
  const joltTeam = (giftFx || likeFx)?.team || null
  const joltId = (giftFx || likeFx)?.id || ''
  const bxh = s?.bxh || { gifters: [], likers: [] }
  const hasBxh = (bxh.gifters?.length || 0) > 0 || (bxh.likers?.length || 0) > 0
  const winnerName = (teamId) => (teamId === 'A' ? 'GIRL' : 'BOY')

  return (
    <div className="pml-app" data-version={APP_VERSION}>
      <div className="pml-stage nvb">
        <BattleScene
          rope={rope}
          scoreA={scoreA} scoreB={scoreB}
          countA={s?.teamCounts?.A || 0} countB={s?.teamCounts?.B || 0}
          winsA={teamA?.roundWins || 0} winsB={teamB?.roundWins || 0}
          matchWinsA={s?.matchWins?.A || 0} matchWinsB={s?.matchWins?.B || 0}
          round={s?.round || 1} timeLeft={s?.roundTimeLeft || 0} phase={phase}
          jolt={jolt} joltTeam={joltTeam} joltId={joltId}
        />

        {/* Nút tiếng + hướng dẫn (góc trên, không che pill điểm) */}
        <div className="nvb-controls">
          <span className={`pml-dot ${connected ? 'on' : ''}`} title={connected ? 'Đã nối TikTok LIVE' : 'Chưa nối TikTok'} />
          <button className="pml-iconbtn" onClick={game.toggleMute} aria-label="Bật/tắt tiếng">
            {muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
          </button>
          {!present && <button className="pml-helpbtn" onClick={() => setGuideOpen(!guideOpen)}><BookOpen size={14} /> Cách chơi</button>}
        </div>

        {/* Đếm ngược */}
        {phase === 'countdown' && (
          <div className="pml-countdown">{countdown > 0 ? countdown : 'ĐẨY!'}</div>
        )}

        {/* Lật kèo */}
        {phase === 'pulling' && (s?.effects || []).some((e) => e.kind === 'flip') && (
          <div className="pml-flip">LẬT KÈO! {(s.effects.find((e) => e.kind === 'flip') || {}).sender || 'Ai đó'} 1 món quà cân cả phe kia!</div>
        )}

        {/* Tim cộng giờ */}
        {phase === 'pulling' && (s?.effects || []).some((e) => e.kind === 'like') && (
          <div className="pml-timeflash"><Heart size={15} fill="currentColor" /> +10 lực kéo!</div>
        )}

        {/* Ai vào xem / theo dõi / chia sẻ: 2 giây */}
        {toastFx && (
          <div className="pml-toast" key={toastFx.id}>{toastFx.text}</div>
        )}

        {/* Hiệu ứng tặng quà: nhỏ 2s, to (≥25) tên vàng + pháo hoa 3,5s */}
        {giftFx && !giftFx.big && (
          <div className="pml-gift" key={giftFx.id}>
            <div className="pml-gift-box">
              <span className="pml-gift-sticker"><GiftIcon gift={giftFx.gift} size={64} /></span>
              <span className="pml-gift-spark"><Sparkles size={22} /></span>
            </div>
            <div className="pml-gift-name">{giftFx.sender}</div>
            <div className="pml-gift-sub">tặng {giftFx.gift || 'quà'} · <Zap size={13} /> {Math.round(giftFx.power)} điểm</div>
          </div>
        )}
        {giftFx && giftFx.big && (
          <div className="pml-fireworks" key={giftFx.id}>
            <span className="fw-burst fw-1" />
            <span className="fw-burst fw-2" />
            <span className="fw-burst fw-3" />
            <span className="fw-burst fw-4" />
            <span className="fw-burst fw-5" />
            <div className="pml-fireworks-name">
              <div className="fw-crown"><Sparkles size={26} /> <GiftIcon gift={giftFx.gift} size={56} className="fw-gift-ic" /></div>
              <div className="fw-name">{giftFx.sender}</div>
              <div className="fw-sub">tặng {giftFx.gift || 'quà to'} · <Zap size={14} /> {Math.round(giftFx.power)} điểm!</div>
            </div>
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
              <div className="pml-wait-line"><Gift size={14} /> Hoa hồng → đẩy <b>Nữ</b> · Quà TikTok → đẩy <b>Nam</b> · <Heart size={14} fill="currentColor" /> 100 tim = +10 cho <b>Nữ</b> · <Users size={14} /> 1 follow = +10 cho <b>Nam</b></div>
              <div className="pml-wait-line">Phe nào tặng quà nhiều hơn sẽ đẩy phe kia — chạm mép bên kia là thắng 1 màn, thắng 2 màn là vô địch! Cmt <b>boy/nam +1 cho Nam</b> · <b>girl/nữ +1 cho Nữ</b>.</div>
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
            <p><Gift size={14} /> Tặng quà — <b>chính món quà quyết định đẩy bên nào</b>: hoa hồng, rosa, cỏ bốn lá, nước hoa, quả đào, hạc giấy → đẩy <b>Nữ</b>; quà TikTok, kem ốc quế, bing chilling, nhạc, gg → đẩy <b>Nam</b>. Điểm theo giá quà: 1 xu = 1 · 5 xu = 5 · 10 xu = 10 · 20 xu = 25 · 99 xu = <b>100 điểm!</b> Quà khác bảng thì tính cho phe đang thua.</p>
            <p><Zap size={14} /> Vạch giữa chạy theo chênh lệch điểm — phe nào mạnh hơn sẽ đẩy phe kia qua. Chạm mép bên kia là thắng màn ngay. Hết 60 giây thì phe điểm cao hơn thắng.</p>
            <p><Heart size={14} fill="currentColor" /> Thả tim — <b>mỗi người thả đủ 100 tim thì +10 cho Nữ</b> (tối đa +60/màn). Tim không đẩy cho Nam.</p>
            <p><Users size={14} /> Theo dõi — <b>1 lượt follow = +10 cho Nam</b> (tối đa +60/màn).</p>
            <p><MessageCircle size={14} /> Bình luận — cmt <b>boy/nam +1 cho Nam</b>, <b>girl/nữ +1 cho Nữ</b> (đẩy ngay mỗi bình luận, không cần vào đội).</p>
            <p><Trophy size={14} /> Thắng 2 màn trước thì vô địch trận (best of 3 — tối đa 3 màn).</p>
          </div>
        )}

        {/* Thanh dưới */}
        <div className="pml-bottombar">
          <span><Users size={14} /> Nữ {scoreA} điểm · Nam {scoreB} điểm</span>
          <span><Heart size={14} fill="currentColor" /> {s?.likes || 0}</span>
          <span>Màn {s?.round || 1} · {phase === 'pulling' ? `${roundTimeLeft}s` : phase === 'countdown' ? '…' : '—'}</span>
          <span>{connected ? <><span className="pml-dot on sm" /> Đã nối live</> : <><span className="pml-dot sm" /> Chưa nối live</>}</span>
        </div>
      </div>
    </div>
  )
}
