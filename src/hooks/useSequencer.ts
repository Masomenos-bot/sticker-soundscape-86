import { useState, useRef, useEffect } from "react";
import { Sticker } from "@/components/StickerMusicApp";

// Polyrhythmic patterns with different time signatures
const POLYRHYTHMIC_PATTERNS = {
  QUARTER_NOTES: { division: 1, name: '4/4' },      // Every beat
  EIGHTH_NOTES: { division: 0.5, name: '8/4' },     // Twice per beat
  TRIPLETS: { division: 0.333, name: '3/4' },       // Three per beat
  SIXTEENTH_NOTES: { division: 0.25, name: '16/4' }, // Four per beat
  DOTTED_QUARTER: { division: 1.5, name: '3/2' },   // Every 1.5 beats
  HALF_NOTES: { division: 2, name: '2/4' },         // Every 2 beats
  WHOLE_NOTES: { division: 4, name: '1/4' },        // Every 4 beats
} as const;

// Chord progressions and harmonic relationships
const CHORD_PROGRESSIONS = {
  I_V_vi_IV: [0, 7, 9, 5],      // C-G-Am-F (pop progression)
  ii_V_I: [2, 7, 0],            // Dm-G-C (jazz progression)
  vi_IV_I_V: [9, 5, 0, 7],      // Am-F-C-G (alternative progression)
  I_vi_ii_V: [0, 9, 2, 7],      // C-Am-Dm-G (circle progression)
} as const;

type PolyrhythmicPattern = typeof POLYRHYTHMIC_PATTERNS[keyof typeof POLYRHYTHMIC_PATTERNS];
type ChordProgression = typeof CHORD_PROGRESSIONS[keyof typeof CHORD_PROGRESSIONS];

// Assign polyrhythmic patterns based on sticker position and properties
const assignPolyrhythmicPatterns = (stickers: Sticker[]) => {
  return stickers.map((sticker, index) => {
    // Assign patterns based on spatial position
    const x = sticker.x / 800; // Normalize to 0-1
    const y = sticker.y / 600; // Normalize to 0-1
    
    // Different zones get different rhythmic patterns
    if (x < 0.33) {
      return y < 0.5 ? POLYRHYTHMIC_PATTERNS.QUARTER_NOTES : POLYRHYTHMIC_PATTERNS.HALF_NOTES;
    } else if (x < 0.66) {
      return y < 0.33 ? POLYRHYTHMIC_PATTERNS.EIGHTH_NOTES : 
             y < 0.66 ? POLYRHYTHMIC_PATTERNS.TRIPLETS : POLYRHYTHMIC_PATTERNS.DOTTED_QUARTER;
    } else {
      return y < 0.5 ? POLYRHYTHMIC_PATTERNS.SIXTEENTH_NOTES : POLYRHYTHMIC_PATTERNS.WHOLE_NOTES;
    }
  });
};

// Create chord progressions based on sticker positions
const createChordProgression = (stickers: Sticker[]) => {
  if (stickers.length < 3) return [];
  
  // Group stickers into chords based on proximity
  const chordGroups: number[][] = [];
  const processed = new Set<number>();
  
  stickers.forEach((sticker, index) => {
    if (processed.has(index)) return;
    
    const currentGroup = [index];
    processed.add(index);
    
    // Find nearby stickers to form a chord
    stickers.forEach((otherSticker, otherIndex) => {
      if (processed.has(otherIndex) || index === otherIndex) return;
      
      const distance = Math.sqrt(
        Math.pow(otherSticker.x - sticker.x, 2) + 
        Math.pow(otherSticker.y - sticker.y, 2)
      );
      
      // If within 200px, consider part of the same chord
      if (distance < 200 && currentGroup.length < 4) {
        currentGroup.push(otherIndex);
        processed.add(otherIndex);
      }
    });
    
    if (currentGroup.length >= 2) {
      chordGroups.push(currentGroup);
    }
  });
  
  return chordGroups;
};

// Calculate polyrhythmic timing for each sticker
const calculatePolyrhythmicTiming = (
  stickerIndex: number, 
  pattern: PolyrhythmicPattern, 
  baseTempo: number,
  currentTime: number
): boolean => {
  const beatDuration = (60 / baseTempo) * 1000; // Beat duration in ms
  const patternDuration = beatDuration * pattern.division;
  
  // Check if this sticker should play at the current time
  const timeInPattern = currentTime % patternDuration;
  return timeInPattern < 50; // 50ms window for triggering
};

export const useSequencer = (placedStickers: Sticker[], isPlaying: boolean) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [sequenceTempo, setSequenceTempo] = useState(120);
  const [activeStickers, setActiveStickers] = useState<Set<number>>(new Set());
  const [polyrhythmicPatterns, setPolyrhythmicPatterns] = useState<PolyrhythmicPattern[]>([]);
  const [chordGroups, setChordGroups] = useState<number[][]>([]);
  const [currentChordIndex, setCurrentChordIndex] = useState(0);
  
  const masterClockRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);

  // Update polyrhythmic patterns and chord groups when stickers change
  useEffect(() => {
    if (placedStickers.length > 0) {
      const patterns = assignPolyrhythmicPatterns(placedStickers);
      const chords = createChordProgression(placedStickers);
      
      setPolyrhythmicPatterns(patterns);
      setChordGroups(chords);
      setCurrentStep(0);
      setCurrentChordIndex(0);
    }
  }, [placedStickers.length, JSON.stringify(placedStickers.map(s => ({ x: s.x, y: s.y, id: s.id })))]);

  // Polyrhythmic master clock
  useEffect(() => {
    if (isPlaying && placedStickers.length > 0 && polyrhythmicPatterns.length > 0) {
      startTimeRef.current = Date.now();
      
      const tick = () => {
        const currentTime = Date.now() - startTimeRef.current;
        const newActiveStickers = new Set<number>();
        
        // Check each sticker's polyrhythmic pattern
        placedStickers.forEach((sticker, index) => {
          const pattern = polyrhythmicPatterns[index];
          if (pattern && calculatePolyrhythmicTiming(index, pattern, sequenceTempo, currentTime)) {
            newActiveStickers.add(index);
          }
        });
        
        // Handle chord progressions
        if (chordGroups.length > 0) {
          const chordChangeDuration = (60 / sequenceTempo) * 4000; // Change chord every 4 beats
          const currentChord = Math.floor(currentTime / chordChangeDuration) % chordGroups.length;
          
          if (currentChord !== currentChordIndex) {
            setCurrentChordIndex(currentChord);
          }
          
          // Add current chord notes to active stickers
          chordGroups[currentChord]?.forEach(stickerIndex => {
            const pattern = polyrhythmicPatterns[stickerIndex];
            if (pattern && calculatePolyrhythmicTiming(stickerIndex, pattern, sequenceTempo, currentTime)) {
              newActiveStickers.add(stickerIndex);
            }
          });
        }
        
        setActiveStickers(newActiveStickers);
        
        // Set current step to first active sticker for visual feedback
        if (newActiveStickers.size > 0) {
          setCurrentStep(Array.from(newActiveStickers)[0]);
        }
      };
      
      // 60 FPS master clock for precise timing
      masterClockRef.current = setInterval(tick, 16);
      
      return () => {
        if (masterClockRef.current) {
          clearInterval(masterClockRef.current);
        }
      };
    } else {
      if (masterClockRef.current) {
        clearInterval(masterClockRef.current);
        masterClockRef.current = null;
      }
      setActiveStickers(new Set());
    }
  }, [isPlaying, placedStickers.length, sequenceTempo, polyrhythmicPatterns, chordGroups, currentChordIndex]);


  return {
    currentStep,
    sequenceTempo,
    setSequenceTempo,
    setCurrentStep,
    activeStickers,
    polyrhythmicPatterns,
    chordGroups,
    currentChordIndex,
    polyrhythmic: POLYRHYTHMIC_PATTERNS
  };
};