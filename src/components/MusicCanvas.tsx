import React, { useRef, useCallback, forwardRef, useEffect, useState } from "react";
import { Sticker, StickerData } from "./StickerMusicApp";
import { ResizableSticker } from "./ResizableSticker";
import { getStickerConfigById, getStickerImagePath } from "../config/stickers";

interface MusicCanvasProps {
  stickers: Sticker[];
  onStickerDrop: (sticker: StickerData, x: number, y: number) => void;
  onStickerUpdate: (id: string, updates: Partial<Sticker>) => void;
  onStickerRemove: (id: string) => void;
  onLayerChange: (id: string, direction: 'up' | 'down') => void;
  isPlaying: boolean;
  isRecording?: boolean;
  globalVolume: number;
  currentStep: number;
  sequenceTempo: number;
  activeStickers: Set<number>;
  selectedStickers: string[];
  isMultiSelectMode: boolean;
  onStickerSelect: (id: string, isSelected: boolean) => void;
  onGroupMove: (deltaX: number, deltaY: number) => void;
  audioContext?: AudioContext | null;
  masterGain?: GainNode | null;
}

export const MusicCanvas = forwardRef<HTMLDivElement, MusicCanvasProps>(({
  stickers,
  onStickerDrop,
  onStickerUpdate,
  onStickerRemove,
  onLayerChange,
  isPlaying,
  isRecording = false,
  globalVolume,
  currentStep,
  sequenceTempo,
  activeStickers,
  selectedStickers,
  isMultiSelectMode,
  onStickerSelect,
  onGroupMove,
  audioContext,
  masterGain,
}, ref) => {
  const canvasRef = useRef<HTMLDivElement>(null);

  const handleDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
    event.currentTarget.classList.add("drop-zone-active");
  }, []);

  const handleDragLeave = useCallback((event: React.DragEvent) => {
    // Only remove the class if we're actually leaving the drop zone
    if (!event.currentTarget.contains(event.relatedTarget as Node)) {
      event.currentTarget.classList.remove("drop-zone-active");
    }
  }, []);

  const handleDrop = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.currentTarget.classList.remove("drop-zone-active");

    try {
      let stickerDataString = event.dataTransfer.getData("application/json");
      let stickerData: StickerData;
      
      if (stickerDataString) {
        stickerData = JSON.parse(stickerDataString);
      } else {
        // Fallback: try to get plain text ID and reconstruct
        const stickerId = event.dataTransfer.getData("text/plain");
        if (!stickerId) {
          console.warn("No drag data found");
          return;
        }
        
        // Reconstruct sticker data from centralized config
        const config = getStickerConfigById(stickerId);
        if (!config) {
          console.warn("Could not reconstruct sticker data for ID:", stickerId);
          return;
        }
        
        stickerData = {
          id: config.id,
          src: getStickerImagePath(config.imageId),
          alt: config.alt,
          soundUrl: config.soundUrl,
        };
      }

      if (canvasRef.current && stickerData) {
        const rect = canvasRef.current.getBoundingClientRect();
        const x = event.clientX - rect.left - 40; // Center the sticker
        const y = event.clientY - rect.top - 40;
        
        onStickerDrop(stickerData, Math.max(0, x), Math.max(0, y));
      }
    } catch (error) {
      console.error("Error dropping sticker:", error);
    }
  }, [onStickerDrop]);

  return (
    <div ref={ref} className="relative h-full p-3">
      <div
        ref={canvasRef}
        className={`hd-canvas-container relative w-full bg-muted/20 transition-all duration-300 ${
          isRecording ? 'recording-active' : ''
        }`}
        style={{
          aspectRatio: '16/9',
          minHeight: '400px',
          maxHeight: '80vh',
          WebkitUserSelect: 'none',
          WebkitTouchCallout: 'none',
        }}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {stickers.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center text-muted-foreground pointer-events-none">
            <div className="text-center">
              <div className="text-6xl mb-4">🎵</div>
              <p className="text-lg">Drop stickers here to make music!</p>
              <p className="text-sm mt-2 opacity-70">Each sticker creates a unique sound that loops!</p>
            </div>
          </div>
        )}



        {stickers
          .sort((a, b) => a.zIndex - b.zIndex)
          .map((sticker, index) => (
          <ResizableSticker
            key={sticker.id}
            sticker={sticker}
            onUpdate={onStickerUpdate}
            onRemove={onStickerRemove}
            onLayerChange={onLayerChange}
            isPlaying={isPlaying}
            globalVolume={globalVolume}
            canvasRef={canvasRef}
            isCurrentStep={activeStickers.has(index)}
            sequenceTempo={sequenceTempo}
            isSelected={selectedStickers.includes(sticker.id)}
            isMultiSelectMode={isMultiSelectMode}
            onSelect={onStickerSelect}
            onGroupMove={onGroupMove}
            audioContext={audioContext}
            masterGain={masterGain}
          />
        ))}
      </div>
    </div>
  );
});

MusicCanvas.displayName = "MusicCanvas";