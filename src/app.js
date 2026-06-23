// 使用方式：node src/app.js
import 'dotenv/config';
import express from 'express';
import cors from 'cors'; // 引入解鎖工具
import { authController } from './controllers/authController.js';
import { validateMiddleware } from './middlewares/validateMiddleware.js';

const app = express();
const PORT = 3000;

// 核心解鎖】告訴 Express：允許來自前端 http://localhost:5173 的跨網域連線請求！
app.use(cors({
  origin: 'http://localhost:8000'
}));

app.use(express.json());

// 【註冊路由分發】將網址路徑、HTTP 方法與 Controller 綁定
app.post('/api/v1/auth/register', validateMiddleware, authController.register);

// 【登入路由分發】將網址路徑、HTTP 方法與 Controller 綁定
app.post('/api/v1/auth/login', validateMiddleware, authController.login);

// 啟動伺服器並監聽 3000 連接埠
app.listen(PORT, () => {
  console.log(`===============================================`);
  console.log(`  Auth-Service 伺服器已成功啟動！`);
  console.log(`  正在監聽連接埠：http://localhost:${PORT}`);
  console.log(`===============================================`);
});