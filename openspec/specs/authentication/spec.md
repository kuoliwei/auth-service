# authentication Specification

> 本檔是 auth-service **當前實際行為**的規格（as-is），逐條對照原始碼撰寫，不做美化、不寫理想版。
> 已納入 change `simplify-auth-service` 的優化結果（清死代碼、login 不再驗格式、Repository 依角色命名、
> 錯誤碼查表、Config 外部化）。最後對照時間：與 `src/` 現況一致。

## Purpose

auth-service 是 Persona Nexus 平台唯一的**認證服務**，只做兩件事：**使用者註冊**與**登入**，
並在登入成功時**簽發 JWT**。本服務**沒有自己的資料庫**，使用者資料的存取一律透過 HTTP 委派給 user-service。
JWT 的**驗證**不在此服務（由 api-gateway 集中處理），本服務只負責**簽發**。

### 當前架構圖（as-is）

```
瀏覽器
  │  （CORS 允許 origin = CORS_ORIGIN，預設 http://localhost:8000）
  ▼
api-gateway :8000  ── proxy ──▶  auth-service :3000
                                      │
   ┌──────────────────────────────────┴───────────────────────────────┐
   │  src/app.js                                                        │
   │   • express.json() 解析 body                                       │
   │   • cors({ origin: process.env.CORS_ORIGIN || 'http://localhost:8000' }) │
   │   • POST /api/v1/auth/register → validateMiddleware → controller   │
   │   • POST /api/v1/auth/login    → controller（不驗格式）            │
   │   • PORT = process.env.PORT || 3000                                │
   └──────────────────────────────────┬───────────────────────────────┘
                                       ▼
   controllers/authController.js  … HTTP 進出；以 ERROR_MAP 把語意錯誤碼轉成 HTTP status
                                       ▼
   services/authService.js        … 業務邏輯：查重、bcrypt、呼叫 jwtHelper 簽 JWT
                                       ▼
   repositories/userRepository.js … fetch → user-service :4000（GET /users?email= / POST /users）
                                       ▼
                                 user-service :4000  ← 真正存使用者的地方

   輔助模組：
     middlewares/validateMiddleware.js … 用 schemas/authSchema.js 的 registerSchema 驗 body（僅掛 register）
     utils/jwtHelper.js                … generateToken()（簽發）
```

## Requirements

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
系統 SHALL 僅在**註冊**路由，於進入 controller 前以 `validateMiddleware`（`registerSchema`：email 格式 + password ≥ 6）驗證請求 body。
**登入路由 SHALL NOT 做格式驗證**——輸入是否正確由後續認證流程（查詢與密碼比對）自然反映。
註冊驗證失敗時系統 SHALL 直接回傳 HTTP 400，訊息為籠統字串，**不提供結構化錯誤碼**。

#### Scenario: 註冊格式不合法
- **WHEN** `POST /api/v1/auth/register` 的 body 中 email 格式不合法，或 password 長度 < 6
- **THEN** validateMiddleware 直接回傳 HTTP 400 與 `{ status:"error", message:"EMAIL或密碼格式不正確" }`，不進入 controller

#### Scenario: 登入不做格式驗證
- **WHEN** `POST /api/v1/auth/login` 的 body 中 email 格式不合法或 password 長度 < 6
- **THEN** 請求不被格式關卡攔截，直接進入 controller 與 service；依實際情況回傳 `UNKNOWN_USER` 或 `EMAIL_OR_PASSWORD_NOTMATCH`（皆 HTTP 400，訊息「Email或密碼錯誤，請輸入正確的Email或密碼。」）

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
auth-service SHALL NOT 擁有自己的資料庫。所有使用者查詢與儲存 MUST 透過 `userRepository.js` 以 HTTP 呼叫
user-service（`USER_SERVICE_URL`，預設 `http://localhost:4000`）。

#### Scenario: 查詢 email
- **WHEN** service 需確認 email 是否存在
- **THEN** `userRepository.findByEmail(email)` 發 `GET {USER_SERVICE_URL}/users?email=<email>`；200 回傳使用者、404 回傳 null、其他狀態拋錯

#### Scenario: 儲存新使用者
- **WHEN** service 完成雜湊與組裝後需存檔
- **THEN** `userRepository.save(user)` 發 `POST {USER_SERVICE_URL}/users`，body 為 `{ id, email, password(已雜湊) }`

### Requirement: 錯誤碼與 HTTP 對應
系統 SHALL 於 service 層拋出語意化錯誤碼，由 controller 以 `ERROR_MAP`（錯誤碼 → `{ status, message }`）查表映射為 HTTP 狀態碼與使用者訊息，未命中者一律回退為 500。
回應 body MUST 為 `{ status, message }` 結構。

#### Scenario: 錯誤碼對照
- **WHEN** 發生下列任一錯誤
- **THEN** 依此表回應：

| 錯誤碼 | HTTP | 使用者訊息 |
|---|---|---|
| EMAIL_ALREADY_EXISTS | 400 | 該電子郵件已被註冊，請更換帳號。 |
| UNKNOWN_USER | 400 | Email或密碼錯誤，請輸入正確的Email或密碼。 |
| EMAIL_OR_PASSWORD_NOTMATCH | 400 | Email或密碼錯誤，請輸入正確的Email或密碼。 |
| UNKNOWN_SERVER_ERROR | 500 | 伺服器內部發生錯誤，請稍後再試。 |
| （register 的 validateMiddleware 驗證失敗，無錯誤碼） | 400 | EMAIL或密碼格式不正確 |

### Requirement: 跨來源（CORS）
系統 SHALL 僅允許來自 `CORS_ORIGIN` 環境變數所設來源（預設 `http://localhost:8000`，即 api-gateway）的跨來源請求。

#### Scenario: 允許的來源
- **WHEN** 請求的 Origin 為 `CORS_ORIGIN` 所設值（預設 `http://localhost:8000`）
- **THEN** CORS 放行（`app.js` 的 `cors({ origin: process.env.CORS_ORIGIN || 'http://localhost:8000' })`）
