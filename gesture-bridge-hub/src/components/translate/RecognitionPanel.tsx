import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Copy, Trash2 } from "lucide-react";
import { toast } from "@/components/ui/use-toast";

interface RecognitionPanelProps {
  currentSign?: string;
  confidence?: number;
}

export const RecognitionPanel = ({ currentSign = '', confidence = 0 }: RecognitionPanelProps) => {
  const [text, setText] = useState("");
  const [lastSign, setLastSign] = useState("");
  const [holdTime, setHoldTime] = useState(0);
  const HOLD_THRESHOLD = 1.5; // seconds
  const CONF_THRESHOLD = 0.75;
  const appendedLockRef = useRef<string | null>(null); // prevent repeated appends without a break

  // Handle sign accumulation with stability and lock to avoid jitter
  const handleSignDetection = (sign: string, conf: number) => {
    const isValid = sign !== 'nothing' && conf >= CONF_THRESHOLD;

    // Unlock when hand removed or sign changes to nothing
    if (!isValid) {
      setHoldTime(0);
      setLastSign('');
      appendedLockRef.current = null;
      return;
    }

    // If same sign is held
    if (sign === lastSign) {
      setHoldTime(prev => {
        const next = prev + 0.5; // called every ~500ms
        if (next >= HOLD_THRESHOLD) {
          // Only append once per continuous hold of the same sign
          if (appendedLockRef.current !== sign) {
            if (sign === 'space') {
              setText(prevText => prevText + ' ');
              toast({ title: "Added Space" });
            } else if (sign === 'del') {
              setText(prevText => prevText.slice(0, -1));
              toast({ title: "Deleted Character" });
            } else {
              setText(prevText => prevText + sign);
              toast({ title: `Added: ${sign}` });
            }
            appendedLockRef.current = sign;
          }
          return HOLD_THRESHOLD; // clamp
        }
        return next;
      });
    } else {
      // New sign encountered; start counting stability
      setLastSign(sign);
      setHoldTime(0);
      // Do not clear lock here; will clear when 'nothing' seen to require a brief break
    }
  };

  // Wire incoming predictions to accumulation logic
  useEffect(() => {
    // Inference cadence is ~500ms from WebcamPanel; follow same ticking assumption
    handleSignDetection(currentSign, confidence);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentSign, confidence]);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copied to clipboard!" });
  };

  const clearText = () => {
    setText("");
    setLastSign("");
    setHoldTime(0);
    toast({ title: "Text cleared" });
  };

  return (
    <div className="rounded-lg border bg-card p-4 space-y-4">
      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-medium text-sm text-muted-foreground">Recognized Text</h3>
          <div className="flex gap-2">
            <Button 
              size="sm" 
              variant="ghost" 
              onClick={copyToClipboard}
              disabled={!text}
            >
              <Copy className="h-4 w-4" />
            </Button>
            <Button 
              size="sm" 
              variant="ghost" 
              onClick={clearText}
              disabled={!text}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <div className="mt-2 rounded-md border p-3 min-h-16 bg-muted/30">
          <p className="text-base leading-relaxed font-mono">{text || 'Start recognition to see text...'}</p>
        </div>
      </div>
      
      <div>
        <h3 className="font-medium text-sm text-muted-foreground mb-2">Current Detection</h3>
        <div className="mt-2 rounded-md border p-3 min-h-12 bg-muted/30">
          {currentSign && currentSign !== 'nothing' ? (
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold">{currentSign}</span>
              <span className="text-sm text-muted-foreground">
                {(confidence * 100).toFixed(1)}% confidence
              </span>
            </div>
          ) : (
            <p className="text-muted-foreground">No sign detected</p>
          )}
        </div>
      </div>

      <div className="rounded-md bg-muted/50 p-3 text-xs text-muted-foreground">
        <p><strong>Tip:</strong> Hold each sign steadily for 1.5 seconds to append it once. Move your hand out of frame or relax to add the next letter.</p>
        <p className="mt-1">Use <strong>'space'</strong> and <strong>'del'</strong> signs for spacing and deletion</p>
      </div>
    </div>
  );
};
