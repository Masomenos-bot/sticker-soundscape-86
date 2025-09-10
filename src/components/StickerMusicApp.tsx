import React, { useState, useRef, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { StickerPalette } from "./StickerPalette";
import { MusicCanvas } from "./MusicCanvas";
import { Volume2, Pause, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export interface Sticker {
  id: string;
  src: string;
  soundUrl?: string;
  x: number;
  y: number;
  width: number;
  height: number;
  volume: number;
  rotation?: number;
}

export interface StickerData {
  id: string;
  src: string;
  alt: string;
  soundUrl?: string;
}

const StickerMusicApp = () => {
  const [placedStickers, setPlacedStickers] = useState<Sticker[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [globalVolume, setGlobalVolume] = useState(0.7);
  const [audioInitialized, setAudioInitialized] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);

  // Initialize audio context
  useEffect(() => {
    const initAudio = async () => {
      try {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
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

  const handleStickerDrop = (stickerData: StickerData, x: number, y: number) => {
    const newSticker: Sticker = {
      id: `${stickerData.id}-${Date.now()}`,
      src: stickerData.src,
      soundUrl: stickerData.soundUrl,
      x,
      y,
      width: 80,
      height: 80,
      volume: 0.5,
      rotation: 0,
    };

    setPlacedStickers(prev => [...prev, newSticker]);
    toast(`Added ${stickerData.alt}!`, {
      duration: 1500,
    });
  };

  const handleStickerUpdate = (id: string, updates: Partial<Sticker>) => {
    setPlacedStickers(prev =>
      prev.map(sticker =>
        sticker.id === id ? { ...sticker, ...updates } : sticker
      )
    );
  };

  const handleStickerRemove = (id: string) => {
    setPlacedStickers(prev => prev.filter(sticker => sticker.id !== id));
  };

  const clearCanvas = () => {
    setPlacedStickers([]);
    toast("Canvas cleared!", {
      duration: 1500,
    });
  };

  const initializeAudio = async () => {
    if (!audioInitialized) {
      try {
        if (audioContextRef.current) {
          await audioContextRef.current.resume();
        }
        setAudioInitialized(true);
        setIsPlaying(true);
        toast("Audio initialized! 🎵", {
          duration: 1500,
        });
      } catch (error) {
        console.error("Failed to initialize audio:", error);
        toast("Audio initialization failed", {
          duration: 2000,
        });
      }
    }
  };

  const togglePlayback = async () => {
    if (!audioInitialized) {
      await initializeAudio();
      return;
    }
    
    setIsPlaying(prev => !prev);
    toast(isPlaying ? "Paused" : "Playing", {
      duration: 1000,
    });
  };

  return (
    <div className="min-h-screen p-3 sm:p-6 bg-gradient-background">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-4 sm:mb-8 text-center">
          <img 
            src="/lovable-uploads/36893164-d517-4d49-bcd4-e2bcad6cc0ce.png"
            alt="My Masomenos - For All Of Us Kids"
            className="mx-auto w-full h-auto max-h-16 sm:max-h-20 object-contain transition-all duration-300"
          />
        </div>

        {/* Main Layout */}
        <div className="flex flex-col gap-8 sm:gap-12">
          {/* Sticker Palette */}
          <div className="w-full">
            <Card className="p-3 bg-gradient-card shadow-card border-0 h-[200px] flex-shrink-0 mb-4 sm:mb-6">
              <StickerPalette />
            </Card>
          </div>

          {/* Music Canvas */}
          <div className="w-full flex-1">
            <Card className="bg-gradient-card shadow-card border-4 border-black rounded-none h-[calc(100vh-480px)] min-h-[400px]">
              <MusicCanvas
                stickers={placedStickers}
                onStickerDrop={handleStickerDrop}
                onStickerUpdate={handleStickerUpdate}
                onStickerRemove={handleStickerRemove}
                isPlaying={isPlaying}
                globalVolume={globalVolume}
              />
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StickerMusicApp;