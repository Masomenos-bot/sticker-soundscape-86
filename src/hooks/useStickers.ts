import { useState } from "react";
import { toast } from "sonner";
import { Sticker, StickerData } from "@/components/StickerMusicApp";

export const useStickers = () => {
  const [placedStickers, setPlacedStickers] = useState<Sticker[]>([]);
  const [selectedStickers, setSelectedStickers] = useState<string[]>([]);
  const [isMultiSelectMode, setIsMultiSelectMode] = useState(false);

  const handleStickerDrop = async (stickerData: StickerData, x: number, y: number) => {
    const maxZIndex = Math.max(0, ...placedStickers.map(s => s.zIndex));
    const nextStepIndex = placedStickers.length;
    
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
    toast(`Added step ${nextStepIndex + 1} to sequence!`, { duration: 1500 });
  };

  const handleStickerUpdate = (id: string, updates: Partial<Sticker>) => {
    setPlacedStickers(prev =>
      prev.map(sticker =>
        sticker.id === id ? { ...sticker, ...updates } : sticker
      )
    );
  };

  const handleStickerRemove = (id: string) => {
    setPlacedStickers(prev => {
      const filtered = prev.filter(sticker => sticker.id !== id);
      return filtered.map((sticker, index) => ({
        ...sticker,
        stepIndex: index
      }));
    });
  };

  const handleLayerChange = (id: string, direction: 'up' | 'down') => {
    setPlacedStickers(prev => {
      const currentSticker = prev.find(s => s.id === id);
      if (!currentSticker) return prev;

      const otherStickers = prev.filter(s => s.id !== id);
      
      if (direction === 'up') {
        const nextSticker = otherStickers
          .filter(s => s.zIndex > currentSticker.zIndex)
          .sort((a, b) => a.zIndex - b.zIndex)[0];
        
        if (nextSticker) {
          return prev.map(s => {
            if (s.id === id) return { ...s, zIndex: nextSticker.zIndex };
            if (s.id === nextSticker.id) return { ...s, zIndex: currentSticker.zIndex };
            return s;
          });
        } else {
          const maxZ = Math.max(...prev.map(s => s.zIndex));
          return prev.map(s => s.id === id ? { ...s, zIndex: maxZ + 1 } : s);
        }
      } else {
        const prevSticker = otherStickers
          .filter(s => s.zIndex < currentSticker.zIndex)
          .sort((a, b) => b.zIndex - a.zIndex)[0];
        
        if (prevSticker) {
          return prev.map(s => {
            if (s.id === id) return { ...s, zIndex: prevSticker.zIndex };
            if (s.id === prevSticker.id) return { ...s, zIndex: currentSticker.zIndex };
            return s;
          });
        } else {
          const minZ = Math.min(...prev.map(s => s.zIndex));
          const newZ = Math.max(0, minZ - 1);
          return prev.map(s => s.id === id ? { ...s, zIndex: newZ } : s);
        }
      }
    });
  };

  const selectAllStickers = () => {
    if (placedStickers.length === 0) return;
    
    if (selectedStickers.length === placedStickers.length) {
      setSelectedStickers([]);
      setIsMultiSelectMode(false);
      toast("All stickers deselected", { duration: 1000 });
    } else {
      setSelectedStickers(placedStickers.map(s => s.id));
      setIsMultiSelectMode(true);
      toast(`${placedStickers.length} stickers selected`, { duration: 1000 });
    }
  };

  const handleStickerSelect = (id: string, isSelected: boolean) => {
    if (isSelected) {
      setSelectedStickers([id]);
      setIsMultiSelectMode(false);
    } else {
      setSelectedStickers(prev => prev.filter(sId => sId !== id));
      if (selectedStickers.length <= 1) {
        setIsMultiSelectMode(false);
      }
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

  const clearCanvas = () => {
    setPlacedStickers([]);
    setSelectedStickers([]);
    setIsMultiSelectMode(false);
    toast("Canvas cleared!", { duration: 1500 });
  };

  return {
    placedStickers,
    selectedStickers,
    isMultiSelectMode,
    handleStickerDrop,
    handleStickerUpdate,
    handleStickerRemove,
    handleLayerChange,
    selectAllStickers,
    handleStickerSelect,
    handleGroupMove,
    clearCanvas,
    setSelectedStickers,
    setIsMultiSelectMode
  };
};