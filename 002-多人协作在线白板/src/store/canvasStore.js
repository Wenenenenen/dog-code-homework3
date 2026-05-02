import { create } from 'zustand';
import { ToolType, ActionType } from '../types';
import { generateId } from '../utils';
import collaborationService from '../services/collaborationService';

const MAX_HISTORY = 100;

const useCanvasStore = create((set, get) => ({
  elements: [],
  selectedTool: ToolType.LINE,
  strokeColor: '#FF6B6B',
  strokeWidth: 3,
  fillColor: '#FF6B6B33',
  fontSize: 18,
  
  history: [],
  historyIndex: -1,
  
  pendingRemoteActions: new Set(),
  
  viewScale: 1,
  viewOffsetX: 0,
  viewOffsetY: 0,
  isPanning: false,
  panStartX: 0,
  panStartY: 0,
  
  isDrawing: false,
  currentElement: null,
  startX: 0,
  startY: 0,
  
  selectedElementId: null,
  isDragging: false,
  dragOffsetX: 0,
  dragOffsetY: 0,
  draggedElementPreviousState: null,
  
  setSelectedTool: (tool) => set({ selectedTool: tool }),
  setStrokeColor: (color) => set({ strokeColor: color }),
  setStrokeWidth: (width) => set({ strokeWidth: width }),
  setFillColor: (color) => set({ fillColor: color }),
  setFontSize: (size) => set({ fontSize: size }),
  
  setViewScale: (scale) => set({ viewScale: scale }),
  setViewOffset: (x, y) => set({ viewOffsetX: x, viewOffsetY: y }),
  
  setIsPanning: (isPanning) => set({ isPanning }),
  setPanStart: (x, y) => set({ panStartX: x, panStartY: y }),
  
  panView: (clientX, clientY) => {
    const { panStartX, panStartY, viewOffsetX, viewOffsetY } = get();
    const dx = clientX - panStartX;
    const dy = clientY - panStartY;
    
    set({
      viewOffsetX: viewOffsetX + dx,
      viewOffsetY: viewOffsetY + dy,
      panStartX: clientX,
      panStartY: clientY
    });
  },
  
  zoomView: (delta, centerX, centerY) => {
    const { viewScale, viewOffsetX, viewOffsetY } = get();
    const scaleFactor = delta > 0 ? 1.1 : 0.9;
    const newScale = Math.max(0.1, Math.min(5, viewScale * scaleFactor));
    
    const worldX = (centerX - viewOffsetX) / viewScale;
    const worldY = (centerY - viewOffsetY) / viewScale;
    
    const newOffsetX = centerX - worldX * newScale;
    const newOffsetY = centerY - worldY * newScale;
    
    set({
      viewScale: newScale,
      viewOffsetX: newOffsetX,
      viewOffsetY: newOffsetY
    });
  },
  
  startDrawing: (x, y, userId) => {
    const { selectedTool, strokeColor, strokeWidth, fillColor, fontSize, elements } = get();
    const worldX = (x - get().viewOffsetX) / get().viewScale;
    const worldY = (y - get().viewOffsetY) / get().viewScale;
    
    let newElement = null;
    
    switch (selectedTool) {
      case ToolType.LINE:
        newElement = {
          id: generateId(),
          type: 'line',
          points: [{ x: worldX, y: worldY }],
          strokeColor,
          strokeWidth,
          userId
        };
        break;
        
      case ToolType.RECTANGLE:
        newElement = {
          id: generateId(),
          type: 'rectangle',
          x: worldX,
          y: worldY,
          width: 0,
          height: 0,
          strokeColor,
          strokeWidth,
          fillColor,
          userId
        };
        break;
        
      case ToolType.TEXT:
        newElement = {
          id: generateId(),
          type: 'text',
          x: worldX,
          y: worldY,
          text: '',
          fontSize,
          fontFamily: 'Arial, sans-serif',
          fillColor: strokeColor,
          userId
        };
        break;
        
      case ToolType.ERASER:
        const elementsToRemove = elements.filter(elem => {
          if (elem.type === 'rectangle') {
            return worldX >= elem.x && worldX <= elem.x + elem.width &&
                   worldY >= elem.y && worldY <= elem.y + elem.height;
          } else if (elem.type === 'text') {
            const textWidth = elem.text.length * elem.fontSize * 0.6;
            return worldX >= elem.x && worldX <= elem.x + textWidth &&
                   worldY >= elem.y - elem.fontSize && worldY <= elem.y;
          } else if (elem.type === 'line') {
            for (let i = 0; i < elem.points.length - 1; i++) {
              const p1 = elem.points[i];
              const p2 = elem.points[i + 1];
              const dist = pointToLineDistance(worldX, worldY, p1.x, p1.y, p2.x, p2.y);
              if (dist < strokeWidth * 2) return true;
            }
          }
          return false;
        });
        
        if (elementsToRemove.length > 0) {
          const deleteAction = {
            id: generateId(),
            userId,
            actionType: ActionType.DELETE,
            toolType: ToolType.ERASER,
            elements: elementsToRemove,
            timestamp: Date.now()
          };
          
          set({
            elements: elements.filter(elem => !elementsToRemove.find(e => e.id === elem.id))
          });
          
          get().addToHistory(deleteAction, true);
          collaborationService.sendAction(deleteAction);
        }
        return;
        
      case ToolType.SELECT:
        const clickedElement = [...elements].reverse().find(elem => {
          if (elem.type === 'rectangle') {
            return worldX >= elem.x && worldX <= elem.x + elem.width &&
                   worldY >= elem.y && worldY <= elem.y + elem.height;
          } else if (elem.type === 'text') {
            const textWidth = elem.text.length * elem.fontSize * 0.6;
            return worldX >= elem.x && worldX <= elem.x + textWidth &&
                   worldY >= elem.y - elem.fontSize && worldY <= elem.y;
          }
          return false;
        });
        
        if (clickedElement) {
          set({
            selectedElementId: clickedElement.id,
            isDragging: true,
            dragOffsetX: worldX - (clickedElement.x || clickedElement.points[0].x),
            dragOffsetY: worldY - (clickedElement.y || clickedElement.points[0].y),
            draggedElementPreviousState: JSON.parse(JSON.stringify(clickedElement))
          });
        } else {
          set({ selectedElementId: null });
        }
        return;
    }
    
    if (newElement) {
      set({
        isDrawing: true,
        currentElement: newElement,
        startX: worldX,
        startY: worldY
      });
    }
  },
  
  updateDrawing: (x, y) => {
    const { isDrawing, currentElement, startX, startY, selectedTool, isDragging, selectedElementId, elements, dragOffsetX, dragOffsetY } = get();
    const worldX = (x - get().viewOffsetX) / get().viewScale;
    const worldY = (y - get().viewOffsetY) / get().viewScale;
    
    if (isDragging && selectedElementId) {
      const element = elements.find(e => e.id === selectedElementId);
      if (element) {
        const newX = worldX - dragOffsetX;
        const newY = worldY - dragOffsetY;
        let updatedElement;
        
        if (element.type === 'line') {
          const dx = newX - element.points[0].x;
          const dy = newY - element.points[0].y;
          updatedElement = {
            ...element,
            points: element.points.map(p => ({
              x: p.x + dx,
              y: p.y + dy
            }))
          };
        } else {
          updatedElement = {
            ...element,
            x: newX,
            y: newY
          };
        }
        
        set({
          elements: elements.map(e => e.id === selectedElementId ? updatedElement : e)
        });
      }
      return;
    }
    
    if (!isDrawing || !currentElement) return;
    
    let updatedElement = null;
    
    switch (selectedTool) {
      case ToolType.LINE:
        updatedElement = {
          ...currentElement,
          points: [...currentElement.points, { x: worldX, y: worldY }]
        };
        break;
        
      case ToolType.RECTANGLE:
        updatedElement = {
          ...currentElement,
          width: Math.abs(worldX - startX),
          height: Math.abs(worldY - startY),
          x: Math.min(startX, worldX),
          y: Math.min(startY, worldY)
        };
        break;
        
      case ToolType.TEXT:
        updatedElement = {
          ...currentElement,
          x: worldX,
          y: worldY
        };
        break;
    }
    
    if (updatedElement) {
      set({ currentElement: updatedElement });
    }
  },
  
  finishDrawing: (text = null) => {
    const { isDrawing, currentElement, selectedTool, isDragging, selectedElementId, elements, draggedElementPreviousState } = get();
    
    if (isDragging && selectedElementId) {
      const movedElement = elements.find(e => e.id === selectedElementId);
      if (movedElement && draggedElementPreviousState) {
        const moveAction = {
          id: generateId(),
          userId: movedElement.userId,
          actionType: ActionType.MOVE,
          toolType: ToolType.SELECT,
          element: movedElement,
          previousState: draggedElementPreviousState,
          timestamp: Date.now()
        };
        
        get().addToHistory(moveAction, true);
        collaborationService.sendAction(moveAction);
      }
      
      set({ isDragging: false, dragOffsetX: 0, dragOffsetY: 0, draggedElementPreviousState: null });
      return;
    }
    
    if (!isDrawing || !currentElement) return;
    
    let finalElement = currentElement;
    
    if (selectedTool === ToolType.TEXT && text) {
      finalElement = { ...currentElement, text };
    }
    
    if (selectedTool === ToolType.TEXT && !text) {
      set({ isDrawing: false, currentElement: null });
      return;
    }
    
    const drawAction = {
      id: generateId(),
      userId: finalElement.userId,
      actionType: ActionType.DRAW,
      toolType: selectedTool,
      element: finalElement,
      timestamp: Date.now()
    };
    
    set((state) => ({
      elements: [...state.elements, finalElement],
      isDrawing: false,
      currentElement: null
    }));
    
    get().addToHistory(drawAction, true);
    collaborationService.sendAction(drawAction);
  },
  
  cancelDrawing: () => {
    set({ isDrawing: false, currentElement: null, isDragging: false, dragOffsetX: 0, dragOffsetY: 0, draggedElementPreviousState: null });
  },
  
  getElementById: (elementId) => {
    const { elements } = get();
    return elements.find(e => e.id === elementId);
  },
  
  addToHistory: (action, isLocal = false) => {
    set((state) => {
      const newHistory = state.history.slice(0, state.historyIndex + 1);
      newHistory.push({
        ...action,
        isLocal
      });
      
      if (newHistory.length > MAX_HISTORY) {
        newHistory.shift();
      }
      
      return {
        history: newHistory,
        historyIndex: newHistory.length - 1
      };
    });
  },
  
  handleRemoteAction: (action) => {
    const { pendingRemoteActions } = get();
    
    if (pendingRemoteActions.has(action.id)) {
      pendingRemoteActions.delete(action.id);
      return;
    }
    
    const { elements, history, historyIndex } = get();
    let newElements = [...elements];
    let newHistory = [...history];
    
    if (action.actionType === 'load_history' && action.actions) {
      const latestActions = {};
      action.actions.forEach(a => {
        if (!latestActions[a.id] || a.savedAt > latestActions[a.id].savedAt) {
          latestActions[a.id] = a;
        }
      });
      
      const sortedActions = Object.values(latestActions).sort((a, b) => a.timestamp - b.timestamp);
      
      sortedActions.forEach(a => {
        if (a.actionType === ActionType.DRAW) {
          const exists = newElements.find(e => e.id === a.element.id);
          if (!exists) {
            newElements.push(a.element);
          }
        } else if (a.actionType === ActionType.DELETE) {
          newElements = newElements.filter(elem => 
            !a.elements.find(e => e.id === elem.id)
          );
        } else if (a.actionType === ActionType.MOVE) {
          const index = newElements.findIndex(e => e.id === a.element.id);
          if (index >= 0) {
            newElements[index] = a.element;
          }
        } else if (a.actionType === ActionType.CLEAR) {
          newElements = [];
        }
      });
      
      set({ elements: newElements });
      return;
    }
    
    if (action.actionType === 'state_sync') {
      return;
    }
    
    if (action.actionType === 'remote_undo') {
      const targetAction = history.find(h => h.id === action.actionId);
      if (targetAction) {
        const undoResult = get().applyUndo(targetAction, false);
        set({ elements: undoResult.elements });
      }
      return;
    }
    
    if (action.actionType === 'remote_redo') {
      const targetAction = history.find(h => h.id === action.actionId);
      if (targetAction) {
        const redoResult = get().applyRedo(targetAction, false);
        set({ elements: redoResult.elements });
      }
      return;
    }
    
    switch (action.actionType) {
      case ActionType.DRAW:
        const exists = newElements.find(e => e.id === action.element.id);
        if (!exists) {
          newElements = [...newElements, action.element];
          newHistory = [...newHistory, { ...action, isLocal: false }];
        }
        break;
        
      case ActionType.DELETE:
        newElements = newElements.filter(elem => 
          !action.elements.find(e => e.id === elem.id)
        );
        newHistory = [...newHistory, { ...action, isLocal: false }];
        break;
        
      case ActionType.MOVE:
        const moveIndex = newElements.findIndex(e => e.id === action.element.id);
        if (moveIndex >= 0) {
          newElements[moveIndex] = action.element;
          newHistory = [...newHistory, { ...action, isLocal: false }];
        }
        break;
        
      case ActionType.CLEAR:
        newElements = [];
        newHistory = [...newHistory, { ...action, isLocal: false }];
        break;
    }
    
    set({
      elements: newElements,
      history: newHistory,
      historyIndex: newHistory.length - 1
    });
  },
  
  applyUndo: (action, shouldBroadcast = true) => {
    const { elements } = get();
    let newElements = [...elements];
    
    switch (action.actionType) {
      case ActionType.DRAW:
        newElements = elements.filter(elem => elem.id !== action.element.id);
        break;
        
      case ActionType.DELETE:
        newElements = [...elements, ...action.elements];
        break;
        
      case ActionType.MOVE:
        if (action.previousState) {
          const index = newElements.findIndex(e => e.id === action.element.id);
          if (index >= 0) {
            newElements[index] = action.previousState;
          }
        }
        break;
        
      case ActionType.CLEAR:
        newElements = [...action.elements];
        break;
    }
    
    if (shouldBroadcast) {
      collaborationService.sendUndo(action.id, { action });
    }
    
    return { elements: newElements };
  },
  
  applyRedo: (action, shouldBroadcast = true) => {
    const { elements } = get();
    let newElements = [...elements];
    
    switch (action.actionType) {
      case ActionType.DRAW:
        newElements = [...elements, action.element];
        break;
        
      case ActionType.DELETE:
        newElements = elements.filter(elem => 
          !action.elements.find(e => e.id === elem.id)
        );
        break;
        
      case ActionType.MOVE:
        const index = newElements.findIndex(e => e.id === action.element.id);
        if (index >= 0) {
          newElements[index] = action.element;
        }
        break;
        
      case ActionType.CLEAR:
        newElements = [];
        break;
    }
    
    if (shouldBroadcast) {
      collaborationService.sendRedo(action.id, { action });
    }
    
    return { elements: newElements };
  },
  
  canUndo: () => {
    const { historyIndex, history } = get();
    if (historyIndex < 0) return false;
    
    for (let i = historyIndex; i >= 0; i--) {
      if (history[i].isLocal) {
        return true;
      }
    }
    return false;
  },
  
  canRedo: () => {
    const { historyIndex, history } = get();
    if (historyIndex >= history.length - 1) return false;
    
    for (let i = historyIndex + 1; i < history.length; i++) {
      if (history[i].isLocal) {
        return true;
      }
    }
    return false;
  },
  
  undo: () => {
    const { historyIndex, history } = get();
    if (!get().canUndo()) return;
    
    let targetIndex = -1;
    for (let i = historyIndex; i >= 0; i--) {
      if (history[i].isLocal) {
        targetIndex = i;
        break;
      }
    }
    
    if (targetIndex < 0) return;
    
    const action = history[targetIndex];
    const pendingRemoteActions = new Set(get().pendingRemoteActions);
    pendingRemoteActions.add(action.id);
    set({ pendingRemoteActions });
    
    const undoResult = get().applyUndo(action, true);
    set({ elements: undoResult.elements, historyIndex: targetIndex - 1 });
  },
  
  redo: () => {
    const { historyIndex, history } = get();
    if (!get().canRedo()) return;
    
    let targetIndex = -1;
    for (let i = historyIndex + 1; i < history.length; i++) {
      if (history[i].isLocal) {
        targetIndex = i;
        break;
      }
    }
    
    if (targetIndex < 0) return;
    
    const action = history[targetIndex];
    const pendingRemoteActions = new Set(get().pendingRemoteActions);
    pendingRemoteActions.add(action.id);
    set({ pendingRemoteActions });
    
    const redoResult = get().applyRedo(action, true);
    set({ elements: redoResult.elements, historyIndex: targetIndex });
  },
  
  clearCanvas: (userId) => {
    const { elements } = get();
    if (elements.length === 0) return;
    
    const clearAction = {
      id: generateId(),
      userId,
      actionType: ActionType.CLEAR,
      toolType: ToolType.ERASER,
      elements: [...elements],
      timestamp: Date.now()
    };
    
    set({ elements: [] });
    get().addToHistory(clearAction, true);
    collaborationService.sendAction(clearAction);
  },
  
  resetView: () => {
    set({
      viewScale: 1,
      viewOffsetX: 0,
      viewOffsetY: 0
    });
  },
  
  initCollaborationHandlers: () => {
    collaborationService.onActionReceived = (action) => {
      get().handleRemoteAction(action);
    };
  },
  
  clearAll: () => {
    set({
      elements: [],
      history: [],
      historyIndex: -1,
      selectedElementId: null,
      isDragging: false,
      isDrawing: false,
      currentElement: null,
      draggedElementPreviousState: null
    });
  }
}));

function pointToLineDistance(px, py, x1, y1, x2, y2) {
  const A = px - x1;
  const B = py - y1;
  const C = x2 - x1;
  const D = y2 - y1;
  
  const dot = A * C + B * D;
  const lenSq = C * C + D * D;
  let param = -1;
  
  if (lenSq !== 0) param = dot / lenSq;
  
  let xx, yy;
  
  if (param < 0) {
    xx = x1;
    yy = y1;
  } else if (param > 1) {
    xx = x2;
    yy = y2;
  } else {
    xx = x1 + param * C;
    yy = y1 + param * D;
  }
  
  const dx = px - xx;
  const dy = py - yy;
  return Math.sqrt(dx * dx + dy * dy);
}

export default useCanvasStore;
