import React from 'react';
import useUserStore from '../store/userStore';

const UserList = () => {
  const { localUser, users } = useUserStore();
  
  const allUsers = localUser ? [localUser, ...users] : users;
  
  return (
    <div className="user-list">
      <div className="user-list-header">
        <h3 className="user-list-title">在线用户 ({allUsers.length})</h3>
      </div>
      
      <div className="user-list-content">
        {allUsers.length === 0 ? (
          <div className="empty-state">
            <p className="empty-text">暂无在线用户</p>
          </div>
        ) : (
          <div className="user-items">
            {allUsers.map((user, index) => (
              <div
                key={user.userId}
                className={`user-item ${user.isLocal ? 'local-user' : ''}`}
              >
                <div
                  className="user-avatar"
                  style={{ backgroundColor: user.color }}
                >
                  {user.userName.charAt(0).toUpperCase()}
                </div>
                <div className="user-info">
                  <span className="user-name">{user.userName}</span>
                  {user.isLocal && (
                    <span className="user-badge">我</span>
                  )}
                </div>
                <div
                  className="user-status"
                  style={{ backgroundColor: user.color }}
                ></div>
              </div>
            ))}
          </div>
        )}
      </div>
      
      <div className="user-list-footer">
        <p className="footer-text">🎨 不同颜色代表不同用户</p>
        <p className="footer-text">⚡ 实时同步绘制内容</p>
      </div>
    </div>
  );
};

export default UserList;
