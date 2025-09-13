import React, { useRef, useCallback, forwardRef, useEffect, useState } from "react";
import { Sticker, StickerData } from "./StickerMusicApp";
import { ResizableSticker } from "./ResizableSticker";

interface MusicCanvasProps {
  stickers: Sticker[];
  onStickerDrop: (sticker: StickerData, x: number, y: number) => void;
  onStickerUpdate: (id: string, updates: Partial<Sticker>) => void;
  onStickerRemove: (id: string) => void;
  onLayerChange: (id: string, direction: 'up' | 'down') => void;
  isPlaying: boolean;
  globalVolume: number;
  currentStep: number;
  sequenceTempo: number;
  selectedStickers: string[];
  isMultiSelectMode: boolean;
  onStickerSelect: (id: string, isSelected: boolean) => void;
  onGroupMove: (deltaX: number, deltaY: number) => void;
  currentPattern?: string;
}

export const MusicCanvas = forwardRef<HTMLDivElement, MusicCanvasProps>(({
  stickers,
  onStickerDrop,
  onStickerUpdate,
  onStickerRemove,
  onLayerChange,
  isPlaying,
  globalVolume,
  currentStep,
  sequenceTempo,
  selectedStickers,
  isMultiSelectMode,
  onStickerSelect,
  onGroupMove,
  currentPattern,
}, ref) => {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [harmonicConnections, setHarmonicConnections] = useState<Array<{from: number, to: number}>>([]);

  // Calculate harmonic connections for visual feedback
  useEffect(() => {
    if (stickers.length > 1 && isPlaying) {
      const connections: Array<{from: number, to: number}> = [];
      
      stickers.forEach((sticker, index) => {
        const nearbyStickers = stickers
          .map((otherSticker, otherIndex) => ({
            index: otherIndex,
            distance: Math.sqrt(
              Math.pow(otherSticker.x - sticker.x, 2) + 
              Math.pow(otherSticker.y - sticker.y, 2)
            )
          }))
          .filter(item => item.index !== index)
          .sort((a, b) => a.distance - b.distance)
          .slice(0, 1); // Only connect to nearest neighbor
          
        nearbyStickers.forEach(nearby => {
          connections.push({ from: index, to: nearby.index });
        });
      });
      
      setHarmonicConnections(connections);
    } else {
      setHarmonicConnections([]);
    }
  }, [stickers, isPlaying, currentStep]);

  const handleDragOver = useCallback((event: React.DragEvent) => {
    // Only handle drag events from palette, not from existing stickers
    const dragType = event.dataTransfer?.types?.includes('application/json');
    if (!dragType) return;
    
    event.preventDefault();
    event.currentTarget.classList.add("drop-zone-active");
  }, []);

  const handleDragLeave = useCallback((event: React.DragEvent) => {
    const dragType = event.dataTransfer?.types?.includes('application/json');
    if (!dragType) return;
    
    event.preventDefault();
    event.currentTarget.classList.remove("drop-zone-active");
  }, []);

  const handleDrop = useCallback((event: React.DragEvent) => {
    const dragType = event.dataTransfer?.types?.includes('application/json');
    if (!dragType) {
      event.currentTarget.classList.remove("drop-zone-active");
      return;
    }
    
    event.preventDefault();
    event.currentTarget.classList.remove("drop-zone-active");

    try {
      const stickerData: StickerData = JSON.parse(
        event.dataTransfer.getData("application/json")
      );

      if (canvasRef.current) {
        const rect = canvasRef.current.getBoundingClientRect();
        const x = event.clientX - rect.left - 40; // Center the sticker
        const y = event.clientY - rect.top - 40;
        
        onStickerDrop(stickerData, Math.max(0, x), Math.max(0, y));
      }
    } catch (error) {
      console.error("Error dropping sticker:", error);
    }
  }, [onStickerDrop]);

  return (
    <div ref={ref} className="relative h-full p-3">
      <div
        ref={canvasRef}
        className="relative w-full h-full min-h-[400px] bg-muted/20 transition-all duration-300"
        style={{
          WebkitUserSelect: 'none',
          WebkitTouchCallout: 'none',
        }}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {stickers.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center text-muted-foreground pointer-events-none">
            <div className="text-center">
              <div className="text-6xl mb-4">🎵</div>
              <p className="text-lg">Drop stickers here to make music!</p>
              <p className="text-sm mt-2 opacity-70">Each sticker creates a unique sound that loops!</p>
            </div>
          </div>
        )}


        {/* Harmonic Connection Lines */}
        {isPlaying && harmonicConnections.length > 0 && (
          <svg className="absolute inset-0 pointer-events-none z-5" style={{ width: '100%', height: '100%' }}>
            {harmonicConnections.map((connection, index) => {
              const fromSticker = stickers[connection.from];
              const toSticker = stickers[connection.to];
              if (!fromSticker || !toSticker) return null;
              
              const fromX = fromSticker.x + fromSticker.width / 2;
              const fromY = fromSticker.y + fromSticker.height / 2;
              const toX = toSticker.x + toSticker.width / 2;
              const toY = toSticker.y + toSticker.height / 2;
              
              const isActive = connection.from === currentStep || connection.to === currentStep;
              
              return (
                <line
                  key={`${connection.from}-${connection.to}-${index}`}
                  x1={fromX}
                  y1={fromY}
                  x2={toX}
                  y2={toY}
                  stroke="hsl(var(--primary))"
                  strokeWidth={isActive ? "2" : "1"}
                  strokeOpacity={isActive ? "0.6" : "0.2"}
                  strokeDasharray="4 4"
                  className={isActive ? "animate-pulse" : ""}
                />
              );
            })}
          </svg>
        )}

        {stickers
          .sort((a, b) => a.zIndex - b.zIndex)
          .map((sticker) => (
          <ResizableSticker
            key={sticker.id}
            sticker={sticker}
            onUpdate={onStickerUpdate}
            onRemove={onStickerRemove}
            onLayerChange={onLayerChange}
            isPlaying={isPlaying}
            globalVolume={globalVolume}
            canvasRef={canvasRef}
            isCurrentStep={sticker.stepIndex === currentStep}
            sequenceTempo={sequenceTempo}
            isSelected={selectedStickers.includes(sticker.id)}
            isMultiSelectMode={isMultiSelectMode}
            onSelect={onStickerSelect}
            onGroupMove={onGroupMove}
          />
        ))}
      </div>
    </div>
  );
});

MusicCanvas.displayName = "MusicCanvas";