import { useState } from "react";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Github, Mail, Eye, EyeOff } from "lucide-react";
import { toast } from "@/components/ui/use-toast";

const SignupPage = () => {
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSignup = async (e) => {
    e.preventDefault();
    setLoading(true);
    const name = e.target.name.value;
    const email = e.target.email.value;
    const password = e.target.password.value;

    try {
      const res = await fetch("http://localhost:4000/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: email, password, role: "user" }),
      });

      const data = await res.json();
      if (res.ok) {
        toast({ title: "Account created", description: `Welcome, ${name}!` });
        // maybe redirect to login page
      } else {
        toast({ title: "Signup failed", description: data.message });
      }
    } catch (err) {
      toast({ title: "Error", description: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-16">
      <SEO title="Create Account — SignAI" description="Join SignAI to translate ISL and explore semantic pose search." />
      <div className="max-w-md mx-auto rounded-xl border bg-card p-6 md:p-8">
        <h1 className="font-display text-2xl mb-6">Create your account</h1>
        <form className="space-y-4" onSubmit={handleSignup}>
          <div className="space-y-2">
            <Label htmlFor="name">Full name</Label>
            <Input id="name" name="name" placeholder="Alex Johnson" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" placeholder="you@example.com" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Input id="password" name="password" type={show ? 'text' : 'password'} placeholder="Create a strong password" required />
              <button type="button" aria-label="Toggle password visibility" className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground" onClick={() => setShow(v => !v)}>
                {show ? <EyeOff /> : <Eye />}
              </button>
            </div>
          </div>
          <Button className="w-full" variant="hero" type="submit" disabled={loading}>
            {loading ? "Creating..." : "Sign up"}
          </Button>
        </form>
      </div>
    </div>
  );
};

export default SignupPage;
