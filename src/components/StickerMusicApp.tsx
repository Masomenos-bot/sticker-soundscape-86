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
  x: number;
  y: number;
  width: number;
  height: number;
  volume: number;
  rotation?: number;
  mirrored?: boolean;
  src: string;
  alt: string;
  soundUrl?: string;
  zIndex: number;
  stepIndex: number;
  audioBuffer?: AudioBuffer;
  audioSource?: AudioBufferSourceNode;
  gainNode?: GainNode;
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

  const initializeAudio = async () => {
    if (!audioContextRef.current) {
      try {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        
        if (audioContextRef.current.state === "suspended") {
          await audioContextRef.current.resume();
        }
        
        setAudioInitialized(true);
        toast("🎵 Audio system ready!", {
          duration: 2000,
        });
        
        console.log("Audio context initialized successfully");
      } catch (error) {
        console.error("Failed to initialize audio:", error);
        toast("❌ Audio initialization failed. Check browser settings.", {
          duration: 3000,
        });
      }
    }
  };

  const handleStickerDrop = async (stickerData: StickerData, x: number, y: number) => {
    const maxZIndex = Math.max(0, ...placedStickers.map(s => s.zIndex));
    const nextStepIndex = placedStickers.length; // Add as next step in sequence
    const newSticker: Sticker = {
      id: `${stickerData.id}-${Date.now()}`,
      x,
      y,
      width: 80,
      height: 80,
      volume: 0.7,
      rotation: 0,
      mirrored: false,
      src: stickerData.src,
      alt: stickerData.alt,
      soundUrl: stickerData.soundUrl,
      zIndex: maxZIndex + 1,
      stepIndex: nextStepIndex,
    };

    // Preload audio for the new sticker
    if (newSticker.soundUrl && audioContextRef.current) {
      try {
        const response = await fetch(newSticker.soundUrl);
        const arrayBuffer = await response.arrayBuffer();
        const audioBuffer = await audioContextRef.current.decodeAudioData(arrayBuffer);
        newSticker.audioBuffer = audioBuffer;
      } catch (error) {
        console.error(`Failed to load audio for ${newSticker.alt}:`, error);
      }
    }

    setPlacedStickers(prev => [...prev, newSticker]);
  };

  const handleStickerUpdate = (id: string, updates: Partial<Sticker>) => {
    setPlacedStickers(prev =>
      prev.map(sticker => (sticker.id === id ? { ...sticker, ...updates } : sticker))
    );
  };

  const handleStickerRemove = (id: string) => {
    setPlacedStickers(prev => prev.filter(sticker => sticker.id !== id));
    setSelectedStickers(prev => prev.filter(stickerId => stickerId !== id));
  };

  const handleLayerChange = (id: string, direction: 'up' | 'down') => {
    setPlacedStickers(prev => {
      const currentSticker = prev.find(s => s.id === id);
      if (!currentSticker) return prev;
      
      console.log('Current sticker z-index:', currentSticker.zIndex);
      const otherStickers = prev.filter(s => s.id !== id);
      
      if (direction === 'up') {
        // Find the sticker with the next higher z-index to swap with
        const nextSticker = otherStickers
          .filter(s => s.zIndex > currentSticker.zIndex)
          .sort((a, b) => a.zIndex - b.zIndex)[0];
          
        if (nextSticker) {
          console.log('Swapping with sticker z-index:', nextSticker.zIndex);
          return prev.map(sticker => {
            if (sticker.id === id) {
              return { ...sticker, zIndex: nextSticker.zIndex };
            } else if (sticker.id === nextSticker.id) {
              return { ...sticker, zIndex: currentSticker.zIndex };
            }
            return sticker;
          });
        } else {
          console.log('No higher z-index found');
        }
      } else {
        // Find the sticker with the next lower z-index to swap with
        const prevSticker = otherStickers
          .filter(s => s.zIndex < currentSticker.zIndex)
          .sort((a, b) => b.zIndex - a.zIndex)[0];
          
        if (prevSticker) {
          console.log('Swapping with sticker z-index:', prevSticker.zIndex);
          return prev.map(sticker => {
            if (sticker.id === id) {
              return { ...sticker, zIndex: prevSticker.zIndex };
            } else if (sticker.id === prevSticker.id) {
              return { ...sticker, zIndex: currentSticker.zIndex };
            }
            return sticker;
          });
        } else {
          console.log('No lower z-index found');
        }
      }
      
      return prev;
    });
  };

  const selectAllStickers = () => {
    if (placedStickers.length === 0) return;
    
    if (selectedStickers.length === placedStickers.length) {
      // Deselect all if all are selected
      setSelectedStickers([]);
      setIsMultiSelectMode(false);
    } else {
      // Select all stickers
      setSelectedStickers(placedStickers.map(s => s.id));
      setIsMultiSelectMode(true);
    }
  };

  const handleGroupMove = (deltaX: number, deltaY: number) => {
    selectedStickers.forEach(stickerId => {
      const sticker = placedStickers.find(s => s.id === stickerId);
      if (sticker) {
        handleStickerUpdate(stickerId, { 
          x: sticker.x + deltaX, 
          y: sticker.y + deltaY 
        });
      }
    });
  };

  const handleStickerSelect = (id: string, isSelected: boolean) => {
    if (isSelected) {
      // Clear other selections if not multi-selecting
      if (!isMultiSelectMode) {
        setSelectedStickers([id]);
      } else {
        setSelectedStickers(prev => [...prev, id]);
      }
    } else {
      setSelectedStickers(prev => prev.filter(stickerId => stickerId !== id));
    }
  };

  const startSequencer = async () => {
    if (sequencerRef.current) return;
    
    // Initialize audio context when starting sequencer
    await initializeAudio();
    
    const stepDuration = 60000 / sequenceTempo; // Duration of each step in milliseconds
    
    sequencerRef.current = setInterval(() => {
      setCurrentStep((prevStep) => (prevStep + 1) % 16);
    }, stepDuration);
  };

  const stopSequencer = () => {
    if (sequencerRef.current) {
      clearInterval(sequencerRef.current);
      sequencerRef.current = null;
    }
    setCurrentStep(0);
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

  useEffect(() => {
    if (isPlaying) {
      startSequencer();
    } else {
      stopSequencer();
    }
    
    return () => {
      if (sequencerRef.current) {
        clearInterval(sequencerRef.current);
        sequencerRef.current = null;
      }
    };
  }, [isPlaying, sequenceTempo]);

  const handleExport = () => {
    if (isPlaying) {
      handleCanvasExport();
    } else {
      exportAsPNG();
    }
  };

  const handleCanvasExport = async () => {
    if (!canvasRef.current || !isPlaying) return;
    
    try {
      toast("Creating 15-second GIF animation! 🎬", { duration: 3000 });
      
      const gif = new GIF({
        workers: 2,
        quality: 10,
        width: 800,
        height: 600,
        workerScript: '/gif.worker.js'
      });

      const captureInterval = 200; // Capture every 200ms for smooth animation
      const duration = 15000; // 15 seconds
      const frameCount = duration / captureInterval;
      let currentFrame = 0;

      const captureFrame = async () => {
        if (currentFrame < frameCount && canvasRef.current) {
          const canvas = await html2canvas(canvasRef.current, {
            backgroundColor: null,
            scale: 1,
            useCORS: true,
            allowTaint: true,
          });
          
          gif.addFrame(canvas, { delay: captureInterval });
          currentFrame++;
          
          // Update progress
          const progress = Math.round((currentFrame / frameCount) * 100);
          if (progress % 20 === 0) {
            toast(`Capturing frames... ${progress}%`, { duration: 500 });
          }
          
          setTimeout(captureFrame, captureInterval);
        } else {
          gif.render();
        }
      };

      gif.on('finished', function(blob) {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.download = `sticker-music-${Date.now()}.gif`;
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
    toast("🎬 Recording 8-second video...", { duration: 2000 });

    try {
      // Ensure audio is initialized and playing
      if (!audioInitialized) {
        await initializeAudio();
      }

      if (!isPlaying) {
        await togglePlayback();
        await new Promise(resolve => setTimeout(resolve, 800));
      }

      // Create recording canvas that's appended to DOM (required for captureStream)
      const recordCanvas = document.createElement('canvas');
      recordCanvas.width = 1280;
      recordCanvas.height = 720;
      recordCanvas.style.position = 'fixed';
      recordCanvas.style.top = '-9999px';
      recordCanvas.style.left = '-9999px';
      recordCanvas.style.zIndex = '-1';
      document.body.appendChild(recordCanvas);
      
      const ctx = recordCanvas.getContext('2d');
      if (!ctx) throw new Error('Canvas context failed');

      // Get video stream from canvas
      const videoStream = recordCanvas.captureStream(30);
      
      // Try to get microphone for audio (optional)
      let audioStream = null;
      try {
        audioStream = await navigator.mediaDevices.getUserMedia({ 
          audio: {
            echoCancellation: false,
            noiseSuppression: false,
            autoGainControl: false
          } 
        });
        toast("🎤 Recording with microphone audio", { duration: 1000 });
      } catch (audioError) {
        console.log('No microphone access, video only');
      }

      // Combine streams
      const tracks = [...videoStream.getVideoTracks()];
      if (audioStream) {
        tracks.push(...audioStream.getAudioTracks());
      }
      
      const combinedStream = new MediaStream(tracks);

      // Create MediaRecorder with fallback mimeType
      let mimeType = 'video/webm';
      if (MediaRecorder.isTypeSupported('video/webm; codecs=vp8')) {
        mimeType = 'video/webm; codecs=vp8';
      } else if (MediaRecorder.isTypeSupported('video/webm')) {
        mimeType = 'video/webm';
      } else if (MediaRecorder.isTypeSupported('video/mp4')) {
        mimeType = 'video/mp4';
      }

      const mediaRecorder = new MediaRecorder(combinedStream, {
        mimeType,
        videoBitsPerSecond: 2000000
      });

      recordedChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        // Clean up
        document.body.removeChild(recordCanvas);
        combinedStream.getTracks().forEach(track => track.stop());
        
        if (recordedChunksRef.current.length > 0) {
          const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
          const url = URL.createObjectURL(blob);
          const timestamp = Date.now();
          
          // Add to gallery instead of downloading
          const newVideo: VideoGalleryItem = {
            id: `video-${timestamp}`,
            url,
            timestamp,
            name: `music-canvas-${timestamp}.webm`
          };
          
          setExportedVideos(prev => [newVideo, ...prev]);
          toast("🎬 Video saved to gallery!", { duration: 2000 });
        } else {
          toast("❌ Video recording failed", { duration: 2000 });
        }
        setIsRecording(false);
      };

      // Start recording
      mediaRecorder.start(100);

      // Animate canvas for 8 seconds
      const startTime = Date.now();
      const duration = 8000;
      let frameCount = 0;

      const animate = async () => {
        const elapsed = Date.now() - startTime;
        
        if (elapsed < duration && mediaRecorder.state === 'recording') {
          try {
            // Capture current canvas state
            const canvasElement = canvasRef.current!;
            const screenshot = await html2canvas(canvasElement, {
              backgroundColor: '#f8f9fa',
              scale: 0.8, // Reduce for performance
              useCORS: true,
              allowTaint: true
            });
            
            // Draw to recording canvas
            ctx.fillStyle = '#f8f9fa';
            ctx.fillRect(0, 0, recordCanvas.width, recordCanvas.height);
            ctx.drawImage(screenshot, 0, 0, recordCanvas.width, recordCanvas.height);
            
            frameCount++;
            requestAnimationFrame(animate);
          } catch (error) {
            console.error('Frame error:', error);
            requestAnimationFrame(animate);
          }
        } else {
          // Stop recording after duration
          if (mediaRecorder.state === 'recording') {
            mediaRecorder.stop();
          }
        }
      };

      animate();

    } catch (error) {
      console.error('Video export failed:', error);
      setIsRecording(false);
      toast("❌ Video export failed", { duration: 2000 });
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

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 sm:gap-6">
          {/* Sticker Palette */}
          <div className="lg:col-span-1">
            <StickerPalette />
          </div>

          {/* Main Canvas Area */}
          <div className="lg:col-span-3">
            <Card className="p-4 sm:p-6 bg-gradient-card shadow-card border-0">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
                <div className="flex items-center gap-2">
                  <Button
                    onClick={togglePlayback}
                    variant={isPlaying ? "default" : "outline"}
                    size="sm"
                    className="flex items-center gap-2"
                  >
                    {isPlaying ? (
                      <><Pause className="w-4 h-4" /> Pause</>
                    ) : (
                      <><Play className="w-4 h-4" /> Play</>
                    )}
                  </Button>
                  
                  <div className="flex items-center gap-2">
                    <Volume2 className="w-4 h-4" />
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.1"
                      value={globalVolume}
                      onChange={(e) => setGlobalVolume(parseFloat(e.target.value))}
                      className="w-20"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    onClick={handleExport}
                    variant="secondary"
                    size="sm"
                    className="flex items-center gap-2"
                  >
                    📸 {isPlaying ? 'GIF' : 'PNG'}
                  </Button>
                  
                  <Button
                    onClick={handleVideoExport}
                    variant="secondary"
                    size="sm"
                    className="flex items-center gap-2"
                    disabled={isRecording}
                  >
                    <Video className="w-4 h-4" />
                    {isRecording ? 'Recording...' : 'Video'}
                  </Button>
                </div>
              </div>

              <div className="relative">
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

                {/* Control Board */}
                {selectedStickers.length > 0 && (
                  <div 
                    className={`absolute bg-card/95 backdrop-blur-sm border rounded-lg shadow-lg transition-all duration-300 ${
                      isControlBoardCollapsed ? 'w-12 h-12' : 'min-w-80'
                    }`}
                    style={{ 
                      left: controlBoardPosition.x, 
                      top: controlBoardPosition.y,
                      zIndex: 1000
                    }}
                  >
                    {/* Drag Handle */}
                    <div 
                      className="absolute top-0 left-0 w-full h-8 cursor-move bg-muted/50 rounded-t-lg flex items-center justify-between px-2"
                      onMouseDown={(e) => {
                        setIsDraggingControlBoard(true);
                        setDragOffset({
                          x: e.clientX - controlBoardPosition.x,
                          y: e.clientY - controlBoardPosition.y
                        });
                      }}
                    >
                      <span className="text-xs font-medium">
                        {isControlBoardCollapsed ? "" : `${selectedStickers.length} selected`}
                      </span>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="w-6 h-6 p-0"
                        onClick={handleControlBoardToggle}
                      >
                        {isControlBoardCollapsed ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                      </Button>
                    </div>

                    {!isControlBoardCollapsed && (
                      <div className="p-4 pt-10">
                        <div className="flex flex-col gap-3">
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              className="flex items-center gap-1"
                              onClick={selectAllStickers}
                            >
                              {selectedStickers.length === placedStickers.length ? "Deselect All" : "Select All"}
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              className="flex items-center gap-1"
                              onClick={() => {
                                selectedStickers.forEach(id => handleStickerRemove(id));
                                setSelectedStickers([]);
                                setIsMultiSelectMode(false);
                              }}
                            >
                              <Trash2 className="w-3 h-3" />
                              Delete
                            </Button>
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            <div className="flex flex-col gap-2">
                              <label className="text-xs font-medium">Size</label>
                              <div className="flex gap-1">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="flex-1"
                                  onClick={() => {
                                    console.log("Scale down clicked");
                                    selectedStickers.forEach(stickerId => {
                                      const sticker = placedStickers.find(s => s.id === stickerId);
                                      if (sticker) {
                                        handleStickerUpdate(stickerId, { 
                                          width: Math.max(30, sticker.width * 0.9), 
                                          height: Math.max(30, sticker.height * 0.9) 
                                        });
                                      }
                                    });
                                  }}
                                >
                                  <Minus className="w-3 h-3" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="flex-1"
                                  onClick={() => {
                                    console.log("Scale up clicked");
                                    selectedStickers.forEach(stickerId => {
                                      const sticker = placedStickers.find(s => s.id === stickerId);
                                      if (sticker) {
                                        handleStickerUpdate(stickerId, { 
                                          width: Math.min(300, sticker.width * 1.1), 
                                          height: Math.min(300, sticker.height * 1.1) 
                                        });
                                      }
                                    });
                                  }}
                                >
                                  <Plus className="w-3 h-3" />
                                </Button>
                              </div>
                            </div>

                            <div className="flex flex-col gap-2">
                              <label className="text-xs font-medium">Rotate</label>
                              <div className="flex gap-1">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="flex-1"
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
                                >
                                  <RotateCcw className="w-3 h-3" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="flex-1"
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
                                >
                                  <RotateCw className="w-3 h-3" />
                                </Button>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              className="flex items-center gap-1"
                              onClick={() => {
                                console.log("Mirror clicked");
                                selectedStickers.forEach(stickerId => {
                                  const sticker = placedStickers.find(s => s.id === stickerId);
                                  if (sticker) {
                                    handleStickerUpdate(stickerId, { mirrored: !sticker.mirrored });
                                  }
                                });
                              }}
                            >
                              <FlipHorizontal className="w-3 h-3" />
                              Mirror
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </Card>
          </div>
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
  );
};

export default StickerMusicApp;
