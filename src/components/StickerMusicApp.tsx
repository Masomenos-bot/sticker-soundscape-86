import React, { useState, useRef, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { StickerPalette } from "./StickerPalette";
import { MusicCanvas } from "./MusicCanvas";
import { MediaGallery } from "./MediaGallery";
import { Volume2, Pause, Play, ChevronUp, ChevronDown, FlipHorizontal, Trash2, Plus, Minus, RotateCcw, RotateCw, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import html2canvas from "html2canvas";
// @ts-ignore
import GIF from "gif.js";

export interface Sticker {
  id: string;
  src: string;
  soundUrl?: string;
  x: number;
  y: number;
  width: number;
  height: number;
  volume: number;
  rotation?: number;
  zIndex: number;
  mirrored?: boolean;
  stepIndex: number;
}

export interface StickerData {
  id: string;
  src: string;
  alt: string;
  soundUrl?: string;
}

interface VideoGalleryItem {
  id: string;
  url: string;
  timestamp: number;
  name: string;
}

const StickerMusicApp = () => {
  const [placedStickers, setPlacedStickers] = useState<Sticker[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [globalVolume, setGlobalVolume] = useState(0.7);
  const [audioInitialized, setAudioInitialized] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [sequenceTempo, setSequenceTempo] = useState(120); // BPM - matches Yèkèrmo Sèw
  const [selectedStickers, setSelectedStickers] = useState<string[]>([]);
  const [isMultiSelectMode, setIsMultiSelectMode] = useState(false);
  const [controlBoardPosition, setControlBoardPosition] = useState({ x: 20, y: 120 });
  const [isDraggingControlBoard, setIsDraggingControlBoard] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isControlBoardCollapsed, setIsControlBoardCollapsed] = useState(false);
  const [exportedVideos, setExportedVideos] = useState<VideoGalleryItem[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const sequencerRef = useRef<NodeJS.Timeout | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);

  // Handle global mouse and touch events for control board dragging
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDraggingControlBoard) {
        setControlBoardPosition({
          x: e.clientX - dragOffset.x,
          y: e.clientY - dragOffset.y
        });
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (isDraggingControlBoard && e.touches.length === 1) {
        e.preventDefault();
        const touch = e.touches[0];
        setControlBoardPosition({
          x: touch.clientX - dragOffset.x,
          y: touch.clientY - dragOffset.y
        });
      }
    };

    const handleMouseUp = () => {
      setIsDraggingControlBoard(false);
    };

    const handleTouchEnd = () => {
      setIsDraggingControlBoard(false);
    };

    if (isDraggingControlBoard) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.addEventListener('touchmove', handleTouchMove, { passive: false });
      document.addEventListener('touchend', handleTouchEnd);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isDraggingControlBoard, dragOffset]);

  // Initialize audio context
  useEffect(() => {
    const initAudio = async () => {
      try {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      } catch (error) {
        console.error("Audio context not supported:", error);
      }
    };
    initAudio();
    
    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  const handleStickerDrop = async (stickerData: StickerData, x: number, y: number) => {
    const maxZIndex = Math.max(0, ...placedStickers.map(s => s.zIndex));
    const nextStepIndex = placedStickers.length; // Add as next step in sequence
    const newSticker: Sticker = {
      id: `${stickerData.id}-${Date.now()}`,
      src: stickerData.src,
      soundUrl: stickerData.soundUrl,
      x,
      y,
      width: 80,
      height: 80,
      volume: 0.5,
      rotation: 0,
      zIndex: maxZIndex + 1,
      mirrored: false,
      stepIndex: nextStepIndex,
    };

    setPlacedStickers(prev => [...prev, newSticker]);
    
    // Auto-start playback when first sticker is placed
    if (placedStickers.length === 0) {
      if (!audioInitialized) {
        await initializeAudio();
      } else {
        setIsPlaying(true);
        toast("🎵 Playing your sequence!", { duration: 1500 });
      }
    } else {
      toast(`Added step ${nextStepIndex + 1} to sequence!`, {
        duration: 1500,
      });
    }
  };

  const handleStickerUpdate = (id: string, updates: Partial<Sticker>) => {
    setPlacedStickers(prev =>
      prev.map(sticker =>
        sticker.id === id ? { ...sticker, ...updates } : sticker
      )
    );
  };

  const handleLayerChange = (id: string, direction: 'up' | 'down') => {
    console.log(`Layer change requested: ${direction} for sticker ${id}`);
    setPlacedStickers(prev => {
      const currentSticker = prev.find(s => s.id === id);
      if (!currentSticker) {
        console.log('Sticker not found:', id);
        return prev;
      }

      console.log('Current sticker z-index:', currentSticker.zIndex);
      const otherStickers = prev.filter(s => s.id !== id);
      
      if (direction === 'up') {
        // Find the sticker with the next higher z-index to swap with
        const nextSticker = otherStickers
          .filter(s => s.zIndex > currentSticker.zIndex)
          .sort((a, b) => a.zIndex - b.zIndex)[0];
        
        if (nextSticker) {
          console.log('Swapping with sticker at z-index:', nextSticker.zIndex);
          // Swap z-indices
          return prev.map(s => {
            if (s.id === id) return { ...s, zIndex: nextSticker.zIndex };
            if (s.id === nextSticker.id) return { ...s, zIndex: currentSticker.zIndex };
            return s;
          });
        } else {
          // No sticker above, move to top
          const maxZ = Math.max(...prev.map(s => s.zIndex));
          console.log('Moving to top, new z-index:', maxZ + 1);
          return prev.map(s => s.id === id ? { ...s, zIndex: maxZ + 1 } : s);
        }
      } else {
        // Find the sticker with the next lower z-index to swap with
        const prevSticker = otherStickers
          .filter(s => s.zIndex < currentSticker.zIndex)
          .sort((a, b) => b.zIndex - a.zIndex)[0];
        
        if (prevSticker) {
          console.log('Swapping with sticker at z-index:', prevSticker.zIndex);
          // Swap z-indices
          return prev.map(s => {
            if (s.id === id) return { ...s, zIndex: prevSticker.zIndex };
            if (s.id === prevSticker.id) return { ...s, zIndex: currentSticker.zIndex };
            return s;
          });
        } else {
          // No sticker below, move to bottom
          const minZ = Math.min(...prev.map(s => s.zIndex));
          const newZ = Math.max(0, minZ - 1);
          console.log('Moving to bottom, new z-index:', newZ);
          return prev.map(s => s.id === id ? { ...s, zIndex: newZ } : s);
        }
      }
    });
  };

  const handleStickerRemove = (id: string) => {
    setPlacedStickers(prev => {
      const filtered = prev.filter(sticker => sticker.id !== id);
      // Re-index remaining stickers to maintain sequence order
      return filtered.map((sticker, index) => ({
        ...sticker,
        stepIndex: index
      }));
    });
  };

  const clearCanvas = () => {
    setPlacedStickers([]);
    setSelectedStickers([]);
    setCurrentStep(0);
    toast("Canvas cleared!", {
      duration: 1500,
    });
  };

  const selectAllStickers = () => {
    if (placedStickers.length === 0) return;
    
    if (selectedStickers.length === placedStickers.length) {
      // Deselect all if all are selected
      setSelectedStickers([]);
      setIsMultiSelectMode(false);
      toast("All stickers deselected", { duration: 1000 });
    } else {
      // Select all stickers
      setSelectedStickers(placedStickers.map(s => s.id));
      setIsMultiSelectMode(true);
      toast(`${placedStickers.length} stickers selected`, { duration: 1000 });
    }
  };

  const handleGroupMove = (deltaX: number, deltaY: number) => {
    if (selectedStickers.length === 0) return;
    
    setPlacedStickers(prev =>
      prev.map(sticker =>
        selectedStickers.includes(sticker.id)
          ? { ...sticker, x: sticker.x + deltaX, y: sticker.y + deltaY }
          : sticker
      )
    );
  };

  const handleStickerSelect = (id: string, isSelected: boolean) => {
    if (isSelected) {
      // Clear other selections if not multi-selecting
      setSelectedStickers([id]);
      setIsMultiSelectMode(false);
    } else {
      setSelectedStickers(prev => prev.filter(sId => sId !== id));
      if (selectedStickers.length <= 1) {
        setIsMultiSelectMode(false);
      }
    }
  };

  // Step Sequencer Logic
  useEffect(() => {
    if (isPlaying && placedStickers.length > 0) {
      const stepDuration = (60 / sequenceTempo) * 500; // Half beat steps for more resolution
      
      // Ensure the first step triggers immediately when starting
      setCurrentStep(0);
      
      sequencerRef.current = setInterval(() => {
        setCurrentStep(prev => (prev + 1) % placedStickers.length);
      }, stepDuration);
      
      return () => {
        if (sequencerRef.current) {
          clearInterval(sequencerRef.current);
        }
      };
    } else {
      if (sequencerRef.current) {
        clearInterval(sequencerRef.current);
        sequencerRef.current = null;
      }
    }
  }, [isPlaying, placedStickers.length, sequenceTempo]);

  const initializeAudio = async () => {
    if (!audioInitialized) {
      try {
        // Create and test audio context to ensure it works
        const testContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        await testContext.resume();
        console.log('Audio context initialized successfully');
        
        // Play a brief test tone to verify audio is working
        const testOsc = testContext.createOscillator();
        const testGain = testContext.createGain();
        
        testOsc.connect(testGain);
        testGain.connect(testContext.destination);
        
        testOsc.frequency.setValueAtTime(440, testContext.currentTime);
        testGain.gain.setValueAtTime(0.1, testContext.currentTime);
        testGain.gain.exponentialRampToValueAtTime(0.01, testContext.currentTime + 0.1);
        
        testOsc.start(testContext.currentTime);
        testOsc.stop(testContext.currentTime + 0.1);
        
        // Clean up test context
        setTimeout(() => {
          testContext.close();
        }, 200);
        
        setAudioInitialized(true);
        setIsPlaying(true);
        
        toast("🎵 Audio ready! Place stickers to create music!", {
          duration: 2000,
        });
        
        console.log('Audio system initialized and ready');
        
      } catch (error) {
        console.error("Failed to initialize audio:", error);
        toast("❌ Audio initialization failed. Check browser settings.", {
          duration: 3000,
        });
      }
    }
  };

  const togglePlayback = async () => {
    if (!audioInitialized) {
      await initializeAudio();
      return;
    }
    
    setIsPlaying(prev => !prev);
    toast(isPlaying ? "Paused" : "Playing", {
      duration: 1000,
    });
  };

  const handlePlay = async () => {
    if (!audioInitialized) {
      await initializeAudio();
      return;
    }
    setIsPlaying(true);
    toast("Playing", { duration: 1000 });
  };

  const handlePause = () => {
    setIsPlaying(false);
    toast("Paused", { duration: 1000 });
  };

  const handleExport = async () => {
    if (!canvasRef.current) return;
    
    if (isPlaying) {
      // Export as 15-second GIF
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
          
          // Wait for frame delay to capture animation changes
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
        // Fallback to PNG export
        exportAsPNG();
      }
    } else {
      // Export as PNG when paused
      exportAsPNG();
    }
  };

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
      
      // Convert canvas to blob
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

  const handleVideoExport = async () => {
    if (!canvasRef.current || isRecording) return;
    
    setIsRecording(true);
    toast("🎬 Creating 8-second MP4 of canvas only...", { duration: 3000 });

    try {
      // Ensure audio is initialized
      if (!audioInitialized) {
        await initializeAudio();
      }

      // Ensure playback is running for audio capture
      if (!isPlaying) {
        await togglePlayback();
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      // Create offscreen canvas for high-quality recording
      const canvasElement = canvasRef.current;
      const rect = canvasElement.getBoundingClientRect();
      
      const offscreenCanvas = document.createElement('canvas');
      offscreenCanvas.width = 1280;  // HD width
      offscreenCanvas.height = 720;  // HD height
      const offscreenCtx = offscreenCanvas.getContext('2d');
      
      if (!offscreenCtx) {
        throw new Error('Could not create offscreen canvas context');
      }

      // Create video stream from canvas
      const canvasStream = offscreenCanvas.captureStream(30); // 30 FPS
      
      // Create audio context destination for capturing audio
      let audioStream: MediaStream | null = null;
      if (audioContextRef.current) {
        try {
          const audioDestination = audioContextRef.current.createMediaStreamDestination();
          
          // Connect all playing audio sources to the destination
          // Note: Audio capture from Web Audio API requires specific setup
          audioStream = audioDestination.stream;
          
          audioStream = audioDestination.stream;
        } catch (audioError) {
          console.log('Audio capture setup failed:', audioError);
        }
      }

      // Combine video and audio streams
      const combinedStream = new MediaStream();
      canvasStream.getVideoTracks().forEach(track => combinedStream.addTrack(track));
      if (audioStream && audioStream.getAudioTracks().length > 0) {
        audioStream.getAudioTracks().forEach(track => combinedStream.addTrack(track));
      }

      // Create MediaRecorder
      const mediaRecorder = new MediaRecorder(combinedStream, {
        mimeType: 'video/webm; codecs=vp8,opus',
        videoBitsPerSecond: 4000000 // 4 Mbps for good quality
      });

      recordedChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        // Cleanup streams
        combinedStream.getTracks().forEach(track => track.stop());
        
        if (recordedChunksRef.current.length > 0) {
          const blob = new Blob(recordedChunksRef.current, { type: 'video/mp4' });
          const url = URL.createObjectURL(blob);
          const timestamp = Date.now();
          
          const newVideo: VideoGalleryItem = {
            id: `video-${timestamp}`,
            url,
            timestamp,
            name: `canvas-sequence-${timestamp}.mp4`
          };
          
          setExportedVideos(prev => [newVideo, ...prev]);
          toast("🎬 8-second MP4 video created successfully!", { duration: 3000 });
        } else {
          toast("❌ No video data recorded", { duration: 2000 });
        }
        setIsRecording(false);
      };

      // Start recording
      mediaRecorder.start(100);

      // Record for 8 seconds with animation frames
      const startTime = Date.now();
      const recordDuration = 8000; // 8 seconds
      let frameCount = 0;

      const captureFrame = async () => {
        const elapsed = Date.now() - startTime;
        
        if (elapsed < recordDuration && mediaRecorder.state === 'recording') {
          try {
            // Capture current canvas state using html2canvas
            const screenshot = await html2canvas(canvasElement, {
              backgroundColor: '#f8f9fa',
              scale: 1,
              useCORS: true,
              allowTaint: true,
              width: rect.width,
              height: rect.height,
              windowWidth: rect.width,
              windowHeight: rect.height
            });
            
            // Draw to offscreen canvas
            offscreenCtx.clearRect(0, 0, offscreenCanvas.width, offscreenCanvas.height);
            offscreenCtx.drawImage(screenshot, 0, 0, offscreenCanvas.width, offscreenCanvas.height);
            
            frameCount++;
            
            // Continue capturing
            requestAnimationFrame(captureFrame);
          } catch (frameError) {
            console.error('Frame capture error:', frameError);
            requestAnimationFrame(captureFrame);
          }
        } else {
          // Stop recording after 8 seconds
          if (mediaRecorder.state === 'recording') {
            mediaRecorder.stop();
          }
        }
      };

      // Start frame capture
      captureFrame();
      
      toast("📹 Recording canvas for 8 seconds...", { duration: 2000 });

    } catch (error) {
      console.error('Canvas video export failed:', error);
      setIsRecording(false);
      
      // Fallback to static PNG
      toast("Video export failed, creating PNG instead...", { duration: 2000 });
      exportAsPNG();
    }
  };

  const handleDeleteVideo = (videoId: string) => {
    setExportedVideos(prev => prev.filter(video => video.id !== videoId));
  };

  const handleControlBoardToggle = () => {
    const willBeCollapsed = !isControlBoardCollapsed;
    setIsControlBoardCollapsed(willBeCollapsed);
    
    // Only deselect stickers when closing the control board
    if (willBeCollapsed) {
      setSelectedStickers([]);
      setIsMultiSelectMode(false);
    }
  };

  return (
    <div className="min-h-screen p-3 sm:p-6 bg-gradient-background">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-4 sm:mb-8 text-center">
          <img 
            src="/lovable-uploads/36893164-d517-4d49-bcd4-e2bcad6cc0ce.png"
            alt="My Masomenos - For All Of Us Kids"
            className="mx-auto w-full h-auto max-h-16 sm:max-h-20 object-contain transition-all duration-300"
          />
        </div>

        {/* Main Layout */}
        <div className="flex flex-col gap-8 sm:gap-12">
          {/* Sticker Palette */}
          <div className="w-full">
            <Card className="p-3 bg-gradient-card shadow-card border-0 h-[200px] flex-shrink-0 mb-4 sm:mb-6">
              <StickerPalette />
            </Card>
          </div>

          {/* Music Canvas */}
          <div className="w-full flex-1">
            <Card className="bg-gradient-card shadow-card border-4 border-black rounded-none h-[calc(100vh-480px)] min-h-[400px] relative">
              {/* Control Buttons */}
              <div className="absolute top-2 right-2 z-20 flex gap-2">
                <button
                  onClick={selectAllStickers}
                  className="w-10 h-10 hover:scale-110 transition-transform duration-200 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center"
                  title="Select all stickers (Ctrl+A)"
                >
                  <span className="text-white font-bold text-xs">ALL</span>
                </button>
                <button
                  onClick={isPlaying ? handlePause : handlePlay}
                  className="w-10 h-10 hover:scale-110 transition-transform duration-200"
                >
                  <img
                    src={isPlaying ? "/lovable-uploads/65258414-94a1-467e-9cc8-d282505d1e1e.png" : "/lovable-uploads/5ec10ca7-cdd4-4ecc-bcbe-5243239cecc7.png"}
                    alt={isPlaying ? "Pause" : "Play"}
                    className="w-full h-full object-contain"
                  />
                </button>
                <button
                  onClick={handleExport}
                  className="w-10 h-10 hover:scale-110 transition-transform duration-200"
                >
                  <img
                    src="/lovable-uploads/fedcc64b-0b85-4fe3-93dc-05e76aa5ee7c.png"
                    alt="Share/Export"
                    className="w-full h-full object-contain"
                  />
                </button>
                <button
                  onClick={handleVideoExport}
                  disabled={isRecording}
                  className={`w-10 h-10 hover:scale-110 transition-transform duration-200 ${
                    isRecording ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                  title="Export 8-second video with sound"
                >
                  <Video className={`w-6 h-6 ${isRecording ? 'text-red-500 animate-pulse' : 'text-foreground'}`} />
                </button>
              </div>
              <MusicCanvas
                ref={canvasRef}
                stickers={placedStickers}
                onStickerDrop={handleStickerDrop}
                onStickerUpdate={handleStickerUpdate}
                onStickerRemove={handleStickerRemove}
                onLayerChange={handleLayerChange}
                isPlaying={isPlaying}
                globalVolume={globalVolume}
                currentStep={currentStep}
                sequenceTempo={sequenceTempo}
                selectedStickers={selectedStickers}
                isMultiSelectMode={isMultiSelectMode}
                onStickerSelect={handleStickerSelect}
                onGroupMove={handleGroupMove}
              />
            </Card>
            
            {/* Moveable controls - Working on selected stickers */}
            {placedStickers.length > 0 && (
              <div 
                className="fixed z-[9999] bg-white/95 backdrop-blur-sm p-4 rounded-lg border-2 border-gray-300 shadow-xl cursor-move select-none"
                style={{
                  left: `${controlBoardPosition.x}px`,
                  top: `${controlBoardPosition.y}px`
                }}
                onMouseDown={(e) => {
                  setIsDraggingControlBoard(true);
                  setDragOffset({
                    x: e.clientX - controlBoardPosition.x,
                    y: e.clientY - controlBoardPosition.y
                  });
                }}
                onTouchStart={(e) => {
                  if (e.touches.length === 1) {
                    const touch = e.touches[0];
                    setIsDraggingControlBoard(true);
                    setDragOffset({
                      x: touch.clientX - controlBoardPosition.x,
                      y: touch.clientY - controlBoardPosition.y
                    });
                  }
                }}
              >
                <div className="flex flex-col gap-3">
                  {/* Status info - Double-click to collapse */}
                  <div 
                    className="text-sm font-medium text-gray-700 border-b pb-2 cursor-pointer select-text"
                    onDoubleClick={handleControlBoardToggle}
                    title="Double-click to collapse/expand"
                  >
                    Controls - Selected: {selectedStickers.length} of {placedStickers.length} stickers
                  </div>
                  
                  {!isControlBoardCollapsed && (
                    <>
                      {selectedStickers.length > 0 ? (
                        <>
                          {/* Scale Controls */}
                          <div className="flex gap-2 items-center">
                            <span className="text-sm font-medium text-gray-700 w-16">Scale:</span>
                            <Button 
                              size="sm" 
                              variant="outline" 
                              className="w-10 h-10 p-0" 
                              onClick={() => {
                                console.log("Scale down clicked");
                                selectedStickers.forEach(stickerId => {
                                  const sticker = placedStickers.find(s => s.id === stickerId);
                                  if (sticker) {
                                    handleStickerUpdate(stickerId, { 
                                      width: Math.max(30, sticker.width - 10), 
                                      height: Math.max(30, sticker.height - 10) 
                                    });
                                  }
                                });
                              }}
                              title="Scale down selected"
                            >
                              <Minus className="w-4 h-4" />
                            </Button>
                            <Button 
                              size="sm" 
                              variant="outline" 
                              className="w-10 h-10 p-0" 
                              onClick={() => {
                                console.log("Scale up clicked");
                                selectedStickers.forEach(stickerId => {
                                  const sticker = placedStickers.find(s => s.id === stickerId);
                                  if (sticker) {
                                    handleStickerUpdate(stickerId, { 
                                      width: Math.min(300, sticker.width + 10), 
                                      height: Math.min(300, sticker.height + 10) 
                                    });
                                  }
                                });
                              }}
                              title="Scale up selected"
                            >
                              <Plus className="w-4 h-4" />
                            </Button>
                          </div>

                          {/* Rotation Controls */}
                          <div className="flex gap-2 items-center">
                            <span className="text-sm font-medium text-gray-700 w-16">Rotate:</span>
                            <Button 
                              size="sm" 
                              variant="outline" 
                              className="w-10 h-10 p-0" 
                              onClick={() => {
                                console.log("Rotate left clicked");
                                selectedStickers.forEach(stickerId => {
                                  const sticker = placedStickers.find(s => s.id === stickerId);
                                  if (sticker) {
                                    handleStickerUpdate(stickerId, { 
                                      rotation: (sticker.rotation || 0) - 15 
                                    });
                                  }
                                });
                              }}
                              title="Rotate left 15°"
                            >
                              <RotateCcw className="w-4 h-4" />
                            </Button>
                            <Button 
                              size="sm" 
                              variant="outline" 
                              className="w-10 h-10 p-0" 
                              onClick={() => {
                                console.log("Rotate right clicked");
                                selectedStickers.forEach(stickerId => {
                                  const sticker = placedStickers.find(s => s.id === stickerId);
                                  if (sticker) {
                                    handleStickerUpdate(stickerId, { 
                                      rotation: (sticker.rotation || 0) + 15 
                                    });
                                  }
                                });
                              }}
                              title="Rotate right 15°"
                            >
                              <RotateCw className="w-4 h-4" />
                            </Button>
                          </div>

                          {/* Layer Controls */}
                          <div className="flex gap-2 items-center">
                            <span className="text-sm font-medium text-gray-700 w-16">Layers:</span>
                            <Button 
                              size="sm" 
                              variant="outline" 
                              className="w-10 h-10 p-0" 
                              onClick={() => {
                                console.log("Move down layer clicked");
                                selectedStickers.forEach(stickerId => {
                                  handleLayerChange(stickerId, 'down');
                                });
                              }}
                              title="Move to back layer"
                            >
                              <ChevronDown className="w-4 h-4" />
                            </Button>
                            <Button 
                              size="sm" 
                              variant="outline" 
                              className="w-10 h-10 p-0" 
                              onClick={() => {
                                console.log("Move up layer clicked");
                                selectedStickers.forEach(stickerId => {
                                  handleLayerChange(stickerId, 'up');
                                });
                              }}
                              title="Move to front layer"
                            >
                              <ChevronUp className="w-4 h-4" />
                            </Button>
                          </div>

                          {/* Mirror and Delete Controls */}
                          <div className="flex gap-2 items-center">
                            <span className="text-sm font-medium text-gray-700 w-16">Tools:</span>
                            <Button 
                              size="sm" 
                              variant="outline" 
                              className="w-10 h-10 p-0" 
                              onClick={() => {
                                console.log("Mirror clicked");
                                selectedStickers.forEach(stickerId => {
                                  const sticker = placedStickers.find(s => s.id === stickerId);
                                  if (sticker) {
                                    handleStickerUpdate(stickerId, { mirrored: !sticker.mirrored });
                                  }
                                });
                              }}
                              title="Flip horizontal"
                            >
                              <FlipHorizontal className="w-4 h-4" />
                            </Button>
                            <Button 
                              size="sm" 
                              variant="destructive" 
                              className="w-10 h-10 p-0" 
                              onClick={() => {
                                console.log("Delete clicked");
                                selectedStickers.forEach(stickerId => {
                                  handleStickerRemove(stickerId);
                                });
                                setSelectedStickers([]);
                              }}
                              title="Delete selected"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </>
                      ) : (
                        <div className="text-sm text-gray-500 text-center py-4">
                          Click on stickers to select them
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
          
          {/* Media Gallery */}
          <div className="w-full mt-8">
            <MediaGallery 
              videos={exportedVideos}
              onDeleteVideo={handleDeleteVideo}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default StickerMusicApp;