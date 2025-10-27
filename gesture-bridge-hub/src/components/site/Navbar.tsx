import { NavLink, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "./ThemeToggle";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { useEffect, useState } from "react";

function parseJwt(token: string | null) {
  if (!token) return null;
  try {
    const payload = token.split('.')[1];
    return JSON.parse(atob(payload));
  } catch (e) {
    return null;
  }
}

export const Navbar = () => {
  const linkCls = ({ isActive }: { isActive: boolean }) =>
    `px-3 py-2 rounded-md text-sm ${isActive ? 'bg-secondary text-foreground' : 'hover:bg-secondary'}`;

  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<{ username?: string; role?: string } | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const t = localStorage.getItem('accessToken');
    setToken(t);
    const p = parseJwt(t);
    if (p) setUser({ username: p.username || p.email || '', role: p.role });
  }, []);

  function handleLogout() {
    localStorage.removeItem('accessToken');
    // optionally clear other user storage
    setToken(null);
    setUser(null);
    navigate('/');
  }

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
        </div>

        <div className="flex items-center gap-2">
          <LanguageSwitcher />
          <ThemeToggle />
          {token && user ? (
            <>
              <NavLink to="/profile"><Button variant="ghost" size="sm">{user.username || 'Profile'}</Button></NavLink>
              {user.role === 'admin' && <NavLink to="/admin/dashboard"><Button variant="outline" size="sm">Admin</Button></NavLink>}
              <Button variant="ghost" size="sm" onClick={handleLogout}>Logout</Button>
            </>
          ) : (
            <>
              <NavLink to="/login"><Button variant="ghost" size="sm">Log in</Button></NavLink>
              <NavLink to="/signup"><Button variant="hero" size="sm">Sign up</Button></NavLink>
            </>
          )}
        </div>
      </nav>
    </header>
  );
};
