## 新媒体工作室管理系统

一个基于 NestJS + Prisma + MySQL 的后端，搭配 React + Ant Design + Redux Toolkit 的前端，内置 Socket.IO 实时通信，覆盖订单全流程、通知中心、交流中心（聊天）、作品集、素材、评价与交易等业务模块。

### 功能概览

- 订单管理
  - 发布/编辑/删除/取消/完成
  - 创作者/设计师申请接单，广告商挑选并委派
  - 委派后自动通知被选中的创作者
  - 订单广场（创作者端）：支持“已申请”标记、取消按钮隐藏等友好状态展示
  - 统计与筛选：按状态、金额、关键词等筛选

- 通知中心（全局铃铛）
  - 实时提醒：申请/委派事件、聊天消息等
  - 红点未读数、下拉最近提醒、点击跳转相关页面
  - 全部已读与单条已读（通过 WebSocket 同步到后端）
  - 离线补推：用户重新上线后自动补发未读提醒

- 交流中心（聊天）
  - 单聊：实时发送/接收、已读回执、状态去重
  - 在线状态：用户上线/下线实时广播；页面进入时主动查询在线列表
  - 离线消息：下次上线补推未读消息
  - 体验优化：增量追加消息、保持滚动在底部、避免重复/抖动、无刷新实时更新

- 用户与权限
  - 角色：管理员/广告商/创作者/设计师
  - JWT 登录鉴权（HTTP 与 WebSocket 统一鉴权）
  - 个人资料（含创作者资料页）

- 作品集/素材/评价/交易（基础）
  - 作品集：增删改查、状态筛选
  - 素材：与用户/订单关联的素材条目
  - 评价：订单维度评价，支持 reviewer/reviewee 关系
  - 交易：充值/提现/订单支付，钱包余额同步

### 技术栈

- 后端：NestJS、Prisma、MySQL、Socket.IO、JWT
- 前端：React、TypeScript、Ant Design、Redux Toolkit、socket.io-client、Axios

---

## 最近更新（重要）

- 本次更新（订单/头像/下载与聊天边界修复）
  - 订单管理/发布
    - 管理页移除“添加订单”，取消后的“再次发布”改为跳转“广告投放”页并携带预填数据。
    - 广告投放页调整：移除“预算上限/项目需求”，将“截止时间”设为必填，标签改为空格分割；支持从“再次发布”跳转的预填；创建成功后跳回订单管理。
  - 头像上传与资料联动
    - 新增 `POST /api/materials/upload-avatar`：保存至 `/uploads/avatars` 并返回相对路径；后端开放 `UpdateUserDto.avatar` 以 `PATCH /auth/me` 入库。
    - 创作者/广告商资料页：
      - 表单增加隐藏 `avatar` 字段，上传成功后写入表单；引入“未保存变更”提示，保存按钮仅在有改动时可点。
      - 保存成功后触发全局 `getUserInfoAsync`，刷新右上角头像。
    - Layout：右上角头像改为 `resolveFileUrl(user.avatar)`；“个人资料”菜单按角色跳转至相应资料页。
    - 全站头像统一：交流中心、订单详情参与者、订单广场等全部使用 `resolveFileUrl(...)`，浏览器自动缓存，避免重复请求。
  - 交付物下载（中文文件名与 IE 兼容）
    - 后端下载响应：`Content-Disposition` 同时设置 `filename` 与 `filename*`（UTF-8），并返回 `Content-Length`，提升各浏览器（含 IE/旧 Edge）兼容性。
    - 前端点击下载：以 Blob 方式下载；现代浏览器使用 `a.download`，IE/旧 Edge 使用 `navigator.msSaveOrOpenBlob`，不再新开标签页。
    - 中文文件名乱码修复：
      - 入库标题 `title` 在服务端由 latin1 → utf8 转换，确保下载显示中文正常。
      - 磁盘物理文件名做 ASCII 安全化（保留原始标题用于展示与下载名）。
  - 聊天“加载更早消息”边界问题
    - 后端控制器支持 `before` 传 epoch 毫秒或 ISO 字符串；服务层以 `createdAt < (before - 1ms)` 查询，并增加二级排序 `createdAt desc, id desc`，消除边界等值/同毫秒多条导致的空页。
    - 前端在“加载更早”时传递 `first.createdAtMs - 1`，避免等于边界。

- 评价管理
  - 仅展示“与我有关”的评价（我给出的/我收到的）；管理员可查看全部。
  - 订单确认收货后，系统为双方各生成一条“待评价”记录（PENDING），铃铛“去评价”直达 `/reviews?openReviewForOrder=<orderId>` 并只弹一次编辑弹窗。

- 交易管理
  - 创作者交易页路径：`/creator/transactions`（侧边菜单已更新）。
  - 统计接口 `GET /transactions/stats` 返回 `walletBalance`，页面展示“钱包余额/累计收入/已提现”。
  - 放款通知（`order.payout.released`）创作者点击直达创作者交易页。

- 交流中心（聊天）
  - 消息分页：接口 `GET /communications/conversations/:contactId?limit=20&before=<ISO>`，默认 20 条，支持向上加载更多。
  - 前端顶部“加载更早消息”向上插入，保持滚动体验；仅在用户位于底部/刚选联系人/刚发送时自动滚底，避免阅读历史时被打断。

- 铃铛通知跳转
  - 申请 → 广告商直达 `/orders?openApplicationsFor=<orderId>`；订单页处理后清理参数，避免重复弹出。
  - 交付物提交 → 广告商直达 `/orders?openOrder=<orderId>&showDeliverables=1`（自动打开详情与交付物列表），参数用后即清。
  - 放款 → 创作者直达 `/creator/transactions`。
  - 去评价 → 双方直达 `/reviews?openReviewForOrder=<orderId>`，页面定位待评价并只弹一次。

---

## 本地运行

### 1 分开配置环境变量（推荐）

后端（backend/.env）：

```env
PORT=3000
DATABASE_URL="mysql://user:password@localhost:3306/new_media"
JWT_SECRET="your-secret-key"
# 逗号分隔 CORS 来源
CORS_ORIGINS=http://localhost:3000,http://localhost:3001
```

前端（fronted/.env）：

```env
# 后端 HTTP 基址（包含 /api 前缀）
REACT_APP_API_URL=http://localhost:3000/api
# WebSocket 网关（Nest 网关命名空间 /ws）
REACT_APP_WS_HTTP_URL=http://localhost:3000/ws
```

### 2 安装依赖并启动

后端（NestJS）：

```bash
cd backend
yarn install
npx prisma generate
npx prisma migrate dev -n init
yarn start:dev
# 默认运行于 http://localhost:3000 （WebSocket 命名空间 /ws）
```

前端（React）：

```bash
cd fronted
yarn install
yarn start
# 运行于 http://localhost:8000 （/fronted/.env可修改）；API/WS 取自 fronted/.env
```

> 提示：首次运行请确保数据库已创建，且 .env 中的 `DATABASE_URL` 正确。

---

## Prisma 常用命令

```bash
cd backend
# 生成 Prisma Client
npx prisma generate

# 依据 schema 同步数据库（开发模式）
npx prisma migrate dev -n <migration_name>

# 查看数据库（Web UI）
npx prisma studio

# 校验 schema
npx prisma validate
```

---

## WebSocket（Socket.IO）工作原理

- 连接鉴权
  - 前端在建立 Socket.IO 连接时，通过 `auth.token` 携带 JWT；网关使用同一 `JWT_SECRET` 验证并将连接加入 `user:{userId}` 房间。

- 事件设计（部分）
  - 订单申请创建：`order.application.created` → 仅推送给广告商
  - 订单申请被接受：`order.application.accepted` → 推送给被委派的创作者
  - 聊天消息发送：客户端发 `communication.send` → 网关入库后：
    - 给接收者推送 `communication.message`
    - 给发送者推送 `communication.message.sent`（作为成功确认）
  - 会话已读：`communication.read` → 双方收到 `communication.read` 以刷新未读
  - 在线状态：用户连接/断开时网关广播 `online.changed { userIds }`
  - 上线补推：新连接建立、计数从 0→1 时，网关查询未读申请/消息，统一通过 `notifications.bulk` 推送

- 前端连接管理
  - 全局仅保留一条连接；提供 `wsOn/wsOff/wsEmit` 复用
  - 挂起监听队列：在连接未建立时的订阅会在 `connect` 后统一绑定
  - 事件去重：2 秒内基于 `event + id` 去重，避免重复渲染

---

## 亮点与优化

- 实时可靠
  - 消息链路“先入库，再推送”，避免丢失/重复；发送端收到 `communication.message.sent` 才更新
  - 断线重连补推未读（`notifications.bulk`）

- 在线状态精准
  - 网关维护 `userId -> 连接计数`，只在 0↔1 变化时广播，避免噪音

- 通知中心体验
  - 铃铛红点 + 下拉列表，点击跳转，`全部已读/单条已读` 通过 WS 同步
  - 过滤不应入铃铛的事件（如在线状态）

- 聊天窗口体验
  - 增量追加消息、自动滚动到底部、避免整表刷新
  - 去除本地乐观追加导致的重复问题

- 请求统一
  - 统一使用自定义 Axios 实例（`http.get/post/...`），移除 `fetch/response.ok` 混用

---

## 快速排错（FAQ）

- WebSocket 频繁连接/断开？
  - 确保只在 `App` 根组件处 `connectWebSocket(token)` 一次，页面内用 `wsOn/wsOff` 订阅，不要重复 `io()`。

- 收到重复消息？
  - 确认后端仅由网关统一推送；前端事件已做去重与单连接复用。

- 鉴权失败（`secret or public key must be provided`）？
  - 设置 `JWT_SECRET`，并保证后端网关与认证模块使用同一密钥。


