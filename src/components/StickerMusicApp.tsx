import React, { useState, useRef, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { StickerPalette } from "./StickerPalette";
import { MusicCanvas } from "./MusicCanvas";
import { Volume2, Pause, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import html2canvas from "html2canvas";
// @ts-ignore
import GIF from "gif.js";

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
  mirrored?: boolean;
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
  const canvasRef = useRef<HTMLDivElement>(null);

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
      mirrored: false,
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
    console.log(`Layer change requested: ${direction} for sticker ${id}`);
    setPlacedStickers(prev => {
      const currentSticker = prev.find(s => s.id === id);
      if (!currentSticker) {
        console.log('Sticker not found:', id);
        return prev;
      }

      console.log('Current sticker z-index:', currentSticker.zIndex);
      const otherStickers = prev.filter(s => s.id !== id);
      
      if (direction === 'up') {
        // Find the sticker with the next higher z-index to swap with
        const nextSticker = otherStickers
          .filter(s => s.zIndex > currentSticker.zIndex)
          .sort((a, b) => a.zIndex - b.zIndex)[0];
        
        if (nextSticker) {
          console.log('Swapping with sticker at z-index:', nextSticker.zIndex);
          // Swap z-indices
          return prev.map(s => {
            if (s.id === id) return { ...s, zIndex: nextSticker.zIndex };
            if (s.id === nextSticker.id) return { ...s, zIndex: currentSticker.zIndex };
            return s;
          });
        } else {
          // No sticker above, move to top
          const maxZ = Math.max(...prev.map(s => s.zIndex));
          console.log('Moving to top, new z-index:', maxZ + 1);
          return prev.map(s => s.id === id ? { ...s, zIndex: maxZ + 1 } : s);
        }
      } else {
        // Find the sticker with the next lower z-index to swap with
        const prevSticker = otherStickers
          .filter(s => s.zIndex < currentSticker.zIndex)
          .sort((a, b) => b.zIndex - a.zIndex)[0];
        
        if (prevSticker) {
          console.log('Swapping with sticker at z-index:', prevSticker.zIndex);
          // Swap z-indices
          return prev.map(s => {
            if (s.id === id) return { ...s, zIndex: prevSticker.zIndex };
            if (s.id === prevSticker.id) return { ...s, zIndex: currentSticker.zIndex };
            return s;
          });
        } else {
          // No sticker below, move to bottom
          const minZ = Math.min(...prev.map(s => s.zIndex));
          const newZ = Math.max(0, minZ - 1);
          console.log('Moving to bottom, new z-index:', newZ);
          return prev.map(s => s.id === id ? { ...s, zIndex: newZ } : s);
        }
      }
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

  const handleExport = async () => {
    if (!canvasRef.current) return;
    
    if (isPlaying) {
      // Export as 15-second GIF
      toast("Creating 15-second GIF... This may take a moment!", { duration: 3000 });
      
      try {
        const gif = new GIF({
          workers: 2,
          quality: 10,
          width: canvasRef.current.offsetWidth,
          height: canvasRef.current.offsetHeight,
          workerScript: 'https://cdn.jsdelivr.net/npm/gif.js@0.2.0/dist/gif.worker.js'
        });

        const frameCount = 60; // 60 frames for 15 seconds (4 fps)
        const frameDelay = 250; // 250ms between frames (4 fps)
        
        for (let i = 0; i < frameCount; i++) {
          const canvas = await html2canvas(canvasRef.current, {
            backgroundColor: null,
            scale: 1,
            useCORS: true,
            allowTaint: true,
          });
          
          gif.addFrame(canvas, { delay: frameDelay });
          
          // Wait for frame delay to capture animation changes
          await new Promise(resolve => setTimeout(resolve, frameDelay));
        }

        gif.on('finished', function(blob: Blob) {
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.download = `sticker-animation-${Date.now()}.gif`;
          link.href = url;
          link.click();
          URL.revokeObjectURL(url);
          toast("15-second GIF exported! 🎬", { duration: 2000 });
        });

        gif.render();
        
      } catch (error) {
        console.error('GIF export failed:', error);
        toast("GIF export failed, exporting as PNG instead", { duration: 2000 });
        // Fallback to PNG export
        exportAsPNG();
      }
    } else {
      // Export as PNG when paused
      exportAsPNG();
    }
  };

  const exportAsPNG = async () => {
    if (!canvasRef.current) return;
    
    try {
      toast("Capturing canvas...", { duration: 1000 });
      
      const canvas = await html2canvas(canvasRef.current, {
        backgroundColor: null,
        scale: 2,
        useCORS: true,
        allowTaint: true,
      });
      
      // Convert canvas to blob
      canvas.toBlob((blob) => {
        if (blob) {
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.download = `sticker-canvas-${Date.now()}.png`;
          link.href = url;
          link.click();
          URL.revokeObjectURL(url);
          toast("Canvas exported! 📸", { duration: 2000 });
        }
      }, 'image/png');
    } catch (error) {
      console.error('PNG export failed:', error);
      toast("Export failed", { duration: 2000 });
    }
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
            <Card className="bg-gradient-card shadow-card border-4 border-black rounded-none h-[calc(100vh-480px)] min-h-[400px] relative">
              {/* Control Buttons */}
              <div className="absolute top-2 right-2 z-20 flex gap-2">
                <button
                  onClick={isPlaying ? handlePause : handlePlay}
                  className="w-10 h-10 hover:scale-110 transition-transform duration-200"
                >
                  <img
                    src={isPlaying ? "/lovable-uploads/65258414-94a1-467e-9cc8-d282505d1e1e.png" : "/lovable-uploads/5ec10ca7-cdd4-4ecc-bcbe-5243239cecc7.png"}
                    alt={isPlaying ? "Pause" : "Play"}
                    className="w-full h-full object-contain"
                  />
                </button>
                <button
                  onClick={handleExport}
                  className="w-10 h-10 hover:scale-110 transition-transform duration-200"
                >
                  <img
                    src="/lovable-uploads/fedcc64b-0b85-4fe3-93dc-05e76aa5ee7c.png"
                    alt="Share/Export"
                    className="w-full h-full object-contain"
                  />
                </button>
              </div>
              <MusicCanvas
                ref={canvasRef}
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