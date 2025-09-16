import { useState, useRef, useEffect } from "react";
import { Sticker } from "@/components/StickerMusicApp";

// Gentle musical scales for character building - soft and harmonious
const MUSICAL_SCALES = {
  MAJOR: [0, 2, 4, 5, 7, 9, 11],           // Happy, bright tones
  PENTATONIC: [0, 2, 4, 7, 9],             // Simple, pleasing harmony
  MINOR: [0, 2, 3, 5, 7, 8, 10],           // Gentle, contemplative
  DORIAN: [0, 2, 3, 5, 7, 9, 10],          // Soft modal feeling
  LYDIAN: [0, 2, 4, 6, 7, 9, 11],          // Dreamy, ethereal
  NATURAL_MINOR: [0, 2, 3, 5, 7, 8, 10],   // Peaceful minor
} as const;

// Gentle rhythmic patterns for contemplative character building
const RHYTHMIC_PATTERNS = {
  WHOLE_NOTES: { division: 4, swing: 0, syncopation: false, name: 'Whole Notes' },
  HALF_NOTES: { division: 2, swing: 0, syncopation: false, name: 'Half Notes' },
  GENTLE_QUARTER: { division: 1, swing: 0, syncopation: false, name: 'Gentle Quarter' },
  SOFT_EIGHTH: { division: 0.5, swing: 0.1, syncopation: false, name: 'Soft Eighth' },
  AMBIENT_LONG: { division: 8, swing: 0, syncopation: false, name: 'Ambient Long' },
  CONTEMPLATIVE: { division: 3, swing: 0.05, syncopation: false, name: 'Contemplative' },
  BREATHING: { division: 6, swing: 0, syncopation: false, name: 'Breathing' },
  HEARTBEAT: { division: 1.5, swing: 0, syncopation: false, name: 'Heartbeat' },
} as const;

// Simple, consonant chord progressions for peaceful character building
const CHORD_PROGRESSIONS = {
  // Gentle progressions
  I_V_vi_IV: [0, 7, 9, 5],           // C-G-Am-F (warm and familiar)
  vi_IV_I_V: [9, 5, 0, 7],           // Am-F-C-G (gentle flow)
  I_vi_IV_V: [0, 9, 5, 7],           // C-Am-F-G (peaceful)
  
  // Simple progressions for character zones
  HEAD_HARMONY: [0, 4, 7],           // C-E-G (bright for head/face)
  BODY_HARMONY: [0, 5, 9],           // C-F-Am (warm for body)
  ACCESSORY_HARMONY: [7, 2, 5],      // G-D-F (gentle for accessories)
  
  // Contemplative progressions
  PEACEFUL: [0, 5, 9, 7],            // C-F-Am-G (very gentle)
  DREAMY: [0, 2, 7, 9],              // C-D-G-Am (ethereal)
  BUILDING: [0, 7, 5, 0],            // C-G-F-C (sense of completion)
} as const;

type RhythmicPattern = typeof RHYTHMIC_PATTERNS[keyof typeof RHYTHMIC_PATTERNS];
type ChordProgression = typeof CHORD_PROGRESSIONS[keyof typeof CHORD_PROGRESSIONS];
type MusicalScale = typeof MUSICAL_SCALES[keyof typeof MUSICAL_SCALES];

// Gentle musical zones for character construction
const assignMusicalPatterns = (stickers: Sticker[]) => {
  return stickers.map((sticker, index) => {
    const x = sticker.x / 800; // Normalize to 0-1
    const y = sticker.y / 600; // Normalize to 0-1
    
    // Character building zones with gentle harmonies
    if (y < 0.33) { // Head/Face zone (upper third) - crystalline, bright
      const scale = x < 0.5 ? MUSICAL_SCALES.MAJOR : MUSICAL_SCALES.LYDIAN;
      const rhythm = x < 0.33 ? RHYTHMIC_PATTERNS.GENTLE_QUARTER : 
                     x < 0.66 ? RHYTHMIC_PATTERNS.SOFT_EIGHTH : RHYTHMIC_PATTERNS.CONTEMPLATIVE;
      return { rhythm, scale, mode: 'head', zone: 'crystalline' };
    } else if (y < 0.66) { // Body zone (middle third) - warm, grounding
      const scale = x < 0.5 ? MUSICAL_SCALES.PENTATONIC : MUSICAL_SCALES.DORIAN;
      const rhythm = x < 0.33 ? RHYTHMIC_PATTERNS.HEARTBEAT : 
                     x < 0.66 ? RHYTHMIC_PATTERNS.BREATHING : RHYTHMIC_PATTERNS.HALF_NOTES;
      return { rhythm, scale, mode: 'body', zone: 'warm' };
    } else { // Accessories zone (lower third) - ambient, textural
      const scale = x < 0.5 ? MUSICAL_SCALES.NATURAL_MINOR : MUSICAL_SCALES.PENTATONIC;
      const rhythm = x < 0.33 ? RHYTHMIC_PATTERNS.AMBIENT_LONG : 
                     x < 0.66 ? RHYTHMIC_PATTERNS.WHOLE_NOTES : RHYTHMIC_PATTERNS.CONTEMPLATIVE;
      return { rhythm, scale, mode: 'accessories', zone: 'ambient' };
    }
  });
};

// Create sophisticated chord progressions using music theory
const createAdvancedChordProgression = (stickers: Sticker[]) => {
  if (stickers.length < 3) return { chordGroups: [], progression: [], harmonicFunctions: [] };
  
  // Group stickers by musical proximity and harmonic function
  const harmonicGroups: { indices: number[], function: string, root: number }[] = [];
  const processed = new Set<number>();
  
  stickers.forEach((sticker, index) => {
    if (processed.has(index)) return;
    
    const x = sticker.x / 800;
    const y = sticker.y / 600;
    
    // Determine harmonic function based on position
    const harmonicFunction = x < 0.25 ? 'tonic' : 
                            x < 0.5 ? 'subdominant' : 
                            x < 0.75 ? 'dominant' : 'extension';
    
    // Calculate root note based on position (0-11 semitones)
    const root = Math.floor(y * 12);
    
    const currentGroup = { indices: [index], function: harmonicFunction, root };
    processed.add(index);
    
    // Find harmonically related stickers
    stickers.forEach((otherSticker, otherIndex) => {
      if (processed.has(otherIndex) || index === otherIndex) return;
      
      const distance = Math.sqrt(
        Math.pow(otherSticker.x - sticker.x, 2) + 
        Math.pow(otherSticker.y - sticker.y, 2)
      );
      
      // Group by harmonic distance (within 150px for tight harmony)
      if (distance < 150 && currentGroup.indices.length < 5) {
        currentGroup.indices.push(otherIndex);
        processed.add(otherIndex);
      }
    });
    
    if (currentGroup.indices.length >= 2) {
      harmonicGroups.push(currentGroup);
    }
  });
  
  // Select gentle chord progression based on character zones
  const selectedProgression = harmonicGroups.length <= 2 ? 
    CHORD_PROGRESSIONS.PEACEFUL : 
    harmonicGroups.length <= 4 ? 
    CHORD_PROGRESSIONS.I_V_vi_IV : 
    CHORD_PROGRESSIONS.BUILDING;
  
  return { 
    chordGroups: harmonicGroups.map(g => g.indices), 
    progression: [...selectedProgression],
    harmonicFunctions: harmonicGroups.map(g => g.function)
  };
};

// Gentle musical timing with generous windows for contemplation
const calculateMusicalTiming = (
  stickerIndex: number, 
  pattern: RhythmicPattern, 
  baseTempo: number,
  currentTime: number,
  phaseOffset: number = 0,
  stickerCount: number = 1
): boolean => {
  const beatDuration = (60 / baseTempo) * 1000; // Beat duration in ms
  const patternDuration = beatDuration * pattern.division;
  
  // Gentle swing feel - very subtle
  const swingAmount = pattern.swing || 0;
  const adjustedTime = currentTime + (phaseOffset * beatDuration);
  
  let timeInPattern = adjustedTime % patternDuration;
  
  // Very gentle swing for organic feel
  if (swingAmount > 0) {
    const swingOffset = Math.sin(adjustedTime * 0.0005) * beatDuration * swingAmount * 0.1;
    timeInPattern += swingOffset;
  }
  
  // Progressive timing - more stickers = richer music with longer sustain
  const richnessFactor = Math.min(stickerCount / 8, 1); // Max richness at 8 stickers
  const baseTriggerWindow = Math.max(50, 150 * pattern.division);
  const triggerWindow = baseTriggerWindow * (1 + richnessFactor * 0.5); // Up to 50% longer sustain
  
  // More generous timing windows for contemplative play
  return (timeInPattern % patternDuration) < triggerWindow;
};

export const useSequencer = (placedStickers: Sticker[], isPlaying: boolean) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [sequenceTempo, setSequenceTempo] = useState(85); // Slower, contemplative tempo
  const [activeStickers, setActiveStickers] = useState<Set<number>>(new Set());
  const [musicalPatterns, setMusicalPatterns] = useState<Array<{rhythm: RhythmicPattern, scale: MusicalScale, mode: string, zone: string}>>([]);
  const [chordProgression, setChordProgression] = useState<{chordGroups: number[][], progression: number[], harmonicFunctions: string[]}>({chordGroups: [], progression: [], harmonicFunctions: []});
  const [currentChordIndex, setCurrentChordIndex] = useState(0);
  const [musicalPhase, setMusicalPhase] = useState(0); // For gentle phrase structure
  const [dynamicTempo, setDynamicTempo] = useState(85); // Start slower
  const [musicalRichness, setMusicalRichness] = useState(0); // Progressive richness
  
  const masterClockRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);
  const phraseTimeRef = useRef<number>(0);

  // Update musical patterns and harmonies when stickers change
  useEffect(() => {
    if (placedStickers.length > 0) {
      const patterns = assignMusicalPatterns(placedStickers);
      const harmony = createAdvancedChordProgression(placedStickers);
      
      setMusicalPatterns(patterns);
      setChordProgression(harmony);
      setCurrentStep(0);
      setCurrentChordIndex(0);
      setMusicalPhase(0);
      phraseTimeRef.current = 0;
    }
  }, [placedStickers.length, JSON.stringify(placedStickers.map(s => ({ x: s.x, y: s.y, id: s.id })))]);

  // Gentle musical sequencer with progressive character building
  useEffect(() => {
    if (isPlaying && placedStickers.length > 0 && musicalPatterns.length > 0) {
      startTimeRef.current = Date.now();
      phraseTimeRef.current = 0;
      
      // Calculate musical richness based on sticker count
      const richness = Math.min(placedStickers.length / 10, 1); // Max richness at 10 stickers
      setMusicalRichness(richness);
      
      const tick = () => {
        const currentTime = Date.now() - startTimeRef.current;
        const newActiveStickers = new Set<number>();
        
        // Gentle phrase structure (16-bar phrases for more contemplation)
        const phraseDuration = (60 / sequenceTempo) * 16000; // Longer phrases
        const currentPhase = Math.floor(currentTime / phraseDuration) % 3; // 3 gentle phases
        
        if (currentPhase !== musicalPhase) {
          setMusicalPhase(currentPhase);
          
          // Very subtle tempo changes - just breathing
          const tempoModulation = currentPhase === 0 ? 1.0 : 
                                 currentPhase === 1 ? 1.02 : 0.98; // Very gentle changes
          setDynamicTempo(sequenceTempo * tempoModulation);
        }
        
        // Progressive volume based on sticker count - start quiet, build gently
        const baseVolume = 0.3 + (richness * 0.4); // 30% to 70% volume range
        
        // Check each sticker with gentle timing
        placedStickers.forEach((sticker, index) => {
          const musicalPattern = musicalPatterns[index];
          if (musicalPattern) {
            // Gentle phase offset based on zone
            const zoneOffset = musicalPattern.mode === 'head' ? 0 : 
                              musicalPattern.mode === 'body' ? 0.1 : 0.2;
            
            if (calculateMusicalTiming(
              index, 
              musicalPattern.rhythm, 
              dynamicTempo, 
              currentTime, 
              zoneOffset,
              placedStickers.length
            )) {
              newActiveStickers.add(index);
            }
          }
        });
        
        // Gentle chord progression with longer sustain
        if (chordProgression.chordGroups.length > 0) {
          const chordChangeDuration = (60 / dynamicTempo) * 4000; // Change every 4 beats (slower)
          const currentChord = Math.floor(currentTime / chordChangeDuration) % chordProgression.chordGroups.length;
          
          if (currentChord !== currentChordIndex) {
            setCurrentChordIndex(currentChord);
          }
          
          // Gentle harmonic layering
          chordProgression.chordGroups[currentChord]?.forEach((stickerIndex, voiceIndex) => {
            const musicalPattern = musicalPatterns[stickerIndex];
            if (musicalPattern) {
              // Gentle voice leading with longer stagger
              const voiceOffset = voiceIndex * 0.25; // More spaced out
              if (calculateMusicalTiming(
                stickerIndex, 
                musicalPattern.rhythm, 
                dynamicTempo, 
                currentTime, 
                voiceOffset,
                placedStickers.length
              )) {
                newActiveStickers.add(stickerIndex);
              }
            }
          });
        }
        
        setActiveStickers(newActiveStickers);
        
        // Gentle visual feedback
        if (newActiveStickers.size > 0) {
          setCurrentStep(Array.from(newActiveStickers)[0]);
        }
      };
      
      // More relaxed timing for contemplative experience
      masterClockRef.current = setInterval(tick, 20); // 20ms instead of 10ms
      
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
  }, [isPlaying, placedStickers.length, sequenceTempo, musicalPatterns, chordProgression, currentChordIndex, musicalPhase, dynamicTempo]);


  return {
    currentStep,
    sequenceTempo,
    setSequenceTempo,
    setCurrentStep,
    activeStickers,
    musicalPatterns, 
    chordProgression,
    currentChordIndex,
    musicalPhase,
    dynamicTempo,
    musicalRichness, // New: progressive richness indicator
    rhythmicPatterns: RHYTHMIC_PATTERNS,
    musicalScales: MUSICAL_SCALES,
    chordProgressions: CHORD_PROGRESSIONS
  };
};