import { MessageType, ActionType } from '../types';
import { generateId } from '../utils';

class CollaborationService {
  constructor() {
    this.channel = null;
    this.userId = null;
    this.userName = null;
    this.color = null;
    this.roomId = 'whiteboard-room-001';
    this.messageHandlers = new Map();
    this.localHandlers = [];
    this.isInitialized = false;
    this.lastActionId = null;
    this.pendingActions = new Map();
    this.versionVector = new Map();
    
    this.onUserJoined = null;
    this.onUserLeft = null;
    this.onActionReceived = null;
    this.onUsersListUpdated = null;
  }
  
  initialize(userName, color) {
    this.userId = generateId();
    this.userName = userName;
    this.color = color;
    
    this.channel = new BroadcastChannel(this.roomId);
    
    this.channel.onmessage = (event) => {
      this.handleMessage(event.data);
    };
    
    window.addEventListener('storage', (event) => {
      if (event.key && event.key.startsWith('whiteboard_')) {
        this.handleStorageEvent(event);
      }
    });
    
    this.sendJoinMessage();
    
    this.loadExistingState();
    
    this.isInitialized = true;
    
    setTimeout(() => {
      this.broadcastUsersList();
    }, 100);
  }
  
  handleMessage(message) {
    const { type, payload, senderId } = message;
    
    if (senderId === this.userId) {
      return;
    }
    
    switch (type) {
      case MessageType.JOIN:
        this.handleUserJoin(payload);
        break;
        
      case MessageType.LEAVE:
        this.handleUserLeave(payload);
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
        
      case MessageType.USERS_LIST:
        this.handleUsersList(payload);
        break;
        
      case MessageType.STATE_SYNC:
        this.handleStateSync(payload);
        break;
        
      case MessageType.PING:
        this.handlePing(payload);
        break;
        
      case MessageType.PONG:
        this.handlePong(payload);
        break;
    }
  }
  
  handleStorageEvent(event) {
    try {
      const data = JSON.parse(event.newValue);
      if (!data || data.senderId === this.userId) return;
      
      if (data.type === 'action_update') {
        this.handleAction(data.payload);
      } else if (data.type === 'users_update') {
        this.handleUsersList(data.payload);
      } else if (data.type === 'state_sync') {
        this.handleStateSync(data.payload);
      }
    } catch (e) {
    }
  }
  
  handleUserJoin(payload) {
    if (this.onUserJoined) {
      this.onUserJoined(payload);
    }
    
    this.broadcastUsersList();
    
    setTimeout(() => {
      this.requestStateSync(payload.userId);
    }, 200);
  }
  
  handleUserLeave(payload) {
    if (this.onUserLeft) {
      this.onUserLeft(payload);
    }
    
    this.broadcastUsersList();
  }
  
  handleAction(payload) {
    if (this.onActionReceived) {
      this.onActionReceived(payload);
    }
  }
  
  handleUndo(payload) {
    if (this.onActionReceived) {
      this.onActionReceived({
        ...payload,
        actionType: 'remote_undo'
      });
    }
  }
  
  handleRedo(payload) {
    if (this.onActionReceived) {
      this.onActionReceived({
        ...payload,
        actionType: 'remote_redo'
      });
    }
  }
  
  handleUsersList(payload) {
    if (this.onUsersListUpdated) {
      this.onUsersListUpdated(payload.users);
    }
  }
  
  handleStateSync(payload) {
    if (this.onActionReceived) {
      this.onActionReceived({
        ...payload,
        actionType: 'state_sync'
      });
    }
  }
  
  handlePing(payload) {
    this.sendPong(payload.senderId);
  }
  
  handlePong(payload) {
  }
  
  requestStateSync(targetUserId) {
    this.broadcast(MessageType.STATE_SYNC_REQUEST, {
      requesterId: this.userId,
      targetId: targetUserId
    });
  }
  
  sendJoinMessage() {
    this.broadcast(MessageType.JOIN, {
      userId: this.userId,
      userName: this.userName,
      color: this.color,
      timestamp: Date.now()
    });
  }
  
  broadcast(type, payload) {
    const message = {
      type,
      payload,
      senderId: this.userId,
      senderName: this.userName,
      timestamp: Date.now()
    };
    
    this.channel.postMessage(message);
  }
  
  broadcastToStorage(type, payload) {
    const key = `whiteboard_${type}_${Date.now()}`;
    const data = {
      type: type,
      payload,
      senderId: this.userId,
      timestamp: Date.now()
    };
    
    try {
      localStorage.setItem(key, JSON.stringify(data));
      setTimeout(() => {
        localStorage.removeItem(key);
      }, 1000);
    } catch (e) {
      console.error('Storage broadcast failed:', e);
    }
  }
  
  broadcastUsersList() {
    const users = this.getUsersFromStorage();
    const currentUser = {
      userId: this.userId,
      userName: this.userName,
      color: this.color,
      lastActive: Date.now()
    };
    
    const existingIndex = users.findIndex(u => u.userId === this.userId);
    if (existingIndex >= 0) {
      users[existingIndex] = currentUser;
    } else {
      users.push(currentUser);
    }
    
    users = users.filter(u => Date.now() - u.lastActive < 60000);
    
    this.saveUsersToStorage(users);
    
    this.broadcast(MessageType.USERS_LIST, { users });
    this.broadcastToStorage('users_update', { users });
  }
  
  getUsersFromStorage() {
    try {
      const data = localStorage.getItem(`whiteboard_users_${this.roomId}`);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      return [];
    }
  }
  
  saveUsersToStorage(users) {
    try {
      localStorage.setItem(`whiteboard_users_${this.roomId}`, JSON.stringify(users));
    } catch (e) {
    }
  }
  
  loadExistingState() {
    try {
      const actionsData = localStorage.getItem(`whiteboard_actions_${this.roomId}`);
      if (actionsData) {
        const actions = JSON.parse(actionsData);
        if (this.onActionReceived && actions.length > 0) {
          this.onActionReceived({
            actionType: 'load_history',
            actions: actions
          });
        }
      }
    } catch (e) {
    }
  }
  
  saveActionToHistory(action) {
    try {
      const key = `whiteboard_actions_${this.roomId}`;
      let actions = [];
      const existingData = localStorage.getItem(key);
      if (existingData) {
        actions = JSON.parse(existingData);
      }
      
      actions.push({
        ...action,
        savedAt: Date.now()
      });
      
      if (actions.length > 100) {
        actions = actions.slice(-100);
      }
      
      localStorage.setItem(key, JSON.stringify(actions));
    } catch (e) {
    }
  }
  
  broadcastAction(action) {
    this.broadcast(MessageType.ACTION, action);
    this.broadcastToStorage('action_update', action);
    this.saveActionToHistory(action);
  }
  
  sendAction(action) {
    this.lastActionId = action.id;
    this.broadcastAction(action);
  }
  
  sendUndo(actionId, undoData) {
    this.broadcast(MessageType.UNDO, {
      actionId,
      undoData,
      userId: this.userId
    });
  }
  
  sendRedo(actionId, redoData) {
    this.broadcast(MessageType.REDO, {
      actionId,
      redoData,
      userId: this.userId
    });
  }
  
  disconnect() {
    if (this.channel) {
      this.broadcast(MessageType.LEAVE, {
        userId: this.userId,
        userName: this.userName
      });
      
      this.channel.close();
      this.channel = null;
    }
    
    const users = this.getUsersFromStorage().filter(u => u.userId !== this.userId);
    this.saveUsersToStorage(users);
    
    this.isInitialized = false;
  }
  
  getUserId() {
    return this.userId;
  }
  
  getUserName() {
    return this.userName;
  }
  
  getColor() {
    return this.color;
  }
  
  isConnected() {
    return this.isInitialized;
  }
}

const collaborationService = new CollaborationService();
export default collaborationService;
