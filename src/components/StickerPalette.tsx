import React from "react";
import { StickerData } from "./StickerMusicApp";
import { generateStickerConfigs, getStickerImagePath } from "../config/stickers";

export const StickerPalette = () => {
  const stickerConfigs = generateStickerConfigs();
  const stickerData: StickerData[] = stickerConfigs.map((config) => ({
    id: config.id,
    src: getStickerImagePath(config.imageId),
    alt: config.alt,
    soundUrl: config.soundUrl,
  }));

  const handleDragStart = (event: React.DragEvent<HTMLDivElement>, sticker: StickerData) => {
    try {
      event.dataTransfer.effectAllowed = 'copy';
      event.dataTransfer.setData("application/json", JSON.stringify(sticker));
      event.dataTransfer.setData("text/plain", sticker.id); // Fallback
      event.currentTarget.classList.add("dragging");
    } catch (error) {
      console.error("Error starting drag:", error);
    }
  };

  const handleDragEnd = (event: React.DragEvent<HTMLDivElement>) => {
    event.currentTarget.classList.remove("dragging");
  };

  return (
    <div className="flex flex-col gap-2 h-full overflow-x-auto scrollbar-hide select-none">
      <div className="flex gap-3 flex-shrink-0">
        {stickerData.slice(0, Math.ceil(stickerData.length / 2)).map((sticker) => (
          <div
            key={sticker.id}
            className="flex-shrink-0 aspect-square w-20 cursor-grab active:cursor-grabbing transition-all duration-300 hover:scale-110 touch-manipulation select-none"
            draggable
            onDragStart={(e) => handleDragStart(e, sticker)}
            onDragEnd={handleDragEnd}
          >
            <img
              src={sticker.src}
              alt={sticker.alt}
              className="w-full h-full object-contain pointer-events-none select-none"
              draggable={false}
            />
          </div>
        ))}
      </div>
      <div className="flex gap-3 flex-shrink-0">
        {stickerData.slice(Math.ceil(stickerData.length / 2)).map((sticker) => (
          <div
            key={sticker.id}
            className="flex-shrink-0 aspect-square w-20 cursor-grab active:cursor-grabbing transition-all duration-300 hover:scale-110 touch-manipulation select-none"
            draggable
            onDragStart={(e) => handleDragStart(e, sticker)}
            onDragEnd={handleDragEnd}
          >
            <img
              src={sticker.src}
              alt={sticker.alt}
              className="w-full h-full object-contain pointer-events-none select-none"
              draggable={false}
            />
          </div>
        ))}
      </div>
    </div>
  );
};
