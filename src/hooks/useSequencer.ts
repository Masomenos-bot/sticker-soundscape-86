import { useState, useRef, useEffect } from "react";
import { Sticker } from "@/components/StickerMusicApp";

export const useSequencer = (placedStickers: Sticker[], isPlaying: boolean) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [sequenceTempo, setSequenceTempo] = useState(120); // BPM
  const sequencerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isPlaying && placedStickers.length > 0) {
      const stepDuration = (60 / sequenceTempo) * 500; // Half beat steps
      
      setCurrentStep(0);
      
      sequencerRef.current = setInterval(() => {
        setCurrentStep(prev => (prev + 1) % placedStickers.length);
      }, stepDuration);
      
      return () => {
        if (sequencerRef.current) {
          clearInterval(sequencerRef.current);
        }
      };
    } else {
      if (sequencerRef.current) {
        clearInterval(sequencerRef.current);
        sequencerRef.current = null;
      }
    }
  }, [isPlaying, placedStickers.length, sequenceTempo]);

  return {
    currentStep,
    sequenceTempo,
    setSequenceTempo,
    setCurrentStep
  };
};