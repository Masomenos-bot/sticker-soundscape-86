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

interface RecordingOptions {
  duration: number;
  quality: 'HD' | '4K';
  fps: number;
}

export const useExport = (
  canvasRef: React.RefObject<HTMLDivElement>, 
  isPlaying: boolean,
  audioContextRef?: React.RefObject<AudioContext | null>,
  getRecordingDestination?: () => MediaStreamAudioDestinationNode | null
) => {
  const [exportedVideos, setExportedVideos] = useState<VideoGalleryItem[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingProgress, setRecordingProgress] = useState(0);
  const [recordingOptions, setRecordingOptions] = useState<RecordingOptions>({
    duration: 10,
    quality: 'HD',
    fps: 30
  });
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const audioDestinationRef = useRef<MediaStreamAudioDestinationNode | null>(null);

  const exportAsPNG = async () => {
    if (!canvasRef.current) return;
    
    try {
      toast("Capturing HD canvas...", { duration: 1000 });
      
      const canvas = await html2canvas(canvasRef.current, {
        backgroundColor: null,
        scale: 2,
        useCORS: true,
        allowTaint: true,
        width: 1920,
        height: 1080,
      });
      
      canvas.toBlob((blob) => {
        if (blob) {
          const url = URL.createObjectURL(blob);
          const timestamp = Date.now();
          
          const imageItem: VideoGalleryItem = {
            id: `image-${timestamp}`,
            url,
            timestamp,
            name: `hd-sticker-canvas-${timestamp}.png`
          };

          setExportedVideos(prev => [...prev, imageItem]);
          toast("HD Image added to gallery! 📸", { duration: 2000 });
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

  const setupAudioRecording = (audioContext?: AudioContext | null, getRecordingDestination?: () => MediaStreamAudioDestinationNode | null) => {
    if (!audioContext || !getRecordingDestination) return null;
    
    try {
      const audioDestination = getRecordingDestination();
      if (audioDestination) {
        audioDestinationRef.current = audioDestination;
        return audioDestination.stream;
      }
      return null;
    } catch (error) {
      console.error('Audio recording setup failed:', error);
      return null;
    }
  };

  const exportAsVideo = async (options: RecordingOptions = recordingOptions) => {
    if (!canvasRef.current || isRecording) return;
    
    setIsRecording(true);
    setRecordingProgress(0);
    
    const qualityText = options.quality === '4K' ? '4K' : 'HD';
    toast(`Creating ${options.duration}s ${qualityText} video with audio...`, { duration: 2000 });
    
    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;
      
      // Set HD dimensions
      const width = options.quality === '4K' ? 3840 : 1920;
      const height = options.quality === '4K' ? 2160 : 1080;
      canvas.width = width;
      canvas.height = height;

      const videoStream = canvas.captureStream(options.fps);
      
      // Setup audio recording
      const audioStream = setupAudioRecording(audioContextRef?.current, getRecordingDestination);
      
      // Combine video and audio streams
      let combinedStream = videoStream;
      if (audioStream) {
        const audioTracks = audioStream.getAudioTracks();
        if (audioTracks.length > 0) {
          combinedStream = new MediaStream([
            ...videoStream.getVideoTracks(),
            ...audioTracks
          ]);
        }
      }
      
      // Enhanced codec selection with bitrate
      const supportedTypes = [
        { type: 'video/webm;codecs=vp9', bitrate: 5000000 }, // 5 Mbps for HD
        { type: 'video/webm;codecs=vp8', bitrate: 3000000 }, // 3 Mbps fallback
        { type: 'video/webm', bitrate: 2000000 },             // 2 Mbps fallback
        { type: 'video/mp4', bitrate: 4000000 }               // 4 Mbps H.264
      ];
      
      let selectedType = supportedTypes[0];
      for (const typeConfig of supportedTypes) {
        if (MediaRecorder.isTypeSupported(typeConfig.type)) {
          selectedType = typeConfig;
          break;
        }
      }

      const recorder = new MediaRecorder(combinedStream, { 
        mimeType: selectedType.type,
        videoBitsPerSecond: selectedType.bitrate
      });
      const chunks: Blob[] = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: selectedType.type });
        const url = URL.createObjectURL(blob);
        const timestamp = Date.now();
        
        const videoItem: VideoGalleryItem = {
          id: `video-${timestamp}`,
          url,
          timestamp,
          name: `${qualityText}-canvas-video-${timestamp}.webm`
        };

        setExportedVideos(prev => [...prev, videoItem]);
        toast(`${qualityText} video with audio added to gallery! 🎥🔊`, { duration: 3000 });
        setIsRecording(false);
        setRecordingProgress(0);
      };

      recorder.start();

      // Enhanced frame capture with progress tracking
      const duration = options.duration * 1000;
      const frameRate = options.fps;
      let frameCount = 0;
      const totalFrames = (duration / 1000) * frameRate;
      const progressInterval = Math.max(1, Math.floor(totalFrames / 100)); // Update progress every 1%

      const captureFrame = async () => {
        if (frameCount >= totalFrames) {
          recorder.stop();
          return;
        }

        try {
          const frameCanvas = await html2canvas(canvasRef.current!, {
            backgroundColor: null,
            scale: 2, // Higher quality
            useCORS: true,
            allowTaint: true,
            logging: false,
            width: 1920,
            height: 1080
          });

          // Clear the recording canvas
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          
          // Calculate aspect ratios to preserve proportions
          const sourceAspect = frameCanvas.width / frameCanvas.height;
          const targetAspect = canvas.width / canvas.height;
          
          let drawWidth, drawHeight, drawX, drawY;
          
          if (sourceAspect > targetAspect) {
            // Source is wider - fit to width, letterbox top/bottom
            drawWidth = canvas.width;
            drawHeight = canvas.width / sourceAspect;
            drawX = 0;
            drawY = (canvas.height - drawHeight) / 2;
          } else {
            // Source is taller - fit to height, pillarbox left/right
            drawWidth = canvas.height * sourceAspect;
            drawHeight = canvas.height;
            drawX = (canvas.width - drawWidth) / 2;
            drawY = 0;
          }
          
          // Draw with proper aspect ratio preservation
          ctx.drawImage(frameCanvas, drawX, drawY, drawWidth, drawHeight);
          
          frameCount++;
          
          // Update progress
          if (frameCount % progressInterval === 0) {
            const progress = Math.min(100, (frameCount / totalFrames) * 100);
            setRecordingProgress(progress);
          }
          
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
      setRecordingProgress(0);
    }
  };

  const handleVideoRecord = async (customOptions?: Partial<RecordingOptions>) => {
    if (isRecording) {
      toast(`Recording in progress... ${Math.round(recordingProgress)}%`, { duration: 1500 });
      return;
    }
    
    const finalOptions = { ...recordingOptions, ...customOptions };
    await exportAsVideo(finalOptions);
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
    recordingProgress,
    recordingOptions,
    setRecordingOptions,
    handleExport,
    handleVideoRecord,
    handleDeleteVideo,
    setExportedVideos
  };
};