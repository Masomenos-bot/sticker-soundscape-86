import React from "react";
import { Button } from "@/components/ui/button";
import { Plus, Minus, RotateCcw, RotateCw, ChevronUp, ChevronDown, FlipHorizontal, Trash2 } from "lucide-react";
import { Sticker } from "./StickerMusicApp";

interface ControlPanelProps {
  selectedStickers: string[];
  placedStickers: Sticker[];
  isCollapsed: boolean;
  position: { x: number; y: number };
  onToggle: () => void;
  onDragStart: (e: React.MouseEvent | React.TouchEvent) => void;
  onStickerUpdate: (id: string, updates: Partial<Sticker>) => void;
  onLayerChange: (id: string, direction: 'up' | 'down') => void;
  onStickerRemove: (id: string) => void;
}

export const ControlPanel: React.FC<ControlPanelProps> = ({
  selectedStickers,
  placedStickers,
  isCollapsed,
  position,
  onToggle,
  onDragStart,
  onStickerUpdate,
  onLayerChange,
  onStickerRemove
}) => {
  const applyToSelected = (action: (sticker: Sticker) => Partial<Sticker>) => {
    selectedStickers.forEach(stickerId => {
      const sticker = placedStickers.find(s => s.id === stickerId);
      if (sticker) {
        onStickerUpdate(stickerId, action(sticker));
      }
    });
  };

  if (placedStickers.length === 0) return null;

  return (
    <div 
      className="fixed z-[9999] bg-white/95 backdrop-blur-sm p-4 rounded-lg border-2 border-gray-300 shadow-xl cursor-move select-none"
      style={{ left: `${position.x}px`, top: `${position.y}px` }}
      onMouseDown={onDragStart}
      onTouchStart={onDragStart}
    >
      <div className="flex flex-col gap-3">
        <div 
          className="text-sm font-medium text-gray-700 border-b pb-2 cursor-pointer select-text"
          onDoubleClick={onToggle}
          title="Double-click to collapse/expand"
        >
          Controls - Selected: {selectedStickers.length} of {placedStickers.length} stickers
        </div>
        
        {!isCollapsed && selectedStickers.length > 0 && (
          <>
            {/* Scale Controls */}
            <div className="flex gap-2 items-center">
              <span className="text-sm font-medium text-gray-700 w-16">Scale:</span>
              <Button 
                size="sm" 
                variant="outline" 
                className="w-10 h-10 p-0" 
                onClick={() => applyToSelected(sticker => ({ 
                  width: Math.max(30, sticker.width - 10), 
                  height: Math.max(30, sticker.height - 10) 
                }))}
                title="Scale down selected"
              >
                <Minus className="w-4 h-4" />
              </Button>
              <Button 
                size="sm" 
                variant="outline" 
                className="w-10 h-10 p-0" 
                onClick={() => applyToSelected(sticker => ({ 
                  width: Math.min(300, sticker.width + 10), 
                  height: Math.min(300, sticker.height + 10) 
                }))}
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
                onClick={() => applyToSelected(sticker => ({ rotation: (sticker.rotation || 0) - 15 }))}
                title="Rotate left 15°"
              >
                <RotateCcw className="w-4 h-4" />
              </Button>
              <Button 
                size="sm" 
                variant="outline" 
                className="w-10 h-10 p-0" 
                onClick={() => applyToSelected(sticker => ({ rotation: (sticker.rotation || 0) + 15 }))}
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
                onClick={() => selectedStickers.forEach(id => onLayerChange(id, 'down'))}
                title="Move to back layer"
              >
                <ChevronDown className="w-4 h-4" />
              </Button>
              <Button 
                size="sm" 
                variant="outline" 
                className="w-10 h-10 p-0" 
                onClick={() => selectedStickers.forEach(id => onLayerChange(id, 'up'))}
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
                onClick={() => applyToSelected(sticker => ({ mirrored: !sticker.mirrored }))}
                title="Flip horizontal"
              >
                <FlipHorizontal className="w-4 h-4" />
              </Button>
              <Button 
                size="sm" 
                variant="destructive" 
                className="w-10 h-10 p-0" 
                onClick={() => selectedStickers.forEach(onStickerRemove)}
                title="Delete selected"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};