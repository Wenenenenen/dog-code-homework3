import React, { useEffect, useState } from 'react';
import Canvas from './components/Canvas';
import Toolbar from './components/Toolbar';
import UserList from './components/UserList';
import LoginModal from './components/LoginModal';
import useUserStore from './store/userStore';
import useCanvasStore from './store/canvasStore';

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const { localUser, isConnected, initCollaboration, disconnect } = useUserStore();
  const { initCollaborationHandlers, clearAll } = useCanvasStore();

  useEffect(() => {
    if (isLoggedIn) {
      initCollaborationHandlers();
    }
  }, [isLoggedIn]);

  const handleLogin = (userName) => {
    initCollaboration(userName, getRandomColor());
    setIsLoggedIn(true);
  };

  const handleLogout = () => {
    disconnect();
    clearAll();
    setIsLoggedIn(false);
  };

  if (!isLoggedIn) {
    return <LoginModal onLogin={handleLogin} />;
  }

  return (
    <div className="app">
      <div className="app-header">
        <h1 className="app-title">多人协作在线白板</h1>
        {localUser && (
          <div className="user-info">
            <span className="user-color-dot" style={{ backgroundColor: localUser.color }}></span>
            <span className="user-name">{localUser.userName}</span>
            <button className="logout-btn" onClick={handleLogout}>
              退出
            </button>
          </div>
        )}
      </div>
      
      <div className="app-body">
        <Toolbar />
        <Canvas />
        <UserList />
      </div>
      
      <div className="app-footer">
        <span className="status-text">
          {isConnected ? '✓ 已连接' : '○ 未连接'}
        </span>
        <span className="zoom-text">
          缩放: {Math.round(useCanvasStore.getState().viewScale * 100)}%
        </span>
      </div>
    </div>
  );
}

function getRandomColor() {
  const colors = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4',
    '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F',
    '#BB8FCE', '#85C1E9', '#F8B739', '#EC407A'
  ];
  return colors[Math.floor(Math.random() * colors.length)];
}

export default App;
