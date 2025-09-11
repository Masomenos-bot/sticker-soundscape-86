import React, { useEffect, useRef, useState, useCallback } from "react";
import { Sticker } from "./StickerMusicApp";
import { RotateCw, Trash2, ChevronUp, ChevronDown, FlipHorizontal } from "lucide-react";
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
  const audioRef = useRef<{
    audioContext: AudioContext;
    masterGain: GainNode;
    isActive: boolean;
    stop: () => void;
    setVolume: (vol: number) => void;
  } | null>(null);
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

  // Create rhythmic audio loops for each sticker
  const createAudioTone = useCallback(async () => {
    if (audioRef.current) return;
    
    try {
      console.log('Creating audio for sticker:', sticker.id);
      
      // Create audio context
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      console.log('Audio context state:', audioContext.state);
      
      // Resume audio context (required by browsers)
      if (audioContext.state === 'suspended') {
        await audioContext.resume();
        console.log('Audio context resumed');
      }

      // Define soulful, harmonious musical patterns using pentatonic and blues scales
      const patterns = [
        // Deep bass kick - Root note (C2)
        { beats: [1, 0, 0, 0, 1, 0, 0, 0], freq: 65.4, wave: 'sine' as OscillatorType, envelope: { attack: 0.01, decay: 0.3, sustain: 0.1 } },
        
        // Snare on 2 and 4 - Perfect fifth (G2) 
        { beats: [0, 0, 1, 0, 0, 0, 1, 0], freq: 98.0, wave: 'triangle' as OscillatorType, envelope: { attack: 0.005, decay: 0.15, sustain: 0.05 } },
        
        // Hi-hat pattern - Major third (E3)
        { beats: [1, 1, 0, 1, 1, 1, 0, 1], freq: 164.8, wave: 'sawtooth' as OscillatorType, envelope: { attack: 0.001, decay: 0.05, sustain: 0.01 } },
        
        // Bass line - Minor third (Eb2)
        { beats: [1, 0, 1, 1, 0, 0, 1, 0], freq: 77.8, wave: 'square' as OscillatorType, envelope: { attack: 0.02, decay: 0.25, sustain: 0.15 } },
        
        // Melodic percussion - Perfect fourth (F3) 
        { beats: [0, 1, 0, 0, 1, 0, 1, 0], freq: 174.6, wave: 'sine' as OscillatorType, envelope: { attack: 0.01, decay: 0.2, sustain: 0.08 } },
        
        // Syncopated rhythm - Sixth (A3)
        { beats: [1, 0, 1, 0, 0, 1, 0, 1], freq: 220.0, wave: 'triangle' as OscillatorType, envelope: { attack: 0.005, decay: 0.18, sustain: 0.06 } },
        
        // Counter melody - Seventh (Bb3)
        { beats: [0, 0, 1, 1, 0, 1, 0, 0], freq: 233.1, wave: 'sine' as OscillatorType, envelope: { attack: 0.015, decay: 0.22, sustain: 0.1 } },
        
        // Polyrhythmic element - Octave (C4)
        { beats: [1, 0, 0, 1, 0, 1, 1, 0], freq: 261.6, wave: 'sawtooth' as OscillatorType, envelope: { attack: 0.008, decay: 0.12, sustain: 0.04 } },
      ];
      
      // Get pattern for this sticker
      const patternIndex = sticker.id.length % patterns.length;
      const pattern = patterns[patternIndex];
      
      console.log(`Sticker ${sticker.id} using pattern:`, pattern);
      
      // Create master gain node
      const masterGain = audioContext.createGain();
      masterGain.connect(audioContext.destination);
      
      // Calculate volume based on sticker size
      const sizeRatio = (sticker.width + sticker.height) / 160;
      const volume = Math.min(sizeRatio * globalVolume * sticker.volume * 0.15, 0.2);
      masterGain.gain.setValueAtTime(volume, audioContext.currentTime);
      
      console.log('Set volume to:', volume);
      
      // Beat tracking
      let beatIndex = 0;
      let isActive = true;
      
      // Play beat function
      const playBeat = () => {
        if (!isActive || audioContext.state === 'closed') return;
        
        try {
          // Check if this beat should play
          if (pattern.beats[beatIndex]) {
            console.log(`Playing beat ${beatIndex} for sticker ${sticker.id}`);
            
            // Create oscillator for this beat
            const osc = audioContext.createOscillator();
            const gain = audioContext.createGain();
            
            // Add subtle filtering for more soulful sound
            const filter = audioContext.createBiquadFilter();
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(pattern.freq * 4, audioContext.currentTime);
            filter.Q.setValueAtTime(1, audioContext.currentTime);
            
            osc.type = pattern.wave;
            osc.frequency.setValueAtTime(pattern.freq, audioContext.currentTime);
            
            // Connect audio nodes with filter
            osc.connect(filter);
            filter.connect(gain);
            gain.connect(masterGain);
            
            // Create soulful envelope using pattern envelope settings
            const now = audioContext.currentTime;
            const { attack, decay, sustain } = pattern.envelope;
            
            gain.gain.setValueAtTime(0, now);
            gain.gain.linearRampToValueAtTime(1, now + attack); // Attack
            gain.gain.exponentialRampToValueAtTime(sustain, now + attack + decay); // Decay to sustain
            gain.gain.exponentialRampToValueAtTime(0.001, now + attack + decay + 0.1); // Release
            
            // Start and stop the oscillator with longer duration for soulful sound
            osc.start(now);
            osc.stop(now + attack + decay + 0.1);
          }
          
          // Move to next beat
          beatIndex = (beatIndex + 1) % pattern.beats.length;
          
          // Schedule next beat (750ms = 80 BPM for more soulful, relaxed tempo)
          if (isActive) {
            setTimeout(playBeat, 750);
          }
        } catch (error) {
          console.error('Error in playBeat:', error);
        }
      };
      
      // Start the beat loop
      playBeat();
      
      // Store audio reference
      audioRef.current = {
        audioContext,
        masterGain,
        isActive: true,
        stop: () => {
          console.log('Stopping audio for sticker:', sticker.id);
          isActive = false;
          try {
            audioContext.close();
          } catch (e) {
            console.warn('Audio context close error:', e);
          }
        },
        setVolume: (vol: number) => {
          try {
            const newVol = Math.min(vol, 0.2);
            masterGain.gain.setValueAtTime(newVol, audioContext.currentTime);
            console.log('Updated volume to:', newVol);
          } catch (e) {
            console.warn('Volume update error:', e);
          }
        }
      } as any;

      console.log('Audio setup complete for sticker:', sticker.id);
      
    } catch (error) {
      console.error('Failed to create audio:', error);
    }
  }, [sticker.id, sticker.width, sticker.height, sticker.volume, globalVolume]);

  // Update audio volume when sticker size or global volume changes
  useEffect(() => {
    if (audioRef.current && audioRef.current.setVolume && isPlaying) {
      const sizeRatio = (sticker.width + sticker.height) / 160;
      const volume = Math.min(sizeRatio * globalVolume * sticker.volume * 0.15, 0.2);
      audioRef.current.setVolume(volume);
      console.log(`Volume updated for sticker ${sticker.id}:`, volume);
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
        transform: `rotate(${sticker.rotation || 0}deg) scaleX(${sticker.mirrored ? -1 : 1})`,
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
          e.preventDefault();
          e.stopPropagation();
          console.log('Layer up clicked for sticker:', sticker.id);
          onLayerChange(sticker.id, 'up');
        }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <ChevronUp className="w-3 h-3" />
      </Button>

      {/* Layer down button */}
      <Button
        size="sm"
        variant="secondary"
        className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-6 h-6 rounded-full opacity-0 group-hover:opacity-100 transition-opacity z-10 bg-yellow-400 hover:bg-yellow-500 text-black border-yellow-400 hover:border-yellow-500"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          console.log('Layer down clicked for sticker:', sticker.id);
          onLayerChange(sticker.id, 'down');
        }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <ChevronDown className="w-3 h-3" />
      </Button>

      {/* Mirror button */}
      <Button
        size="sm"
        variant="secondary"
        className="absolute -top-2 -right-2 w-6 h-6 rounded-full opacity-0 group-hover:opacity-100 transition-opacity z-10 bg-pink-400 hover:bg-pink-500 text-white border-pink-400 hover:border-pink-500"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onUpdate(sticker.id, { mirrored: !sticker.mirrored });
        }}
      >
        <FlipHorizontal className="w-3 h-3" />
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