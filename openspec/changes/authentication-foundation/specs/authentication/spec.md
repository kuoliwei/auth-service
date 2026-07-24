# authentication (delta) — authentication-foundation

> **凍結的地基快照**：這份 delta 記錄「auth-service 當初新增了哪些認證能力」，內容對應 main spec
> `openspec/specs/authentication/spec.md` 在地基階段的狀態。它是 provenance（來歷），**不隨後續優化更動**；
> 系統之後的演進請改 main spec，勿改這裡。

## ADDED Requirements

### Requirement: 使用者註冊
系統 SHALL 允許新使用者以 email 與密碼註冊。密碼 MUST 先經 bcrypt（saltRounds=10）雜湊再委派儲存，
系統 MUST NOT 儲存或回傳明文密碼。使用者 id SHALL 由本服務以 `usr_<Date.now()>` 產生。

#### Scenario: 成功註冊
- **WHEN** 收到 `POST /api/v1/auth/register`，body 含合法 email 與長度 ≥ 6 的密碼，且該 email 尚未存在
- **THEN** 系統以 bcrypt 雜湊密碼、產生 `usr_<timestamp>` id、透過 user-service 儲存，回傳 HTTP 201 與 `{ status:"success", message:"註冊成功！", data:{ id, email } }`

#### Scenario: email 已存在
- **WHEN** 收到註冊請求，但 user-service 查得該 email 已存在
- **THEN** service 拋出 `EMAIL_ALREADY_EXISTS`，controller 回傳 HTTP 400 與 `{ status:"error", message:"該電子郵件已被註冊，請更換帳號。" }`

#### Scenario: 註冊時發生非預期錯誤
- **WHEN** 註冊過程中 user-service 呼叫失敗或發生未預期例外
- **THEN** service 將其包裝為 `UNKNOWN_SERVER_ERROR`，controller 回傳 HTTP 500 與 `{ status:"error", message:"伺服器內部發生錯誤，請稍後再試。" }`

### Requirement: 使用者登入
系統 SHALL 以 email 與密碼驗證使用者，成功時回傳使用者資料與一枚有效期 7 天的 JWT。
密碼比對 MUST 使用 `bcrypt.compare()`。

#### Scenario: 成功登入
- **WHEN** 收到 `POST /api/v1/auth/login`，email 存在且密碼經 bcrypt 比對正確
- **THEN** 系統以 `generateToken(userId)` 簽發 JWT，回傳 HTTP 200 與 `{ status:"success", message:"登入成功！", data:{ id, email, token } }`

#### Scenario: email 不存在
- **WHEN** 收到登入請求，但 user-service 查無此 email
- **THEN** service 拋出 `UNKNOWN_USER`，controller 回傳 HTTP 400 與 `{ status:"error", message:"Email或密碼錯誤，請輸入正確的Email或密碼。" }`

#### Scenario: 密碼錯誤
- **WHEN** email 存在但 `bcrypt.compare()` 回傳 false
- **THEN** service 拋出 `EMAIL_OR_PASSWORD_NOTMATCH`，controller 回傳 HTTP 400 與 `{ status:"error", message:"Email或密碼錯誤，請輸入正確的Email或密碼。" }`

#### Scenario: 登入時發生非預期錯誤
- **WHEN** 登入過程中發生未預期例外
- **THEN** service 包裝為 `UNKNOWN_SERVER_ERROR`，controller 回傳 HTTP 500

### Requirement: 輸入驗證
系統 SHALL 在進入 controller 前，以 `validateMiddleware` 驗證請求 body。地基階段該 middleware 固定使用
`registerSchema`（email 須為合法 email 格式、password 長度 ≥ 6），且同時掛在 register 與 login 兩條路由上。
驗證失敗時系統 SHALL 直接回傳 HTTP 400，訊息為籠統字串，不提供結構化錯誤碼。

#### Scenario: 格式不合法（註冊或登入皆同）
- **WHEN** 任一路由的 body 中 email 格式不合法，或 password 長度 < 6
- **THEN** validateMiddleware 直接回傳 HTTP 400 與 `{ status:"error", message:"EMAIL或密碼格式不正確" }`，不進入 controller

### Requirement: JWT 簽發
系統 SHALL 使用環境變數 `JWT_SECRET` 簽發 JWT，payload MUST 僅含 `{ id: userId }`，有效期 SHALL 為 7 天。
此 `JWT_SECRET` MUST 與 api-gateway 的 `JWT_SECRET` 一致（gateway 負責驗證）。本服務 SHALL NOT 驗證 JWT。

#### Scenario: 登入成功時簽發
- **WHEN** 使用者登入成功
- **THEN** `jwtHelper.generateToken(userId)` 以 `JWT_SECRET` 簽發 `{ id }`、`expiresIn: '7d'` 的 token 並回傳

### Requirement: 密碼安全
密碼 MUST 以 bcrypt（saltRounds=10）雜湊。明文密碼 MUST NOT 落地、MUST NOT 出現在任何 API 回應中。

#### Scenario: 註冊時雜湊
- **WHEN** 使用者以明文密碼註冊
- **THEN** 系統儲存 `bcrypt.hash(password, 10)` 的結果（形如 `$2b$10$...`），回應中僅含 `{ id, email }`

### Requirement: 使用者資料委派
auth-service SHALL NOT 擁有自己的資料庫。所有使用者查詢與儲存 MUST 透過 `userApiClient.js` 以 HTTP 呼叫
user-service（`USER_SERVICE_URL`，預設 `http://localhost:4000`）。

#### Scenario: 查詢 email
- **WHEN** service 需確認 email 是否存在
- **THEN** `userApiClient.findByEmail(email)` 發 `GET {USER_SERVICE_URL}/users?email=<email>`；200 回傳使用者、404 回傳 null、其他狀態拋錯

#### Scenario: 儲存新使用者
- **WHEN** service 完成雜湊與組裝後需存檔
- **THEN** `userApiClient.save(user)` 發 `POST {USER_SERVICE_URL}/users`，body 為 `{ id, email, password(已雜湊) }`

### Requirement: 錯誤碼與 HTTP 對應
系統 SHALL 於 service 層拋出語意化錯誤碼，由 controller 映射為 HTTP 狀態碼與使用者訊息。
回應 body MUST 為 `{ status, message }` 結構。

#### Scenario: 錯誤碼對照
- **WHEN** 發生 `EMAIL_ALREADY_EXISTS` / `UNKNOWN_USER` / `EMAIL_OR_PASSWORD_NOTMATCH` / `UNKNOWN_SERVER_ERROR` 任一
- **THEN** 依序回傳 HTTP 400 / 400 / 400 / 500，body 為 `{ status:"error", message }`，訊息如 main spec 錯誤碼表所列

### Requirement: 跨來源（CORS）
系統 SHALL 僅允許來自 `http://localhost:8000`（api-gateway）的跨來源請求。

#### Scenario: 允許的來源
- **WHEN** 請求的 Origin 為 `http://localhost:8000`
- **THEN** CORS 放行（`app.js` 的 `cors({ origin: 'http://localhost:8000' })`）
