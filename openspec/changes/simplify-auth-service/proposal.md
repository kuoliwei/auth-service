## Why

稽核（見 `auth-service/mistake.md`）對照《後端系統設計原則》後，確認 auth-service 的 middleware 層有兩處不符：

1. **YAGNI（死代碼）**：`authMiddleware.js`、`jwtHelper.verifyToken()`、`authController.me()`、`users.json` 皆現存但無用。
   authMiddleware 的 JWT 驗證職責已由 api-gateway 完整接手（已驗證），這一串失去存在理由。
2. **SRP／低耦合／契約明確**：`validateMiddleware` 用 `registerSchema` 同時掛在 register 與 login，
   使 login 意外要求「密碼 ≥ 6」。login 本不需要格式驗證——輸入正確與否會在認證流程自然反映。

## What Changes

- **移除死代碼**：刪除 `authMiddleware.js`、`jwtHelper.verifyToken()`、`authController.me()`（及其測試）、`users.json`。
- **移除 login 的格式驗證**：`validateMiddleware` 只保留在 register 路由；login 不再做格式驗證。
- **Repository 依角色命名（DIP）**：`userApiClient.js` 改名為 `userRepository.js`（依角色而非實作機制命名）。
- **錯誤碼映射改用對應表（OCP）**：controller 的 `if/else` 錯誤碼→HTTP 邏輯改為 `ERROR_MAP` 查表，新增錯誤碼只需加一筆、不動邏輯（順帶解 register/login 重複的 DRY）。
- **設定外部化（12-Factor III）**：`app.js` 的 `PORT` 與 CORS `origin` 改讀環境變數，預設值同現況硬編碼值。
- **順手修正**：`authService.js` 中提到 `users.json` 的過時註解。

## Impact

**行為契約變更（唯一可觀察的變更）：**
- **register**：不變。格式不合法仍回 400「EMAIL或密碼格式不正確」。
- **login**：格式不合法的輸入不再於 middleware 被擋。改為進入 service，依實際情況回
  `UNKNOWN_USER` 或 `EMAIL_OR_PASSWORD_NOTMATCH`（皆 400「Email或密碼錯誤」）。
  副作用：login 對格式不合法的輸入會多一次 user-service 查詢。

**死代碼移除：無行為變更**（這些代碼不在任何有效路徑上）。

**受影響檔案：**
- `src/app.js`（移除 login 的 validateMiddleware；PORT/CORS 改讀 env）
- `.env`（新增 PORT、CORS_ORIGIN）
- `src/middlewares/authMiddleware.js`（刪除）
- `src/utils/jwtHelper.js`（刪除 verifyToken）
- `src/controllers/authController.js`（刪除 me；錯誤映射改 ERROR_MAP）
- `src/controllers/authController.test.js`（刪除 me 測試）
- `src/services/authService.js`（修過時註解 + import 路徑）
- `src/repositories/userApiClient.js` → `userRepository.js`（改名）
- `users.json`（刪除）

**規格影響：** MODIFIED「輸入驗證」需求（縮小到只管 register）；main spec 的「遺留物」段落於歸檔時清除。

**連帶修好：** `authService.test.js` 原本因 mock 路徑指向不存在的 `userRepository.js` 而無法執行；本次改名後路徑自動對上，該測試恢復可執行（task 3.1 的驗證範圍隨之擴大）。
