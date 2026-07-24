# Design — simplify-auth-service

> 記錄本次優化**改動後**的結構。只描述變更點，不重述未動的部分。

## middleware 層改動後的樣貌

```
變更前                                      變更後
─────────                                   ─────────
app.js                                      app.js
  register → validateMiddleware → ctrl        register → validateMiddleware → ctrl
  login    → validateMiddleware → ctrl        login    → ctrl（不再經 validateMiddleware）

middlewares/                                middlewares/
  validateMiddleware.js  （保留）             validateMiddleware.js  （保留，只服務 register）
  authMiddleware.js      （死代碼）      →    （刪除）

utils/jwtHelper.js                          utils/jwtHelper.js
  generateToken()        （保留）             generateToken()  （保留）
  verifyToken()          （死代碼）      →    （刪除）

controllers/authController.js               controllers/authController.js
  register / login / me()（me 未掛路由） →    register / login（me 刪除）

users.json （死檔）                     →    （刪除）
```

## 變更後的驗證行為

- **register**：維持經 `validateMiddleware`（`registerSchema`：email 格式 + password ≥ 6），格式不合法回 400「EMAIL或密碼格式不正確」。
- **login**：不再有格式驗證關卡。請求直接進 controller → service；email 查無或 bcrypt 比對失敗時回 400「Email或密碼錯誤」。

## `validateMiddleware` 本身

不改動其實作（仍用 `registerSchema`）。本次僅改變它的**掛載範圍**（從兩條路由縮為一條）。
`registerSchema` 與 `schemas/authSchema.js` 維持原樣。

## JWT 相關

`jwtHelper.js` 僅保留 `generateToken()`（簽發）。驗證職責在 api-gateway，本服務不再持有任何 JWT 驗證代碼。

## 錯誤碼映射（controller）

原本 register 與 login 各自用一串 `if/else` 比對 `error.message` 決定 HTTP status 與訊息。
改為單一 `ERROR_MAP`（錯誤碼 → `{ status, message }`），catch 區塊查表回應，未命中者一律 500。
status 與 message 與原本完全一致，屬純結構重構（零行為變更）。

## 設定外部化（app.js）

`PORT` 與 CORS `origin` 由硬編碼改讀環境變數：`process.env.PORT || 3000`、`process.env.CORS_ORIGIN || 'http://localhost:8000'`。
預設值即原硬編碼值，未設 env 時行為與原本完全一致。`.env` 補上這兩個變數。


