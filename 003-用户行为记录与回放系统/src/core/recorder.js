import { ActionType, createLogEntry, generateId } from '../types'
import { DOMSnapshot } from './snapshot'

/**
 * 采集器 - 记录用户操作
 */
export class Recorder {
  constructor() {
    this._isRecording = false
    this._startTime = 0
    this._entries = []
    this._listeners = new Map()
    this._initialSnapshot = null
    this._snapshotService = new DOMSnapshot()
    this._scrollDebounceTimer = null
    this._lastScrollTime = 0
    this._scrollThreshold = 50 // 滚动记录阈值（毫秒）
  }

  /**
   * 是否正在记录
   * @returns {boolean}
   */
  isRecording() {
    return this._isRecording
  }

  /**
   * 获取当前记录的条目
   * @returns {Array}
   */
  getEntries() {
    return [...this._entries]
  }

  /**
   * 获取初始快照
   * @returns {Object|null}
   */
  getInitialSnapshot() {
    return this._initialSnapshot
  }

  /**
   * 开始记录
   * @param {Object} [options] - 记录选项
   * @param {HTMLElement} [options.targetElement=document] - 要记录的目标元素
   * @param {boolean} [options.captureSnapshot=true] - 是否捕获初始快照
   */
  start(options = {}) {
    if (this._isRecording) {
      console.warn('Recorder is already recording')
      return
    }

    const { targetElement = document, captureSnapshot = true } = options

    this._isRecording = true
    this._startTime = Date.now()
    this._entries = []

    if (captureSnapshot) {
      this._initialSnapshot = this._captureDOMSnapshot()
    }

    this._setupEventListeners(targetElement)

    console.log('Recording started at:', new Date(this._startTime).toISOString())
  }

  /**
   * 停止记录
   * @returns {Object} 记录结果
   */
  stop() {
    if (!this._isRecording) {
      console.warn('Recorder is not recording')
      return null
    }

    this._isRecording = false
    this._removeEventListeners()

    if (this._scrollDebounceTimer) {
      clearTimeout(this._scrollDebounceTimer)
      this._scrollDebounceTimer = null
    }

    const result = {
      startTime: this._startTime,
      endTime: Date.now(),
      duration: Date.now() - this._startTime,
      entryCount: this._entries.length,
      entries: [...this._entries],
      initialSnapshot: this._initialSnapshot
    }

    console.log(`Recording stopped. Captured ${result.entryCount} entries.`)
    return result
  }

  /**
   * 暂停记录（保留当前状态）
   */
  pause() {
    if (!this._isRecording) {
      return
    }
    this._isRecording = false
    console.log('Recording paused')
  }

  /**
   * 恢复记录
   */
  resume() {
    if (this._isRecording) {
      return
    }
    this._isRecording = true
    console.log('Recording resumed')
  }

  /**
   * 重置记录器
   */
  reset() {
    this.stop()
    this._entries = []
    this._initialSnapshot = null
    this._startTime = 0
  }

  /**
   * 设置事件监听器
   * @private
   * @param {HTMLElement|Document} target
   */
  _setupEventListeners(target) {
    const handlers = {
      click: this._handleClick.bind(this),
      input: this._handleInput.bind(this),
      change: this._handleInput.bind(this),
      scroll: this._handleScroll.bind(this)
    }

    Object.entries(handlers).forEach(([eventType, handler]) => {
      const options = eventType === 'scroll' ? true : false
      target.addEventListener(eventType, handler, options)
      this._listeners.set(`${eventType}-${options}`, { handler, options })
    })
  }

  /**
   * 移除事件监听器
   * @private
   */
  _removeEventListeners() {
    this._listeners.forEach(({ handler, options }, key) => {
      const [eventType] = key.split('-')
      document.removeEventListener(eventType, handler, options)
    })
    this._listeners.clear()
  }

  /**
   * 处理点击事件
   * @private
   * @param {MouseEvent} event
   */
  _handleClick(event) {
    if (!this._isRecording) return

    const target = this._getTargetInfo(event.target, event)
    const data = {
      x: event.clientX,
      y: event.clientY,
      clientX: event.clientX,
      clientY: event.clientY,
      button: event.button
    }

    const entry = createLogEntry(ActionType.CLICK, target, data, this._startTime)
    this._entries.push(entry)
    console.log('Recorded click:', entry)
  }

  /**
   * 处理输入事件
   * @private
   * @param {Event} event
   */
  _handleInput(event) {
    if (!this._isRecording) return

    const target = event.target
    const isInput = target.tagName === 'INPUT' || 
                    target.tagName === 'TEXTAREA' ||
                    target.tagName === 'SELECT'

    if (!isInput) return

    const targetInfo = this._getTargetInfo(target, event)
    const data = {
      value: target.value,
      inputType: target.type || 'text',
      eventType: event.type
    }

    const entry = createLogEntry(ActionType.INPUT, targetInfo, data, this._startTime)
    this._entries.push(entry)
    console.log('Recorded input:', entry)
  }

  /**
   * 处理滚动事件（带防抖）
   * @private
   * @param {Event} event
   */
  _handleScroll(event) {
    if (!this._isRecording) return

    const now = Date.now()
    if (now - this._lastScrollTime < this._scrollThreshold) {
      if (this._scrollDebounceTimer) {
        clearTimeout(this._scrollDebounceTimer)
      }
      this._scrollDebounceTimer = setTimeout(() => {
        this._recordScrollEvent(event)
      }, this._scrollThreshold)
      return
    }

    this._recordScrollEvent(event)
    this._lastScrollTime = now
  }

  /**
   * 记录滚动事件
   * @private
   * @param {Event} event
   */
  _recordScrollEvent(event) {
    if (!this._isRecording) return

    const target = event.target
    const isWindow = target === document || target === document.documentElement
    
    let scrollTarget
    let scrollTop, scrollLeft

    if (isWindow) {
      scrollTarget = window
      scrollTop = window.scrollY || document.documentElement.scrollTop
      scrollLeft = window.scrollX || document.documentElement.scrollLeft
    } else {
      scrollTarget = target
      scrollTop = target.scrollTop
      scrollLeft = target.scrollLeft
    }

    const targetInfo = this._getTargetInfo(scrollTarget, event)
    const data = {
      scrollTop,
      scrollLeft,
      isWindow
    }

    const entry = createLogEntry(ActionType.SCROLL, targetInfo, data, this._startTime)
    this._entries.push(entry)
    console.log('Recorded scroll:', entry)
  }

  /**
   * 获取目标元素信息
   * @private
   * @param {HTMLElement|Window|Document} target
   * @param {Event} event
   * @returns {Object}
   */
  _getTargetInfo(target, event) {
    if (target === window || target === document || target === document.documentElement) {
      return {
        selector: 'window',
        isWindow: true,
        tagName: 'WINDOW'
      }
    }

    if (!(target instanceof HTMLElement)) {
      return {
        selector: 'unknown',
        tagName: 'UNKNOWN'
      }
    }

    const selector = this._generateCSSSelector(target)
    const rect = target.getBoundingClientRect()

    return {
      selector,
      index: this._getElementIndex(target),
      rect: {
        left: rect.left,
        top: rect.top,
        width: rect.width,
        height: rect.height
      },
      textContent: target.textContent?.slice(0, 50) || '',
      tagName: target.tagName
    }
  }

  /**
   * 生成 CSS 选择器
   * @private
   * @param {HTMLElement} element
   * @returns {string}
   */
  _generateCSSSelector(element) {
    if (element.id) {
      return `#${element.id}`
    }

    const path = []
    let current = element

    while (current && current !== document.body) {
      let selector = current.tagName.toLowerCase()
      
      if (current.className && typeof current.className === 'string') {
        const classes = current.className.trim().split(/\s+/).filter(Boolean)
        if (classes.length > 0) {
          selector += '.' + classes.slice(0, 3).join('.')
        }
      }

      const index = this._getElementIndex(current)
      if (index > 0) {
        selector += `:nth-child(${index + 1})`
      }

      path.unshift(selector)
      current = current.parentElement
    }

    return path.join(' > ')
  }

  /**
   * 获取元素在同级中的索引
   * @private
   * @param {HTMLElement} element
   * @returns {number}
   */
  _getElementIndex(element) {
    if (!element.parentElement) return 0

    const siblings = Array.from(element.parentElement.children)
    return siblings.indexOf(element)
  }

  /**
   * 捕获 DOM 快照（使用 DOMSnapshot 服务）
   * @private
   * @returns {Object}
   */
  _captureDOMSnapshot() {
    return this._snapshotService.capture()
  }

  /**
   * 手动捕获快照（公共方法，支持定时快照）
   * @returns {Object}
   */
  captureSnapshot() {
    return this._captureDOMSnapshot()
  }
}

// 默认导出单例
export const recorder = new Recorder()
