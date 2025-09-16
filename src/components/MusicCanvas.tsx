import React, { useRef, useCallback, forwardRef, useEffect, useState } from "react";
import { Sticker, StickerData } from "./StickerMusicApp";
import { ResizableSticker } from "./ResizableSticker";

// Sticker images array for fallback reconstruction
const stickerImages = [
  "80a5a32f-b6e0-4fc0-9828-340c4e6a2272", // pink curved shape
  "f52968af-b432-4762-935c-3c181755a8af", // orange/pink curved shape
  "7fdfb4ba-2292-4ee7-89a1-8048a2047214", // yellow star shape
  "d6ae8202-52be-4fa6-97a3-1394cd1c7c78", // yellow bone shape
  "a7f0adbd-15b1-4b17-b0f1-8a6d5a0e7001", // colorful capsule shape
  "fa3bc30e-9cdf-40d9-8dbc-ce44cb0e10f5", // yellow triangle shape
  "2a88bcaa-fec6-48fa-837e-95de23e3bc43", // brown oval shape
  "b304de86-466d-4ce1-91d4-f8ecdc7f06c6", // blue triangle shape
  "5abf2164-20c3-42cd-9bc8-ae05e7adba20", // brown teardrop shape
  "cac603f1-4efa-4d4a-ad66-4488da9942f0", // colorful circle shape
  "01c897d2-c9a9-491d-8af8-5dcb32fc4ec7", // red flame
  "5101d5bd-1d68-4bca-b7c5-c3b54a4620ff", // yellow hat
  "710268c3-f3e7-460f-a661-f975b14273b9", // pink teardrop
  "7f7ba30d-08cc-4deb-8bbb-07681bed7e40", // single eye
  "a63f8201-2466-47e6-ae4b-3d1c5d1b751b", // two eyes
  "bc6e8452-029b-4eac-964f-05be1c184b9b", // orange eye
  "60c55b7c-a3a3-41f3-8b78-7bae3fd9cc4e", // red mouth
  "ea94338e-9036-42f5-87b1-045a93b25446", // blue bow tie
  "609807b5-fa8a-4fca-aa2b-494b72b913d1", // red heart
  "65d3d82a-acad-4f83-84ca-f2611a3e4677", // green star
];

// Sound mapping for fallback reconstruction
const soundMapping: { [key: number]: string } = {
  0: "/SOUND FOR BUTTON SOUND-play-pause-share-mirroir-trash-previous-next MP3/hue'.mp3",
  1: "/SOUND FOR BUTTON SOUND-play-pause-share-mirroir-trash-previous-next MP3/play.mp3",
  2: "/SOUND FOR BUTTON SOUND-play-pause-share-mirroir-trash-previous-next MP3/pause.mp3",
  3: "/SOUND FOR BUTTON SOUND-play-pause-share-mirroir-trash-previous-next MP3/next'.mp3",
  4: "/SOUND FOR BUTTON SOUND-play-pause-share-mirroir-trash-previous-next MP3/previous'.mp3",
};

const getStickerImageByIndex = (index: number): string => {
  return stickerImages[index] || stickerImages[0];
};

const generateSoundUrl = (index: number): string => {
  return soundMapping[index] || `tone-${index}`;
};

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
  activeStickers: Set<number>;
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
  activeStickers,
  selectedStickers,
  isMultiSelectMode,
  onStickerSelect,
  onGroupMove,
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
        
        // Reconstruct sticker data from ID
        const index = parseInt(stickerId.split('-')[1]);
        stickerData = {
          id: stickerId,
          src: `/lovable-uploads/${getStickerImageByIndex(index)}.png`,
          alt: `Sticker ${index + 1}`,
          soundUrl: generateSoundUrl(index),
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
        className="relative w-full h-full min-h-[400px] bg-muted/20 transition-all duration-300"
        style={{
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
          />
        ))}
      </div>
    </div>
  );
});

MusicCanvas.displayName = "MusicCanvas";