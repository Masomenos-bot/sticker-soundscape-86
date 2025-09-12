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

      const frameCount = 60;
      const frameDelay = 250;
      
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
        
        const newGif: VideoGalleryItem = {
          id: `gif-${timestamp}`,
          url,
          timestamp,
          name: `animation-${timestamp}.gif`
        };
        
        setExportedVideos(prev => [newGif, ...prev]);
        
        const link = document.createElement('a');
        link.download = newGif.name;
        link.href = url;
        link.click();
        
        toast("15-second GIF exported! 🎬", { duration: 2000 });
      });

      gif.render();
    } catch (error) {
      console.error('GIF export failed:', error);
      toast("GIF export failed, exporting as PNG instead", { duration: 2000 });
      exportAsPNG();
    }
  };

  const startVideoRecording = async () => {
    if (!canvasRef.current) return;
    
    try {
      setIsRecording(true);
      recordedChunksRef.current = [];
      
      toast("Starting video recording...", { duration: 2000 });
      
      const stream = await (canvasRef.current as any).captureStream?.(30) || 
        await navigator.mediaDevices.getDisplayMedia({ video: true });
      
      const options = {
        mimeType: 'video/webm;codecs=vp9',
      };
      
      if (!MediaRecorder.isTypeSupported(options.mimeType)) {
        options.mimeType = 'video/webm';
      }
      
      const mediaRecorder = new MediaRecorder(stream, options);
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
        
        const newVideo: VideoGalleryItem = {
          id: `video-${timestamp}`,
          url,
          timestamp,
          name: `video-${timestamp}.webm`
        };
        
        setExportedVideos(prev => [newVideo, ...prev]);
        setIsRecording(false);
        
        toast("Video recording saved to gallery! 🎥", { duration: 2000 });
        
        if (stream.getTracks) {
          stream.getTracks().forEach(track => track.stop());
        }
      };
      
      mediaRecorder.start();
      
      setTimeout(() => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
          mediaRecorderRef.current.stop();
        }
      }, 15000);
      
    } catch (error) {
      console.error('Video recording failed:', error);
      setIsRecording(false);
      toast("Video recording failed, try PNG export instead", { duration: 2000 });
    }
  };

  const handleExport = async () => {
    if (isPlaying) {
      await exportAsGIF();
    } else {
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
    handleDeleteVideo,
    setExportedVideos,
    startVideoRecording
  };
};