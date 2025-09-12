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
          
          const newImage: VideoGalleryItem = {
            id: `image-${timestamp}`,
            url,
            timestamp,
            name: `canvas-${timestamp}.png`
          };
          
          setExportedVideos(prev => [newImage, ...prev]);
          toast("Canvas saved to gallery! 📸", { duration: 2000 });
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
        const link = document.createElement('a');
        link.download = `sticker-animation-${Date.now()}.gif`;
        link.href = url;
        link.click();
        URL.revokeObjectURL(url);
        toast("15-second GIF exported! 🎬", { duration: 2000 });
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

  const handleVideoExport = async () => {
    if (!canvasRef.current || isRecording) return;
    
    setIsRecording(true);
    toast("🎬 Creating 8-second MP4 video...", { duration: 3000 });

    try {
      // Create a hidden canvas to capture the content
      const sourceCanvas = await html2canvas(canvasRef.current, {
        backgroundColor: '#ffffff',
        scale: 1,
        useCORS: true,
        allowTaint: true,
        width: canvasRef.current.offsetWidth,
        height: canvasRef.current.offsetHeight
      });

      // Create a new canvas for recording
      const recordCanvas = document.createElement('canvas');
      recordCanvas.width = sourceCanvas.width;
      recordCanvas.height = sourceCanvas.height;
      const ctx = recordCanvas.getContext('2d');

      if (!ctx) {
        throw new Error('Could not get canvas context');
      }

      // Get canvas stream for video
      const canvasStream = recordCanvas.captureStream(30); // 30 FPS

      // Check for supported video formats
      const supportedTypes = [
        'video/webm; codecs=vp9',
        'video/webm; codecs=vp8',
        'video/webm',
        'video/mp4'
      ];

      let mimeType = '';
      for (const type of supportedTypes) {
        if (MediaRecorder.isTypeSupported(type)) {
          mimeType = type;
          break;
        }
      }

      if (!mimeType) {
        throw new Error('No supported video format found');
      }

      const mediaRecorder = new MediaRecorder(canvasStream, { mimeType });
      recordedChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        canvasStream.getTracks().forEach(track => track.stop());
        
        if (recordedChunksRef.current.length > 0) {
          const blob = new Blob(recordedChunksRef.current, { type: mimeType });
          const url = URL.createObjectURL(blob);
          const timestamp = Date.now();
          
          const newVideo: VideoGalleryItem = {
            id: `video-${timestamp}`,
            url,
            timestamp,
            name: `canvas-recording-${timestamp}.webm`
          };
          
          setExportedVideos(prev => [newVideo, ...prev]);
          toast("🎬 8-second video saved to gallery!", { duration: 2000 });
        } else {
          toast("❌ Recording failed", { duration: 2000 });
        }
        setIsRecording(false);
      };

      // Start recording
      mediaRecorder.start(100);

      // Animate the canvas for 8 seconds
      const startTime = Date.now();
      const duration = 8000; // 8 seconds

      const animate = async () => {
        const elapsed = Date.now() - startTime;
        
        if (elapsed < duration) {
          // Capture current state of the canvas
          const currentCanvas = await html2canvas(canvasRef.current!, {
            backgroundColor: '#ffffff',
            scale: 1,
            useCORS: true,
            allowTaint: true,
            width: canvasRef.current!.offsetWidth,
            height: canvasRef.current!.offsetHeight
          });
          
          // Draw to recording canvas
          ctx.clearRect(0, 0, recordCanvas.width, recordCanvas.height);
          ctx.drawImage(currentCanvas, 0, 0);
          
          // Continue animation
          requestAnimationFrame(animate);
        } else {
          // Stop recording after 8 seconds
          mediaRecorder.stop();
        }
      };

      animate();

    } catch (error) {
      console.error('Video recording failed:', error);
      setIsRecording(false);
      
      // Fallback to PNG
      toast("❌ Video export failed, saving as PNG instead", { duration: 2000 });
      await exportAsPNG();
    }
  };

  const handleDeleteVideo = (videoId: string) => {
    setExportedVideos(prev => prev.filter(video => video.id !== videoId));
  };

  return {
    exportedVideos,
    isRecording,
    handleExport,
    handleVideoExport,
    handleDeleteVideo,
    setExportedVideos
  };
};