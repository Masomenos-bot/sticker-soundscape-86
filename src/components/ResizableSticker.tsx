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

  // Real Ethiopian instruments emulation for Yèkèrmo Sèw compatibility (C#/Db, 120 BPM)
  const realEthioInstruments = [
    {
      name: 'mulatu_vibraphone',
      // C# Mixolydian (Tezeta mode) - matches Yèkèrmo Sèw key
      scale: [277.18, 311.13, 349.23, 369.99, 415.30, 466.16, 523.25, 554.37, 622.25, 698.46], 
      waveType: 'sine' as OscillatorType,
      harmonics: [1, 0.8, 0.3, 0.15, 0.05, 0.02], // More complex harmonics for realism
      harmonicGains: [1.0, 0.7, 0.4, 0.2, 0.1, 0.05],
      attack: 0.008,
      decay: 0.15,
      sustain: 0.3, // Shorter sustain like real vibes
      release: 2.8,
      filterFreq: 3200,
      resonance: 1.8,
      melodicPattern: [0, 2, 4, 1, 5, 3, 6, 2], // Mulatu's signature intervals
      tremolo: { rate: 4.5, depth: 0.15 }, // Classic vibraphone tremolo
      reverb: 0.4
    },
    {
      name: 'wurlitzer_piano',
      scale: [138.59, 155.56, 174.61, 185.00, 207.65, 233.08, 261.63, 277.18, 311.13, 349.23],
      waveType: 'sawtooth' as OscillatorType,
      harmonics: [1, 0.9, 0.6, 0.4, 0.2, 0.1],
      harmonicGains: [1.0, 0.8, 0.5, 0.3, 0.2, 0.1],
      attack: 0.02,
      decay: 0.1,
      sustain: 0.7, // Electric piano sustain
      release: 1.5,
      filterFreq: 2800,
      resonance: 2.2,
      melodicPattern: [0, 3, 7, 2, 5, 1, 4, 6], // Jazz chord voicings
      tremolo: { rate: 6.0, depth: 0.08 },
      reverb: 0.3
    },
    {
      name: 'real_krar',
      scale: [207.65, 233.08, 261.63, 311.13, 349.23, 415.30, 466.16, 523.25, 622.25, 698.46],
      waveType: 'triangle' as OscillatorType,
      harmonics: [1, 0.7, 0.4, 0.2, 0.1],
      harmonicGains: [1.0, 0.6, 0.3, 0.15, 0.08],
      attack: 0.015,
      decay: 0.08,
      sustain: 0.2, // Quick plucked decay
      release: 1.2,
      filterFreq: 4500,
      resonance: 4.5,
      melodicPattern: [0, 4, 2, 6, 1, 5, 3, 0], // Traditional krar patterns
      tremolo: { rate: 0, depth: 0 },
      reverb: 0.5
    },
    {
      name: 'masenqo_violin',
      scale: [146.83, 164.81, 185.00, 220.00, 246.94, 293.66, 329.63, 369.99, 440.00, 493.88],
      waveType: 'sawtooth' as OscillatorType,
      harmonics: [1, 0.7, 0.4, 0.2, 0.1],
      harmonicGains: [1.0, 0.8, 0.5, 0.3, 0.15],
      attack: 0.08,
      decay: 0.1,
      sustain: 0.85,
      release: 1.2,
      filterFreq: 2800,
      resonance: 4.5,
      melodicPattern: [0, 2, 5, 3, 7, 4, 1, 6], // Ethiopian violin phrases
      tremolo: { rate: 6.5, depth: 0.12 }, // Bow vibrato
      reverb: 0.35
    },
    {
      name: 'hammond_organ',
      scale: [138.59, 155.56, 174.61, 207.65, 233.08, 277.18, 311.13, 369.99, 415.30, 466.16],
      waveType: 'sawtooth' as OscillatorType,
      harmonics: [1, 0.8, 0.9, 0.7, 0.6, 0.4, 0.3, 0.2, 0.1],
      harmonicGains: [0.8, 0.9, 1.0, 0.8, 0.6, 0.4, 0.3, 0.2, 0.1], // Hammond drawbar simulation
      attack: 0.05,
      decay: 0.02,
      sustain: 0.95,
      release: 0.3,
      filterFreq: 1800,
      resonance: 1.5,
      melodicPattern: [0, 4, 7, 3, 5, 1, 6, 2], // Organ chord progressions
      tremolo: { rate: 6.5, depth: 0.2 }, // Classic Hammond tremolo
      reverb: 0.6
    },
    {
      name: 'electric_bass',
      scale: [69.30, 77.78, 87.31, 103.83, 116.54, 138.59, 155.56, 184.99, 207.65, 233.08],
      waveType: 'sawtooth' as OscillatorType,
      harmonics: [1, 0.8, 0.3, 0.1],
      harmonicGains: [1.0, 0.7, 0.2, 0.05],
      attack: 0.01,
      decay: 0.05,
      sustain: 0.6,
      release: 0.8,
      filterFreq: 800,
      resonance: 2.0,
      melodicPattern: [0, 0, 4, 0, 2, 0, 5, 0], // Walking bass line
      tremolo: { rate: 0, depth: 0 },
      reverb: 0.2
    },
    {
      name: 'washint_real',
      scale: [277.18, 311.13, 349.23, 415.30, 466.16, 554.37, 622.25, 739.99, 830.61, 932.33],
      waveType: 'sine' as OscillatorType,
      harmonics: [1, 0.4, 0.15, 0.05],
      harmonicGains: [1.0, 0.5, 0.2, 0.1],
      attack: 0.15,
      decay: 0.2,
      sustain: 0.8,
      release: 2.5,
      filterFreq: 4200,
      resonance: 1.2,
      melodicPattern: [0, 3, 1, 5, 2, 6, 4, 0], // Flute-like phrases
      tremolo: { rate: 4.0, depth: 0.05 }, // Subtle breath vibrato
      reverb: 0.7
    },
    {
      name: 'congas_ethio',
      scale: [174.61, 196.00, 220.00, 246.94, 277.18, 311.13, 349.23, 392.00, 440.00, 493.88],
      waveType: 'triangle' as OscillatorType,
      harmonics: [1, 2.1, 1.4, 0.8, 0.3],
      harmonicGains: [1.0, 0.4, 0.3, 0.1, 0.05],
      attack: 0.001,
      decay: 0.03,
      sustain: 0.1,
      release: 0.25,
      filterFreq: 1200,
      resonance: 12.0, // Very resonant for percussion
      melodicPattern: [0, 0, 2, 0, 3, 0, 1, 2], // Percussion rhythm
      tremolo: { rate: 0, depth: 0 },
      reverb: 0.3
    }
  ];

  // Play step sound when this sticker is the current step
  const playStepSound = useCallback(async () => {
    if (!audioContextRef.current || !isCurrentStep || !isPlaying) return;

    try {
      console.log(`Playing step ${sticker.stepIndex} for sticker ${sticker.id}`);
      
      // Select real Ethiopian instrument based on sticker ID hash
      const instrumentIndex = sticker.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % realEthioInstruments.length;
      const instrument = realEthioInstruments[instrumentIndex];
      
      // Get melodic note based on step index
      const noteIndex = instrument.melodicPattern[sticker.stepIndex % instrument.melodicPattern.length];
      const noteFreq = instrument.scale[noteIndex % instrument.scale.length];
      
      // Calculate volume based on sticker size and position - softer for pleasant sound
      const sizeRatio = (sticker.width + sticker.height) / 160;
      const volume = Math.min(sizeRatio * globalVolume * sticker.volume * 0.12, 0.15);
      
      console.log(`${instrument.name} playing ${noteFreq}Hz at volume ${volume}`);
      
      // Create realistic sound with advanced synthesis techniques
      const now = audioContextRef.current.currentTime;
      
      // Add tremolo effect if instrument has it
      let tremoloNode = null;
      if (instrument.tremolo && instrument.tremolo.rate > 0) {
        const tremoloLFO = audioContextRef.current.createOscillator();
        const tremoloGain = audioContextRef.current.createGain();
        tremoloLFO.type = 'sine';
        tremoloLFO.frequency.setValueAtTime(instrument.tremolo.rate, now);
        tremoloGain.gain.setValueAtTime(instrument.tremolo.depth, now);
        tremoloLFO.connect(tremoloGain);
        tremoloNode = { lfo: tremoloLFO, gain: tremoloGain };
      }
      
      for (let i = 0; i < instrument.harmonics.length; i++) {
        const osc = audioContextRef.current.createOscillator();
        const gain = audioContextRef.current.createGain();
        const filter = audioContextRef.current.createBiquadFilter();
        
        // Enhanced oscillator with realistic pitch variations
        osc.type = i === 0 ? instrument.waveType : 'sine';
        const baseFreq = noteFreq * instrument.harmonics[i];
        const pitchVariation = (Math.random() - 0.5) * 0.01; // ±1 cent natural variation
        osc.frequency.setValueAtTime(baseFreq * (1 + pitchVariation), now);
        
        // Add subtle frequency modulation for organic sound
        if (!['congas_ethio', 'ethio_percussion'].includes(instrument.name)) {
          const vibrato = audioContextRef.current.createOscillator();
          const vibratoGain = audioContextRef.current.createGain();
          vibrato.type = 'sine';
          vibrato.frequency.setValueAtTime(5.5 + Math.random() * 1.5, now); // 5.5-7 Hz vibrato
          vibratoGain.gain.setValueAtTime(0.8, now); // Subtle pitch modulation
          vibrato.connect(vibratoGain);
          vibratoGain.connect(osc.frequency);
          vibrato.start(now);
          vibrato.stop(now + instrument.release);
        }
        
        // Realistic envelope with micro-variations
        const harmonicGain = instrument.harmonicGains[i] * volume * (0.95 + Math.random() * 0.1); // ±5% variation
        const attackTime = instrument.attack * (0.9 + Math.random() * 0.2); // Natural timing variation
        const decayTime = instrument.decay * (0.8 + Math.random() * 0.4);
        const sustainLevel = Math.max(harmonicGain * instrument.sustain, 0.001);
        const releaseTime = instrument.release * (0.9 + Math.random() * 0.2);
        
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(harmonicGain, now + attackTime);
        gain.gain.exponentialRampToValueAtTime(sustainLevel, now + attackTime + decayTime);
        gain.gain.exponentialRampToValueAtTime(0.001, now + releaseTime);
        
        // Enhanced filtering for more realistic timbre
        filter.type = 'lowpass';
        const filterFreq = instrument.filterFreq + (noteFreq * 0.2) + (Math.random() - 0.5) * 100;
        filter.frequency.setValueAtTime(filterFreq, now);
        filter.Q.setValueAtTime(instrument.resonance + (Math.random() - 0.5) * 0.5, now);
        
        // Add filter envelope for more expression
        const filterEnvelope = audioContextRef.current.createGain();
        filterEnvelope.gain.setValueAtTime(1, now);
        filterEnvelope.gain.exponentialRampToValueAtTime(0.7, now + attackTime + decayTime);
        filterEnvelope.connect(filter.frequency);
        
        // Connect audio chain
        osc.connect(filter);
        filter.connect(gain);
        
        // Apply tremolo if available
        if (tremoloNode) {
          const tremoloMod = audioContextRef.current.createGain();
          tremoloMod.gain.setValueAtTime(1, now);
          tremoloNode.gain.connect(tremoloMod.gain);
          gain.connect(tremoloMod);
          tremoloMod.connect(audioContextRef.current.destination);
        } else {
          gain.connect(audioContextRef.current.destination);
        }
        
        // Start oscillators
        osc.start(now);
        osc.stop(now + releaseTime);
        
        if (tremoloNode && i === 0) {
          tremoloNode.lfo.start(now);
          tremoloNode.lfo.stop(now + releaseTime);
        }
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
      className={`absolute select-none cursor-move group transition-all duration-200 ${
        isCurrentStep ? 'z-50' : ''
      }`}
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
        className={`w-full h-full object-contain pointer-events-none transition-all duration-200 ${
          isPlaying ? stickerAnimation : ''
        } ${isCurrentStep ? 'animate-pulse scale-110 brightness-125' : ''}`}
        style={{
          filter: isCurrentStep ? 'drop-shadow(0 0 15px rgba(255, 215, 0, 0.8))' : 'none'
        }}
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