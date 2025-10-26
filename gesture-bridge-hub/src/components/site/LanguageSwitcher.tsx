import { useEffect, useState } from "react";
import { Globe } from "lucide-react";

export const LanguageSwitcher = () => {
  const [lang, setLang] = useState('en');

  useEffect(() => {
    const stored = localStorage.getItem('lang');
    if (stored) setLang(stored);
  }, []);

  const onChange = (v: string) => {
    setLang(v);
    localStorage.setItem('lang', v);
  };

  return (
    <label className="inline-flex items-center gap-2 text-sm">
      <Globe className="h-4 w-4" />
      <select
        className="bg-background border border-input rounded-md px-2 py-1"
        aria-label="Language selector"
        value={lang}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="en">English</option>
        <option value="isl">ISL-friendly</option>
      </select>
    </label>
  );
};
