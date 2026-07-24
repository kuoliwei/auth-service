// 使用方式：node src/app.js
import 'dotenv/config';
import express from 'express';
import cors from 'cors'; // 引入解鎖工具
import { authController } from './controllers/authController.js';
import { validateMiddleware } from './middlewares/validateMiddleware.js';

const app = express();
const PORT = process.env.PORT || 3000;

// 【CORS】允許來自 api-gateway 的跨網域請求；來源可由 CORS_ORIGIN 環境變數覆寫
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:8000'
}));

app.use(express.json());

// 【註冊路由分發】將網址路徑、HTTP 方法與 Controller 綁定
app.post('/api/v1/auth/register', validateMiddleware, authController.register);

// 【登入路由分發】將網址路徑、HTTP 方法與 Controller 綁定
// 登入不做格式驗證：輸入是否正確由後續認證流程（查詢與密碼比對）自然反映
app.post('/api/v1/auth/login', authController.login);

// 啟動伺服器並監聽 3000 連接埠
app.listen(PORT, () => {
  console.log(`===============================================`);
  console.log(`  Auth-Service 伺服器已成功啟動！`);
  console.log(`  正在監聽連接埠：http://localhost:${PORT}`);
  console.log(`===============================================`);
});