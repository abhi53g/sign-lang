import { useEffect, useState } from "react";
import { Contrast } from "lucide-react";
import { Button } from "@/components/ui/button";

export const HighContrastToggle = () => {
  const [hc, setHc] = useState<boolean>(() =>
    typeof window !== 'undefined' ? document.documentElement.classList.contains('hc') : false
  );

  useEffect(() => {
    const root = document.documentElement;
    if (hc) {
      root.classList.add('hc');
      localStorage.setItem('hc', 'on');
    } else {
      root.classList.remove('hc');
      localStorage.setItem('hc', 'off');
    }
  }, [hc]);

  useEffect(() => {
    const stored = localStorage.getItem('hc');
    if (stored) setHc(stored === 'on');
  }, []);

  return (
    <Button variant="ghost" size="icon" aria-label="Toggle high contrast" onClick={() => setHc(v => !v)}>
      <Contrast />
    </Button>
  );
};
