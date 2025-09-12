import { toast } from "sonner";
import html2canvas from "html2canvas";
// @ts-ignore
import GIF from "gif.js";

interface VideoGalleryItem {
  id: string;
  url: string;
  timestamp: number;
  name: string;
}

export const createGifExport = async (
  canvasElement: HTMLDivElement,
  onGifCreated: (gif: VideoGalleryItem) => void
) => {
  toast("Creating animated GIF...", { duration: 3000 });
  
  try {
    const gif = new GIF({
      workers: 2,
      quality: 10,
      width: canvasElement.offsetWidth,
      height: canvasElement.offsetHeight,
      workerScript: 'https://cdn.jsdelivr.net/npm/gif.js@0.2.0/dist/gif.worker.js'
    });

    // Capture 30 frames over 8 seconds (roughly 4 FPS)
    const frameCount = 30;
    const frameDelay = 267; // ~4 FPS for smooth animation

    for (let i = 0; i < frameCount; i++) {
      const canvas = await html2canvas(canvasElement, {
        backgroundColor: null,
        scale: 1,
        useCORS: true,
        allowTaint: true,
      });
      
      gif.addFrame(canvas, { delay: frameDelay });
      await new Promise(resolve => setTimeout(resolve, frameDelay));
    }

    gif.on('finished', (blob: Blob) => {
      const url = URL.createObjectURL(blob);
      const timestamp = Date.now();
      
      onGifCreated({
        id: `gif-${timestamp}`,
        url,
        timestamp,
        name: `sticker-animation-${timestamp}.gif`
      });
      
      toast("Animated GIF ready! 🎬", { duration: 2000 });
    });

    gif.render();
  } catch (error) {
    console.error('GIF export failed:', error);
    toast("GIF export failed", { duration: 2000 });
  }
};