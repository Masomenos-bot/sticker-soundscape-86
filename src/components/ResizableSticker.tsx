import React, { useEffect, useRef, useState, useCallback, useMemo } from "react";
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

  // Animation selection
  const stickerAnimation = useMemo(() => {
    const animations = ['animate-float-circular', 'animate-float-circular-2', 'animate-float-circular-3', 'animate-float-wobble', 'animate-float-bounce'];
    const hash = sticker.id.split('').reduce((a, b) => { a = ((a << 5) - a) + b.charCodeAt(0); return a & a; }, 0);
    return animations[Math.abs(hash) % animations.length];
  }, [sticker.id]);

  // Optimized Ethiopian instruments
  const ethioInstruments = useMemo(() => [
    {
      name: 'vibraphone',
      scale: [277.18, 311.13, 349.23, 415.30, 466.16, 523.25, 622.25, 698.46], 
      waveType: 'sine' as OscillatorType,
      harmonics: [1, 0.6, 0.2],
      harmonicGains: [1.0, 0.5, 0.2],
      attack: 0.01,
      decay: 0.04,
      sustain: 0.2,
      release: 0.6,
      filterFreq: 3200,
      resonance: 1.5,
      pattern: [0, 2, 4, 1, 5, 3, 6, 2]
    },
    {
      name: 'krar',
      scale: [207.65, 233.08, 261.63, 311.13, 349.23, 415.30, 523.25, 622.25],
      waveType: 'triangle' as OscillatorType,
      harmonics: [1, 0.5, 0.2],
      harmonicGains: [1.0, 0.4, 0.15],
      attack: 0.01,
      decay: 0.02,
      sustain: 0.15,
      release: 0.8,
      filterFreq: 4000,
      resonance: 3.0,
      pattern: [0, 4, 2, 6, 1, 5, 3, 0]
    },
    {
      name: 'flute',
      scale: [277.18, 311.13, 349.23, 415.30, 466.16, 554.37, 622.25, 739.99],
      waveType: 'sine' as OscillatorType,
      harmonics: [1, 0.3],
      harmonicGains: [1.0, 0.4],
      attack: 0.1,
      decay: 0.03,
      sustain: 0.7,
      release: 0.4,
      filterFreq: 4200,
      resonance: 1.0,
      pattern: [0, 3, 1, 5, 2, 6, 4, 0]
    },
    {
      name: 'conga_low',
      scale: [174.61, 196.00, 220.00, 246.94, 277.18, 311.13, 349.23, 392.00],
      waveType: 'triangle' as OscillatorType,
      harmonics: [1, 1.8],
      harmonicGains: [1.0, 0.3],
      attack: 0.001,
      decay: 0.01,
      sustain: 0.05,
      release: 0.15,
      filterFreq: 1000,
      resonance: 8.0,
      pattern: [0, 0, 2, 0, 3, 0, 1, 2]
    },
    {
      name: 'conga_high',
      scale: [261.63, 293.66, 329.63, 369.99, 415.30, 466.16, 523.25, 587.33],
      waveType: 'triangle' as OscillatorType,
      harmonics: [1, 2.0],
      harmonicGains: [1.0, 0.25],
      attack: 0.001,
      decay: 0.008,
      sustain: 0.04,
      release: 0.12,
      filterFreq: 1600,
      resonance: 10.0,
      pattern: [0, 2, 0, 4, 1, 0, 3, 2]
    }
  ], []);

  // Initialize audio
  useEffect(() => {
    const initAudio = async () => {
      try {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        if (audioContextRef.current.state === 'suspended') {
          await audioContextRef.current.resume();
        }
      } catch (error) {
        console.error("Audio init failed:", error);
      }
    };
    initAudio();
    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  // Optimized step sound
  const playStepSound = useCallback(async () => {
    if (!audioContextRef.current || !isCurrentStep || !isPlaying) return;

    try {
      const instrumentIndex = sticker.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % ethioInstruments.length;
      const instrument = ethioInstruments[instrumentIndex];
      
      const noteIndex = instrument.pattern[sticker.stepIndex % instrument.pattern.length];
      const noteFreq = instrument.scale[noteIndex % instrument.scale.length];
      
      const volume = Math.min((sticker.width + sticker.height) / 160 * globalVolume * sticker.volume * 0.1, 0.15);
      const now = audioContextRef.current.currentTime;
      
      // Simplified audio generation
      for (let i = 0; i < instrument.harmonics.length; i++) {
        const osc = audioContextRef.current.createOscillator();
        const gain = audioContextRef.current.createGain();
        const filter = audioContextRef.current.createBiquadFilter();
        
        osc.type = instrument.waveType;
        osc.frequency.setValueAtTime(noteFreq * instrument.harmonics[i], now);
        
        const harmonicGain = instrument.harmonicGains[i] * volume;
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(harmonicGain, now + instrument.attack);
        gain.gain.exponentialRampToValueAtTime(Math.max(harmonicGain * instrument.sustain, 0.001), now + instrument.attack + instrument.decay);
        gain.gain.exponentialRampToValueAtTime(0.001, now + instrument.release);
        
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(instrument.filterFreq, now);
        filter.Q.setValueAtTime(instrument.resonance, now);
        
        osc.connect(filter);
        filter.connect(gain);
        gain.connect(audioContextRef.current.destination);
        
        osc.start(now);
        osc.stop(now + instrument.release);
      }
      
    } catch (error) {
      console.error("Audio error:", error);
    }
  }, [isCurrentStep, isPlaying, sticker, globalVolume, ethioInstruments]);

  useEffect(() => {
    if (isCurrentStep && isPlaying) {
      playStepSound();
    }
  }, [isCurrentStep, isPlaying, playStepSound]);

  // Mouse handlers
  const handleMouseDown = useCallback((event: React.MouseEvent) => {
    if (event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    
    const rect = stickerRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    
    const isOnResizeHandle = x > rect.width - 20 && y > rect.height - 20;
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

  const handleMouseMove = useCallback((event: MouseEvent) => {
    if (isDragging) {
      const newX = event.clientX - dragStart.x;
      const newY = event.clientY - dragStart.y;
      onUpdate(sticker.id, { x: newX, y: newY });
      
      if (canvasRef.current) {
        const rect = canvasRef.current.getBoundingClientRect();
        const centerX = newX + sticker.width * 0.5;
        const centerY = newY + sticker.height * 0.5;
        const isOutside = centerX < 0 || centerY < 0 || centerX > rect.width || centerY > rect.height;
        setShowTrashOverlay(isOutside);
      }
    } else if (isResizing) {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (rect) {
        const newWidth = Math.max(20, event.clientX - rect.left - sticker.x);
        const newHeight = Math.max(20, event.clientY - rect.top - sticker.y);
        onUpdate(sticker.id, { width: newWidth, height: newHeight });
      }
    } else if (isRotating) {
      const rect = stickerRef.current?.getBoundingClientRect();
      if (rect) {
        const center = { x: rect.left + rect.width * 0.5, y: rect.top + rect.height * 0.5 };
        const angle = Math.atan2(event.clientY - center.y, event.clientX - center.x) * 57.29578;
        onUpdate(sticker.id, { rotation: rotateStart.rotation + (angle - rotateStart.angle) });
      }
    }
  }, [isDragging, isResizing, isRotating, dragStart, rotateStart, sticker, onUpdate, canvasRef]);

  const handleMouseUp = useCallback(() => {
    if (isDragging && showTrashOverlay) {
      onRemove(sticker.id);
    }
    setIsDragging(false);
    setIsResizing(false);
    setIsRotating(false);
    setShowTrashOverlay(false);
  }, [isDragging, showTrashOverlay, onRemove, sticker.id]);

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

  // Touch handlers
  const handleTouchStart = useCallback((event: React.TouchEvent) => {
    event.preventDefault();
    event.stopPropagation();
    
    if (event.touches.length === 1) {
      const touch = event.touches[0];
      setIsDragging(true);
      setDragStart({ x: touch.clientX - sticker.x, y: touch.clientY - sticker.y });
    } else if (event.touches.length === 2) {
      setIsGesturing(true);
      const touch1 = event.touches[0];
      const touch2 = event.touches[1];
      
      const distance = Math.sqrt(Math.pow(touch2.clientX - touch1.clientX, 2) + Math.pow(touch2.clientY - touch1.clientY, 2));
      const angle = Math.atan2(touch2.clientY - touch1.clientY, touch2.clientX - touch1.clientX) * (180 / Math.PI);
      const center = { x: (touch1.clientX + touch2.clientX) / 2, y: (touch1.clientY + touch2.clientY) / 2 };
      
      setInitialTouches({ distance, angle, center });
      setInitialSticker({ width: sticker.width, height: sticker.height, rotation: sticker.rotation || 0, x: sticker.x, y: sticker.y });
    }
  }, [sticker.x, sticker.y, sticker.width, sticker.height, sticker.rotation]);

  const handleTouchMove = useCallback((event: React.TouchEvent) => {
    event.preventDefault();
    
    if (event.touches.length === 1 && isDragging && !isGesturing) {
      const touch = event.touches[0];
      const newX = touch.clientX - dragStart.x;
      const newY = touch.clientY - dragStart.y;
      onUpdate(sticker.id, { x: newX, y: newY });
      
      if (canvasRef.current) {
        const rect = canvasRef.current.getBoundingClientRect();
        const centerX = newX + sticker.width * 0.5;
        const centerY = newY + sticker.height * 0.5;
        const isOutside = centerX < 0 || centerY < 0 || centerX > rect.width || centerY > rect.height;
        setShowTrashOverlay(isOutside);
      }
    } else if (event.touches.length === 2 && isGesturing && initialTouches && initialSticker) {
      const touch1 = event.touches[0];
      const touch2 = event.touches[1];
      
      const distance = Math.sqrt(Math.pow(touch2.clientX - touch1.clientX, 2) + Math.pow(touch2.clientY - touch1.clientY, 2));
      const angle = Math.atan2(touch2.clientY - touch1.clientY, touch2.clientX - touch1.clientX) * (180 / Math.PI);
      const center = { x: (touch1.clientX + touch2.clientX) / 2, y: (touch1.clientY + touch2.clientY) / 2 };
      
      const scaleRatio = distance / initialTouches.distance;
      const newWidth = Math.max(20, initialSticker.width * scaleRatio);
      const newHeight = Math.max(20, initialSticker.height * scaleRatio);
      const rotationDiff = angle - initialTouches.angle;
      const newRotation = initialSticker.rotation + rotationDiff;
      const centerDiff = { x: center.x - initialTouches.center.x, y: center.y - initialTouches.center.y };
      const newX = initialSticker.x + centerDiff.x;
      const newY = initialSticker.y + centerDiff.y;
      
      onUpdate(sticker.id, { width: newWidth, height: newHeight, rotation: newRotation, x: newX, y: newY });
    }
  }, [isDragging, isGesturing, dragStart, initialTouches, initialSticker, sticker.id, sticker.width, sticker.height, onUpdate, canvasRef]);

  const handleTouchEnd = useCallback(() => {
    if (isDragging && showTrashOverlay) {
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
      className={`absolute select-none cursor-move group transition-all duration-200 ${isCurrentStep ? 'z-50' : ''}`}
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
      <img
        src={sticker.src}
        alt="Sticker"
        className={`w-full h-full object-contain pointer-events-none transition-all duration-200 ${
          isPlaying ? stickerAnimation : ''
        } ${isCurrentStep ? 'animate-pulse scale-110 brightness-125' : ''}`}
        style={{
          filter: isCurrentStep ? 'drop-shadow(0 0 15px rgba(255, 215, 0, 0.8))' : 'none'
        }}
        draggable={false}
      />
      
      <div className="absolute -top-10 right-0 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
        <Button size="sm" variant="secondary" className="w-6 h-6 p-0" onClick={(e) => { e.stopPropagation(); onLayerChange(sticker.id, 'up'); }}>
          <ChevronUp className="w-3 h-3" />
        </Button>
        <Button size="sm" variant="secondary" className="w-6 h-6 p-0" onClick={(e) => { e.stopPropagation(); onLayerChange(sticker.id, 'down'); }}>
          <ChevronDown className="w-3 h-3" />
        </Button>
        <Button size="sm" variant="secondary" className="w-6 h-6 p-0" onClick={(e) => { e.stopPropagation(); onUpdate(sticker.id, { mirrored: !sticker.mirrored }); }}>
          <FlipHorizontal className="w-3 h-3" />
        </Button>
        <Button size="sm" variant="destructive" className="w-6 h-6 p-0" onClick={(e) => { e.stopPropagation(); onRemove(sticker.id); }}>
          <Trash2 className="w-3 h-3" />
        </Button>
      </div>
      
      <div className="absolute bottom-0 right-0 w-4 h-4 bg-primary/50 cursor-nw-resize opacity-0 group-hover:opacity-100 transition-opacity" />
      <div className="absolute top-0 right-0 w-4 h-4 bg-secondary/50 cursor-grab opacity-0 group-hover:opacity-100 transition-opacity">
        <RotateCw className="w-3 h-3" />
      </div>
    </div>
  );
};