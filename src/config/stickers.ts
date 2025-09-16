// Centralized sticker configuration to eliminate duplication and ensure consistency
export interface StickerConfig {
  id: string;
  imageId: string;
  alt: string;
  soundUrl: string;
}

// All sticker images with their IDs
export const stickerImageIds = [
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

// Sound mapping for specific stickers
const soundMapping: { [key: number]: string } = {
  0: "/SOUND FOR BUTTON SOUND-play-pause-share-mirroir-trash-previous-next MP3/hue'.mp3",
  1: "/SOUND FOR BUTTON SOUND-play-pause-share-mirroir-trash-previous-next MP3/play.mp3",
  2: "/SOUND FOR BUTTON SOUND-play-pause-share-mirroir-trash-previous-next MP3/pause.mp3",
  3: "/SOUND FOR BUTTON SOUND-play-pause-share-mirroir-trash-previous-next MP3/next'.mp3",
  4: "/SOUND FOR BUTTON SOUND-play-pause-share-mirroir-trash-previous-next MP3/previous'.mp3",
};

// Generate full image path from image ID
export const getStickerImagePath = (imageId: string): string => {
  return `/lovable-uploads/${imageId}.png`;
};

// Generate sound URL for a sticker index
export const getStickerSoundUrl = (index: number): string => {
  return soundMapping[index] || `tone-${index}`;
};

// Get sticker image ID by index
export const getStickerImageId = (index: number): string => {
  return stickerImageIds[index] || stickerImageIds[0];
};

// Generate complete sticker configuration
export const generateStickerConfigs = (): StickerConfig[] => {
  return stickerImageIds.map((imageId, index) => ({
    id: `sticker-${index}`,
    imageId,
    alt: `Sticker ${index + 1}`,
    soundUrl: getStickerSoundUrl(index),
  }));
};

// Get sticker config by ID (for fallback reconstruction)
export const getStickerConfigById = (stickerId: string): StickerConfig | null => {
  const index = parseInt(stickerId.split('-')[1]);
  if (isNaN(index) || index < 0 || index >= stickerImageIds.length) {
    return null;
  }
  
  return {
    id: stickerId,
    imageId: getStickerImageId(index),
    alt: `Sticker ${index + 1}`,
    soundUrl: getStickerSoundUrl(index),
  };
};