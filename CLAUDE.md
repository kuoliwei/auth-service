# auth-service

這是一個學習性質的多微服務專案的其中一個服務。整體目標是打造一個類似 Character.ai 的 AI 角色聊天平台。使用者沒有建構此類系統的經驗，偏好「教學引導、讓使用者自己動手」的協作方式——解釋概念、引導思考，再讓使用者自己實作，不要直接把完整程式碼貼給他。可以給方向和範例片段，但不要直接寫完整的最終程式碼讓他複製貼上。

## 這個專案的角色：auth-service

只負責 register 和 login，port 3000。已實作 `GET /api/v1/auth/me`（讀 controller），但目前**沒有掛載到任何路由**——JWT 驗證已經完全交給 api-gateway 處理，這個 controller 方法形同遺留代碼，可以考慮清掉或之後重新接上。

## 系統全貌

```
前端 persona-nexus-auth (5173)
  ↓
api-gateway :8000（JWT 驗證、路由轉發）
  ├── /auth/*       → auth-service :3000（本專案）
  ├── /users/*      → user-service :4000
  └── /characters/* → character-service :5000
```

相關專案路徑（已整合到同一工作資料夾下）：
- `C:\Users\MSI3090\persona-nexus-platform\auth-service`（本專案）
- `C:\Users\MSI3090\persona-nexus-platform\user-service`
- `C:\Users\MSI3090\persona-nexus-platform\api-gateway`
- `C:\Users\MSI3090\persona-nexus-platform\character-service`
- `C:\Users\MSI3090\persona-nexus-platform\persona-nexus-auth` / `-character` / `-lobby`（前端）

## 技術棧

Node.js + Express 5 + ESM modules，三層架構 Controller → Service → Repository（`userApiClient.js` 取代原本的 DB repository），Zod 做輸入驗證（`schemas/authSchema.js` + `validateMiddleware.js`），Jest + Babel 測試，bcrypt 雜湊密碼，jsonwebtoken 簽發 JWT。

## 密碼與 JWT 細節

- 密碼雜湊：`authService.register()` 用 `bcrypt.hash(password, 10)`（saltRounds=10），登入用 `bcrypt.compare()`。明文密碼從不落地，也從不在 API 回應中出現。
- JWT：`src/utils/jwtHelper.js` 用 `JWT_SECRET`（`.env`）簽發，payload 只含 `{ id: userId }`，效期 7 天。這個 secret 必須跟 `api-gateway` 的 `.env` 一致。
- `userApiClient.js` 把已雜湊的密碼透過 `POST http://localhost:4000/users` 存進 user-service，本服務自己沒有資料庫。

## 演進歷史（重要背景）

1. 一開始用 `users.json` 明文密碼儲存
2. 加上 bcrypt 雜湊、login、JWT
3. 改用 Prisma 7 + SQLite，過程中踩了不少 Prisma 7 的坑（datasource url 搬到 prisma.config.ts、WASM engine 強制要 driver adapter、libsql adapter 接收的是 config 物件不是 client 實例等）
4. 為了練習微服務拆分，把用戶資料存取抽離成獨立的 `user-service`，本專案改用 `userApiClient.js`（HTTP fetch）取代原本的 Prisma repository
5. 建立 `api-gateway` 統一處理 JWT 驗證後，本專案移除了 `authMiddleware`、`GET /me` 端點掛載、以及全部 Prisma 相關檔案和依賴（因為不再直接存取資料庫）——**Prisma 已徹底移除**：無 `prisma/` 目錄、無 `schema.prisma`、`package.json` 不含任何 prisma 依賴。`.gitignore` 和 `.env` 裡仍殘留 `prisma/dev.db` 相關字樣，是歷史痕跡，不影響功能。

## 目前狀態

功能正常運作（register、login 透過 gateway 測試通過）。已有 Jest 測試覆蓋 `authController` 和 `authService`（共 16 個測試案例），但 `userApiClient.js` 本身仍沒有單元測試。

`package.json` 沒有 `dev` script，要跑服務得手動 `node src/app.js`。

## 已知缺口 / 設計決策（刻意不做的事）

- `userApiClient.js` 沒有單元測試——學習階段不需要每個檔案都補測試
- 資安加固（rate limiting 等）先不處理
- 舊註解程式碼不需要清理——內部學習用，非正式上線
- 沒有 lint 設定檔
- 沒有 `npm run dev`，需直接跑 `node src/app.js`

## 注意：與前端的整合落差

`persona-nexus-auth` 登入成功後目前**沒有把拿到的 JWT 存進 localStorage**，也沒有導向大廳。也就是說即使本服務和 gateway 都正常簽發/驗證 token，使用者登入後仍無法真正進入需要 JWT 的頁面（大廳、角色編輯）。這個缺口在前端專案（`persona-nexus-auth`），與本服務無關，但會直接影響整個系統能否走完登入流程，需要留意。
