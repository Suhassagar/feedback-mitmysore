import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * High-performance hook for 60fps free-floating draggable UI widgets
 * Supports desktop mouse, trackpad, and mobile touch gestures with bounds clamping,
 * click vs drag disambiguation, persistent localStorage memory, and idle ghost mode.
 */
export default function useDraggableWidget({
  storageKey = 'sagar_copilot_coords',
  elementSize = 58,
  margin = 16,
  idleTimeoutMs = 5000,
  isWindowOpen = false
} = {}) {
  const [position, setPosition] = useState(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (typeof parsed.x === 'number' && typeof parsed.y === 'number') {
          return parsed;
        }
      }
    } catch {
      // Fallback
    }
    // Default: bottom-right with standard margins
    const defaultX = typeof window !== 'undefined' ? Math.max(margin, window.innerWidth - elementSize - 28) : 500;
    const defaultY = typeof window !== 'undefined' ? Math.max(margin, window.innerHeight - elementSize - 32) : 500;
    return { x: defaultX, y: defaultY };
  });

  const [isDragging, setIsDragging] = useState(false);
  const [isGhosted, setIsGhosted] = useState(false);

  const dragRef = useRef({
    startX: 0,
    startY: 0,
    initialX: 0,
    initialY: 0,
    hasMoved: false,
    pointerId: null
  });

  const idleTimerRef = useRef(null);

  // Clamp helper
  const clamp = useCallback((x, y) => {
    const maxX = Math.max(margin, window.innerWidth - elementSize - margin);
    const maxY = Math.max(margin, window.innerHeight - elementSize - margin);
    return {
      x: Math.max(margin, Math.min(x, maxX)),
      y: Math.max(margin, Math.min(y, maxY))
    };
  }, [elementSize, margin]);

  // Reset idle timer
  const resetIdleTimer = useCallback(() => {
    setIsGhosted(false);
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    if (!isWindowOpen) {
      idleTimerRef.current = setTimeout(() => {
        setIsGhosted(true);
      }, idleTimeoutMs);
    }
  }, [idleTimeoutMs, isWindowOpen]);

  // Window resize handler: ensure icon is never outside visible viewport
  useEffect(() => {
    const handleResize = () => {
      setPosition(prev => {
        const clamped = clamp(prev.x, prev.y);
        if (clamped.x !== prev.x || clamped.y !== prev.y) {
          try {
            localStorage.setItem(storageKey, JSON.stringify(clamped));
          } catch {
            // Ignore
          }
          return clamped;
        }
        return prev;
      });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [clamp, storageKey]);

  // Manage idle ghosting
  useEffect(() => {
    if (isWindowOpen) {
      setIsGhosted(false);
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    } else {
      resetIdleTimer();
    }
    return () => {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    };
  }, [isWindowOpen, resetIdleTimer]);

  // Reset position to default bottom-right
  const resetToDefault = useCallback(() => {
    const defaultX = Math.max(margin, window.innerWidth - elementSize - 28);
    const defaultY = Math.max(margin, window.innerHeight - elementSize - 32);
    const pos = { x: defaultX, y: defaultY };
    setPosition(pos);
    try {
      localStorage.setItem(storageKey, JSON.stringify(pos));
    } catch {
      // Ignore
    }
  }, [elementSize, margin, storageKey]);

  // Pointer Down handler
  const handlePointerDown = (e) => {
    // Only primary mouse button or touch
    if (e.button !== undefined && e.button !== 0) return;

    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initialX: position.x,
      initialY: position.y,
      hasMoved: false,
      pointerId: e.pointerId
    };

    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // Ignore
    }

    setIsDragging(true);
    resetIdleTimer();
  };

  // Pointer Move handler
  const handlePointerMove = (e) => {
    if (!isDragging || dragRef.current.pointerId !== e.pointerId) return;

    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;

    // Movement threshold for drag vs click disambiguation (5px)
    if (!dragRef.current.hasMoved && Math.hypot(dx, dy) >= 5) {
      dragRef.current.hasMoved = true;
    }

    if (dragRef.current.hasMoved) {
      const rawX = dragRef.current.initialX + dx;
      const rawY = dragRef.current.initialY + dy;
      const clamped = clamp(rawX, rawY);
      setPosition(clamped);
    }
  };

  // Pointer Up handler
  const handlePointerUp = (e, onClickCallback) => {
    if (!isDragging || dragRef.current.pointerId !== e.pointerId) return;

    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // Ignore
    }

    setIsDragging(false);

    if (dragRef.current.hasMoved) {
      // It was a drag: persist final position
      try {
        localStorage.setItem(storageKey, JSON.stringify(position));
      } catch {
        // Ignore
      }
    } else {
      // It was a click: trigger toggle
      if (typeof onClickCallback === 'function') {
        onClickCallback();
      }
    }

    resetIdleTimer();
  };

  return {
    position,
    setPosition,
    isDragging,
    isGhosted,
    resetToDefault,
    resetIdleTimer,
    dragProps: {
      onPointerDown: handlePointerDown,
      onPointerMove: handlePointerMove,
      onPointerUp: handlePointerUp,
      onPointerCancel: (e) => handlePointerUp(e, null)
    }
  };
}
