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
    console.log('🖼️ PNG Export started');
    if (!canvasRef.current) {
      console.log('❌ PNG Export failed: No canvas ref');
      return;
    }
    
    try {
      toast("Capturing HD canvas...", { duration: 1000 });
      
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
    console.log('📤 Handle Export clicked, isPlaying:', isPlaying);
    if (isPlaying) {
      console.log('🎬 Exporting as GIF');
      await exportAsGIF();
    } else {
      console.log('🖼️ Exporting as PNG');
      await exportAsPNG();
    }
  };

  const setupAudioRecording = (audioContext?: AudioContext | null, getRecordingDestination?: () => MediaStreamAudioDestinationNode | null) => {
    if (!audioContext || !getRecordingDestination) {
      console.log('Audio recording: Missing audio context or recording destination');
      return null;
    }
    
    try {
      const audioDestination = getRecordingDestination();
      if (audioDestination) {
        audioDestinationRef.current = audioDestination;
        console.log('Audio recording: Stream setup successful', audioDestination.stream.getAudioTracks().length, 'audio tracks');
        return audioDestination.stream;
      }
      console.log('Audio recording: No audio destination available');
      return null;
    } catch (error) {
      console.error('Audio recording setup failed:', error);
      return null;
    }
  };

  const exportAsVideo = async (options: RecordingOptions = recordingOptions) => {
    console.log('🎥 Video Export started with options:', options);
    if (!canvasRef.current || isRecording) {
      console.log('❌ Video Export failed: No canvas ref or already recording');
      return;
    }
    
    setIsRecording(true);
    setRecordingProgress(0);
    
    const qualityText = options.quality === '4K' ? '4K' : 'HD';
    toast(`Creating ${options.duration}s ${qualityText} video with audio...`, { duration: 2000 });
    
    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;
      
      // Match actual canvas dimensions to prevent stretching
      const actualCanvas = canvasRef.current;
      const width = actualCanvas.offsetWidth;
      const height = actualCanvas.offsetHeight;
      canvas.width = width;
      canvas.height = height;
      
      console.log('🎥 Recording canvas setup:', { width, height, quality: options.quality });

      const videoStream = canvas.captureStream(options.fps);
      
      // Setup audio recording with enhanced debugging
      const audioStream = setupAudioRecording(audioContextRef?.current, getRecordingDestination);
      
      // Test audio stream with simple tone
      if (audioStream && audioContextRef?.current) {
        console.log('🔊 Testing audio stream with test tone...');
        const testOsc = audioContextRef.current.createOscillator();
        const testGain = audioContextRef.current.createGain();
        const recordingDest = getRecordingDestination?.();
        
        if (recordingDest) {
          testOsc.connect(testGain);
          testGain.connect(recordingDest);
          testOsc.frequency.setValueAtTime(440, audioContextRef.current.currentTime);
          testGain.gain.setValueAtTime(0.05, audioContextRef.current.currentTime);
          testOsc.start(audioContextRef.current.currentTime);
          testOsc.stop(audioContextRef.current.currentTime + 0.1);
          console.log('✅ Test tone sent to recording destination');
        }
      }
      
      // Combine video and audio streams
      let combinedStream = videoStream;
      if (audioStream) {
        const audioTracks = audioStream.getAudioTracks();
        console.log('🎵 Video recording: Found', audioTracks.length, 'audio tracks');
        if (audioTracks.length > 0) {
          combinedStream = new MediaStream([
            ...videoStream.getVideoTracks(),
            ...audioTracks
          ]);
          console.log('🎬 Video recording: Combined stream created with', combinedStream.getTracks().length, 'total tracks');
          console.log('📊 Stream details:', {
            videoTracks: combinedStream.getVideoTracks().length,
            audioTracks: combinedStream.getAudioTracks().length,
            totalTracks: combinedStream.getTracks().length
          });
        }
      } else {
        console.log('⚠️ Video recording: No audio stream available - video will be silent');
      }
      
      // Enhanced codec selection with better fallbacks
      const supportedTypes = [
        { type: 'video/webm;codecs=vp9,opus', bitrate: 5000000, name: 'VP9+Opus' },
        { type: 'video/webm;codecs=vp8,opus', bitrate: 3000000, name: 'VP8+Opus' },
        { type: 'video/webm;codecs=vp9', bitrate: 4000000, name: 'VP9' },
        { type: 'video/webm;codecs=vp8', bitrate: 3000000, name: 'VP8' },
        { type: 'video/webm', bitrate: 2000000, name: 'WebM' },
        { type: 'video/mp4;codecs=h264,aac', bitrate: 4000000, name: 'H.264+AAC' },
        { type: 'video/mp4', bitrate: 4000000, name: 'MP4' }
      ];
      
      let selectedType = supportedTypes[0];
      for (const typeConfig of supportedTypes) {
        if (MediaRecorder.isTypeSupported(typeConfig.type)) {
          selectedType = typeConfig;
          console.log('🎬 Selected codec:', selectedType.name, 'with bitrate:', selectedType.bitrate);
          break;
        }
      }
      
      if (!MediaRecorder.isTypeSupported(selectedType.type)) {
        console.warn('⚠️ No supported codec found, using default');
        selectedType = { type: '', bitrate: 2000000, name: 'Default' };
      }

      // Create MediaRecorder with error handling
      let recorderOptions: MediaRecorderOptions = {
        videoBitsPerSecond: selectedType.bitrate
      };
      
      if (selectedType.type) {
        recorderOptions.mimeType = selectedType.type;
      }
      
      const recorder = new MediaRecorder(combinedStream, recorderOptions);
      console.log('🎬 MediaRecorder created with options:', recorderOptions);
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
    console.log('🎬 Handle Video Record clicked, customOptions:', customOptions);
    if (isRecording) {
      console.log('⏸️ Already recording, progress:', recordingProgress);
      toast(`Recording in progress... ${Math.round(recordingProgress)}%`, { duration: 1500 });
      return;
    }
    
    const finalOptions = { ...recordingOptions, ...customOptions };
    console.log('🎬 Starting video with final options:', finalOptions);
    await exportAsVideo(finalOptions);
  };

  const handleDeleteVideo = (videoId: string) => {
    console.log('🗑️ useExport: Delete video', videoId);
    
    // Prevent multiple deletions
    const video = exportedVideos.find(v => v.id === videoId);
    if (!video) {
      console.log('⚠️ Video already deleted or not found:', videoId);
      return;
    }
    
    try {
      URL.revokeObjectURL(video.url);
      console.log('✅ URL revoked for:', videoId);
    } catch (error) {
      console.error('❌ Error revoking URL:', error);
    }
    
    setExportedVideos(prev => {
      const filtered = prev.filter(v => v.id !== videoId);
      console.log('📝 Videos updated, remaining:', filtered.length);
      return filtered;
    });
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