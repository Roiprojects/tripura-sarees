import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { useAuth } from "@/providers/AuthProvider";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { useStaff } from "@/hooks/useStaff";
import { Eye, EyeOff, Loader2, ShieldCheck, Sparkles, Star, Heart } from "lucide-react";
import { site } from "@/config/site";
import { media } from "@/config/media";

const AdminLogin = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, loading: roleLoading } = useIsAdmin();
  const { isStaff, active: staffActive, loading: staffLoading } = useStaff();
  const [email, setEmail] = useState(() => localStorage.getItem("admin_remember_email") ?? "");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [remember, setRemember] = useState(true);
  const [busy, setBusy] = useState(false);
  const [intro, setIntro] = useState(true);
  const [doorsOpen, setDoorsOpen] = useState(false);

  // Magical intro sequence: shop doors open → logo zooms in → login card flies out
  useEffect(() => {
    const t1 = setTimeout(() => setDoorsOpen(true), 450);
    const t2 = setTimeout(() => setIntro(false), 2200);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);
  const [justLoggedIn, setJustLoggedIn] = useState(false);

  // Sign out any lingering session on mount so the admin must explicitly log in
  useEffect(() => {
    supabase.auth.signOut();
  }, []);

  // Only redirect after the admin actively submits the login form
  useEffect(() => {
    if (justLoggedIn && !authLoading && !roleLoading && !staffLoading && user && (isAdmin || (isStaff && staffActive))) {
      navigate("/admin/dashboard", { replace: true });
    }
  }, [justLoggedIn, user, isAdmin, isStaff, staffActive, authLoading, roleLoading, staffLoading, navigate]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setBusy(false);
      toast.error(error.message || "Login failed");
      return;
    }
    if (remember) localStorage.setItem("admin_remember_email", email);
    else localStorage.removeItem("admin_remember_email");
    toast.success("Welcome back!");
    sessionStorage.setItem("admin_intro", "1");
    setJustLoggedIn(true);
  };

  const onForgot = async () => {
    if (!email) return toast.error("Enter your email first");
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/admin/login`,
    });
    if (error) toast.error(error.message);
    else toast.success("Password reset email sent");
  };

  return (
    <div className="relative min-h-screen overflow-hidden flex items-center justify-center p-4 bg-[radial-gradient(ellipse_at_top_left,hsl(46_68%_52%),hsl(166_60%_26%)_50%,hsl(166_55%_12%))]">
      {/* Local magical keyframes */}
      <style>{`
        @keyframes door-open-left  { from { transform: translateX(0) }      to { transform: translateX(-110%) } }
        @keyframes door-open-right { from { transform: translateX(0) }      to { transform: translateX(110%) } }
        @keyframes logo-pop        { 0%{transform:scale(.2) rotate(-12deg);opacity:0;filter:blur(6px)} 60%{transform:scale(1.15) rotate(4deg);opacity:1;filter:blur(0)} 100%{transform:scale(1) rotate(0)} }
        @keyframes card-fly-in     { 0%{transform:translateY(60px) scale(.85);opacity:0;filter:blur(8px)} 100%{transform:translateY(0) scale(1);opacity:1;filter:blur(0)} }
        @keyframes float-y         { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-8px)} }
        @keyframes twinkle         { 0%,100%{opacity:.3;transform:scale(.8)} 50%{opacity:1;transform:scale(1.2)} }
        @keyframes shimmer-sweep   { 0%{transform:translateX(-120%)} 100%{transform:translateX(120%)} }
      `}</style>

      {/* Animated floating shapes */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full bg-pink-400/30 blur-3xl animate-pulse" />
        <div className="absolute top-1/3 -right-32 w-[28rem] h-[28rem] rounded-full bg-fuchsia-500/30 blur-3xl animate-pulse" style={{ animationDelay: "1s" }} />
        <div className="absolute -bottom-32 left-1/4 w-[24rem] h-[24rem] rounded-full bg-indigo-400/30 blur-3xl animate-pulse" style={{ animationDelay: "2s" }} />
      </div>

      {/* Twinkling sparkles */}
      <div className="pointer-events-none absolute inset-0">
        {[...Array(14)].map((_, i) => (
          <Star
            key={i}
            className="absolute text-white/70 fill-white/40"
            style={{
              top: `${(i * 53) % 100}%`,
              left: `${(i * 37) % 100}%`,
              width: `${10 + (i % 4) * 4}px`,
              height: `${10 + (i % 4) * 4}px`,
              animation: `twinkle ${2 + (i % 5) * 0.4}s ease-in-out ${i * 0.15}s infinite`,
            }}
          />
        ))}
      </div>

      {/* MAGICAL DOORS — shop opening */}
      {intro && (
        <div className="fixed inset-0 z-50 pointer-events-none">
          {/* Left door */}
          <div
            className="absolute inset-y-0 left-0 w-1/2 bg-[linear-gradient(135deg,hsl(46_68%_45%),hsl(166_72%_18%))] shadow-[inset_-20px_0_60px_rgba(0,0,0,0.4)] border-r-2 border-white/30"
            style={{
              animation: doorsOpen ? "door-open-left 1.4s cubic-bezier(0.7,0,0.3,1) forwards" : undefined,
            }}
          >
            <div className="absolute right-4 top-1/2 -translate-y-1/2 w-2 h-16 rounded-full bg-white/40" />
            <div className="absolute inset-0 flex items-center justify-end pr-8">
              <Heart className="w-20 h-20 text-white/30 fill-white/20" />
            </div>
          </div>
          {/* Right door */}
          <div
            className="absolute inset-y-0 right-0 w-1/2 bg-[linear-gradient(225deg,hsl(46_68%_45%),hsl(166_72%_18%))] shadow-[inset_20px_0_60px_rgba(0,0,0,0.4)] border-l-2 border-white/30"
            style={{
              animation: doorsOpen ? "door-open-right 1.4s cubic-bezier(0.7,0,0.3,1) forwards" : undefined,
            }}
          >
            <div className="absolute left-4 top-1/2 -translate-y-1/2 w-2 h-16 rounded-full bg-white/40" />
            <div className="absolute inset-0 flex items-center justify-start pl-8">
              <Sparkles className="w-20 h-20 text-white/30" />
            </div>
          </div>
        </div>
      )}

      {/* MAIN CONTENT */}
      <div className="relative w-full max-w-md z-10">
        {/* Floating logo with halo */}
        <div
          className="flex flex-col items-center mb-5"
          style={{ animation: "logo-pop 1s cubic-bezier(0.34,1.56,0.64,1) 0.6s backwards" }}
        >
          <div className="relative" style={{ animation: "float-y 4s ease-in-out infinite" }}>
            <div className="absolute inset-0 -m-6 bg-gradient-to-br from-pink-300/50 via-fuchsia-400/40 to-indigo-300/50 blur-2xl rounded-full animate-pulse" />
            <div className="relative bg-white/95 rounded-3xl p-3 shadow-[0_20px_60px_-15px_rgba(201,162,39,0.6)] border border-white/40">
              <img
                src={media.logo}
                alt={site.brand.name}
                className="h-16 md:h-20 w-auto object-contain"
              />
            </div>
            <Sparkles className="absolute -top-2 -right-2 w-6 h-6 text-yellow-300 fill-yellow-200" style={{ animation: "twinkle 1.6s ease-in-out infinite" }} />
            <Star className="absolute -bottom-1 -left-3 w-5 h-5 text-pink-200 fill-pink-300" style={{ animation: "twinkle 2s ease-in-out 0.4s infinite" }} />
          </div>
        </div>

        {/* Glassmorphism card */}
        <div
          className="relative backdrop-blur-2xl bg-white/10 border border-white/20 rounded-3xl shadow-2xl p-8 text-white overflow-hidden"
          style={{ animation: "card-fly-in 0.9s cubic-bezier(0.34,1.56,0.64,1) 1.1s backwards" }}
        >
          {/* Shimmer sweep */}
          <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-3xl">
            <div
              className="absolute top-0 -left-1/3 h-full w-1/3 bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-12"
              style={{ animation: "shimmer-sweep 3.5s ease-in-out 2s infinite" }}
            />
          </div>

          <div className="relative flex flex-col items-center text-center mb-6">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-white/30 to-white/10 border border-white/30 flex items-center justify-center mb-4 shadow-lg backdrop-blur-sm">
              <ShieldCheck className="w-8 h-8" />
            </div>
            <h1 className="text-3xl font-display font-bold tracking-tight bg-gradient-to-r from-white via-pink-100 to-white bg-clip-text text-transparent">
              Admin Portal
            </h1>
            <p className="text-sm text-white/70 mt-1 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5" /> Secure access for {site.brand.name} managers
            </p>
          </div>

          <form onSubmit={onSubmit} className="relative space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-white/90">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="bg-white/10 border-white/20 text-white placeholder:text-white/50 focus-visible:ring-white/40"
                placeholder="admin@yourstore.com"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-white/90">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPwd ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  className="bg-white/10 border-white/20 text-white placeholder:text-white/50 focus-visible:ring-white/40 pr-10"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPwd((s) => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/70 hover:text-white"
                  aria-label={showPwd ? "Hide password" : "Show password"}
                >
                  {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between text-sm">
              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox
                  checked={remember}
                  onCheckedChange={(v) => setRemember(!!v)}
                  className="border-white/40 data-[state=checked]:bg-white data-[state=checked]:text-primary"
                />
                <span className="text-white/80">Remember me</span>
              </label>
              <button type="button" onClick={onForgot} className="text-white/80 hover:text-white underline-offset-2 hover:underline">
                Forgot password?
              </button>
            </div>

            <Button
              type="submit"
              disabled={busy}
              className="w-full h-11 rounded-xl bg-white text-primary hover:bg-white/90 font-semibold shadow-lg transition-all hover:scale-[1.02]"
            >
              {busy ? (
                <span className="inline-flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Signing in...</span>
              ) : (
                <span className="inline-flex items-center gap-2"><Sparkles className="w-4 h-4" /> Enter the {site.brand.name} Studio</span>
              )}
            </Button>

            {user && !roleLoading && !staffLoading && !isAdmin && !(isStaff && staffActive) && (
              <p className="text-sm text-red-200 bg-red-500/20 border border-red-300/30 rounded-lg p-2 text-center">
                {isStaff && !staffActive
                  ? "Your staff account is disabled. Please contact your admin."
                  : "This account does not have admin or staff access."}
              </p>
            )}
          </form>

          <div className="relative mt-6 text-center text-xs text-white/60">
            <Link to="/" className="hover:text-white">← Back to store</Link>
          </div>
        </div>

      </div>
    </div>
  );
};

export default AdminLogin;
