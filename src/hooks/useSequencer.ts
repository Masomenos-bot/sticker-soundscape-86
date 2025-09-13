import { useState, useRef, useEffect } from "react";
import { Sticker } from "@/components/StickerMusicApp";

// Musical pattern types for harmonious variation
const MUSICAL_PATTERNS = {
  LINEAR: 'linear',
  PENDULUM: 'pendulum', 
  SPIRAL: 'spiral',
  HARMONIC: 'harmonic',
  RANDOM_WALK: 'random_walk'
} as const;

type MusicalPattern = typeof MUSICAL_PATTERNS[keyof typeof MUSICAL_PATTERNS];

// Create harmonic relationships based on spatial positioning
const createHarmonicSequence = (stickers: Sticker[]) => {
  if (stickers.length <= 1) return stickers.map((_, i) => i);
  
  // Sort by spatial relationships (closer stickers play together)
  const sorted = [...stickers].sort((a, b) => {
    const distanceA = Math.sqrt(a.x * a.x + a.y * a.y);
    const distanceB = Math.sqrt(b.x * b.x + b.y * b.y);
    return distanceA - distanceB;
  });
  
  // Create harmonic groups (play multiple stickers per step)
  const sequence: number[][] = [];
  for (let i = 0; i < sorted.length; i += 2) {
    const group = [stickers.indexOf(sorted[i])];
    if (i + 1 < sorted.length) {
      group.push(stickers.indexOf(sorted[i + 1]));
    }
    sequence.push(group);
  }
  
  return sequence.flat();
};

// Generate musical variations with swing timing
const getSwingTiming = (step: number, totalSteps: number, baseDuration: number) => {
  const swingRatio = 0.15; // 15% swing
  const isOffbeat = step % 2 === 1;
  return baseDuration * (isOffbeat ? 1 + swingRatio : 1 - swingRatio);
};

export const useSequencer = (placedStickers: Sticker[], isPlaying: boolean) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [sequenceTempo, setSequenceTempo] = useState(120);
  const [currentPattern, setCurrentPattern] = useState<MusicalPattern>(MUSICAL_PATTERNS.HARMONIC);
  const [patternDirection, setPatternDirection] = useState(1);
  const [harmonicSequence, setHarmonicSequence] = useState<number[]>([]);
  
  const sequencerRef = useRef<NodeJS.Timeout | null>(null);
  const stepTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Update harmonic sequence when stickers change
  useEffect(() => {
    if (placedStickers.length > 0) {
      const newSequence = createHarmonicSequence(placedStickers);
      setHarmonicSequence(newSequence);
      setCurrentStep(0);
    }
  }, [placedStickers.length, JSON.stringify(placedStickers.map(s => ({ x: s.x, y: s.y, id: s.id })))]);

  // Advanced pattern-based sequencing
  const getNextStep = (current: number, total: number, pattern: MusicalPattern) => {
    switch (pattern) {
      case MUSICAL_PATTERNS.PENDULUM:
        if (current === total - 1) setPatternDirection(-1);
        if (current === 0) setPatternDirection(1);
        return Math.max(0, Math.min(total - 1, current + patternDirection));
        
      case MUSICAL_PATTERNS.SPIRAL:
        // Fibonacci-like progression for organic feel
        const fibSeq = [0, 1, 1, 2, 3, 5, 8, 13];
        const nextFib = fibSeq[current % fibSeq.length] || 1;
        return (current + nextFib) % total;
        
      case MUSICAL_PATTERNS.HARMONIC:
        // Use spatial harmonic sequence
        const currentHarmonicIndex = harmonicSequence.indexOf(current);
        const nextHarmonicIndex = (currentHarmonicIndex + 1) % harmonicSequence.length;
        return harmonicSequence[nextHarmonicIndex] || 0;
        
      case MUSICAL_PATTERNS.RANDOM_WALK:
        // Weighted random walk towards nearby stickers
        const currentSticker = placedStickers[current];
        if (!currentSticker) return (current + 1) % total;
        
        const nearbyStickers = placedStickers
          .map((sticker, index) => ({
            index,
            distance: Math.sqrt(
              Math.pow(sticker.x - currentSticker.x, 2) + 
              Math.pow(sticker.y - currentSticker.y, 2)
            )
          }))
          .filter(item => item.index !== current)
          .sort((a, b) => a.distance - b.distance)
          .slice(0, 3); // Top 3 nearest
          
        if (nearbyStickers.length === 0) return (current + 1) % total;
        
        // 70% chance to pick nearest, 30% for others
        const randomChoice = Math.random();
        if (randomChoice < 0.7) return nearbyStickers[0].index;
        if (randomChoice < 0.9 && nearbyStickers[1]) return nearbyStickers[1].index;
        return nearbyStickers[nearbyStickers.length - 1].index;
        
      case MUSICAL_PATTERNS.LINEAR:
      default:
        return (current + 1) % total;
    }
  };

  useEffect(() => {
    if (isPlaying && placedStickers.length > 0) {
      const baseDuration = (60 / sequenceTempo) * 1000; // Convert to milliseconds
      
      const scheduleNext = () => {
        const swingDuration = getSwingTiming(currentStep, placedStickers.length, baseDuration);
        
        stepTimeoutRef.current = setTimeout(() => {
          setCurrentStep(prev => {
            const next = getNextStep(prev, placedStickers.length, currentPattern);
            return next;
          });
          scheduleNext(); // Schedule the next step
        }, swingDuration);
      };
      
      scheduleNext();
      
      return () => {
        if (stepTimeoutRef.current) {
          clearTimeout(stepTimeoutRef.current);
        }
      };
    } else {
      if (stepTimeoutRef.current) {
        clearTimeout(stepTimeoutRef.current);
        stepTimeoutRef.current = null;
      }
    }
  }, [isPlaying, placedStickers.length, sequenceTempo, currentPattern, currentStep, patternDirection, harmonicSequence]);

  // Auto-change pattern for variation
  useEffect(() => {
    if (isPlaying && placedStickers.length > 2) {
      const patternChangeInterval = setInterval(() => {
        const patterns = Object.values(MUSICAL_PATTERNS);
        const currentIndex = patterns.indexOf(currentPattern);
        const nextPattern = patterns[(currentIndex + 1) % patterns.length];
        setCurrentPattern(nextPattern);
      }, 16000); // Change pattern every 16 seconds
      
      return () => clearInterval(patternChangeInterval);
    }
  }, [isPlaying, currentPattern, placedStickers.length]);

  return {
    currentStep,
    sequenceTempo,
    setSequenceTempo,
    setCurrentStep,
    currentPattern,
    setCurrentPattern,
    musicalPatterns: MUSICAL_PATTERNS
  };
};