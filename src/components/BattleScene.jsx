// ─── NAM vs NỮ LIVE · BattleScene.jsx ──────────────────────────────────────
// Màn battle (giống ảnh mẫu TikTok LIVE GIRL vs BOY): nền chia đôi dọc HỒNG
// (trái) / XANH (phải), lửa 2D sau lưng, pill điểm GIRL/BOY + số đen, badge
// LIVE đỏ giữa, 2 nhân vật 3D KayKit (Nữ Rogue + Nam Knight, CC0) đứng đối
// mặt nhau ngay vạch giữa — phe dẫn thì ĐẨY, phe bị đẩy thì PHÒNG THỦ
// (xem src/components/ThreeFighters.jsx). Nếu WebGL/GLB load lỗi thì tự
// về lại 2 nhân vật blocky 2D tự vẽ (dự phòng, không bao giờ màn trắng).
// Vạch giữa (ranh giới hồng/xanh) chạy theo rope (-1..+1): phe nào mạnh hơn
// thì đẩy vạch sang phía phe kia; chạm mép (±0,9) là thắng màn.
import { useEffect, useRef, useState } from 'react'
import ThreeFighters from './ThreeFighters'
import { fighterFractions } from '../game/stage3d.js'
import { blockyLeanForSide, nextAttackState, nextPressureState, isAttacking, isPressuring } from '../game/poses.js'

function Flame({ className, style }) {
  return (
    <svg className={className} style={style} viewBox="0 0 60 120" aria-hidden="true">
      <path d="M30 4 C36 26 52 40 52 76 A22 22 0 1 1 8 76 C8 40 24 26 30 4 Z" fill="currentColor" />
      <path d="M30 46 C35 60 44 66 44 84 A14 14 0 1 1 16 84 C16 66 25 60 30 46 Z" fill="rgba(255,255,255,.30)" />
    </svg>
  )
}

// Nhân vật blocky 2D tự vẽ: đầu vuông, thân chữ nhật, 2 tay đưa ra trước
// như đang đẩy đối thủ. Nữ: tóc đuôi ngựa cao, áo đấu xanh đậm/sọc đỏ.
// Nam: tóc đen ngắn, áo đấu trắng.
function Blocky({ side, lean }) {
  const isGirl = side === 'girl'
  return (
    <div className={`nvb-char ${isGirl ? 'girl' : 'boy'}`} style={{ transform: `rotate(${lean}deg)` }}>
      {isGirl && <div className="nvb-ponytail" />}
      <div className="nvb-head">
        {isGirl && <div className="nvb-hair-girl" />}
        {!isGirl && <div className="nvb-hair-boy" />}
        <div className="nvb-eye left" />
        <div className="nvb-eye right" />
        <div className="nvb-smile" />
        <div className="nvb-blush left" />
        <div className="nvb-blush right" />
      </div>
      <div className="nvb-body">
        <div className={`nvb-arm ${isGirl ? 'arm-girl' : 'arm-boy'} front`} />
        <div className={`nvb-arm ${isGirl ? 'arm-girl' : 'arm-boy'} back`} />
        <div className="nvb-torso">
          {isGirl ? <span className="nvb-num">10</span> : <span className="nvb-num">9</span>}
        </div>
      </div>
      <div className="nvb-legs">
        <div className="nvb-leg left" />
        <div className="nvb-leg right" />
        <div className="nvb-shoe left" />
        <div className="nvb-shoe right" />
      </div>
    </div>
  )
}

export default function BattleScene({ rope = 0, scoreA = 0, scoreB = 0, countA = 0, countB = 0, winsA = 0, winsB = 0, matchWinsA = 0, matchWinsB = 0, round = 1, timeLeft = 60, phase = 'waiting', jolt = null, joltTeam = null, joltId = '', celebrateTeam = null, celebrateId = '', attackTeam = null, attackId = '', attackMs = 1000, pressureTeam = null, pressureId = '' }) {
  // Vạch giữa: 50% khi hòa, chạy tới 90,5% khi Nữ thắng hẳn, 9,5% khi Nam thắng hẳn.
  // Tỉ lệ đẩy (ngưỡng thắng chênh 100 điểm): cmt +1 → vạch nhích 0,45% (tí xíu),
  // 100 tim/follow +10 → nhích 4,5%, quà to 100 → vọt 45% tới sát mép.
  const divider = 50 + rope * 45
  // Nhân vật 3D đã load xong chưa — chưa xong / load lỗi thì hiện blocky 2D
  // dự phòng để màn không bao giờ trống nhân vật.
  const [threeOk, setThreeOk] = useState(false)
  // Tỉ lệ màn (rộng/cao) để đặt nhãn GIRL/BOY đúng dưới nhân vật 3D:
  // nhãn tính bằng cùng công thức vị trí với canvas (stage3d.js) nên vạch
  // chạy tới mép nhãn vẫn nằm đúng dưới người, chỉ kẹp trong màn hình.
  const [aspect, setAspect] = useState(() => (typeof window !== 'undefined' ? window.innerWidth / Math.max(window.innerHeight, 1) : 0.462))
  useEffect(() => {
    const onResize = () => setAspect(window.innerWidth / Math.max(window.innerHeight, 1))
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])
  const fracs = fighterFractions(divider, aspect)
  // Nhãn rộng ~54px → tâm nhãn = vị trí nhân vật, kẹp 6px mỗi mép.
  const plateStyle = (f) => ({ left: `clamp(6px, calc(${f * 100}% - 61px), calc(100% - 128px))` })
  const plateLabelStyle = (f) => ({ left: `clamp(6px, calc(${f * 100}% - 27px), calc(100% - 60px))` })
  // Nghiêng người (chỉ dùng cho nhân vật blocky dự phòng): phe vừa được
  // tặng thì chúi mạnh về trước (tấn công), phe kia ngả mạnh về sau
  // (phòng thủ); không có quà mới thì theo thế trận như cũ. Quà TO (jolt
  // big) thì phe bị đẩy ngửa thêm 14° + rung màn hình mạnh; quà nhỏ rung
  // nhẹ; cmt/tim chỉ nhích vạch (không rung). Hết ~1–1,5s không có quà
  // mới thì về dáng theo thế trận (snap về mỗi ~200ms nên hết giờ là thấy).
  const attackRef = useRef({ team: null, until: 0, lastId: '' })
  const pressureRef = useRef({ team: null, until: 0, lastId: '' })
  pressureRef.current = nextPressureState(pressureRef.current, pressureId ? { team: pressureTeam, id: pressureId } : null, Date.now())
  const pressuringTeam = isPressuring(pressureRef.current, pressureRef.current.team, Date.now()) ? pressureRef.current.team : null
  attackRef.current = nextAttackState(attackRef.current, attackId ? { team: attackTeam, id: attackId, ms: attackMs } : null, Date.now(), pressuringTeam)
  const attackingTeam = pressuringTeam || (isAttacking(attackRef.current, attackRef.current.team, Date.now()) ? attackRef.current.team : null)
  const girlLean = blockyLeanForSide('A', rope, attackingTeam) + (jolt === 'big' && joltTeam === 'B' ? 14 : 0)
  const boyLean = blockyLeanForSide('B', rope, attackingTeam) - (jolt === 'big' && joltTeam === 'A' ? 14 : 0)
  const girlAttacking = attackingTeam === 'A' && celebrateTeam !== 'A'
  const boyAttacking = attackingTeam === 'B' && celebrateTeam !== 'B'
  const girlDefending = attackingTeam === 'B' && celebrateTeam !== 'A'
  const boyDefending = attackingTeam === 'A' && celebrateTeam !== 'B'
  const leading = rope > 0.05 ? 'A' : rope < -0.05 ? 'B' : null
  return (
    <div className="nvb-stage" aria-label="Nam vs Nữ">
      {/* Nền chia đôi theo vạch giữa */}
      <div className="nvb-half pink" style={{ width: `${divider}%` }} />
      <div className="nvb-half blue" style={{ left: `${divider}%`, width: `${100 - divider}%` }} />
      <div className="nvb-divider" style={{ left: `${divider}%` }} />

      {/* Lửa 2D sau lưng mỗi bên: lớp tối (bóng lửa) + lớp sáng */}
      <div className="nvb-flames left" style={{ width: `${divider}%` }}>
        <Flame className="nvb-flame dark" style={{ left: '2%', bottom: '4%', height: '62%', color: '#6d0a3d' }} />
        <Flame className="nvb-flame dark" style={{ left: '34%', bottom: '0%', height: '78%', color: '#5c0836' }} />
        <Flame className="nvb-flame dark" style={{ right: '0%', bottom: '8%', height: '52%', color: '#8f0f4d' }} />
        <Flame className="nvb-flame bright" style={{ left: '12%', bottom: '0%', height: '56%', color: '#ff8fc0' }} />
        <Flame className="nvb-flame bright" style={{ left: '46%', bottom: '0%', height: '68%', color: '#ff5fa2' }} />
        <Flame className="nvb-flame bright" style={{ right: '8%', bottom: '0%', height: '46%', color: '#ffc7e0' }} />
        <Flame className="nvb-flame bright" style={{ left: '68%', bottom: '0%', height: '38%', color: '#d1006b' }} />
      </div>
      <div className="nvb-flames right" style={{ left: `${divider}%`, width: `${100 - divider}%` }}>
        <Flame className="nvb-flame dark" style={{ left: '4%', bottom: '6%', height: '56%', color: '#083a5e' }} />
        <Flame className="nvb-flame dark" style={{ left: '38%', bottom: '0%', height: '76%', color: '#062a45' }} />
        <Flame className="nvb-flame dark" style={{ right: '2%', bottom: '8%', height: '54%', color: '#0a4d80' }} />
        <Flame className="nvb-flame bright" style={{ left: '16%', bottom: '0%', height: '52%', color: '#7dd8ff' }} />
        <Flame className="nvb-flame bright" style={{ left: '50%', bottom: '0%', height: '66%', color: '#2ec5f5' }} />
        <Flame className="nvb-flame bright" style={{ right: '10%', bottom: '0%', height: '44%', color: '#c8f1ff' }} />
        <Flame className="nvb-flame bright" style={{ left: '70%', bottom: '0%', height: '36%', color: '#0a6fc0' }} />
      </div>

      {/* Nhãn TEAM G / TEAM B ở 2 mép (như ảnh mẫu) */}
      <div className="nvb-teamtag left">🌹 TEAM G</div>
      <div className="nvb-teamtag right">🎵 TEAM B</div>

      {/* 2 nhân vật 3D KayKit đứng sát vạch giữa, đối mặt nhau (canvas trong
           suốt phủ lên nền). Rung màn hình theo quà nằm trong ThreeFighters.
           Tên GIRL/BOY giữ dạng HTML để luôn đọc được, kể cả khi 3D lỗi.
           Nhãn kẹp trong màn hình (max/min) để vạch chạy tới mép thì tên
           không bị cắt nửa như trước. */}
      <ThreeFighters rope={rope} divider={divider} jolt={jolt} joltId={joltId} celebrateTeam={celebrateTeam} celebrateId={celebrateId} attackTeam={attackTeam} attackId={attackId} attackMs={attackMs} pressureTeam={pressureTeam} pressureId={pressureId} onStatus={(s) => setThreeOk(s === 'ready')} />
      {/* Khung nhân vật dự phòng 2D (chỉ hiện khi 3D lỗi) — giữ đáy cũ để
           nhân vật dự phòng không bị trôi lên. Phe nhận quà 100 xu cũng
           nhảy ăn mừng (CSS) cho giống bản 3D; phe vừa được tặng thì lao
           về trước (tấn công), phe kia ngả về sau (phòng thủ). */}
      <div className={`nvb-char-wrap girl${celebrateTeam === 'A' ? ' nvb-celebrating' : ''}${girlAttacking ? ' nvb-attacking' : ''}${girlDefending ? ' nvb-defending' : ''}`} style={plateStyle(fracs.girl)}>
        {!threeOk && <Blocky side="girl" lean={girlLean} />}
      </div>
      <div className={`nvb-char-wrap boy${celebrateTeam === 'B' ? ' nvb-celebrating' : ''}${boyAttacking ? ' nvb-attacking' : ''}${boyDefending ? ' nvb-defending' : ''}`} style={plateStyle(fracs.boy)}>
        {!threeOk && <Blocky side="boy" lean={boyLean} />}
      </div>
      {/* Nhãn GIRL/BOY đứng RIÊNG (không nằm trong khung nhân vật nữa):
           đặt cao hơn (bottom 29%, ngay dưới chân nhân vật 3D) và nổi trên
           hộp BXH (z 7 > z 6) — trước đây nhãn nằm trong khung ở bottom
           22% nên hộp BXH mọc cao dần đã đè lên nhãn ở hàng 2. */}
      <div className="nvb-nameplate girl" style={plateLabelStyle(fracs.girl)}>GIRL</div>
      <div className="nvb-nameplate boy" style={plateLabelStyle(fracs.boy)}>BOY</div>

      {/* Pill điểm trên cùng — giống ảnh mẫu: [số đen] + GIRL hồng / BOY xanh + [số đen] */}
      <div className="nvb-topbar">
        <div className={`nvb-score-group ${leading === 'A' ? 'leading' : ''}`}>
          <span className="nvb-score-num">{scoreA}</span>
          <span className="nvb-pill pink">GIRL{'\u00a0'}{winsA > 0 ? '★'.repeat(winsA) : ''}</span>
        </div>
        <div className="nvb-live">● LIVE</div>
        <div className={`nvb-score-group ${leading === 'B' ? 'leading' : ''}`}>
          <span className="nvb-pill blue">BOY{'\u00a0'}{winsB > 0 ? '★'.repeat(winsB) : ''}</span>
          <span className="nvb-score-num">{scoreB}</span>
        </div>
      </div>
      {/* BỘ ĐẾM WIN — 2 góc trên, dưới pill điểm: số TRẬN vô địch tích lũy
           cả phiên (khác sao ★ là số màn thắng trong trận hiện tại).
           Vd Nam vô địch 2 trận, Nữ 0 trận → trái "WIN: 0", phải "WIN: 2". */}
      <div className="nvb-winrow">
        <span className={`nvb-winlabel pink ${matchWinsA > matchWinsB ? 'leading' : ''}`}>WIN: {matchWinsA}</span>
        <span className={`nvb-winlabel blue ${matchWinsB > matchWinsA ? 'leading' : ''}`}>WIN: {matchWinsB}</span>
      </div>
      <div className="nvb-roundline">MÀN {round} · {phase === 'pulling' ? `${Math.max(0, Math.ceil(timeLeft))}s` : phase === 'countdown' ? 'CHUẨN BỊ…' : phase === 'waiting' ? 'CHỜ BẮT ĐẦU' : '—'}</div>
    </div>
  )
}
