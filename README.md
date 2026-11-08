# 纸间阅读器 · Zhijian Reading Shelf

一座属于你的私人书房。收藏的文章以**书脊**立在木质书架上，抽出一本，进入像摊开的书一样安静的阅读界面；划线与批注像夹在书页里的私人书签，随时可以重新翻阅、导出成 Markdown。

**本地优先**：没有账号、没有登录、没有云同步、没有后台静默上传。文章正文、阅读进度、划线、批注全部保存在浏览器 IndexedDB 中。只有你点击「添加」时，本地后端才会替你抓取那一个网页。

---

## 一、快速开始（Windows）

需要 **Node.js 18 或更高版本**（推荐 Node 20 / 22 LTS）。在项目根目录 `reading-shelf/` 打开 PowerShell、CMD 或 Git Bash：

```bash
npm install
npm run dev
```

`npm run dev` 会**一条命令同时启动两个服务**（使用 npm workspaces + concurrently，无需分别开两个终端）：

| 服务 | 地址 | 作用 |
| --- | --- | --- |
| Vite 前端 | `http://localhost:5173` | 开发界面，自动代理 `/api` 到后端 |
| Express 后端 | `http://localhost:3001` | 文章抓取接口 `/api/extract` |

打开浏览器访问 **http://localhost:5173** 即可开始使用。

> Windows 首次运行若弹出防火墙提示，请勾选「专用网络」并允许访问，否则 iPhone 无法通过局域网连上。

### 生产模式（推荐用于 iPhone）

```bash
npm run build
npm start
```

`npm run build` 会依次执行前端类型检查 + Vite 生产构建、后端 TypeScript 编译；`npm start` 用 Express **在 3001 单端口同时托管前端静态文件和抓取接口**：

```text
http://localhost:3001          # 电脑
http://<你的本机IP>:3001       # 同一 Wi-Fi 下的 iPhone
```

查本机 IP：命令行执行 `ipconfig`，找「无线局域网适配器 WLAN」下的 **IPv4 地址**（形如 `192.168.1.23`）。手机与电脑需处于同一 Wi-Fi。

### 其他脚本

| 命令 | 说明 |
| --- | --- |
| `npm run dev` | 同时启动前端 + 后端（开发热更新） |
| `npm run dev:client` / `npm run dev:server` | 单独启动某一端 |
| `npm run build` | 生产构建（含 TypeScript 检查） |
| `npm start` | 启动生产服务（需先 build） |
| `npm run typecheck` | 前后端类型检查 |
| `npm run test:core` | 核心算法自检（阅读时长 / 文本锚点 / DOM 划线 / Markdown 导出） |

---

## 二、在 iPhone 上使用

1. 电脑执行 `npm run build && npm start`。
2. 确认电脑和 iPhone 在同一 Wi-Fi，且 Windows 防火墙允许 Node.js 通过专用网络。
3. iPhone Safari 打开 `http://<本机IP>:3001`。
4. 点击 Safari 底部分享按钮 → **添加到主屏幕**。已提供 `apple-touch-icon`、`manifest.webmanifest`、`apple-mobile-web-app-capable`、安全区适配与 Service Worker，桌面图标与启动画面会保持「纸间」的样式。

移动端是正式适配场景，不是缩小版桌面：

- 书架改为**可横向滑动的多层书架**，触控书脊 ≥ 46px，支持惯性滚动与吸附。
- 也可一键切换成**文章列表视图**，快速搜索、筛选、排序。
- 阅读页单栏、全宽纸张，工具栏固定在顶部（不遮挡正文），底部工具条与 Home Indicator 之间使用 `env(safe-area-inset-bottom)` 留白。
- 选中文字后从底部弹出操作条（划线 / 加批注 / 复制 / 颜色）；批注收纳在**底部抽屉**。
- 书签丝带在移动端变为**可拖动横向进度条**，位于底部工具条上方，适合触摸。
- 不强制模拟实体翻页，正常触摸滚动；键盘 ← → 在桌面端翻页。

> **关于 PWA 的诚实说明**：Service Worker 与「独立全屏」模式要求 **HTTPS 或 localhost**。局域网 `http://192.168.x.x` 下 iOS 仍可「添加到主屏幕」并使用全部阅读功能（manifest 图标、apple-touch-icon、全屏 meta 均已配置），但浏览器不会注册 Service Worker，离线应用外壳能力会受限。若需要完整 PWA，请在前面加一层 HTTPS 反向代理或使用内网 HTTPS 域名访问。

---

## 三、功能一览

### 首页 · 私人书架
- 深木色书架、真实隔板与阴影；书脊**颜色按来源区分**，**宽度按预计阅读时长变化**，标题竖排。
- 悬停时书脊轻微抽出并显示信息卡；书脊底部直接标注状态（未读 / 阅读中 / 已完成 / 已归档）。
- 统计：收藏总数、待读、已完成、总预计时长、最近添加、最近阅读。
- 筛选：全部 / 未读 / 阅读中 / 已完成 / 已归档；排序：添加时间 / 最近阅读 / 阅读时长 / 标题；全文搜索。
- **装饰与信息分离**：同时提供文章列表视图，颜色与厚度只做视觉表达，标题、状态与操作入口始终清晰可读。

### 添加文章
- 单篇：粘贴 URL → Readability 提取标题、站点名、原始 URL、正文 HTML、纯文本、字数、预计阅读时长。
- 批量：一次粘贴多个 URL（换行 / 空格 / 逗号分隔），并发 3 条，每条独立显示「等待处理 / 正在抓取 / 添加成功 / 抓取失败 / 已在书架」，带整体进度条。
- 单条失败**不影响其他条目**；保留原始 URL，写入「待手动处理」队列（持久化在 IndexedDB），提供「打开原网页」与「手动粘贴正文」，补录后自动移出队列。
- URL 格式校验、同 URL 去重（规范化后去掉 `#fragment` 比较）、明确错误提示。
- 阅读时长：中日韩文字约 **350 字/分钟**，拉丁文字约 **220 词/分钟**，混合文章分别计算后相加，不把所有字符当英文单词。

### 阅读界面 · 摊开的书
- 四种主题即时切换：**暖光 / 白纸 / 护眼 / 夜间**；带细密纸纹、衬线正文、段落首行缩进、书页式页边距。
- 排版设置：单栏 / 双栏、字号、行距、正文字体、内容宽度，设置保存在本机。
- 自动记录并恢复阅读位置（`scrollTop` + 百分比）；显示进度、可手动标记已读；右侧**书签丝带**可拖动跳转。
- 文章目录（从标题结构生成）、点击跳转、键盘 ← → 翻页。
- 选中文字 → 划线 / 划线并批注 / 复制；四种低饱和度划线颜色，避免荧光笔效果。
- 批注以**页边注卡**显示在正文旁（宽屏）或**底部抽屉**（移动 / 窄屏），点击可定位回原文，可就地编辑、删除。

### 划线与批注管理
- 独立页面，每条划线是一张书签卡片：所属文章、原文、批注、创建时间。
- 按文章筛选、按创建时间正/倒序、逐条或全部折叠展开、编辑批注、删除划线、点击跳回文章对应位置。

### Markdown 导出
- 单篇导出（阅读器工具栏、移动端导出面板）与全部导出（划线管理页）。
- 复制 Markdown / 下载 `.md` 文件；按文章分组；**没有批注的划线也正常导出**。

---

## 四、技术实现

### 目录结构

```text
reading-shelf/
├── client/                       # React + TypeScript + Vite + Tailwind + Lucide
│   ├── public/                   # PWA manifest、Service Worker、图标
│   ├── src/
│   │   ├── components/
│   │   │   ├── layout/           # AppShell 侧栏 / 底部导航
│   │   │   ├── shelf/            # Bookshelf、BookSpine、ShelfStats
│   │   │   ├── article/          # 列表视图与文章行
│   │   │   ├── reader/           # 工具栏、排版、主题、目录、选区菜单、丝带、页边批注
│   │   │   └── ui/               # Toast、Dialog
│   │   ├── pages/                # ShelfPage / AddArticlePage / ReaderPage / HighlightsPage
│   │   ├── hooks/                # useShelf / useReadingSettings / useMediaQuery
│   │   ├── lib/                  # db / anchor / domHighlights / api / markdown / content ...
│   │   ├── types/                # 数据模型
│   │   ├── styles/index.css      # 设计 token 与全部版式
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── index.html
│   ├── package.json
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   └── vite.config.ts            # /api 代理到 3001，host 0.0.0.0
├── server/                       # Node + Express + Readability + jsdom
│   ├── src/
│   │   ├── routes/extract.ts
│   │   ├── services/extract.ts   # 抓取、编码识别、清洗、绝对化链接
│   │   ├── services/readingTime.ts
│   │   └── index.ts              # 生产环境同时托管 client/dist
│   ├── package.json
│   └── tsconfig.json
├── scripts/
│   ├── make-icons.py             # 重新生成 PWA 图标（可选，需要 Pillow）
│   └── verify-core.ts            # 核心算法自检
├── package.json                  # npm workspaces + 一键启动脚本
└── README.md
```

### 数据模型（IndexedDB · idb）

数据库 `zhijian-reading-shelf`，三个 object store：

- `articles`：主键 `id`，索引 `by-addedAt` / `by-status` / `by-url` / `by-lastReadAt`
- `highlights`：主键 `id`，索引 `by-articleId` / `by-createdAt`
- `meta`：键值配置（例如失败 URL 的「待手动处理」队列）

```ts
interface Article {
  id: string; url: string; title: string; siteName: string;
  contentHtml: string; contentText: string;
  wordCount: number; estReadMinutes: number;
  status: 'unread' | 'reading' | 'finished' | 'archived';
  progress: number; addedAt: number;
  // 扩展：lastReadAt, scrollTop, updatedAt, excerpt, isManual, tags ...
}

interface Highlight {
  id: string; articleId: string; text: string; note: string;
  anchorBefore: string; anchorAfter: string; createdAt: number;
  // 扩展：color, updatedAt, position ...
}
```

核心字段含义与需求一致；扩展字段只增不改。阅读排版偏好（主题、字号、行距、字体、宽度、分栏）存在 `localStorage`，刷新即时生效。

### 划线定位机制（重点）

**不使用 DOM Path。** Readability 清理、文章重新渲染、单双栏切换都会改变 DOM 结构，节点路径不可靠。

采用**纯文本锚点**：

1. 选中时保存 `anchorBefore`（选中文本前约 48 字）+ `text`（原文）+ `anchorAfter`（后约 48 字），并记录文本位置用于排序。
2. 重新打开文章时，先把正文纯文本与查询片段做**空白折叠**，并保留「折叠后下标 → 原始下标」的映射。
3. 在正文中找出 `text` 的**所有**出现位置，用前后文打分：完全吻合 > 忽略首尾空白吻合 > 公共前/后缀部分分。
4. 只有一处时直接采用；多处时必须至少一侧上下文完全吻合才采用，否则判定失败。
5. 找不到或无法可靠判断时，**不标记任何内容**，页面显示「N 条划线定位失败」。
6. 定位成功后把字符偏移映射回真实文本节点，逐节点用 `<mark>` 包裹；清除划线时会拆掉 mark 并 `normalize()`，保证纯文本长度不变、偏移稳定。

这套逻辑可用 `npm run test:core` 自检（含 jsdom 下的 DOM 包裹/清除往返测试）。

### 抓取流程与隐私

- `POST /api/extract { url }`：校验协议 → 带超时（20s）与体积上限（8MB）抓取 → 依据响应头 / `<meta charset>` 识别编码（支持 UTF-8、GBK/GB18030、Big5 等）→ jsdom 构造文档 → Mozilla Readability 提取正文 → 去除脚本/事件属性/行内样式、绝对化链接与图片、给标题加 id → 返回结构化数据。
- 图片使用 `referrerpolicy="no-referrer"` 与懒加载；正文内容不会上传到任何第三方服务。
- 前端只在你点击「添加到书架 / 开始抓取」时才调用该接口，没有轮询、没有后台同步。
- Service Worker 只缓存应用外壳与静态资源，**`/api` 请求一律不缓存**。

---

## 五、常见问题

| 现象 | 处理 |
| --- | --- |
| 页面提示「抓取服务未响应」 | 确认已执行 `npm run dev` 或 `npm run build && npm start`；开发模式请用 5173 端口访问前端。 |
| iPhone 打不开局域网地址 | 检查同一 Wi-Fi、Windows 防火墙放行 Node.js、IP 是否正确；生产模式务必用 3001 单端口。 |
| 抓取失败（登录墙 / 反爬 / 纯 JS 渲染 / PDF） | 属正常情况。该 URL 会进入「待手动处理」，打开原网页复制正文，手动补录成一本书。 |
| 刷新后数据不见了 | 数据存在浏览器 IndexedDB。请确认没有清除站点数据、没有使用无痕/隐私模式、访问地址（端口/域名）与之前一致。建议定期用**导出 Markdown** 备份批注。 |
| 端口 3001 / 5173 被占用 | 后端可用 `set PORT=3002 && npm start`（PowerShell：`$env:PORT=3002; npm start`）；前端端口在 `client/vite.config.ts` 调整。 |
| 想重置全部数据 | 浏览器开发者工具 → Application → IndexedDB → 删除 `zhijian-reading-shelf`；排版偏好在 localStorage 的 `zhijian.reading-settings.v1`。 |

---

## 六、验收清单（开发完成后已逐项核对）

- [x] 单篇添加 URL（`example.com` 等真实页面抓取已验证）
- [x] 批量添加多个 URL，逐条独立状态与进度
- [x] 抓取失败不影响其他条目，保留 URL / 打开原网页 / 手动补录
- [x] 书架书脊（来源配色、时长宽度、竖排标题、悬停抽出）
- [x] 搜索、筛选、排序 + 独立列表视图
- [x] 进入沉浸式阅读界面
- [x] 四种阅读主题即时切换
- [x] 字号、行距、字体、内容宽度、单双栏
- [x] 阅读进度保存与恢复、书签丝带拖动跳转
- [x] 目录跳转、键盘 ← → 翻页
- [x] 选中文字创建划线、四种颜色、复制
- [x] 页边批注 / 移动端底部抽屉，可定位回原文
- [x] 重新打开文章后划线按文本锚点恢复，无法定位时明确提示
- [x] 划线管理：筛选、排序、折叠、编辑、删除、跳回原文
- [x] Markdown 单篇 / 全部导出，复制 / 下载，无批注也导出
- [x] 刷新页面数据不丢失（IndexedDB）
- [x] iPhone Safari 响应式、安全区、触控、PWA 图标与主屏幕
- [x] 生产构建通过：`npm run build`（前端 tsc + vite build，后端 tsc）
- [x] `npm run dev` 一条命令同时启动前后端；`/api` 代理与生产静态托管均已实测
- [x] `npm run test:core` 7 项核心算法自检通过
- [x] 无头浏览器端到端实测：抓取入库 → 书脊渲染 → 阅读器 → 选中文字划线 → 刷新后按文本锚点恢复 → 批注编辑 → 划线管理 → Markdown 导出；桌面 1440px 与 iPhone 390px 视口均无横向溢出
