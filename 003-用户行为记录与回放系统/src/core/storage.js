import { STORAGE_KEYS, generateId } from '../types'

/**
 * 存储服务 - 管理 localStorage 中的日志会话
 */
export class StorageService {
  constructor() {
    this.ensureStorageAvailable()
  }

  /**
   * 检查 localStorage 是否可用
   * @private
   */
  ensureStorageAvailable() {
    try {
      const testKey = '__storage_test__'
      localStorage.setItem(testKey, testKey)
      localStorage.removeItem(testKey)
      return true
    } catch (e) {
      console.warn('localStorage 不可用，将使用内存存储')
      this._fallbackStorage = new Map()
      return false
    }
  }

  /**
   * 获取存储数据
   * @private
   * @param {string} key
   * @returns {any}
   */
  _getItem(key) {
    try {
      if (this._fallbackStorage) {
        return this._fallbackStorage.get(key)
      }
      const value = localStorage.getItem(key)
      return value ? JSON.parse(value) : null
    } catch (e) {
      console.error('读取存储失败:', e)
      return null
    }
  }

  /**
   * 设置存储数据
   * @private
   * @param {string} key
   * @param {any} value
   */
  _setItem(key, value) {
    try {
      if (this._fallbackStorage) {
        this._fallbackStorage.set(key, value)
        return
      }
      localStorage.setItem(key, JSON.stringify(value))
    } catch (e) {
      console.error('写入存储失败:', e)
    }
  }

  /**
   * 获取所有会话
   * @returns {Array} 会话列表
   */
  getSessions() {
    const sessions = this._getItem(STORAGE_KEYS.SESSIONS)
    return sessions || []
  }

  /**
   * 根据 ID 获取会话
   * @param {string} id - 会话 ID
   * @returns {Object|null} 会话对象或 null
   */
  getSession(id) {
    const sessions = this.getSessions()
    return sessions.find(session => session.id === id) || null
  }

  /**
   * 保存会话
   * @param {Object} session - 会话对象
   * @returns {Object} 保存后的会话
   */
  saveSession(session) {
    const sessions = this.getSessions()
    const existingIndex = sessions.findIndex(s => s.id === session.id)

    if (existingIndex >= 0) {
      sessions[existingIndex] = session
    } else {
      sessions.unshift(session)
    }

    this._setItem(STORAGE_KEYS.SESSIONS, sessions)
    return session
  }

  /**
   * 创建新会话
   * @param {string} name - 会话名称
   * @param {string} [description] - 会话描述
   * @returns {Object} 新创建的会话
   */
  createSession(name, description = '') {
    const session = {
      id: generateId(),
      name,
      description,
      createdAt: Date.now(),
      duration: 0,
      initialSnapshot: null,
      entries: []
    }

    const sessions = this.getSessions()
    sessions.unshift(session)
    this._setItem(STORAGE_KEYS.SESSIONS, sessions)

    return session
  }

  /**
   * 更新会话
   * @param {string} id - 会话 ID
   * @param {Object} updates - 更新内容
   * @returns {Object|null} 更新后的会话或 null
   */
  updateSession(id, updates) {
    const sessions = this.getSessions()
    const index = sessions.findIndex(s => s.id === id)

    if (index === -1) {
      return null
    }

    sessions[index] = {
      ...sessions[index],
      ...updates
    }

    this._setItem(STORAGE_KEYS.SESSIONS, sessions)
    return sessions[index]
  }

  /**
   * 删除会话
   * @param {string} id - 会话 ID
   * @returns {boolean} 是否删除成功
   */
  deleteSession(id) {
    const sessions = this.getSessions()
    const filtered = sessions.filter(s => s.id !== id)

    if (filtered.length === sessions.length) {
      return false
    }

    this._setItem(STORAGE_KEYS.SESSIONS, filtered)
    return true
  }

  /**
   * 删除所有会话
   */
  clearAllSessions() {
    this._setItem(STORAGE_KEYS.SESSIONS, [])
  }

  /**
   * 导入会话（用于备份恢复）
   * @param {Array} sessions - 会话列表
   * @returns {boolean} 是否成功
   */
  importSessions(sessions) {
    try {
      const existing = this.getSessions()
      const merged = [...sessions, ...existing]
      this._setItem(STORAGE_KEYS.SESSIONS, merged)
      return true
    } catch (e) {
      console.error('导入会话失败:', e)
      return false
    }
  }

  /**
   * 导出所有会话
   * @returns {Array} 会话列表
   */
  exportSessions() {
    return this.getSessions()
  }

  /**
   * 获取存储使用情况
   * @returns {Object} 存储信息
   */
  getStorageInfo() {
    const sessions = this.getSessions()
    const totalSize = new Blob([JSON.stringify(sessions)]).size
    const count = sessions.length
    const totalEntries = sessions.reduce((sum, s) => sum + (s.entries?.length || 0), 0)

    return {
      sessionCount: count,
      totalEntryCount: totalEntries,
      totalSizeBytes: totalSize,
      totalSizeKB: (totalSize / 1024).toFixed(2)
    }
  }
}

// 默认导出单例
export const storageService = new StorageService()
