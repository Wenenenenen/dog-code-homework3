import { generateId } from '../types'

/**
 * 存储类型枚举
 */
export const StorageType = {
  LOCAL_STORAGE: 'localStorage',
  MOCK_API: 'mockApi',
  MEMORY: 'memory'
}

/**
 * 模拟网络延迟（毫秒）
 */
const MOCK_DELAY = {
  min: 100,
  max: 500
}

/**
 * API 响应格式
 */
const ApiResponse = {
  success(data = null, message = 'Success') {
    return {
      success: true,
      data,
      message,
      timestamp: Date.now()
    }
  },

  error(message = 'Error', code = 500) {
    return {
      success: false,
      data: null,
      message,
      code,
      timestamp: Date.now()
    }
  }
}

/**
 * 生成随机延迟
 * @returns {number}
 */
function randomDelay() {
  return Math.floor(Math.random() * (MOCK_DELAY.max - MOCK_DELAY.min) + MOCK_DELAY.min)
}

/**
 * 模拟 API 调用
 * @param {Function} handler - 处理函数
 * @param {number} [forceDelay] - 强制延迟时间
 * @returns {Promise}
 */
async function mockApiCall(handler, forceDelay = null) {
  const delay = forceDelay !== null ? forceDelay : randomDelay()
  
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      try {
        const result = handler()
        resolve(result)
      } catch (error) {
        reject(error)
      }
    }, delay)
  })
}

/**
 * Mock API 存储服务
 * 模拟异步 API 请求，支持所有 StorageService 的功能
 */
export class MockApiStorage {
  constructor() {
    this._storageKey = 'behavior_recorder_mock_api_sessions'
    this._memoryStorage = null
    this._initMemoryStorage()
  }

  /**
   * 初始化内存存储
   * @private
   */
  _initMemoryStorage() {
    try {
      const stored = localStorage.getItem(this._storageKey)
      if (stored) {
        this._memoryStorage = JSON.parse(stored)
      } else {
        this._memoryStorage = {
          sessions: [],
          settings: {},
          metadata: {
            createdAt: Date.now(),
            version: '1.0.0'
          }
        }
      }
    } catch (e) {
      console.warn('MockApi: localStorage not available, using pure memory')
      this._memoryStorage = {
        sessions: [],
        settings: {},
        metadata: {
          createdAt: Date.now(),
          version: '1.0.0'
        }
      }
    }
  }

  /**
   * 持久化到 localStorage（如果可用）
   * @private
   */
  _persist() {
    try {
      localStorage.setItem(this._storageKey, JSON.stringify(this._memoryStorage))
    } catch (e) {
      console.warn('MockApi: Failed to persist to localStorage')
    }
  }

  /**
   * 获取所有会话（模拟 API 调用）
   * @returns {Promise<ApiResponse>}
   */
  async getSessions() {
    return mockApiCall(() => {
      const sessions = [...(this._memoryStorage.sessions || [])]
      return ApiResponse.success(sessions)
    })
  }

  /**
   * 根据 ID 获取会话
   * @param {string} id
   * @returns {Promise<ApiResponse>}
   */
  async getSession(id) {
    if (!id) {
      return mockApiCall(() => ApiResponse.error('Session ID is required', 400), 50)
    }

    return mockApiCall(() => {
      const session = this._memoryStorage.sessions.find(s => s.id === id)
      if (session) {
        return ApiResponse.success({ ...session })
      }
      return ApiResponse.error('Session not found', 404)
    })
  }

  /**
   * 保存会话（创建或更新）
   * @param {Object} session
   * @returns {Promise<ApiResponse>}
   */
  async saveSession(session) {
    if (!session) {
      return mockApiCall(() => ApiResponse.error('Session is required', 400), 50)
    }

    return mockApiCall(() => {
      const sessions = this._memoryStorage.sessions || []
      const existingIndex = sessions.findIndex(s => s.id === session.id)

      const sessionToSave = {
        ...session,
        updatedAt: Date.now()
      }

      if (existingIndex >= 0) {
        sessions[existingIndex] = sessionToSave
      } else {
        sessionToSave.createdAt = sessionToSave.createdAt || Date.now()
        sessions.unshift(sessionToSave)
      }

      this._memoryStorage.sessions = sessions
      this._persist()

      return ApiResponse.success(
        { ...sessionToSave },
        existingIndex >= 0 ? 'Session updated' : 'Session created'
      )
    })
  }

  /**
   * 创建新会话
   * @param {string} name
   * @param {string} [description]
   * @returns {Promise<ApiResponse>}
   */
  async createSession(name, description = '') {
    if (!name || !name.trim()) {
      return mockApiCall(() => ApiResponse.error('Session name is required', 400), 50)
    }

    return mockApiCall(() => {
      const session = {
        id: generateId(),
        name: name.trim(),
        description: description || '',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        duration: 0,
        initialSnapshot: null,
        entries: []
      }

      const sessions = this._memoryStorage.sessions || []
      sessions.unshift(session)
      this._memoryStorage.sessions = sessions
      this._persist()

      return ApiResponse.success({ ...session }, 'Session created')
    })
  }

  /**
   * 更新会话
   * @param {string} id
   * @param {Object} updates
   * @returns {Promise<ApiResponse>}
   */
  async updateSession(id, updates) {
    if (!id) {
      return mockApiCall(() => ApiResponse.error('Session ID is required', 400), 50)
    }

    return mockApiCall(() => {
      const sessions = this._memoryStorage.sessions || []
      const index = sessions.findIndex(s => s.id === id)

      if (index === -1) {
        return ApiResponse.error('Session not found', 404)
      }

      sessions[index] = {
        ...sessions[index],
        ...updates,
        updatedAt: Date.now()
      }

      this._memoryStorage.sessions = sessions
      this._persist()

      return ApiResponse.success({ ...sessions[index] }, 'Session updated')
    })
  }

  /**
   * 删除会话
   * @param {string} id
   * @returns {Promise<ApiResponse>}
   */
  async deleteSession(id) {
    if (!id) {
      return mockApiCall(() => ApiResponse.error('Session ID is required', 400), 50)
    }

    return mockApiCall(() => {
      const sessions = this._memoryStorage.sessions || []
      const filtered = sessions.filter(s => s.id !== id)

      if (filtered.length === sessions.length) {
        return ApiResponse.error('Session not found', 404)
      }

      this._memoryStorage.sessions = filtered
      this._persist()

      return ApiResponse.success(null, 'Session deleted')
    })
  }

  /**
   * 删除所有会话
   * @returns {Promise<ApiResponse>}
   */
  async clearAllSessions() {
    return mockApiCall(() => {
      this._memoryStorage.sessions = []
      this._persist()
      return ApiResponse.success(null, 'All sessions cleared')
    })
  }

  /**
   * 批量导入会话
   * @param {Array} sessions
   * @param {boolean} [merge=false]
   * @returns {Promise<ApiResponse>}
   */
  async importSessions(sessions, merge = false) {
    if (!Array.isArray(sessions)) {
      return mockApiCall(() => ApiResponse.error('Sessions must be an array', 400), 50)
    }

    return mockApiCall(() => {
      const validSessions = sessions.filter(s => s && s.id)

      if (merge) {
        const existing = this._memoryStorage.sessions || []
        const existingIds = new Set(existing.map(s => s.id))
        
        const newSessions = validSessions.filter(s => !existingIds.has(s.id))
        this._memoryStorage.sessions = [...newSessions, ...existing]
      } else {
        this._memoryStorage.sessions = [...validSessions]
      }

      this._memoryStorage.sessions.forEach(s => {
        s.updatedAt = s.updatedAt || Date.now()
      })

      this._persist()

      return ApiResponse.success(
        { imported: validSessions.length },
        `Imported ${validSessions.length} sessions`
      )
    })
  }

  /**
   * 导出所有会话
   * @returns {Promise<ApiResponse>}
   */
  async exportSessions() {
    return mockApiCall(() => {
      const sessions = [...(this._memoryStorage.sessions || [])]
      return ApiResponse.success(sessions)
    })
  }

  /**
   * 获取存储统计信息
   * @returns {Promise<ApiResponse>}
   */
  async getStorageInfo() {
    return mockApiCall(() => {
      const sessions = this._memoryStorage.sessions || []
      const totalSize = new Blob([JSON.stringify(sessions)]).size
      const totalEntries = sessions.reduce((sum, s) => sum + (s.entries?.length || 0), 0)

      return ApiResponse.success({
        sessionCount: sessions.length,
        totalEntryCount: totalEntries,
        totalSizeBytes: totalSize,
        totalSizeKB: (totalSize / 1024).toFixed(2),
        storageType: 'Mock API'
      })
    })
  }

  /**
   * 同步数据到 localStorage 存储
   * 用于在 Mock API 和 localStorage 之间迁移数据
   * @param {StorageService} localStorageService
   * @returns {Promise<ApiResponse>}
   */
  async syncToLocalStorage(localStorageService) {
    return mockApiCall(() => {
      const sessions = this._memoryStorage.sessions || []
      
      sessions.forEach(session => {
        localStorageService.saveSession(session)
      })

      return ApiResponse.success(
        { synced: sessions.length },
        `Synced ${sessions.length} sessions to localStorage`
      )
    })
  }

  /**
   * 从 localStorage 存储同步数据
   * @param {StorageService} localStorageService
   * @returns {Promise<ApiResponse>}
   */
  async syncFromLocalStorage(localStorageService) {
    return mockApiCall(() => {
      const sessions = localStorageService.getSessions()
      
      this._memoryStorage.sessions = [...sessions]
      this._persist()

      return ApiResponse.success(
        { synced: sessions.length },
        `Synced ${sessions.length} sessions from localStorage`
      )
    })
  }

  /**
   * 模拟网络错误（用于测试）
   * @returns {Promise}
   */
  async simulateError() {
    return mockApiCall(() => {
      throw new Error('Network error: Connection timed out')
    }, 800)
  }

  /**
   * 清除内存存储（用于测试）
   */
  _clear() {
    this._memoryStorage = {
      sessions: [],
      settings: {},
      metadata: {
        createdAt: Date.now(),
        version: '1.0.0'
      }
    }
    try {
      localStorage.removeItem(this._storageKey)
    } catch (e) {}
  }
}

// 默认导出单例
export const mockApiStorage = new MockApiStorage()
