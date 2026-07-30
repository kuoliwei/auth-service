import { userRepository } from '../repositories/userRepository.js';
import bcrypt from 'bcrypt';
import { generateToken } from '../utils/jwtHelper.js'

export const authService = {
  /**
   * 註冊新用戶
   * @param {string} email - 使用者信箱（格式由 validateMiddleware 檢查）
   * @param {string} password - 密碼（雜湊後由 userRepository 存檔）
   * @returns {Promise<{id: string, email: string}>} 已存檔的用戶物件（不含密碼）
   * @throws {Error} 'EMAIL_ALREADY_EXISTS' 若信箱已被註冊
   * @throws {Error} 'UNKNOWN_SERVER_ERROR' 若 userRepository 發生非預期錯誤
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
      // 業務錯誤（已預期的）直接拋給 controller
      if (error.message === 'EMAIL_ALREADY_EXISTS') {
        throw error;
      }
      console.error('userRepository 發生非預期錯誤：', error);
      throw new Error('UNKNOWN_SERVER_ERROR');
    }
  },
  /**
   * 驗證用戶登入
   * @param {string} email - 使用者信箱
   * @param {string} password - 明文密碼
   * @returns {Promise<{id: string, email: string, token: string}>} 登入成功的使用者與 JWT token
   * @throws {Error} 'UNKNOWN_USER' 若信箱未被註冊
   * @throws {Error} 'EMAIL_OR_PASSWORD_NOTMATCH' 若密碼錯誤
   * @throws {Error} 'UNKNOWN_SERVER_ERROR' 若 userRepository 發生非預期錯誤
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
      // 業務錯誤（已預期的）直接拋給 controller
      if (error.message === 'UNKNOWN_USER') {
        throw error;
      }
      else if (error.message === 'EMAIL_OR_PASSWORD_NOTMATCH') {
        throw error;
      }
      console.error('userRepository 發生非預期錯誤：', error);
      throw new Error('UNKNOWN_SERVER_ERROR');
    }
  }
};