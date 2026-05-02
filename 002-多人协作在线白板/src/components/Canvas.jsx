import React, { useRef, useEffect, useState } from 'react';
import useCanvasStore from '../store/canvasStore';
import useUserStore from '../store/userStore';
import { ToolType } from '../types';

const Canvas = () => {
  const canvasRef = useRef(null);
  const [textInput, setTextInput] = useState('');
  const [showTextInput, setShowTextInput] = useState(false);
  const [textInputPosition, setTextInputPosition] = useState({ x: 0, y: 0 });
  
  const { 
    elements,
    currentElement,
    selectedTool,
    isDrawing,
    isPanning,
    viewScale,
    viewOffsetX,
    viewOffsetY,
    startDrawing,
    updateDrawing,
    finishDrawing,
    cancelDrawing,
    setIsPanning,
    setPanStart,
    panView,
    zoomView,
    selectedElementId
  } = useCanvasStore();
  
  const { localUser } = useUserStore();
  
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const container = canvas.parentElement;
    
    const resizeCanvas = () => {
      canvas.width = container.clientWidth;
      canvas.height = container.clientHeight;
      render();
    };
    
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    
    return () => {
      window.removeEventListener('resize', resizeCanvas);
    };
  }, [elements, currentElement, viewScale, viewOffsetX, viewOffsetY, selectedElementId]);
  
  useEffect(() => {
    render();
  }, [elements, currentElement, viewScale, viewOffsetX, viewOffsetY, selectedElementId]);
  
  const render = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    ctx.save();
    ctx.fillStyle = '#f5f5f5';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    drawGrid(ctx, canvas.width, canvas.height);
    
    ctx.translate(viewOffsetX, viewOffsetY);
    ctx.scale(viewScale, viewScale);
    
    elements.forEach(element => {
      drawElement(ctx, element, element.id === selectedElementId);
    });
    
    if (currentElement) {
      drawElement(ctx, currentElement, false);
    }
    
    ctx.restore();
  };
  
  const drawGrid = (ctx, width, height) => {
    const gridSize = 20;
    
    ctx.save();
    ctx.strokeStyle = '#e0e0e0';
    ctx.lineWidth = 0.5;
    
    const offsetX = viewOffsetX % gridSize;
    const offsetY = viewOffsetY % gridSize;
    
    for (let x = offsetX; x < width; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    
    for (let y = offsetY; y < height; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }
    
    ctx.restore();
  };
  
  const drawElement = (ctx, element, isSelected) => {
    ctx.save();
    
    switch (element.type) {
      case 'line':
        if (element.points && element.points.length > 1) {
          ctx.strokeStyle = element.strokeColor;
          ctx.lineWidth = element.strokeWidth;
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
          
          ctx.beginPath();
          ctx.moveTo(element.points[0].x, element.points[0].y);
          
          for (let i = 1; i < element.points.length; i++) {
            ctx.lineTo(element.points[i].x, element.points[i].y);
          }
          
          ctx.stroke();
        }
        break;
        
      case 'rectangle':
        if (element.fillColor && element.fillColor !== 'transparent') {
          ctx.fillStyle = element.fillColor;
          ctx.fillRect(element.x, element.y, element.width, element.height);
        }
        
        ctx.strokeStyle = element.strokeColor;
        ctx.lineWidth = element.strokeWidth;
        ctx.strokeRect(element.x, element.y, element.width, element.height);
        break;
        
      case 'text':
        if (element.text) {
          ctx.font = `${element.fontSize}px ${element.fontFamily}`;
          ctx.fillStyle = element.fillColor;
          ctx.fillText(element.text, element.x, element.y);
        }
        break;
    }
    
    if (isSelected && element.type !== 'line') {
      ctx.strokeStyle = '#0078d4';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      
      let x, y, w, h;
      
      if (element.type === 'rectangle') {
        x = element.x - 5;
        y = element.y - 5;
        w = element.width + 10;
        h = element.height + 10;
      } else if (element.type === 'text') {
        const textWidth = element.text.length * element.fontSize * 0.6;
        x = element.x - 5;
        y = element.y - element.fontSize - 5;
        w = textWidth + 10;
        h = element.fontSize + 10;
      }
      
      if (x !== undefined) {
        ctx.strokeRect(x, y, w, h);
      }
    }
    
    ctx.restore();
  };
  
  const getMousePos = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  };
  
  const handleMouseDown = (e) => {
    if (e.button === 1 || (e.button === 0 && e.altKey)) {
      setIsPanning(true);
      const pos = getMousePos(e);
      setPanStart(pos.x, pos.y);
      return;
    }
    
    if (selectedTool === ToolType.ERASER) {
      const pos = getMousePos(e);
      startDrawing(pos.x, pos.y, localUser?.userId);
      return;
    }
    
    if (selectedTool === ToolType.TEXT) {
      const pos = getMousePos(e);
      const worldX = (pos.x - viewOffsetX) / viewScale;
      const worldY = (pos.y - viewOffsetY) / viewScale;
      
      setTextInputPosition({ x: pos.x, y: pos.y });
      setShowTextInput(true);
      setTextInput('');
      
      startDrawing(pos.x, pos.y, localUser?.userId);
      return;
    }
    
    const pos = getMousePos(e);
    startDrawing(pos.x, pos.y, localUser?.userId);
  };
  
  const handleMouseMove = (e) => {
    if (isPanning) {
      const pos = getMousePos(e);
      panView(pos.x, pos.y);
      return;
    }
    
    if (isDrawing) {
      const pos = getMousePos(e);
      updateDrawing(pos.x, pos.y);
    }
  };
  
  const handleMouseUp = (e) => {
    if (isPanning) {
      setIsPanning(false);
      return;
    }
    
    if (isDrawing && selectedTool !== ToolType.TEXT) {
      finishDrawing();
    }
  };
  
  const handleMouseLeave = () => {
    if (isPanning) {
      setIsPanning(false);
    }
    if (isDrawing && selectedTool !== ToolType.TEXT) {
      cancelDrawing();
    }
  };
  
  const handleWheel = (e) => {
    if (!e || !e.deltaY) return;
    e.preventDefault();
    const pos = getMousePos(e);
    zoomView(e.deltaY, pos.x, pos.y);
  };
  
  const handleTextSubmit = () => {
    if (textInput.trim()) {
      finishDrawing(textInput.trim());
    } else {
      cancelDrawing();
    }
    setShowTextInput(false);
    setTextInput('');
  };
  
  const handleTextCancel = () => {
    cancelDrawing();
    setShowTextInput(false);
    setTextInput('');
  };
  
  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      handleTextCancel();
    }
  };
  
  return (
    <div className="canvas-container">
      <canvas
        ref={canvasRef}
        className="whiteboard-canvas"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        onWheel={handleWheel}
        style={{ cursor: isPanning ? 'grabbing' : selectedTool === ToolType.SELECT ? 'pointer' : 'crosshair' }}
      />
      
      {showTextInput && (
        <div
          className="text-input-overlay"
          style={{
            left: textInputPosition.x,
            top: textInputPosition.y
          }}
        >
          <input
            type="text"
            className="text-input"
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleTextSubmit();
              else if (e.key === 'Escape') handleTextCancel();
            }}
            placeholder="输入文本..."
            autoFocus
          />
          <div className="text-input-actions">
            <button className="text-input-btn confirm" onClick={handleTextSubmit}>
              确认
            </button>
            <button className="text-input-btn cancel" onClick={handleTextCancel}>
              取消
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Canvas;
