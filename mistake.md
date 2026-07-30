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

---

# 【新增】程式碼層面違反項稽核（2026-07-30）

> **稽核基準**：《程式撰寫設計原則.md》（Phase 1 新建）  
> **稽核視角**：從「單檔案結構、函數粒度、重複代碼、可讀性」等代碼層級重新審視  
> **總體狀態**：✅ 程式碼品質良好，違反項輕微，多為「可讀性增強」級別

## 違反項統計

| 嚴重度 | 數量 | 類別 |
|--------|------|------|
| 🔴 高 | 0 | — |
| 🟡 中 | 2 | C1（副作用隔離）、C2（狀態流透明） |
| 🟢 低 | 5 | B3（函數簽名）、F2（註解品質） |
| 📋 建議 | 3 | 錯誤格式統一、變數命名、區段註解 |

---

## 詳細違反項

### 【中等嚴重度】

#### ⚠️ **C1-1：副作用混雜在業務邏輯** `authService.js:11-48（register 方法）`

**原則**：C1. 副作用隔離  
**問題**：
```javascript
async register(email, password) {
  try {
    // 混雜了驗證、轉換、副作用、回傳
    const existingUser = await userRepository.findByEmail(email)  // 副作用 1
    if (existingUser) throw new Error('EMAIL_ALREADY_EXISTS')    // 驗證
    const hashedPassword = await bcrypt.hash(password, 10)       // 轉換
    const userId = 'usr_' + Date.now()                           // 轉換
    const savedUser = await userRepository.save(newUser)         // 副作用 2
    return { id: savedUser.id, email: savedUser.email }         // 回傳
  } catch (error) { ... }
}
```

**為什麼違反**：純邏輯（密碼雜湊、ID 生成）與副作用（DB 寫入）沒有清晰邊界，難以測試和改進。

**嚴重度**：🟡 中（功能正常，但可測試性和改進空間有限）

**優先度**：中（可留著，改進時再處理）

---

#### ⚠️ **C2-1：全域狀態隱性依賴** `userRepository.js:5-7`

**原則**：C2. 狀態流透明  
**問題**：
```javascript
const GATEWAY_URL = process.env.GATEWAY_URL || 'http://localhost:8000'
const BACKEND_GET_USER_BY_EMAIL_URL = `${GATEWAY_URL}/internal/users?email=`
```

**為什麼違反**：檔案頂層初始化的常數在測試時無法動態覆寫，測試隔離困難。

**嚴重度**：🟡 中（在微服務常見但非最佳實踐）

**優先度**：低→中（現在可留著，測試時若遇隔離問題再改）

---

### 【低嚴重度】

#### 🟢 **B3-1/B3-2：JSDoc 不完整** `authService.js:11, 54`

**原則**：B3. 函數簽名清晰性  
**問題**：
```javascript
/**
 * 處理用戶註冊的核心業務邏輯
 * @param {string} email 
 * @param {string} password 
 */
async register(email, password) {
  // 缺少：@throws 說明、@returns 結構、參數範圍限制
}
```

**為什麼違反**：呼叫方需查代碼才知道會拋什麼錯、回傳什麼。

**嚴重度**：🟢 低（改進建議，不影響功能）

**優先度**：低

---

#### 🟢 **F2-1/F2-2：過度詳細的內部註解** `authService.js:38-47, 73-84`

**原則**：F2. 註解與文件  
**問題**：
```javascript
} catch (error) {
  // 核心邏輯：如果是我們自己主動丟出的「Email重複」，就放行，不攔截牠！
  if (error.message === 'EMAIL_ALREADY_EXISTS') { throw error }
  // 如果走到這，代表真的是倉庫存取失敗、硬碟爆掉等「真正的未知錯誤」
  throw new Error('UNKNOWN_SERVER_ERROR')
}
```

**為什麼違反**：註解過度解釋「做什麼」而不是「為什麼」，且比喻不適合生產代碼。

**嚴重度**：🟢 低（可讀性問題）

**優先度**：低

---

#### 🟢 **B3-3：userRepository 方法無 JSDoc** `userRepository.js:9, 26`

**原則**：B3. 函數簽名清晰性  
**問題**：
```javascript
async findByEmail(email) {
  // 無 JSDoc，回傳值類型不明確（物件或 null）
}
async save(newUser) {
  // 無 JSDoc
}
```

**嚴重度**：🟢 低

**優先度**：低

---

### 【建議項】

#### 📋 **validateMiddleware 錯誤格式不一致** `validateMiddleware.js:8-12`

**問題**：
```javascript
// validateMiddleware
return res.status(400).json({ status: 'error', message: '...' })

// authController
return res.status(400).json({ error: 'CODE', message: '...' })
```

**建議**：統一格式為 `{ error, message }`。

**優先度**：低→中（不影響當前，但統一會讓前端更好處理）

---

#### 📋 **變數命名不夠清楚** `userRepository.js:28`

**問題**：`const requestBody = { ... }` —— 過於泛稱。

**建議**：改為 `gatewayRequestPayload` 更清楚。

**優先度**：低

---

#### 📋 **缺少區段註解** `authService.js`

**問題**：檔案只有 2 個方法，但後續可能增長。

**建議**：加上 `// ========== 註冊 ==========` 區段分割。

**優先度**：低（可選）

---

## 建議優化順序

| 階段 | 工作 | 時間 | 優先度 |
|------|------|------|--------|
| 1 | 補完 JSDoc（register, login, userRepository） | 15 分鐘 | 低 |
| 1 | 簡化 catch 區塊註解 | 5 分鐘 | 低 |
| 1 | 統一 validateMiddleware 錯誤格式 | 5 分鐘 | 低→中 |
| 2 | 改進 userRepository 環境變數處理（若增加測試） | 30 分鐘 | 低→中 |
| 3 | 拆分 register/login 副作用邏輯（若改維護策略） | 40 分鐘 | 中 |

---

## 總體評估

### ✅ 做得好的地方

- 三層架構清晰，職責分離明確
- 錯誤碼集中（ERROR_MAP），不用 if/else
- 密碼安全（bcrypt），明文不落地
- 無死代碼，無過度設計
- **所有單元測試通過（14/14）**

### ⚠️ 可改進的地方（優先級排序）

1. **快速收益（10-15 分鐘）**：補完 JSDoc、簡化註解、統一錯誤格式
2. **中期維護（30 分鐘）**：改進環境變數隔離（若要增加測試）
3. **長期優化（40 分鐘）**：拆分副作用邏輯（視日後維護頻率）

**結論**：現有代碼質量良好，所有違反項均為「增強級別」，無功能性或安全缺陷。
