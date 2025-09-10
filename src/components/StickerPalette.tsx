import React from "react";
import { StickerData } from "./StickerMusicApp";

// Import the sticker images provided by the user
const stickerImages = [
  "/lovable-uploads/381968d0-62d1-4cb7-a05f-883da69c2b64.png", // star
  "/lovable-uploads/f9994ba4-7539-4e66-8936-d3c07ff15ec4.png", // pink bean
  "/lovable-uploads/43587e22-5fac-47c6-94f3-fe92e0f9d56b.png", // blue bow
  "/lovable-uploads/75e143c5-a33d-4e2f-994c-072b6fa0ce42.png", // white circle/eye
  "/lovable-uploads/8ad0faed-fb2f-40fe-bcea-6af24e91bf78.png", // orange oval
  "/lovable-uploads/2865f535-369e-45c9-96be-e71b36e12ea6.png", // green foot
  "/lovable-uploads/6f803399-b4ab-4484-8ef7-b12756c57c5e.png", // brown teardrop
  "/lovable-uploads/e6836fb0-ef39-46c5-8371-65dbc4831c97.png", // brown teardrop alt
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
    <div className="grid grid-cols-2 gap-4 h-full overflow-y-auto">
      {stickerData.map((sticker) => (
        <div
          key={sticker.id}
          className="aspect-square bg-card rounded-2xl p-4 cursor-grab active:cursor-grabbing shadow-soft hover:shadow-sticker transition-all duration-300 hover:scale-105 border border-border/50"
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