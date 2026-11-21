# NAM vs NỮ LIVE

Game đối đầu 2 phe tương tác trên TikTok LIVE — **chỉ tặng quà mới đẩy**, không cần
vào đội. Màn hình chia đôi hồng (GIRL) / xanh (BOY), lửa 2D, 2 nhân vật blocky tự vẽ.

## Luật chơi

- **Quà tặng quyết định phe:** hoa hồng → đẩy Nữ, quà TikTok → đẩy Nam (quà khác
  gán theo bảng phe, quà lạ → phe đang thua). Điểm theo giá quà: 1 / 5 / 10 / 25 / 100.
- **100 tim** → +10 cho Nữ. **1 follow** → +10 cho Nam.
- **Bình luận** `boy` / `nam` → +1 cho Nam, `girl` / `nữ` → +1 cho Nữ (đẩy ngay).
- **Điểm chỉ cộng lên**, bên thua giữ nguyên, không trừ, không tắt dần.
- **Đẩy chậm để kích quà:** ngưỡng thắng chênh 100 điểm — cmt/tim chỉ nhích ít,
  quà to đẩy vọt. Hết 60s phe điểm cao thắng màn, thắng 2 màn thì vô địch trận.
- **WIN:** vô địch 1 trận thì WIN phe đó +1, tích lũy cả phiên (xem 2 góc trên màn hình).
- **Treo máy:** mở trang ~5s tự bắt đầu, hết màn 10s tự sang màn sau, hết trận 15s
  tự trận mới; WS TikTok tự nối lại. Không ai tương tác thì 0-0, hết giờ hòa.

## Stack

| Phần | Công nghệ |
|---|---|
| Game (web) | React 19 + Vite, 2D thuần (CSS/SVG, không 3D) |
| Backend API | Node tối giản (`server/`, không thư viện ngoài) — `GET /health`, `POST /match-result`, `GET /leaderboard` |
| TikTok LIVE | Nối qua WebSocket connector có sẵn (`wss://<app>.onrender.com/ws?key=`) — **không dựng lại connector** |
| Realtime | WebSocket + BroadcastChannel (màn hiển thị ↔ Admin, 2 tab cùng trình duyệt) |
| Database | Chưa dùng — kết quả trận chỉ lưu tạm trong bộ nhớ API |
| Deploy | **Tất cả trên Render**: Static Site cho game + Web Service cho API, khai báo đủ trong `render.yaml` |

## Chạy local

```bash
npm install
npm run dev        # game ở http://localhost:5174  (màn hiển thị /)
                   # Admin ở http://localhost:5174/admin (mở tab riêng)
npm test           # test logic: node tests/tug.test.js (73 test)
npm run build      # build ra dist/
```

API local (tùy chọn):

```bash
cd server && node server.js   # http://localhost:3000/health
```

## Deploy lên Render (Blueprint)

1. Push repo này lên GitHub (repo `nam-vs-nu-live`, riêng với repo Kéo Co).
2. Render Dashboard → **New → Blueprint** → chọn repo.
3. Render tạo 2 dịch vụ từ `render.yaml`:
   - **Static Site** `nam-vs-nu-live` — build `npm install && npm run build`, publish `dist`,
     rewrite SPA `/* → /index.html` để `/admin` chạy được.
   - **Web Service** `nam-vs-nu-live-api` — `node server.js` (thư mục `server/`).
4. Điền env trên Render (mục **Environment**, từng dịch vụ):
   - Static Site: `VITE_API_URL` (vd `https://nam-vs-nu-live-api.onrender.com`).
   - API: `SUPABASE_URL`, `SUPABASE_SERVICE_KEY` (nếu muốn lưu kết quả lên Supabase).
   - **Không có env thì cả hai vẫn chạy** — API lưu tạm trong bộ nhớ, game chạy local.

> ⚠️ **Không áp blueprint này vào repo Kéo Co** (`pet-marathon-live`) — tên service
> đã đổi riêng cho Nam vs Nữ, áp nhầm sẽ ghi đè game Kéo Co đang live.
