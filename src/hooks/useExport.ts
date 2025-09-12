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
    toast("Creating 8-second video from canvas...", { duration: 2000 });
    
    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;
      
      // Set canvas dimensions
      canvas.width = canvasRef.current.offsetWidth;
      canvas.height = canvasRef.current.offsetHeight;

      const stream = canvas.captureStream(10); // 10 fps for better performance
      
      // Check supported mime types
      const supportedTypes = [
        'video/webm;codecs=vp9',
        'video/webm;codecs=vp8', 
        'video/webm',
        'video/mp4'
      ];
      
      let mimeType = 'video/webm';
      for (const type of supportedTypes) {
        if (MediaRecorder.isTypeSupported(type)) {
          mimeType = type;
          break;
        }
      }

      const recorder = new MediaRecorder(stream, { mimeType });
      const chunks: Blob[] = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: mimeType });
        const url = URL.createObjectURL(blob);
        const timestamp = Date.now();
        
        const videoItem: VideoGalleryItem = {
          id: `video-${timestamp}`,
          url,
          timestamp,
          name: `canvas-video-${timestamp}.webm`
        };

        setExportedVideos(prev => [...prev, videoItem]);
        toast("8-second video added to gallery! 🎥", { duration: 2000 });
        setIsRecording(false);
      };

      recorder.start();

      // Capture frames for 8 seconds
      const duration = 8000; // 8 seconds
      const frameRate = 10; // 10 fps
      let frameCount = 0;
      const totalFrames = (duration / 1000) * frameRate;

      const captureFrame = async () => {
        if (frameCount >= totalFrames) {
          recorder.stop();
          return;
        }

        try {
          const frameCanvas = await html2canvas(canvasRef.current!, {
            backgroundColor: null,
            scale: 0.8,
            useCORS: true,
            allowTaint: true,
            logging: false
          });

          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(frameCanvas, 0, 0, canvas.width, canvas.height);
          
          frameCount++;
          setTimeout(captureFrame, 1000 / frameRate);
        } catch (error) {
          console.error('Frame capture error:', error);
          setTimeout(captureFrame, 1000 / frameRate);
        }
      };

      setTimeout(() => captureFrame(), 100);

    } catch (error) {
      console.error('Video export failed:', error);
      toast("Video export failed - browser may not support video recording", { duration: 3000 });
      setIsRecording(false);
    }
  };

  const handleVideoRecord = async () => {
    if (isRecording) {
      toast("Video recording in progress...", { duration: 1500 });
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