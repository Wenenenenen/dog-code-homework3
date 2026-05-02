import { ActionType, ReplayState } from '../types'
import { DOMSnapshot } from './snapshot'

/**
 * 事件类型枚举（用于发布订阅）
 */
export const ReplayerEvent = {
  STATE_CHANGE: 'stateChange',
  PROGRESS: 'progress',
  ACTION_EXECUTE: 'actionExecute',
  ACTION_ERROR: 'actionError',
  COMPLETE: 'complete',
  SEEK: 'seek',
  SNAPSHOT_RESTORE: 'snapshotRestore',
  SNAPSHOT_RESTORE_ERROR: 'snapshotRestoreError'
}

/**
 * 回放器 - 解耦的回放逻辑
 * 支持播放、暂停、倍速、跳转
 */
export class Replayer {
  constructor() {
    this._state = ReplayState.IDLE
    this._session = null
    this._entries = []
    this._currentIndex = -1
    this._currentTime = 0
    this._speed = 1.0
    this._loop = false
    this._startTime = 0
    this._pausedAt = 0
    this._animationFrameId = null
    this._listeners = new Map()
    this._targetElement = null
    this._highlightElement = null
    this._snapshotService = new DOMSnapshot()
    this._autoRestoreSnapshot = true
  }

  /**
   * 获取当前状态
   * @returns {string}
   */
  getState() {
    return this._state
  }

  /**
   * 获取当前播放时间
   * @returns {number}
   */
  getCurrentTime() {
    return this._currentTime
  }

  /**
   * 获取总时长
   * @returns {number}
   */
  getDuration() {
    if (!this._session) return 0
    return this._session.duration || 0
  }

  /**
   * 获取播放速度
   * @returns {number}
   */
  getSpeed() {
    return this._speed
  }

  /**
   * 获取当前进度（0-1）
   * @returns {number}
   */
  getProgress() {
    const duration = this.getDuration()
    if (duration === 0) return 0
    return this._currentTime / duration
  }

  /**
   * 获取当前条目
   * @returns {Object|null}
   */
  getCurrentEntry() {
    if (this._currentIndex >= 0 && this._currentIndex < this._entries.length) {
      return this._entries[this._currentIndex]
    }
    return null
  }

  /**
   * 加载会话
   * @param {Object} session - 会话对象
   * @param {HTMLElement} [targetElement] - 目标回放元素
   * @param {boolean} [restoreSnapshot=true] - 是否自动还原快照
   */
  loadSession(session, targetElement = null, restoreSnapshot = true) {
    this._stopPlayback()

    this._session = session
    this._entries = session?.entries || []
    this._targetElement = targetElement || document
    this._currentIndex = -1
    this._currentTime = 0
    this._state = ReplayState.IDLE

    if (restoreSnapshot && this._autoRestoreSnapshot) {
      this.restoreInitialSnapshot()
    }

    this._emit(ReplayerEvent.STATE_CHANGE, {
      state: this._state,
      session: this._session
    })

    this._emit(ReplayerEvent.PROGRESS, this._getProgressInfo())

    console.log('Session loaded:', session?.name)
  }

  /**
   * 还原初始 DOM 快照
   * @param {HTMLElement} [root=document] - 根元素
   * @returns {boolean} 是否成功
   */
  restoreInitialSnapshot(root = document) {
    if (!this._session) {
      console.warn('No session loaded')
      this._emit(ReplayerEvent.SNAPSHOT_RESTORE_ERROR, {
        error: 'No session loaded'
      })
      return false
    }

    const snapshot = this._session.initialSnapshot

    if (!snapshot) {
      console.warn('No initial snapshot in session')
      this._emit(ReplayerEvent.SNAPSHOT_RESTORE_ERROR, {
        error: 'No initial snapshot'
      })
      return false
    }

    try {
      this._snapshotService.restore(snapshot, root)
      
      this._emit(ReplayerEvent.SNAPSHOT_RESTORE, {
        snapshot,
        timestamp: Date.now()
      })

      console.log('Initial snapshot restored')
      return true
    } catch (error) {
      console.error('Error restoring snapshot:', error)
      this._emit(ReplayerEvent.SNAPSHOT_RESTORE_ERROR, {
        error: error.message,
        snapshot
      })
      return false
    }
  }

  /**
   * 设置是否自动还原快照
   * @param {boolean} autoRestore
   */
  setAutoRestoreSnapshot(autoRestore) {
    this._autoRestoreSnapshot = autoRestore
  }

  /**
   * 手动触发快照还原（用于从特定时间点恢复）
   * @param {Object} snapshot - 快照数据
   * @param {HTMLElement} [root=document]
   */
  restoreSnapshot(snapshot, root = document) {
    if (!snapshot) {
      console.warn('No snapshot provided')
      return false
    }

    try {
      this._snapshotService.restore(snapshot, root)
      
      this._emit(ReplayerEvent.SNAPSHOT_RESTORE, {
        snapshot,
        timestamp: Date.now()
      })

      return true
    } catch (error) {
      console.error('Error restoring snapshot:', error)
      this._emit(ReplayerEvent.SNAPSHOT_RESTORE_ERROR, {
        error: error.message
      })
      return false
    }
  }

  /**
   * 开始播放
   */
  play() {
    if (!this._session) {
      console.warn('No session loaded')
      return
    }

    if (this._state === ReplayState.PLAYING) {
      return
    }

    if (this._state === ReplayState.ENDED) {
      this.seek(0)
    }

    this._state = ReplayState.PLAYING
    this._startTime = performance.now() - (this._currentTime / this._speed)

    this._emit(ReplayerEvent.STATE_CHANGE, {
      state: this._state,
      currentTime: this._currentTime
    })

    this._scheduleNextAction()
    console.log('Playback started')
  }

  /**
   * 暂停播放
   */
  pause() {
    if (this._state !== ReplayState.PLAYING) {
      return
    }

    this._state = ReplayState.PAUSED
    this._pausedAt = this._currentTime
    this._stopPlayback()

    this._emit(ReplayerEvent.STATE_CHANGE, {
      state: this._state,
      currentTime: this._currentTime
    })

    console.log('Playback paused at:', this._currentTime)
  }

  /**
   * 切换播放/暂停
   */
  toggle() {
    if (this._state === ReplayState.PLAYING) {
      this.pause()
    } else {
      this.play()
    }
  }

  /**
   * 跳转到指定时间
   * @param {number} time - 目标时间（毫秒）
   */
  seek(time) {
    if (!this._session) return

    const duration = this.getDuration()
    const clampedTime = Math.max(0, Math.min(time, duration))

    this._stopPlayback()

    const wasPlaying = this._state === ReplayState.PLAYING

    this._currentTime = clampedTime
    this._currentIndex = this._findEntryIndexAtTime(clampedTime)
    this._state = ReplayState.IDLE

    this._emit(ReplayerEvent.SEEK, {
      time: clampedTime,
      index: this._currentIndex
    })

    this._emit(ReplayerEvent.PROGRESS, this._getProgressInfo())

    if (wasPlaying) {
      this.play()
    }

    console.log('Seeked to:', clampedTime, 'ms, index:', this._currentIndex)
  }

  /**
   * 设置播放速度
   * @param {number} speed - 速度倍数（0.1 - 10）
   */
  setSpeed(speed) {
    const clampedSpeed = Math.max(0.1, Math.min(speed, 10))
    
    if (this._speed === clampedSpeed) return

    const wasPlaying = this._state === ReplayState.PLAYING
    
    if (wasPlaying) {
      this._stopPlayback()
    }

    this._speed = clampedSpeed

    if (wasPlaying) {
      this._startTime = performance.now() - (this._currentTime / this._speed)
      this._scheduleNextAction()
    }

    this._emit(ReplayerEvent.STATE_CHANGE, {
      state: this._state,
      speed: this._speed
    })

    console.log('Speed set to:', this._speed)
  }

  /**
   * 设置是否循环播放
   * @param {boolean} loop
   */
  setLoop(loop) {
    this._loop = loop
  }

  /**
   * 停止并重置
   */
  stop() {
    this._stopPlayback()
    this._currentTime = 0
    this._currentIndex = -1
    this._state = ReplayState.IDLE

    this._emit(ReplayerEvent.STATE_CHANGE, {
      state: this._state
    })

    this._emit(ReplayerEvent.PROGRESS, this._getProgressInfo())
  }

  /**
   * 订阅事件
   * @param {string} event - 事件类型
   * @param {Function} callback - 回调函数
   * @returns {Function} 取消订阅函数
   */
  on(event, callback) {
    if (!this._listeners.has(event)) {
      this._listeners.set(event, new Set())
    }
    this._listeners.get(event).add(callback)

    return () => {
      const listeners = this._listeners.get(event)
      if (listeners) {
        listeners.delete(callback)
      }
    }
  }

  /**
   * 停止播放循环
   * @private
   */
  _stopPlayback() {
    if (this._animationFrameId) {
      cancelAnimationFrame(this._animationFrameId)
      this._animationFrameId = null
    }
  }

  /**
   * 调度下一个动作
   * @private
   */
  _scheduleNextAction() {
    if (this._state !== ReplayState.PLAYING) return

    const nextIndex = this._currentIndex + 1

    if (nextIndex >= this._entries.length) {
      this._handleComplete()
      return
    }

    const nextEntry = this._entries[nextIndex]
    const targetTime = nextEntry.timestamp
    const timeToWait = (targetTime - this._currentTime) / this._speed

    if (timeToWait <= 0) {
      this._executeEntry(nextIndex)
      this._scheduleNextAction()
    } else {
      this._animationFrameId = requestAnimationFrame(() => {
        this._updateCurrentTime()
        if (this._currentTime >= targetTime) {
          this._executeEntry(nextIndex)
          this._scheduleNextAction()
        } else {
          this._scheduleNextAction()
        }
      })
    }
  }

  /**
   * 更新当前时间
   * @private
   */
  _updateCurrentTime() {
    if (this._state !== ReplayState.PLAYING) return

    const elapsed = (performance.now() - this._startTime) * this._speed
    this._currentTime = elapsed

    this._emit(ReplayerEvent.PROGRESS, this._getProgressInfo())
  }

  /**
   * 执行指定索引的条目
   * @private
   * @param {number} index
   */
  _executeEntry(index) {
    if (index < 0 || index >= this._entries.length) return

    const entry = this._entries[index]
    this._currentIndex = index
    this._currentTime = entry.timestamp

    try {
      this._executeAction(entry)
      this._emit(ReplayerEvent.ACTION_EXECUTE, {
        entry,
        index
      })
    } catch (error) {
      console.error('Error executing entry:', error)
      this._emit(ReplayerEvent.ACTION_ERROR, {
        entry,
        index,
        error
      })
    }
  }

  /**
   * 执行具体动作
   * @private
   * @param {Object} entry
   */
  _executeAction(entry) {
    const { type, target, data } = entry

    switch (type) {
      case ActionType.CLICK:
        this._executeClick(target, data)
        break
      case ActionType.INPUT:
        this._executeInput(target, data)
        break
      case ActionType.SCROLL:
        this._executeScroll(target, data)
        break
      default:
        console.warn('Unknown action type:', type)
    }
  }

  /**
   * 执行点击操作
   * @private
   * @param {Object} target
   * @param {Object} data
   */
  _executeClick(target, data) {
    const element = this._findElement(target)
    
    if (element) {
      this._highlightTarget(element)
      
      const event = new MouseEvent('click', {
        clientX: data.x,
        clientY: data.y,
        bubbles: true,
        cancelable: true,
        view: window
      })
      
      element.dispatchEvent(event)
      console.log('Executed click on:', target.selector)
    } else {
      console.warn('Element not found for click:', target.selector)
    }
  }

  /**
   * 执行输入操作
   * @private
   * @param {Object} target
   * @param {Object} data
   */
  _executeInput(target, data) {
    const element = this._findElement(target)
    
    if (element && ('value' in element)) {
      element.value = data.value
      
      const inputEvent = new Event('input', { bubbles: true })
      element.dispatchEvent(inputEvent)
      
      const changeEvent = new Event('change', { bubbles: true })
      element.dispatchEvent(changeEvent)
      
      this._highlightTarget(element)
      console.log('Executed input on:', target.selector, 'value:', data.value)
    } else {
      console.warn('Element not found or not inputtable:', target.selector)
    }
  }

  /**
   * 执行滚动操作
   * @private
   * @param {Object} target
   * @param {Object} data
   */
  _executeScroll(target, data) {
    if (data.isWindow || target.selector === 'window') {
      window.scrollTo({
        left: data.scrollLeft,
        top: data.scrollTop,
        behavior: 'smooth'
      })
      console.log('Executed window scroll to:', data.scrollTop, data.scrollLeft)
    } else {
      const element = this._findElement(target)
      if (element) {
        element.scrollTo({
          left: data.scrollLeft,
          top: data.scrollTop,
          behavior: 'smooth'
        })
        console.log('Executed scroll on:', target.selector)
      }
    }
  }

  /**
   * 查找元素
   * @private
   * @param {Object} target
   * @returns {HTMLElement|null}
   */
  _findElement(target) {
    if (!target || !target.selector) return null

    try {
      const elements = document.querySelectorAll(target.selector)
      
      if (elements.length === 0) return null
      
      if (target.index !== undefined && target.index < elements.length) {
        return elements[target.index]
      }
      
      return elements[0]
    } catch (e) {
      console.error('Error finding element:', e)
      return null
    }
  }

  /**
   * 高亮目标元素（视觉反馈）
   * @private
   * @param {HTMLElement} element
   */
  _highlightTarget(element) {
    if (!element) return

    if (this._highlightElement) {
      this._highlightElement.style.outline = ''
      this._highlightElement = null
    }

    const originalOutline = element.style.outline
    element.style.outline = '3px solid #ff4444'
    this._highlightElement = element

    setTimeout(() => {
      if (this._highlightElement === element) {
        element.style.outline = originalOutline
        this._highlightElement = null
      }
    }, 500)
  }

  /**
   * 处理播放完成
   * @private
   */
  _handleComplete() {
    this._stopPlayback()
    
    const duration = this.getDuration()
    this._currentTime = duration
    this._currentIndex = this._entries.length - 1

    if (this._loop) {
      this._state = ReplayState.IDLE
      this.seek(0)
      this.play()
    } else {
      this._state = ReplayState.ENDED

      this._emit(ReplayerEvent.COMPLETE, {
        totalTime: duration
      })

      this._emit(ReplayerEvent.STATE_CHANGE, {
        state: this._state
      })

      this._emit(ReplayerEvent.PROGRESS, this._getProgressInfo())
    }

    console.log('Playback completed')
  }

  /**
   * 查找指定时间点的条目索引
   * @private
   * @param {number} time
   * @returns {number}
   */
  _findEntryIndexAtTime(time) {
    if (this._entries.length === 0) return -1
    if (time <= 0) return -1

    let index = -1
    for (let i = 0; i < this._entries.length; i++) {
      if (this._entries[i].timestamp <= time) {
        index = i
      } else {
        break
      }
    }
    return index
  }

  /**
   * 获取进度信息
   * @private
   * @returns {Object}
   */
  _getProgressInfo() {
    const duration = this.getDuration()
    return {
      currentTime: this._currentTime,
      totalTime: duration,
      progress: duration > 0 ? (this._currentTime / duration) * 100 : 0,
      currentIndex: this._currentIndex,
      totalEntries: this._entries.length
    }
  }

  /**
   * 触发事件
   * @private
   * @param {string} event
   * @param {any} data
   */
  _emit(event, data) {
    const listeners = this._listeners.get(event)
    if (listeners) {
      listeners.forEach(callback => {
        try {
          callback(data)
        } catch (e) {
          console.error('Event listener error:', e)
        }
      })
    }
  }
}

// 默认导出单例
export const replayer = new Replayer()
