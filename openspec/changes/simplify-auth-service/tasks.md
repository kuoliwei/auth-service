# Tasks — simplify-auth-service

> 依賴順序：先移除 login 驗證（行為變更）→ 再清死代碼（無行為變更）→ 最後跑測試 + 更新 main spec。
> 每項完成後打勾。

## 1. 移除 login 的格式驗證（行為變更）

- [x] 1.1 `src/app.js`：`POST /api/v1/auth/login` 路由移除 `validateMiddleware`，保留 register 的
- [x] 1.2 確認 `validateMiddleware.js` 與 `schemas/authSchema.js` **不動**（只改掛載範圍）

## 2. 清除死代碼（無行為變更）

- [x] 2.1 刪除 `src/middlewares/authMiddleware.js`
- [x] 2.2 `src/utils/jwtHelper.js`：刪除 `verifyToken()`，保留 `generateToken()`
- [x] 2.3 `src/controllers/authController.js`：刪除 `me()` 方法
- [x] 2.4 `src/controllers/authController.test.js`：刪除測試 me() 的案例（案例十）
- [x] 2.5 刪除專案根目錄的 `users.json`
- [x] 2.6 `src/services/authService.js`：修正提到 `users.json` 的過時註解

## 2b. Repository 依角色命名（DIP，零行為變更）

- [x] 2b.1 `src/repositories/userApiClient.js` 改名為 `userRepository.js`（匯出的 `userRepository` 常數不變）
- [x] 2b.2 `src/services/authService.js:1`：import 路徑改為 `../repositories/userRepository.js`
- [x] 2b.3 確認 `authService.test.js` 因此自動對上（它本來就 mock `userRepository.js`）

## 2c. 錯誤碼→HTTP 改用對應表（OCP，零行為變更）

- [x] 2c.1 `src/controllers/authController.js`：定義 `ERROR_MAP`（錯誤碼 → `{ status, message }`），涵蓋現有 `EMAIL_ALREADY_EXISTS` / `UNKNOWN_USER` / `EMAIL_OR_PASSWORD_NOTMATCH`，未命中者一律 500
- [x] 2c.2 register 與 login 的 catch 改用查表回應，移除重複的 if/else（順帶解 DRY）
- [x] 2c.3 確認回傳的 status 與 message 與原本**完全一致**（純結構重構，不改行為）— 以程式碼檢視確認，最終以 3.1 測試為準

## 2d. 設定外部化（12-Factor III，零行為變更）

- [x] 2d.1 `src/app.js`：`PORT` 改讀 `process.env.PORT || 3000`
- [x] 2d.2 `src/app.js`：CORS origin 改讀 `process.env.CORS_ORIGIN || 'http://localhost:8000'`
- [x] 2d.3 `.env` 補上 `PORT=3000` 與 `CORS_ORIGIN=http://localhost:8000`（值同現況預設，確保零行為變更）
- [x] 2d.4 確認未設 env 時，port 與 CORS 行為與原本完全一致（預設值即原硬編碼值）

## 2e. 測試腳本更新（依現況，過程中補做）

- [x] 2e.1 `authController.test.js`：刪除兩段註解掉的舊案例（引用已不存在的訊息「請輸入完整的帳號與密碼。」），案例編號整理為連續（一~七）
- [x] 2e.2 `authController.test.js`：修正原案例八的標籤筆誤（「未知使用者」→「密碼錯誤」）
- [x] 2e.3 `test.http`：刪除已不存在的 `GET /me` 請求；將「錯誤格式登入」改寫為「短密碼登入」以驗證 login 不再驗格式

## 3. 驗證

- [x] 3.1 `npx jest`：確認 `authController.test.js` 仍通過（刪 me 測試後），且 `authService.test.js` 因改名恢復可執行並通過 — 2 suites / 14 tests 全通過
- [x] 3.2 手動或以 test.http 驗證：register 格式錯誤仍回 400「EMAIL或密碼格式不正確」 — curl 實測通過
- [x] 3.3 手動驗證：login 送短密碼 → 不再回「格式不正確」，改回「Email或密碼錯誤」 — curl 實測通過（短密碼未被格式擋，進認證流程回 UNKNOWN_USER）
- [x] 3.4 grep 全 `src/` 確認無殘留對已刪符號（authMiddleware / verifyToken / me）的引用

## 4. 更新規格

- [x] 4.1 將本 change 的 delta（MODIFIED「輸入驗證」）同步進 main spec `specs/authentication/spec.md`
- [x] 4.2 更新 main spec 的架構圖與「遺留物」段落：移除 authMiddleware / verifyToken / me() / users.json 的記載
- [x] 4.3 更新 `CLAUDE.md` 對應描述（遺留代碼段落、validateMiddleware 耦合段落、PORT/CORS 現況）
- [x] 4.4 更新 main spec 的 CORS 需求：標明 origin 現由 `CORS_ORIGIN` 環境變數設定（預設不變）
- [x] 4.5 於 `mistake.md` 標記第 1、2、3、4 點已處理

## 備註

- `authService.test.js` 原本因 mock 路徑錯誤無法執行，經 2b 改名後自動修復，故納入 3.1 驗證。
