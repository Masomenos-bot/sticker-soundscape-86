import React from "react";
import { Button } from "./ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Progress } from "./ui/progress";
import { Video, Settings } from "lucide-react";

interface RecordingOptions {
  duration: number;
  quality: 'HD' | '4K';
  fps: number;
}

interface RecordingControlsProps {
  isRecording: boolean;
  recordingProgress: number;
  recordingOptions: RecordingOptions;
  onOptionsChange: (options: RecordingOptions) => void;
  onStartRecording: (options?: Partial<RecordingOptions>) => void;
}

export const RecordingControls: React.FC<RecordingControlsProps> = ({
  isRecording,
  recordingProgress,
  recordingOptions,
  onOptionsChange,
  onStartRecording,
}) => {
  const durations = [
    { value: 5, label: "5 seconds" },
    { value: 10, label: "10 seconds" },
    { value: 15, label: "15 seconds" },
    { value: 30, label: "30 seconds" },
  ];

  const qualities = [
    { value: 'HD', label: "HD (1080p)" },
    { value: '4K', label: "4K (2160p)" },
  ];

  return (
    <div className="flex flex-col gap-3 p-3 bg-card rounded-lg border border-border shadow-sm">
      <div className="flex items-center gap-2">
        <Video className="w-4 h-4 text-primary" />
        <span className="text-sm font-medium">HD Video Recording</span>
      </div>

      {!isRecording && (
        <div className="flex gap-2">
          <Select
            value={recordingOptions.duration.toString()}
            onValueChange={(value) =>
              onOptionsChange({ ...recordingOptions, duration: parseInt(value) })
            }
          >
            <SelectTrigger className="flex-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {durations.map((duration) => (
                <SelectItem key={duration.value} value={duration.value.toString()}>
                  {duration.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={recordingOptions.quality}
            onValueChange={(value: 'HD' | '4K') =>
              onOptionsChange({ ...recordingOptions, quality: value })
            }
          >
            <SelectTrigger className="flex-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {qualities.map((quality) => (
                <SelectItem key={quality.value} value={quality.value}>
                  {quality.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {isRecording && (
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Recording...</span>
            <span>{Math.round(recordingProgress)}%</span>
          </div>
          <Progress value={recordingProgress} className="h-2" />
        </div>
      )}

      <Button
        onClick={() => onStartRecording()}
        disabled={isRecording}
        className={`w-full ${isRecording ? 'bg-destructive/20 text-destructive' : ''}`}
        variant={isRecording ? "outline" : "default"}
      >
        {isRecording ? (
          <>
            <Video className="w-4 h-4 mr-2 animate-pulse" />
            Recording {recordingOptions.quality} Video...
          </>
        ) : (
          <>
            <Video className="w-4 h-4 mr-2" />
            Start {recordingOptions.quality} Recording
          </>
        )}
      </Button>

      <p className="text-xs text-muted-foreground text-center">
        Creates {recordingOptions.quality} video at 30fps with synchronized audio
      </p>
    </div>
  );
};