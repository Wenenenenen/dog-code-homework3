# 多人协作在线白板

一个基于 React + Zustand + BroadcastChannel API 的多人协作在线白板应用，支持真正的跨标签页实时协作绘制。

## 功能特性

### 核心功能
- **真正的多用户实时协作**：使用 BroadcastChannel API 实现跨标签页实时同步，所有打开同一应用的标签页会自动加入同一个"房间"
- **绘制工具**：提供画笔、矩形、文本、橡皮擦、选择五种工具
- **用户区分**：不同用户的操作使用不同颜色标识
- **实时同步**：所有绘制操作实时同步到所有标签页
- **撤销/重做**：支持撤销和重做操作，并处理多人操作冲突（只能撤销自己的操作）
- **画布缩放**：支持鼠标滚轮缩放视图
- **画布拖拽**：支持 Alt + 鼠标左键拖拽平移画布

### UI 特性
- **响应式布局**：适配不同屏幕尺寸
- **工具栏**：集成工具选择、颜色、线宽、字号等控制
- **用户列表**：显示当前在线用户及其状态
- **登录界面**：美观的登录入口
- **网格背景**：辅助对齐的网格背景

## 技术栈

- **前端框架**：React 18
- **状态管理**：Zustand
- **构建工具**：Vite
- **通信方式**：BroadcastChannel API + localStorage（跨标签页通信）
- **样式**：纯 CSS（模块化结构）

## 目录结构

```
002-多人协作在线白板/
├── src/
│   ├── components/           # UI 组件
│   │   ├── Canvas.jsx        # 画布组件（核心绘制逻辑）
│   │   ├── Toolbar.jsx       # 工具栏组件
│   │   ├── UserList.jsx      # 用户列表组件
│   │   └── LoginModal.jsx    # 登录弹窗组件
│   │
│   ├── store/                # 状态管理
│   │   ├── canvasStore.js    # 画布状态（绘制、历史、视图）
│   │   └── userStore.js      # 用户状态（连接、在线用户）
│   │
│   ├── services/             # 服务层
│   │   ├── collaborationService.js  # 核心协作服务（BroadcastChannel）
│   │   ├── webSocketService.js     # WebSocket 服务管理（保留）
│   │   └── mockWebSocket.js        # Mock WebSocket（保留）
│   │
│   ├── utils/                # 工具函数
│   │   └── index.js          # ID 生成、颜色分配、节流防抖等
│   │
│   ├── types/                # 类型定义
│   │   └── index.js          # 工具类型、动作类型、消息类型
│   │
│   ├── styles/               # 样式文件
│   │   └── App.css           # 全局样式
│   │
│   ├── App.jsx               # 主应用组件
│   └── main.jsx              # 入口文件
│
├── index.html                # HTML 模板
├── vite.config.js            # Vite 配置
├── package.json              # 项目依赖
└── README.md                 # 项目说明
```

## 关键设计思路

### 1. 真正的跨标签页实时协作

项目采用 **BroadcastChannel API** 实现真正的多标签页实时协作：

- **BroadcastChannel**：提供了一种在同源的不同浏览器标签页之间进行通信的机制
- **localStorage 事件**：作为 BroadcastChannel 的补充，处理某些情况下跨标签页同步
- **共享状态**：所有标签页共享同一个 room ID（`whiteboard-room-001`），加入同一个"房间"

### 2. 协作服务设计（collaborationService.js）

核心协作服务负责：
- 用户加入/离开管理
- 操作消息广播（绘制、移动、删除、清空）
- 撤销/重做消息同步
- 用户列表同步
- 状态历史持久化到 localStorage

### 3. 消息类型

支持的消息类型：
- `JOIN`：用户加入
- `LEAVE`：用户离开
- `ACTION`：绘制/移动/删除操作
- `UNDO`：撤销操作
- `REDO`：重做操作
- `USERS_LIST`：用户列表同步
- `STATE_SYNC`：状态同步请求
- `PING/PONG`：心跳检测

### 4. 撤销/重做冲突处理

在多人协作场景下，撤销/重做需要处理操作冲突：

- **本地操作标记**：每个历史记录都有 `isLocal` 标记，标识是否是本地用户的操作
- **智能撤销**：撤销时只撤销**当前用户**的最近一次操作，跳过其他用户的操作
- **远程撤销同步**：当其他用户撤销操作时，会广播撤销消息，本地标签页会收到并应用撤销
- **pendingRemoteActions**：用于避免处理自己发出的远程操作

### 5. 状态管理设计（Zustand）

- **canvasStore.js**：
  - 画布元素列表（`elements`）
  - 绘制状态（`isDrawing`、`currentElement`）
  - 工具选择（`selectedTool`、颜色、线宽等）
  - 历史记录（`history`、`historyIndex`）
  - 视图变换（`viewScale`、`viewOffsetX/Y`）
  - 远程操作处理（`handleRemoteAction`、`applyUndo`、`applyRedo`）

- **userStore.js**：
  - 本地用户信息（`localUser`）
  - 在线用户列表（`users`）
  - 协作服务集成（`initCollaboration`、`disconnect`）

## 安装和启动

### 前置要求

- Node.js 版本 >= 16.0.0
- npm 或 yarn 包管理器

### 安装依赖

```bash
cd 002-多人协作在线白板
npm install
```

### 启动开发服务器

```bash
npm run dev
```

应用将在 `http://localhost:3000` 启动，浏览器会自动打开。

### 构建生产版本

```bash
npm run build
```

构建产物将输出到 `dist` 目录。

### 预览生产版本

```bash
npm run preview
```

## 测试真正的多人协作

### 1. 基础测试

1. **打开多个标签页**：
   - 在浏览器中打开应用（http://localhost:3000/）
   - 在新的标签页中再次打开同一地址
   - 可以打开 3-4 个标签页

2. **观察用户列表**：
   - 每个标签页输入不同的用户名
   - 进入白板后，应该能在所有标签页的用户列表中看到所有在线用户
   - 每个用户有不同的颜色标识

3. **测试实时同步**：
   - 在一个标签页中绘制一些内容（线条、矩形、文本）
   - 立即在其他所有标签页中看到同步的内容
   - 绘制的内容应该带有该用户的颜色

4. **测试用户区分**：
   - 观察每个标签页的用户列表
   - 每个用户的颜色应该一致
   - 不同用户绘制的元素应该使用不同的颜色

### 2. 撤销/重做测试

1. **本地撤销**：
   - 在一个标签页中绘制几个图形
   - 点击撤销按钮
   - 应该只撤销当前标签页用户的操作，不影响其他用户的元素

2. **远程撤销同步**：
   - 在标签页 A 中撤销一个操作
   - 观察标签页 B，应该看到该操作被撤销

3. **冲突处理**：
   - 用户 A 和用户 B 同时绘制
   - 用户 A 撤销自己的操作
   - 用户 B 的操作应该不受影响

### 3. 其他功能测试

1. **选择和移动**：
   - 使用选择工具选择一个元素
   - 拖拽移动位置
   - 观察其他标签页是否同步

2. **橡皮擦**：
   - 使用橡皮擦工具删除元素
   - 观察其他标签页是否同步删除

3. **清空画布**：
   - 点击清空按钮
   - 所有标签页的画布都应该被清空

4. **画布缩放和平移**：
   - 滚动鼠标滚轮缩放
   - Alt + 鼠标左键拖拽平移
   - 注意：缩放和平移是本地操作，不会同步到其他标签页

## 扩展性设计

### 1. 连接真实 WebSocket 服务器

如果需要连接真实的后端服务器：

1. 修改 `collaborationService.js`，将 BroadcastChannel 替换为真实的 WebSocket
2. 保持消息格式兼容（`{ type, payload, senderId, senderName, timestamp }`）
3. 添加心跳检测和重连机制
4. 添加用户认证

### 2. 添加新的绘制工具

1. 在 `src/types/index.js` 中添加新的工具类型
2. 在 `src/store/canvasStore.js` 中实现绘制逻辑
3. 在 `src/components/Canvas.jsx` 中添加渲染逻辑
4. 在 `src/components/Toolbar.jsx` 中添加工具按钮

### 3. 添加持久化功能

当前使用 localStorage 存储历史记录，可以扩展为：
- 使用 IndexedDB 存储更多数据
- 添加导出/导入功能
- 添加版本历史

### 4. 添加更多协作功能

- 添加激光笔工具（显示其他用户鼠标位置）
- 添加实时语音/视频通话
- 添加白板房间邀请链接
- 添加用户权限管理

## 技术亮点

1. **BroadcastChannel API**：原生的跨标签页通信 API，效率高且无需服务器
2. **localStorage 事件**：作为补充机制，确保在某些情况下也能同步
3. **智能冲突处理**：通过 `isLocal` 标记和 `pendingRemoteActions` Set 实现精确的冲突处理
4. **状态历史**：所有操作都记录在历史中，支持撤销/重做，并持久化到 localStorage
5. **模块化设计**：清晰的状态分离，便于维护和扩展

## 注意事项

1. **同源策略**：BroadcastChannel 要求所有标签页同源（相同协议、域名、端口）
2. **刷新丢失**：刷新页面后，只有历史记录会从 localStorage 恢复，当前的未提交操作会丢失
3. **localStorage 限制**：localStorage 有大小限制（通常 5-10MB），大量操作历史可能会超出
4. **浏览器支持**：BroadcastChannel 在 IE 和旧版 Edge 中不支持

## 开发建议

1. **调试**：打开多个浏览器标签页，在每个标签页中打开开发者工具，查看控制台日志
2. **状态检查**：可以在控制台使用 `useCanvasStore.getState()` 和 `useUserStore.getState()` 查看当前状态
3. **网络检查**：在开发者工具的 Application 选项卡中，可以查看 localStorage 的内容
4. **性能测试**：可以尝试同时在多个标签页中快速绘制，观察同步延迟

---

**享受真正的多人协作绘制！** 🎨
