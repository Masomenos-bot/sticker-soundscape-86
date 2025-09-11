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
  isCurrentStep: boolean;
  sequenceTempo: number;
}

export const ResizableSticker = ({
  sticker,
  onUpdate,
  onRemove,
  onLayerChange,
  isPlaying,
  globalVolume,
  canvasRef,
  isCurrentStep,
  sequenceTempo,
}: ResizableStickerProps) => {
  const stickerRef = useRef<HTMLDivElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
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

  // Initialize audio context
  useEffect(() => {
    const initAudio = async () => {
      try {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        if (audioContextRef.current.state === 'suspended') {
          await audioContextRef.current.resume();
        }
      } catch (error) {
        console.error("Audio context initialization failed:", error);
      }
    };
    initAudio();

    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  // Hopeful instrument definitions for uplifting sequences
  const hopefulInstruments = [
    {
      name: 'gentle_piano',
      scale: [261.63, 293.66, 329.63, 349.23, 392.00, 440.00, 493.88, 523.25, 587.33, 659.25], // C Major
      waveType: 'triangle' as OscillatorType,
      harmonics: [1, 0.5, 0.25, 0.15, 0.1],
      harmonicGains: [1.0, 0.6, 0.4, 0.3, 0.2],
      attack: 0.05,
      decay: 0.3,
      sustain: 0.7,
      release: 2.5,
      filterFreq: 3000,
      resonance: 2,
      melodicPattern: [0, 2, 4, 5, 7, 5, 4, 2] // I-III-V-VI-VIII-VI-V-III (uplifting)
    },
    {
      name: 'warm_strings',
      scale: [246.94, 277.18, 311.13, 329.63, 369.99, 415.30, 466.16, 493.88, 554.37, 622.25], // B Major
      waveType: 'sawtooth' as OscillatorType,
      harmonics: [1, 0.8, 0.6, 0.4, 0.3],
      harmonicGains: [1.0, 0.7, 0.5, 0.3, 0.2],
      attack: 0.2,
      decay: 0.5,
      sustain: 0.8,
      release: 3.0,
      filterFreq: 2500,
      resonance: 1.5,
      melodicPattern: [0, 4, 2, 6, 4, 7, 2, 0] // Hopeful chord progression
    },
    {
      name: 'bright_bells',
      scale: [293.66, 329.63, 369.99, 392.00, 440.00, 493.88, 554.37, 587.33, 659.25, 739.99], // D Major
      waveType: 'sine' as OscillatorType,
      harmonics: [1, 2.0, 3.0, 4.0, 5.0],
      harmonicGains: [1.0, 0.4, 0.3, 0.2, 0.1],
      attack: 0.01,
      decay: 0.15,
      sustain: 0.6,
      release: 4.0,
      filterFreq: 4500,
      resonance: 1,
      melodicPattern: [0, 2, 4, 7, 5, 4, 2, 0] // Ascending then descending for hope
    },
    {
      name: 'soft_harp',
      scale: [220.00, 246.94, 277.18, 293.66, 329.63, 369.99, 415.30, 440.00, 493.88, 554.37], // A Major
      waveType: 'triangle' as OscillatorType,
      harmonics: [1, 0.3, 0.2, 0.15, 0.1],
      harmonicGains: [1.0, 0.8, 0.6, 0.4, 0.3],
      attack: 0.03,
      decay: 0.4,
      sustain: 0.6,
      release: 3.5,
      filterFreq: 3500,
      resonance: 2,
      melodicPattern: [0, 4, 7, 5, 2, 4, 0, 2] // Arpeggiated hope pattern
    },
    {
      name: 'crystal_chimes',
      scale: [329.63, 369.99, 415.30, 440.00, 493.88, 554.37, 622.25, 659.25, 739.99, 830.61], // E Major
      waveType: 'sine' as OscillatorType,
      harmonics: [1, 2.5, 4.0, 6.0, 8.0],
      harmonicGains: [1.0, 0.3, 0.2, 0.15, 0.1],
      attack: 0.005,
      decay: 0.1,
      sustain: 0.4,
      release: 5.0,
      filterFreq: 5000,
      resonance: 0.8,
      melodicPattern: [0, 3, 6, 4, 1, 5, 2, 0] // Crystalline happiness
    },
    {
      name: 'warm_flute',
      scale: [349.23, 392.00, 440.00, 466.16, 523.25, 587.33, 659.25, 698.46, 783.99, 880.00], // F Major
      waveType: 'sine' as OscillatorType,
      harmonics: [1, 0.4, 0.2, 0.1],
      harmonicGains: [1.0, 0.7, 0.5, 0.3],
      attack: 0.15,
      decay: 0.3,
      sustain: 0.9,
      release: 2.0,
      filterFreq: 4200,
      resonance: 1.2,
      melodicPattern: [0, 2, 5, 7, 4, 2, 0, 4] // Soaring melody
    },
    {
      name: 'gentle_marimba',
      scale: [392.00, 440.00, 493.88, 523.25, 587.33, 659.25, 739.99, 783.99, 880.00, 987.77], // G Major  
      waveType: 'triangle' as OscillatorType,
      harmonics: [1, 1.5, 2.0, 3.0, 4.0],
      harmonicGains: [1.0, 0.4, 0.3, 0.2, 0.1],
      attack: 0.01,
      decay: 0.2,
      sustain: 0.3,
      release: 1.5,
      filterFreq: 2800,
      resonance: 3,
      melodicPattern: [0, 2, 4, 6, 5, 3, 1, 0] // Bouncy optimism
    },
    {
      name: 'serene_pad',
      scale: [261.63, 293.66, 329.63, 349.23, 392.00, 440.00, 493.88, 523.25, 587.33, 659.25], // C Major
      waveType: 'sine' as OscillatorType,
      harmonics: [1, 0.8, 0.6, 0.4, 0.3, 0.2],
      harmonicGains: [1.0, 0.8, 0.7, 0.6, 0.5, 0.4],
      attack: 0.8,
      decay: 1.0,
      sustain: 0.9,
      release: 4.0,
      filterFreq: 2200,
      resonance: 0.5,
      melodicPattern: [0, 4, 7, 2, 5, 0, 4, 7] // I-V-VIII-III-VI progression (very hopeful)
    }
  ];

  // Play step sound when this sticker is the current step
  const playStepSound = useCallback(async () => {
    if (!audioContextRef.current || !isCurrentStep || !isPlaying) return;

    try {
      console.log(`Playing step ${sticker.stepIndex} for sticker ${sticker.id}`);
      
      // Select hopeful instrument based on sticker ID hash
      const instrumentIndex = sticker.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % hopefulInstruments.length;
      const instrument = hopefulInstruments[instrumentIndex];
      
      // Get melodic note based on step index
      const noteIndex = instrument.melodicPattern[sticker.stepIndex % instrument.melodicPattern.length];
      const noteFreq = instrument.scale[noteIndex % instrument.scale.length];
      
      // Calculate volume based on sticker size and position - softer for pleasant sound
      const sizeRatio = (sticker.width + sticker.height) / 160;
      const volume = Math.min(sizeRatio * globalVolume * sticker.volume * 0.12, 0.15);
      
      console.log(`${instrument.name} playing ${noteFreq}Hz at volume ${volume}`);
      
      // Create sound with harmonics
      const now = audioContextRef.current.currentTime;
      
      for (let i = 0; i < instrument.harmonics.length; i++) {
        const osc = audioContextRef.current.createOscillator();
        const gain = audioContextRef.current.createGain();
        const filter = audioContextRef.current.createBiquadFilter();
        
        // Set up oscillator
        osc.type = i === 0 ? instrument.waveType : 'sine';
        osc.frequency.setValueAtTime(noteFreq * instrument.harmonics[i], now);
        
        // Set up envelope
        const harmonicGain = instrument.harmonicGains[i] * volume;
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(harmonicGain, now + instrument.attack);
        gain.gain.exponentialRampToValueAtTime(Math.max(harmonicGain * instrument.sustain, 0.001), now + instrument.decay);
        gain.gain.exponentialRampToValueAtTime(0.001, now + instrument.release);
        
        // Set up filter for warmer, more pleasant sound
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(instrument.filterFreq + (noteFreq * 0.3), now);
        filter.Q.setValueAtTime(instrument.resonance, now);
        
        // Connect audio chain
        osc.connect(filter);
        filter.connect(gain);
        gain.connect(audioContextRef.current.destination);
        
        // Start and stop
        osc.start(now);
        osc.stop(now + instrument.release);
      }
      
    } catch (error) {
      console.error("Error playing step sound:", error);
    }
  }, [isCurrentStep, isPlaying, sticker, globalVolume]);

  // Trigger sound when it's this sticker's turn in the sequence
  useEffect(() => {
    if (isCurrentStep && isPlaying) {
      playStepSound();
    }
  }, [isCurrentStep, isPlaying, playStepSound]);

  // Mouse event handlers
  const handleMouseDown = useCallback((event: React.MouseEvent) => {
    if (event.button !== 0) return; // Only left click
    
    event.preventDefault();
    event.stopPropagation();
    
    const rect = stickerRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    
    // Check if clicking on a resize handle
    const isOnResizeHandle = x > rect.width - 20 && y > rect.height - 20;
    // Check if clicking on rotate handle
    const isOnRotateHandle = x > rect.width - 20 && y < 20;
    
    if (isOnRotateHandle) {
      setIsRotating(true);
      const center = { x: rect.width / 2, y: rect.height / 2 };
      const angle = Math.atan2(y - center.y, x - center.x) * (180 / Math.PI);
      setRotateStart({ angle, rotation: sticker.rotation || 0 });
    } else if (isOnResizeHandle) {
      setIsResizing(true);
    } else {
      setIsDragging(true);
      setDragStart({ x: event.clientX - sticker.x, y: event.clientY - sticker.y });
    }
  }, [sticker.x, sticker.y, sticker.rotation]);

  // Mouse move handler
  const handleMouseMove = useCallback((event: MouseEvent) => {
    if (isDragging) {
      const newX = event.clientX - dragStart.x;
      const newY = event.clientY - dragStart.y;
      onUpdate(sticker.id, { x: newX, y: newY });
      
      // Check if sticker is outside canvas bounds for removal
      const canvasRect = canvasRef.current?.getBoundingClientRect();
      if (canvasRect) {
        const stickerCenterX = newX + sticker.width / 2;
        const stickerCenterY = newY + sticker.height / 2;
        const isOutside = stickerCenterX < 0 || stickerCenterY < 0 || 
                         stickerCenterX > canvasRect.width || stickerCenterY > canvasRect.height;
        
        if (isOutside) {
          setShowTrashOverlay(true);
        } else {
          setShowTrashOverlay(false);
        }
      }
    } else if (isResizing) {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;
      
      const newWidth = Math.max(20, event.clientX - rect.left - sticker.x);
      const newHeight = Math.max(20, event.clientY - rect.top - sticker.y);
      onUpdate(sticker.id, { width: newWidth, height: newHeight });
    } else if (isRotating) {
      const rect = stickerRef.current?.getBoundingClientRect();
      if (!rect) return;
      
      const center = { 
        x: rect.left + rect.width / 2, 
        y: rect.top + rect.height / 2 
      };
      const angle = Math.atan2(event.clientY - center.y, event.clientX - center.x) * (180 / Math.PI);
      const newRotation = rotateStart.rotation + (angle - rotateStart.angle);
      onUpdate(sticker.id, { rotation: newRotation });
    }
  }, [isDragging, isResizing, isRotating, dragStart, rotateStart, sticker.id, sticker.x, sticker.y, sticker.width, sticker.height, onUpdate, canvasRef]);

  // Mouse up handler
  const handleMouseUp = useCallback(() => {
    if (isDragging && showTrashOverlay) {
      // Remove sticker if it was dragged outside the frame
      onRemove(sticker.id);
    }
    
    setIsDragging(false);
    setIsResizing(false);
    setIsRotating(false);
    setShowTrashOverlay(false);
  }, [isDragging, showTrashOverlay, onRemove, sticker.id]);

  // Set up global mouse event listeners
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

  // Touch handlers for mobile support
  const handleTouchStart = useCallback((event: React.TouchEvent) => {
    event.preventDefault();
    event.stopPropagation();
    
    if (event.touches.length === 1) {
      const touch = event.touches[0];
      const rect = stickerRef.current?.getBoundingClientRect();
      if (!rect) return;
      
      setIsDragging(true);
      setDragStart({ 
        x: touch.clientX - sticker.x, 
        y: touch.clientY - sticker.y 
      });
    } else if (event.touches.length === 2) {
      setIsGesturing(true);
      const touch1 = event.touches[0];
      const touch2 = event.touches[1];
      
      const distance = Math.sqrt(
        Math.pow(touch2.clientX - touch1.clientX, 2) + 
        Math.pow(touch2.clientY - touch1.clientY, 2)
      );
      const angle = Math.atan2(
        touch2.clientY - touch1.clientY, 
        touch2.clientX - touch1.clientX
      ) * (180 / Math.PI);
      const center = {
        x: (touch1.clientX + touch2.clientX) / 2,
        y: (touch1.clientY + touch2.clientY) / 2
      };
      
      setInitialTouches({ distance, angle, center });
      setInitialSticker({
        width: sticker.width,
        height: sticker.height,
        rotation: sticker.rotation || 0,
        x: sticker.x,
        y: sticker.y
      });
    }
  }, [sticker.x, sticker.y, sticker.width, sticker.height, sticker.rotation]);

  const handleTouchMove = useCallback((event: React.TouchEvent) => {
    event.preventDefault();
    
    if (event.touches.length === 1 && isDragging && !isGesturing) {
      const touch = event.touches[0];
      const newX = touch.clientX - dragStart.x;
      const newY = touch.clientY - dragStart.y;
      onUpdate(sticker.id, { x: newX, y: newY });
      
      // Check if sticker is outside canvas bounds for removal
      const canvasRect = canvasRef.current?.getBoundingClientRect();
      if (canvasRect) {
        const stickerCenterX = newX + sticker.width / 2;
        const stickerCenterY = newY + sticker.height / 2;
        const isOutside = stickerCenterX < 0 || stickerCenterY < 0 || 
                         stickerCenterX > canvasRect.width || stickerCenterY > canvasRect.height;
        
        if (isOutside) {
          setShowTrashOverlay(true);
        } else {
          setShowTrashOverlay(false);
        }
      }
    } else if (event.touches.length === 2 && isGesturing && initialTouches && initialSticker) {
      const touch1 = event.touches[0];
      const touch2 = event.touches[1];
      
      const distance = Math.sqrt(
        Math.pow(touch2.clientX - touch1.clientX, 2) + 
        Math.pow(touch2.clientY - touch1.clientY, 2)
      );
      const angle = Math.atan2(
        touch2.clientY - touch1.clientY, 
        touch2.clientX - touch1.clientX
      ) * (180 / Math.PI);
      const center = {
        x: (touch1.clientX + touch2.clientX) / 2,
        y: (touch1.clientY + touch2.clientY) / 2
      };
      
      // Scale
      const scaleRatio = distance / initialTouches.distance;
      const newWidth = Math.max(20, initialSticker.width * scaleRatio);
      const newHeight = Math.max(20, initialSticker.height * scaleRatio);
      
      // Rotation
      const rotationDiff = angle - initialTouches.angle;
      const newRotation = initialSticker.rotation + rotationDiff;
      
      // Position (move based on center change)
      const centerDiff = {
        x: center.x - initialTouches.center.x,
        y: center.y - initialTouches.center.y
      };
      const newX = initialSticker.x + centerDiff.x;
      const newY = initialSticker.y + centerDiff.y;
      
      onUpdate(sticker.id, {
        width: newWidth,
        height: newHeight,
        rotation: newRotation,
        x: newX,
        y: newY
      });
    }
  }, [isDragging, isGesturing, dragStart, initialTouches, initialSticker, sticker.id, sticker.width, sticker.height, onUpdate, canvasRef]);

  const handleTouchEnd = useCallback(() => {
    if (isDragging && showTrashOverlay) {
      // Remove sticker if it was dragged outside the frame
      onRemove(sticker.id);
    }
    
    setIsDragging(false);
    setIsGesturing(false);
    setInitialTouches(null);
    setInitialSticker(null);
    setShowTrashOverlay(false);
  }, [isDragging, showTrashOverlay, onRemove, sticker.id]);

  return (
    <div
      ref={stickerRef}
      className="absolute select-none cursor-move group transition-all duration-200"
      style={{
        left: `${sticker.x}px`,
        top: `${sticker.y}px`,
        width: `${sticker.width}px`,
        height: `${sticker.height}px`,
        transform: `rotate(${sticker.rotation || 0}deg) scaleX(${sticker.mirrored ? -1 : 1})`,
        zIndex: sticker.zIndex,
        touchAction: 'none',
      }}
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Sticker Image */}
      <img
        src={sticker.src}
        alt="Sticker"
        className={`w-full h-full object-contain pointer-events-none ${
          isPlaying ? stickerAnimation : ''
        }`}
        draggable={false}
      />
      
      {/* Controls */}
      <div className="absolute -top-10 right-0 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
        <Button
          size="sm"
          variant="secondary"
          className="w-6 h-6 p-0"
          onClick={(e) => {
            e.stopPropagation();
            onLayerChange(sticker.id, 'up');
          }}
        >
          <ChevronUp className="w-3 h-3" />
        </Button>
        <Button
          size="sm"
          variant="secondary"
          className="w-6 h-6 p-0"
          onClick={(e) => {
            e.stopPropagation();
            onLayerChange(sticker.id, 'down');
          }}
        >
          <ChevronDown className="w-3 h-3" />
        </Button>
        <Button
          size="sm"
          variant="secondary"
          className="w-6 h-6 p-0"
          onClick={(e) => {
            e.stopPropagation();
            onUpdate(sticker.id, { mirrored: !sticker.mirrored });
          }}
        >
          <FlipHorizontal className="w-3 h-3" />
        </Button>
        <Button
          size="sm"
          variant="destructive"
          className="w-6 h-6 p-0"
          onClick={(e) => {
            e.stopPropagation();
            onRemove(sticker.id);
          }}
        >
          <Trash2 className="w-3 h-3" />
        </Button>
      </div>
      
      {/* Resize Handle */}
      <div className="absolute bottom-0 right-0 w-4 h-4 bg-primary/50 cursor-nw-resize opacity-0 group-hover:opacity-100 transition-opacity" />
      
      {/* Rotate Handle */}
      <div className="absolute top-0 right-0 w-4 h-4 bg-secondary/50 cursor-grab opacity-0 group-hover:opacity-100 transition-opacity">
        <RotateCw className="w-3 h-3" />
      </div>
    </div>
  );
};