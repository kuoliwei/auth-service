# auth-service 設計稽核記錄（mistake.md）

> **這是什麼**：拿平台的《後端系統設計原則》逐條對照 auth-service 的現況（依據 openspec 的
> `changes/authentication-foundation/proposal.md`、`design.md` 與 `specs/authentication/spec.md`），
> 找出不符原則之處。
>
> **原則**：符合的也如實標出，不硬湊違反；每項標示把握程度（高/中/低）。
> **用途**：作為後續「優化 change」的依據——每個確認的違反點，會轉成一筆規格變更來驅動修正。
> **稽核時間**：2026-07-24。

---

## A. 通用軟體設計原則

| 原則 | 判定 | 依據 |
|------|------|------|
| KISS | 大致符合 | 兩條路由的三層架構稍重但一致；主要認知負擔來自死代碼（見 YAGNI） |
| DRY | 大致符合 | 使用者資料不重複存（委派 user-service）。`JWT_SECRET` 兩份 .env 需手動同步，屬輕微張力 |
| YAGNI | ❌ **違反（高把握）** | `authMiddleware.js` 未掛載、`verifyToken()` 無呼叫、`me()` 未掛路由、`users.json` 死檔——現存但無用 |
| SSOT | ✅ 符合（值得肯定） | 使用者資料的唯一真相在 user-service，auth 不留副本 |

## B. 模組與物件設計

| 原則 | 判定 | 依據 |
|------|------|------|
| 關注點分離 SoC | ✅ 符合 | 三層清楚分離 HTTP／業務／存取 |
| 資訊隱藏 | ✅ 符合 | `userApiClient` 把遠端呼叫藏在 repository 介面後 |
| 高內聚 / 低耦合 | ⚠️ **部分違反（中把握）** | `validateMiddleware` 同時服務 register 與 login，兩者透過同一個 `registerSchema` 被耦合 |
| SOLID-SRP | ⚠️ **部分違反（中把握）** | 同上：`validateMiddleware` 有「兩個改變的理由」——register 規則變、login 需求變，都會動到它 |
| SOLID-DIP | ⚠️ 輕微（低把握） | `authService` 直接 import 具體的 `userApiClient`，非抽象介面（測試 mock 路徑對不上正暴露此模糊邊界） |
| SOLID-OCP | ⚠️ 輕微（低把握） | controller 用 `if/else` 比對 `error.message` 映射 HTTP；新增錯誤碼要改既有 controller |
| LSP / ISP | 不適用 | 無繼承、無正式介面 |

## C. The Twelve-Factor App

| Factor | 判定 | 依據 |
|--------|------|------|
| III. Config | ❌ **違反（高把握）** | `PORT=3000` 寫死、CORS `origin:'http://localhost:8000'` 寫死。（`JWT_SECRET`、`USER_SERVICE_URL` 有走 env，正確） |
| IV. Backing Services | ✅ 符合（值得肯定） | user-service 透過 `USER_SERVICE_URL` 當可抽換的附加資源 |
| VI. Processes（無狀態） | ✅ 符合 | 服務無本地狀態；`users.json` 雖存在但未使用（若啟用才會違反） |
| II. Dependencies | ✅ 符合 | package.json 明確宣告 |

## D. 契約設計（Design by Contract）

| 判定 | 依據 |
|------|------|
| ⚠️ 部分違反（中把握） | **login 的輸入契約模糊**：因共用 `registerSchema`，login 意外要求「密碼 ≥ 6」，但這不是 login 該有的契約，也未明文約定。呼叫方無法從契約得知 login 對輸入的真正要求 |

---

## 稽核結論：確認的違反點（按把握度排序）

> **處理狀態**：以下全部已由 change `simplify-auth-service` 處理完成（2026-07-24），並通過單元測試與手動驗證。

| # | 違反的原則 | 事實 | 把握 | 狀態 |
|---|-----------|------|------|------|
| 1 | **YAGNI** | 4 處死代碼（authMiddleware / verifyToken / me() / users.json） | 高 | ✅ 已清除 |
| 2 | **12-Factor III (Config)** | PORT、CORS origin 寫死於 app.js | 高 | ✅ 已外部化到 env |
| 3 | **SRP + 低耦合 + 契約明確** | validateMiddleware 用 registerSchema 同時服務兩路由，並污染 login 的輸入契約 | 中 | ✅ login 已移除格式驗證 |
| 4 | **DIP** | service 依賴具體 repository（命名未反映角色） | 低 | ✅ 改名 userRepository.js |
| 4 | **OCP** | controller if/else 映射錯誤碼 | 低 | ✅ 改用 ERROR_MAP 查表 |

## 做得好、不該動的部分

- 使用者資料的 SSOT（委派 user-service）
- 三層架構的關注點分離
- 資訊隱藏（userApiClient）
- Backing Services 可抽換（USER_SERVICE_URL）
- 服務無狀態

---

## 誠實提醒

- **第 3 點**（validateMiddleware）是最「一石多鳥」的優化點——同時觸及 SRP、低耦合、契約明確三條原則。這也是討論之初就被指出的問題。
- **第 4 點把握低**：JS 動態語言下 DIP/OCP 的違反不如靜態語言明確，如實標低，不灌水。是否處理由後續決定。
