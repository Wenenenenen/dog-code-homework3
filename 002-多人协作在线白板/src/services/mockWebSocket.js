import { MessageType } from '../types';
import { generateUserId, generateUserName, getUserColor, generateId } from '../utils';

class MockWebSocket {
  constructor(url) {
    this.url = url;
    this.readyState = 0;
    this.onopen = null;
    this.onmessage = null;
    this.onclose = null;
    this.onerror = null;
    
    this.userId = generateUserId();
    this.userName = null;
    this.isConnected = false;
    
    setTimeout(() => {
      this.readyState = 1;
      this.isConnected = true;
      if (this.onopen) {
        this.onopen({ type: 'open' });
      }
    }, 100);
  }
  
  send(data) {
    if (!this.isConnected) {
      if (this.onerror) {
        this.onerror({ type: 'error', message: 'Not connected' });
      }
      return;
    }
    
    const message = typeof data === 'string' ? JSON.parse(data) : data;
    this.handleMessage(message);
  }
  
  handleMessage(message) {
    const { type, payload } = message;
    
    switch (type) {
      case MessageType.JOIN:
        this.handleJoin(payload);
        break;
      case MessageType.ACTION:
        this.handleAction(payload);
        break;
      case MessageType.UNDO:
        this.handleUndo(payload);
        break;
      case MessageType.REDO:
        this.handleRedo(payload);
        break;
      case MessageType.LEAVE:
        this.handleLeave(payload);
        break;
      default:
        break;
    }
  }
  
  handleJoin(payload) {
    this.userName = payload.userName;
    
    setTimeout(() => {
      if (this.onmessage) {
        this.onmessage({
          data: JSON.stringify({
            type: MessageType.JOIN,
            payload: {
              userId: this.userId,
              userName: this.userName,
              color: getUserColor(0),
              isLocal: true
            }
          })
        });
        
        this.simulateOtherUsers();
      }
    }, 200);
  }
  
  simulateOtherUsers() {
    const otherUsers = [
      { userId: generateUserId(), userName: '张三', color: getUserColor(1), delay: 500 },
      { userId: generateUserId(), userName: '李四', color: getUserColor(2), delay: 1200 },
      { userId: generateUserId(), userName: '王五', color: getUserColor(3), delay: 2000 }
    ];
    
    otherUsers.forEach((user) => {
      setTimeout(() => {
        if (this.onmessage) {
          this.onmessage({
            data: JSON.stringify({
              type: MessageType.JOIN,
              payload: {
                userId: user.userId,
                userName: user.userName,
                color: user.color,
                isLocal: false
              }
            })
          });
          
          this.simulateUserDraw(user);
        }
      }, user.delay);
    });
  }
  
  simulateUserDraw(user) {
    const drawActions = [
      this.createDrawAction(user, 'line'),
      this.createDrawAction(user, 'rectangle'),
      this.createDrawAction(user, 'text')
    ];
    
    drawActions.forEach((action, index) => {
      setTimeout(() => {
        if (this.onmessage) {
          this.onmessage({
            data: JSON.stringify({
              type: MessageType.ACTION,
              payload: action
            })
          });
        }
      }, (index + 1) * 3000 + Math.random() * 2000);
    });
  }
  
  createDrawAction(user, toolType) {
    const actionId = generateId();
    const baseX = 100 + Math.random() * 300;
    const baseY = 100 + Math.random() * 200;
    
    switch (toolType) {
      case 'line':
        return {
          id: actionId,
          userId: user.userId,
          actionType: 'draw',
          toolType: 'line',
          element: {
            id: generateId(),
            type: 'line',
            points: [
              { x: baseX, y: baseY },
              { x: baseX + 80 + Math.random() * 50, y: baseY + 60 + Math.random() * 40 }
            ],
            strokeColor: user.color,
            strokeWidth: 3,
            userId: user.userId
          }
        };
        
      case 'rectangle':
        return {
          id: actionId,
          userId: user.userId,
          actionType: 'draw',
          toolType: 'rectangle',
          element: {
            id: generateId(),
            type: 'rectangle',
            x: baseX + 150,
            y: baseY,
            width: 100 + Math.random() * 50,
            height: 70 + Math.random() * 30,
            strokeColor: user.color,
            strokeWidth: 2,
            fillColor: `${user.color}33`,
            userId: user.userId
          }
        };
        
      case 'text':
        return {
          id: actionId,
          userId: user.userId,
          actionType: 'draw',
          toolType: 'text',
          element: {
            id: generateId(),
            type: 'text',
            x: baseX,
            y: baseY + 100,
            text: `${user.userName}的留言`,
            fontSize: 18,
            fontFamily: 'Arial, sans-serif',
            fillColor: user.color,
            userId: user.userId
          }
        };
        
      default:
        return null;
    }
  }
  
  handleAction(payload) {
    console.log('Action received:', payload);
  }
  
  handleUndo(payload) {
    console.log('Undo requested:', payload);
  }
  
  handleRedo(payload) {
    console.log('Redo requested:', payload);
  }
  
  handleLeave(payload) {
    console.log('User leaving:', payload);
  }
  
  close() {
    this.readyState = 2;
    this.isConnected = false;
    
    setTimeout(() => {
      this.readyState = 3;
      if (this.onclose) {
        this.onclose({ type: 'close', wasClean: true });
      }
    }, 100);
  }
}

export default MockWebSocket;
