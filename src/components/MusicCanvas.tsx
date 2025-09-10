import React, { useRef, useCallback } from "react";
import { Sticker, StickerData } from "./StickerMusicApp";
import { ResizableSticker } from "./ResizableSticker";

interface MusicCanvasProps {
  stickers: Sticker[];
  onStickerDrop: (sticker: StickerData, x: number, y: number) => void;
  onStickerUpdate: (id: string, updates: Partial<Sticker>) => void;
  onStickerRemove: (id: string) => void;
  isPlaying: boolean;
  globalVolume: number;
}

export const MusicCanvas = ({
  stickers,
  onStickerDrop,
  onStickerUpdate,
  onStickerRemove,
  isPlaying,
  globalVolume,
}: MusicCanvasProps) => {
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
    <div className="relative h-full p-6">
      <h2 className="text-xl font-semibold mb-4 text-center">
        Music Canvas
      </h2>
      
      <div
        ref={canvasRef}
        className="relative w-full h-full min-h-[500px] bg-muted/20 rounded-2xl border-2 border-dashed border-muted-foreground/30 transition-all duration-300"
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

        {stickers.map((sticker) => (
          <ResizableSticker
            key={sticker.id}
            sticker={sticker}
            onUpdate={onStickerUpdate}
            onRemove={onStickerRemove}
            isPlaying={isPlaying}
            globalVolume={globalVolume}
          />
        ))}
      </div>
    </div>
  );
};