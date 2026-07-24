import { authController } from './authController.js';
import { authService } from '../services/authService.js';

// 1. 點名把大腦 Service 變成假演員
jest.mock('../services/authService.js', () => ({
  authService: {
    register: jest.fn(),
    login: jest.fn()
  }
}));

describe('AuthController (門神層) 單元測試', () => {
  let req, res;

  // 每次測試前，都初始化一組全新的假 req 和 res 機器人
  beforeEach(() => {
    req = { body: {} };
    res = {
      status: jest.fn().mockReturnThis(), // 模擬 res.status().json() 的連續呼叫動作
      json: jest.fn().mockReturnThis()
    };
  });

  // 【測試案例一：資料齊全，順利放行並帶回好消息】
  test('當資料齊全且註冊成功，應回傳 HTTP 201 與用戶資料', async () => {
    req.body = { email: 'good@test.com', password: 'password123' };

    // 設定大腦劇本：大腦等一下會成功，並回傳 id 和 email
    authService.register.mockResolvedValue({ id: 'usr_9527', email: 'good@test.com' });

    await authController.register(req, res);

    // 斷言：成功建立，應回傳 201 狀態碼
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({
      status: 'success',
      message: '註冊成功！',
      data: { id: 'usr_9527', email: 'good@test.com' }
    });
  });
  // 【測試案例二：email已經存在資料庫中】
  test('使用者輸入的 email 已經存在資料庫中，應直接回傳 HTTP 400', async () => {
    req.body = { email: 'good@test.com', password: 'password123' };

    // 設定大腦劇本：這次大腦（Service）要鬧脾氣，故意拋出一個錯誤訊息為 'EMAIL_ALREADY_EXISTS' 的 Error 物件
    authService.register.mockRejectedValue(new Error('EMAIL_ALREADY_EXISTS'));

    await authController.register(req, res);

    // 斷言：Controller 應該要擺臭臉給 400 狀態碼
    expect(res.status).toHaveBeenCalledWith(400);
    // 斷言：回應的錯誤訊息應該要符合預期
    expect(res.json).toHaveBeenCalledWith({
      status: 'error',
      message: '該電子郵件已被註冊，請更換帳號。'
    });
  });
  // 【測試案例三：意料外的未知錯誤】
  test('意料外的未知錯誤，應直接回傳 HTTP 500', async () => {
    req.body = { email: 'good@test.com', password: 'password123' };

    // 設定大腦劇本：這次大腦（Service）要鬧脾氣，故意拋出一個authService中沒有預設的錯誤訊息為 'DATABASE_CRASHED_SUDDENLY' 的 Error 物件
    authService.register.mockRejectedValue(new Error('DATABASE_CRASHED_SUDDENLY'));

    await authController.register(req, res);

    // 斷言：Controller 應該要擺臭臉給 500 狀態碼
    expect(res.status).toHaveBeenCalledWith(500);
    // 斷言：回應的錯誤訊息應該要符合預期
    expect(res.json).toHaveBeenCalledWith({
      status: 'error',
      message: '伺服器內部發生錯誤，請稍後再試。'
    });
  });
  // 【測試案例四：資料齊全，順利放行並帶回好消息】
  test('當資料齊全且登入成功，應回傳 HTTP 200 與用戶資料', async () => {
    req.body = { email: 'good@test.com', password: 'password123' };

    // 設定大腦劇本：大腦等一下會成功，並回傳 id 和 email
    authService.login.mockResolvedValue({
      id: 'usr_9527',
      email: 'good@test.com',
      token: 'generated_token'
    });

    await authController.login(req, res);

    // 斷言：成功登入，應回傳 200 狀態碼
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      status: 'success',
      message: '登入成功！',
      data: {
        id: 'usr_9527',
        email: 'good@test.com',
        token: 'generated_token'
      }
    });
  });
  // 【測試案例五：未知使用者】
  test('使用者輸入的 email 不存在資料庫中，應直接回傳 HTTP 400', async () => {
    req.body = { email: 'good@test.com', password: 'password123' };

    // 設定大腦劇本：這次大腦（Service）要鬧脾氣，故意拋出一個錯誤訊息為 'UNKNOWN_USER' 的 Error 物件
    authService.login.mockRejectedValue(new Error('UNKNOWN_USER'));

    await authController.login(req, res);

    // 斷言：Controller 應該要擺臭臉給 400 狀態碼
    expect(res.status).toHaveBeenCalledWith(400);
    // 斷言：回應的錯誤訊息應該要符合預期
    expect(res.json).toHaveBeenCalledWith({
      status: 'error',
      message: 'Email或密碼錯誤，請輸入正確的Email或密碼。'
    });
  });
  // 【測試案例六：密碼錯誤】
  test('使用者輸入的密碼錯誤，應直接回傳 HTTP 400', async () => {
    req.body = { email: 'good@test.com', password: 'password123' };

    // 設定大腦劇本：這次大腦（Service）要鬧脾氣，故意拋出一個錯誤訊息為 'EMAIL_OR_PASSWORD_NOTMATCH' 的 Error 物件
    authService.login.mockRejectedValue(new Error('EMAIL_OR_PASSWORD_NOTMATCH'));

    await authController.login(req, res);

    // 斷言：Controller 應該要擺臭臉給 400 狀態碼
    expect(res.status).toHaveBeenCalledWith(400);
    // 斷言：回應的錯誤訊息應該要符合預期
    expect(res.json).toHaveBeenCalledWith({
      status: 'error',
      message: 'Email或密碼錯誤，請輸入正確的Email或密碼。'
    });
  });
  // 【測試案例七：意料外的未知錯誤】
  test('意料外的未知錯誤，應直接回傳 HTTP 500', async () => {
    req.body = { email: 'good@test.com', password: 'password123' };

    // 設定大腦劇本：這次大腦（Service）要鬧脾氣，故意拋出一個authService中沒有預設的錯誤訊息為 'DATABASE_CRASHED_SUDDENLY' 的 Error 物件
    authService.login.mockRejectedValue(new Error('DATABASE_CRASHED_SUDDENLY'));

    await authController.login(req, res);

    // 斷言：Controller 應該要擺臭臉給 500 狀態碼
    expect(res.status).toHaveBeenCalledWith(500);
    // 斷言：回應的錯誤訊息應該要符合預期
    expect(res.json).toHaveBeenCalledWith({
      status: 'error',
      message: '伺服器內部發生錯誤，請稍後再試。'
    });
  });
});