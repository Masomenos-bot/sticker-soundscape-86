import { toast } from "sonner";
import html2canvas from "html2canvas";

interface VideoGalleryItem {
  id: string;
  url: string;
  timestamp: number;
  name: string;
}

export const createImageExport = async (
  canvasElement: HTMLDivElement,
  onImageCreated: (image: VideoGalleryItem) => void
) => {
  try {
    toast("Capturing image...", { duration: 1000 });
    
    const canvas = await html2canvas(canvasElement, {
      backgroundColor: null,
      scale: 2,
      useCORS: true,
      allowTaint: true,
    });
    
    canvas.toBlob((blob) => {
      if (blob) {
        const url = URL.createObjectURL(blob);
        const timestamp = Date.now();
        
        onImageCreated({
          id: `image-${timestamp}`,
          url,
          timestamp,
          name: `sticker-canvas-${timestamp}.png`
        });
        
        toast("Image ready! 📸", { duration: 2000 });
      }
    }, 'image/png');
  } catch (error) {
    console.error('PNG export failed:', error);
    toast("Export failed", { duration: 2000 });
  }
};