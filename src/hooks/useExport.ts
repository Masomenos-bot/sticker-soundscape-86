import { useState } from "react";
import { createVideoExport } from "./exporters/videoExporter";
import { createImageExport } from "./exporters/imageExporter";
import { createGifExport } from "./exporters/gifExporter";

interface VideoGalleryItem {
  id: string;
  url: string;
  timestamp: number;
  name: string;
}

export const useExport = (canvasRef: React.RefObject<HTMLDivElement>, isPlaying: boolean) => {
  const [exportedVideos, setExportedVideos] = useState<VideoGalleryItem[]>([]);
  const [isRecording, setIsRecording] = useState(false);

  const addToGallery = (item: VideoGalleryItem) => {
    setExportedVideos(prev => [...prev, item]);
  };

  const handleExport = async () => {
    if (!canvasRef.current) return;
    
    if (isPlaying) {
      await createGifExport(canvasRef.current, addToGallery);
    } else {
      await createImageExport(canvasRef.current, addToGallery);
    }
  };

  const handleVideoRecord = async () => {
    if (!canvasRef.current || isRecording) return;
    
    await createVideoExport(
      canvasRef.current,
      addToGallery,
      setIsRecording
    );
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