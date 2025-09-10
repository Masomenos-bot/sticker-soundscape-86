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
    <div className="min-h-screen p-6 bg-gradient-background">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold mb-2 bg-gradient-primary bg-clip-text text-transparent">
            Sticker Music Maker
          </h1>
          <p className="text-muted-foreground">
            Drag stickers to create musical compositions!
          </p>
        </div>

        {/* Controls */}
        <div className="flex justify-center gap-4 mb-6">
          <Button
            onClick={togglePlayback}
            variant={audioInitialized ? "secondary" : "default"}
            size="lg"
            className="gap-2"
          >
            {!audioInitialized ? (
              <>
                <Play className="w-5 h-5" />
                Start Music
              </>
            ) : isPlaying ? (
              <>
                <Pause className="w-5 h-5" />
                Pause
              </>
            ) : (
              <>
                <Play className="w-5 h-5" />
                Play
              </>
            )}
          </Button>
          
          <Button
            onClick={clearCanvas}
            variant="outline"
            size="lg"
          >
            Clear Canvas
          </Button>

          <div className="flex items-center gap-2">
            <Volume2 className="w-5 h-5 text-muted-foreground" />
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={globalVolume}
              onChange={(e) => setGlobalVolume(parseFloat(e.target.value))}
              className="w-24"
            />
          </div>
        </div>

        {/* Main Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[600px]">
          {/* Sticker Palette */}
          <Card className="p-6 bg-gradient-card shadow-card border-0">
            <h2 className="text-xl font-semibold mb-4 text-center">
              Sticker Palette
            </h2>
            <StickerPalette />
          </Card>

          {/* Music Canvas */}
          <div className="lg:col-span-2">
            <Card className="h-full bg-gradient-card shadow-card border-0">
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