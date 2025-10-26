import heroImg from "@/assets/hero-asl-wave.jpg";
import { Button } from "@/components/ui/button";
import { SEO } from "@/components/SEO";
import { Camera, Upload, Brain, Search } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "react-router-dom";

const Home = () => {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SEO title="SignAI — ISL Translation & Pose Retrieval" description="AI-powered ISL translation with real-time webcam capture, 3D pose viewer, and semantic search." />
      

      <main className="flex-1">
        {/* Hero */}
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-[hsl(var(--gradient-subtle-start))] to-[hsl(var(--gradient-subtle-end))]" aria-hidden />
          <div className="pointer-events-none absolute -top-20 -left-20 h-72 w-72 rounded-full bg-[hsl(var(--primary)/0.15)] blur-3xl" aria-hidden />
          <div className="pointer-events-none absolute -bottom-24 -right-24 h-80 w-80 rounded-full bg-[hsl(var(--accent)/0.2)] blur-3xl" aria-hidden />
          <div className="container mx-auto relative grid md:grid-cols-2 gap-10 items-center py-16 md:py-24">
            <div className="space-y-6">
              <h1 className="font-display text-4xl md:text-5xl leading-tight">
                Bridging Communication Through AI‑Powered Sign Language Translation
              </h1>
              <p className="text-lg text-muted-foreground">
                Real-time ISL to text, semantic pose search, and research-grade analytics — in one intuitive interface.
              </p>
                <div className="flex gap-3">
                  <Link to="/translate"><Button variant="hero" size="lg">Start Translation</Button></Link>
                  <Link to="/sign-school"><Button variant="outline" size="lg">Explore Sign School</Button></Link>
                </div>
            </div>
            <div className="relative">
              <img src={heroImg} alt="People using ISL with AI gradient waves" className="rounded-xl border shadow-[var(--shadow-elegant)]" loading="lazy" />
            </div>
          </div>
        </section>

        {/* Features */}
        <section id="features" className="container mx-auto py-16 md:py-24">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {[
              { icon: Camera, title: 'Live Webcam', desc: 'Capture ISL in real-time with pose overlays.' },
              { icon: Upload, title: 'Video Uploads', desc: 'Analyze pre-recorded clips securely.' },
              { icon: Brain, title: 'Semantic Meaning', desc: 'Understand context beyond words.' },
              { icon: Search, title: 'Pose Retrieval', desc: 'Find signs by meaning or visual similarity.' },
            ].map((f) => (
              <Card key={f.title} className="hover-scale">
                <CardHeader>
                  <div className="h-10 w-10 rounded-md grid place-items-center bg-secondary"><f.icon /></div>
                  <CardTitle className="mt-2">{f.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{f.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Testimonials */}
        <section className="container mx-auto py-16 md:py-24">
          <h2 className="font-display text-3xl mb-8">What users say</h2>
          <div className="grid gap-6 md:grid-cols-3">
            {[
              { q: 'The best ISL tool I\'ve tried — fast and accurate.', a: 'Researcher, Gallaudet University' },
              { q: 'So easy my students used it on day one.', a: 'High School Teacher' },
              { q: 'Pose search saves me hours labeling datasets.', a: 'ML Engineer' },
            ].map((t, i) => (
              <Card key={i}>
                <CardContent className="pt-6">
                  <p className="text-base">“{t.q}”</p>
                  <p className="text-sm text-muted-foreground mt-3">— {t.a}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      </main>

      
    </div>
  );
};

export default Home;
