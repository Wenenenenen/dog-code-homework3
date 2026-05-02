/**
 * 操作类型枚举
 */
export const ActionType = {
  CLICK: 'click',
  INPUT: 'input',
  SCROLL: 'scroll'
}

/**
 * 回放状态枚举
 */
export const ReplayState = {
  IDLE: 'idle',
  PLAYING: 'playing',
  PAUSED: 'paused',
  ENDED: 'ended'
}

/**
 * 目标元素定位信息
 * @typedef {Object} TargetInfo
 * @property {string} selector - CSS 选择器
 * @property {number} [index] - 同选择器下的索引（当选择器不唯一时）
 * @property {Object} [rect] - 元素边界信息
 * @property {number} rect.left
 * @property {number} rect.top
 * @property {number} rect.width
 * @property {number} rect.height
 * @property {string} [textContent] - 元素文本内容（用于辅助定位）
 * @property {string} [tagName] - 标签名
 */

/**
 * 操作数据基类
 * @typedef {Object} BaseActionData
 */

/**
 * 点击操作数据
 * @typedef {BaseActionData & Object} ClickActionData
 * @property {number} x - 点击 X 坐标（相对于视口）
 * @property {number} y - 点击 Y 坐标（相对于视口）
 * @property {number} [clientX] - 客户端 X 坐标
 * @property {number} [clientY] - 客户端 Y 坐标
 * @property {number} [button] - 鼠标按钮
 */

/**
 * 输入操作数据
 * @typedef {BaseActionData & Object} InputActionData
 * @property {string} value - 输入值
 * @property {string} [inputType] - 输入类型（text、password 等）
 * @property {string} [eventType] - 事件类型（input、change 等）
 */

/**
 * 滚动操作数据
 * @typedef {BaseActionData & Object} ScrollActionData
 * @property {number} scrollTop - 滚动顶部位置
 * @property {number} scrollLeft - 滚动左侧位置
 * @property {boolean} [isWindow] - 是否是窗口滚动
 */

/**
 * 日志条目
 * @typedef {Object} LogEntry
 * @property {string} id - 唯一标识
 * @property {string} type - 操作类型（ActionType）
 * @property {number} timestamp - 相对于会话开始的时间戳（毫秒）
 * @property {TargetInfo} target - 目标元素信息
 * @property {ClickActionData|InputActionData|ScrollActionData} data - 操作数据
 */

/**
 * DOM 状态快照
 * @typedef {Object} DOMSnapshot
 * @property {string} html - HTML 字符串（简化版，可能只包含关键元素）
 * @property {Object} [formData] - 表单数据
 * @property {Object} [scrollPositions] - 滚动位置
 * @property {string} [url] - 页面 URL
 */

/**
 * 日志会话
 * @typedef {Object} LogSession
 * @property {string} id - 会话唯一标识
 * @property {string} name - 会话名称
 * @property {number} createdAt - 创建时间戳
 * @property {number} duration - 会话总时长（毫秒）
 * @property {DOMSnapshot} initialSnapshot - 初始 DOM 快照
 * @property {LogEntry[]} entries - 日志条目列表
 * @property {string} [description] - 描述
 */

/**
 * 回放配置
 * @typedef {Object} ReplayConfig
 * @property {number} speed - 播放速度（1.0 为正常速度）
 * @property {boolean} loop - 是否循环播放
 * @property {number} [startTime] - 开始时间
 * @property {number} [endTime] - 结束时间
 */

/**
 * 回放进度
 * @typedef {Object} ReplayProgress
 * @property {number} currentTime - 当前时间（毫秒）
 * @property {number} totalTime - 总时长（毫秒）
 * @property {number} progress - 进度百分比（0-100）
 * @property {number} currentIndex - 当前播放的日志条目索引
 */

/**
 * 存储键名
 */
export const STORAGE_KEYS = {
  SESSIONS: 'behavior_recorder_sessions',
  SETTINGS: 'behavior_recorder_settings'
}

/**
 * 生成唯一 ID
 * @returns {string}
 */
export function generateId() {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

/**
 * 创建日志条目
 * @param {string} type - 操作类型
 * @param {TargetInfo} target - 目标元素信息
 * @param {Object} data - 操作数据
 * @param {number} startTime - 会话开始时间
 * @returns {LogEntry}
 */
export function createLogEntry(type, target, data, startTime) {
  return {
    id: generateId(),
    type,
    timestamp: Date.now() - startTime,
    target,
    data
  }
}
