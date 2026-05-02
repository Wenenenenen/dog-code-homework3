import { StorageType } from './mockApi'
import { storageService } from './storage'
import { mockApiStorage } from './mockApi'
import { STORAGE_KEYS } from '../types'

/**
 * 存储管理器
 * 统一管理 localStorage 和 Mock API 两种存储方式
 * 支持切换、同步、导入导出
 */
export class StorageManager {
  constructor() {
    this._currentStorageType = this._loadPreferredStorageType()
    this._listeners = new Set()
  }

  /**
   * 获取当前存储类型
   * @returns {string}
   */
  getCurrentStorageType() {
    return this._currentStorageType
  }

  /**
   * 获取当前存储服务实例
   * @returns {StorageService|MockApiStorage}
   */
  getCurrentStorage() {
    switch (this._currentStorageType) {
      case StorageType.MOCK_API:
        return mockApiStorage
      case StorageType.LOCAL_STORAGE:
      default:
        return storageService
    }
  }

  /**
   * 切换存储类型
   * @param {string} storageType
   * @param {boolean} [syncData=true] - 是否同步数据
   * @returns {Promise<{success: boolean, message: string}>}
   */
  async switchStorage(storageType, syncData = true) {
    if (storageType === this._currentStorageType) {
      return { success: true, message: 'Already using this storage type' }
    }

    if (!Object.values(StorageType).includes(storageType)) {
      return { success: false, message: 'Invalid storage type' }
    }

    if (syncData) {
      try {
        await this._syncBetweenStorages(this._currentStorageType, storageType)
      } catch (error) {
        console.warn('Data sync failed during switch:', error)
      }
    }

    this._currentStorageType = storageType
    this._savePreferredStorageType(storageType)
    this._notifyListeners()

    return {
      success: true,
      message: `Switched to ${storageType}`
    }
  }

  /**
   * 获取所有会话（自动适配当前存储类型）
   * @returns {Promise<Array>|Array}
   */
  async getSessions() {
    const storage = this.getCurrentStorage()
    
    if (this._currentStorageType === StorageType.MOCK_API) {
      const response = await storage.getSessions()
      return response.success ? response.data : []
    }
    
    return storage.getSessions()
  }

  /**
   * 获取单个会话
   * @param {string} id
   * @returns {Promise<Object|null>|Object|null}
   */
  async getSession(id) {
    const storage = this.getCurrentStorage()
    
    if (this._currentStorageType === StorageType.MOCK_API) {
      const response = await storage.getSession(id)
      return response.success ? response.data : null
    }
    
    return storage.getSession(id)
  }

  /**
   * 保存会话
   * @param {Object} session
   * @returns {Promise<Object>|Object}
   */
  async saveSession(session) {
    const storage = this.getCurrentStorage()
    
    if (this._currentStorageType === StorageType.MOCK_API) {
      const response = await storage.saveSession(session)
      return response.success ? response.data : session
    }
    
    return storage.saveSession(session)
  }

  /**
   * 创建新会话
   * @param {string} name
   * @param {string} [description]
   * @returns {Promise<Object>|Object}
   */
  async createSession(name, description = '') {
    const storage = this.getCurrentStorage()
    
    if (this._currentStorageType === StorageType.MOCK_API) {
      const response = await storage.createSession(name, description)
      return response.success ? response.data : null
    }
    
    return storage.createSession(name, description)
  }

  /**
   * 更新会话
   * @param {string} id
   * @param {Object} updates
   * @returns {Promise<Object|null>|Object|null}
   */
  async updateSession(id, updates) {
    const storage = this.getCurrentStorage()
    
    if (this._currentStorageType === StorageType.MOCK_API) {
      const response = await storage.updateSession(id, updates)
      return response.success ? response.data : null
    }
    
    return storage.updateSession(id, updates)
  }

  /**
   * 删除会话
   * @param {string} id
   * @returns {Promise<boolean>|boolean}
   */
  async deleteSession(id) {
    const storage = this.getCurrentStorage()
    
    if (this._currentStorageType === StorageType.MOCK_API) {
      const response = await storage.deleteSession(id)
      return response.success
    }
    
    return storage.deleteSession(id)
  }

  /**
   * 清除所有会话
   * @returns {Promise<void>|void}
   */
  async clearAllSessions() {
    const storage = this.getCurrentStorage()
    
    if (this._currentStorageType === StorageType.MOCK_API) {
      await storage.clearAllSessions()
    } else {
      storage.clearAllSessions()
    }
  }

  /**
   * 导出会话数据
   * @returns {Promise<Array>|Array}
   */
  async exportSessions() {
    const storage = this.getCurrentStorage()
    
    if (this._currentStorageType === StorageType.MOCK_API) {
      const response = await storage.exportSessions()
      return response.success ? response.data : []
    }
    
    return storage.exportSessions()
  }

  /**
   * 导入会话数据
   * @param {Array} sessions
   * @param {boolean} [merge=false]
   * @returns {Promise<{success: boolean, count: number}>}
   */
  async importSessions(sessions, merge = false) {
    const storage = this.getCurrentStorage()
    
    if (this._currentStorageType === StorageType.MOCK_API) {
      const response = await storage.importSessions(sessions, merge)
      return {
        success: response.success,
        count: response.data?.imported || 0
      }
    } else {
      if (merge) {
        const existing = storage.getSessions()
        const existingIds = new Set(existing.map(s => s.id))
        const newSessions = sessions.filter(s => !existingIds.has(s.id))
        storage.importSessions([...newSessions, ...existing])
        return { success: true, count: newSessions.length }
      } else {
        storage.importSessions(sessions)
        return { success: true, count: sessions.length }
      }
    }
  }

  /**
   * 获取存储统计信息
   * @returns {Promise<Object>|Object}
   */
  async getStorageInfo() {
    const storage = this.getCurrentStorage()
    
    if (this._currentStorageType === StorageType.MOCK_API) {
      const response = await storage.getStorageInfo()
      return response.success ? response.data : {}
    }
    
    return storage.getStorageInfo()
  }

  /**
   * 同步当前存储的数据到另一个存储
   * @param {string} targetStorageType
   * @returns {Promise<{success: boolean, count: number}>}
   */
  async syncTo(targetStorageType) {
    try {
      await this._syncBetweenStorages(this._currentStorageType, targetStorageType)
      const sessions = await this.getSessions()
      return { success: true, count: sessions.length }
    } catch (error) {
      return { success: false, count: 0 }
    }
  }

  /**
   * 从另一个存储同步数据到当前存储
   * @param {string} sourceStorageType
   * @returns {Promise<{success: boolean, count: number}>}
   */
  async syncFrom(sourceStorageType) {
    try {
      await this._syncBetweenStorages(sourceStorageType, this._currentStorageType)
      const sessions = await this.getSessions()
      return { success: true, count: sessions.length }
    } catch (error) {
      return { success: false, count: 0 }
    }
  }

  /**
   * 订阅存储类型变化
   * @param {Function} callback
   * @returns {Function} 取消订阅函数
   */
  onStorageChange(callback) {
    this._listeners.add(callback)
    
    return () => {
      this._listeners.delete(callback)
    }
  }

  /**
   * 检查是否是异步存储
   * @returns {boolean}
   */
  isAsync() {
    return this._currentStorageType === StorageType.MOCK_API
  }

  /**
   * 同步两个存储之间的数据
   * @private
   * @param {string} sourceType
   * @param {string} targetType
   */
  async _syncBetweenStorages(sourceType, targetType) {
    let sourceSessions = []

    if (sourceType === StorageType.MOCK_API) {
      const response = await mockApiStorage.getSessions()
      sourceSessions = response.success ? response.data : []
    } else {
      sourceSessions = storageService.getSessions()
    }

    if (targetType === StorageType.MOCK_API) {
      await mockApiStorage.importSessions(sourceSessions, true)
    } else {
      const existing = storageService.getSessions()
      const existingIds = new Set(existing.map(s => s.id))
      const newSessions = sourceSessions.filter(s => !existingIds.has(s.id))
      storageService.importSessions([...newSessions, ...existing])
    }
  }

  /**
   * 加载用户偏好的存储类型
   * @private
   * @returns {string}
   */
  _loadPreferredStorageType() {
    try {
      const preferred = localStorage.getItem(STORAGE_KEYS.SETTINGS)
      if (preferred) {
        const settings = JSON.parse(preferred)
        if (settings.storageType && Object.values(StorageType).includes(settings.storageType)) {
          return settings.storageType
        }
      }
    } catch (e) {
      // 忽略
    }
    
    return StorageType.LOCAL_STORAGE
  }

  /**
   * 保存用户偏好的存储类型
   * @private
   * @param {string} storageType
   */
  _savePreferredStorageType(storageType) {
    try {
      const existing = localStorage.getItem(STORAGE_KEYS.SETTINGS)
      const settings = existing ? JSON.parse(existing) : {}
      settings.storageType = storageType
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings))
    } catch (e) {
      // 忽略
    }
  }

  /**
   * 通知监听器
   * @private
   */
  _notifyListeners() {
    this._listeners.forEach(callback => {
      try {
        callback({
          storageType: this._currentStorageType,
          storage: this.getCurrentStorage()
        })
      } catch (e) {
        console.error('Storage change listener error:', e)
      }
    })
  }
}

// 默认导出单例
export const storageManager = new StorageManager()
