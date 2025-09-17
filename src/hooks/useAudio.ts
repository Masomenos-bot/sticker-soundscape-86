import { useRef, useState, useEffect } from "react";
import { toast } from "sonner";

export const useAudio = () => {
  const [audioInitialized, setAudioInitialized] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [globalVolume, setGlobalVolume] = useState(0.4); // Start quieter for contemplative experience
  const audioContextRef = useRef<AudioContext | null>(null);
  const masterGainRef = useRef<GainNode | null>(null);

  // Initialize audio context with master gain for recording
  useEffect(() => {
    const initAudio = async () => {
      try {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        
        // Create master gain node for all audio
        if (audioContextRef.current) {
          masterGainRef.current = audioContextRef.current.createGain();
          masterGainRef.current.connect(audioContextRef.current.destination);
        }
      } catch (error) {
        console.error("Audio context not supported:", error);
      }
    };
    
    initAudio();
    
    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  const initializeAudio = async () => {
    if (!audioInitialized) {
      try {
        const testContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        await testContext.resume();
        
        // Play a brief test tone
        const testOsc = testContext.createOscillator();
        const testGain = testContext.createGain();
        
        testOsc.connect(testGain);
        testGain.connect(testContext.destination);
        
        testOsc.frequency.setValueAtTime(440, testContext.currentTime);
        testGain.gain.setValueAtTime(0.1, testContext.currentTime);
        testGain.gain.exponentialRampToValueAtTime(0.01, testContext.currentTime + 0.1);
        
        testOsc.start(testContext.currentTime);
        testOsc.stop(testContext.currentTime + 0.1);
        
        setTimeout(() => testContext.close(), 200);
        
        setAudioInitialized(true);
        setIsPlaying(true);
        
        toast("🎵 Créez votre personnage musical! Plus de stickers = musique plus riche ✨", { duration: 3000 });
      } catch (error) {
        console.error("Failed to initialize audio:", error);
        toast("❌ Audio initialization failed. Check browser settings.", { duration: 3000 });
      }
    }
  };

  const togglePlayback = async () => {
    if (!audioInitialized) {
      await initializeAudio();
      return;
    }
    
    const newState = !isPlaying;
    setIsPlaying(newState);
    toast(newState ? "Playing" : "Paused", { duration: 1000 });
  };

  const handlePlay = async () => {
    if (!audioInitialized) {
      await initializeAudio();
      return;
    }
    setIsPlaying(true);
    toast("Playing", { duration: 1000 });
  };

  const handlePause = () => {
    setIsPlaying(false);
    toast("Paused", { duration: 1000 });
  };

  return {
    audioInitialized,
    isPlaying,
    globalVolume,
    setGlobalVolume,
    audioContextRef,
    masterGainRef,
    initializeAudio,
    togglePlayback,
    handlePlay,
    handlePause
  };
};