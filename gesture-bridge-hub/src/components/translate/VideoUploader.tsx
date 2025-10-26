import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";

interface VideoUploaderProps {
  onLoaded?: (video: HTMLVideoElement) => void;
}

export const VideoUploader = ({ onLoaded }: VideoUploaderProps) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);

  const onFile = (file: File) => {
    const url = URL.createObjectURL(file);
    const video = videoRef.current!;
    video.src = url;
    setFileName(file.name);
    video.onloadeddata = () => onLoaded?.(video);
  };

  return (
    <div className="rounded-lg border bg-card overflow-hidden">
      <div className="aspect-video bg-muted">
        <video ref={videoRef} controls className="w-full h-full" />
      </div>
      <div className="p-3 flex items-center justify-between gap-3">
        <label className="text-sm text-muted-foreground truncate">{fileName || 'No file selected'}</label>
        <label className="cursor-pointer">
          <input type="file" accept="video/*" className="hidden" onChange={(e) => e.target.files && onFile(e.target.files[0])} />
          <Button variant="soft">Upload Video</Button>
        </label>
      </div>
    </div>
  );
};
