import { create } from 'zustand';
import collaborationService from '../services/collaborationService';
import { MessageType } from '../types';

const useUserStore = create((set, get) => ({
  localUser: null,
  users: [],
  isConnected: false,
  
  setIsConnected: (isConnected) => set({ isConnected }),
  
  setLocalUser: (user) => {
    set({ localUser: user });
  },
  
  addUser: (user) => set((state) => {
    const existingUser = state.users.find(u => u.userId === user.userId);
    if (existingUser) {
      return {
        users: state.users.map(u => 
          u.userId === user.userId ? { ...u, ...user } : u
        )
      };
    }
    return {
      users: [...state.users, user]
    };
  }),
  
  removeUser: (userId) => set((state) => ({
    users: state.users.filter(u => u.userId !== userId)
  })),
  
  updateUser: (userId, updates) => set((state) => ({
    users: state.users.map(u => 
      u.userId === userId ? { ...u, ...updates } : u
    )
  })),
  
  getColorByUserId: (userId) => {
    const { localUser, users } = get();
    if (localUser && localUser.userId === userId) {
      return localUser.color;
    }
    const user = users.find(u => u.userId === userId);
    return user ? user.color : '#000000';
  },
  
  initCollaboration: (userName, color) => {
    const user = {
      userId: collaborationService.getUserId() || 'temp',
      userName: userName,
      color: color
    };
    
    set({ localUser: user });
    
    collaborationService.onUserJoined = (joinedUser) => {
      if (joinedUser.userId !== collaborationService.getUserId()) {
        get().addUser(joinedUser);
      }
    };
    
    collaborationService.onUserLeft = (leftUser) => {
      get().removeUser(leftUser.userId);
    };
    
    collaborationService.onUsersListUpdated = (users) => {
      const localUserId = collaborationService.getUserId();
      const otherUsers = users.filter(u => u.userId !== localUserId);
      set({ users: otherUsers });
    };
    
    collaborationService.initialize(userName, color);
    
    const actualUserId = collaborationService.getUserId();
    set({
      localUser: {
        userId: actualUserId,
        userName: userName,
        color: color
      },
      isConnected: true
    });
  },
  
  disconnect: () => {
    collaborationService.disconnect();
    set({ localUser: null, users: [], isConnected: false });
  },
  
  getCollaborationService: () => collaborationService
}));

export default useUserStore;
