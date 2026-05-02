# 前端用户行为记录与回放系统（简化版）

一个用于记录和回放用户在网页上操作行为的前端系统。支持点击、输入、滚动等操作的捕获、存储和回放。

## 功能特性

### 核心功能
- **操作记录**: 捕获用户的点击、输入（文本/选择框）、滚动等操作
- **日志序列化**: 将操作序列化为结构化的日志格式
- **操作回放**: 在回放页面按时间顺序重现用户操作
- **播放控制**: 支持播放、暂停、跳转、倍速播放（0.25x - 5x）
- **本地存储**: 使用 localStorage 持久化存储会话数据
- **会话管理**: 查看、选择、删除、保存记录的会话

### 技术特点
- **模块化设计**: 采集、存储、回放模块完全解耦
- **事件驱动**: 回放器采用发布订阅模式，便于扩展
- **响应式布局**: 支持桌面端和移动端
- **状态管理**: 使用 Zustand 进行全局状态管理

## 项目结构

```
003-用户行为记录与回放系统/
├── src/
│   ├── components/          # 公共组件
│   │   └── Notification.jsx    # 通知提示组件
│   ├── core/                # 核心模块（解耦设计）
│   │   ├── recorder.js         # 采集模块 - 记录用户操作
│   │   ├── replayer.js         # 回放模块 - 解耦的回放逻辑
│   │   └── storage.js          # 存储模块 - localStorage 管理
│   ├── pages/               # 页面组件
│   │   ├── RecordPage.jsx       # 记录页面
│   │   ├── ReplayPage.jsx       # 回放页面
│   │   └── ManagerPage.jsx      # 管理页面
│   ├── store/               # 状态管理
│   │   └── appStore.js          # Zustand store
│   ├── styles/              # 样式文件
│   │   └── App.css              # 全局样式
│   ├── types/               # 类型定义
│   │   └── index.js             # 日志格式、枚举类型
│   ├── App.jsx               # 主应用组件
│   └── main.jsx              # 入口文件
├── index.html                # HTML 入口
├── vite.config.js            # Vite 配置
├── package.json              # 项目依赖
└── README.md                 # 本文档
```

## 日志格式设计

### 会话（LogSession）
```javascript
{
  id: string,           // 唯一标识
  name: string,         // 会话名称
  description: string,  // 描述
  createdAt: number,    // 创建时间戳
  duration: number,     // 总时长（毫秒）
  initialSnapshot: {    // 初始 DOM 快照
    url: string,
    timestamp: number,
    formData: Object,
    scrollPositions: Object,
    title: string
  },
  entries: LogEntry[]   // 操作日志列表
}
```

### 操作条目（LogEntry）
```javascript
{
  id: string,           // 唯一标识
  type: 'click' | 'input' | 'scroll',  // 操作类型
  timestamp: number,    // 相对于会话开始的时间戳（毫秒）
  target: {             // 目标元素信息
    selector: string,   // CSS 选择器
    index: number,      // 同选择器下的索引
    rect: {             // 元素边界
      left: number,
      top: number,
      width: number,
      height: number
    },
    textContent: string,
    tagName: string
  },
  data: ClickData | InputData | ScrollData  // 操作数据
}
```

### 操作数据类型

**点击操作 (ClickData):**
```javascript
{
  x: number,        // 点击 X 坐标
  y: number,        // 点击 Y 坐标
  clientX: number,
  clientY: number,
  button: number    // 鼠标按钮
}
```

**输入操作 (InputData):**
```javascript
{
  value: string,      // 输入值
  inputType: string,  // 输入类型（text、password、select 等）
  eventType: string   // 事件类型（input、change）
}
```

**滚动操作 (ScrollData):**
```javascript
{
  scrollTop: number,   // 滚动顶部位置
  scrollLeft: number,  // 滚动左侧位置
  isWindow: boolean    // 是否是窗口滚动
}
```

## 核心模块说明

### 1. 采集模块 (Recorder)
**文件:** `src/core/recorder.js`

负责监听和记录用户操作：
- 点击事件监听 (`click`)
- 输入事件监听 (`input`, `change`)
- 滚动事件监听（带防抖优化）
- 元素定位（CSS 选择器生成）
- 初始 DOM 快照捕获

**使用方式:**
```javascript
import { recorder } from './core/recorder'

// 开始记录
recorder.start()

// 停止记录
const result = recorder.stop()
console.log('记录结果:', result)
```

### 2. 存储模块 (StorageService)
**文件:** `src/core/storage.js`

负责 localStorage 数据管理：
- 会话的增删改查
- 导入/导出功能
- 存储使用统计
- localStorage 可用性检测（带内存 fallback）

**使用方式:**
```javascript
import { storageService } from './core/storage'

// 创建新会话
const session = storageService.createSession('测试会话', '描述')

// 保存会话
storageService.saveSession(updatedSession)

// 获取所有会话
const sessions = storageService.getSessions()

// 删除会话
storageService.deleteSession(sessionId)
```

### 3. 回放模块 (Replayer)
**文件:** `src/core/replayer.js`

负责操作的回放控制，采用发布订阅模式，完全解耦：

**核心功能:**
- 播放/暂停/停止
- 倍速播放（0.25x - 5x）
- 时间轴跳转
- 循环播放
- 事件订阅（进度、状态变化、操作执行）

**事件类型:**
- `stateChange` - 状态变化
- `progress` - 进度更新
- `actionExecute` - 操作执行
- `actionError` - 操作错误
- `complete` - 播放完成
- `seek` - 位置跳转

**使用方式:**
```javascript
import { replayer, ReplayerEvent } from './core/replayer'

// 加载会话
replayer.loadSession(session)

// 订阅事件
const unsubscribe = replayer.on(ReplayerEvent.PROGRESS, (progress) => {
  console.log('当前进度:', progress.currentTime, 'ms')
})

// 控制播放
replayer.play()
replayer.setSpeed(2.0)  // 2倍速
replayer.seek(5000)     // 跳转到第5秒
replayer.pause()

// 取消订阅
unsubscribe()
```

## 快速开始

### 环境要求
- Node.js >= 16.0.0
- npm 或 yarn

### 安装依赖
```bash
cd 003-用户行为记录与回放系统
npm install
```

### 启动开发服务器
```bash
npm run dev
```

服务器启动后，浏览器会自动打开 `http://localhost:3000`

### 构建生产版本
```bash
npm run build
```

### 预览生产构建
```bash
npm run preview
```

## 使用指南

### 1. 记录用户操作
1. 进入「记录」页面
2. 点击「开始记录」按钮
3. 在演示区域进行操作：
   - 点击不同的按钮
   - 在输入框中输入文本
   - 在选择框中选择选项
   - 滚动滚动区域
4. 实时查看右侧的操作日志列表
5. 点击「停止记录」按钮
6. 输入会话名称和描述，点击「保存会话」

### 2. 管理会话
1. 进入「管理」页面
2. 查看所有已保存的会话列表
3. 统计信息显示：
   - 会话数量
   - 总操作数
   - 总时长
4. 操作选项：
   - 点击会话卡片选择该会话
   - 点击「播放」按钮直接进入回放页面
   - 点击「🗑️」按钮删除会话
   - 点击「清除全部」删除所有会话

### 3. 回放操作
1. 进入「回放」页面
2. 从下拉菜单选择要回放的会话
3. 使用控制栏操作：
   - **播放/暂停**: 点击中间的播放/暂停按钮
   - **重置**: 点击左箭头回到开始位置
   - **跳转**: 点击时间轴任意位置跳转
   - **倍速**: 点击速度按钮选择播放速度（0.25x - 5x）
4. 查看时间轴：
   - 不同颜色的点代表不同类型的操作
   - 蓝色 = 点击
   - 绿色 = 输入
   - 橙色 = 滚动
5. 右侧操作序列：
   - 显示所有操作的详细信息
   - 当前播放的操作会高亮显示
   - 点击任意操作可跳转到该位置

## 技术栈

- **框架**: React 18
- **构建工具**: Vite 5
- **路由**: React Router DOM 6
- **状态管理**: Zustand 4
- **样式**: 原生 CSS（响应式设计）

## 设计思路

### 模块解耦
核心模块（Recorder、Replayer、StorageService）完全独立，不依赖 React 或其他 UI 框架，可以单独使用或集成到其他项目中。

### 回放器设计
采用事件驱动架构，通过发布订阅模式通知 UI 层状态变化，使回放逻辑与 UI 完全解耦，便于单元测试和扩展。

### 元素定位
使用 CSS 选择器 + 索引的方式定位元素：
1. 优先使用 ID 选择器（如果元素有 ID）
2. 其次使用标签名 + 类名
3. 最后使用 `:nth-child()` 索引辅助定位

### 性能优化
- 滚动事件使用防抖优化（默认 50ms）
- 操作日志实时轮询更新（200ms 间隔）
- 时间轴渲染使用 CSS 定位而非频繁 DOM 操作

## 边界情况处理

- **localStorage 不可用**: 自动降级到内存存储
- **元素定位失败**: 回放时输出警告日志，不中断播放
- **空会话**: 所有页面都有完善的空状态提示
- **错误处理**: 核心模块都有 try-catch 保护
- **响应式**: 适配桌面端和移动端

## 验证步骤

### 基本功能验证
1. **安装启动**: `npm install && npm run dev` 应正常运行
2. **记录功能**:
   - 点击「开始记录」，状态栏显示红色「记录中」
   - 在演示区域点击按钮，右侧应显示点击日志
   - 在输入框输入文字，应显示输入日志
   - 滚动滚动区域，应显示滚动日志
   - 点击「停止记录」，弹出保存对话框
   - 输入名称保存，应显示成功通知
3. **管理功能**:
   - 进入管理页面，应显示刚保存的会话
   - 统计信息应正确显示
   - 点击「播放」应跳转到回放页面
4. **回放功能**:
   - 选择会话，点击播放，演示区域应重现操作
   - 暂停/播放功能正常
   - 拖动时间轴或点击可跳转
   - 切换倍速（如 2x），播放速度应变化
   - 右侧操作列表当前项应高亮
5. **存储持久化**:
   - 刷新浏览器，管理页面的会话应仍存在
   - localStorage 中可查看 `behavior_recorder_sessions` 键

## 扩展建议

1. **更多操作类型**:
   - 键盘事件（keydown、keyup）
   - 鼠标移动（mousemove）
   - 拖拽操作（drag、drop）
   - 页面导航

2. **增强回放**:
   - 鼠标轨迹可视化
   - 操作高亮动画
   - 慢动作回放
   - 帧步进控制

3. **数据导出**:
   - JSON 导出/导入
   - HAR 格式支持
   - 视频录制（结合 canvas）

4. **高级功能**:
   - 会话对比（diff 两个会话）
   - 操作搜索和过滤
   - 标签分类
   - 云端同步

## License

MIT
