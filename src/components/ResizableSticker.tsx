import React, { useEffect, useRef, useState, useCallback } from "react";
import { Sticker } from "./StickerMusicApp";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ResizableStickerProps {
  sticker: Sticker;
  onUpdate: (id: string, updates: Partial<Sticker>) => void;
  onRemove: (id: string) => void;
  isPlaying: boolean;
  globalVolume: number;
}

export const ResizableSticker = ({
  sticker,
  onUpdate,
  onRemove,
  isPlaying,
  globalVolume,
}: ResizableStickerProps) => {
  const stickerRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // Create a simple tone for each sticker based on its ID
  const createAudioTone = useCallback(async () => {
    if (audioRef.current) return;
    
    try {
      // Generate a simple beep tone - in a real app, you'd load actual audio files
      const frequencies = [220, 262, 294, 330, 349, 392, 440, 494]; // Musical notes
      const index = parseInt(sticker.id.split('-')[1] || "0") % frequencies.length;
      const frequency = frequencies[index];
      
      // Create a simple sine wave tone
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      // Resume audio context if it's suspended (required by some browsers)
      if (audioContext.state === 'suspended') {
        await audioContext.resume();
      }
      
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      // Set initial volume based on sticker size
      const sizeRatio = (sticker.width + sticker.height) / 160; // Base size is 80x80
      const volume = Math.min(sizeRatio * globalVolume * 0.3, 0.5); // Lower max volume
      gainNode.gain.setValueAtTime(volume, audioContext.currentTime);
      
      oscillator.start();
      
      // Loop the oscillator
      oscillator.loop = true;
      
      // Store reference for cleanup
      audioRef.current = {
        oscillator,
        gainNode,
        audioContext,
        stop: () => {
          try {
            oscillator.stop();
            audioContext.close();
          } catch (e) {
            console.log('Audio cleanup error:', e);
          }
        },
        setVolume: (vol: number) => {
          try {
            gainNode.gain.setValueAtTime(Math.min(vol, 0.5), audioContext.currentTime);
          } catch (e) {
            console.log('Volume set error:', e);
          }
        }
      } as any;
    } catch (error) {
      console.log('Audio creation failed:', error);
    }
  }, [sticker.id, sticker.width, sticker.height, globalVolume]);

  // Update audio volume when sticker size or global volume changes
  useEffect(() => {
    if (audioRef.current && isPlaying) {
      const sizeRatio = (sticker.width + sticker.height) / 160;
      const volume = sizeRatio * globalVolume * sticker.volume;
      if ((audioRef.current as any).setVolume) {
        (audioRef.current as any).setVolume(volume);
      }
    }
  }, [sticker.width, sticker.height, sticker.volume, globalVolume, isPlaying]);

  // Handle audio playback
  useEffect(() => {
    if (isPlaying) {
      createAudioTone();
    } else {
      if (audioRef.current && (audioRef.current as any).stop) {
        (audioRef.current as any).stop();
        audioRef.current = null;
      }
    }

    return () => {
      if (audioRef.current && (audioRef.current as any).stop) {
        (audioRef.current as any).stop();
        audioRef.current = null;
      }
    };
  }, [isPlaying, createAudioTone]);

  const handleMouseDown = (event: React.MouseEvent) => {
    if (event.target === event.currentTarget || (event.target as HTMLElement).tagName === 'IMG') {
      setIsDragging(true);
      setDragStart({
        x: event.clientX - sticker.x,
        y: event.clientY - sticker.y,
      });
    }
  };

  const handleMouseMove = useCallback((event: MouseEvent) => {
    if (isDragging) {
      const newX = event.clientX - dragStart.x;
      const newY = event.clientY - dragStart.y;
      onUpdate(sticker.id, { x: Math.max(0, newX), y: Math.max(0, newY) });
    }
  }, [isDragging, dragStart, onUpdate, sticker.id]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    setIsResizing(false);
  }, []);

  useEffect(() => {
    if (isDragging || isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);

      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, isResizing, handleMouseMove, handleMouseUp]);

  const handleResizeStart = (event: React.MouseEvent) => {
    event.stopPropagation();
    setIsResizing(true);
    setDragStart({
      x: event.clientX,
      y: event.clientY,
    });
  };

  const handleResizeMove = useCallback((event: MouseEvent) => {
    if (isResizing) {
      const deltaX = event.clientX - dragStart.x;
      const deltaY = event.clientY - dragStart.y;
      const newWidth = Math.max(40, sticker.width + deltaX);
      const newHeight = Math.max(40, sticker.height + deltaY);
      
      onUpdate(sticker.id, { 
        width: newWidth, 
        height: newHeight,
      });
      
      setDragStart({
        x: event.clientX,
        y: event.clientY,
      });
    }
  }, [isResizing, dragStart, onUpdate, sticker]);

  useEffect(() => {
    if (isResizing) {
      document.addEventListener('mousemove', handleResizeMove);
      document.addEventListener('mouseup', handleMouseUp);

      return () => {
        document.removeEventListener('mousemove', handleResizeMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isResizing, handleResizeMove, handleMouseUp]);

  return (
    <div
      ref={stickerRef}
      className={`absolute cursor-move select-none group sticker-bounce ${
        isDragging ? 'z-50 scale-105' : ''
      }`}
      style={{
        left: sticker.x,
        top: sticker.y,
        width: sticker.width,
        height: sticker.height,
      }}
      onMouseDown={handleMouseDown}
    >
      {/* Remove button */}
      <Button
        size="sm"
        variant="destructive"
        className="absolute -top-2 -right-2 w-6 h-6 rounded-full opacity-0 group-hover:opacity-100 transition-opacity z-10"
        onClick={() => onRemove(sticker.id)}
      >
        <X className="w-3 h-3" />
      </Button>

      {/* Sticker image */}
      <img
        src={sticker.src}
        alt="Sticker"
        className="w-full h-full object-contain pointer-events-none"
        draggable={false}
        style={{ backgroundColor: 'transparent' }}
      />

      {/* Resize handle */}
      <div
        className="absolute bottom-0 right-0 w-4 h-4 cursor-nw-resize opacity-0 group-hover:opacity-100 transition-opacity"
        onMouseDown={handleResizeStart}
        style={{
          background: 'linear-gradient(-45deg, transparent 30%, hsl(var(--primary)) 30%, hsl(var(--primary)) 70%, transparent 70%)',
        }}
      />

      {/* Size indicator */}
      <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 text-xs bg-primary text-primary-foreground px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">
        {Math.round((sticker.width + sticker.height) / 2)}px
      </div>
    </div>
  );
};