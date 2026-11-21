// ─── NAM vs NỮ LIVE · tests/tug.test.js (2D) ───────────────────────────────────────
// Test logic thuần (không cần framework): chạy bằng `node tests/tug.test.js`
// hoặc `npm test`. Mỗi test là 1 hàm assert, in PASS/FAIL rồi tổng kết.
// LUẬT CHỐT 2026-11-21: CHỈ quà mới đẩy (quà gán phe: hoa hồng→Nữ, TikTok→Nam,
// điểm theo giá 1/5/10/25/100) · 100 tim/người → +10 Nữ · 1 follow → +10 Nam ·
// cmt boy/nam +1 Nam, girl/nữ +1 Nữ (đẩy ngay, không vào đội, không +1 theo người).
import assert from 'node:assert'
import { poseForSide, posesForRope, glbUrlsFor, KEEP_ACCESSORIES, POSE_CLIPS, POSE_CELEBRATE, CELEBRATE_MS, isCelebrating, poseForSideWithCelebrate } from '../src/game/poses.js'
import { CHAR_OFFSET, VISIBLE_HALF_H, fighterFractions, fighterWorldPositions } from '../src/game/stage3d.js'
import { GUIDE_ROWS } from '../src/game/guide.js'
import { createSeqTracker, normalizeEvent, parseCommand } from '../src/game/adapter.js'
import { TikTokWS, WS_STATUS } from '../src/game/wsClient.js'
import { detectProvince, provinceInfo, provinceRank } from '../src/game/provinces.js'
import {
  DEFAULT_SETTINGS, GiftEngine, MEMBER_TYPES, TEAMS, advance, applyCheer, applyFollow, applyLikes,
  applyPull, clearBxh, createMatch, endRound, findMember, giftBoost, giftPrice, giftTeamFor, giftTier,
  giftTeam, isSpotlightGift, joinProvince, joinTeam, migrateGiftMap, parseTeamJoin, pushToast, recordGift, resetMatchWins, startMatch, startRound,
  syncProvinceTeams, teamLabel, provinceLeader, teamStrength, tick, topGifters, topLikers, topProvinces, topProvincesByComments, visibleMembers,
} from '../src/game/engine.js'

let pass = 0, fail = 0
const results = []
function test(name, fn) {
  try { fn(); pass++; results.push(`  ✅ ${name}`) }
  catch (e) { fail++; results.push(`  ❌ ${name}\n     → ${e.message}`) }
}
function freshMatch() {
  const s = createMatch({ ...DEFAULT_SETTINGS, giftMap: { ...DEFAULT_SETTINGS.giftMap } })
  joinTeam(s, 'A', 'Lan', 'lan')
  joinTeam(s, 'B', 'Minh', 'minh')
  startMatch(s)
  s.phase = 'pulling' // bỏ qua đếm ngược cho test
  s.roundTimeLeft = 45
  s.now = 10
  return s
}
function crowdMatch(aCount, bCount) {
  const s = createMatch({ ...DEFAULT_SETTINGS, giftMap: { ...DEFAULT_SETTINGS.giftMap } })
  for (let i = 0; i < aCount; i++) joinTeam(s, 'A', `A${i}`, `a${i}`)
  for (let i = 0; i < bCount; i++) joinTeam(s, 'B', `B${i}`, `b${i}`)
  startMatch(s)
  s.phase = 'pulling'
  s.roundTimeLeft = 45
  s.now = 10
  return s
}
function step(s, sec) { const n = Math.ceil(sec / 0.05); for (let i = 0; i < n; i++) tick(s, 0.05) }
const approx = (a, b, eps = 1e-6) => Math.abs(a - b) <= eps

// ── 1. Thành viên = lực kéo liên tục ───────────────────────────────────────
test('không còn +1 theo người: vào đội không tăng sức mạnh', () => {
  const s = freshMatch()
  assert.equal(teamStrength(s, 'A'), 0, 'chưa có quà thì sức mạnh = 0')
  joinTeam(s, 'A', 'Hoa', 'hoa')
  joinTeam(s, 'A', 'Mai', 'mai')
  assert.equal(teamStrength(s, 'A'), 0, 'thêm 2 người vẫn = 0 — chỉ quà/tim/follow/cmt mới đẩy')
  assert.equal(teamStrength(s, 'B'), 0)
})

test('đội đông người mà không có quà thì vạch giữa đứng yên', () => {
  const s = crowdMatch(10, 1)
  step(s, 8)
  assert.equal(s.phase, 'pulling', '10 người không quà thì chưa ai thắng')
  assert.ok(Math.abs(s.rope) < 0.05, `không quà thì dây ở giữa, được ${s.rope}`)
})
test('quà hoa hồng đẩy Nữ, quà TikTok đẩy Nam (bảng gán quà)', () => {
  const s = freshMatch()
  const eng = new GiftEngine(s)
  const r1 = eng.receive({ id: 'g1', giftName: 'hoa hồng', nickname: 'A', userId: 'a' })
  assert.equal(r1.teamId, 'A', 'hoa hồng → Nữ')
  const r2 = eng.receive({ id: 'g2', giftName: 'tiktok', nickname: 'B', userId: 'b' })
  assert.equal(r2.teamId, 'B', 'quà TikTok → Nam')
  const r3 = eng.receive({ id: 'g3', giftName: 'hạc giấy', nickname: 'C', userId: 'c' })
  assert.equal(r3.teamId, 'A', 'hạc giấy → Nữ')
  const r4 = eng.receive({ id: 'g4', giftName: 'bing chilling', nickname: 'D', userId: 'd' })
  assert.equal(r4.teamId, 'B', 'bing chilling → Nam')
  assert.equal(giftTeam(s, 'x', '', 'quà lạ không tên'), 'A', 'quà lạ → phe đang thua (vạch ở giữa thì về Nữ)')
  s.rope = 0.3
  assert.equal(giftTeam(s, 'x', '', 'quà lạ không tên'), 'B', 'vạch lệch về Nữ thì quà lạ đẩy Nam (phe thua)')
})

test('không ai kéo thì dây đứng yên ở giữa (2 đội ngang nhau)', () => {
  const s = freshMatch()
  step(s, 5)
  assert.ok(approx(s.rope, 0), `2 đội 1-1 thì dây ở giữa, được ${s.rope}`)
})

// ── 2. Quà = bùng lực, 99 xu = 100 người ───────────────────────────────────
test('hạc giấy 99 xu = 100 lực, tối đa 100/món', () => {
  assert.equal(giftBoost(100), 100)
  assert.equal(giftBoost(150), 100, 'vượt 100 thì cắt còn 100')
  assert.equal(giftBoost(1), 1)
  assert.equal(giftBoost(25), 25)
})

test('điểm chỉ cộng lên, không tắt dần: quà 100 điểm vẫn còn nguyên sau 5 giây', () => {
  const s = freshMatch()
  const r = applyPull(s, 'A', 100, { nickname: 'Lan', userId: 'lan' })
  assert.equal(r.ok, true)
  assert.equal(r.effect, 100)
  assert.equal(s.teams.A.boost, 100)
  assert.equal(s.roundScore.A, 100, 'điểm màn Nữ = 100')
  assert.equal(s.teams.A.pullRate, 100, '100 điểm = sức mạnh 100 (không +1 người)')
  assert.ok(approx(s.rope, 0), 'quà không nhảy dây ngay — vạch chạy theo điểm')
  // Tặng luôn cho B để chênh lệch về 0 thì mới đo được điểm không tụt.
  applyPull(s, 'B', 100, { nickname: 'Nam', userId: 'nam' })
  step(s, 5)
  assert.equal(s.teams.A.boost, 100, 'sau 5s điểm vẫn 100 — không tắt dần')
  assert.equal(s.roundScore.A, 100)
  assert.ok(approx(s.rope, 0), '2 phe bằng điểm thì vạch ở giữa')
})

test('2 phe cùng tặng 100 điểm thì vạch ở giữa', () => {
  const s = crowdMatch(100, 1)
  applyPull(s, 'A', 100, { nickname: 'A0', userId: 'a0' })
  applyPull(s, 'B', 100, { nickname: 'B0', userId: 'b0' })
  assert.equal(s.teams.B.pullRate, 100, '100 điểm cho Nam = sức mạnh 100')
  assert.equal(s.teams.A.pullRate, 100, '100 điểm cho Nữ = sức mạnh 100')
  step(s, 0.5)
  assert.ok(Math.abs(s.rope) < 0.05, `2 phe bằng điểm thì vạch gần như đứng yên, được ${s.rope}`)
  assert.equal(s.phase, 'pulling')
})

test('2 phe cùng tặng điểm thì vạch đứng yên, không tụt về giữa', () => {
  const s = crowdMatch(100, 1)
  applyPull(s, 'A', 100, { nickname: 'A0', userId: 'a0' })
  applyPull(s, 'B', 100, { nickname: 'B0', userId: 'b0' })
  step(s, 5)
  assert.equal(s.teams.B.boost, 100, 'sau 5s điểm vẫn 100 — không tắt dần')
  assert.ok(Math.abs(s.rope) < 0.05, `2 phe ngang điểm thì vạch ở giữa, được ${s.rope}`)
  step(s, 20)
  assert.ok(Math.abs(s.rope) < 0.05, `không ai tặng tiếp thì vạch vẫn ở giữa (không tụt), được ${s.rope}`)
  assert.equal(s.phase, 'pulling', 'không ai tặng tiếp thì chưa phân thắng thua')
})

test('tặng liên tục mới thắng màn', () => {
  const s = freshMatch()
  let guard = 0
  while (s.phase === 'pulling' && guard++ < 100) {
    applyPull(s, 'A', 1, { nickname: 'Lan', userId: 'lan' })
    step(s, 0.25)
  }
  assert.equal(s.phase, 'roundEnd', 'kéo liên tục phải thắng màn')
  assert.equal(s.roundWinner, 'A')
  assert.equal(s.teams.A.roundWins, 1)
})

// ── 3. Cơ hội cuối ×2 + giờ chót ×2 ────────────────────────────────────────
test('đội đang thua quá 0,55 được nhân đôi lực kéo', () => {
  const s = freshMatch()
  s.rope = -0.7 // Đội Đỏ đang thua sâu
  const r = applyPull(s, 'A', 1, { nickname: 'Lan', userId: 'lan' })
  assert.equal(r.ok, true)
  assert.equal(r.comeback, true)
  assert.equal(r.effect, 2, '1 lực ×2 = 2')
  assert.equal(s.teams.A.boost, 2)
  // Đội đang thắng thì không nhân đôi.
  const s2 = freshMatch()
  s2.rope = 0.3
  const r2 = applyPull(s2, 'A', 1, { nickname: 'Lan', userId: 'lan' })
  assert.equal(r2.comeback, false)
  assert.equal(r2.effect, 1)
})

test('10 giây cuối quà tặng ×2 (giờ chót)', () => {
  const s = freshMatch()
  s.roundTimeLeft = 5
  tick(s, 0.1)
  assert.equal(s.finalTime, true, 'còn 5s phải vào giờ chót')
  const r = applyPull(s, 'A', 10, { nickname: 'Lan', userId: 'lan' })
  assert.equal(r.final, true)
  assert.equal(r.effect, 20, '10 lực ×2 giờ chót = 20')
  const s2 = freshMatch()
  s2.roundTimeLeft = 20
  const r2 = applyPull(s2, 'A', 10, { nickname: 'Lan', userId: 'lan' })
  assert.equal(r2.final, false)
  assert.equal(r2.effect, 10)
  // Cơ hội cuối + giờ chót cộng dồn: 10 ×2 ×2 = 40.
  const s3 = freshMatch()
  s3.rope = -0.7
  s3.roundTimeLeft = 5
  const r3 = applyPull(s3, 'A', 10, { nickname: 'Lan', userId: 'lan' })
  assert.equal(r3.effect, 40)
  assert.equal(r3.comeback, true)
  assert.equal(r3.final, true)
})

// ── 4. Lật kèo: 1 món quà mạnh hơn cả đội kia ──────────────────────────────
test('quà to (>=25 lực) thì lật kèo, quà nhỏ thì không', () => {
  const s = freshMatch()
  const r = applyPull(s, 'A', 25, { nickname: 'Lan', userId: 'lan' })
  assert.equal(r.flip, true, '25 lực → lật kèo')
  assert.ok(s.effects.some((e) => e.kind === 'flip'), 'phải có hiệu ứng lật kèo')
  const s2 = freshMatch()
  const r2 = applyPull(s2, 'A', 10, { nickname: 'Lan', userId: 'lan' })
  assert.equal(r2.flip, false, '10 lực → không lật kèo')
})

// ── 5. Điểm tích lũy: chênh 100 mới thắng, không tụt về giữa ───────────────
test('luật đẩy: phe tặng quà nhiều hơn đẩy vạch giữa chạm mép là thắng màn', () => {
  const s = crowdMatch(1, 1)
  // Nam (B) tặng liên tục → vạch chạy về phía Nữ, chạm -0,5 là Nam thắng.
  let guard = 0
  while (s.phase === 'pulling' && guard++ < 100) {
    applyPull(s, 'B', 10, { nickname: 'Nam', userId: 'b0' })
    step(s, 0.25)
  }
  assert.equal(s.phase, 'roundEnd', 'đẩy liên tục phải thắng màn')
  assert.equal(s.roundWinner, 'B', 'Nam đẩy nhiều hơn thì Nam thắng màn')
  assert.ok(s.rope <= -0.5, `vạch phải chạm mép Nữ (-0,5), được ${s.rope}`)
})

test('điểm chỉ cộng lên, không tụt: vạch đứng yên khi không ai đẩy', () => {
  const s = freshMatch()
  s.roundScore = { A: 50, B: 0 } // chênh 50 → vạch 0,45
  step(s, 10)
  assert.ok(approx(s.rope, 0.45), `10 giây không ai đẩy thì vạch vẫn 0,45, được ${s.rope}`)
  assert.equal(s.roundScore.A, 50, 'điểm không tụt')
  assert.equal(s.phase, 'pulling')
})
test('chênh 100 điểm mới thắng màn — chênh 30 thì chưa thắng (tim/cmt không thắng nhanh)', () => {
  assert.equal(DEFAULT_SETTINGS.winDiff, 100, 'ngưỡng thắng mặc định là chênh 100 điểm')
  const s = freshMatch()
  applyPull(s, 'A', 30, { nickname: 'Lan', userId: 'lan' })
  step(s, 0.5)
  assert.equal(s.phase, 'pulling', 'chênh 30 điểm chưa thắng')
  assert.ok(approx(s.rope, 0.27), `chênh 30/100 thì vạch 0,27, được ${s.rope}`)
  applyPull(s, 'A', 70, { nickname: 'Lan', userId: 'lan' })
  step(s, 0.5)
  assert.equal(s.phase, 'roundEnd', 'chênh 100 điểm thì thắng màn')
  assert.equal(s.roundWinner, 'A')
  assert.ok(approx(s.rope, 0.9), 'vạch chạm sát mép 0,9')
})
test('tỉ lệ đẩy: cmt +1 nhích tí, tim +10 nhích ít, quà to 100 vọt tới mép', () => {
  const s = freshMatch()
  applyCheer(s, 'A', { nickname: 'A', userId: 'a' })
  step(s, 0.1)
  assert.ok(approx(s.rope, 0.009), `cmt +1 → vạch nhích 0,009, được ${s.rope}`)
  applyLikes(s, 'user1', 100) // +10 cho Nữ
  step(s, 0.1)
  assert.ok(approx(s.rope, 0.099), `thêm 100 tim (+10) → vạch 0,099, được ${s.rope}`)
  assert.equal(s.phase, 'pulling', 'cmt + tim vẫn chưa thắng')
  applyPull(s, 'A', 100, { nickname: 'Lan', userId: 'lan' }) // quà to 100
  step(s, 0.1)
  assert.equal(s.phase, 'roundEnd', '1 quà to 100 điểm thì vọt tới mép và thắng')
  assert.equal(s.roundWinner, 'A')
})

// ── 6. Hết giờ ─────────────────────────────────────────────────────────────
test('hết giờ: đội dẫn trước thắng, dây ở giữa thì hòa', () => {
  const s = freshMatch()
  s.roundScore = { A: 10, B: 0 } // Nữ dẫn 10 điểm
  s.roundTimeLeft = 1
  step(s, 1.5)
  assert.equal(s.phase, 'roundEnd')
  assert.equal(s.roundWinner, 'A')
  const s2 = freshMatch()
  s2.roundScore = { A: 0, B: 0 }
  s2.roundTimeLeft = 1
  step(s2, 1.5)
  assert.equal(s2.phase, 'roundEnd')
  assert.equal(s2.roundWinner, null, 'dây gần giữa thì hòa')
})

// ── 7. Thả tim = +10 cho NỮ (tính theo từng người) ───────────────────────
test('mỗi người đủ 100 tim thì +10 cho Nữ, tim không đẩy cho Nam', () => {
  const s = freshMatch()
  const n = applyLikes(s, 'user1', 100)
  assert.equal(n, 1)
  assert.equal(s.likePowerAdded, 10)
  assert.equal(s.teams.A.boost, 10, 'tim chỉ cộng bùng cho Nữ')
  assert.equal(s.teams.B.boost, 0, 'Nam không được gì từ tim')
  assert.equal(s.likes, 100)
  const n2 = applyLikes(s, 'user1', 250)
  assert.equal(n2, 2, '250 tim = 2 lần +10, còn dư 50')
  assert.equal(s.likePowerAdded, 30)
  assert.equal(s.likes, 350)
  const n3 = applyLikes(s, 'user1', 50)
  assert.equal(n3, 1, '50 dư + 50 mới = đủ 100 → +10 nữa')
  assert.equal(s.likePowerAdded, 40)
})

test('tim tính theo từng người, không cộng dồn cả phòng', () => {
  const s = freshMatch()
  assert.equal(applyLikes(s, 'user1', 60), 0, 'user1 mới 60 tim → chưa đủ')
  assert.equal(applyLikes(s, 'user2', 60), 0, 'user2 mới 60 tim → chưa đủ')
  assert.equal(s.likePowerAdded, 0, '2 người 60+60 không được cộng')
  assert.equal(s.likes, 120, 'tổng tim vẫn đếm')
  assert.equal(applyLikes(s, 'user1', 40), 1, 'user1 đủ 60+40=100 → +10 cho Nữ')
  assert.equal(s.teams.A.boost, 10)
})

test('tim cộng tối đa +60 lực / màn', () => {
  const s = freshMatch()
  const n = applyLikes(s, 'user1', 1000)
  assert.equal(n, 6, '1000 tim = 10 lần nhưng cắt ở +60 (6 lần)')
  assert.equal(s.likePowerAdded, 60)
  assert.equal(s.teams.A.boost, 60)
  assert.equal(applyLikes(s, 'user1', 500), 0, 'đủ +60 rồi thì tim nữa cũng không cộng')
})

test('tim lúc đếm ngược vẫn cộng lực (vừa tự bắt đầu màn thì tim không bị nuốt)', () => {
  const s = createMatch({ ...DEFAULT_SETTINGS, giftMap: { ...DEFAULT_SETTINGS.giftMap } })
  startMatch(s) // đang đếm ngược, chưa kéo
  assert.equal(s.phase, 'countdown')
  assert.equal(applyLikes(s, 'user1', 100), 1, 'đếm ngược vẫn +10 cho Nữ — treo máy tự bắt đầu xong tim tới liền phải tính')
  assert.equal(s.likes, 100)
  assert.equal(s.likePowerAdded, 10)
})

// ── 7b. Follow = +10 cho NAM · Cmt = +1 cho phe đó ────────────────────────
test('1 follow = +10 cho Nam, follow không đẩy cho Nữ', () => {
  const s = freshMatch()
  const r = applyFollow(s, 'f1', 'Fan Mới')
  assert.equal(r, 1)
  assert.equal(s.teams.B.boost, 10, 'follow cộng bùng cho Nam')
  assert.equal(s.teams.A.boost, 0, 'Nữ không được gì từ follow')
  assert.equal(s.followPowerAdded, 10)
})
test('follow lúc đếm ngược vẫn cộng lực (vừa tự bắt đầu màn)', () => {
  const s = createMatch({ ...DEFAULT_SETTINGS, giftMap: { ...DEFAULT_SETTINGS.giftMap } })
  startMatch(s)
  assert.equal(s.phase, 'countdown')
  assert.equal(applyFollow(s, 'f1', 'Fan Mới'), 1, 'đếm ngược vẫn +10 cho Nam')
  assert.equal(s.teams.B.boost, 10)
})
test('cmt boy/nam +1 cho Nam, girl/nữ +1 cho Nữ (đẩy ngay)', () => {
  const s = freshMatch()
  assert.equal(applyCheer(s, 'B', { nickname: 'A', userId: 'a' }).effect, 1)
  assert.equal(s.teams.B.boost, 1)
  assert.equal(applyCheer(s, 'A', { nickname: 'B', userId: 'b' }).effect, 1)
  assert.equal(s.teams.A.boost, 1)
  assert.equal(parseTeamJoin('boyyyyyyy'), 'B', '"boyyyyyyy" vẫn tính là boy')
  assert.equal(parseTeamJoin('nữ ơi'), 'A')
  assert.equal(parseTeamJoin('nam cố lên'), 'B')
  assert.equal(parseTeamJoin('girl xinh quá'), 'A')
})

// ── 8. Vào đội ─────────────────────────────────────────────────────────────
test('bình luận GIRL/BOY/nam/nữ/A/B/THAM GIA vào đúng phe', () => {
  assert.equal(parseTeamJoin('A'), 'A')
  assert.equal(parseTeamJoin('B'), 'B')
  assert.equal(parseTeamJoin('GIRL'), 'A')
  assert.equal(parseTeamJoin('girl'), 'A')
  assert.equal(parseTeamJoin('g'), 'A')
  assert.equal(parseTeamJoin('nữ'), 'A')
  assert.equal(parseTeamJoin('con gái'), 'A')
  assert.equal(parseTeamJoin('BOY'), 'B')
  assert.equal(parseTeamJoin('boy'), 'B')
  assert.equal(parseTeamJoin('boyyyyyyy'), 'B', 'kéo dài kiểu boyyyyyy vẫn tính (ảnh mẫu)')
  assert.equal(parseTeamJoin('b'), 'B')
  assert.equal(parseTeamJoin('nam'), 'B')
  assert.equal(parseTeamJoin('con trai'), 'B')
  assert.equal(parseTeamJoin('ĐỘI NAM'), 'B')
  assert.equal(parseTeamJoin('đội nữ'), 'A')
  assert.equal(parseTeamJoin('THAM GIA'), 'balance')
  assert.equal(parseTeamJoin('@A'), 'A')
  assert.equal(parseTeamJoin('cho em hỏi'), null, 'câu thường không được nhận nhầm là vào đội')
  assert.equal(parseTeamJoin('hello mọi người'), null)
})

test('vào đội: 1 người chỉ 1 đội, THAM GIA vào đội ít người hơn', () => {
  const s = createMatch({ ...DEFAULT_SETTINGS })
  assert.equal(joinTeam(s, 'A', 'Lan', 'lan').ok, true)
  assert.equal(joinTeam(s, 'B', 'Lan', 'lan').ok, false, 'đã ở đội Đỏ thì không vào thêm đội Xanh')
  assert.equal(joinTeam(s, 'A', 'Lan', 'lan').reason, 'already')
  assert.equal(joinTeam(s, 'balance', 'Minh', 'minh').teamId, 'B', 'đội Xanh ít người hơn nên Minh vào Xanh')
  assert.equal(findMember(s, 'lan').teamId, 'A')
  assert.equal(findMember(s, 'minh').teamId, 'B')
})

// ── 9. Quà kéo cho đội nào ─────────────────────────────────────────────────
// ── 6b. Nhân vật khán giả: tên + avatar trên đầu, mới nhất hiện ra ──────
test('vào đội lưu avatar + lúc vào để 3D hiện nhân vật của người đó', () => {
  const s = createMatch({ ...DEFAULT_SETTINGS })
  const r = joinTeam(s, 'A', 'Lan', 'lan', 'https://cdn.example.com/lan.jpg')
  assert.equal(r.ok, true)
  assert.equal(r.member.avatar, 'https://cdn.example.com/lan.jpg')
  assert.equal(typeof r.member.joinedAt, 'number')
  assert.equal(teamStrength(s, 'A'), 0, 'vào đội không còn +lực (chỉ lưu avatar)')
})
test('chỉ 3 người mới nhất/đội hiện ra trên sân (còn lại vẫn tính lực)', () => {
  const s = crowdMatch(5, 0)
  const vis = visibleMembers(s, 'A', 3)
  assert.equal(vis.length, 3)
  assert.deepEqual(vis.map((m) => m.nickname), ['A2', 'A3', 'A4'], 'mới nhất 3 người')
  assert.equal(teamStrength(s, 'A'), 0, '5 người vào đội vẫn = 0 — chỉ quà/tim/follow/cmt mới đẩy')
  assert.equal(visibleMembers(s, 'A', 3).length, 3)
  assert.equal(visibleMembers(s, 'B', 3).length, 0, 'đội trống thì không có ai')
})
test('adapter: event quà đúng dạng connector gửi (avatar top-level) → giữ avatar + tên quà', () => {
  // Connector tick-tock (who() + pickAvatarUrl, commit 0ebcbf2c) gửi event
  // quà dạng { type:'gift', nickname, userId, avatar, giftName, ... } —
  // adapter phải giữ nguyên avatar để hiệu ứng 100 xu hiện ảnh thật.
  const ev = normalizeEvent({ type: 'gift', nickname: 'Hoa', userId: 'hoa1', avatar: 'https://cdn.example.com/h.jpg', giftName: 'bó hoa', diamondCount: 100 })
  assert.equal(ev.kind, 'gift')
  assert.equal(ev.avatar, 'https://cdn.example.com/h.jpg', 'avatar top-level của connector phải qua được adapter')
  assert.equal(ev.giftName, 'bó hoa')
  assert.equal(ev.nickname, 'Hoa')
  const noAv = normalizeEvent({ type: 'gift', nickname: 'Nam', userId: 'nam1', giftName: 'hoa hồng' })
  assert.equal(noAv.avatar, '', 'không có avatar thì để trống để UI vẽ vòng tròn chữ cái')
})

test('adapter lấy ảnh đại diện từ event (trực tiếp + lồng trong user)', () => {
  const direct = normalizeEvent({ type: 'chat', comment: 'A', nickname: 'Lan', uniqueId: 'lan', profilePictureUrl: 'https://cdn.example.com/a.jpg' })
  assert.equal(direct.kind, 'chat')
  assert.equal(direct.avatar, 'https://cdn.example.com/a.jpg')
  const nested = normalizeEvent({ type: 'chat', comment: 'B', user: { nickname: 'Minh', uniqueId: 'minh', profilePictureUrl: 'https://cdn.example.com/b.jpg' } })
  assert.equal(nested.kind, 'chat')
  assert.equal(nested.nickname, 'Minh')
  assert.equal(nested.avatar, 'https://cdn.example.com/b.jpg')
  const none = normalizeEvent({ type: 'chat', comment: 'A', nickname: 'Hoa', uniqueId: 'hoa' })
  assert.equal(none.avatar, '', 'không có ảnh thì để trống (3D vẽ vòng tròn chữ cái)')
})
test('chính món quà quyết định phe (bảng GIFT_TEAM), quà lạ về phe thua', () => {
  const s = freshMatch()
  assert.equal(giftTeam(s, 'lan', '', 'hoa hồng'), 'A', 'hoa hồng → Nữ dù người tặng là ai')
  assert.equal(giftTeam(s, 'lan', '', 'tiktok'), 'B', 'quà TikTok → Nam dù người tặng là ai')
  assert.equal(giftTeam(s, 'lan', '', 'nước hoa'), 'B', 'nước hoa → Nam (chuyển phe 17:51)')
  assert.equal(giftTeam(s, 'lan', '', 'bánh vòng'), 'A', 'bánh vòng → Nữ')
  assert.equal(giftTeam(s, 'lan', '', 'kem ốc quế'), 'B', 'kem ốc quế → Nam')
  s.rope = 0.3 // Nữ đang dẫn, Nam thua
  assert.equal(giftTeam(s, 'nguoi-la', '', 'quà lạ'), 'B', 'quà lạ → phe đang thua (Nam)')
  s.rope = -0.3
  assert.equal(giftTeam(s, 'nguoi-la', '', 'quà lạ'), 'A', 'quà lạ → phe đang thua (Nữ)')
})

// ── 10. GiftEngine: hàng đợi, chống trùng, quà lạ, giữ quà trước giờ G ────
test('giới hạn toàn cục xếp hàng các lượt kéo đến dồn dập', () => {
  const s = freshMatch()
  const eng = new GiftEngine(s)
  eng.receive({ id: 'e1', giftName: 'Hoa hồng', nickname: 'A', userId: 'a' })
  eng.receive({ id: 'e2', giftName: 'Hạc giấy', nickname: 'B', userId: 'b' })
  eng.receive({ id: 'e3', giftName: 'Rosa', nickname: 'C', userId: 'c' })
  assert.equal(eng.queueLength, 3)
  const first = eng.process(10)
  assert.equal(first.ok, true)
  assert.equal(eng.queueLength, 2)
  const tooSoon = eng.process(10.2)
  assert.equal(tooSoon.reason, 'rate-limited')
  assert.equal(eng.queueLength, 2, 'chưa đủ 0,5 giây thì hàng đợi phải còn nguyên')
  const second = eng.process(10.6)
  assert.equal(second.ok, true)
  assert.equal(eng.queueLength, 1)
})

test('trùng event id bị loại, chỉ xử lý 1 lần', () => {
  const s = freshMatch()
  const eng = new GiftEngine(s)
  const a = eng.receive({ id: 'dup-1', giftName: 'Hoa hồng', nickname: 'A', userId: 'a' })
  const b = eng.receive({ id: 'dup-1', giftName: 'Hoa hồng', nickname: 'A', userId: 'a' })
  assert.equal(a.ok, true)
  assert.equal(b.ok, false)
  assert.equal(b.reason, 'duplicate')
  assert.equal(eng.droppedDuplicates, 1)
  assert.equal(eng.queueLength, 1)
})

test('quà lạ bị bỏ qua, quà tặng trước giờ G vẫn tính khi vào màn', () => {
  const s = createMatch({ ...DEFAULT_SETTINGS, giftMap: { ...DEFAULT_SETTINGS.giftMap } })
  const eng = new GiftEngine(s)
  const unmapped = eng.receive({ id: 'u1', giftName: 'Quà lạ hoắc', nickname: 'A', userId: 'a' })
  assert.equal(unmapped.ok, false)
  assert.equal(unmapped.reason, 'unmapped')
  assert.equal(eng.queueLength, 0)
  // Đang chờ (chưa kéo): quà vẫn xếp hàng, không mất.
  const r = eng.receive({ id: 'e1', giftName: 'Hoa hồng', nickname: 'A', userId: 'a' })
  assert.equal(r.ok, true)
  const held = eng.process(10)
  assert.equal(held.reason, 'not-pulling')
  assert.equal(eng.queueLength, 1, 'chưa vào màn thì quà phải còn trong hàng đợi')
  // Vào màn rồi thì xử lý được.
  s.phase = 'pulling'
  const done = eng.process(10)
  assert.equal(done.ok, true)
  assert.equal(eng.queueLength, 0)
})

test('bảng quà cũ (chiêu dạng chữ + lực cũ) được đổi sang lực kéo mới', () => {
  assert.deepEqual(migrateGiftMap({ 'hoa hong': 'banana', 'hac giay': 'dizzy', 'rosa': 6 }), {
    'hoa hong': 1, 'hac giay': 100, rosa: 10,
  })
  const s = createMatch({ ...DEFAULT_SETTINGS, giftMap: { 'hoa hong': 'banana' } })
  const eng = new GiftEngine(s)
  assert.equal(eng.resolveGift('Hoa Hồng'), 1)
  assert.equal(eng.resolveGift('Quà lạ hoắc'), null)
})

test('giá xu quà TikTok + bậc kéo theo xu', () => {
  assert.equal(giftPrice('Hoa hồng'), 1)
  assert.equal(giftPrice('Rosa'), 10)
  assert.equal(giftPrice('Hạc giấy'), 99)
  assert.equal(giftPrice('Quà lạ hoắc'), null)
  assert.equal(giftTier(1), 'Đẩy nhẹ')
  assert.equal(giftTier(5), 'Đẩy vừa')
  assert.equal(giftTier(10), 'Đẩy mạnh')
  assert.equal(giftTier(20), 'Đẩy rất mạnh')
  assert.equal(giftTier(99), 'Đẩy cực mạnh')
})

// ── 11. Lệnh bình luận ──────────────────────────────────────────────────────
test('lệnh bình luận: A/B vào đội, BẮT ĐẦU/DỪNG/+30S', () => {
  assert.deepEqual(parseCommand('A'), { cmd: 'joinTeam', teamId: 'A' })
  assert.deepEqual(parseCommand('B'), { cmd: 'joinTeam', teamId: 'B' })
  assert.deepEqual(parseCommand('GIRL'), { cmd: 'joinTeam', teamId: 'A' })
  assert.deepEqual(parseCommand('boyyyyyyy'), { cmd: 'joinTeam', teamId: 'B' })
  assert.deepEqual(parseCommand('nữ'), { cmd: 'joinTeam', teamId: 'A' })
  assert.deepEqual(parseCommand('nam'), { cmd: 'joinTeam', teamId: 'B' })
  assert.deepEqual(parseCommand('ĐỘI XANH'), { cmd: 'joinTeam', teamId: 'B' })
  assert.deepEqual(parseCommand('THAM GIA'), { cmd: 'join' })
  assert.deepEqual(parseCommand('@Thamgia'), { cmd: 'join' })
  assert.deepEqual(parseCommand('BẮT ĐẦU'), { cmd: 'start' })
  assert.deepEqual(parseCommand('DỪNG'), { cmd: 'pause' })
  assert.deepEqual(parseCommand('TIẾP'), { cmd: 'resume' })
  assert.deepEqual(parseCommand('+30S'), { cmd: 'addTime', seconds: 30 })
  assert.equal(parseCommand('hello mọi người'), null)
  assert.equal(parseCommand('cho em hỏi'), null)
})

test('bộ nhớ seq: event trùng chỉ tính 1 lần (bắt kịp sau rớt mạng)', () => {
  const t = createSeqTracker(3)
  assert.equal(t.seen(1), false)
  assert.equal(t.seen(1), true)
  assert.equal(t.seen(2), false)
  assert.equal(t.seen('x'), false)
  assert.equal(t.seen(3), false)
  assert.equal(t.seen(4), false)
  // Quá giới hạn 3: seq cũ nhất (1) bị quên, nhận lại thì tính là mới.
  assert.equal(t.seen(1), false)
  assert.equal(t.seen(4), true)
})

// ── 12. Trận: thắng 2 màn (best of 3), ngôi sao may mắn, chuỗi thắng ──────
test('thắng 2 màn trước thì vô địch trận (best of 3) + chuỗi thắng tăng', () => {
  const s = freshMatch()
  s.teams.A.roundWins = 1
  endRound(s, 'A')
  assert.equal(s.phase, 'matchEnd')
  assert.equal(s.matchWinner, 'A')
  assert.equal(s.teams.A.roundWins, 2)
  assert.equal(s.streak.A, 1, 'thắng trận đầu → chuỗi 1')
  assert.equal(s.streak.B, 0)
  // Trận sau thắng nữa → chuỗi 2 (chuỗi giữ qua trận).
  startMatch(s)
  s.teams.A.roundWins = 1
  endRound(s, 'A')
  assert.equal(s.streak.A, 2, 'thắng 2 trận liên tiếp → chuỗi 2')
  // Đội Xanh thắng thì chuỗi Đỏ về 0.
  startMatch(s)
  s.teams.B.roundWins = 1
  endRound(s, 'B')
  assert.equal(s.streak.A, 0)
  assert.equal(s.streak.B, 1)
})

test('best of 3: 2–1 là Đỏ thắng, 1–1 thì chưa xong (màn 3 quyết định)', () => {
  const s = freshMatch()
  // Màn 1: Đỏ thắng → 1–0, chưa vô địch.
  endRound(s, 'A')
  assert.equal(s.phase, 'roundEnd', '1–0 thì chưa vô địch')
  assert.equal(s.matchWinner, null)
  assert.equal(s.teams.A.roundWins, 1)
  // Màn 2: Xanh thắng → 1–1, chưa vô địch (màn 3 quyết định).
  s.round = 2
  endRound(s, 'B')
  assert.equal(s.phase, 'roundEnd', '1–1 thì chưa vô địch')
  assert.equal(s.teams.B.roundWins, 1)
  assert.equal(s.matchWinner, null)
  // Màn 3: Đỏ thắng → 2–1, Đỏ vô địch.
  s.round = 3
  endRound(s, 'A')
  assert.equal(s.phase, 'matchEnd', '2–1 thì Đỏ vô địch')
  assert.equal(s.matchWinner, 'A')
  assert.equal(s.teams.A.roundWins, 2)
})

test('màn mới reset điểm 0-0, vạch về giữa (không còn sao may mắn lệch vạch)', () => {
  const s = freshMatch()
  s.roundScore = { A: 40, B: 10 }
  endRound(s, 'B')
  assert.equal(s.phase, 'roundEnd')
  assert.deepEqual(s.luckyStar, { team: 'B' })
  s.round++
  startRound(s)
  assert.ok(approx(s.rope, 0), `màn sau vạch bắt đầu ở giữa, được ${s.rope}`)
  assert.deepEqual(s.roundScore, { A: 0, B: 0 }, 'điểm màn mới reset 0-0')
})

test('đủ 2 phe: Nữ (GIRL, hồng) vs Nam (BOY, xanh)', () => {
  assert.equal(TEAMS.A.members.length, 3)
  assert.equal(TEAMS.B.members.length, 3)
  assert.equal(new Set([...TEAMS.A.members, ...TEAMS.B.members]).size, 6)
  assert.equal(TEAMS.A.short, 'GIRL')
  assert.equal(TEAMS.B.short, 'BOY')
  assert.equal(TEAMS.A.color, '#ff4d8d')
  assert.equal(TEAMS.B.color, '#22b8e6')
  assert.equal(DEFAULT_SETTINGS.roundSeconds, 60, '1 màn 60 giây')
})

// ── 13. Tiến thời gian thực: tab nền (dt lớn) vẫn đúng giờ ────────────────
test('đếm ngược + hết giờ màn chạy đúng với dt lớn', () => {
  const s = createMatch({ ...DEFAULT_SETTINGS, giftMap: { ...DEFAULT_SETTINGS.giftMap } })
  startMatch(s)
  assert.equal(s.phase, 'countdown')
  advance(s, 3.5)
  assert.equal(s.phase, 'pulling', 'đếm ngược 3s phải xong dù chỉ gọi 1 lần với dt=3,5')
  // advance() cắt dt > 5s (tab ngủ dài) nên tua 60 giây bằng step().
  step(s, 61)
  assert.equal(s.phase, 'roundEnd', 'hết 60 giây phải xong màn')
  assert.equal(s.roundWinner, null, 'không ai kéo thì hòa')
  // TREO MÁY (autoPlay mặc định BẬT): hết 10 giây nghỉ thì TỰ sang màn 2,
  // không về chờ bấm tay nữa.
  step(s, 10.5)
  assert.equal(s.phase, 'countdown', 'hết 10 giây nghỉ thì tự sang màn sau')
  assert.equal(s.round, 2)
  assert.equal(s.waitingNextRound, false)
})

// ── 13b. CHẾ ĐỘ TỰ ĐỘNG (treo máy, 2026-11-21) ────────────────────────────
test('tự động tắt (autoPlay=false): hết màn thì về chờ như cũ', () => {
  const s = createMatch({ ...DEFAULT_SETTINGS, autoPlay: false, giftMap: { ...DEFAULT_SETTINGS.giftMap } })
  startMatch(s)
  advance(s, 3.5)
  step(s, 61)
  assert.equal(s.phase, 'roundEnd')
  step(s, 10.5)
  assert.equal(s.phase, 'waiting', 'tắt tự động thì hết màn phải về chờ')
  assert.equal(s.waitingNextRound, true)
})

test('tự động: hết trận thì tự bắt đầu trận mới (điểm màn reset, BXH giữ)', () => {
  const s = freshMatch()
  recordGift(s, 'hoa', 'Hoa', 125, 0, '')
  s.teams.A.roundWins = 1
  endRound(s, 'A') // 2–0 → vô địch
  assert.equal(s.phase, 'matchEnd')
  assert.equal(s.matchWinner, 'A')
  step(s, 15.5)
  assert.equal(s.phase, 'countdown', 'hết 15 giây nghỉ trận thì tự đánh trận mới')
  assert.equal(s.round, 1, 'trận mới bắt đầu từ màn 1')
  assert.equal(s.teams.A.roundWins, 0, 'tỉ số trận mới reset 0–0')
  assert.equal(s.teams.B.roundWins, 0)
  assert.deepEqual(s.roundScore, { A: 0, B: 0 })
  assert.equal(topGifters(s, 1)[0].nickname, 'Hoa', 'BXH phiên vẫn giữ qua trận mới')
})

test('tự động tắt (autoPlay=false): hết trận thì về chờ như cũ', () => {
  const s = createMatch({ ...DEFAULT_SETTINGS, autoPlay: false, giftMap: { ...DEFAULT_SETTINGS.giftMap } })
  startMatch(s)
  s.teams.A.roundWins = 1
  endRound(s, 'A')
  assert.equal(s.phase, 'matchEnd')
  step(s, 15.5)
  assert.equal(s.phase, 'waiting', 'tắt tự động thì hết trận phải về chờ')
  assert.equal(s.waitingNextRound, false)
})

test('cmt/tim/follow tính điểm cả lúc đang đếm ngược (vừa tự bắt đầu)', () => {
  const s = freshMatch()
  s.phase = 'countdown'
  s.roundScore = { A: 0, B: 0 }
  const cheer = applyCheer(s, 'B', { nickname: 'Minh', userId: 'minh' })
  assert.equal(cheer.ok, true, 'cmt boy lúc đếm ngược vẫn +1 cho Nam')
  assert.equal(s.roundScore.B, 1)
  const likes = applyLikes(s, 'lan', 100, 'Lan')
  assert.equal(likes, 1, 'đủ 100 tim lúc đếm ngược vẫn +10 cho Nữ')
  assert.equal(s.roundScore.A, 10)
  const fl = applyFollow(s, 'hoa', 'Hoa')
  assert.equal(fl, 1, 'follow lúc đếm ngược vẫn +10 cho Nam')
  assert.equal(s.roundScore.B, 11)
})

test('autoPlay mặc định BẬT trong DEFAULT_SETTINGS', () => {
  assert.equal(DEFAULT_SETTINGS.autoPlay, true)
})

// ── 13c. BỘ ĐẾM WIN: số TRẬN vô địch tích lũy cả phiên ────────────────────
// Khác sao ★ (số màn thắng trong trận hiện tại): WIN chỉ +1 khi 1 phe vô
// địch 1 trận (thắng 2 màn), và KHÔNG reset khi sang trận mới.
test('BỘ ĐẾM WIN: mới tạo trận thì WIN 0–0', () => {
  const s = createMatch({ ...DEFAULT_SETTINGS, giftMap: { ...DEFAULT_SETTINGS.giftMap } })
  assert.deepEqual(s.matchWins, { A: 0, B: 0 })
})

test('BỘ ĐẾM WIN: vô địch 1 trận → WIN phe đó +1, phe kia giữ nguyên', () => {
  const s = freshMatch()
  endRound(s, 'A') // màn 1: Nữ thắng (1–0)
  assert.equal(s.phase, 'roundEnd')
  assert.deepEqual(s.matchWins, { A: 0, B: 0 }, 'thắng 1 màn chưa phải vô địch nên WIN chưa tăng')
  endRound(s, 'A') // màn 2: Nữ thắng (2–0) → vô địch trận
  assert.equal(s.phase, 'matchEnd')
  assert.equal(s.matchWinner, 'A')
  assert.deepEqual(s.matchWins, { A: 1, B: 0 }, 'Nữ vô địch 1 trận → WIN Nữ = 1, Nam = 0')
})

test('BỘ ĐẾM WIN: sang trận mới WIN giữ nguyên, roundWins (sao ★) reset 0–0', () => {
  const s = freshMatch()
  endRound(s, 'A')
  endRound(s, 'A') // Nữ vô địch trận 1 → WIN 1–0
  assert.deepEqual(s.matchWins, { A: 1, B: 0 })
  startMatch(s) // trận mới
  assert.deepEqual(s.matchWins, { A: 1, B: 0 }, 'sang trận mới WIN phải giữ nguyên')
  assert.equal(s.teams.A.roundWins, 0, 'sao ★ trận mới reset về 0')
  assert.equal(s.teams.B.roundWins, 0)
  assert.equal(s.matchWinner, null)
  endRound(s, 'B')
  endRound(s, 'B') // Nam vô địch trận 2 → WIN 1–1
  assert.deepEqual(s.matchWins, { A: 1, B: 1 }, 'Nam vô địch trận sau → WIN 1–1')
})

test('BỘ ĐẾM WIN: hòa màn / hòa trận không tăng WIN', () => {
  const s = freshMatch()
  endRound(s, null) // hòa màn 1
  assert.deepEqual(s.matchWins, { A: 0, B: 0 })
  assert.equal(s.matchWinner, null)
})

test('BỘ ĐẾM WIN: resetMatchWins về 0–0, chỉ gọi khi streamer bấm Reset WIN', () => {
  const s = freshMatch()
  endRound(s, 'A')
  endRound(s, 'A') // Nữ vô địch → WIN 1–0
  assert.deepEqual(s.matchWins, { A: 1, B: 0 })
  resetMatchWins(s)
  assert.deepEqual(s.matchWins, { A: 0, B: 0 }, 'bấm Reset WIN thì về 0–0')
  assert.equal(s.teams.A.roundWins, 2, 'reset WIN không động tới tỉ số màn đang đấu')
})

// ── 14. BXH: ai tặng quà / thả tim nhiều nhất — lưu lại cả phiên ───────────
test('BXH quà: ghi tổng lực kéo từng người, xếp top 3 đúng thứ tự', () => {
  const s = freshMatch()
  applyPull(s, 'A', 1, { nickname: 'Lan', userId: 'lan' }, 'hoa hồng')
  applyPull(s, 'A', 25, { nickname: 'Hoa', userId: 'hoa' }, 'nước hoa')
  applyPull(s, 'B', 10, { nickname: 'Minh', userId: 'minh' }, 'rosa')
  applyPull(s, 'A', 100, { nickname: 'Hoa', userId: 'hoa' }, 'hạc giấy')
  const top = topGifters(s, 3)
  assert.equal(top.length, 3, '3 người tặng thì top 3 đủ 3')
  assert.equal(top[0].nickname, 'Hoa', 'Hoa tặng 125 lực phải đứng đầu')
  assert.equal(top[0].power, 125)
  assert.equal(top[0].count, 2, 'Hoa tặng 2 món')
  assert.equal(top[1].nickname, 'Minh')
  assert.equal(top[2].nickname, 'Lan')
})

test('BXH quà: người chưa vào đội vẫn được ghi (tặng quà là lên BXH)', () => {
  const s = freshMatch()
  applyPull(s, 'A', 10, { nickname: 'Người lạ', userId: 'la' }, 'rosa')
  const top = topGifters(s, 3)
  assert.equal(top.length, 1)
  assert.equal(top[0].nickname, 'Người lạ')
  assert.equal(top[0].power, 10)
})

test('BXH tim: ghi tổng tim từng người (cả khi chưa vào màn kéo)', () => {
  const s = createMatch({ ...DEFAULT_SETTINGS, giftMap: { ...DEFAULT_SETTINGS.giftMap } })
  applyLikes(s, 'lan', 30, 'Lan') // chưa vào màn kéo: không +giờ nhưng vẫn đếm tổng
  assert.equal(s.likes, 30)
  const top0 = topLikers(s, 3)
  assert.equal(top0[0].nickname, 'Lan')
  assert.equal(top0[0].likes, 30)
  startMatch(s)
  s.phase = 'pulling'
  s.roundTimeLeft = 45
  applyLikes(s, 'minh', 250, 'Minh')
  applyLikes(s, 'lan', 80, 'Lan')
  const top = topLikers(s, 3)
  assert.equal(top[0].nickname, 'Minh', 'Minh 250 tim phải đứng đầu')
  assert.equal(top[0].likes, 250)
  assert.equal(top[1].nickname, 'Lan')
  assert.equal(top[1].likes, 110, 'Lan 30 + 80 = 110 tim')
})

test('BXH giữ lại qua màn mới + trận mới (chỉ xóa khi bấm Xóa BXH)', () => {
  const s = freshMatch()
  applyPull(s, 'A', 10, { nickname: 'Hoa', userId: 'hoa' }, 'rosa')
  applyLikes(s, 'lan', 50, 'Lan')
  startMatch(s) // trận mới: BXH không được xóa
  assert.equal(topGifters(s, 3)[0].nickname, 'Hoa')
  assert.equal(topLikers(s, 3)[0].nickname, 'Lan')
  clearBxh(s)
  assert.equal(topGifters(s, 3).length, 0, 'xóa BXH thì hết')
  assert.equal(topLikers(s, 3).length, 0)
})

// ── 15. Hiệu ứng tặng quà: nhỏ = hộp quà mở, to = pháo hoa ─────────────────
test('quà nhỏ (<25 lực) hiện hiệu ứng hộp quà, quà to (≥25) hiện pháo hoa', () => {
  const s = freshMatch()
  applyPull(s, 'A', 1, { nickname: 'Lan', userId: 'lan' }, 'hoa hồng')
  let fx = s.effects.filter((e) => e.kind === 'gift').pop()
  assert.ok(fx, 'quà nhỏ cũng phải có hiệu ứng gift')
  assert.equal(fx.big, false, '1 lực là quà nhỏ')
  assert.equal(fx.sender, 'Lan')
  assert.equal(fx.gift, 'hoa hồng')
  assert.equal(fx.dur, 2, 'quà nhỏ hiện 2 giây')
  applyPull(s, 'B', 100, { nickname: 'Minh', userId: 'minh' }, 'hạc giấy')
  fx = s.effects.filter((e) => e.kind === 'gift').pop()
  assert.equal(fx.big, true, '100 lực là quà to')
  assert.equal(fx.sender, 'Minh')
  assert.equal(fx.dur, 3.5, 'quà to hiện 3,5 giây (pháo hoa)')
})

test('lượt kéo thử (opts.gift=false) không hiện hiệu ứng quà và không lên BXH', () => {
  const s = freshMatch()
  applyPull(s, 'A', 25, { nickname: 'Admin thử', userId: 'admin' }, '', { gift: false })
  assert.equal(s.effects.filter((e) => e.kind === 'gift').length, 0, 'kéo thử không phải quà nên không hiện hiệu ứng')
  assert.equal(topGifters(s, 3).length, 0, 'kéo thử không phải quà nên không lên BXH')
})

test('quà đi qua GiftEngine vẫn mang tên quà sang hiệu ứng', () => {
  const s = freshMatch()
  const eng = new GiftEngine(s)
  eng.receive({ id: 'g1', giftName: 'hạc giấy', nickname: 'Hoa', userId: 'hoa', text: 'A' })
  const res = eng.process(s.now + 1)
  assert.ok(res.ok, 'quà phải được xử lý')
  const fx = s.effects.filter((e) => e.kind === 'gift').pop()
  assert.ok(fx, 'phải có hiệu ứng gift')
  assert.equal(fx.gift, 'hạc giấy', 'hiệu ứng phải mang đúng tên quà')
  assert.equal(fx.big, true, 'hạc giấy 100 lực là quà to')
})

// ── 16. Toast: ai vào xem / theo dõi / chia sẻ hiện 2 giây rồi mất ────────
test('toast vào xem: hiện 2 giây, ai vào sau thì đổi chữ (không xếp chồng)', () => {
  const s = freshMatch()
  pushToast(s, '👋 Lan vừa vào xem!')
  let fx = s.effects.filter((e) => e.kind === 'toast')
  assert.equal(fx.length, 1, 'chỉ 1 toast')
  assert.equal(fx[0].dur, 2, 'toast hiện 2 giây')
  pushToast(s, '👋 Minh vừa vào xem!')
  fx = s.effects.filter((e) => e.kind === 'toast')
  assert.equal(fx.length, 1, 'toast sau không xếp chồng, chỉ đổi chữ')
  assert.equal(fx[0].text, '👋 Minh vừa vào xem!')
  step(s, 2.5)
  assert.equal(s.effects.filter((e) => e.kind === 'toast').length, 0, 'quá 2 giây thì toast mất')
})

// ── 17. Tỉnh thành VN: quà tính theo tỉnh, tỉnh dẫn đầu ×1,5 lực kéo ───
test('tên tỉnh trong bình luận/tên → đúng mã tỉnh', () => {
  assert.equal(detectProvince('Hà Nội cố lên!', ''), 'hanoi', 'tên tỉnh trong câu dài vẫn nhận')
  assert.equal(detectProvince('Sài Gòn vô địch', ''), 'hcm', 'Sài Gòn → TP.HCM')
  assert.equal(detectProvince('SG', ''), 'hcm', 'viết tắt SG → TP.HCM')
  assert.equal(detectProvince('Đà Nẵng', ''), 'danang')
  assert.equal(detectProvince('', 'Lan Hà Nội'), 'hanoi', 'tên tỉnh trong TÊN người tặng cũng tính')
  assert.equal(detectProvince('hello', 'Lan'), null)
  assert.equal(detectProvince('in love', ''), null, 'câu thường không nhận nhầm thành tỉnh')
})

test('tên cũ + tên thành phố quen thuộc làm alias cho tỉnh mới (sáp nhập 2025)', () => {
  assert.equal(detectProvince('Bình Dương', ''), 'hcm', 'Bình Dương giờ thuộc TP.HCM')
  assert.equal(detectProvince('Nha Trang', ''), 'khanhhoa', 'Nha Trang → Khánh Hòa')
  assert.equal(detectProvince('Đà Lạt', ''), 'lamdong', 'Đà Lạt → Lâm Đồng')
  assert.equal(detectProvince('Quảng Nam', ''), 'danang', 'Quảng Nam giờ thuộc Đà Nẵng')
  assert.equal(detectProvince('Bình Định', ''), 'gialai', 'Bình Định giờ thuộc Gia Lai')
  assert.equal(detectProvince('Thái Bình', ''), 'hungyen', 'Thái Bình giờ thuộc Hưng Yên')
  assert.equal(detectProvince('Vĩnh Long', ''), 'vinhlong', 'Vĩnh Long không nhận nhầm thành Nghệ An')
  assert.equal(provinceInfo('hanoi').name, 'Hà Nội')
  assert.equal(provinceInfo('hcm').name, 'TP. Hồ Chí Minh')
  assert.equal(provinceInfo('hcm').short, 'TP.HCM')
  assert.equal(provinceInfo('xx'), null)
})

test('BXH tỉnh thành: quà tính theo tỉnh, xếp top 3 đúng thứ tự + có tên', () => {
  const s = freshMatch()
  applyPull(s, 'A', 10, { nickname: 'An', userId: 'an', province: 'hcm' }, 'rosa')
  applyPull(s, 'A', 100, { nickname: 'Hoa', userId: 'hoa', province: 'hanoi' }, 'hạc giấy')
  applyPull(s, 'B', 25, { nickname: 'Min', userId: 'min', province: 'danang' }, 'nước hoa')
  const top = topProvinces(s, 3)
  assert.equal(top.length, 3)
  assert.equal(top[0].code, 'hanoi', 'Hà Nội 100 lực phải đứng đầu')
  assert.equal(top[0].power, 100)
  assert.equal(top[0].name, 'Hà Nội')
  assert.equal(top[1].code, 'danang')
  assert.equal(top[2].code, 'hcm')
  assert.equal(provinceLeader(s).code, 'hanoi', 'tỉnh dẫn đầu là Hà Nội')
})

test('tỉnh dẫn đầu: quà của tỉnh đó ×1,5, tỉnh khác không được thưởng', () => {
  const s = freshMatch()
  // Món đầu (chưa có tỉnh dẫn đầu) không được thưởng.
  const r1 = applyPull(s, 'A', 10, { nickname: 'Hoa', userId: 'hoa', province: 'hanoi' }, 'rosa')
  assert.equal(r1.effect, 10, 'chưa có tỉnh dẫn đầu thì không thưởng')
  assert.equal(r1.provinceBonus, false)
  // Hà Nội đã dẫn đầu → quà tiếp của Hà Nội ×1,5.
  const r2 = applyPull(s, 'A', 10, { nickname: 'Hoa', userId: 'hoa', province: 'hanoi' }, 'rosa')
  assert.equal(r2.effect, 15, 'quà của tỉnh dẫn đầu ×1,5')
  assert.equal(r2.provinceBonus, true)
  assert.equal(r2.province, 'hanoi')
  // Quà của tỉnh khác không được thưởng.
  const r3 = applyPull(s, 'B', 10, { nickname: 'An', userId: 'an', province: 'hcm' }, 'rosa')
  assert.equal(r3.effect, 10, 'quà của tỉnh không dẫn đầu không được thưởng')
  assert.equal(r3.provinceBonus, false)
  // BXH tỉnh thành ghi lực CUỐI CÙNG (đã nhân hệ số) nên Hà Nội củng cố vị trí.
  assert.equal(topProvinces(s, 3)[0].code, 'hanoi')
  assert.equal(topProvinces(s, 3)[0].power, 25, 'Hà Nội 10 + 15 = 25')
  assert.equal(topProvinces(s, 3)[1].power, 10, 'TP.HCM 10')
})

test('hiệu ứng quà mang theo tên tỉnh + Xóa BXH xóa luôn BXH tỉnh thành', () => {
  const s = freshMatch()
  applyPull(s, 'A', 1, { nickname: 'Hoa', userId: 'hoa', province: 'hanoi' }, 'hoa hồng')
  let fx = s.effects.filter((e) => e.kind === 'gift').pop()
  assert.equal(fx.province, 'hanoi', 'hiệu ứng quà phải mang mã tỉnh để hiện tên tỉnh')
  assert.equal(fx.provinceBonus, false, 'món đầu chưa có tỉnh dẫn đầu')
  applyPull(s, 'A', 10, { nickname: 'Hoa', userId: 'hoa', province: 'hanoi' }, 'rosa')
  fx = s.effects.filter((e) => e.kind === 'gift').pop()
  assert.equal(fx.provinceBonus, true, 'quà của tỉnh dẫn đầu thì hiệu ứng đánh dấu thưởng')
  // Nhớ tỉnh theo người: quà sau không kèm tỉnh vẫn tính cho Hà Nội.
  const r = applyPull(s, 'A', 10, { nickname: 'Hoa', userId: 'hoa' }, 'rosa')
  assert.equal(r.province, 'hanoi', 'đã chọn tỉnh rồi thì quà sau tự tính cho tỉnh đó')
  assert.equal(r.provinceBonus, true)
  clearBxh(s)
  assert.equal(topProvinces(s, 3).length, 0, 'xóa BXH thì BXH tỉnh thành cũng hết')
  assert.equal(provinceLeader(s), null)
})

test('quà qua GiftEngine vẫn mang tỉnh sang hiệu ứng + BXH; kéo thử thì không', () => {
  const s = freshMatch()
  const eng = new GiftEngine(s)
  eng.receive({ id: 'g1', giftName: 'hạc giấy', nickname: 'Hoa', userId: 'hoa', text: 'A', province: 'danang' })
  const res = eng.process(s.now + 1)
  assert.ok(res.ok, 'quà phải được xử lý')
  assert.equal(res.province, 'danang', 'quà qua hàng đợi vẫn mang tỉnh')
  const fx = s.effects.filter((e) => e.kind === 'gift').pop()
  assert.equal(fx.province, 'danang', 'hiệu ứng quà mang tên Đà Nẵng')
  assert.equal(topProvinces(s, 3)[0].code, 'danang')
  // Kéo thử (không phải quà) không được tính cho tỉnh nào.
  applyPull(s, 'A', 25, { nickname: 'Admin thử', userId: 'admin', province: 'hanoi' }, '', { gift: false })
  assert.equal(topProvinces(s, 3).length, 1, 'kéo thử không lên BXH tỉnh thành')
})

// ── 18. Đấu tỉnh thành: cmt tỉnh là vào đội, top 2 tỉnh đông nhất đấu ───
test('bình luận tỉnh → tự vào đội tỉnh đó (chưa đủ 2 tỉnh thì làm challenger)', () => {
  const s = createMatch({ ...DEFAULT_SETTINGS })
  // Chưa có đội tỉnh nào (chưa đủ 2 tỉnh) → vào làm challenger, chưa có đội.
  const r1 = joinProvince(s, 'hanoi', 'Lan', 'lan')
  assert.equal(r1.ok, true)
  assert.equal(r1.challenger, true, '1 tỉnh thì chưa thành đội, làm challenger')
  assert.equal(r1.teamId, null)
  assert.equal(s.userProvince.lan, 'hanoi')
  assert.equal(findMember(s, 'lan'), null, 'challenger chưa vào đội nào')
  // Đủ 2 tỉnh → 2 tỉnh đó thành 2 đội, người vào đội tỉnh mình.
  joinProvince(s, 'hcm', 'Hoa', 'hoa')
  joinProvince(s, 'danang', 'Nam', 'nam')
  // Chưa sync (chưa bắt đầu màn) nên đội vẫn chưa chọn — sync ở đầu màn.
  assert.equal(s.provinceTeams.A, null, 'chưa bắt đầu màn thì chưa chọn đội')
  const picked = syncProvinceTeams(s)
  assert.equal(picked.A, 'hanoi', 'Hà Nội (1 người) đứng đầu')
  assert.equal(picked.B, 'hcm', 'TP.HCM đứng thứ 2')
  assert.equal(findMember(s, 'lan').teamId, 'A', 'Lan (Hà Nội) vào đội A')
  assert.equal(findMember(s, 'hoa').teamId, 'B', 'Hoa (TP.HCM) vào đội B')
  assert.equal(findMember(s, 'nam'), null, 'Nam (Đà Nẵng, hạng 3) vẫn là challenger')
})

test('top 2 tỉnh theo SỐ NGƯỜI bình luận (mỗi người tính 1 lần, chống spam)', () => {
  const s = createMatch({ ...DEFAULT_SETTINGS })
  // 1 người bình luận 3 lần vẫn chỉ tính 1 (joinProvince ghi đè, không cộng dồn).
  joinProvince(s, 'hanoi', 'Lan', 'lan')
  joinProvince(s, 'hanoi', 'Lan', 'lan')
  joinProvince(s, 'hanoi', 'Lan', 'lan')
  joinProvince(s, 'hcm', 'Hoa', 'hoa')
  joinProvince(s, 'hcm', 'Minh', 'minh')
  joinProvince(s, 'danang', 'Nam', 'nam')
  const top = topProvincesByComments(s, 2)
  assert.equal(top.length, 2)
  assert.equal(top[0].code, 'hcm', 'TP.HCM 2 người phải đứng đầu')
  assert.equal(top[0].count, 2)
  assert.equal(top[1].code, 'hanoi', 'Hà Nội 1 người đứng thứ 2')
  assert.equal(top[1].count, 1, '1 người bình luận 3 lần vẫn chỉ tính 1')
})

test('đổi tỉnh: rời đội cũ, vào đội tỉnh mới; màn sau chọn lại top 2', () => {
  const s = freshMatch()
  // freshMatch có sẵn Lan (A) + Minh (B) vào bằng joinTeam (không có tỉnh).
  joinProvince(s, 'hanoi', 'Lan', 'lan2')
  joinProvince(s, 'hcm', 'Hoa', 'hoa2')
  joinProvince(s, 'hanoi', 'Minh', 'minh2')
  syncProvinceTeams(s)
  assert.equal(s.provinceTeams.A, 'hanoi')
  assert.equal(s.provinceTeams.B, 'hcm')
  assert.equal(teamLabel(s, 'A'), 'Hà Nội', 'tên đội A hiện tên tỉnh')
  assert.equal(teamLabel(s, 'B'), 'TP. Hồ Chí Minh')
  // Lan (không tỉnh, vào bằng joinTeam) vẫn giữ đội A; Minh (không tỉnh) giữ đội B.
  assert.equal(findMember(s, 'lan').teamId, 'A', 'người không có tỉnh giữ nguyên đội')
  assert.equal(findMember(s, 'minh').teamId, 'B')
  // Đà Nẵng vượt lên: thêm 3 người Đà Nẵng → màn sau Đà Nẵng thay TP.HCM.
  joinProvince(s, 'danang', 'Nam', 'nam2')
  joinProvince(s, 'danang', 'An', 'an2')
  joinProvince(s, 'danang', 'Binh', 'binh2')
  syncProvinceTeams(s)
  assert.equal(s.provinceTeams.A, 'danang', 'Đà Nẵng 3 người vượt lên đứng đầu')
  assert.equal(s.provinceTeams.B, 'hanoi', 'Hà Nội 2 người xuống thứ 2')
  assert.equal(findMember(s, 'hoa2'), null, 'Hoa (TP.HCM, rớt top 2) thành challenger')
  assert.equal(findMember(s, 'nam2').teamId, 'A', 'Nam (Đà Nẵng) vào đội A màn sau')
  // Thắng màn thì chúc mừng tên tỉnh.
  s.phase = 'pulling'
  endRound(s, 'A')
  assert.ok(s.feed.some((f) => f.text.includes('Đà Nẵng') && f.text.includes('thắng màn')), 'thắng màn phải chúc mừng tên tỉnh')
})

test('quà của người ủng hộ tỉnh challenger vẫn tính cho tỉnh + kéo cho đội yếu', () => {
  const s = freshMatch()
  joinProvince(s, 'hanoi', 'Lan', 'lan2')
  joinProvince(s, 'hcm', 'Hoa', 'hoa2')
  joinProvince(s, 'danang', 'Nam', 'nam2')
  syncProvinceTeams(s)
  assert.equal(s.provinceTeams.A, 'hanoi')
  assert.equal(s.provinceTeams.B, 'hcm')
  // Nam (Đà Nẵng, challenger) tặng quà: vẫn tính cho Đà Nẵng (BXH tỉnh).
  const r = applyPull(s, giftTeam(s, 'nam2', ''), 25, { nickname: 'Nam', userId: 'nam2', province: 'danang' }, 'nước hoa')
  assert.equal(r.ok, true)
  assert.equal(r.province, 'danang', 'quà của challenger vẫn mang tỉnh')
  assert.equal(topProvinces(s, 3)[0].code, 'danang', 'quà challenger vẫn lên BXH tỉnh')
  assert.equal(r.teamId, 'A', 'quà challenger kéo cho đội đã tính (giftTeam lúc đó = A)')
})

test('hạng Free Fire cho tỉnh theo tổng lực quà (Đồng → Đại Kiện Tướng)', () => {
  assert.equal(provinceRank(0).name, 'Đồng')
  assert.equal(provinceRank(9).name, 'Đồng')
  assert.equal(provinceRank(10).name, 'Bạc')
  assert.equal(provinceRank(24).name, 'Bạc')
  assert.equal(provinceRank(25).name, 'Vàng')
  assert.equal(provinceRank(49).name, 'Vàng')
  assert.equal(provinceRank(50).name, 'Bạch Kim')
  assert.equal(provinceRank(99).name, 'Bạch Kim')
  assert.equal(provinceRank(100).name, 'Kim Cương')
  assert.equal(provinceRank(249).name, 'Kim Cương')
  assert.equal(provinceRank(250).name, 'Huyền Thoại')
  assert.equal(provinceRank(499).name, 'Huyền Thoại')
  assert.equal(provinceRank(500).name, 'Đại Kiện Tướng')
  assert.equal(provinceRank(9999).name, 'Đại Kiện Tướng')
  assert.equal(provinceRank(100).color, '#4dabf7', 'Kim Cương màu xanh dương')
  assert.equal(provinceRank(500).color, '#ff6b6b', 'Đại Kiện Tướng màu đỏ')
})

test('Xóa BXH thì xóa luôn người ủng hộ tỉnh + đội tỉnh (bắt đầu live mới)', () => {
  const s = freshMatch()
  joinProvince(s, 'hanoi', 'Lan', 'lan2')
  joinProvince(s, 'hcm', 'Hoa', 'hoa2')
  syncProvinceTeams(s)
  assert.equal(s.provinceTeams.A, 'hanoi')
  clearBxh(s)
  assert.equal(Object.keys(s.provinceUsers).length, 0, 'xóa BXH thì xóa người ủng hộ tỉnh')
  assert.equal(s.provinceTeams.A, null, 'xóa BXH thì xóa đội tỉnh')
  assert.equal(Object.keys(s.userProvince).length, 0)
})
// ── 15. WS tự nối lại khi rớt (treo máy cả buổi) ──────────────────────────
// wsClient đã có sẵn reconnect (không viết lại) — test này chứng minh bằng
// Fake WebSocket + bắt timer: rớt → hẹn nối lại, backoff tăng dần 2s→4s→
// 8s… tối đa 30s, mở lại được thì reset về 2s và onOpen chạy lại (hook sẽ
// gửi {type:'sync'} xin catch-up các event đã lỡ).
test('WS rớt thì tự nối lại (backoff tăng dần, tối đa 30s) và mở lại xin đồng bộ', () => {
  const RealWS = globalThis.WebSocket
  const RealTimer = globalThis.setTimeout
  const timers = []
  let timerId = 0
  globalThis.setTimeout = (fn, delay) => { timers.push({ fn, delay }); return ++timerId }
  class FakeWS {
    constructor(url) { this.url = url; this.readyState = 0 }
    close() { this.readyState = 3; this.onclose?.({ code: 1006 }) }
    send() {}
  }
  globalThis.WebSocket = FakeWS
  try {
    let opens = 0
    let status = ''
    const client = new TikTokWS({
      onStatus: (st) => { status = st },
      onOpen: () => { opens++ },
      onEvent: () => {},
    })
    client.connect('example.com/ws', 'key123')
    assert.equal(status, WS_STATUS.CONNECTING, 'lần đầu là connecting')
    client.ws.onopen()
    assert.equal(status, WS_STATUS.OPEN, 'mở xong là open')
    assert.equal(opens, 1, 'mở 1 lần thì onOpen chạy 1 lần')
    // Rớt lần 1 → hẹn nối lại sau 2s.
    client.ws.onclose({ code: 1006 })
    assert.equal(status, WS_STATUS.RECONNECTING)
    assert.equal(timers.length, 1, 'rớt thì hẹn 1 timer nối lại')
    assert.equal(timers[0].delay, 2000, 'rớt lần 1 hẹn 2s')
    // Hết 2s: mở socket mới nhưng chưa mở được đã rớt tiếp → hẹn 4s.
    timers.shift().fn()
    assert.equal(status, WS_STATUS.RECONNECTING, 'đang nối lại lần 2')
    client.ws.onclose({ code: 1006 })
    assert.equal(timers[0].delay, 4000, 'rớt 2 lần liên tiếp hẹn 4s')
    // Hết 4s: mở được → lại open, bộ đếm lần thử reset.
    timers.shift().fn()
    client.ws.onopen()
    assert.equal(status, WS_STATUS.OPEN)
    assert.equal(opens, 2, 'mở lại xong thì onOpen chạy lại (hook sẽ gửi sync xin catch-up)')
    // Rớt sau khi đã mở được → lại hẹn từ 2s (không phải 8s).
    client.ws.onclose({ code: 1006 })
    assert.equal(timers[0].delay, 2000, 'đã mở lại thành công thì backoff reset về 2s')
    client.disconnect()
    assert.equal(client.wantOpen, false, 'ngắt tay thì không nối lại nữa')
  } finally {
    globalThis.WebSocket = RealWS
    globalThis.setTimeout = RealTimer
  }
})

// ─── NHÂN VẬT 3D KayKit: dáng theo thế trận ───────────────────────────────
test('DÁNG 3D: Nữ dẫn (rope > 0) → Nữ ĐẨY, Nam PHÒNG THỦ', () => {
  assert.deepEqual(posesForRope(0.6), { A: 'push', B: 'defend' })
  assert.equal(poseForSide(0.9, 'A'), 'push')
  assert.equal(poseForSide(0.9, 'B'), 'defend')
})
test('DÁNG 3D: Nam dẫn (rope < 0) → Nam ĐẨY, Nữ PHÒNG THỦ', () => {
  assert.deepEqual(posesForRope(-0.6), { A: 'defend', B: 'push' })
  assert.equal(poseForSide(-0.9, 'A'), 'defend')
  assert.equal(poseForSide(-0.9, 'B'), 'push')
})
test('DÁNG 3D: hòa (|rope| <= 0.05) → cả 2 đứng yên Idle', () => {
  assert.deepEqual(posesForRope(0), { A: 'idle', B: 'idle' })
  assert.deepEqual(posesForRope(0.05), { A: 'idle', B: 'idle' })
  assert.deepEqual(posesForRope(-0.04), { A: 'idle', B: 'idle' })
  assert.deepEqual(posesForRope(0.051), { A: 'push', B: 'defend' })
})
test('DÁNG 3D: rope rác (NaN/undefined) thì coi như hòa, không crash', () => {
  assert.deepEqual(posesForRope(NaN), { A: 'idle', B: 'idle' })
  assert.deepEqual(posesForRope(undefined), { A: 'idle', B: 'idle' })
})
test('DÁNG 3D: clip đúng tên trong GLB KayKit (Idle / Punch_A / Blocking)', () => {
  assert.equal(POSE_CLIPS.idle, 'Idle')
  assert.equal(POSE_CLIPS.push, 'Unarmed_Melee_Attack_Punch_A')
  assert.equal(POSE_CLIPS.defend, 'Blocking')
})
test('DÁNG 3D: URL GLB thử local trước rồi CDN KayKit đã ghim commit', () => {
  const a = glbUrlsFor('A')
  assert.equal(a[0], '/characters/rogue.glb')
  assert.ok(a[1].includes('cdn.jsdelivr.net/gh/KayKit-Game-Assets/'), 'fallback jsDelivr')
  assert.ok(a[2].includes('raw.githubusercontent.com/KayKit-Game-Assets/'), 'fallback raw')
  const b = glbUrlsFor('B')
  assert.equal(b[0], '/characters/knight.glb')
  assert.ok(b[1].endsWith('/Knight.glb') && b[2].endsWith('/Knight.glb'))
  assert.deepEqual(KEEP_ACCESSORIES.A, ['Knife'], 'Nữ chỉ giữ dao găm')
  assert.deepEqual(KEEP_ACCESSORIES.B, ['1H_Sword', 'Round_Shield'], 'Nam chỉ giữ kiếm + khiên tròn')
})
test('VỊ TRÍ 3D: vạch tới mép thì trượt CẢ CẶP, khoảng cách 2 người giữ nguyên', () => {
  const mid = fighterFractions(50, 0.462)
  const edge = fighterFractions(90.5, 0.462)
  assert.ok(edge.girl >= 0.05 && edge.boy <= 0.95, 'tới mép vẫn nằm trong màn')
  assert.ok(approx(edge.boy - edge.girl, mid.boy - mid.girl, 0.02), 'khoảng cách không đổi khi trượt')
  const left = fighterFractions(9.5, 0.462)
  assert.ok(approx(left.girl, 1 - edge.boy, 0.01) && approx(left.boy, 1 - edge.girl, 0.01), '2 mép đối xứng nhau')
})
test('VỊ TRÍ 3D: mỗi người cách vạch giữa đúng CHAR_OFFSET, không chạm mặt', () => {
  const halfW = VISIBLE_HALF_H * 0.462
  const { girlX, boyX } = fighterWorldPositions(50, halfW)
  assert.ok(approx(girlX, -CHAR_OFFSET) && approx(boyX, CHAR_OFFSET))
  assert.ok(boyX - girlX >= 1.5, 'tâm 2 người cách nhau ≥ 1,5m — mặt không chạm nhau')
  assert.deepEqual(fighterWorldPositions(NaN, halfW), fighterWorldPositions(50, halfW), 'divider rác thì coi như giữa')
})
test('BẢNG HƯỚNG DẪN: 7 dòng — 4 quà (ảnh TikTok thật) + tim/follow/cmt, đúng luật 17:51', () => {
  assert.equal(GUIDE_ROWS.length, 7, '4 dòng quà + 3 dòng tương tác')
  assert.deepEqual(GUIDE_ROWS.map((r) => r.side), ['A', 'B', 'B', 'A', 'A', 'B', null])
  const text = GUIDE_ROWS.map((r) => `${r.left} → ${r.right}`).join(' | ')
  assert.ok(text.includes('Hoa hồng → Nữ'), 'hoa hồng → Nữ')
  assert.ok(text.includes('Quà TikTok → Nam'), 'quà TikTok → Nam')
  assert.ok(text.includes('Nước hoa → Nam'), 'nước hoa → Nam (chuyển phe 17:51)')
  assert.ok(text.includes('Bánh vòng → Nữ'), 'bánh vòng → Nữ (mới 17:51)')
  assert.ok(text.includes('100 tim → Nữ +10'), '100 tim → Nữ +10')
  assert.ok(text.includes('1 follow → Nam +10'), '1 follow → Nam +10')
  assert.ok(text.includes('Cmt boy/nam · girl/nữ → +1'), 'cmt boy/nam · girl/nữ → +1')
  for (const r of GUIDE_ROWS.slice(0, 4)) {
    assert.ok(r.img && r.img.startsWith('/gifts/') && r.img.endsWith('.webp'), 'dòng quà dùng ảnh TikTok thật')
  }
  for (const r of GUIDE_ROWS) {
    assert.ok(!('icon' in r), 'không còn icon emoji chung chung')
    assert.ok(r.left && r.right, 'mỗi dòng có chữ')
  }
  for (const r of GUIDE_ROWS.slice(4)) assert.ok(r.lucide, 'dòng tương tác dùng icon UI của game')
})

test('BẢNG PHE QUÀ (17:51): nước hoa → Nam, bánh vòng → Nữ; hoa hồng → Nữ, TikTok → Nam', () => {
  assert.equal(giftTeamFor('nước hoa'), 'B', 'nước hoa chuyển từ Nữ sang Nam')
  assert.equal(giftTeamFor('perfume'), 'B')
  assert.equal(giftTeamFor('bánh vòng'), 'A', 'bánh vòng mới → Nữ')
  assert.equal(giftTeamFor('cheese donuts'), 'A')
  assert.equal(giftTeamFor('hoa hồng'), 'A')
  assert.equal(giftTeamFor('tiktok'), 'B')
  assert.equal(giftTeamFor('little kisses'), 'A', 'quà khác giữ nguyên phe cũ')
  assert.equal(giftTeamFor('kem ốc quế'), 'B')
})

test('GIÁ XU THẬT (ảnh tấn gửi 17:48): bánh vòng 30, bó hoa/thả tim/tay cầm/hộp quà 100, thiên hà 1000', () => {
  assert.equal(giftPrice('bánh vòng'), 30)
  assert.equal(giftPrice('nước hoa'), 20)
  assert.equal(giftPrice('bó hoa'), 100)
  assert.equal(giftPrice('thả tim'), 100)
  assert.equal(giftPrice('tay cầm chơi game'), 100)
  assert.equal(giftPrice('hộp quà bóng bay'), 100)
  assert.equal(giftPrice('gg siêu khủng'), 100)
  assert.equal(giftPrice('thiên hà'), 1000)
  assert.equal(giftPrice('súng bắn tiền'), 500)
  assert.equal(giftPrice('chó corgi'), 299)
  assert.equal(giftPrice('tim'), 199)
  assert.equal(giftPrice('mũ và ria mép'), 99)
  assert.equal(giftPrice('hạc giấy'), 99)
  assert.equal(giftPrice('hoa hồng'), 1)
})

test('QUÀ 100 XU → spotlight: giá ≥100 hiện giữa màn, 99 xu trở xuống không', () => {
  assert.equal(isSpotlightGift('bó hoa'), true, 'bó hoa 100 xu')
  assert.equal(isSpotlightGift('thả tim'), true, 'thả tim 100 xu')
  assert.equal(isSpotlightGift('thiên hà'), true, 'thiên hà 1000 xu cũng spotlight')
  assert.equal(isSpotlightGift('hạc giấy'), false, 'hạc giấy 99 xu không spotlight')
  assert.equal(isSpotlightGift('mũ và ria mép'), false, '99 xu không spotlight')
  assert.equal(isSpotlightGift('hoa hồng'), false, 'quà 1 xu không spotlight')
  assert.equal(isSpotlightGift('quà lạ'), false, 'quà không rõ giá không spotlight')
  assert.equal(isSpotlightGift(''), false)
  assert.equal(isSpotlightGift(null), false)
})

test('QUÀ NƯỚC HOA → điểm Nam tăng; BÁNH VÒNG → điểm Nữ tăng (qua GiftEngine)', () => {
  const s = freshMatch()
  const eng = new GiftEngine(s)
  const beforeB = s.roundScore.B || 0
  eng.receive({ id: 'g-nh', giftName: 'nước hoa', nickname: 'Hoa', userId: 'hoa' })
  const res = eng.process(s.now + 1)
  assert.ok(res.ok, 'quà nước hoa phải được xử lý')
  assert.ok((s.roundScore.B || 0) > beforeB, 'nước hoa phải cộng điểm Nam')
  const beforeA = s.roundScore.A || 0
  eng.receive({ id: 'g-bv', giftName: 'bánh vòng', nickname: 'Banh', userId: 'banh' })
  eng.process(s.now + 2)
  assert.ok((s.roundScore.A || 0) > beforeA, 'bánh vòng phải cộng điểm Nữ')
})

test('QUÀ CÓ AVATAR → hiệu ứng quà mang avatar sang spotlight (đường dữ liệu đầy đủ)', () => {
  const s = freshMatch()
  const eng = new GiftEngine(s)
  eng.receive({ id: 'g-av', giftName: 'bó hoa', nickname: 'Hoa', userId: 'hoa', avatar: 'https://cdn.example.com/h.jpg' })
  eng.process(s.now + 1)
  const fx = s.effects.filter((e) => e.kind === 'gift').pop()
  assert.ok(fx, 'phải có hiệu ứng gift')
  assert.equal(fx.spotlight, true, 'bó hoa 100 xu là spotlight')
  assert.equal(fx.avatar, 'https://cdn.example.com/h.jpg', 'avatar phải đi từ event quà tới hiệu ứng')
  assert.equal(fx.sender, 'Hoa')
  assert.equal(fx.gift, 'bó hoa')
})

test('SPOTLIGHT Ở LẠI ĐỦ 4,5 GIÂY: quà nhỏ tới sau không xóa hiệu ứng spotlight', () => {
  const s = freshMatch()
  applyPull(s, 'A', 100, { nickname: 'Hoa', userId: 'hoa' }, 'bó hoa')
  applyPull(s, 'B', 5, { nickname: 'Nam', userId: 'nam' }, 'quả đào')
  const spots = s.effects.filter((e) => e.kind === 'gift' && e.spotlight)
  assert.equal(spots.length, 1, 'spotlight bó hoa vẫn còn trong effects dù quà nhỏ tới sau')
  assert.equal(spots[0].dur, 4.5)
  assert.equal(spots[0].sender, 'Hoa')
  step(s, 2)
  assert.equal(s.effects.filter((e) => e.kind === 'gift' && e.spotlight).length, 1, 'sau 2s (quà nhỏ đã hết) spotlight vẫn hiện')
  step(s, 3)
  assert.equal(s.effects.filter((e) => e.kind === 'gift' && e.spotlight).length, 0, 'sau 4,5s spotlight tự mất')
})

test('HIỆU ỨNG QUÀ 100 XU: spotlight mang avatar + giá xu, hiện 4,5 giây; hạc giấy 99 xu thì không', () => {
  const s = freshMatch()
  applyPull(s, 'A', 100, { nickname: 'Hoa', userId: 'hoa', avatar: 'https://x/avatar.jpg' }, 'bó hoa')
  const fx = s.effects.filter((e) => e.kind === 'gift').pop()
  assert.ok(fx, 'phải có hiệu ứng gift')
  assert.equal(fx.spotlight, true, 'bó hoa 100 xu phải là spotlight')
  assert.equal(fx.avatar, 'https://x/avatar.jpg', 'hiệu ứng mang avatar người tặng')
  assert.equal(fx.coins, 100, 'hiệu ứng mang giá xu')
  assert.equal(fx.dur, 4.5, 'spotlight hiện 4,5 giây')
  assert.equal(fx.big, true, 'quà 100 xu vẫn là quà to')
  applyPull(s, 'B', 100, { nickname: 'Minh', userId: 'minh' }, 'hạc giấy')
  const fx2 = s.effects.filter((e) => e.kind === 'gift').pop()
  assert.equal(fx2.big, true, 'hạc giấy vẫn là quà to (pháo hoa)')
  assert.equal(fx2.spotlight, false, 'hạc giấy 99 xu không phải spotlight')
  assert.equal(fx2.dur, 3.5, 'quà to thường hiện 3,5 giây')
})


test('QUÀ 100 XU GÁN CỐ ĐỊNH PHE (19:12): mỗi món có phe riêng, không về phe thua', () => {
  const nu = ['bó hoa', 'bouquet', 'thả tim', 'hand hearts', 'hand heart', 'tim', 'hearts',
    'hộp quà bóng bay', 'balloon gift box', 'buổi sáng tốt lành', 'good morning',
    'cuối tuần vui vẻ', 'happy weekend', 'hạc giấy', 'paper crane']
  const nam = ['tay cầm chơi game', 'game controller', 'súng bắn tiền', 'money gun',
    'gg siêu khủng', 'epic gg', 'mũ và ria mép', 'hat and mustache', 'thiên hà', 'galaxy',
    'ú òa', 'peeka-bro', 'peeka bro', 'chó corgi', 'corgi']
  for (const g of nu) assert.equal(giftTeamFor(g), 'A', `${g} phải đẩy Nữ`)
  for (const g of nam) assert.equal(giftTeamFor(g), 'B', `${g} phải đẩy Nam`)
  assert.equal(giftTeamFor('gg'), 'B', 'gg cũ vẫn ở Nam, khác gg siêu khủng')
  assert.equal(giftTeamFor('thả tim cho tôi'), 'B', 'thả tim cho tôi vẫn ở Nam, khác thả tim bên Nữ')
})

test('QUÀ 100 XU GÁN CỐ ĐỊNH: tặng thử từng món → điểm tăng đúng phe (qua GiftEngine)', () => {
  const s = freshMatch()
  const eng = new GiftEngine(s)
  const a0 = s.roundScore.A || 0, b0 = s.roundScore.B || 0
  eng.receive({ id: 'g-bh', giftName: 'bó hoa', nickname: 'Hoa', userId: 'hoa' })
  eng.process(s.now + 1)
  assert.ok((s.roundScore.A || 0) > a0, 'bó hoa 100 xu phải cộng điểm Nữ')
  eng.receive({ id: 'g-tc', giftName: 'tay cầm chơi game', nickname: 'Nam', userId: 'nam' })
  eng.process(s.now + 2)
  assert.ok((s.roundScore.B || 0) > b0, 'tay cầm chơi game 100 xu phải cộng điểm Nam')
  const a1 = s.roundScore.A || 0
  eng.receive({ id: 'g-th', giftName: 'thiên hà', nickname: 'Sao', userId: 'sao' })
  eng.process(s.now + 3)
  assert.ok((s.roundScore.B || 0) > b0, 'thiên hà 1000 xu phải cộng điểm Nam')
  assert.equal(s.roundScore.A || 0, a1, 'thiên hà không được cộng điểm Nữ')
})

test('ĂN MỪNG QUÀ 100 XU: chỉ phe nhận quà nhảy Cheer 4,5s, phe kia giữ dáng cũ', () => {
  assert.equal(CELEBRATE_MS, 4500, 'ăn mừng khớp thời gian spotlight 4,5s')
  assert.equal(POSE_CLIPS[POSE_CELEBRATE], 'Cheer', 'clip ăn mừng là Cheer có sẵn trong GLB')
  const now = 100000
  const cel = { team: 'A', until: now + CELEBRATE_MS }
  assert.equal(isCelebrating(cel, 'A', now), true, 'phe A đang ăn mừng')
  assert.equal(isCelebrating(cel, 'B', now), false, 'phe B không ăn mừng')
  assert.equal(poseForSideWithCelebrate(0.6, 'A', cel, now), POSE_CELEBRATE, 'phe A dẫn nhưng ăn mừng thay vì đẩy')
  assert.equal(poseForSideWithCelebrate(0.6, 'B', cel, now), 'defend', 'phe B thua vẫn phòng thủ')
  assert.equal(isCelebrating(cel, 'A', now + CELEBRATE_MS), false, 'hết 4,5s thì hết ăn mừng')
  assert.equal(poseForSideWithCelebrate(0.6, 'A', cel, now + CELEBRATE_MS), 'push', 'hết ăn mừng thì về dáng đẩy theo thế trận')
  assert.equal(isCelebrating(null, 'A', now), false, 'không có quà 100 xu thì không ăn mừng')
  assert.equal(isCelebrating({ team: 'B', until: Infinity }, 'B', now), true, 'until vô cực (chụp ảnh) thì ăn mừng liên tục')
})

test('QUÀ NHỎ KHÔNG ĂN MỪNG: chỉ quà 100 xu mới có spotlight để ăn mừng theo', () => {
  const s = freshMatch()
  applyPull(s, 'A', 5, { nickname: 'Nho', userId: 'nho' }, 'quả đào')
  const fx = s.effects.filter((e) => e.kind === 'gift').pop()
  assert.equal(fx.spotlight, false, 'quà nhỏ không phải spotlight nên không ăn mừng')
  applyPull(s, 'B', 100, { nickname: 'Hoa', userId: 'hoa' }, 'bó hoa')
  const fx2 = s.effects.filter((e) => e.kind === 'gift').pop()
  assert.equal(fx2.spotlight, true, 'quà 100 xu là spotlight → phe nhận ăn mừng')
  assert.equal(fx2.team, 'B', 'ăn mừng đúng phe nhận quà (Nam)')
  assert.equal(fx2.dur, 4.5, 'spotlight/ăn mừng kéo dài 4,5 giây')
})


console.log('\n⚔️ NAM vs NỮ LIVE — test logic đẩy (vạch giữa chạm mép = thắng màn)')
for (const line of results) console.log(line)
console.log(`\n${pass} đậu · ${fail} rớt · tổng ${pass + fail}`)
if (fail > 0) process.exit(1)
