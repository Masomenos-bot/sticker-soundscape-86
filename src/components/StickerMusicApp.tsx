import React, { useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { StickerPalette } from "./StickerPalette";
import { MusicCanvas } from "./MusicCanvas";
import { MediaGallery } from "./MediaGallery";
import { Video } from "lucide-react";
import { useAudio } from "@/hooks/useAudio";
import { useStickers } from "@/hooks/useStickers";
import { useSequencer } from "@/hooks/useSequencer";
import { useExport } from "@/hooks/useExport";
import { ControlPanel } from "./ControlPanel";

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
  stepIndex: number;
}

export interface StickerData {
  id: string;
  src: string;
  alt: string;
  soundUrl?: string;
}

const StickerMusicApp = () => {
  const canvasRef = useRef<HTMLDivElement>(null);
  
  // Control board state
  const [controlBoardPosition, setControlBoardPosition] = useState({ x: 20, y: 120 });
  const [isDraggingControlBoard, setIsDraggingControlBoard] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isControlBoardCollapsed, setIsControlBoardCollapsed] = useState(false);

  // Custom hooks
  const audio = useAudio();
  const stickers = useStickers();
  const sequencer = useSequencer(stickers.placedStickers, audio.isPlaying);
  const exportTools = useExport(canvasRef, audio.isPlaying);

  // Handle sticker drop with audio initialization
  const handleStickerDrop = async (stickerData: StickerData, x: number, y: number) => {
    await stickers.handleStickerDrop(stickerData, x, y);
    
    // Auto-start playback when first sticker is placed
    if (stickers.placedStickers.length === 0) {
      if (!audio.audioInitialized) {
        await audio.initializeAudio();
      } else {
        await audio.handlePlay();
      }
    }
  };

  // Control board drag handlers
  const handleControlBoardDragStart = (e: React.MouseEvent | React.TouchEvent) => {
    setIsDraggingControlBoard(true);
    
    if ('clientX' in e) {
      // Mouse event
      setDragOffset({
        x: e.clientX - controlBoardPosition.x,
        y: e.clientY - controlBoardPosition.y
      });
    } else if (e.touches && e.touches.length === 1) {
      // Touch event
      const touch = e.touches[0];
      setDragOffset({
        x: touch.clientX - controlBoardPosition.x,
        y: touch.clientY - controlBoardPosition.y
      });
    }
  };

  // Global event handlers for control board dragging
  React.useEffect(() => {
    const handleMove = (e: MouseEvent | TouchEvent) => {
      if (!isDraggingControlBoard) return;
      
      let clientX: number, clientY: number;
      
      if (e instanceof MouseEvent) {
        clientX = e.clientX;
        clientY = e.clientY;
      } else if (e.touches && e.touches.length === 1) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
      } else {
        return;
      }
      
      setControlBoardPosition({
        x: clientX - dragOffset.x,
        y: clientY - dragOffset.y
      });
    };

    const handleEnd = () => setIsDraggingControlBoard(false);

    if (isDraggingControlBoard) {
      document.addEventListener('mousemove', handleMove);
      document.addEventListener('mouseup', handleEnd);
      document.addEventListener('touchmove', handleMove, { passive: false });
      document.addEventListener('touchend', handleEnd);
    }

    return () => {
      document.removeEventListener('mousemove', handleMove);
      document.removeEventListener('mouseup', handleEnd);
      document.removeEventListener('touchmove', handleMove);
      document.removeEventListener('touchend', handleEnd);
    };
  }, [isDraggingControlBoard, dragOffset]);

  const handleControlBoardToggle = () => {
    const willBeCollapsed = !isControlBoardCollapsed;
    setIsControlBoardCollapsed(willBeCollapsed);
    
    if (willBeCollapsed) {
      stickers.setSelectedStickers([]);
      stickers.setIsMultiSelectMode(false);
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
                  onClick={stickers.selectAllStickers}
                  className="w-10 h-10 hover:scale-110 transition-transform duration-200 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center"
                  title="Select all stickers"
                >
                  <span className="text-white font-bold text-xs">ALL</span>
                </button>
                <button
                  onClick={audio.isPlaying ? audio.handlePause : audio.handlePlay}
                  className="w-10 h-10 hover:scale-110 transition-transform duration-200"
                >
                  <img
                    src={audio.isPlaying 
                      ? "/lovable-uploads/65258414-94a1-467e-9cc8-d282505d1e1e.png" 
                      : "/lovable-uploads/5ec10ca7-cdd4-4ecc-bcbe-5243239cecc7.png"
                    }
                    alt={audio.isPlaying ? "Pause" : "Play"}
                    className="w-full h-full object-contain"
                  />
                </button>
                <button
                  onClick={exportTools.handleExport}
                  className="w-10 h-10 hover:scale-110 transition-transform duration-200"
                >
                  <img
                    src="/lovable-uploads/fedcc64b-0b85-4fe3-93dc-05e76aa5ee7c.png"
                    alt="Share/Export"
                    className="w-full h-full object-contain"
                  />
                </button>
                <button
                  onClick={exportTools.handleVideoExport}
                  disabled={exportTools.isRecording}
                  className={`w-10 h-10 hover:scale-110 transition-transform duration-200 ${
                    exportTools.isRecording ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                  title="Export 8-second video"
                >
                  <Video className={`w-6 h-6 ${exportTools.isRecording ? 'text-red-500 animate-pulse' : 'text-foreground'}`} />
                </button>
              </div>

              <MusicCanvas
                ref={canvasRef}
                stickers={stickers.placedStickers}
                onStickerDrop={handleStickerDrop}
                onStickerUpdate={stickers.handleStickerUpdate}
                onStickerRemove={stickers.handleStickerRemove}
                onLayerChange={stickers.handleLayerChange}
                isPlaying={audio.isPlaying}
                globalVolume={audio.globalVolume}
                currentStep={sequencer.currentStep}
                sequenceTempo={sequencer.sequenceTempo}
                selectedStickers={stickers.selectedStickers}
                isMultiSelectMode={stickers.isMultiSelectMode}
                onStickerSelect={stickers.handleStickerSelect}
                onGroupMove={stickers.handleGroupMove}
              />
            </Card>
            
            {/* Control Panel */}
            <ControlPanel
              selectedStickers={stickers.selectedStickers}
              placedStickers={stickers.placedStickers}
              isCollapsed={isControlBoardCollapsed}
              position={controlBoardPosition}
              onToggle={handleControlBoardToggle}
              onDragStart={handleControlBoardDragStart}
              onStickerUpdate={stickers.handleStickerUpdate}
              onLayerChange={stickers.handleLayerChange}
              onStickerRemove={stickers.handleStickerRemove}
            />
          </div>

          {/* Media Gallery */}
          <div className="w-full">
            <Card className="p-4 bg-gradient-card shadow-card border-0">
              <MediaGallery
                videos={exportTools.exportedVideos}
                onDeleteVideo={exportTools.handleDeleteVideo}
              />
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StickerMusicApp;