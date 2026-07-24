# auth-service

這是一個學習性質的多微服務專案的其中一個服務。整體目標是打造一個類似 Character.ai 的 AI 角色聊天平台。使用者沒有建構此類系統的經驗，偏好「教學引導、讓使用者自己動手」的協作方式——解釋概念、引導思考，再讓使用者自己實作，不要直接把完整程式碼貼給他。可以給方向和範例片段，但不要直接寫完整的最終程式碼讓他複製貼上。

## 這個專案的角色：auth-service

只負責 register 和 login，port 3000（可由 `PORT` 環境變數覆寫）。JWT 驗證完全交給 api-gateway 處理，本服務只簽發、不驗證。

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

Node.js + Express 5 + ESM modules，三層架構 Controller → Service → Repository（`userRepository.js`，實作為 HTTP client 打 user-service），Zod 做輸入驗證（`schemas/authSchema.js` + `validateMiddleware.js`），Jest + Babel 測試，bcrypt 雜湊密碼，jsonwebtoken 簽發 JWT。

> `validateMiddleware` 只掛在 `register` 路由（用 `registerSchema`：email 格式 + password ≥ 6）。**login 不做格式驗證**——輸入正確與否由後續認證流程自然反映（原本兩路由共用 registerSchema 的耦合已在 `simplify-auth-service` change 移除）。
> controller 的錯誤碼→HTTP 映射用 `ERROR_MAP` 查表（非 if/else），新增錯誤碼只需加一筆。

## 密碼與 JWT 細節

- 密碼雜湊：`authService.register()` 用 `bcrypt.hash(password, 10)`（saltRounds=10），登入用 `bcrypt.compare()`。明文密碼從不落地，也從不在 API 回應中出現。
- JWT：`src/utils/jwtHelper.js` 用 `JWT_SECRET`（`.env`）簽發，payload 只含 `{ id: userId }`，效期 7 天。這個 secret 必須跟 `api-gateway` 的 `.env` 一致。
- `userRepository.js` 把已雜湊的密碼透過 `POST http://localhost:4000/users` 存進 user-service，本服務自己沒有資料庫。

## 演進歷史（重要背景）

1. 一開始用 `users.json` 明文密碼儲存
2. 加上 bcrypt 雜湊、login、JWT
3. 改用 Prisma 7 + SQLite，過程中踩了不少 Prisma 7 的坑（datasource url 搬到 prisma.config.ts、WASM engine 強制要 driver adapter、libsql adapter 接收的是 config 物件不是 client 實例等）
4. 為了練習微服務拆分，把用戶資料存取抽離成獨立的 `user-service`，本專案改用 HTTP client（HTTP fetch）取代原本的 Prisma repository
5. 建立 `api-gateway` 統一處理 JWT 驗證後，本專案移除了 `GET /me` 端點掛載、以及全部 Prisma 相關檔案和依賴（因為不再直接存取資料庫）——**Prisma 已徹底移除**：無 `prisma/` 目錄、無 `schema.prisma`、`package.json` 不含任何 prisma 依賴。唯一殘留是 `.gitignore` 第 147 行的 `/src/generated/prisma`（歷史痕跡，不影響功能）。**注意：`.env` 並無任何 prisma 字樣**。
6. 依《後端系統設計原則》稽核（見 `mistake.md`）後，以 change `simplify-auth-service` 做了一輪清理：刪除死代碼（`authMiddleware.js`、`jwtHelper.verifyToken()`、`authController.me()`、`users.json`）、移除 login 的格式驗證、把 repository 依角色命名（`userApiClient.js` → `userRepository.js`）、錯誤碼改 `ERROR_MAP` 查表、`PORT`/`CORS_ORIGIN` 外部化到 env。

## 目前狀態

功能正常運作（register、login 透過 gateway 測試通過）。

**測試現況（實跑 `npx jest` 驗證）：**
- ✅ `authController.test.js` — 通過（7 個案例，已移除測 `me()` 的舊案例）。
- ✅ `authService.test.js` — 通過（7 個案例）。原本因 mock 路徑指向不存在的 `userRepository.js` 而無法執行，`simplify-auth-service` 把 repository 改名為 `userRepository.js` 後路徑對上、自動修復。
- 合計 2 suites / 14 tests 全通過。
- `userRepository.js` 本身仍沒有單元測試。
- 路由層（middleware 掛載、login 不驗格式等）以 `test.http` 手動驗證，單元測試只專注腳本本身。

`package.json` **有** `dev` script（`"dev": "node src/app.js"`），可用 `npm run dev` 啟動；也可直接 `node src/app.js`。

## 已知缺口 / 設計決策（刻意不做的事）

- `userRepository.js` 沒有單元測試——學習階段不需要每個檔案都補測試
- 資安加固（rate limiting 等）先不處理
- 沒有 lint 設定檔

（先前的遺留代碼 `authMiddleware.js`、`jwtHelper.verifyToken()`、`authController.me()`、`users.json` 已於 `simplify-auth-service` change 清除，見上方演進歷史第 6 點。）

## 注意：與前端的整合落差

`persona-nexus-auth` 登入成功後目前**沒有把拿到的 JWT 存進 localStorage**，也沒有導向大廳。也就是說即使本服務和 gateway 都正常簽發/驗證 token，使用者登入後仍無法真正進入需要 JWT 的頁面（大廳、角色編輯）。這個缺口在前端專案（`persona-nexus-auth`），與本服務無關，但會直接影響整個系統能否走完登入流程，需要留意。
