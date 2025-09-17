import React from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trash2, Download } from "lucide-react";
import { toast } from "sonner";

interface MediaGalleryItem {
  id: string;
  url: string;
  timestamp: number;
  name: string;
}

interface MediaGalleryProps {
  videos: MediaGalleryItem[];
  onDeleteVideo: (id: string) => void;
}

export const MediaGallery: React.FC<MediaGalleryProps> = ({ videos, onDeleteVideo }) => {
  const isImage = (item: MediaGalleryItem) => {
    return item.name.toLowerCase().includes('.png') || item.name.toLowerCase().includes('.jpg') || item.name.toLowerCase().includes('.jpeg');
  };

  const handleDownload = (item: MediaGalleryItem) => {
    const link = document.createElement('a');
    link.href = item.url;
    link.download = item.name;
    link.click();
    const fileType = isImage(item) ? "Image" : "Video";
    toast(`${fileType} downloaded!`, { duration: 1500 });
  };

  const handleDelete = (item: MediaGalleryItem) => {
    console.log('🗑️ MediaGallery: Delete clicked for', item.id);
    onDeleteVideo(item.id);
    const fileType = isImage(item) ? "Image" : "Video";
    toast(`${fileType} deleted`, { duration: 1500 });
  };

  if (videos.length === 0) {
    return (
      <Card className="p-6 bg-gradient-card shadow-card border-0">
        <div className="text-center text-muted-foreground">
          <div className="text-4xl mb-4">🎬</div>
          <p className="text-lg mb-2">Your Media Gallery</p>
          <p className="text-sm opacity-70">Exported videos and images will appear here</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6 bg-gradient-card shadow-card border-0">
      <div className="mb-4">
        <h3 className="text-lg font-semibold mb-2">Media Gallery</h3>
        <p className="text-sm text-muted-foreground">{videos.length} exported file{videos.length !== 1 ? 's' : ''}</p>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {videos.map((item) => (
          <div key={`media-${item.id}-${item.timestamp}`} className="group relative">
            <div className="aspect-video bg-black rounded-lg overflow-hidden">
              {isImage(item) ? (
                <img
                  src={item.url}
                  alt={item.name}
                  className="w-full h-full object-cover"
                  onError={() => {
                    console.error("Image loading error for:", item.name);
                  }}
                />
              ) : (
                <video
                  src={item.url}
                  className="w-full h-full object-cover"
                  controls
                  preload="metadata"
                  onError={() => {
                    console.error("Video playback error for:", item.name);
                  }}
                />
              )}
            </div>
            
            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex gap-1">
              <Button
                size="sm"
                variant="secondary"
                className="w-8 h-8 p-0"
                onClick={() => handleDownload(item)}
                title={`Download ${isImage(item) ? 'image' : 'video'}`}
              >
                <Download className="w-3 h-3" />
              </Button>
              <Button
                size="sm"
                variant="destructive"
                className="w-8 h-8 p-0"
                onClick={() => handleDelete(item)}
                title={`Delete ${isImage(item) ? 'image' : 'video'}`}
              >
                <Trash2 className="w-3 h-3" />
              </Button>
            </div>
            
            <div className="mt-2">
              <p className="text-sm font-medium truncate">{item.name}</p>
              <p className="text-xs text-muted-foreground">
                {new Date(item.timestamp).toLocaleDateString()} {new Date(item.timestamp).toLocaleTimeString()}
              </p>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
};