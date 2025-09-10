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
  "/lovable-uploads/01c897d2-c9a9-491d-8af8-5dcb32fc4ec7.png", // red flame
  "/lovable-uploads/5101d5bd-1d68-4bca-b7c5-c3b54a4620ff.png", // yellow hat
  "/lovable-uploads/710268c3-f3e7-460f-a661-f975b14273b9.png", // pink teardrop
  "/lovable-uploads/7f7ba30d-08cc-4deb-8bbb-07681bed7e40.png", // single eye
  "/lovable-uploads/a63f8201-2466-47e6-ae4b-3d1c5d1b751b.png", // two eyes
  "/lovable-uploads/bc6e8452-029b-4eac-964f-05be1c184b9b.png", // orange eye
  "/lovable-uploads/60c55b7c-a3a3-41f3-8b78-7bae3fd9cc4e.png", // red mouth
  "/lovable-uploads/ea94338e-9036-42f5-87b1-045a93b25446.png", // blue bow tie
  "/lovable-uploads/609807b5-fa8a-4fca-aa2b-494b72b913d1.png", // red heart
  "/lovable-uploads/65d3d82a-acad-4f83-84ca-f2611a3e4677.png", // green star
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
    <div className="grid grid-cols-10 grid-rows-2 gap-2 h-full">
      {stickerData.map((sticker) => (
        <div
          key={sticker.id}
          className="aspect-square cursor-grab active:cursor-grabbing transition-all duration-300 hover:scale-110 touch-manipulation"
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