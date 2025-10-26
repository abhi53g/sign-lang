import { Github, Mail, Twitter } from "lucide-react";

export const Footer = () => {
  return (
    <footer className="border-t mt-16">
      <div className="container mx-auto py-10 grid gap-6 md:grid-cols-3">
        <div>
          <div className="font-display text-xl">SignAI</div>
          <p className="text-sm text-muted-foreground mt-2">Bridging communication through AI-powered ISL translation.</p>
        </div>
        <nav className="grid grid-cols-2 gap-2">
          <a href="/translate" className="story-link relative">Start Translation</a>
          <a href="/sign-school" className="story-link relative">Sign School</a>
          <a href="/poses" className="story-link relative">Pose Search</a>
          <a href="/admin" className="story-link relative">Admin</a>
          <a href="#features" className="story-link relative">Features</a>
        </nav>
        <div className="flex items-center gap-3">
          <a aria-label="Twitter" href="#" className="hover-scale"><Twitter /></a>
          <a aria-label="GitHub" href="#" className="hover-scale"><Github /></a>
          <a aria-label="Email" href="#" className="hover-scale"><Mail /></a>
        </div>
      </div>
      <div className="border-t py-6 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} SignAI. All rights reserved.
      </div>
    </footer>
  );
};
