import { userRepository } from '../repositories/userRepository.js';
import bcrypt from 'bcrypt';
import { generateToken } from '../utils/jwtHelper.js'

export const authService = {
  /**
   * 處理用戶註冊的核心業務邏輯
   * @param {string} email 
   * @param {string} password 
   */
  async register(email, password) {
    try {
      // 1. 重複性檢查：叫倉管（Repository）去查這個 Email 有沒有被註冊過
      const existingUser = await userRepository.findByEmail(email);

      if (existingUser) {
        // 找到了，代表 Email 被佔用了，大腦決定中止流程，並拋出一個錯誤
        throw new Error('EMAIL_ALREADY_EXISTS');
      }
      const saltRounds = 10;  // 成本因子，10 是業界常見的預設值
      const hashedPassword = await bcrypt.hash(password, saltRounds);
      // 2. 組裝新用戶：產生一個唯一的 ID（暫時用時間戳記簡化）與資料打包
      const userId = 'usr_' + Date.now();
      const newUser = {
        id: userId,
        email: email,
        password: hashedPassword // 密碼已改為加密後，不再儲存明文密碼
      };

      // 3. 下令存檔：叫倉管透過 user-service 儲存這個新用戶
      const savedUser = await userRepository.save(newUser);

      // 4. 回傳成果：把存好的用戶資料（不包含密碼）丟回給 Controller
      return {
        id: savedUser.id,
        email: savedUser.email
      };
    } catch (error) {
      // 核心邏輯：如果是我們自己主動丟出的「Email重複」，就放行，不攔截牠！
      if (error.message === 'EMAIL_ALREADY_EXISTS') {
        throw error;
      }
      console.error('真正的錯誤：', error);
      // 如果走到這，代表真的是倉庫存取失敗、硬碟爆掉等「真正的未知錯誤」
      // 在這裡我們可以先做點別的事，例如 console.error('倉庫爆了：', error);
      throw new Error('UNKNOWN_SERVER_ERROR');
    }
  },
  /**
  * 處理用戶登入的核心業務邏輯
  * @param {string} email 
  * @param {string} password 
  */
  async login(email, password) {
    try {
      // 1. 重複性檢查：叫倉管（Repository）去查這個 Email 有沒有被註冊過
      const existingUser = await userRepository.findByEmail(email);

      if (!existingUser) {
        throw new Error('UNKNOWN_USER');
      }
      const isMatch = await bcrypt.compare(password, existingUser.password);

      if (!isMatch) {
        throw new Error('EMAIL_OR_PASSWORD_NOTMATCH');
      }
      const token = generateToken(existingUser.id);
      return {
        id: existingUser.id,
        email: existingUser.email,
        token: token
      };
    } catch (error) {
      // 核心邏輯：如果是我們自己主動丟出的ERROR，就放行，不攔截牠！
      if (error.message === 'UNKNOWN_USER') {
        throw error;
      }
      else if (error.message === 'EMAIL_OR_PASSWORD_NOTMATCH') {
        throw error;
      }
      console.error('真正的錯誤：', error);
      // 如果走到這，代表真的是倉庫存取失敗、硬碟爆掉等「真正的未知錯誤」
      // 在這裡我們可以先做點別的事，例如 console.error('倉庫爆了：', error);
      throw new Error('UNKNOWN_SERVER_ERROR');
    }
  }
};