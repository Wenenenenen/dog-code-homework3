import React, { useState } from 'react';

const LoginModal = ({ onLogin }) => {
  const [userName, setUserName] = useState('');
  const [error, setError] = useState('');
  
  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!userName.trim()) {
      setError('请输入用户名');
      return;
    }
    
    if (userName.trim().length < 2) {
      setError('用户名至少需要2个字符');
      return;
    }
    
    if (userName.trim().length > 20) {
      setError('用户名不能超过20个字符');
      return;
    }
    
    onLogin(userName.trim());
  };
  
  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSubmit(e);
    }
  };
  
  return (
    <div className="login-modal-overlay">
      <div className="login-modal">
        <div className="login-header">
          <h1 className="login-title">🎨 多人协作在线白板</h1>
          <p className="login-subtitle">实时协作，创意无限</p>
        </div>
        
        <form className="login-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="userName">
              请输入您的用户名
            </label>
            <input
              id="userName"
              type="text"
              className={`form-input ${error ? 'error' : ''}`}
              value={userName}
              onChange={(e) => {
                setUserName(e.target.value);
                setError('');
              }}
              onKeyPress={handleKeyPress}
              placeholder="例如：张三"
              autoFocus
              maxLength={20}
            />
            {error && <p className="form-error">{error}</p>}
          </div>
          
          <button
            type="submit"
            className="login-btn"
            disabled={!userName.trim()}
          >
            进入白板
          </button>
        </form>
        
        <div className="login-features">
          <div className="feature-item">
            <span className="feature-icon">✏️</span>
            <span className="feature-text">自由绘制</span>
          </div>
          <div className="feature-item">
            <span className="feature-icon">👥</span>
            <span className="feature-text">多人协作</span>
          </div>
          <div className="feature-item">
            <span className="feature-icon">🔄</span>
            <span className="feature-text">撤销重做</span>
          </div>
          <div className="feature-item">
            <span className="feature-icon">🔍</span>
            <span className="feature-text">缩放平移</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginModal;
