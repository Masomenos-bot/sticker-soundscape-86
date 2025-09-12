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
          const link = document.createElement('a');
          link.download = `sticker-canvas-${Date.now()}.png`;
          link.href = url;
          link.click();
          URL.revokeObjectURL(url);
          toast("Canvas exported! 📸", { duration: 2000 });
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

  const exportAsVideo = async () => {
    if (!canvasRef.current) return;
    
    toast("Creating 10-second video from canvas... This may take a moment!", { duration: 3000 });
    
    try {
      // Create a temporary canvas for video recording
      const tempCanvas = document.createElement('canvas');
      const ctx = tempCanvas.getContext('2d');
      if (!ctx) throw new Error('Could not get canvas context');

      tempCanvas.width = canvasRef.current.offsetWidth;
      tempCanvas.height = canvasRef.current.offsetHeight;

      // Create MediaRecorder stream from canvas
      const stream = tempCanvas.captureStream(30); // 30 fps
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'video/webm;codecs=vp8'
      });

      recordedChunksRef.current = [];
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        const timestamp = Date.now();
        
        const videoItem: VideoGalleryItem = {
          id: `video-${timestamp}`,
          url,
          timestamp,
          name: `canvas-video-${timestamp}.webm`
        };

        setExportedVideos(prev => [...prev, videoItem]);
        toast("Canvas video exported! 🎥", { duration: 2000 });
      };

      mediaRecorder.start();
      setIsRecording(true);

      // Capture frames for 10 seconds
      const duration = 10000; // 10 seconds
      const frameInterval = 1000 / 30; // 30 fps
      let frameCount = 0;
      const maxFrames = duration / frameInterval;

      const captureFrame = async () => {
        if (frameCount >= maxFrames) {
          mediaRecorder.stop();
          setIsRecording(false);
          return;
        }

        const canvas = await html2canvas(canvasRef.current!, {
          backgroundColor: null,
          scale: 1,
          useCORS: true,
          allowTaint: true,
        });

        // Draw the captured frame to our recording canvas
        ctx.clearRect(0, 0, tempCanvas.width, tempCanvas.height);
        ctx.drawImage(canvas, 0, 0, tempCanvas.width, tempCanvas.height);

        frameCount++;
        setTimeout(captureFrame, frameInterval);
      };

      captureFrame();

    } catch (error) {
      console.error('Video export failed:', error);
      toast("Video export failed, exporting as PNG instead", { duration: 2000 });
      setIsRecording(false);
      exportAsPNG();
    }
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