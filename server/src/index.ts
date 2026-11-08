import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import cors from 'cors';
import express from 'express';
import { apiRouter } from './routes/extract.js';

const app = express();
const PORT = Number(process.env.PORT || 3001);
const HOST = '0.0.0.0';

app.disable('x-powered-by');
app.use(cors());
app.use(express.json({ limit: '64kb' }));
app.use('/api', apiRouter);

app.use((err: unknown, _req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (err) {
    res.status(400).json({ error: '请求内容不是合法的 JSON' });
    return;
  }
  next();
});

// 生产模式：同一个端口托管前端构建产物和抓取接口，iPhone 只需访问一个地址。
const clientDist = fileURLToPath(new URL('../../client/dist', import.meta.url));
const hasClientBuild = fs.existsSync(path.join(clientDist, 'index.html'));

if (hasClientBuild) {
  app.use(express.static(clientDist, { index: false, maxAge: '1h' }));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'));
  });
} else {
  app.get('/', (_req, res) => {
    res.type('text/plain; charset=utf-8').send(
      '纸间阅读器后端已启动。前端开发服务器请访问 http://localhost:5173\n' +
        '或先执行 npm run build，再用本端口访问完整应用。'
    );
  });
}

app.listen(PORT, HOST, () => {
  console.log(`[纸间] 抓取服务已启动：http://localhost:${PORT}`);
  console.log(
    hasClientBuild
      ? `[纸间] 完整应用：http://localhost:${PORT} （局域网：http://<本机IP>:${PORT}）`
      : '[纸间] 开发模式：请同时运行前端 npm run dev，访问 http://localhost:5173'
  );
});
