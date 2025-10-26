import { Navbar } from "@/components/site/Navbar";
import { Footer } from "@/components/site/Footer";

export const PageShell = ({ children }: { children: React.ReactNode }) => (
  <div className="min-h-screen flex flex-col">
    <Navbar />
    <main className="flex-1">{children}</main>
    <Footer />
  </div>
);
