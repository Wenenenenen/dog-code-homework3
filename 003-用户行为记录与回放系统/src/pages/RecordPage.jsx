import { useState, useEffect, useRef } from 'react'
import useAppStore from '../store/appStore'
import { ActionType } from '../types'

const formatTime = (ms) => {
  const seconds = Math.floor(ms / 1000)
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  const remainingMs = Math.floor((ms % 1000) / 10)
  return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}.${remainingMs.toString().padStart(2, '0')}`
}

const getActionIcon = (type) => {
  switch (type) {
    case ActionType.CLICK: return '🖱️'
    case ActionType.INPUT: return '⌨️'
    case ActionType.SCROLL: return '📜'
    default: return '❓'
  }
}

const getActionLabel = (type) => {
  switch (type) {
    case ActionType.CLICK: return '点击'
    case ActionType.INPUT: return '输入'
    case ActionType.SCROLL: return '滚动'
    default: return '未知'
  }
}

function RecordPage() {
  const { 
    isRecording, 
    startRecording, 
    stopRecording,
    addNotification,
    saveSession,
    storageLoading
  } = useAppStore()
  
  const [elapsedTime, setElapsedTime] = useState(0)
  const [entries, setEntries] = useState([])
  const [showSaveModal, setShowSaveModal] = useState(false)
  const [sessionName, setSessionName] = useState('')
  const [sessionDescription, setSessionDescription] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  
  const timerRef = useRef(null)
  const entriesContainerRef = useRef(null)

  useEffect(() => {
    if (isRecording) {
      timerRef.current = setInterval(() => {
        setElapsedTime(Date.now() - useAppStore.getState().recordingStartTime)
      }, 100)
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
    }
  }, [isRecording])

  useEffect(() => {
    let interval
    if (isRecording) {
      interval = setInterval(() => {
        const currentEntries = useAppStore.getState().getRecordedEntries()
        setEntries([...currentEntries])
      }, 200)
    }

    return () => {
      if (interval) clearInterval(interval)
    }
  }, [isRecording])

  useEffect(() => {
    if (entriesContainerRef.current) {
      entriesContainerRef.current.scrollTop = entriesContainerRef.current.scrollHeight
    }
  }, [entries])

  const handleStart = () => {
    startRecording()
    setEntries([])
    setElapsedTime(0)
    addNotification('开始记录用户操作', 'info')
  }

  const handleStop = () => {
    const result = stopRecording()
    if (result && result.entryCount > 0) {
      setShowSaveModal(true)
      addNotification(`记录完成，共 ${result.entryCount} 条操作`, 'success')
    } else {
      addNotification('记录完成，但没有操作记录', 'warning')
    }
  }

  const handleSave = async () => {
    if (!sessionName.trim()) {
      addNotification('请输入会话名称', 'error')
      return
    }

    setIsSaving(true)
    try {
      const session = await saveSession(sessionName.trim(), sessionDescription.trim())
      if (session) {
        setShowSaveModal(false)
        setSessionName('')
        setSessionDescription('')
      }
    } catch (error) {
      addNotification('保存失败: ' + error.message, 'error')
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancelSave = () => {
    setShowSaveModal(false)
    setSessionName('')
    setSessionDescription('')
  }

  return (
    <div className="record-page">
      <div className="page-header">
        <h1 className="page-title">记录用户操作</h1>
        <p className="page-description">
          在下方演示区域进行点击、输入、滚动等操作，系统会实时记录您的行为
        </p>
      </div>

      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div className="card-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h2 className="card-title">记录控制</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            {isRecording && (
              <div className="recording-indicator">
                <span className="recording-dot"></span>
                <span>记录中</span>
                <span className="time-display">{formatTime(elapsedTime)}</span>
              </div>
            )}
            <div className="btn-group">
              {!isRecording ? (
                <button className="btn btn-primary btn-lg" onClick={handleStart}>
                  ▶ 开始记录
                </button>
              ) : (
                <button className="btn btn-danger btn-lg" onClick={handleStop}>
                  ⏹ 停止记录
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '1.5rem' }}>
        <div className="demo-area">
          <h3 style={{ marginBottom: '1rem', color: 'var(--gray-700)' }}>
            演示区域 - 请在此进行操作
          </h3>
          
          <div className="demo-grid">
            <div className="demo-section">
              <h4 className="demo-section-title">按钮点击</h4>
              <div className="demo-buttons">
                <button className="demo-btn demo-btn-primary">主要按钮</button>
                <button className="demo-btn demo-btn-secondary">次要按钮</button>
                <button className="demo-btn demo-btn-success">成功</button>
                <button className="demo-btn demo-btn-danger">危险</button>
              </div>
            </div>

            <div className="demo-section">
              <h4 className="demo-section-title">表单输入</h4>
              <div className="demo-input-group">
                <input 
                  type="text" 
                  className="demo-input" 
                  placeholder="输入文本..." 
                />
                <input 
                  type="email" 
                  className="demo-input" 
                  placeholder="输入邮箱..." 
                />
                <select className="demo-select">
                  <option value="">请选择</option>
                  <option value="option1">选项一</option>
                  <option value="option2">选项二</option>
                  <option value="option3">选项三</option>
                </select>
              </div>
            </div>

            <div className="demo-section">
              <h4 className="demo-section-title">文本区域</h4>
              <div className="demo-input-group">
                <textarea 
                  className="demo-input demo-textarea" 
                  placeholder="在此输入多行文本..."
                ></textarea>
              </div>
            </div>

            <div className="demo-section">
              <h4 className="demo-section-title">滚动区域</h4>
              <div className="demo-scroll-area">
                <div className="demo-scroll-content">
                  <p>这是一个可滚动的区域。向下滚动可以测试滚动记录功能。</p>
                  <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.</p>
                  <p>Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.</p>
                  <p>Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.</p>
                  <p>Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.</p>
                  <p>继续滚动以测试更多滚动事件的记录。</p>
                  <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="card" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          <div className="card-header">
            <h2 className="card-title">操作日志 ({entries.length})</h2>
          </div>
          <div 
            className="card-body" 
            ref={entriesContainerRef}
            style={{ 
              flex: 1, 
              overflowY: 'auto',
              padding: '0.75rem'
            }}
          >
            {entries.length === 0 ? (
              <div className="empty-state" style={{ padding: '2rem 1rem' }}>
                <div className="empty-state-icon">📝</div>
                <div className="empty-state-title">暂无操作记录</div>
                <div className="empty-state-description">
                  开始记录后，在此显示捕获的用户操作
                </div>
              </div>
            ) : (
              entries.map((entry, index) => (
                <div key={entry.id} className="log-entry-item">
                  <div className={`log-entry-icon ${entry.type}`}>
                    {getActionIcon(entry.type)}
                  </div>
                  <div className="log-entry-info">
                    <div className="log-entry-type">{getActionLabel(entry.type)}</div>
                    <div className="log-entry-target">
                      {entry.target?.selector || '未知'}
                    </div>
                    {entry.type === ActionType.INPUT && entry.data?.value && (
                      <div style={{ 
                        fontSize: '0.7rem', 
                        color: 'var(--gray-500)',
                        marginTop: '0.25rem'
                      }}>
                        值: "{entry.data.value.slice(0, 20)}{entry.data.value.length > 20 ? '...' : ''}"
                      </div>
                    )}
                  </div>
                  <div className="log-entry-time">
                    {formatTime(entry.timestamp)}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {showSaveModal && (
        <div className="modal-overlay" onClick={handleCancelSave}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">保存记录</h3>
              <button className="modal-close" onClick={handleCancelSave}>×</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">会话名称 *</label>
                <input 
                  type="text" 
                  className="form-input"
                  value={sessionName}
                  onChange={(e) => setSessionName(e.target.value)}
                  placeholder="例如：登录流程测试"
                  autoFocus
                />
              </div>
              <div className="form-group">
                <label className="form-label">描述（可选）</label>
                <textarea 
                  className="form-input form-textarea"
                  value={sessionDescription}
                  onChange={(e) => setSessionDescription(e.target.value)}
                  placeholder="记录此会话的用途或说明..."
                />
              </div>
              <div style={{ 
                padding: '0.75rem', 
                backgroundColor: 'var(--gray-50)',
                borderRadius: 'var(--radius)',
                fontSize: '0.8125rem',
                color: 'var(--gray-600)'
              }}>
                <strong>统计信息：</strong><br />
                操作数量: {entries.length} 条<br />
                记录时长: {formatTime(elapsedTime)}
              </div>
            </div>
            <div className="modal-footer">
              <button 
                className="btn btn-outline" 
                onClick={handleCancelSave}
                disabled={isSaving || storageLoading}
              >
                取消
              </button>
              <button 
                className="btn btn-primary" 
                onClick={handleSave}
                disabled={isSaving || storageLoading}
              >
                {isSaving || storageLoading ? '保存中...' : '保存会话'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default RecordPage
