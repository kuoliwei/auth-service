# Design — authentication-foundation

> 忠實記錄 auth-service **當前的設計結構**。行為（做什麼）在 main spec，本文記錄**結構與決策（怎麼組成的）**。
> 只描述現況，不寫理由、不做評判。

## 三層架構（Controller → Service → Repository）

請求依序經過三層：
- `controllers/authController.js`：處理 HTTP——讀 body、設定 status、組回應、把 service 拋出的語意錯誤碼映射成 HTTP code。
- `services/authService.js`：業務邏輯——查重、bcrypt 雜湊/比對、決定簽發 JWT。
- `repositories/userApiClient.js`：資料存取——對 user-service 發 HTTP。

## 資料儲存

auth-service 沒有自己的資料庫。`userApiClient.js` 透過 `GET /users?email=` 查詢、`POST /users` 儲存，
對象為 user-service（`USER_SERVICE_URL`，預設 `http://localhost:4000`）。

## JWT 簽章

`jwtHelper.generateToken()` 用 `JWT_SECRET`（HMAC / 對稱式 HS256）簽發，payload 為 `{ id }`，效期 7 天。
api-gateway 用同一把 `JWT_SECRET` 驗章，因此 `JWT_SECRET` 跨服務一致。本服務只簽發、不驗證。

## 錯誤處理

Service 層拋出語意錯誤碼（`EMAIL_ALREADY_EXISTS`、`UNKNOWN_USER`、`EMAIL_OR_PASSWORD_NOTMATCH`、`UNKNOWN_SERVER_ERROR`），
Controller 映射成 HTTP status 與使用者訊息。登入的兩種失敗（`UNKNOWN_USER`、`EMAIL_OR_PASSWORD_NOTMATCH`）回相同的使用者訊息「Email或密碼錯誤」。

## 輸入驗證

`validateMiddleware` 以 `schemas/authSchema.js` 的 `registerSchema`（email 格式 + password ≥ 6）驗 body，
同時掛在 register 與 login 兩條路由上。驗證失敗直接回 HTTP 400，訊息「EMAIL或密碼格式不正確」，不帶結構化錯誤碼。

## 現存但未在有效路徑上的模組

- `middlewares/authMiddleware.js`：未被任何路由掛載。
- `utils/jwtHelper.js` 的 `verifyToken()`：無呼叫點。
- `controllers/authController.js` 的 `me()`：方法存在但未掛路由。
- `users.json`（內容 `[]`）：早期明文儲存階段的檔案。

## 其他現況

- `PORT` 於 `app.js` 直接設為 `3000`（未讀環境變數）。
- CORS 於 `app.js` 設定 `origin: 'http://localhost:8000'`。
- 測試：`authController.test.js` 可執行；`authService.test.js` 因 mock 路徑指向不存在的 `userRepository.js` 而無法執行；`userApiClient.js` 無單元測試。
