import { authService } from '../services/authService.js';

// 錯誤碼 → HTTP 回應對應表。新增錯誤碼只需在此加一筆，無需改動 controller 邏輯。
const ERROR_MAP = {
  EMAIL_ALREADY_EXISTS: { status: 400, message: '該電子郵件已被註冊，請更換帳號。' },
  UNKNOWN_USER: { status: 400, message: 'Email或密碼錯誤，請輸入正確的Email或密碼。' },
  EMAIL_OR_PASSWORD_NOTMATCH: { status: 400, message: 'Email或密碼錯誤，請輸入正確的Email或密碼。' }
};
const FALLBACK_ERROR = { status: 500, message: '伺服器內部發生錯誤，請稍後再試。' };

// 依語意錯誤碼查表回應；未命中一律回退為 500。
function respondError(res, error) {
  console.error('💥 [崩潰] 核心層拋出錯誤！錯誤訊息：', error.message);
  const mapped = ERROR_MAP[error.message] || FALLBACK_ERROR;
  return res.status(mapped.status).json({ status: 'error', message: mapped.message });
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

      return res.status(201).json({
        status: 'success',
        message: '註冊成功！',
        data: result
      });

    } catch (error) {
      return respondError(res, error);
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

      return res.status(200).json({
        status: 'success',
        message: '登入成功！',
        data: result
      });

    } catch (error) {
      return respondError(res, error);
    }
  }
};