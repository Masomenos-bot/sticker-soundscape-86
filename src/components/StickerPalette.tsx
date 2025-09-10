import React from "react";
import { StickerData } from "./StickerMusicApp";

// Import the new high-quality sticker images
const stickerImages = [
  "/lovable-uploads/80a5a32f-b6e0-4fc0-9828-340c4e6a2272.png", // pink curved shape
  "/lovable-uploads/f52968af-b432-4762-935c-3c181755a8af.png", // orange/pink curved shape
  "/lovable-uploads/7fdfb4ba-2292-4ee7-89a1-8048a2047214.png", // yellow star shape
  "/lovable-uploads/d6ae8202-52be-4fa6-97a3-1394cd1c7c78.png", // yellow bone shape
  "/lovable-uploads/a7f0adbd-15b1-4b17-b0f1-8a6d5a0e7001.png", // colorful capsule shape
  "/lovable-uploads/fa3bc30e-9cdf-40d9-8dbc-ce44cb0e10f5.png", // yellow triangle shape
  "/lovable-uploads/2a88bcaa-fec6-48fa-837e-95de23e3bc43.png", // brown oval shape
  "/lovable-uploads/b304de86-466d-4ce1-91d4-f8ecdc7f06c6.png", // blue triangle shape
  "/lovable-uploads/5abf2164-20c3-42cd-9bc8-ae05e7adba20.png", // brown teardrop shape
  "/lovable-uploads/cac603f1-4efa-4d4a-ad66-4488da9942f0.png", // colorful circle shape
];

export const StickerPalette = () => {
  const stickerData: StickerData[] = stickerImages.map((src, index) => ({
    id: `sticker-${index}`,
    src,
    alt: `Sticker ${index + 1}`,
    soundUrl: generateSoundUrl(index),
  }));

  const handleDragStart = (event: React.DragEvent<HTMLDivElement>, sticker: StickerData) => {
    event.dataTransfer.setData("application/json", JSON.stringify(sticker));
    event.currentTarget.classList.add("dragging");
  };

  const handleDragEnd = (event: React.DragEvent<HTMLDivElement>) => {
    event.currentTarget.classList.remove("dragging");
  };

  return (
    <div className="flex gap-3 h-full overflow-x-auto overflow-y-hidden pb-2">
      {stickerData.map((sticker) => (
        <div
          key={sticker.id}
          className="flex-shrink-0 w-16 h-16 bg-card rounded-xl p-2 cursor-grab active:cursor-grabbing shadow-soft hover:shadow-sticker transition-all duration-300 hover:scale-110 border border-border/50"
          draggable
          onDragStart={(e) => handleDragStart(e, sticker)}
          onDragEnd={handleDragEnd}
        >
          <img
            src={sticker.src}
            alt={sticker.alt}
            className="w-full h-full object-contain pointer-events-none"
            draggable={false}
          />
        </div>
      ))}
    </div>
  );
};

// Generate unique sound identifier for each sticker
function generateSoundUrl(index: number): string {
  return `tone-${index}`; // Simple identifier for audio generation
}