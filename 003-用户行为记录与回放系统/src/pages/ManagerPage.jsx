import { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import useAppStore from '../store/appStore'
import { StorageType } from '../core/mockApi'

const formatDate = (timestamp) => {
  const date = new Date(timestamp)
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const formatDuration = (ms) => {
  const seconds = Math.floor(ms / 1000)
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  
  if (minutes > 0) {
    return `${minutes}分${remainingSeconds}秒`
  }
  return `${remainingSeconds}秒`
}

const getStorageLabel = (type) => {
  switch (type) {
    case StorageType.LOCAL_STORAGE:
      return '本地存储 (localStorage)'
    case StorageType.MOCK_API:
      return 'Mock API (模拟网络请求)'
    default:
      return type
  }
}

function ManagerPage() {
  const navigate = useNavigate()
  const fileInputRef = useRef(null)
  
  const { 
    sessions, 
    loadSessions, 
    deleteSession, 
    selectSession, 
    currentSession,
    addNotification,
    clearAllSessions,
    storageType,
    storageLoading,
    switchStorageType,
    exportSessions,
    importSessions,
    syncToOtherStorage
  } = useAppStore()
  
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null)
  const [showClearConfirm, setShowClearConfirm] = useState(false)
  const [showImportModal, setShowImportModal] = useState(false)
  const [showSyncModal, setShowSyncModal] = useState(false)
  const [mergeOnImport, setMergeOnImport] = useState(true)
  const [importFile, setImportFile] = useState(null)

  useEffect(() => {
    loadSessions()
  }, [loadSessions])

  const handleSelect = (session) => {
    selectSession(session)
    addNotification(`已选择: ${session.name}`, 'info')
  }

  const handlePlay = (session) => {
    selectSession(session)
    navigate('/replay')
  }

  const handleDeleteClick = (session, e) => {
    e.stopPropagation()
    setShowDeleteConfirm(session)
  }

  const handleConfirmDelete = async () => {
    if (showDeleteConfirm) {
      const success = await deleteSession(showDeleteConfirm.id)
      if (success) {
        addNotification(`已删除: ${showDeleteConfirm.name}`, 'success')
      }
      setShowDeleteConfirm(null)
    }
  }

  const handleClearAll = () => {
    setShowClearConfirm(true)
  }

  const handleConfirmClear = async () => {
    await clearAllSessions()
    setShowClearConfirm(false)
  }

  const handleStorageTypeChange = async (newType) => {
    if (newType === storageType) return
    await switchStorageType(newType, true)
  }

  const handleExport = async () => {
    await exportSessions()
  }

  const handleImportClick = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = (e) => {
    const file = e.target.files?.[0]
    if (file) {
      setImportFile(file)
      setShowImportModal(true)
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleConfirmImport = async () => {
    if (importFile) {
      await importSessions(importFile, mergeOnImport)
      setShowImportModal(false)
      setImportFile(null)
    }
  }

  const handleSync = async (targetType) => {
    await syncToOtherStorage(targetType)
    setShowSyncModal(false)
  }

  const stats = {
    totalSessions: sessions.length,
    totalEntries: sessions.reduce((sum, s) => sum + (s.entries?.length || 0), 0),
    totalDuration: sessions.reduce((sum, s) => sum + (s.duration || 0), 0)
  }

  const otherStorageType = storageType === StorageType.LOCAL_STORAGE 
    ? StorageType.MOCK_API 
    : StorageType.LOCAL_STORAGE

  return (
    <div className="manager-page">
      <div className="page-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 className="page-title">会话管理</h1>
          <p className="page-description">
            查看和管理已记录的用户行为会话
          </p>
        </div>
        <div className="btn-group">
          {sessions.length > 0 && (
            <button className="btn btn-outline btn-danger" onClick={handleClearAll} disabled={storageLoading}>
              🗑️ 清除全部
            </button>
          )}
        </div>
      </div>

      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div className="card-header">
          <h2 className="card-title">存储设置</h2>
        </div>
        <div className="card-body">
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', 
            gap: '1rem',
            marginBottom: '1rem'
          }}>
            <div>
              <label className="form-label">当前存储方式</label>
              <div className="btn-group" style={{ width: '100%' }}>
                <button 
                  className={`btn ${storageType === StorageType.LOCAL_STORAGE ? 'btn-primary' : 'btn-outline'}`}
                  onClick={() => handleStorageTypeChange(StorageType.LOCAL_STORAGE)}
                  disabled={storageLoading}
                  style={{ flex: 1 }}
                >
                  💾 本地存储
                </button>
                <button 
                  className={`btn ${storageType === StorageType.MOCK_API ? 'btn-primary' : 'btn-outline'}`}
                  onClick={() => handleStorageTypeChange(StorageType.MOCK_API)}
                  disabled={storageLoading}
                  style={{ flex: 1 }}
                >
                  🌐 Mock API
                </button>
              </div>
              <p style={{ 
                fontSize: '0.75rem', 
                color: 'var(--gray-500)', 
                marginTop: '0.5rem' 
              }}>
                当前: <strong>{getStorageLabel(storageType)}</strong>
                {storageType === StorageType.MOCK_API && ' (带网络延迟模拟)'}
              </p>
            </div>

            <div>
              <label className="form-label">数据操作</label>
              <div className="btn-group" style={{ width: '100%' }}>
                <button 
                  className="btn btn-outline"
                  onClick={handleExport}
                  disabled={storageLoading || sessions.length === 0}
                  style={{ flex: 1 }}
                >
                  📤 导出
                </button>
                <button 
                  className="btn btn-outline"
                  onClick={handleImportClick}
                  disabled={storageLoading}
                  style={{ flex: 1 }}
                >
                  📥 导入
                </button>
                <button 
                  className="btn btn-outline"
                  onClick={() => setShowSyncModal(true)}
                  disabled={storageLoading}
                  style={{ flex: 1 }}
                >
                  🔄 同步
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-label">会话数量</div>
          <div className="stat-value">{stats.totalSessions}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">总操作数</div>
          <div className="stat-value">{stats.totalEntries}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">总时长</div>
          <div className="stat-value">{formatDuration(stats.totalDuration)}</div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h2 className="card-title">会话列表</h2>
          {storageLoading && (
            <span style={{ fontSize: '0.75rem', color: 'var(--gray-500)' }}>
              加载中...
            </span>
          )}
        </div>
        <div className="card-body">
          {sessions.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">📦</div>
              <div className="empty-state-title">暂无会话记录</div>
              <div className="empty-state-description">
                前往"记录"页面，开始记录您的第一个用户行为会话
              </div>
              <button 
                className="btn btn-primary" 
                style={{ marginTop: '1rem' }}
                onClick={() => navigate('/record')}
              >
                开始记录
              </button>
            </div>
          ) : (
            <div className="session-list">
              {sessions.map((session) => (
                <div 
                  key={session.id}
                  className={`session-item ${currentSession?.id === session.id ? 'selected' : ''}`}
                  onClick={() => handleSelect(session)}
                >
                  <div className="session-info">
                    <div className="session-name">{session.name}</div>
                    <div className="session-meta">
                      <span className="session-meta-item">
                        📅 {formatDate(session.createdAt)}
                      </span>
                      <span className="session-meta-item">
                        ⏱️ {formatDuration(session.duration)}
                      </span>
                      <span className="session-meta-item">
                        📊 {session.entries?.length || 0} 条操作
                      </span>
                    </div>
                    {session.description && (
                      <div style={{ 
                        marginTop: '0.5rem', 
                        fontSize: '0.8125rem',
                        color: 'var(--gray-500)'
                      }}>
                        {session.description}
                      </div>
                    )}
                  </div>
                  <div className="session-actions">
                    <button 
                      className="btn btn-primary btn-sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        handlePlay(session)
                      }}
                    >
                      ▶ 播放
                    </button>
                    <button 
                      className="btn btn-outline btn-sm btn-danger"
                      onClick={(e) => handleDeleteClick(session, e)}
                      disabled={storageLoading}
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <input 
        type="file" 
        ref={fileInputRef}
        style={{ display: 'none' }}
        accept=".json"
        onChange={handleFileChange}
      />

      {showDeleteConfirm && (
        <div className="modal-overlay" onClick={() => setShowDeleteConfirm(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">确认删除</h3>
              <button className="modal-close" onClick={() => setShowDeleteConfirm(null)}>×</button>
            </div>
            <div className="modal-body">
              <p style={{ marginBottom: '0.5rem' }}>
                确定要删除会话 "<strong>{showDeleteConfirm.name}</strong>" 吗？
              </p>
              <p style={{ fontSize: '0.875rem', color: 'var(--gray-500)' }}>
                此操作无法撤销，{showDeleteConfirm.entries?.length || 0} 条操作记录将被永久删除。
              </p>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setShowDeleteConfirm(null)}>
                取消
              </button>
              <button className="btn btn-danger" onClick={handleConfirmDelete} disabled={storageLoading}>
                确认删除
              </button>
            </div>
          </div>
        </div>
      )}

      {showClearConfirm && (
        <div className="modal-overlay" onClick={() => setShowClearConfirm(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">确认清除全部</h3>
              <button className="modal-close" onClick={() => setShowClearConfirm(false)}>×</button>
            </div>
            <div className="modal-body">
              <p style={{ marginBottom: '0.5rem' }}>
                确定要清除 <strong>所有 {sessions.length} 个会话</strong> 吗？
              </p>
              <p style={{ fontSize: '0.875rem', color: 'var(--gray-500)' }}>
                此操作无法撤销，所有记录将被永久删除。
              </p>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setShowClearConfirm(false)}>
                取消
              </button>
              <button className="btn btn-danger" onClick={handleConfirmClear} disabled={storageLoading}>
                确认清除
              </button>
            </div>
          </div>
        </div>
      )}

      {showImportModal && (
        <div className="modal-overlay" onClick={() => { setShowImportModal(false); setImportFile(null) }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">导入会话</h3>
              <button className="modal-close" onClick={() => { setShowImportModal(false); setImportFile(null) }}>×</button>
            </div>
            <div className="modal-body">
              <p style={{ marginBottom: '1rem' }}>
                已选择文件: <strong>{importFile?.name}</strong>
              </p>
              <div className="form-group">
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                  <input 
                    type="checkbox" 
                    checked={mergeOnImport}
                    onChange={(e) => setMergeOnImport(e.target.checked)}
                  />
                  <span style={{ fontSize: '0.875rem' }}>合并模式（保留现有会话，只添加新的）</span>
                </label>
                {!mergeOnImport && (
                  <p style={{ 
                    fontSize: '0.75rem', 
                    color: 'var(--danger-color)', 
                    marginTop: '0.5rem' 
                  }}>
                    ⚠️ 非合并模式将覆盖所有现有会话
                  </p>
                )}
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => { setShowImportModal(false); setImportFile(null) }}>
                取消
              </button>
              <button className="btn btn-primary" onClick={handleConfirmImport} disabled={storageLoading}>
                确认导入
              </button>
            </div>
          </div>
        </div>
      )}

      {showSyncModal && (
        <div className="modal-overlay" onClick={() => setShowSyncModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">同步数据</h3>
              <button className="modal-close" onClick={() => setShowSyncModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <p style={{ marginBottom: '1rem' }}>
                当前存储: <strong>{getStorageLabel(storageType)}</strong>
              </p>
              <p style={{ marginBottom: '1rem', fontSize: '0.875rem', color: 'var(--gray-600)' }}>
                选择要同步数据的目标位置：
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <button 
                  className="btn btn-outline"
                  onClick={() => handleSync(otherStorageType)}
                  disabled={storageLoading}
                >
                  ➡️ 同步到 {getStorageLabel(otherStorageType)}
                </button>
              </div>
              <p style={{ 
                marginTop: '1rem', 
                fontSize: '0.75rem', 
                color: 'var(--gray-500)' 
              }}>
                💡 同步操作会将当前存储的所有会话复制到目标存储，不会删除现有数据。
              </p>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setShowSyncModal(false)}>
                关闭
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default ManagerPage
