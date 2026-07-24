# authentication (delta) — simplify-auth-service

## MODIFIED Requirements

### Requirement: 輸入驗證
系統 SHALL 僅在**註冊**路由，於進入 controller 前以 `validateMiddleware`（`registerSchema`：email 格式 + password ≥ 6）驗證請求 body。
**登入路由 SHALL NOT 做格式驗證**——輸入是否正確由後續認證流程（查詢與密碼比對）自然反映。
註冊驗證失敗時系統 SHALL 直接回傳 HTTP 400，訊息為籠統字串，不提供結構化錯誤碼。

#### Scenario: 註冊格式不合法
- **WHEN** `POST /api/v1/auth/register` 的 body 中 email 格式不合法，或 password 長度 < 6
- **THEN** `validateMiddleware` 直接回傳 HTTP 400 與 `{ status:"error", message:"EMAIL或密碼格式不正確" }`，不進入 controller

#### Scenario: 登入不做格式驗證
- **WHEN** `POST /api/v1/auth/login` 的 body 中 email 格式不合法或 password 長度 < 6
- **THEN** 請求**不被格式關卡攔截**，直接進入 controller 與 service；依實際情況回傳 `UNKNOWN_USER` 或 `EMAIL_OR_PASSWORD_NOTMATCH`（皆 HTTP 400，訊息「Email或密碼錯誤，請輸入正確的Email或密碼。」）

#### Scenario: 登入輸入格式合法但認證失敗
- **WHEN** `POST /api/v1/auth/login` 的 body 格式合法，但 email 不存在或密碼錯誤
- **THEN** 行為不變，依實際情況回傳 `UNKNOWN_USER` 或 `EMAIL_OR_PASSWORD_NOTMATCH`（HTTP 400）
