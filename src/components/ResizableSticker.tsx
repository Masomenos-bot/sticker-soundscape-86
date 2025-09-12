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
  globalScaleMode: string;
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
  globalScaleMode,
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

  // Enhanced Ethiopian Musical Scales
  const ethioScales = useMemo(() => ({
    tizita: [261.63, 293.66, 311.13, 349.23, 392.00, 415.30, 466.16, 523.25], // C-D-Eb-F-G-Ab-Bb-C
    bati: [261.63, 277.18, 329.63, 349.23, 392.00, 415.30, 493.88, 523.25], // C-Db-E-F-G-Ab-B-C
    ambassel: [261.63, 293.66, 329.63, 369.99, 392.00, 440.00, 493.88, 523.25], // C-D-E-F#-G-A-B-C
    anchihoye: [261.63, 277.18, 311.13, 369.99, 392.00, 415.30, 466.16, 523.25], // C-Db-Eb-F#-G-Ab-Bb-C
    yekermo: [246.94, 277.18, 311.13, 349.23, 392.00, 415.30, 466.16, 493.88], // B-Db-Eb-F-G-Ab-Bb-B
  }), []);

  // Expanded Ethiopian instruments with better synthesis
  const ethioInstruments = useMemo(() => [
    {
      name: 'krar_traditional',
      scale: ethioScales.tizita,
      waveType: 'sawtooth' as OscillatorType,
      harmonics: [1, 0.7, 0.5, 0.3, 0.2],
      harmonicGains: [1.0, 0.6, 0.4, 0.2, 0.1],
      attack: 0.01,
      decay: 0.1,
      sustain: 0.3,
      release: 1.2,
      filterFreq: 2800,
      resonance: 4.0,
      rhythmPattern: [1, 0, 1, 0, 1, 1, 0, 1], // 8-beat polyrhythm
      chordIntervals: [0, 2, 4], // Traditional triads
      scaleMode: 'tizita'
    },
    {
      name: 'masinko_violin',
      scale: ethioScales.bati,
      waveType: 'sine' as OscillatorType,
      harmonics: [1, 0.8, 0.4, 0.2],
      harmonicGains: [1.0, 0.7, 0.3, 0.15],
      attack: 0.15,
      decay: 0.05,
      sustain: 0.8,
      release: 0.6,
      filterFreq: 5000,
      resonance: 2.0,
      rhythmPattern: [1, 0, 0, 1, 0, 1, 0, 0], // Syncopated
      chordIntervals: [0, 3, 5], // Quartal harmony
      scaleMode: 'bati'
    },
    {
      name: 'washint_flute',
      scale: ethioScales.ambassel,
      waveType: 'sine' as OscillatorType,
      harmonics: [1, 0.3, 0.1],
      harmonicGains: [1.0, 0.4, 0.2],
      attack: 0.2,
      decay: 0.1,
      sustain: 0.7,
      release: 0.8,
      filterFreq: 6000,
      resonance: 1.5,
      rhythmPattern: [1, 0, 1, 1, 0, 0, 1, 0], // Melodic rhythm
      chordIntervals: [0, 2, 5], // Pentatonic-based
      scaleMode: 'ambassel'
    },
    {
      name: 'kebero_drum',
      scale: ethioScales.anchihoye.map(f => f * 0.5), // Lower octave
      waveType: 'triangle' as OscillatorType,
      harmonics: [1, 2.1, 1.5],
      harmonicGains: [1.0, 0.4, 0.2],
      attack: 0.001,
      decay: 0.02,
      sustain: 0.1,
      release: 0.3,
      filterFreq: 800,
      resonance: 12.0,
      rhythmPattern: [1, 0, 1, 0, 1, 1, 1, 0], // Complex polyrhythm
      chordIntervals: [0], // No chords for percussion
      scaleMode: 'anchihoye'
    },
    {
      name: 'begena_harp',
      scale: ethioScales.yekermo,
      waveType: 'triangle' as OscillatorType,
      harmonics: [1, 0.5, 0.3, 0.2, 0.1],
      harmonicGains: [1.0, 0.6, 0.4, 0.3, 0.2],
      attack: 0.05,
      decay: 0.2,
      sustain: 0.4,
      release: 2.0,
      filterFreq: 3500,
      resonance: 2.5,
      rhythmPattern: [1, 0, 0, 1, 0, 0, 1, 1], // Arpeggiated
      chordIntervals: [0, 2, 4, 6], // Extended chords
      scaleMode: 'yekermo'
    },
    {
      name: 'tom_drum',
      scale: [87.31, 98.00, 110.00, 123.47, 130.81, 146.83, 164.81, 174.61], // Lower frequencies
      waveType: 'triangle' as OscillatorType,
      harmonics: [1, 1.8, 0.8],
      harmonicGains: [1.0, 0.5, 0.2],
      attack: 0.001,
      decay: 0.015,
      sustain: 0.08,
      release: 0.4,
      filterFreq: 1200,
      resonance: 8.0,
      rhythmPattern: [1, 1, 0, 1, 0, 0, 1, 0], // Driving rhythm
      chordIntervals: [0], // No chords for percussion
      scaleMode: 'tizita'
    },
    {
      name: 'sistrum_bells',
      scale: ethioScales.tizita.map(f => f * 2), // Higher octave
      waveType: 'sine' as OscillatorType,
      harmonics: [1, 0.8, 0.4, 0.2, 0.1],
      harmonicGains: [1.0, 0.6, 0.3, 0.15, 0.08],
      attack: 0.01,
      decay: 0.05,
      sustain: 0.2,
      release: 1.5,
      filterFreq: 8000,
      resonance: 3.0,
      rhythmPattern: [0, 1, 0, 1, 0, 1, 0, 1], // Constant rhythm
      chordIntervals: [0, 4, 7], // Bright triads
      scaleMode: 'tizita'
    },
    {
      name: 'dohol_bass',
      scale: [65.41, 73.42, 82.41, 87.31, 98.00, 110.00, 123.47, 130.81], // Bass frequencies
      waveType: 'sawtooth' as OscillatorType,
      harmonics: [1, 0.8, 0.3],
      harmonicGains: [1.0, 0.4, 0.2],
      attack: 0.001,
      decay: 0.03,
      sustain: 0.15,
      release: 0.6,
      filterFreq: 600,
      resonance: 6.0,
      rhythmPattern: [1, 0, 0, 0, 1, 0, 1, 0], // Sparse bass pattern
      chordIntervals: [0, 7], // Octaves and fifths
      scaleMode: 'bati'
    }
  ], [ethioScales]);

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

  // Function to play MP3 files
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
      
      await audioClone.play();
    } catch (error) {
      console.error("MP3 playback error:", error);
    }
  }, [globalVolume, sticker.volume]);

  // Enhanced polyrhythmic step sound with scale-aware note selection and chord playing
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
      if (!audioContextRef.current) return;
        
      const instrumentIndex = stickerProps.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % ethioInstruments.length;
      const instrument = ethioInstruments[instrumentIndex];
      
      // Polyrhythmic pattern check - only play if rhythm pattern allows
      const rhythmStep = stickerProps.stepIndex % instrument.rhythmPattern.length;
      if (!instrument.rhythmPattern[rhythmStep]) return;
      
      // Use sticker's scale mode or global scale mode
      const currentScaleMode = sticker.scaleMode || globalScaleMode;
      const currentScale = ethioScales[currentScaleMode as keyof typeof ethioScales] || instrument.scale;
      
      // Scale-aware note selection based on sticker position and size
      const scalePosition = Math.floor((stickerProps.width + stickerProps.height) / 40) % currentScale.length;
      const noteFreq = currentScale[scalePosition];
      
      // Chord playing - play multiple notes based on sticker size
      const shouldPlayChord = stickerProps.width > 120 || stickerProps.height > 120;
      const notesToPlay = shouldPlayChord ? instrument.chordIntervals : [0];
      
      const baseVolume = Math.min((stickerProps.width + stickerProps.height) / 200 * globalVolume * stickerProps.volume * 0.08, 0.12);
      const now = audioContextRef.current.currentTime;
      
        // Play each note in the chord (or single note)
        notesToPlay.forEach((interval, chordIndex) => {
          const chordNoteIndex = (scalePosition + interval) % currentScale.length;
          const chordNoteFreq = currentScale[chordNoteIndex];
        const chordVolume = baseVolume / Math.sqrt(notesToPlay.length); // Reduce volume for chords
        
        // Create harmonics for each chord note
        for (let i = 0; i < instrument.harmonics.length; i++) {
          const osc = audioContextRef.current.createOscillator();
          const gain = audioContextRef.current.createGain();
          const filter = audioContextRef.current.createBiquadFilter();
          const panner = audioContextRef.current.createStereoPanner();
          
          osc.type = instrument.waveType;
          osc.frequency.setValueAtTime(chordNoteFreq * instrument.harmonics[i], now);
          
          // Stereo positioning based on chord note
          panner.pan.setValueAtTime((chordIndex - notesToPlay.length / 2) * 0.3, now);
          
          const harmonicGain = instrument.harmonicGains[i] * chordVolume;
          gain.gain.setValueAtTime(0, now);
          gain.gain.linearRampToValueAtTime(harmonicGain, now + instrument.attack);
          gain.gain.exponentialRampToValueAtTime(Math.max(harmonicGain * instrument.sustain, 0.001), now + instrument.attack + instrument.decay);
          gain.gain.exponentialRampToValueAtTime(0.001, now + instrument.release);
          
          // Enhanced filtering with modulation
          filter.type = 'lowpass';
          filter.frequency.setValueAtTime(instrument.filterFreq, now);
          filter.frequency.exponentialRampToValueAtTime(instrument.filterFreq * 0.7, now + instrument.release);
          filter.Q.setValueAtTime(instrument.resonance, now);
          
          // Add subtle vibrato for melodic instruments
          if (instrument.name.includes('flute') || instrument.name.includes('violin')) {
            const lfo = audioContextRef.current.createOscillator();
            const lfoGain = audioContextRef.current.createGain();
            lfo.frequency.setValueAtTime(5, now); // 5Hz vibrato
            lfoGain.gain.setValueAtTime(chordNoteFreq * 0.02, now); // 2% modulation depth
            lfo.connect(lfoGain);
            lfoGain.connect(osc.frequency);
            lfo.start(now);
            lfo.stop(now + instrument.release);
          }
          
          osc.connect(filter);
          filter.connect(gain);
          gain.connect(panner);
          panner.connect(audioContextRef.current.destination);
          
          osc.start(now + chordIndex * 0.01); // Slight chord spread
          osc.stop(now + instrument.release);
        }
      });
      
    } catch (error) {
      console.error("Audio error:", error);
    }
  }, [isCurrentStep, isPlaying, globalVolume, ethioInstruments, sticker.soundUrl, playMp3Sound]);

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
    
    // Simple click to select/deselect
    if (event.ctrlKey || event.metaKey) {
      // Multi-select with Ctrl/Cmd
      onSelect(sticker.id, !isSelected);
      return;
    } else {
      // Simple click - select this sticker only
      onSelect(sticker.id, true);
    }
    
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
  }, [sticker.x, sticker.y, sticker.rotation, sticker.id, isSelected, onSelect]);

  const handleMouseMove = useCallback((event: MouseEvent) => {
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
  }, [isDragging, isResizing, isRotating, dragStart, rotateStart, sticker, onUpdate, canvasRef, isSelected, isMultiSelectMode, onGroupMove]);

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
        className={`absolute select-none cursor-move group transition-all duration-150 ease-out ${
          isCurrentStep ? 'z-50' : ''
        } ${isSelected ? 'opacity-75' : ''}`}
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
      
      {/* Scale Mode Indicator */}
      {isSelected && (
        <div className="absolute -top-6 left-0 right-0 text-center">
          <div className="inline-block px-2 py-1 text-xs font-bold bg-primary/80 text-primary-foreground rounded-full">
            {sticker.scaleMode || globalScaleMode || 'tizita'}
          </div>
        </div>
      )}
      
      {/* Rhythm Pattern Indicator */}
      {isPlaying && (
        <div className="absolute -bottom-8 left-0 right-0 flex justify-center">
          <div className="flex gap-1">
            {ethioInstruments[sticker.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % ethioInstruments.length]?.rhythmPattern.map((beat, index) => (
              <div
                key={index}
                className={`w-2 h-2 rounded-full transition-all duration-100 ${
                  beat === 1 
                    ? (index === (sticker.stepIndex % 8) ? 'bg-accent scale-125' : 'bg-primary/60') 
                    : 'bg-muted/40'
                }`}
              />
            )) || []}
          </div>
        </div>
      )}
      
      {/* Chord Indicator for Large Stickers */}
      {(sticker.width > 120 || sticker.height > 120) && isCurrentStep && (
        <div className="absolute top-2 right-2">
          <div className="w-3 h-3 bg-accent rounded-full animate-pulse">
            <div className="w-full h-full bg-accent-foreground/20 rounded-full animate-ping"></div>
          </div>
        </div>
      )}
      
    </div>
  );
};