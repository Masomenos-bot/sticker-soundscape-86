import React, { useRef, useCallback, forwardRef } from "react";
import { Sticker, StickerData } from "./StickerMusicApp";
import { ResizableSticker } from "./ResizableSticker";

interface MusicCanvasProps {
  stickers: Sticker[];
  onStickerDrop: (sticker: StickerData, x: number, y: number) => void;
  onStickerUpdate: (id: string, updates: Partial<Sticker>) => void;
  onStickerRemove: (id: string) => void;
  onLayerChange: (id: string, direction: 'up' | 'down') => void;
  isPlaying: boolean;
  globalVolume: number;
  currentStep: number;
  sequenceTempo: number;
  selectedStickers: string[];
  isMultiSelectMode: boolean;
  onStickerSelect: (id: string, isSelected: boolean) => void;
  onGroupMove: (deltaX: number, deltaY: number) => void;
  globalScaleMode: string;
}

export const MusicCanvas = forwardRef<HTMLDivElement, MusicCanvasProps>(({
  stickers,
  onStickerDrop,
  onStickerUpdate,
  onStickerRemove,
  onLayerChange,
  isPlaying,
  globalVolume,
  currentStep,
  sequenceTempo,
  selectedStickers,
  isMultiSelectMode,
  onStickerSelect,
  onGroupMove,
  globalScaleMode,
}, ref) => {
  const canvasRef = useRef<HTMLDivElement>(null);

  const handleDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.currentTarget.classList.add("drop-zone-active");
  }, []);

  const handleDragLeave = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.currentTarget.classList.remove("drop-zone-active");
  }, []);

  const handleDrop = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.currentTarget.classList.remove("drop-zone-active");

    try {
      const stickerData: StickerData = JSON.parse(
        event.dataTransfer.getData("application/json")
      );

      if (canvasRef.current) {
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
        className="relative w-full h-full min-h-[400px] bg-muted/20 transition-all duration-300 touch-none"
        style={{
          touchAction: 'none',
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
          .map((sticker) => (
          <ResizableSticker
            key={sticker.id}
            sticker={sticker}
            onUpdate={onStickerUpdate}
            onRemove={onStickerRemove}
            onLayerChange={onLayerChange}
            isPlaying={isPlaying}
            globalVolume={globalVolume}
            canvasRef={canvasRef}
            isCurrentStep={sticker.stepIndex === currentStep}
            sequenceTempo={sequenceTempo}
            isSelected={selectedStickers.includes(sticker.id)}
            isMultiSelectMode={isMultiSelectMode}
            onSelect={onStickerSelect}
            onGroupMove={onGroupMove}
            globalScaleMode={globalScaleMode}
          />
        ))}
      </div>
    </div>
  );
});

MusicCanvas.displayName = "MusicCanvas";