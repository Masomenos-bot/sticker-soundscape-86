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

      // Traditional African pentatonic scales and frequencies
      const africanScales = {
        // West African pentatonic (Akan/Ewe traditions)
        westAfrican: [174.61, 196.00, 220.00, 261.63, 293.66, 349.23, 392.00, 440.00, 523.25, 587.33],
        // Central African scale (Pygmy traditions) 
        centralAfrican: [164.81, 185.00, 220.00, 246.94, 277.18, 329.63, 369.99, 440.00, 493.88, 554.37],
        // Ethiopian scale (ancient traditions)
        ethiopian: [146.83, 174.61, 196.00, 233.08, 261.63, 293.66, 349.23, 392.00, 466.16, 523.25],
        // Malian kora tuning
        malian: [130.81, 155.56, 174.61, 207.65, 233.08, 261.63, 311.13, 349.23, 415.30, 466.16]
      };

      // Complex African polyrhythmic patterns
      const africanPatterns = [
        // Kagan rhythm (4/4 against 3/4) - West Africa
        { 
          beats: [1, 0, 0, 1, 0, 1, 0, 0, 1, 0, 0, 1], 
          scale: 'westAfrican', 
          noteIndex: 0,
          tempo: 140, // Base tempo
          subdivision: 3, // Triplet feel
          accentPattern: [1, 0, 0, 0.7, 0, 0.5, 0, 0, 0.8, 0, 0, 0.6]
        },
        // Soukous rhythm - Central Africa
        { 
          beats: [1, 0, 1, 0, 0, 1, 0, 1, 0, 0, 1, 0, 0, 0, 1, 0], 
          scale: 'centralAfrican', 
          noteIndex: 2,
          tempo: 120,
          subdivision: 4, 
          accentPattern: [1, 0, 0.6, 0, 0, 0.8, 0, 0.7, 0, 0, 0.5, 0, 0, 0, 0.9, 0]
        },
        // Aksak rhythm - Ethiopian
        { 
          beats: [1, 0, 0, 1, 0, 1, 0, 1, 0, 0], 
          scale: 'ethiopian', 
          noteIndex: 1,
          tempo: 110,
          subdivision: 5, 
          accentPattern: [1, 0, 0, 0.7, 0, 0.8, 0, 0.6, 0, 0]
        },
        // Bembeya Jazz pattern - Guinea
        { 
          beats: [1, 0, 1, 1, 0, 0, 1, 0, 1, 0, 0, 1, 0, 1], 
          scale: 'westAfrican', 
          noteIndex: 3,
          tempo: 130,
          subdivision: 7, 
          accentPattern: [1, 0, 0.5, 0.8, 0, 0, 0.7, 0, 0.6, 0, 0, 0.9, 0, 0.4]
        },
        // Makossa rhythm - Cameroon
        { 
          beats: [1, 1, 0, 1, 0, 0, 1, 0, 1, 0, 1, 0], 
          scale: 'centralAfrican', 
          noteIndex: 4,
          tempo: 125,
          subdivision: 4, 
          accentPattern: [1, 0.6, 0, 0.8, 0, 0, 0.7, 0, 0.9, 0, 0.5, 0]
        },
        // Kora pattern - Mali
        { 
          beats: [1, 0, 0, 1, 0, 1, 0, 0, 0, 1, 0, 1, 0, 0, 1, 0, 0, 1], 
          scale: 'malian', 
          noteIndex: 1,
          tempo: 100,
          subdivision: 6, 
          accentPattern: [1, 0, 0, 0.6, 0, 0.8, 0, 0, 0, 0.7, 0, 0.5, 0, 0, 0.9, 0, 0, 0.4]
        },
        // Bikutsi pattern - Cameroon
        { 
          beats: [1, 0, 1, 0, 1, 1, 0, 0, 1, 0, 0, 1, 1, 0, 1, 0], 
          scale: 'centralAfrican', 
          noteIndex: 5,
          tempo: 115,
          subdivision: 4, 
          accentPattern: [1, 0, 0.7, 0, 0.5, 0.8, 0, 0, 0.9, 0, 0, 0.6, 0.7, 0, 0.4, 0]
        },
        // Wassoulou pattern - Mali
        { 
          beats: [1, 1, 0, 0, 1, 0, 1, 0, 0, 1, 0, 1, 1, 0, 0], 
          scale: 'malian', 
          noteIndex: 6,
          tempo: 135,
          subdivision: 5, 
          accentPattern: [1, 0.5, 0, 0, 0.8, 0, 0.7, 0, 0, 0.6, 0, 0.9, 0.4, 0, 0]
        }
      ];
      
      // Get pattern for this sticker based on ID hash
      const patternIndex = sticker.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % africanPatterns.length;
      const pattern = africanPatterns[patternIndex];
      const scaleNotes = africanScales[pattern.scale];
      const noteFreq = scaleNotes[pattern.noteIndex % scaleNotes.length];
      
      // Calculate tempo variation for polyrhythmic effect
      const tempoVariation = (sticker.id.charCodeAt(0) % 20 - 10) / 100; // ±10% variation
      const actualTempo = pattern.tempo + (pattern.tempo * tempoVariation);
      const beatDuration = (60 / actualTempo) * 1000; // Convert BPM to ms
      
      console.log(`Sticker ${sticker.id} using marimba note:`, noteFreq, 'Hz');
      
      // Create master gain node
      const masterGain = audioContext.createGain();
      
      // Create reverb using ConvolverNode simulation
      const reverbGain = audioContext.createGain();
      const dryGain = audioContext.createGain();
      
      // Create a simple reverb using multiple delays
      const delays = [];
      const feedbacks = [];
      const delayTimes = [0.03, 0.05, 0.09, 0.15, 0.23, 0.35]; // Different delay times for room simulation
      const feedbackGains = [0.3, 0.25, 0.2, 0.15, 0.1, 0.05]; // Decreasing feedback
      
      for (let i = 0; i < delayTimes.length; i++) {
        const delay = audioContext.createDelay(1);
        const feedback = audioContext.createGain();
        const filter = audioContext.createBiquadFilter();
        
        delay.delayTime.setValueAtTime(delayTimes[i], audioContext.currentTime);
        feedback.gain.setValueAtTime(feedbackGains[i], audioContext.currentTime);
        
        // Add filtering to simulate air absorption in room
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(3000 - (i * 400), audioContext.currentTime);
        filter.Q.setValueAtTime(0.7, audioContext.currentTime);
        
        delay.connect(filter);
        filter.connect(feedback);
        feedback.connect(delay);
        filter.connect(reverbGain);
        
        delays.push(delay);
        feedbacks.push(feedback);
      }
      
      // Mix dry and wet signals
      dryGain.gain.setValueAtTime(0.6, audioContext.currentTime); // 60% dry
      reverbGain.gain.setValueAtTime(0.4, audioContext.currentTime); // 40% reverb
      
      dryGain.connect(masterGain);
      reverbGain.connect(masterGain);
      masterGain.connect(audioContext.destination);
      
      // Calculate volume based on sticker size
      const sizeRatio = (sticker.width + sticker.height) / 160;
      const volume = Math.min(sizeRatio * globalVolume * sticker.volume * 0.08, 0.12);
      masterGain.gain.setValueAtTime(volume, audioContext.currentTime);
      
      console.log('Set marimba volume to:', volume);
      
      // Beat tracking
      let beatIndex = 0;
      let isActive = true;
      
      // Create marimba strike sound
      const createMarimbaStrike = () => {
        if (!isActive || audioContext.state === 'closed') return;
        
        try {
          // Check if this beat should play and get accent intensity
          const beatIntensity = pattern.beats[beatIndex];
          const accentLevel = pattern.accentPattern[beatIndex] || 0;
          
          if (beatIntensity > 0) {
            console.log(`Playing African rhythm note ${noteFreq}Hz for sticker ${sticker.id} (intensity: ${beatIntensity}, accent: ${accentLevel})`);
            
            // Create African percussion-style sound with rich harmonics
            const harmonics = [];
            
            // African marimba/balafon harmonic series (more complex than Western)
            const harmonicRatios = [
              1, 1.59, 2.76, 3.21, 4.14, 5.4, 6.83, 8.93 // African tuning ratios
            ];
            const harmonicGains = [1.0, 0.6, 0.4, 0.25, 0.15, 0.1, 0.06, 0.04];
            
            // Add subtle pitch bend for human feel
            const pitchBend = (Math.random() - 0.5) * 0.02; // ±2 cents
            
            for (let i = 0; i < harmonicRatios.length; i++) {
              const osc = audioContext.createOscillator();
              const gain = audioContext.createGain();
              const filter = audioContext.createBiquadFilter();
              
              // Use triangle wave for more wooden/organic sound
              osc.type = i === 0 ? 'triangle' : 'sine';
              osc.frequency.setValueAtTime((noteFreq * harmonicRatios[i]) * (1 + pitchBend), audioContext.currentTime);
              
              // Add subtle frequency modulation for liveliness
              const lfo = audioContext.createOscillator();
              const lfoGain = audioContext.createGain();
              lfo.type = 'sine';
              lfo.frequency.setValueAtTime(4.5 + Math.random() * 2, audioContext.currentTime); // 4.5-6.5 Hz
              lfoGain.gain.setValueAtTime(2, audioContext.currentTime);
              lfo.connect(lfoGain);
              lfoGain.connect(osc.frequency);
              
              const now = audioContext.currentTime;
              
              // Dynamic envelope based on accent level and African playing style
              const baseGain = harmonicGains[i] * accentLevel * beatIntensity;
              const attackTime = 0.003 + (Math.random() * 0.002); // Slight variation in attack
              const decayTime = 0.08 + (accentLevel * 0.05);
              const sustainLevel = baseGain * (0.2 + accentLevel * 0.2);
              const releaseTime = 1.2 + (accentLevel * 0.8);
              
              gain.gain.setValueAtTime(0, now);
              gain.gain.linearRampToValueAtTime(baseGain, now + attackTime);
              gain.gain.exponentialRampToValueAtTime(sustainLevel, now + decayTime);
              gain.gain.exponentialRampToValueAtTime(0.001, now + releaseTime);
              
              // Add resonant filtering for wood-like timbre
              filter.type = 'bandpass';
              filter.frequency.setValueAtTime(noteFreq * (2 + i * 0.5), audioContext.currentTime);
              filter.Q.setValueAtTime(3 + Math.random() * 2, audioContext.currentTime);
              
              // Connect audio chain
              osc.connect(filter);
              filter.connect(gain);
              gain.connect(dryGain);
              
              // Send to reverb with varying amounts based on harmonic
              const reverbSend = audioContext.createGain();
              const reverbAmount = 0.2 + (i * 0.05) + (accentLevel * 0.1);
              reverbSend.gain.setValueAtTime(reverbAmount, audioContext.currentTime);
              gain.connect(reverbSend);
              
              delays.forEach(delay => {
                reverbSend.connect(delay);
              });
              
              lfo.start(now);
              osc.start(now);
              osc.stop(now + releaseTime);
              lfo.stop(now + releaseTime);
              
              harmonics.push({ osc, gain, filter, lfo, lfoGain });
            }
          }
          
          // Move to next beat in the polyrhythmic cycle
          beatIndex = (beatIndex + 1) % pattern.beats.length;
          
          // Calculate next beat timing with African groove (slight swing)
          let nextBeatTime = beatDuration / pattern.subdivision;
          
          // Add subtle timing variations for human groove
          if (beatIndex % 2 === 1) {
            nextBeatTime *= 1.05; // Slight swing on off-beats
          }
          
          // Add micro-timing variations (±3ms) for organic feel
          const microTiming = (Math.random() - 0.5) * 6;
          nextBeatTime += microTiming;
          
          if (isActive) {
            setTimeout(createMarimbaStrike, Math.max(nextBeatTime, 50)); // Minimum 50ms gap
          }
        } catch (error) {
          console.error('Error in marimba strike:', error);
        }
      };
      
      // Start the marimba pattern
      createMarimbaStrike();
      
      // Store audio reference for cleanup
      audioRef.current = {
        audioContext,
        masterGain,
        delays,
        feedbacks,
        isActive: true,
        stop: () => {
          console.log('Stopping marimba audio for sticker:', sticker.id);
          isActive = false;
          try {
            // Clean up delays and feedback loops
            delays.forEach(delay => {
              try {
                delay.disconnect();
              } catch (e) {}
            });
            feedbacks.forEach(feedback => {
              try {
                feedback.disconnect();
              } catch (e) {}
            });
            audioContext.close();
          } catch (e) {
            console.warn('Audio context close error:', e);
          }
        },
        setVolume: (vol: number) => {
          try {
            const newVol = Math.min(vol, 0.12);
            masterGain.gain.setValueAtTime(newVol, audioContext.currentTime);
            console.log('Updated marimba volume to:', newVol);
          } catch (e) {
            console.warn('Volume update error:', e);
          }
        }
      } as any;

      console.log('Marimba audio setup complete for sticker:', sticker.id);
      
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
    event.preventDefault();
    event.stopPropagation();
    
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
    event.preventDefault();
    event.stopPropagation();
    
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
      className={`absolute cursor-move select-none group sticker-bounce touch-none ${
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
        touchAction: 'none',
        WebkitUserSelect: 'none',
        WebkitTouchCallout: 'none',
        WebkitTapHighlightColor: 'transparent',
      }}
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
      onDragStart={(e) => e.preventDefault()}
      onContextMenu={(e) => e.preventDefault()}
    >
      {/* Layer up button */}
      <Button
        size="sm"
        variant="secondary"
        className="absolute -top-2 left-1/2 transform -translate-x-1/2 w-6 h-6 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-75 z-10 bg-yellow-400 hover:bg-yellow-500 text-black border-yellow-400 hover:border-yellow-500"
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
        className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-6 h-6 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-75 z-10 bg-yellow-400 hover:bg-yellow-500 text-black border-yellow-400 hover:border-yellow-500"
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
        className="absolute -top-2 -right-2 w-6 h-6 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-75 z-10 bg-pink-400 hover:bg-pink-500 text-white border-pink-400 hover:border-pink-500"
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
        className="absolute -top-2 -left-2 w-6 h-6 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-75 z-10 cursor-grab active:cursor-grabbing"
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
        className="absolute bottom-0 right-0 w-4 h-4 cursor-nw-resize opacity-0 group-hover:opacity-100 transition-opacity duration-75"
        onMouseDown={handleResizeStart}
        style={{
          background: 'linear-gradient(-45deg, transparent 30%, hsl(var(--primary)) 30%, hsl(var(--primary)) 70%, transparent 70%)',
        }}
      />

      {/* Size indicator */}
      <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 text-xs bg-primary text-primary-foreground px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-75">
        {Math.round((sticker.width + sticker.height) / 2)}px
      </div>
    </div>
  );
};