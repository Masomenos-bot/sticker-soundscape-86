import React, { useEffect, useRef, useState, useCallback } from "react";
import { Sticker } from "./StickerMusicApp";
import { RotateCw, Trash2, ChevronUp, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ResizableStickerProps {
  sticker: Sticker;
  onUpdate: (id: string, updates: Partial<Sticker>) => void;
  onRemove: (id: string) => void;
  onLayerChange: (id: string, direction: 'up' | 'down') => void;
  isPlaying: boolean;
  globalVolume: number;
  canvasRef: React.RefObject<HTMLDivElement>;
}

export const ResizableSticker = ({
  sticker,
  onUpdate,
  onRemove,
  onLayerChange,
  isPlaying,
  globalVolume,
  canvasRef,
}: ResizableStickerProps) => {
  const stickerRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [isRotating, setIsRotating] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [rotateStart, setRotateStart] = useState({ angle: 0, rotation: 0 });
  const [isGesturing, setIsGesturing] = useState(false);
  const [initialTouches, setInitialTouches] = useState<{ distance: number; angle: number; center: { x: number; y: number } } | null>(null);
  const [initialSticker, setInitialSticker] = useState<{ width: number; height: number; rotation: number; x: number; y: number } | null>(null);
  const [showTrashOverlay, setShowTrashOverlay] = useState(false);

  // Random animation selection for each sticker (based on ID for consistency)
  const stickerAnimation = React.useMemo(() => {
    const animations = [
      'animate-float-circular',
      'animate-float-circular-2', 
      'animate-float-circular-3',
      'animate-float-wobble',
      'animate-float-bounce'
    ];
    // Use sticker ID to ensure consistent animation
    const hash = sticker.id.split('').reduce((a, b) => {
      a = ((a << 5) - a) + b.charCodeAt(0);
      return a & a;
    }, 0);
    return animations[Math.abs(hash) % animations.length];
  }, [sticker.id]);

  // Create a simple tone for each sticker based on its ID
  const createAudioTone = useCallback(async () => {
    if (audioRef.current) return;
    
    try {
      // Generate a simple beep tone - in a real app, you'd load actual audio files
      const frequencies = [220, 262, 294, 330, 349, 392, 440, 494]; // Musical notes
      const index = parseInt(sticker.id.split('-')[1] || "0") % frequencies.length;
      const frequency = frequencies[index];
      
      // Create a simple sine wave tone
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      // Resume audio context if it's suspended (required by some browsers)
      if (audioContext.state === 'suspended') {
        await audioContext.resume();
      }
      
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      // Set initial volume based on sticker size
      const sizeRatio = (sticker.width + sticker.height) / 160; // Base size is 80x80
      const volume = Math.min(sizeRatio * globalVolume * 0.3, 0.5); // Lower max volume
      gainNode.gain.setValueAtTime(volume, audioContext.currentTime);
      
      oscillator.start();
      
      // Loop the oscillator
      oscillator.loop = true;
      
      // Store reference for cleanup
      audioRef.current = {
        oscillator,
        gainNode,
        audioContext,
        stop: () => {
          try {
            oscillator.stop();
            audioContext.close();
          } catch (e) {
            console.log('Audio cleanup error:', e);
          }
        },
        setVolume: (vol: number) => {
          try {
            gainNode.gain.setValueAtTime(Math.min(vol, 0.5), audioContext.currentTime);
          } catch (e) {
            console.log('Volume set error:', e);
          }
        }
      } as any;
    } catch (error) {
      console.log('Audio creation failed:', error);
    }
  }, [sticker.id, sticker.width, sticker.height, globalVolume]);

  // Update audio volume when sticker size or global volume changes
  useEffect(() => {
    if (audioRef.current && isPlaying) {
      const sizeRatio = (sticker.width + sticker.height) / 160;
      const volume = sizeRatio * globalVolume * sticker.volume;
      if ((audioRef.current as any).setVolume) {
        (audioRef.current as any).setVolume(volume);
      }
    }
  }, [sticker.width, sticker.height, sticker.volume, globalVolume, isPlaying]);

  // Handle audio playback
  useEffect(() => {
    if (isPlaying) {
      createAudioTone();
    } else {
      if (audioRef.current && (audioRef.current as any).stop) {
        (audioRef.current as any).stop();
        audioRef.current = null;
      }
    }

    return () => {
      if (audioRef.current && (audioRef.current as any).stop) {
        (audioRef.current as any).stop();
        audioRef.current = null;
      }
    };
  }, [isPlaying, createAudioTone]);

  const handleMouseDown = (event: React.MouseEvent) => {
    if (event.target === event.currentTarget || (event.target as HTMLElement).tagName === 'IMG') {
      setIsDragging(true);
      setDragStart({
        x: event.clientX - sticker.x,
        y: event.clientY - sticker.y,
      });
    }
  };

  const handleMouseMove = useCallback((event: MouseEvent) => {
    if (isDragging) {
      const newX = event.clientX - dragStart.x;
      const newY = event.clientY - dragStart.y;
      
      // Check if sticker is more than halfway outside canvas bounds
      if (canvasRef.current) {
        const canvasRect = canvasRef.current.getBoundingClientRect();
        
        // Check if sticker is more than half outside canvas bounds
        const stickerLeft = newX;
        const stickerRight = newX + sticker.width;
        const stickerTop = newY;
        const stickerBottom = newY + sticker.height;
        const halfWidth = sticker.width / 2;
        const halfHeight = sticker.height / 2;
        
        const crossingBoundary = stickerLeft < -halfWidth || stickerRight > canvasRect.width + halfWidth ||
                                stickerTop < -halfHeight || stickerBottom > canvasRect.height + halfHeight;
        
        setShowTrashOverlay(crossingBoundary);
        
        // If sticker center is completely outside canvas bounds, remove it
        const stickerCenterX = newX + sticker.width / 2;
        const stickerCenterY = newY + sticker.height / 2;
        if (stickerCenterX < 0 || stickerCenterX > canvasRect.width || 
            stickerCenterY < 0 || stickerCenterY > canvasRect.height) {
          onRemove(sticker.id);
          return;
        }
      }
      
      onUpdate(sticker.id, { x: newX, y: newY });
    }
  }, [isDragging, dragStart, onUpdate, onRemove, sticker.id, sticker.width, sticker.height, canvasRef]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    setIsResizing(false);
    setIsRotating(false);
    setShowTrashOverlay(false);
  }, []);

  useEffect(() => {
    if (isDragging || isResizing || isRotating) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);

      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, isResizing, isRotating, handleMouseMove, handleMouseUp]);

  const handleResizeStart = (event: React.MouseEvent) => {
    event.stopPropagation();
    setIsResizing(true);
    setDragStart({
      x: event.clientX,
      y: event.clientY,
    });
  };

  const handleResizeMove = useCallback((event: MouseEvent) => {
    if (isResizing) {
      const deltaX = event.clientX - dragStart.x;
      const deltaY = event.clientY - dragStart.y;
      const newWidth = Math.max(40, sticker.width + deltaX);
      const newHeight = Math.max(40, sticker.height + deltaY);
      
      onUpdate(sticker.id, { 
        width: newWidth, 
        height: newHeight,
      });
      
      setDragStart({
        x: event.clientX,
        y: event.clientY,
      });
    }
  }, [isResizing, dragStart, onUpdate, sticker]);

  useEffect(() => {
    if (isResizing) {
      document.addEventListener('mousemove', handleResizeMove);
      document.addEventListener('mouseup', handleMouseUp);

      return () => {
        document.removeEventListener('mousemove', handleResizeMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isResizing, handleResizeMove, handleMouseUp]);

  // Rotation handlers
  const handleRotateStart = (event: React.MouseEvent) => {
    event.stopPropagation();
    setIsRotating(true);
    
    if (stickerRef.current) {
      const rect = stickerRef.current.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      
      const angle = Math.atan2(event.clientY - centerY, event.clientX - centerX) * (180 / Math.PI);
      setRotateStart({ 
        angle: angle, 
        rotation: sticker.rotation || 0 
      });
      setDragStart({ x: centerX, y: centerY });
    }
  };

  const handleRotateMove = useCallback((event: MouseEvent) => {
    if (isRotating && stickerRef.current) {
      const centerX = dragStart.x;
      const centerY = dragStart.y;
      
      const currentAngle = Math.atan2(event.clientY - centerY, event.clientX - centerX) * (180 / Math.PI);
      const angleDiff = currentAngle - rotateStart.angle;
      let newRotation = rotateStart.rotation + angleDiff;
      
      // Normalize rotation to 0-360 range
      newRotation = ((newRotation % 360) + 360) % 360;
      
      onUpdate(sticker.id, { rotation: newRotation });
    }
  }, [isRotating, dragStart, rotateStart, onUpdate, sticker.id]);

  useEffect(() => {
    if (isRotating) {
      document.addEventListener('mousemove', handleRotateMove);
      document.addEventListener('mouseup', handleMouseUp);

      return () => {
        document.removeEventListener('mousemove', handleRotateMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isRotating, handleRotateMove, handleMouseUp]);

  // Touch gesture utilities
  const getTouchDistance = (touch1: React.Touch, touch2: React.Touch) => {
    const dx = touch1.clientX - touch2.clientX;
    const dy = touch1.clientY - touch2.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const getTouchAngle = (touch1: React.Touch, touch2: React.Touch) => {
    const dx = touch2.clientX - touch1.clientX;
    const dy = touch2.clientY - touch1.clientY;
    return Math.atan2(dy, dx) * (180 / Math.PI);
  };

  const getTouchCenter = (touch1: React.Touch, touch2: React.Touch) => {
    return {
      x: (touch1.clientX + touch2.clientX) / 2,
      y: (touch1.clientY + touch2.clientY) / 2,
    };
  };

  // Touch event handlers
  const handleTouchStart = (event: React.TouchEvent) => {
    if (event.touches.length === 1) {
      // Single finger - drag
      const touch = event.touches[0];
      setIsDragging(true);
      setDragStart({
        x: touch.clientX - sticker.x,
        y: touch.clientY - sticker.y,
      });
    } else if (event.touches.length === 2) {
      // Two fingers - scale/rotate
      event.preventDefault();
      setIsGesturing(true);
      setIsDragging(false); // Stop dragging if it was active
      
      const touch1 = event.touches[0];
      const touch2 = event.touches[1];
      
      const distance = getTouchDistance(touch1, touch2);
      const angle = getTouchAngle(touch1, touch2);
      const center = getTouchCenter(touch1, touch2);
      
      setInitialTouches({ distance, angle, center });
      setInitialSticker({
        width: sticker.width,
        height: sticker.height,
        rotation: sticker.rotation || 0,
        x: sticker.x,
        y: sticker.y,
      });
    }
  };

  const handleTouchMove = useCallback((event: TouchEvent) => {
    if (isDragging && event.touches.length === 1) {
      // Single finger drag
      const touch = event.touches[0];
      const newX = touch.clientX - dragStart.x;
      const newY = touch.clientY - dragStart.y;
      
      // Check if sticker is more than halfway outside canvas bounds
      if (canvasRef.current) {
        const canvasRect = canvasRef.current.getBoundingClientRect();
        
        // Check if sticker is more than half outside canvas bounds
        const stickerLeft = newX;
        const stickerRight = newX + sticker.width;
        const stickerTop = newY;
        const stickerBottom = newY + sticker.height;
        const halfWidth = sticker.width / 2;
        const halfHeight = sticker.height / 2;
        
        const crossingBoundary = stickerLeft < -halfWidth || stickerRight > canvasRect.width + halfWidth ||
                                stickerTop < -halfHeight || stickerBottom > canvasRect.height + halfHeight;
        
        setShowTrashOverlay(crossingBoundary);
        
        // If sticker center is completely outside canvas bounds, remove it
        const stickerCenterX = newX + sticker.width / 2;
        const stickerCenterY = newY + sticker.height / 2;
        if (stickerCenterX < 0 || stickerCenterX > canvasRect.width || 
            stickerCenterY < 0 || stickerCenterY > canvasRect.height) {
          onRemove(sticker.id);
          return;
        }
      }
      
      onUpdate(sticker.id, { x: newX, y: newY });
    } else if (isGesturing && event.touches.length === 2 && initialTouches && initialSticker) {
      // Two finger gesture
      event.preventDefault();
      
      const touch1 = event.touches[0];
      const touch2 = event.touches[1];
      
      const currentDistance = getTouchDistance(touch1, touch2);
      const currentAngle = getTouchAngle(touch1, touch2);
      const currentCenter = getTouchCenter(touch1, touch2);
      
      // Calculate scale factor
      const scaleRatio = currentDistance / initialTouches.distance;
      const newWidth = Math.max(40, Math.min(200, initialSticker.width * scaleRatio));
      const newHeight = Math.max(40, Math.min(200, initialSticker.height * scaleRatio));
      
      // Calculate rotation difference
      const rotationDiff = currentAngle - initialTouches.angle;
      let newRotation = initialSticker.rotation + rotationDiff;
      // Normalize rotation to 0-360 range
      newRotation = ((newRotation % 360) + 360) % 360;
      
      // Calculate new position based on center movement
      const centerDeltaX = currentCenter.x - initialTouches.center.x;
      const centerDeltaY = currentCenter.y - initialTouches.center.y;
      const newX = Math.max(0, initialSticker.x + centerDeltaX);
      const newY = Math.max(0, initialSticker.y + centerDeltaY);
      
      onUpdate(sticker.id, {
        width: newWidth,
        height: newHeight,
        rotation: newRotation,
        x: newX,
        y: newY,
      });
    }
  }, [isDragging, isGesturing, dragStart, initialTouches, initialSticker, onUpdate, sticker.id]);

  const handleTouchEnd = useCallback(() => {
    setIsDragging(false);
    setIsGesturing(false);
    setInitialTouches(null);
    setInitialSticker(null);
    setShowTrashOverlay(false);
  }, []);

  useEffect(() => {
    if (isDragging || isGesturing) {
      document.addEventListener('touchmove', handleTouchMove, { passive: false });
      document.addEventListener('touchend', handleTouchEnd);

      return () => {
        document.removeEventListener('touchmove', handleTouchMove);
        document.removeEventListener('touchend', handleTouchEnd);
      };
    }
  }, [isDragging, isGesturing, handleTouchMove, handleTouchEnd]);

  return (
    <div
      ref={stickerRef}
      className={`absolute cursor-move select-none group sticker-bounce touch-manipulation ${
        isDragging || isGesturing || isRotating ? 'z-50 scale-105' : sticker.rotation && sticker.rotation !== 0 ? '' : stickerAnimation
      }`}
      style={{
        left: sticker.x,
        top: sticker.y,
        width: sticker.width,
        height: sticker.height,
        transform: `rotate(${sticker.rotation || 0}deg)`,
        transformOrigin: 'center center',
        zIndex: sticker.zIndex,
      }}
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
    >
      {/* Layer up button */}
      <Button
        size="sm"
        variant="secondary"
        className="absolute -top-2 left-1/2 transform -translate-x-1/2 w-6 h-6 rounded-full opacity-0 group-hover:opacity-100 transition-opacity z-10 bg-yellow-400 hover:bg-yellow-500 text-black border-yellow-400 hover:border-yellow-500"
        onClick={(e) => {
          e.stopPropagation();
          onLayerChange(sticker.id, 'up');
        }}
      >
        <ChevronUp className="w-3 h-3" />
      </Button>

      {/* Layer down button */}
      <Button
        size="sm"
        variant="secondary"
        className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-6 h-6 rounded-full opacity-0 group-hover:opacity-100 transition-opacity z-10 bg-yellow-400 hover:bg-yellow-500 text-black border-yellow-400 hover:border-yellow-500"
        onClick={(e) => {
          e.stopPropagation();
          onLayerChange(sticker.id, 'down');
        }}
      >
        <ChevronDown className="w-3 h-3" />
      </Button>

      {/* Rotate button */}
      <Button
        size="sm"
        variant="secondary"
        className="absolute -top-2 -left-2 w-6 h-6 rounded-full opacity-0 group-hover:opacity-100 transition-opacity z-10 cursor-grab active:cursor-grabbing"
        onMouseDown={handleRotateStart}
      >
        <RotateCw className="w-3 h-3" />
      </Button>

      {/* Sticker image */}
      <img
        src={sticker.src}
        alt="Sticker"
        className="w-full h-full object-contain pointer-events-none"
        draggable={false}
        style={{ backgroundColor: 'transparent' }}
      />

      {/* Trash overlay when near edges */}
      {showTrashOverlay && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/10 rounded-lg backdrop-blur-sm z-50">
          <Trash2 className="w-12 h-12 text-destructive animate-pulse drop-shadow-lg" />
        </div>
      )}

      {/* Resize handle */}
      <div
        className="absolute bottom-0 right-0 w-4 h-4 cursor-nw-resize opacity-0 group-hover:opacity-100 transition-opacity"
        onMouseDown={handleResizeStart}
        style={{
          background: 'linear-gradient(-45deg, transparent 30%, hsl(var(--primary)) 30%, hsl(var(--primary)) 70%, transparent 70%)',
        }}
      />

      {/* Size indicator */}
      <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 text-xs bg-primary text-primary-foreground px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">
        {Math.round((sticker.width + sticker.height) / 2)}px
      </div>
    </div>
  );
};