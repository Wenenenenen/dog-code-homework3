import { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import useAppStore from '../store/appStore'
import { ReplayState, ActionType } from '../types'

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

const SPEED_OPTIONS = [0.25, 0.5, 1, 1.5, 2, 3, 5]

function ReplayPage() {
  const navigate = useNavigate()
  const { 
    currentSession, 
    sessions,
    replayState,
    replayProgress,
    replayCurrentTime,
    replayTotalTime,
    replaySpeed,
    replayCurrentEntry,
    startReplay,
    pauseReplay,
    toggleReplay,
    seekReplay,
    setReplaySpeed,
    stopReplay,
    selectSession,
    addNotification,
    loadSessions
  } = useAppStore()

  const [selectedSessionId, setSelectedSessionId] = useState(currentSession?.id || '')
  const timelineRef = useRef(null)
  const entriesContainerRef = useRef(null)

  useEffect(() => {
    loadSessions()
  }, [loadSessions])

  useEffect(() => {
    if (currentSession) {
      setSelectedSessionId(currentSession.id)
    }
  }, [currentSession])

  useEffect(() => {
    if (entriesContainerRef.current && replayCurrentEntry) {
      const entryElement = entriesContainerRef.current.querySelector(`[data-entry-id="${replayCurrentEntry.id}"]`)
      if (entryElement) {
        entryElement.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
    }
  }, [replayCurrentEntry])

  const handleSessionChange = (e) => {
    const id = e.target.value
    setSelectedSessionId(id)
    
    const session = sessions.find(s => s.id === id)
    if (session) {
      stopReplay()
      selectSession(session)
      addNotification(`已加载会话: ${session.name}`, 'info')
    }
  }

  const handleTimelineClick = (e) => {
    if (!currentSession || currentSession.entries.length === 0) return

    const timeline = timelineRef.current
    if (!timeline) return

    const rect = timeline.getBoundingClientRect()
    const clickX = e.clientX - rect.left
    const percentage = clickX / rect.width
    const targetTime = percentage * replayTotalTime

    seekReplay(targetTime)
  }

  const handleEntryClick = (entry) => {
    seekReplay(entry.timestamp)
  }

  const handleSpeedChange = (speed) => {
    setReplaySpeed(speed)
    addNotification(`播放速度: ${speed}x`, 'info')
  }

  const handleReset = () => {
    stopReplay()
    seekReplay(0)
    addNotification('已重置到开始位置', 'info')
  }

  const isPlaying = replayState === ReplayState.PLAYING
  const isPaused = replayState === ReplayState.PAUSED
  const isEnded = replayState === ReplayState.ENDED
  const isIdle = replayState === ReplayState.IDLE

  return (
    <div className="replay-page">
      <div className="page-header">
        <h1 className="page-title">回放控制</h1>
        <p className="page-description">
          选择并回放已记录的用户行为会话
        </p>
      </div>

      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div className="card-body">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '1rem', alignItems: 'end' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">选择会话</label>
              <select 
                className="form-input form-select"
                value={selectedSessionId}
                onChange={handleSessionChange}
                style={{ minWidth: '300px' }}
              >
                <option value="">-- 请选择会话 --</option>
                {sessions.map(session => (
                  <option key={session.id} value={session.id}>
                    {session.name} ({session.entries?.length || 0} 条操作)
                  </option>
                ))}
              </select>
            </div>
            {currentSession && (
              <div style={{ 
                padding: '0.5rem 1rem', 
                backgroundColor: 'var(--gray-50)',
                borderRadius: 'var(--radius)',
                fontSize: '0.8125rem',
                color: 'var(--gray-600)'
              }}>
                <strong>{currentSession.entries?.length || 0}</strong> 条操作 · 
                <strong> {formatTime(currentSession.duration)}</strong>
              </div>
            )}
          </div>
        </div>
      </div>

      {currentSession ? (
        <>
          <div className="timeline-container">
            <div 
              className="timeline"
              ref={timelineRef}
              onClick={handleTimelineClick}
              title="点击跳转到指定位置"
            >
              <div 
                className="timeline-progress"
                style={{ width: `${replayProgress}%` }}
              />
              
              {currentSession.entries.map((entry, index) => {
                const position = currentSession.duration > 0 
                  ? (entry.timestamp / currentSession.duration) * 100 
                  : 0
                return (
                  <div
                    key={entry.id}
                    className={`timeline-entry ${entry.type}`}
                    style={{ left: `${position}%` }}
                    title={`${getActionLabel(entry.type)} - ${formatTime(entry.timestamp)}`}
                  />
                )
              })}

              <div 
                className="timeline-marker"
                style={{ left: `${replayProgress}%` }}
              />
            </div>

            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              marginTop: '0.5rem',
              fontSize: '0.75rem',
              color: 'var(--gray-500)'
            }}>
              <span>{formatTime(0)}</span>
              <span style={{ display: 'flex', gap: '1rem' }}>
                <span>🖱️ 点击</span>
                <span>⌨️ 输入</span>
                <span>📜 滚动</span>
              </span>
              <span>{formatTime(replayTotalTime)}</span>
            </div>
          </div>

          <div className="controls-bar">
            <div className="playback-controls">
              <button 
                className="btn btn-icon btn-outline"
                onClick={handleReset}
                title="重置到开始"
              >
                ⏮️
              </button>
              <button 
                className={`btn btn-icon ${isPlaying ? 'btn-warning' : 'btn-primary'}`}
                onClick={toggleReplay}
                disabled={currentSession.entries.length === 0}
                title={isPlaying ? '暂停' : '播放'}
              >
                {isPlaying ? '⏸️' : '▶️'}
              </button>
              <button 
                className="btn btn-icon btn-outline"
                onClick={() => {
                  stopReplay()
                  seekReplay(replayTotalTime)
                }}
                title="跳到末尾"
              >
                ⏭️
              </button>
            </div>

            <div className="time-display">
              {formatTime(replayCurrentTime)} / {formatTime(replayTotalTime)}
            </div>

            <div style={{ flex: 1, height: '6px', backgroundColor: 'var(--gray-200)', borderRadius: '3px', cursor: 'pointer', position: 'relative' }}
                 onClick={handleTimelineClick}
            >
              <div style={{ 
                position: 'absolute', 
                top: 0, 
                left: 0, 
                height: '100%', 
                backgroundColor: 'var(--primary-color)', 
                borderRadius: '3px',
                width: `${replayProgress}%`
              }} />
            </div>

            <div className="speed-control">
              <span className="speed-label">速度:</span>
              <div className="btn-group">
                {SPEED_OPTIONS.map(speed => (
                  <button
                    key={speed}
                    className={`btn btn-sm ${replaySpeed === speed ? 'btn-primary' : 'btn-outline'}`}
                    onClick={() => handleSpeedChange(speed)}
                  >
                    {speed}x
                  </button>
                ))}
              </div>
            </div>

            <div style={{ 
              padding: '0.25rem 0.75rem', 
              backgroundColor: isPlaying ? 'var(--success-light)' : 
                              isPaused ? 'var(--warning-light)' :
                              isEnded ? 'var(--primary-light)' : 'var(--gray-100)',
              borderRadius: 'var(--radius)',
              fontSize: '0.75rem',
              fontWeight: 600,
              color: isPlaying ? 'var(--success-color)' : 
                     isPaused ? 'var(--warning-color)' :
                     isEnded ? 'var(--primary-color)' : 'var(--gray-500)'
            }}>
              {isPlaying ? '▶ 播放中' : 
               isPaused ? '⏸ 已暂停' : 
               isEnded ? '✓ 已完成' : '⏹ 待命'}
            </div>
          </div>

          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: '1fr 320px', 
            gap: '1.5rem', 
            marginTop: '1.5rem' 
          }}>
            <div className="demo-area">
              <h3 style={{ marginBottom: '1rem', color: 'var(--gray-700)' }}>
                回放区域 - 操作将在此重现
              </h3>
              
              {replayCurrentEntry && (
                <div style={{ 
                  marginBottom: '1rem',
                  padding: '0.75rem 1rem',
                  backgroundColor: 'var(--primary-light)',
                  borderRadius: 'var(--radius)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem'
                }}>
                  <span style={{ fontSize: '1.5rem' }}>
                    {getActionIcon(replayCurrentEntry.type)}
                  </span>
                  <div>
                    <div style={{ fontWeight: 600, color: 'var(--primary-color)' }}>
                      当前: {getActionLabel(replayCurrentEntry.type)}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--gray-600)' }}>
                      {replayCurrentEntry.target?.selector || '未知目标'} · 
                      {formatTime(replayCurrentEntry.timestamp)}
                    </div>
                  </div>
                </div>
              )}

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
                      <p>这是一个可滚动的区域。播放时会重现滚动行为。</p>
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
                <h2 className="card-title">操作序列</h2>
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
                {currentSession.entries.length === 0 ? (
                  <div className="empty-state" style={{ padding: '2rem 1rem' }}>
                    <div className="empty-state-icon">📋</div>
                    <div className="empty-state-title">无操作记录</div>
                    <div className="empty-state-description">
                      此会话中没有记录任何操作
                    </div>
                  </div>
                ) : (
                  currentSession.entries.map((entry, index) => (
                    <div 
                      key={entry.id}
                      data-entry-id={entry.id}
                      className="log-entry-item"
                      style={{ 
                        cursor: 'pointer',
                        backgroundColor: replayCurrentEntry?.id === entry.id 
                          ? 'var(--primary-light)' 
                          : undefined,
                        borderColor: replayCurrentEntry?.id === entry.id 
                          ? 'var(--primary-color)' 
                          : undefined
                      }}
                      onClick={() => handleEntryClick(entry)}
                    >
                      <div className={`log-entry-icon ${entry.type}`}>
                        {getActionIcon(entry.type)}
                      </div>
                      <div className="log-entry-info">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span className="log-entry-type">{getActionLabel(entry.type)}</span>
                          <span style={{ fontSize: '0.7rem', color: 'var(--gray-400)' }}>
                            #{index + 1}
                          </span>
                        </div>
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
        </>
      ) : (
        <div className="card">
          <div className="card-body">
            <div className="empty-state">
              <div className="empty-state-icon">🎬</div>
              <div className="empty-state-title">选择一个会话开始回放</div>
              <div className="empty-state-description">
                从上方下拉菜单选择已记录的会话，或前往管理页面查看所有会话
              </div>
              <div className="btn-group" style={{ marginTop: '1rem' }}>
                <button className="btn btn-primary" onClick={() => navigate('/manager')}>
                  管理会话
                </button>
                <button className="btn btn-outline" onClick={() => navigate('/record')}>
                  记录新会话
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default ReplayPage
