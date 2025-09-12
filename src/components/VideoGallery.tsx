import React from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trash2, Download } from "lucide-react";
import { toast } from "sonner";

interface VideoGalleryItem {
  id: string;
  url: string;
  timestamp: number;
  name: string;
}

interface VideoGalleryProps {
  videos: VideoGalleryItem[];
  onDeleteVideo: (id: string) => void;
}

export const VideoGallery: React.FC<VideoGalleryProps> = ({ videos, onDeleteVideo }) => {
  const handleDownload = (video: VideoGalleryItem) => {
    const link = document.createElement('a');
    link.href = video.url;
    link.download = video.name;
    link.click();
    toast("Video downloaded!", { duration: 1500 });
  };

  const handleDelete = (video: VideoGalleryItem) => {
    URL.revokeObjectURL(video.url);
    onDeleteVideo(video.id);
    toast("Video deleted", { duration: 1500 });
  };

  if (videos.length === 0) {
    return (
      <Card className="p-6 bg-gradient-card shadow-card border-0">
        <div className="text-center text-muted-foreground">
          <div className="text-4xl mb-4">🎬</div>
          <p className="text-lg mb-2">Your Video Gallery</p>
          <p className="text-sm opacity-70">Exported videos will appear here</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6 bg-gradient-card shadow-card border-0">
      <div className="mb-4">
        <h3 className="text-lg font-semibold mb-2">Video Gallery</h3>
        <p className="text-sm text-muted-foreground">{videos.length} exported video{videos.length !== 1 ? 's' : ''}</p>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {videos.map((video) => (
          <div key={video.id} className="group relative">
            <div className="aspect-video bg-black rounded-lg overflow-hidden">
              <video
                src={video.url}
                className="w-full h-full object-cover"
                controls
                preload="metadata"
                onError={() => {
                  console.error("Video playback error for:", video.name);
                }}
              />
            </div>
            
            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex gap-1">
              <Button
                size="sm"
                variant="secondary"
                className="w-8 h-8 p-0"
                onClick={() => handleDownload(video)}
                title="Download video"
              >
                <Download className="w-3 h-3" />
              </Button>
              <Button
                size="sm"
                variant="destructive"
                className="w-8 h-8 p-0"
                onClick={() => handleDelete(video)}
                title="Delete video"
              >
                <Trash2 className="w-3 h-3" />
              </Button>
            </div>
            
            <div className="mt-2">
              <p className="text-sm font-medium truncate">{video.name}</p>
              <p className="text-xs text-muted-foreground">
                {new Date(video.timestamp).toLocaleDateString()} {new Date(video.timestamp).toLocaleTimeString()}
              </p>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
};