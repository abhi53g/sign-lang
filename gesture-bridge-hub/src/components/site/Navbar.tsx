import { NavLink } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "./ThemeToggle";
import { HighContrastToggle } from "./HighContrastToggle";
import { LanguageSwitcher } from "./LanguageSwitcher";

export const Navbar = () => {
  const linkCls = ({ isActive }: { isActive: boolean }) =>
    `px-3 py-2 rounded-md text-sm ${isActive ? 'bg-secondary text-foreground' : 'hover:bg-secondary'}`;

  return (
    <header className="sticky top-0 z-40 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
      <nav className="container mx-auto flex h-16 items-center justify-between">
        <NavLink to="/" className="flex items-center gap-2 font-display text-lg">
          <span className="inline-block h-6 w-6 rounded bg-gradient-to-r from-[hsl(var(--gradient-primary-start))] to-[hsl(var(--gradient-primary-end))]" aria-hidden />
          <span>SignAI</span>
        </NavLink>

        <div className="hidden md:flex items-center gap-1">
          <NavLink to="/translate" className={linkCls} end>Translate</NavLink>
          <NavLink to="/sign-school" className={linkCls} end>Sign School</NavLink>
          <NavLink to="/poses" className={linkCls} end>Poses</NavLink>
          <NavLink to="/admin" className={linkCls} end>Dashboard</NavLink>
        </div>

        <div className="flex items-center gap-2">
          <LanguageSwitcher />
          <HighContrastToggle />
          <ThemeToggle />
          <NavLink to="/login"><Button variant="ghost" size="sm">Log in</Button></NavLink>
          <NavLink to="/signup"><Button variant="hero" size="sm">Sign up</Button></NavLink>
        </div>
      </nav>
    </header>
  );
};
