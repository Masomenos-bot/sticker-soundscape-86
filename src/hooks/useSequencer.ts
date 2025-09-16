import { useState, useRef, useEffect } from "react";
import { Sticker } from "@/components/StickerMusicApp";

// Musical scales and modes for more sophisticated harmonies
const MUSICAL_SCALES = {
  MAJOR: [0, 2, 4, 5, 7, 9, 11],           // Ionian mode
  MINOR: [0, 2, 3, 5, 7, 8, 10],           // Natural minor
  DORIAN: [0, 2, 3, 5, 7, 9, 10],          // Dorian mode
  PHRYGIAN: [0, 1, 3, 5, 7, 8, 10],        // Phrygian mode
  LYDIAN: [0, 2, 4, 6, 7, 9, 11],          // Lydian mode
  MIXOLYDIAN: [0, 2, 4, 5, 7, 9, 10],      // Mixolydian mode
  PENTATONIC: [0, 2, 4, 7, 9],             // Pentatonic scale
  BLUES: [0, 3, 5, 6, 7, 10],              // Blues scale
  WHOLE_TONE: [0, 2, 4, 6, 8, 10],         // Whole tone scale
  CHROMATIC: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11] // Chromatic scale
} as const;

// Advanced rhythmic patterns with swing and syncopation
const RHYTHMIC_PATTERNS = {
  STRAIGHT_QUARTER: { division: 1, swing: 0, syncopation: false, name: 'Quarter Notes' },
  SWING_EIGHTH: { division: 0.5, swing: 0.67, syncopation: false, name: 'Swing 8ths' },
  SYNCOPATED_QUARTER: { division: 1, swing: 0, syncopation: true, name: 'Syncopated' },
  TRIPLET_SWING: { division: 0.333, swing: 0.6, syncopation: false, name: 'Triplet Swing' },
  LATIN_CLAVE: { division: 0.5, swing: 0, syncopation: true, name: 'Latin Clave' },
  AFROBEAT: { division: 0.25, swing: 0.55, syncopation: true, name: 'Afrobeat' },
  SHUFFLE: { division: 0.333, swing: 0.75, syncopation: false, name: 'Shuffle' },
  REGGAE_SKANK: { division: 0.5, swing: 0, syncopation: true, name: 'Reggae Skank' },
  BOSSA_NOVA: { division: 0.5, swing: 0.6, syncopation: true, name: 'Bossa Nova' },
  POLYRHYTHM_3_4: { division: 0.75, swing: 0, syncopation: false, name: '3 over 4' },
  POLYRHYTHM_5_4: { division: 1.25, swing: 0, syncopation: false, name: '5 over 4' },
  METRIC_MODULATION: { division: 0.67, swing: 0.5, syncopation: true, name: 'Metric Mod' }
} as const;

// Jazz and classical chord progressions
const CHORD_PROGRESSIONS = {
  // Pop/Rock progressions
  I_V_vi_IV: [0, 7, 9, 5],           // C-G-Am-F (pop progression)
  vi_IV_I_V: [9, 5, 0, 7],           // Am-F-C-G (alternative)
  I_vi_ii_V: [0, 9, 2, 7],           // C-Am-Dm-G (circle)
  
  // Jazz progressions
  ii_V_I: [2, 7, 0],                 // Dm7-G7-CMaj7
  iii_vi_ii_V_I: [4, 9, 2, 7, 0],    // Em7-Am7-Dm7-G7-CMaj7
  I_VI_ii_V: [0, 8, 2, 7],           // CMaj7-A7-Dm7-G7
  Giant_Steps: [0, 4, 8],            // Coltrane changes
  
  // Modal progressions
  DORIAN_i_IV: [0, 5],               // Dm-G (Dorian)
  LYDIAN_I_II: [0, 2],               // C-D (Lydian)
  MIXOLYDIAN_I_bVII: [0, 10],        // C-Bb (Mixolydian)
  
  // Classical progressions
  I_IV_V_I: [0, 5, 7, 0],            // C-F-G-C (authentic cadence)
  vi_ii_V_I: [9, 2, 7, 0],           // Am-Dm-G-C (deceptive)
  
  // Experimental/Modern
  QUARTAL_HARMONY: [0, 5, 10, 3],    // Quartal stacks
  CHROMATIC_MEDIANT: [0, 4, 8, 0],   // Chromatic mediants
  NEAPOLITAN_SIXTH: [0, 1, 5, 0],    // Classical Neapolitan
} as const;

type RhythmicPattern = typeof RHYTHMIC_PATTERNS[keyof typeof RHYTHMIC_PATTERNS];
type ChordProgression = typeof CHORD_PROGRESSIONS[keyof typeof CHORD_PROGRESSIONS];
type MusicalScale = typeof MUSICAL_SCALES[keyof typeof MUSICAL_SCALES];

// Enhanced musical assignment based on position and musical theory
const assignMusicalPatterns = (stickers: Sticker[]) => {
  return stickers.map((sticker, index) => {
    const x = sticker.x / 800; // Normalize to 0-1
    const y = sticker.y / 600; // Normalize to 0-1
    
    // Create musical zones with different scales and rhythms
    if (x < 0.25) { // Left quarter - Pentatonic and Blues
      const scale = y < 0.5 ? MUSICAL_SCALES.PENTATONIC : MUSICAL_SCALES.BLUES;
      const rhythm = y < 0.33 ? RHYTHMIC_PATTERNS.SWING_EIGHTH : 
                     y < 0.66 ? RHYTHMIC_PATTERNS.SHUFFLE : RHYTHMIC_PATTERNS.BOSSA_NOVA;
      return { rhythm, scale, mode: 'harmonic' };
    } else if (x < 0.5) { // Second quarter - Modal jazz
      const scale = y < 0.33 ? MUSICAL_SCALES.DORIAN : 
                    y < 0.66 ? MUSICAL_SCALES.MIXOLYDIAN : MUSICAL_SCALES.LYDIAN;
      const rhythm = y < 0.5 ? RHYTHMIC_PATTERNS.SYNCOPATED_QUARTER : RHYTHMIC_PATTERNS.LATIN_CLAVE;
      return { rhythm, scale, mode: 'melodic' };
    } else if (x < 0.75) { // Third quarter - Complex polyrhythms
      const scale = y < 0.5 ? MUSICAL_SCALES.WHOLE_TONE : MUSICAL_SCALES.CHROMATIC;
      const rhythm = y < 0.33 ? RHYTHMIC_PATTERNS.POLYRHYTHM_3_4 : 
                     y < 0.66 ? RHYTHMIC_PATTERNS.POLYRHYTHM_5_4 : RHYTHMIC_PATTERNS.METRIC_MODULATION;
      return { rhythm, scale, mode: 'percussive' };
    } else { // Right quarter - Afro/World rhythms
      const scale = y < 0.5 ? MUSICAL_SCALES.PHRYGIAN : MUSICAL_SCALES.MAJOR;
      const rhythm = y < 0.33 ? RHYTHMIC_PATTERNS.AFROBEAT : 
                     y < 0.66 ? RHYTHMIC_PATTERNS.REGGAE_SKANK : RHYTHMIC_PATTERNS.TRIPLET_SWING;
      return { rhythm, scale, mode: 'world' };
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
  
  // Select appropriate chord progression based on the groups
  const selectedProgression = harmonicGroups.length <= 4 ? 
    CHORD_PROGRESSIONS.ii_V_I : 
    harmonicGroups.length <= 6 ? 
    CHORD_PROGRESSIONS.iii_vi_ii_V_I : 
    CHORD_PROGRESSIONS.Giant_Steps;
  
  return { 
    chordGroups: harmonicGroups.map(g => g.indices), 
    progression: [...selectedProgression],
    harmonicFunctions: harmonicGroups.map(g => g.function)
  };
};

// Enhanced musical timing with swing and syncopation
const calculateMusicalTiming = (
  stickerIndex: number, 
  pattern: RhythmicPattern, 
  baseTempo: number,
  currentTime: number,
  phaseOffset: number = 0
): boolean => {
  const beatDuration = (60 / baseTempo) * 1000; // Beat duration in ms
  const patternDuration = beatDuration * pattern.division;
  
  // Apply swing feel
  const swingAmount = pattern.swing || 0;
  const adjustedTime = currentTime + (phaseOffset * beatDuration);
  
  let timeInPattern = adjustedTime % patternDuration;
  
  // Apply swing to eighth note subdivisions
  if (pattern.division <= 0.5 && swingAmount > 0) {
    const eighthDuration = beatDuration * 0.5;
    const swingOffset = eighthDuration * swingAmount * 0.3;
    const beatPhase = (adjustedTime % beatDuration) / beatDuration;
    
    if (beatPhase > 0.25 && beatPhase < 0.75) {
      timeInPattern += swingOffset;
    }
  }
  
  // Apply syncopation
  if (pattern.syncopation) {
    const syncopationOffset = (Math.sin(adjustedTime * 0.001) * beatDuration * 0.1);
    timeInPattern += syncopationOffset;
  }
  
  // Trigger window - smaller for faster patterns
  const triggerWindow = Math.max(20, 80 * pattern.division);
  return (timeInPattern % patternDuration) < triggerWindow;
};

export const useSequencer = (placedStickers: Sticker[], isPlaying: boolean) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [sequenceTempo, setSequenceTempo] = useState(120);
  const [activeStickers, setActiveStickers] = useState<Set<number>>(new Set());
  const [musicalPatterns, setMusicalPatterns] = useState<Array<{rhythm: RhythmicPattern, scale: MusicalScale, mode: string}>>([]);
  const [chordProgression, setChordProgression] = useState<{chordGroups: number[][], progression: number[], harmonicFunctions: string[]}>({chordGroups: [], progression: [], harmonicFunctions: []});
  const [currentChordIndex, setCurrentChordIndex] = useState(0);
  const [musicalPhase, setMusicalPhase] = useState(0); // For phrase structure
  const [dynamicTempo, setDynamicTempo] = useState(120);
  
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

  // Advanced musical sequencer with phrase structure and dynamics
  useEffect(() => {
    if (isPlaying && placedStickers.length > 0 && musicalPatterns.length > 0) {
      startTimeRef.current = Date.now();
      phraseTimeRef.current = 0;
      
      const tick = () => {
        const currentTime = Date.now() - startTimeRef.current;
        const newActiveStickers = new Set<number>();
        
        // Musical phrase structure (8-bar phrases)
        const phraseDuration = (60 / sequenceTempo) * 8000; // 8 beats per phrase
        const currentPhase = Math.floor(currentTime / phraseDuration) % 4; // 4 phrases = 32 bars
        
        if (currentPhase !== musicalPhase) {
          setMusicalPhase(currentPhase);
          
          // Dynamic tempo changes between phrases
          const tempoModulation = currentPhase === 0 ? 1.0 : 
                                 currentPhase === 1 ? 1.05 : 
                                 currentPhase === 2 ? 0.95 : 1.1;
          setDynamicTempo(sequenceTempo * tempoModulation);
        }
        
        // Check each sticker's musical pattern
        placedStickers.forEach((sticker, index) => {
          const musicalPattern = musicalPatterns[index];
          if (musicalPattern) {
            const phaseOffset = currentPhase * 0.25; // Slight phase offset between phrases
            if (calculateMusicalTiming(index, musicalPattern.rhythm, dynamicTempo, currentTime, phaseOffset)) {
              newActiveStickers.add(index);
            }
          }
        });
        
        // Advanced chord progression with voice leading
        if (chordProgression.chordGroups.length > 0) {
          const chordChangeDuration = (60 / dynamicTempo) * 2000; // Change every 2 beats
          const currentChord = Math.floor(currentTime / chordChangeDuration) % chordProgression.chordGroups.length;
          
          if (currentChord !== currentChordIndex) {
            setCurrentChordIndex(currentChord);
          }
          
          // Add harmonic emphasis based on musical function
          chordProgression.chordGroups[currentChord]?.forEach((stickerIndex, voiceIndex) => {
            const musicalPattern = musicalPatterns[stickerIndex];
            if (musicalPattern) {
              // Stagger chord voices for better voice leading
              const voiceOffset = voiceIndex * 0.1;
              if (calculateMusicalTiming(stickerIndex, musicalPattern.rhythm, dynamicTempo, currentTime, voiceOffset)) {
                newActiveStickers.add(stickerIndex);
              }
            }
          });
        }
        
        setActiveStickers(newActiveStickers);
        
        // Set current step for visual feedback
        if (newActiveStickers.size > 0) {
          setCurrentStep(Array.from(newActiveStickers)[0]);
        }
      };
      
      // High-precision timing for musical accuracy
      masterClockRef.current = setInterval(tick, 10);
      
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
    rhythmicPatterns: RHYTHMIC_PATTERNS,
    musicalScales: MUSICAL_SCALES,
    chordProgressions: CHORD_PROGRESSIONS
  };
};