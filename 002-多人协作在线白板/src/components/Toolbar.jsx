import React, { useState } from 'react';
import useCanvasStore from '../store/canvasStore';
import useUserStore from '../store/userStore';
import { ToolType } from '../types';

const Toolbar = () => {
  const canvasStore = useCanvasStore();
  const {
    selectedTool,
    strokeColor,
    strokeWidth,
    fillColor,
    fontSize,
    setSelectedTool,
    setStrokeColor,
    setStrokeWidth,
    setFillColor,
    setFontSize,
    undo,
    redo,
    clearCanvas,
    resetView,
    viewScale
  } = canvasStore;
  
  const { localUser } = useUserStore();
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showStrokeWidth, setShowStrokeWidth] = useState(false);
  const [showFontSize, setShowFontSize] = useState(false);
  
  const colors = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4',
    '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F',
    '#BB8FCE', '#85C1E9', '#000000', '#FFFFFF'
  ];
  
  const strokeWidths = [1, 2, 3, 4, 5, 8, 10];
  const fontSizes = [12, 14, 16, 18, 20, 24, 28, 32, 36, 48];
  
  const tools = [
    { type: ToolType.SELECT, icon: '✋', label: '选择' },
    { type: ToolType.LINE, icon: '✏️', label: '画笔' },
    { type: ToolType.RECTANGLE, icon: '⬜', label: '矩形' },
    { type: ToolType.TEXT, icon: 'T', label: '文本' },
    { type: ToolType.ERASER, icon: '🧹', label: '橡皮擦' }
  ];
  
  const handleClearCanvas = () => {
    if (window.confirm('确定要清空画布吗？')) {
      clearCanvas(localUser?.userId);
    }
  };
  
  return (
    <div className="toolbar">
      <div className="toolbar-section">
        <span className="toolbar-label">工具</span>
        <div className="tool-buttons">
          {tools.map((tool) => (
            <button
              key={tool.type}
              className={`tool-btn ${selectedTool === tool.type ? 'active' : ''}`}
              onClick={() => setSelectedTool(tool.type)}
              title={tool.label}
            >
              {tool.icon}
            </button>
          ))}
        </div>
      </div>
      
      <div className="toolbar-divider"></div>
      
      <div className="toolbar-section">
        <span className="toolbar-label">操作</span>
        <div className="action-buttons">
          <button
            className={`action-btn ${!canvasStore.canUndo() ? 'disabled' : ''}`}
            onClick={undo}
            disabled={!canvasStore.canUndo()}
            title="撤销 (Ctrl+Z)"
          >
            ↩️
          </button>
          <button
            className={`action-btn ${!canvasStore.canRedo() ? 'disabled' : ''}`}
            onClick={redo}
            disabled={!canvasStore.canRedo()}
            title="重做 (Ctrl+Y)"
          >
            ↪️
          </button>
          <button
            className="action-btn"
            onClick={handleClearCanvas}
            title="清空画布"
          >
            🗑️
          </button>
        </div>
      </div>
      
      <div className="toolbar-divider"></div>
      
      <div className="toolbar-section">
        <span className="toolbar-label">颜色</span>
        <div className="color-picker-wrapper">
          <button
            className="color-btn"
            style={{ backgroundColor: strokeColor }}
            onClick={() => setShowColorPicker(!showColorPicker)}
            title="选择颜色"
          ></button>
          {showColorPicker && (
            <div className="color-picker-dropdown">
              <div className="color-grid">
                {colors.map((color) => (
                  <button
                    key={color}
                    className={`color-option ${strokeColor === color ? 'active' : ''}`}
                    style={{ backgroundColor: color }}
                    onClick={() => {
                      setStrokeColor(color);
                      setFillColor(`${color}33`);
                      setShowColorPicker(false);
                    }}
                  ></button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
      
      <div className="toolbar-divider"></div>
      
      <div className="toolbar-section">
        <span className="toolbar-label">线宽</span>
        <div className="stroke-width-wrapper">
          <button
            className="stroke-width-btn"
            onClick={() => setShowStrokeWidth(!showStrokeWidth)}
            title="选择线宽"
          >
            <div
              className="stroke-preview"
              style={{
                width: strokeWidth * 3,
                height: strokeWidth * 3,
                backgroundColor: strokeColor
              }}
            ></div>
            <span>{strokeWidth}px</span>
          </button>
          {showStrokeWidth && (
            <div className="stroke-width-dropdown">
              {strokeWidths.map((width) => (
                <button
                  key={width}
                  className={`stroke-option ${strokeWidth === width ? 'active' : ''}`}
                  onClick={() => {
                    setStrokeWidth(width);
                    setShowStrokeWidth(false);
                  }}
                >
                  <div
                    className="stroke-dot"
                    style={{
                      width: width * 2,
                      height: width * 2
                    }}
                  ></div>
                  <span>{width}px</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
      
      <div className="toolbar-divider"></div>
      
      <div className="toolbar-section">
        <span className="toolbar-label">字号</span>
        <div className="font-size-wrapper">
          <button
            className="font-size-btn"
            onClick={() => setShowFontSize(!showFontSize)}
            title="选择字号"
          >
            <span>{fontSize}px</span>
          </button>
          {showFontSize && (
            <div className="font-size-dropdown">
              {fontSizes.map((size) => (
                <button
                  key={size}
                  className={`font-option ${fontSize === size ? 'active' : ''}`}
                  onClick={() => {
                    setFontSize(size);
                    setShowFontSize(false);
                  }}
                  style={{ fontSize: `${size}px` }}
                >
                  {size}px
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
      
      <div className="toolbar-divider"></div>
      
      <div className="toolbar-section">
        <span className="toolbar-label">视图</span>
        <div className="view-controls">
          <button
            className="view-btn"
            onClick={resetView}
            title="重置视图"
          >
            🏠
          </button>
          <span className="zoom-display">{Math.round(viewScale * 100)}%</span>
        </div>
      </div>
      
      <div className="toolbar-tips">
        <span className="tip-text">💡 按住 Alt + 鼠标左键拖拽可平移画布</span>
        <span className="tip-text">💡 鼠标滚轮可缩放视图</span>
      </div>
    </div>
  );
};

export default Toolbar;
