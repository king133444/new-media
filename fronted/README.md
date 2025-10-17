# 新媒体工作室管理系统

一个连接广告主与创作者的综合性管理平台，提供订单管理、用户管理、素材管理、交易管理等功能。

## 技术栈

### 前端
- **React 18** - 用户界面框架
- **TypeScript** - 类型安全
- **Ant Design** - UI组件库
- **Redux Toolkit** - 状态管理
- **React Router** - 路由管理
- **Axios** - HTTP客户端

### 后端
- **NestJS** - Node.js框架
- **Prisma** - ORM数据库工具
- **SQLite** - 数据库（开发环境）
- **JWT** - 身份认证
- **Swagger** - API文档

## 功能模块

### 核心功能
1. **用户管理** - 用户注册、登录、角色管理
2. **订单管理** - 订单创建、审核、状态跟踪
3. **评价管理** - 用户评价审核和管理
4. **客户管理** - 客户信息管理和风险评级
5. **素材管理** - 素材上传、下载、分类管理
6. **交易管理** - 虚拟货币和平台交易
7. **交流中心** - 用户间消息交流
8. **内容推荐** - 个性化内容推荐

### 用户角色
- **管理员** - 系统管理权限
- **广告主** - 发布广告需求
- **创作者** - 承接广告制作
- **设计师** - 专业设计服务

## 快速开始

### 环境要求
- Node.js 18+
- npm 或 yarn

### 安装依赖

#### 前端
```bash
cd /Users/j.alex/projects/new-media
npm install
```

#### 后端
```bash
cd /Users/j.alex/projects/new-media/backend
npm install
```

### 配置环境变量

复制后端环境变量模板：
```bash
cd backend
cp env.example .env
```

编辑 `.env` 文件，配置数据库和JWT密钥：
```env
DATABASE_URL="file:./dev.db"
JWT_SECRET="your-super-secret-jwt-key"
JWT_EXPIRES_IN="7d"
PORT=3000
```

### 初始化数据库

```bash
cd backend
npx prisma generate
npx prisma db push
```

### 启动应用

#### 启动后端服务
```bash
cd backend
npm run start:dev
```

后端服务将在 http://localhost:3000 启动
API文档地址：http://localhost:3000/api/docs

#### 启动前端服务
```bash
npm start
```

前端应用将在 http://localhost:3001 启动

## 项目结构

```
new-media/
├── public/                 # 静态资源
├── src/                    # 前端源码
│   ├── components/         # 公共组件
│   ├── pages/             # 页面组件
│   ├── store/             # 状态管理
│   └── App.tsx            # 应用入口
├── backend/               # 后端源码
│   ├── src/               # 后端源码
│   │   ├── auth/          # 认证模块
│   │   ├── users/         # 用户模块
│   │   ├── orders/        # 订单模块
│   │   ├── prisma/        # 数据库服务
│   │   └── main.ts        # 应用入口
│   ├── prisma/            # 数据库配置
│   └── package.json       # 后端依赖
└── package.json           # 前端依赖
```

## 开发指南

### 添加新功能模块

1. 在后端创建新的模块：
```bash
cd backend
nest generate module feature-name
nest generate service feature-name
nest generate controller feature-name
```

2. 在前端创建对应的页面和组件

3. 更新数据库模型（如需要）：
```bash
cd backend
npx prisma db push
```

### 数据库管理

查看数据库：
```bash
cd backend
npx prisma studio
```

重置数据库：
```bash
cd backend
npx prisma db push --force-reset
```

## 部署

### 生产环境配置

1. 修改环境变量为生产配置
2. 构建前端应用：`npm run build`
3. 构建后端应用：`cd backend && npm run build`
4. 启动生产服务：`cd backend && npm run start:prod`

## 贡献指南

1. Fork 项目
2. 创建功能分支：`git checkout -b feature/new-feature`
3. 提交更改：`git commit -am 'Add new feature'`
4. 推送分支：`git push origin feature/new-feature`
5. 提交 Pull Request

## 许可证

MIT License

## 联系方式

如有问题或建议，请提交 Issue 或联系开发团队。
