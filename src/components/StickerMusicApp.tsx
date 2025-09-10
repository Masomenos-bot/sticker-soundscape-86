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
  zIndex: number;
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
    const maxZIndex = Math.max(0, ...placedStickers.map(s => s.zIndex));
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
      zIndex: maxZIndex + 1,
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

  const handleLayerChange = (id: string, direction: 'up' | 'down') => {
    setPlacedStickers(prev => {
      const sticker = prev.find(s => s.id === id);
      if (!sticker) return prev;

      const otherStickers = prev.filter(s => s.id !== id);
      
      if (direction === 'up') {
        // Find sticker with next higher zIndex
        const nextSticker = otherStickers
          .filter(s => s.zIndex > sticker.zIndex)
          .sort((a, b) => a.zIndex - b.zIndex)[0];
        
        if (nextSticker) {
          return prev.map(s => {
            if (s.id === id) return { ...s, zIndex: nextSticker.zIndex };
            if (s.id === nextSticker.id) return { ...s, zIndex: sticker.zIndex };
            return s;
          });
        }
      } else {
        // Find sticker with next lower zIndex
        const prevSticker = otherStickers
          .filter(s => s.zIndex < sticker.zIndex)
          .sort((a, b) => b.zIndex - a.zIndex)[0];
        
        if (prevSticker) {
          return prev.map(s => {
            if (s.id === id) return { ...s, zIndex: prevSticker.zIndex };
            if (s.id === prevSticker.id) return { ...s, zIndex: sticker.zIndex };
            return s;
          });
        }
      }
      
      return prev;
    });
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
                onLayerChange={handleLayerChange}
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