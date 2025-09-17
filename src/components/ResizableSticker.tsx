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
  isSelected: boolean;
  isMultiSelectMode: boolean;
  onSelect: (id: string, isSelected: boolean) => void;
  onGroupMove: (deltaX: number, deltaY: number) => void;
  audioContext?: AudioContext | null;
  masterGain?: GainNode | null;
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
  isSelected,
  isMultiSelectMode,
  onSelect,
  onGroupMove,
  audioContext,
  masterGain,
}: ResizableStickerProps) => {
  const stickerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [isRotating, setIsRotating] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [rotateStart, setRotateStart] = useState({ angle: 0, rotation: 0 });
  const [isGesturing, setIsGesturing] = useState(false);
  const [initialTouches, setInitialTouches] = useState<{ distance: number; angle: number; center: { x: number; y: number } } | null>(null);
  const [initialSticker, setInitialSticker] = useState<{ width: number; height: number; rotation: number; x: number; y: number } | null>(null);
  const [showTrashOverlay, setShowTrashOverlay] = useState(false);
  
  // Refs to track interaction intentions without triggering re-renders
  const dragIntentionRef = useRef<{ 
    isIntending: boolean; 
    startX: number; 
    startY: number; 
    threshold: number;
    selectionPending: boolean;
    ctrlKey: boolean;
  }>({ isIntending: false, startX: 0, startY: 0, threshold: 5, selectionPending: false, ctrlKey: false });

  // Animation selection
  const stickerAnimation = useMemo(() => {
    const animations = ['animate-float-circular', 'animate-float-circular-2', 'animate-float-circular-3', 'animate-float-wobble', 'animate-float-bounce'];
    const hash = sticker.id.split('').reduce((a, b) => { a = ((a << 5) - a) + b.charCodeAt(0); return a & a; }, 0);
    return animations[Math.abs(hash) % animations.length];
  }, [sticker.id]);

  // Unique settings for each note in contemplative instruments
  const gentleInstruments = useMemo(() => [
    {
      name: 'soft_bells',
      scale: [261.63, 293.66, 329.63, 369.99, 415.30, 466.16, 523.25, 587.33], // C Major
      waveType: 'sine' as OscillatorType,
      harmonics: [1],
      harmonicGains: [1.0],
      // Individual settings for each note
      attacks: [0.01, 0.02, 0.01, 0.03, 0.015, 0.02, 0.01, 0.025],
      decays: [0.05, 0.08, 0.04, 0.1, 0.06, 0.07, 0.03, 0.09],
      sustains: [0.2, 0.15, 0.25, 0.1, 0.3, 0.18, 0.35, 0.12],
      releases: [0.3, 0.4, 0.25, 0.5, 0.35, 0.45, 0.2, 0.6],
      filterFreqs: [2000, 2200, 1800, 2400, 1900, 2100, 2300, 1700],
      resonances: [0.5, 0.3, 0.7, 0.4, 0.6, 0.2, 0.8, 0.5],
      pattern: [0, 2, 4, 2, 0, 4, 2, 0]
    },
    {
      name: 'warm_pad',
      scale: [196.00, 220.00, 246.94, 261.63, 293.66, 329.63, 369.99, 415.30], // G Major
      waveType: 'sine' as OscillatorType,
      harmonics: [1, 0.3],
      harmonicGains: [1.0, 0.4],
      attacks: [0.02, 0.04, 0.01, 0.05, 0.03, 0.02, 0.06, 0.01],
      decays: [0.08, 0.12, 0.06, 0.15, 0.1, 0.09, 0.18, 0.05],
      sustains: [0.1, 0.15, 0.08, 0.2, 0.12, 0.18, 0.05, 0.25],
      releases: [0.4, 0.6, 0.3, 0.8, 0.5, 0.7, 0.9, 0.35],
      filterFreqs: [1200, 1000, 1400, 800, 1300, 1100, 900, 1500],
      resonances: [0.3, 0.5, 0.2, 0.6, 0.4, 0.3, 0.7, 0.1],
      pattern: [0, 0, 2, 2, 4, 4, 2, 0]
    },
    {
      name: 'gentle_chime',
      scale: [293.66, 329.63, 369.99, 415.30, 466.16, 523.25, 587.33, 659.25], // D Major
      waveType: 'triangle' as OscillatorType,
      harmonics: [1],
      harmonicGains: [1.0],
      attacks: [0.01, 0.015, 0.008, 0.02, 0.012, 0.018, 0.006, 0.025],
      decays: [0.06, 0.09, 0.04, 0.12, 0.07, 0.1, 0.03, 0.15],
      sustains: [0.1, 0.08, 0.15, 0.05, 0.2, 0.12, 0.25, 0.06],
      releases: [0.25, 0.35, 0.2, 0.45, 0.3, 0.4, 0.15, 0.5],
      filterFreqs: [3000, 3200, 2800, 3400, 2900, 3100, 3300, 2700],
      resonances: [0.2, 0.4, 0.1, 0.5, 0.3, 0.2, 0.6, 0.15],
      pattern: [0, 4, 2, 6, 4, 0, 2, 4]
    },
    {
      name: 'soft_drone',
      scale: [146.83, 164.81, 174.61, 196.00, 220.00, 246.94, 261.63, 293.66], // Low range
      waveType: 'sawtooth' as OscillatorType,
      harmonics: [1],
      harmonicGains: [1.0],
      attacks: [0.05, 0.08, 0.03, 0.1, 0.06, 0.07, 0.04, 0.09],
      decays: [0.1, 0.15, 0.08, 0.18, 0.12, 0.14, 0.06, 0.2],
      sustains: [0.15, 0.1, 0.2, 0.08, 0.25, 0.12, 0.3, 0.05],
      releases: [0.5, 0.7, 0.4, 0.8, 0.6, 0.75, 0.3, 0.9],
      filterFreqs: [400, 350, 450, 300, 420, 380, 480, 320],
      resonances: [0.1, 0.2, 0.05, 0.25, 0.15, 0.1, 0.3, 0.08],
      pattern: [0, 0, 0, 2, 0, 0, 4, 0]
    },
    {
      name: 'ambient_texture',
      scale: [220.00, 246.94, 277.18, 311.13, 349.23, 392.00, 440.00, 493.88], // A Minor
      waveType: 'sine' as OscillatorType,
      harmonics: [1, 0.2],
      harmonicGains: [1.0, 0.3],
      attacks: [0.03, 0.05, 0.02, 0.07, 0.04, 0.06, 0.01, 0.08],
      decays: [0.1, 0.14, 0.08, 0.16, 0.12, 0.15, 0.06, 0.18],
      sustains: [0.08, 0.12, 0.06, 0.15, 0.1, 0.14, 0.04, 0.18],
      releases: [0.35, 0.5, 0.25, 0.6, 0.4, 0.55, 0.2, 0.7],
      filterFreqs: [1800, 1600, 2000, 1400, 1900, 1700, 2100, 1300],
      resonances: [0.4, 0.6, 0.3, 0.7, 0.5, 0.4, 0.8, 0.2],
      pattern: [0, 3, 0, 5, 0, 2, 0, 4]
    }
  ], []);

  // Use shared audio context from props

  // Reference to prevent audio jitter during sticker modifications
  const stickerPropsRef = useRef({
    id: sticker.id,
    width: sticker.width,
    height: sticker.height,
    volume: sticker.volume,
    stepIndex: sticker.stepIndex
  });

  // Update ref only when needed
  useEffect(() => {
    stickerPropsRef.current = {
      id: sticker.id,
      width: sticker.width,
      height: sticker.height,
      volume: sticker.volume,
      stepIndex: sticker.stepIndex
    };
  }, [sticker.id, sticker.width, sticker.height, sticker.volume, sticker.stepIndex]);

  // Audio cache for MP3 files
  const audioCache = new Map<string, HTMLAudioElement>();

  // Function to play MP3 files with Web Audio API routing
  const playMp3Sound = useCallback(async (soundUrl: string) => {
    try {
      let audio = audioCache.get(soundUrl);
      
      if (!audio) {
        audio = new Audio(soundUrl);
        audio.preload = 'auto';
        audioCache.set(soundUrl, audio);
      }
      
      // Clone audio for overlapping playback
      const audioClone = audio.cloneNode() as HTMLAudioElement;
      audioClone.volume = Math.min(globalVolume * sticker.volume * 0.8, 1.0);
      
      // Route MP3 audio through Web Audio API for recording
      if (audioContext && masterGain) {
        try {
          const mediaElementSource = audioContext.createMediaElementSource(audioClone);
          mediaElementSource.connect(masterGain);
          console.log('🎵 MP3 routed through Web Audio API for recording');
        } catch (error) {
          console.log('🎵 MP3 using direct playback (source already exists)');
        }
      }
      
      await audioClone.play();
    } catch (error) {
      console.error("MP3 playback error:", error);
    }
  }, [globalVolume, sticker.volume, audioContext, masterGain]);

  // Optimized step sound with MP3 support
  const playStepSound = useCallback(async () => {
    if (!isCurrentStep || !isPlaying) return;

    try {
      const stickerProps = stickerPropsRef.current;
      
      // Check if this sticker has a custom MP3 sound
      if (sticker.soundUrl && sticker.soundUrl.endsWith('.mp3')) {
        await playMp3Sound(sticker.soundUrl);
        return;
      }

      // Fallback to synthetic audio if no MP3 or audio context available
      if (!audioContext || !masterGain) return;
        
      const instrumentIndex = stickerProps.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % gentleInstruments.length;
      const instrument = gentleInstruments[instrumentIndex];
      
      const noteIndex = instrument.pattern[stickerProps.stepIndex % instrument.pattern.length];
      const noteFreq = instrument.scale[noteIndex % instrument.scale.length];
      
      const volume = Math.min((stickerProps.width + stickerProps.height) / 160 * globalVolume * stickerProps.volume * 0.05, 0.08);
      const now = audioContext.currentTime;
      
      // Simplified audio generation with individual note settings
      for (let i = 0; i < instrument.harmonics.length; i++) {
        const osc = audioContext.createOscillator();
        const gain = audioContext.createGain();
        const filter = audioContext.createBiquadFilter();
        
        osc.type = instrument.waveType;
        osc.frequency.setValueAtTime(noteFreq * instrument.harmonics[i], now);
        
        // Use individual note settings
        const attack = instrument.attacks[noteIndex];
        const decay = instrument.decays[noteIndex];
        const sustain = instrument.sustains[noteIndex];
        const release = instrument.releases[noteIndex];
        const filterFreq = instrument.filterFreqs[noteIndex];
        const resonance = instrument.resonances[noteIndex];
        
        const harmonicGain = instrument.harmonicGains[i] * volume;
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(harmonicGain, now + attack);
        gain.gain.exponentialRampToValueAtTime(Math.max(harmonicGain * sustain, 0.001), now + attack + decay);
        gain.gain.exponentialRampToValueAtTime(0.001, now + attack + decay + release);
        
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(filterFreq, now);
        filter.Q.setValueAtTime(resonance, now);
        
        osc.connect(filter);
        filter.connect(gain);
        gain.connect(masterGain);
        
        console.log('🎼 Synthetic sound routed to master gain for recording');
        
        osc.start(now);
        osc.stop(now + attack + decay + release);
      }
      
    } catch (error) {
      console.error("Audio error:", error);
    }
  }, [isCurrentStep, isPlaying, globalVolume, gentleInstruments, sticker.soundUrl, playMp3Sound]);

  // Stable audio trigger effect
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
      // Track drag intention without immediate state updates
      dragIntentionRef.current = {
        isIntending: true,
        startX: event.clientX,
        startY: event.clientY,
        threshold: 5,
        selectionPending: true,
        ctrlKey: event.ctrlKey || event.metaKey
      };
      
      setDragStart({ x: event.clientX - sticker.x, y: event.clientY - sticker.y });
    }
  }, [sticker.x, sticker.y, sticker.rotation]);

  const handleMouseMove = useCallback((event: MouseEvent) => {
    // Handle drag intention with threshold
    if (dragIntentionRef.current.isIntending) {
      const deltaX = Math.abs(event.clientX - dragIntentionRef.current.startX);
      const deltaY = Math.abs(event.clientY - dragIntentionRef.current.startY);
      const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
      
      if (distance > dragIntentionRef.current.threshold) {
        // Commit to drag - handle selection first, then start dragging
        if (dragIntentionRef.current.selectionPending) {
          if (dragIntentionRef.current.ctrlKey) {
            onSelect(sticker.id, !isSelected);
          } else if (!isSelected) {
            onSelect(sticker.id, true);
          }
        }
        
        // Start actual dragging
        setIsDragging(true);
        dragIntentionRef.current.isIntending = false;
        dragIntentionRef.current.selectionPending = false;
      }
    }
    
    if (isDragging) {
      const newX = event.clientX - dragStart.x;
      const newY = event.clientY - dragStart.y;
      
      if (isSelected && isMultiSelectMode) {
        // Move all selected stickers together
        const deltaX = newX - sticker.x;
        const deltaY = newY - sticker.y;
        onGroupMove(deltaX, deltaY);
      } else {
        // Move only this sticker
        onUpdate(sticker.id, { x: newX, y: newY });
      }
      
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
        const newWidth = Math.max(30, Math.min(300, event.clientX - rect.left - sticker.x));
        const newHeight = Math.max(30, Math.min(300, event.clientY - rect.top - sticker.y));
        onUpdate(sticker.id, { width: newWidth, height: newHeight });
      }
    } else if (isRotating) {
      const rect = stickerRef.current?.getBoundingClientRect();
      if (rect) {
        const center = { x: rect.left + rect.width * 0.5, y: rect.top + rect.height * 0.5 };
        const angle = Math.atan2(event.clientY - center.y, event.clientX - center.x) * 57.29578;
        const newRotation = rotateStart.rotation + (angle - rotateStart.angle);
        // Snap to 15-degree increments when close
        const snappedRotation = Math.round(newRotation / 15) * 15;
        const finalRotation = Math.abs(newRotation - snappedRotation) < 5 ? snappedRotation : newRotation;
        onUpdate(sticker.id, { rotation: finalRotation });
      }
    }
  }, [isDragging, isResizing, isRotating, dragStart, rotateStart, sticker, onUpdate, canvasRef, isSelected, isMultiSelectMode, onGroupMove, onSelect]);

  const handleMouseUp = useCallback(() => {
    // Handle click selection if drag intention never became actual drag
    if (dragIntentionRef.current.isIntending && dragIntentionRef.current.selectionPending) {
      if (dragIntentionRef.current.ctrlKey) {
        onSelect(sticker.id, !isSelected);
      } else if (!isSelected) {
        onSelect(sticker.id, true);
      }
    }
    
    // Clean up drag intention
    dragIntentionRef.current = {
      isIntending: false,
      startX: 0,
      startY: 0,
      threshold: 5,
      selectionPending: false,
      ctrlKey: false
    };
    
    if (isDragging && showTrashOverlay) {
      onRemove(sticker.id);
    }
    setIsDragging(false);
    setIsResizing(false);
    setIsRotating(false);
    setShowTrashOverlay(false);
  }, [isDragging, showTrashOverlay, onRemove, sticker.id, onSelect, isSelected]);

  useEffect(() => {
    if (isDragging || isResizing || isRotating || dragIntentionRef.current.isIntending) {
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
        className={`absolute select-none cursor-grab active:cursor-grabbing group transition-all duration-150 ease-out ${
          isCurrentStep ? 'z-50' : ''
        } ${isSelected ? 'ring-2 ring-primary/50' : ''} ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
        style={{
        left: `${sticker.x}px`,
        top: `${sticker.y}px`,
        width: `${sticker.width}px`,
        height: `${sticker.height}px`,
        transform: `rotate(${sticker.rotation || 0}deg) scaleX(${sticker.mirrored ? -1 : 1})`,
        zIndex: sticker.zIndex,
        touchAction: 'none',
        willChange: 'transform',
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
        draggable={false}
      />
      
    </div>
  );
};