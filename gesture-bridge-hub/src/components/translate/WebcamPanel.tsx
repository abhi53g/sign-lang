import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { predictSign, videoFrameToBase64 } from "@/lib/aslApi";
import { toast } from "@/components/ui/use-toast";

interface WebcamPanelProps {
  onFrame?: (ts: number) => void;
  onPrediction?: (prediction: string, confidence: number) => void;
}

export const WebcamPanel = ({ onFrame, onPrediction }: WebcamPanelProps) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [active, setActive] = useState(false);
  const [isRecognizing, setIsRecognizing] = useState(false);
  const [currentPrediction, setCurrentPrediction] = useState<string>('');
  const [confidence, setConfidence] = useState<number>(0);
  const lastPredictionTime = useRef<number>(0);

  // Smoothing buffer for temporal stability
  const bufferRef = useRef<{ label: string; conf: number }[]>([]);
  const MAX_BUFFER = 7; // ~3.5s at 500ms cadence
  const CONF_THRESHOLD = 0.75; // ignore low-confidence noise

  useEffect(() => {
    if (!active) return;
    let stream: MediaStream;
    const enable = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
      } catch (e) {
        console.error('Webcam error', e);
      }
    };
    enable();
    return () => {
      if (stream) stream.getTracks().forEach(t => t.stop());
    };
  }, [active]);

  useEffect(() => {
    let raf = 0;
    const draw = async (time: number) => {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      if (!canvas || !video) { 
        raf = requestAnimationFrame(draw); 
        return; 
      }
      const ctx = canvas.getContext('2d');
      if (!ctx) { 
        raf = requestAnimationFrame(draw); 
        return; 
      }
      
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Draw ROI rectangle (region of interest for sign detection)
      const roiSize = 224;
      const x = (canvas.width - roiSize) / 2;
      const y = (canvas.height - roiSize) / 2;
      
      ctx.strokeStyle = isRecognizing ? '#00ff00' : '#ffff00';
      ctx.lineWidth = 3;
      ctx.strokeRect(x, y, roiSize, roiSize);
      
      // Display current prediction
      if (currentPrediction && currentPrediction !== 'nothing') {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(10, 10, 200, 60);
        ctx.fillStyle = '#00ff00';
        ctx.font = 'bold 24px Arial';
        ctx.fillText(`Sign: ${currentPrediction}`, 20, 40);
        ctx.font = '16px Arial';
        ctx.fillText(`Confidence: ${(confidence * 100).toFixed(1)}%`, 20, 60);
      }
      
      // Perform prediction every 500ms when recognizing
      if (isRecognizing && time - lastPredictionTime.current > 500) {
        lastPredictionTime.current = time;
        try {
          const base64Image = videoFrameToBase64(video, x, y, roiSize, roiSize);
          const result = await predictSign(base64Image);
          
          if (result.success && result.prediction && typeof result.confidence === 'number') {
            // Push into buffer with confidence filtering
            const incomingLabel = result.confidence >= CONF_THRESHOLD ? result.prediction : 'nothing';
            const incomingConf = result.confidence >= CONF_THRESHOLD ? result.confidence : 0;

            bufferRef.current.push({ label: incomingLabel, conf: incomingConf });
            if (bufferRef.current.length > MAX_BUFFER) bufferRef.current.shift();

            // Compute majority label in buffer (excluding 'nothing' unless it's dominant)
            const counts = new Map<string, { n: number; avg: number }>();
            for (const { label, conf } of bufferRef.current) {
              const prev = counts.get(label) || { n: 0, avg: 0 };
              const n = prev.n + 1;
              const avg = (prev.avg * prev.n + conf) / n;
              counts.set(label, { n, avg });
            }

            // Identify stable label
            let stableLabel = 'nothing';
            let stableCount = 0;
            let stableAvg = 0;
            counts.forEach((val, key) => {
              if (val.n > stableCount) {
                stableCount = val.n;
                stableLabel = key;
                stableAvg = val.avg;
              }
            });

            // Require at least 3 occurrences in buffer to switch label
            const isStable = stableCount >= Math.min(3, MAX_BUFFER);
            const finalLabel = isStable ? stableLabel : 'nothing';
            const finalConf = isStable ? stableAvg : 0;

            setCurrentPrediction(finalLabel);
            setConfidence(finalConf);
            onPrediction?.(finalLabel, finalConf);
          }
        } catch (error) {
          console.error('Prediction error:', error);
        }
      }
      
      onFrame?.(time);
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [onFrame, isRecognizing, onPrediction]);

  return (
    <div className="relative rounded-lg overflow-hidden border bg-card">
      <div className="aspect-video w-full bg-muted" aria-label="Webcam preview">
        <video ref={videoRef} className="w-full h-full object-cover" playsInline muted />
        <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none" />
      </div>
      <div className="p-3 flex justify-between items-center gap-2">
        <div className="text-sm text-muted-foreground">
          {active && isRecognizing && 'Recognizing signs...'}
          {active && !isRecognizing && 'Camera active. Start recognition to begin.'}
          {!active && 'Camera off'}
        </div>
        <div className="flex gap-2">
          <Button 
            variant={active ? 'destructive' : 'hero'} 
            onClick={() => {
              setActive(v => !v);
              if (active) {
                setIsRecognizing(false);
                setCurrentPrediction('');
                setConfidence(0);
              }
            }}
          >
            {active ? 'Stop Camera' : 'Start Camera'}
          </Button>
          {active && (
            <Button 
              variant={isRecognizing ? 'outline' : 'default'}
              onClick={() => {
                setIsRecognizing(v => !v);
                if (!isRecognizing) {
                  toast({ 
                    title: "Recognition Started", 
                    description: "Position your hand in the yellow box" 
                  });
                  bufferRef.current = [];
                } else {
                  setCurrentPrediction('');
                  setConfidence(0);
                  bufferRef.current = [];
                }
              }}
            >
              {isRecognizing ? 'Stop Recognition' : 'Start Recognition'}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};
