export const ToolType = {
  SELECT: 'select',
  LINE: 'line',
  RECTANGLE: 'rectangle',
  TEXT: 'text',
  ERASER: 'eraser'
};

export const ActionType = {
  DRAW: 'draw',
  MOVE: 'move',
  DELETE: 'delete',
  CLEAR: 'clear'
};

export const MessageType = {
  JOIN: 'join',
  LEAVE: 'leave',
  ACTION: 'action',
  UNDO: 'undo',
  REDO: 'redo',
  SYNC: 'sync',
  USERS_LIST: 'users_list',
  STATE_SYNC: 'state_sync',
  STATE_SYNC_REQUEST: 'state_sync_request',
  PING: 'ping',
  PONG: 'pong'
};
