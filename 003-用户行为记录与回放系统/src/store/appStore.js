import { create } from 'zustand'
import { storageManager } from '../core/storageManager'
import { StorageType } from '../core/mockApi'
import { recorder } from '../core/recorder'
import { replayer, ReplayerEvent } from '../core/replayer'
import { ReplayState, generateId } from '../types'

const useAppStore = create((set, get) => ({
  sessions: [],
  currentSession: null,
  isRecording: false,
  recordingStartTime: 0,
  recordedEntries: [],
  
  replayState: ReplayState.IDLE,
  replayProgress: 0,
  replayCurrentTime: 0,
  replayTotalTime: 0,
  replaySpeed: 1.0,
  replayCurrentEntry: null,
  
  storageType: storageManager.getCurrentStorageType(),
  storageLoading: false,
  
  loading: false,
  error: null,
  notifications: [],

  init: () => {
    get().loadSessions()

    replayer.on(ReplayerEvent.STATE_CHANGE, (data) => {
      set({
        replayState: data.state,
        replaySpeed: data.speed || get().replaySpeed
      })
    })

    replayer.on(ReplayerEvent.PROGRESS, (progress) => {
      set({
        replayProgress: progress.progress,
        replayCurrentTime: progress.currentTime,
        replayTotalTime: progress.totalTime
      })
    })

    replayer.on(ReplayerEvent.ACTION_EXECUTE, ({ entry }) => {
      set({ replayCurrentEntry: entry })
    })

    replayer.on(ReplayerEvent.SNAPSHOT_RESTORE, (data) => {
      get().addNotification('DOM 状态已还原', 'success')
    })

    replayer.on(ReplayerEvent.SNAPSHOT_RESTORE_ERROR, (data) => {
      console.warn('Snapshot restore error:', data.error)
    })

    storageManager.onStorageChange(({ storageType }) => {
      set({ storageType })
      get().loadSessions()
    })
  },

  loadSessions: async () => {
    set({ storageLoading: true })
    try {
      const sessions = await storageManager.getSessions()
      set({ sessions, storageLoading: false })
      return sessions
    } catch (error) {
      set({ storageLoading: false, error: error.message })
      get().addNotification('加载会话失败', 'error')
      return []
    }
  },

  saveSession: async (name, description = '') => {
    const result = recorder.stop()
    if (!result) {
      get().addNotification('没有记录数据可保存', 'warning')
      return null
    }

    set({ storageLoading: true })
    try {
      const session = await storageManager.createSession(name, description)
      if (!session) {
        throw new Error('创建会话失败')
      }

      const updatedSession = {
        ...session,
        duration: result.duration,
        initialSnapshot: result.initialSnapshot,
        entries: result.entries
      }

      await storageManager.saveSession(updatedSession)
      
      await get().loadSessions()
      
      set({
        isRecording: false,
        recordingStartTime: 0,
        recordedEntries: [],
        storageLoading: false
      })

      get().addNotification(`会话 "${name}" 已保存`, 'success')
      return updatedSession
    } catch (error) {
      set({ storageLoading: false, error: error.message })
      get().addNotification('保存会话失败: ' + error.message, 'error')
      return null
    }
  },

  deleteSession: async (id) => {
    set({ storageLoading: true })
    try {
      const success = await storageManager.deleteSession(id)
      if (success) {
        await get().loadSessions()
        set({
          currentSession: get().currentSession?.id === id ? null : get().currentSession,
          storageLoading: false
        })
        get().addNotification('会话已删除', 'success')
      }
      return success
    } catch (error) {
      set({ storageLoading: false, error: error.message })
      get().addNotification('删除会话失败', 'error')
      return false
    }
  },

  clearAllSessions: async () => {
    set({ storageLoading: true })
    try {
      await storageManager.clearAllSessions()
      await get().loadSessions()
      set({ currentSession: null, storageLoading: false })
      get().addNotification('已清除所有会话', 'success')
    } catch (error) {
      set({ storageLoading: false, error: error.message })
      get().addNotification('清除会话失败', 'error')
    }
  },

  selectSession: (session) => {
    if (session) {
      replayer.loadSession(session)
    }
    set({ currentSession: session })
  },

  startRecording: () => {
    recorder.start()
    set({
      isRecording: true,
      recordingStartTime: Date.now(),
      recordedEntries: []
    })
    get().addNotification('开始记录', 'info')
  },

  stopRecording: () => {
    const result = recorder.stop()
    const entries = result?.entries || []
    set({
      isRecording: false,
      recordedEntries: entries
    })
    return result
  },

  pauseRecording: () => {
    recorder.pause()
    set({ isRecording: false })
    get().addNotification('记录已暂停', 'info')
  },

  resumeRecording: () => {
    recorder.resume()
    set({ isRecording: true })
    get().addNotification('记录已恢复', 'info')
  },

  getRecordedEntries: () => {
    return recorder.getEntries()
  },

  startReplay: () => {
    replayer.play()
  },

  pauseReplay: () => {
    replayer.pause()
  },

  toggleReplay: () => {
    replayer.toggle()
  },

  seekReplay: (time) => {
    replayer.seek(time)
  },

  setReplaySpeed: (speed) => {
    replayer.setSpeed(speed)
    set({ replaySpeed: speed })
  },

  stopReplay: () => {
    replayer.stop()
  },

  switchStorageType: async (storageType, syncData = true) => {
    set({ storageLoading: true })
    try {
      const result = await storageManager.switchStorage(storageType, syncData)
      if (result.success) {
        set({ storageType })
        await get().loadSessions()
        get().addNotification(`已切换到 ${storageType === StorageType.MOCK_API ? 'Mock API' : '本地存储'}`, 'success')
      }
      set({ storageLoading: false })
      return result.success
    } catch (error) {
      set({ storageLoading: false, error: error.message })
      get().addNotification('切换存储失败', 'error')
      return false
    }
  },

  exportSessions: async () => {
    try {
      const sessions = await storageManager.exportSessions()
      const dataStr = JSON.stringify(sessions, null, 2)
      const dataBlob = new Blob([dataStr], { type: 'application/json' })
      
      const url = URL.createObjectURL(dataBlob)
      const link = document.createElement('a')
      link.href = url
      link.download = `sessions_${Date.now()}.json`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

      get().addNotification(`已导出 ${sessions.length} 个会话`, 'success')
      return true
    } catch (error) {
      get().addNotification('导出失败: ' + error.message, 'error')
      return false
    }
  },

  importSessions: async (fileOrData, merge = false) => {
    set({ storageLoading: true })
    try {
      let sessions

      if (fileOrData instanceof File) {
        const text = await fileOrData.text()
        sessions = JSON.parse(text)
      } else if (Array.isArray(fileOrData)) {
        sessions = fileOrData
      } else {
        throw new Error('无效的导入数据')
      }

      if (!Array.isArray(sessions)) {
        throw new Error('导入的数据格式不正确')
      }

      const result = await storageManager.importSessions(sessions, merge)
      await get().loadSessions()
      set({ storageLoading: false })

      get().addNotification(`已导入 ${result.count} 个会话`, 'success')
      return result
    } catch (error) {
      set({ storageLoading: false, error: error.message })
      get().addNotification('导入失败: ' + error.message, 'error')
      return { success: false, count: 0 }
    }
  },

  syncToOtherStorage: async (targetType) => {
    set({ storageLoading: true })
    try {
      const result = await storageManager.syncTo(targetType)
      set({ storageLoading: false })
      
      if (result.success) {
        get().addNotification(`已同步 ${result.count} 个会话到 ${targetType === StorageType.MOCK_API ? 'Mock API' : '本地存储'}`, 'success')
      }
      return result.success
    } catch (error) {
      set({ storageLoading: false, error: error.message })
      get().addNotification('同步失败', 'error')
      return false
    }
  },

  addNotification: (message, type = 'info') => {
    const id = generateId()
    const notification = { id, message, type }
    set((state) => ({
      notifications: [...state.notifications, notification]
    }))

    setTimeout(() => {
      set((state) => ({
        notifications: state.notifications.filter(n => n.id !== id)
      }))
    }, 3000)
  },

  setError: (error) => {
    set({ error })
    if (error) {
      get().addNotification(error.message || '发生错误', 'error')
    }
  },

  clearError: () => {
    set({ error: null })
  }
}))

export default useAppStore
