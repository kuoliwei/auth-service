import { authService } from '../services/authService.js';

// 錯誤碼 → HTTP 回應對應表。新增錯誤碼只需在此加一筆，無需改動 controller 邏輯。
const ERROR_MAP = {
  EMAIL_ALREADY_EXISTS: { status: 409, message: '該電子郵件已被註冊，請更換帳號。' },
  UNKNOWN_USER: { status: 400, message: 'Email或密碼錯誤，請輸入正確的Email或密碼。' },
  EMAIL_OR_PASSWORD_NOTMATCH: { status: 400, message: 'Email或密碼錯誤，請輸入正確的Email或密碼。' }
};
const FALLBACK_ERROR = { status: 500, message: '伺服器內部發生錯誤，請稍後再試。' };

/**
 * 統一的錯誤回應（與 user / character / chat 三服務的 respondWithError 簽名一致）
 *
 * 判斷順序：端點特有的覆寫 → 共用 ERROR_MAP → 500。
 * 目前本服務尚無同碼異義或動態內容的錯誤碼，`overrides`/`serviceErrorPrefix`
 * 暫未使用，僅為與其他服務簽名一致、未來如有需求可直接沿用。
 *
 * @param {Object} res - Express response
 * @param {Error} error - service 層拋出的語意錯誤
 * @param {Object} [options]
 * @param {Object} [options.overrides] - 端點特有的錯誤碼覆寫 `{ CODE: { status, message } }`
 * @param {string} [options.serviceErrorPrefix] - 保留參數，本服務目前未使用
 * @returns {Object} Express response
 */
function respondWithError(res, error, { overrides, serviceErrorPrefix } = {}) {
  const override = overrides?.[error.message];
  if (override) {
    return res.status(override.status).json({ error: error.message, message: override.message });
  }

  const mapped = ERROR_MAP[error.message];
  if (mapped) {
    return res.status(mapped.status).json({ error: error.message, message: mapped.message });
  }

  console.error('💥 [崩潰] 核心層拋出錯誤！錯誤訊息：', error.message);
  return res.status(FALLBACK_ERROR.status).json({ error: 'INTERNAL_SERVER_ERROR', message: FALLBACK_ERROR.message });
}

export const authController = {
  /**
   * 處理註冊請求的門神函式
   */
  async register(req, res) {
    // 📡 探照燈 1：只要前端一發出請求，終端機立刻警報
    console.log('\n==================================================');
    console.log('📥 [後台 Controller] 偵測到一筆新的註冊請求！');
    console.log('📦 [收到 Request Body]:', {
      email: req.body?.email || '空值',
      password: req.body?.password ? '****** (安全遮蔽)' : '空值'
    });

    try {
      const { email, password } = req.body;

      // 3. 轉交大腦
      const result = await authService.register(email, password);

      // 4. 端出成果
      console.log('🎉 [成功] Service 處理完畢，新用戶已成功初始化！');
      console.log(`🆔 [產出 ID]: ${result.id}`);
      console.log('==================================================');

      return res.status(201).json(result);

    } catch (error) {
      return respondWithError(res, error);
    }
  },
  /**
 * 處理登入請求的門神函式
 */
  async login(req, res) {
    // 📡 探照燈 1：只要前端一發出請求，終端機立刻警報
    console.log('\n==================================================');
    console.log('📥 [後台 Controller] 偵測到一筆新的登入請求！');
    console.log('📦 [收到 Request Body]:', {
      email: req.body?.email || '空值',
      password: req.body?.password ? '****** (安全遮蔽)' : '空值'
    });

    try {
      const { email, password } = req.body;

      // 3. 轉交大腦
      const result = await authService.login(email, password);

      // 4. 端出成果
      console.log('🎉 [成功] Service 處理完畢，新用戶已成功登入！');
      console.log('==================================================');

      return res.status(200).json(result);

    } catch (error) {
      return respondWithError(res, error);
    }
  }
};