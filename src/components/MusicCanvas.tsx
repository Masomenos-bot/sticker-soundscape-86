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
}, ref) => {
  const canvasRef = useRef<HTMLDivElement>(null);

  // Handle custom drop events from touch
  const handleCustomDrop = useCallback((event: CustomEvent) => {
    const { sticker, x, y } = event.detail;
    onStickerDrop(sticker, x, y);
  }, [onStickerDrop]);

  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      canvas.addEventListener('stickerDrop', handleCustomDrop as EventListener);
      return () => {
        canvas.removeEventListener('stickerDrop', handleCustomDrop as EventListener);
      };
    }
  }, [handleCustomDrop]);

  const handleDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
    event.dataTransfer.dropEffect = "copy";
    console.log("✅ CANVAS: Drag over canvas detected");
  }, []);

  const handleDragEnter = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
    console.log("✅ CANVAS: Drag enter canvas");
  }, []);

  const handleDragLeave = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
    console.log("Drag leave canvas");
  }, []);

  const handleDrop = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
    console.log("🎯 CANVAS: Drop event triggered!");

    try {
      const stickerDataString = event.dataTransfer.getData("application/json");
      console.log("Drop data received:", stickerDataString);
      
      if (!stickerDataString) {
        console.log("No drop data found");
        return;
      }

      const stickerData: StickerData = JSON.parse(stickerDataString);
      console.log("Parsed sticker data:", stickerData);

      if (canvasRef.current) {
        const rect = canvasRef.current.getBoundingClientRect();
        const x = event.clientX - rect.left - 40; // Center the sticker
        const y = event.clientY - rect.top - 40;
        
        console.log("Dropping sticker at:", x, y);
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
        data-canvas="true"
        className="relative w-full h-full min-h-[400px] bg-muted/20 transition-all duration-300"
        style={{
          WebkitUserSelect: 'none',
          WebkitTouchCallout: 'none',
        }}
        onDragOver={handleDragOver}
        onDragEnter={handleDragEnter}
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
          />
        ))}
      </div>
    </div>
  );
});

MusicCanvas.displayName = "MusicCanvas";