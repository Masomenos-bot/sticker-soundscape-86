import { useState, useRef } from "react";
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

export const useExport = (canvasRef: React.RefObject<HTMLDivElement>, isPlaying: boolean) => {
  const [exportedVideos, setExportedVideos] = useState<VideoGalleryItem[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);

  const exportAsPNG = async () => {
    if (!canvasRef.current) return;
    
    try {
      toast("Capturing canvas...", { duration: 1000 });
      
      const canvas = await html2canvas(canvasRef.current, {
        backgroundColor: null,
        scale: 2,
        useCORS: true,
        allowTaint: true,
      });
      
      canvas.toBlob((blob) => {
        if (blob) {
          const url = URL.createObjectURL(blob);
          const timestamp = Date.now();
          
          const imageItem: VideoGalleryItem = {
            id: `image-${timestamp}`,
            url,
            timestamp,
            name: `sticker-canvas-${timestamp}.png`
          };

          setExportedVideos(prev => [...prev, imageItem]);
          toast("Image added to gallery! 📸", { duration: 2000 });
        }
      }, 'image/png');
    } catch (error) {
      console.error('PNG export failed:', error);
      toast("Export failed", { duration: 2000 });
    }
  };

  const exportAsGIF = async () => {
    if (!canvasRef.current) return;
    
    toast("Creating 15-second GIF... This may take a moment!", { duration: 3000 });
    
    try {
      const gif = new GIF({
        workers: 2,
        quality: 10,
        width: canvasRef.current.offsetWidth,
        height: canvasRef.current.offsetHeight,
        workerScript: 'https://cdn.jsdelivr.net/npm/gif.js@0.2.0/dist/gif.worker.js'
      });

      const frameCount = 60; // 60 frames for 15 seconds (4 fps)
      const frameDelay = 250; // 250ms between frames (4 fps)
      
      for (let i = 0; i < frameCount; i++) {
        const canvas = await html2canvas(canvasRef.current, {
          backgroundColor: null,
          scale: 1,
          useCORS: true,
          allowTaint: true,
        });
        
        gif.addFrame(canvas, { delay: frameDelay });
        await new Promise(resolve => setTimeout(resolve, frameDelay));
      }

      gif.on('finished', function(blob: Blob) {
        const url = URL.createObjectURL(blob);
        const timestamp = Date.now();
        
        const gifItem: VideoGalleryItem = {
          id: `gif-${timestamp}`,
          url,
          timestamp,
          name: `sticker-animation-${timestamp}.gif`
        };

        setExportedVideos(prev => [...prev, gifItem]);
        toast("GIF added to gallery! 🎬", { duration: 2000 });
      });

      gif.render();
    } catch (error) {
      console.error('GIF export failed:', error);
      toast("GIF export failed, exporting as PNG instead", { duration: 2000 });
      exportAsPNG();
    }
  };

  const handleExport = async () => {
    if (isPlaying) {
      await exportAsGIF();
    } else {
      await exportAsPNG();
    }
  };

  const exportAsVideo = async () => {
    if (!canvasRef.current || isRecording) return;
    
    setIsRecording(true);
    toast("Creating 5-second video from canvas frames...", { duration: 2000 });
    
    try {
      const frames: string[] = [];
      const frameCount = 75; // 5 seconds at 15 fps
      const frameDelay = 1000 / 15; // 15 fps
      
      // Capture frames
      for (let i = 0; i < frameCount; i++) {
        const canvas = await html2canvas(canvasRef.current, {
          backgroundColor: null,
          scale: 1,
          useCORS: true,
          allowTaint: true,
        });
        
        frames.push(canvas.toDataURL('image/webp', 0.8));
        await new Promise(resolve => setTimeout(resolve, frameDelay));
      }

      // Create video from frames using a simple approach
      const timestamp = Date.now();
      const videoBlob = await createVideoFromFrames(frames);
      const url = URL.createObjectURL(videoBlob);
      
      const videoItem: VideoGalleryItem = {
        id: `video-${timestamp}`,
        url,
        timestamp,
        name: `canvas-video-${timestamp}.webm`
      };

      setExportedVideos(prev => [...prev, videoItem]);
      toast("Video added to gallery! 🎥", { duration: 2000 });
      
    } catch (error) {
      console.error('Video export failed:', error);
      toast("Video export failed", { duration: 2000 });
    } finally {
      setIsRecording(false);
    }
  };

  const createVideoFromFrames = async (frames: string[]): Promise<Blob> => {
    // Create a simple WebM video using MediaRecorder with a canvas
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    
    // Set canvas size from first frame
    const firstImg = new Image();
    firstImg.src = frames[0];
    await new Promise(resolve => firstImg.onload = resolve);
    
    canvas.width = firstImg.width;
    canvas.height = firstImg.height;

    const stream = canvas.captureStream(15); // 15 fps
    const recorder = new MediaRecorder(stream, {
      mimeType: 'video/webm'
    });

    const chunks: Blob[] = [];
    recorder.ondataavailable = (e) => chunks.push(e.data);

    return new Promise((resolve) => {
      recorder.onstop = () => {
        resolve(new Blob(chunks, { type: 'video/webm' }));
      };

      recorder.start();

      // Draw frames to canvas
      let frameIndex = 0;
      const drawFrame = () => {
        if (frameIndex >= frames.length) {
          recorder.stop();
          return;
        }

        const img = new Image();
        img.onload = () => {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0);
          frameIndex++;
          setTimeout(drawFrame, 1000 / 15); // 15 fps
        };
        img.src = frames[frameIndex];
      };

      drawFrame();
    });
  };

  const handleVideoRecord = async () => {
    if (isRecording) {
      toast("Video recording already in progress...", { duration: 1500 });
      return;
    }
    await exportAsVideo();
  };

  const handleDeleteVideo = (videoId: string) => {
    const video = exportedVideos.find(v => v.id === videoId);
    if (video) {
      URL.revokeObjectURL(video.url);
    }
    setExportedVideos(prev => prev.filter(video => video.id !== videoId));
  };

  return {
    exportedVideos,
    isRecording,
    handleExport,
    handleVideoRecord,
    handleDeleteVideo,
    setExportedVideos
  };
};