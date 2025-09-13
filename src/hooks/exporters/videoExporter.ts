import { toast } from "sonner";
import html2canvas from "html2canvas";

interface VideoGalleryItem {
  id: string;
  url: string;
  timestamp: number;
  name: string;
}

export const createVideoExport = async (
  canvasElement: HTMLDivElement,
  onVideoCreated: (video: VideoGalleryItem) => void,
  onRecordingChange: (recording: boolean) => void
) => {
  onRecordingChange(true);
  toast("Recording 8-second video...", { duration: 2000 });

  try {
    // Simplified approach using MediaRecorder with canvas stream
    const offscreenCanvas = document.createElement('canvas');
    const ctx = offscreenCanvas.getContext('2d')!;
    
    offscreenCanvas.width = canvasElement.offsetWidth;
    offscreenCanvas.height = canvasElement.offsetHeight;

    const stream = offscreenCanvas.captureStream(15); // 15 FPS for smooth playback
    const recorder = new MediaRecorder(stream, {
      mimeType: MediaRecorder.isTypeSupported('video/webm') ? 'video/webm' : 'video/mp4'
    });

    const chunks: Blob[] = [];
    recorder.ondataavailable = (e) => chunks.push(e.data);
    
    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: recorder.mimeType });
      const url = URL.createObjectURL(blob);
      const timestamp = Date.now();
      
      onVideoCreated({
        id: `video-${timestamp}`,
        url,
        timestamp,
        name: `canvas-video-${timestamp}.webm`
      });
      
      toast("Video ready! 🎥", { duration: 2000 });
      onRecordingChange(false);
    };

    recorder.start();

    // Capture frames for 8 seconds
    const captureFrame = async () => {
      const frameCanvas = await html2canvas(canvasElement, {
        backgroundColor: null,
        scale: 1,
        useCORS: true,
        allowTaint: true,
        logging: false
      });

      ctx.clearRect(0, 0, offscreenCanvas.width, offscreenCanvas.height);
      ctx.drawImage(frameCanvas, 0, 0, offscreenCanvas.width, offscreenCanvas.height);
    };

    // Record for 8 seconds at 15 FPS
    const frameInterval = setInterval(captureFrame, 1000 / 15);
    setTimeout(() => {
      clearInterval(frameInterval);
      recorder.stop();
    }, 8000);

  } catch (error) {
    console.error('Video export failed:', error);
    toast("Video export failed", { duration: 2000 });
    onRecordingChange(false);
  }
};