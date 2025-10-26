import { useState } from "react";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { WebcamPanel } from "@/components/translate/WebcamPanel";
import { VideoUploader } from "@/components/translate/VideoUploader";
import { RecognitionPanel } from "@/components/translate/RecognitionPanel";
import { HistoryPanel } from "@/components/translate/HistoryPanel";

const TranslatePage = () => {
  const [tab, setTab] = useState<'webcam' | 'upload'>('webcam');
  const [currentSign, setCurrentSign] = useState<string>('');
  const [confidence, setConfidence] = useState<number>(0);

  const handlePrediction = (prediction: string, conf: number) => {
    setCurrentSign(prediction);
    setConfidence(conf);
  };

  return (
    <div className="container mx-auto py-10">
      <SEO title="Translate — SignAI" description="Live ISL recognition with pose overlays and semantic meaning." />
      <div className="flex items-center justify-between mb-4">
        <h1 className="font-display text-2xl">Translation</h1>
        <div className="inline-flex rounded-md border p-1">
          <Button variant={tab==='webcam' ? 'hero' : 'ghost'} size="sm" onClick={() => setTab('webcam')}>Webcam</Button>
          <Button variant={tab==='upload' ? 'hero' : 'ghost'} size="sm" onClick={() => setTab('upload')}>Upload</Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div>{tab === 'webcam' ? <WebcamPanel onPrediction={handlePrediction} /> : <VideoUploader />}</div>
        <RecognitionPanel currentSign={currentSign} confidence={confidence} />
      </div>

      <div className="mt-6">
        <HistoryPanel />
      </div>
    </div>
  );
};

export default TranslatePage;
