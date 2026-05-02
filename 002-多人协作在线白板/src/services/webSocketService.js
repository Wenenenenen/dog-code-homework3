import MockWebSocket from './mockWebSocket';
import { MessageType } from '../types';

class WebSocketService {
  constructor() {
    this.ws = null;
    this.isConnected = false;
    this.messageHandlers = new Map();
    this.userId = null;
    this.userName = null;
    this.color = null;
  }
  
  connect(url) {
    return new Promise((resolve, reject) => {
      try {
        this.ws = new MockWebSocket(url);
        
        this.ws.onopen = () => {
          this.isConnected = true;
          console.log('WebSocket connected');
          resolve();
        };
        
        this.ws.onmessage = (event) => {
          const message = JSON.parse(event.data);
          this.handleMessage(message);
        };
        
        this.ws.onclose = () => {
          this.isConnected = false;
          console.log('WebSocket disconnected');
        };
        
        this.ws.onerror = (error) => {
          console.error('WebSocket error:', error);
          reject(error);
        };
      } catch (error) {
        reject(error);
      }
    });
  }
  
  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
      this.isConnected = false;
    }
  }
  
  handleMessage(message) {
    const { type, payload } = message;
    const handlers = this.messageHandlers.get(type) || [];
    handlers.forEach((handler) => handler(payload));
  }
  
  on(type, handler) {
    if (!this.messageHandlers.has(type)) {
      this.messageHandlers.set(type, []);
    }
    this.messageHandlers.get(type).push(handler);
    
    return () => {
      const handlers = this.messageHandlers.get(type);
      if (handlers) {
        const index = handlers.indexOf(handler);
        if (index > -1) {
          handlers.splice(index, 1);
        }
      }
    };
  }
  
  off(type, handler) {
    const handlers = this.messageHandlers.get(type);
    if (handlers) {
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    }
  }
  
  join(userName) {
    this.userName = userName;
    this.send(MessageType.JOIN, { userName });
  }
  
  leave() {
    this.send(MessageType.LEAVE, {
      userId: this.userId,
      userName: this.userName
    });
  }
  
  sendAction(action) {
    this.send(MessageType.ACTION, action);
  }
  
  sendUndo(actionId) {
    this.send(MessageType.UNDO, {
      userId: this.userId,
      actionId
    });
  }
  
  sendRedo(actionId) {
    this.send(MessageType.REDO, {
      userId: this.userId,
      actionId
    });
  }
  
  send(type, payload) {
    if (!this.isConnected || !this.ws) {
      console.warn('WebSocket not connected');
      return;
    }
    
    const message = { type, payload };
    this.ws.send(JSON.stringify(message));
  }
  
  setUserInfo(userId, userName, color) {
    this.userId = userId;
    this.userName = userName;
    this.color = color;
  }
}

const webSocketService = new WebSocketService();
export default webSocketService;
