## Why

> 這是一份**回溯性提案（retrospective proposal）**：auth-service 已經實作完成並運作，
> 本文反推「當初若有正式提案，會怎麼寫」，補上行為規格（main spec）沒有記錄的**動機與範圍**。

Persona Nexus 平台需要一個入口讓使用者能「證明自己是誰」——沒有身分，就無法擁有角色、無法保存專屬對話。
因此需要一個**專責認證**的服務：處理註冊與登入，並在登入成功後簽發一張可被平台其他部分信任的身分憑證（JWT）。

為什麼要獨立成一個服務，而不是塞進某個既有服務？

- **單一職責**：認證是一個邊界清楚、與其他業務（角色、對話）無關的關注點，獨立出來讓它可以單獨演進、單獨測試。
- **信任的單一源頭**：整個平台的「登入」只此一家，JWT 的簽發集中在這裡，避免多處各簽各的、金鑰四散。

## What Changes

建立 auth-service，提供並僅提供以下能力：

- **使用者註冊** `POST /api/v1/auth/register` — 驗證輸入、雜湊密碼、建立帳號、回傳 `{ id, email }`。
- **使用者登入** `POST /api/v1/auth/login` — 驗證密碼、簽發 JWT、回傳 `{ id, email, token }`。
- **JWT 簽發** — 登入成功時以共享密鑰簽發效期 7 天的 token（payload 僅 `{ id }`）。

**刻意不做（非本服務範圍）：**

- **不驗證 JWT**：token 的驗證交給 api-gateway 集中處理，本服務只「簽」不「驗」。
- **不自帶資料庫**：使用者資料的持久化委派給 user-service（透過 HTTP），本服務不直接碰 DB。
- **不做授權（authorization）**：只回答「你是誰」，不回答「你能做什麼」。

## Impact

**新增對外 API 契約：**
- `POST /api/v1/auth/register` → 201 `{ status, message, data:{ id, email } }`
- `POST /api/v1/auth/login` → 200 `{ status, message, data:{ id, email, token } }`
- 錯誤碼：`EMAIL_ALREADY_EXISTS`、`UNKNOWN_USER`、`EMAIL_OR_PASSWORD_NOTMATCH`、`UNKNOWN_SERVER_ERROR`

**新增外部依賴：**
- **user-service**（`USER_SERVICE_URL`，預設 `http://localhost:4000`）— 使用者資料的儲存與查詢。
- **api-gateway** — 下游的 JWT 驗證方；本服務與其**共享 `JWT_SECRET`**。

**新增環境變數：**
- `JWT_SECRET` — 簽發 JWT 用，必須與 api-gateway 一致。
- `USER_SERVICE_URL` — user-service 位址。

**技術棧：**
- Node.js 20+ / Express 5 / ESM；bcrypt（密碼雜湊）；jsonwebtoken（JWT）；zod（輸入驗證）；Jest（測試）。

**行為契約詳見** `openspec/specs/authentication/spec.md`（現況基準線規格）。
**架構決策與取捨詳見** 同目錄 `design.md`。
