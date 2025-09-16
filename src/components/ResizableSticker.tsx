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

  // Unique settings for each note in contemplative instruments
  const gentleInstruments = useMemo(() => [
    {
      name: 'crystalline_bells',
      scale: [220.00, 246.94, 261.63, 293.66, 329.63, 349.23, 392.00, 440.00], // A Minor
      waveType: 'sine' as OscillatorType,
      harmonics: [1, 0.6, 0.3],
      harmonicGains: [1.0, 0.4, 0.2],
      // Each note crafted with distinct personality - crystalline clarity
      attacks: [0.001, 0.003, 0.002, 0.001, 0.004, 0.002, 0.001, 0.003], // Crystal sharp attacks
      decays: [0.15, 0.08, 0.12, 0.20, 0.06, 0.18, 0.25, 0.10], // Varied shimmer decay
      sustains: [0.3, 0.1, 0.2, 0.4, 0.05, 0.35, 0.5, 0.15], // Selective sustain hold
      releases: [0.8, 0.4, 0.6, 1.2, 0.3, 0.9, 1.5, 0.5], // Long ethereal releases
      filterFreqs: [4200, 3800, 4500, 5200, 3600, 4800, 5800, 3400], // Bright sparkle
      resonances: [0.15, 0.35, 0.08, 0.25, 0.5, 0.12, 0.4, 0.6], // Selective resonance
      pattern: [0, 2, 4, 7, 2, 5, 1, 6]
    },
    {
      name: 'velvet_pad',
      scale: [220.00, 246.94, 261.63, 293.66, 329.63, 349.23, 392.00, 440.00], // A Minor
      waveType: 'triangle' as OscillatorType,
      harmonics: [1, 0.8, 0.4, 0.2],
      harmonicGains: [1.0, 0.6, 0.3, 0.15],
      // Warm, enveloping textures with individual character
      attacks: [0.08, 0.12, 0.05, 0.15, 0.10, 0.06, 0.18, 0.04], // Gentle blooms
      decays: [0.3, 0.2, 0.4, 0.15, 0.35, 0.45, 0.1, 0.5], // Rich texture decay
      sustains: [0.6, 0.4, 0.8, 0.3, 0.7, 0.9, 0.2, 0.85], // Deep sustain holds
      releases: [1.5, 0.8, 2.0, 0.6, 1.8, 2.5, 0.4, 2.2], // Luxurious fades
      filterFreqs: [800, 1200, 600, 1500, 700, 1000, 1800, 500], // Warm spectrum
      resonances: [0.2, 0.4, 0.1, 0.6, 0.3, 0.15, 0.8, 0.05], // Soft emphasis
      pattern: [0, 1, 3, 2, 5, 4, 6, 3]
    },
    {
      name: 'moonlight_chime',
      scale: [220.00, 246.94, 261.63, 293.66, 329.63, 349.23, 392.00, 440.00], // A Minor
      waveType: 'sine' as OscillatorType,
      harmonics: [1, 0.4, 0.8],
      harmonicGains: [1.0, 0.3, 0.5],
      // Delicate nocturnal tones with ethereal character
      attacks: [0.02, 0.005, 0.015, 0.03, 0.008, 0.025, 0.001, 0.04], // Gentle emergence
      decays: [0.4, 0.2, 0.6, 0.3, 0.8, 0.15, 0.9, 0.25], // Flowing decay curves
      sustains: [0.25, 0.4, 0.1, 0.6, 0.05, 0.8, 0.15, 0.5], // Selective sustain magic
      releases: [1.0, 0.6, 1.4, 0.8, 2.0, 0.4, 2.5, 1.2], // Mystical fades
      filterFreqs: [2400, 3200, 1800, 4000, 1600, 3600, 2000, 4800], // Luminous frequencies
      resonances: [0.3, 0.1, 0.5, 0.2, 0.7, 0.15, 0.9, 0.4], // Selective glow
      pattern: [0, 4, 1, 6, 2, 7, 3, 5]
    },
    {
      name: 'earth_drone',
      scale: [110.00, 123.47, 130.81, 146.83, 164.81, 174.61, 196.00, 220.00], // A Minor Low
      waveType: 'sawtooth' as OscillatorType,
      harmonics: [1, 0.7, 0.5, 0.3],
      harmonicGains: [1.0, 0.5, 0.3, 0.2],
      // Deep, grounding tones with organic character
      attacks: [0.15, 0.08, 0.25, 0.05, 0.20, 0.12, 0.30, 0.03], // Organic emergence
      decays: [0.5, 0.8, 0.3, 1.0, 0.4, 0.9, 0.2, 1.2], // Earth-like settling
      sustains: [0.8, 0.6, 0.9, 0.4, 0.85, 0.7, 0.95, 0.3], // Solid foundation
      releases: [2.5, 1.8, 3.0, 1.2, 2.8, 2.0, 3.5, 1.0], // Deep fading
      filterFreqs: [300, 450, 250, 600, 220, 500, 180, 700], // Subterranean spectrum
      resonances: [0.1, 0.25, 0.05, 0.4, 0.15, 0.3, 0.02, 0.5], // Earthy resonance
      pattern: [0, 0, 2, 0, 4, 0, 1, 0]
    },
    {
      name: 'cosmic_texture',
      scale: [220.00, 246.94, 261.63, 293.66, 329.63, 349.23, 392.00, 440.00], // A Minor
      waveType: 'square' as OscillatorType,
      harmonics: [1, 0.3, 0.6, 0.1],
      harmonicGains: [1.0, 0.25, 0.4, 0.1],
      // Otherworldly textures with celestial character
      attacks: [0.06, 0.12, 0.03, 0.18, 0.09, 0.15, 0.02, 0.25], // Cosmic birth
      decays: [0.7, 0.4, 1.0, 0.2, 0.8, 0.6, 1.5, 0.3], // Stellar evolution
      sustains: [0.3, 0.7, 0.1, 0.9, 0.4, 0.8, 0.05, 0.95], // Galactic hold
      releases: [1.8, 1.2, 2.5, 0.8, 2.0, 1.5, 3.0, 1.0], // Infinite space fade
      filterFreqs: [1400, 2200, 1000, 2800, 1200, 2400, 800, 3200], // Cosmic spectrum
      resonances: [0.6, 0.3, 0.8, 0.2, 0.7, 0.4, 0.9, 0.1], // Dimensional resonance
      pattern: [0, 3, 6, 1, 4, 7, 2, 5]
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

  // Professional audio mixing setup
  const masterBusRef = useRef<GainNode | null>(null);
  const reverbRef = useRef<ConvolverNode | null>(null);
  const compressorRef = useRef<DynamicsCompressorNode | null>(null);

  // Initialize professional audio chain
  useEffect(() => {
    if (audioContextRef.current && !masterBusRef.current) {
      // Master bus for overall control - keeping mix soft
      masterBusRef.current = audioContextRef.current.createGain();
      masterBusRef.current.gain.setValueAtTime(0.6, audioContextRef.current.currentTime);
      
      // Gentle compressor for smooth dynamics
      compressorRef.current = audioContextRef.current.createDynamicsCompressor();
      compressorRef.current.threshold.setValueAtTime(-30, audioContextRef.current.currentTime);
      compressorRef.current.knee.setValueAtTime(40, audioContextRef.current.currentTime);
      compressorRef.current.ratio.setValueAtTime(2, audioContextRef.current.currentTime);
      compressorRef.current.attack.setValueAtTime(0.005, audioContextRef.current.currentTime);
      compressorRef.current.release.setValueAtTime(0.4, audioContextRef.current.currentTime);
      
      // Create impulse response for reverb
      const createImpulseResponse = (duration: number, decay: number) => {
        const length = audioContextRef.current!.sampleRate * duration;
        const impulse = audioContextRef.current!.createBuffer(2, length, audioContextRef.current!.sampleRate);
        
        for (let channel = 0; channel < 2; channel++) {
          const channelData = impulse.getChannelData(channel);
          for (let i = 0; i < length; i++) {
            const n = length - i;
            channelData[i] = (Math.random() * 2 - 1) * Math.pow(n / length, decay);
          }
        }
        return impulse;
      };
      
      // Reverb for spatial depth
      reverbRef.current = audioContextRef.current.createConvolver();
      reverbRef.current.buffer = createImpulseResponse(2, 2);
      
      // Connect the master audio chain
      masterBusRef.current.connect(compressorRef.current);
      compressorRef.current.connect(reverbRef.current);
      reverbRef.current.connect(audioContextRef.current.destination);
      
      // Also direct connection for dry signal
      compressorRef.current.connect(audioContextRef.current.destination);
    }
  }, []);

  // Optimized step sound with professional mixing
  const playStepSound = useCallback(async () => {
    if (!isCurrentStep || !isPlaying) return;

    try {
      const stickerProps = stickerPropsRef.current;
      
      // Check if this sticker has a custom MP3 sound
      if (sticker.soundUrl && sticker.soundUrl.endsWith('.mp3')) {
        await playMp3Sound(sticker.soundUrl);
        return;
      }

      // Professional mixing for synthetic audio
      if (!audioContextRef.current || !masterBusRef.current) return;
        
      const instrumentIndex = stickerProps.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % gentleInstruments.length;
      const instrument = gentleInstruments[instrumentIndex];
      
      const noteIndex = instrument.pattern[stickerProps.stepIndex % instrument.pattern.length];
      const noteFreq = instrument.scale[noteIndex % instrument.scale.length];
      
      // Gentle volume staging - keeping sounds soft and contemplative
      const baseVolume = Math.min((stickerProps.width + stickerProps.height) / 200 * globalVolume * stickerProps.volume * 0.025, 0.04);
      const now = audioContextRef.current.currentTime;
      
      // Create instrument bus for this sound
      const instrumentBus = audioContextRef.current.createGain();
      const panNode = audioContextRef.current.createStereoPanner();
      const eqLow = audioContextRef.current.createBiquadFilter();
      const eqMid = audioContextRef.current.createBiquadFilter();
      const eqHigh = audioContextRef.current.createBiquadFilter();
      
      // Stereo positioning based on sticker position
      const canvasWidth = 800; // Approximate canvas width
      const panPosition = Math.max(-1, Math.min(1, (sticker.x - canvasWidth/2) / (canvasWidth/2) * 0.7));
      panNode.pan.setValueAtTime(panPosition, now);
      
      // EQ setup for frequency separation
      eqLow.type = 'lowshelf';
      eqLow.frequency.setValueAtTime(250, now);
      eqLow.gain.setValueAtTime(instrumentIndex === 3 ? 3 : -2, now); // Boost earth_drone, cut others
      
      eqMid.type = 'peaking';
      eqMid.frequency.setValueAtTime(1000, now);
      eqMid.Q.setValueAtTime(0.7, now);
      eqMid.gain.setValueAtTime([0, 2, 1, -1, 0][instrumentIndex] || 0, now);
      
      eqHigh.type = 'highshelf';
      eqHigh.frequency.setValueAtTime(4000, now);
      eqHigh.gain.setValueAtTime(instrumentIndex === 0 ? 4 : 0, now); // Boost crystalline_bells
      
      // Connect EQ chain
      instrumentBus.connect(eqLow);
      eqLow.connect(eqMid);
      eqMid.connect(eqHigh);
      eqHigh.connect(panNode);
      panNode.connect(masterBusRef.current);
      
      // Generate harmonics with professional mixing
      for (let i = 0; i < instrument.harmonics.length; i++) {
        const osc = audioContextRef.current.createOscillator();
        const oscGain = audioContextRef.current.createGain();
        const oscFilter = audioContextRef.current.createBiquadFilter();
        
        osc.type = instrument.waveType;
        osc.frequency.setValueAtTime(noteFreq * instrument.harmonics[i], now);
        
        // Individual note settings with professional timing
        const attack = instrument.attacks[noteIndex];
        const decay = instrument.decays[noteIndex];
        const sustain = instrument.sustains[noteIndex];
        const release = instrument.releases[noteIndex];
        const filterFreq = instrument.filterFreqs[noteIndex];
        const resonance = Math.min(instrument.resonances[noteIndex], 15); // Limit resonance
        
        const harmonicVolume = instrument.harmonicGains[i] * baseVolume;
        
        // Professional envelope shaping
        oscGain.gain.setValueAtTime(0, now);
        oscGain.gain.setTargetAtTime(harmonicVolume, now, attack / 4);
        oscGain.gain.setTargetAtTime(Math.max(harmonicVolume * sustain, 0.001), now + attack, decay / 4);
        oscGain.gain.setTargetAtTime(0.001, now + attack + decay, release / 4);
        
        // Professional filtering
        oscFilter.type = 'lowpass';
        oscFilter.frequency.setValueAtTime(filterFreq, now);
        oscFilter.Q.setValueAtTime(resonance, now);
        
        // Anti-aliasing filter
        const antiAlias = audioContextRef.current.createBiquadFilter();
        antiAlias.type = 'lowpass';
        antiAlias.frequency.setValueAtTime(Math.min(filterFreq * 1.5, 8000), now);
        antiAlias.Q.setValueAtTime(0.7, now);
        
        // Connect professional signal chain
        osc.connect(oscFilter);
        oscFilter.connect(antiAlias);
        antiAlias.connect(oscGain);
        oscGain.connect(instrumentBus);
        
        osc.start(now);
        osc.stop(now + attack + decay + release + 0.1);
      }
      
    } catch (error) {
      console.error("Audio mixing error:", error);
    }
  }, [isCurrentStep, isPlaying, globalVolume, sticker.soundUrl, sticker.x, playMp3Sound]);

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
    
    // Handle multi-select with Ctrl/Cmd - just toggle selection and return
    if (event.ctrlKey || event.metaKey) {
      onSelect(sticker.id, !isSelected);
      return;
    }
    
    if (isOnRotateHandle) {
      setIsRotating(true);
      const center = { x: rect.width / 2, y: rect.height / 2 };
      const angle = Math.atan2(y - center.y, x - center.x) * (180 / Math.PI);
      setRotateStart({ angle, rotation: sticker.rotation || 0 });
    } else if (isOnResizeHandle) {
      setIsResizing(true);
    } else {
      // Auto-select this sticker if not already selected for drag operations
      if (!isSelected) {
        onSelect(sticker.id, true);
      }
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