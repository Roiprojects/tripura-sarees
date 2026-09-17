import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Phone, ShieldCheck, ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { site } from "@/config/site";
import { media } from "@/config/media";

type Step = "phone" | "otp";

const Auth = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [step, setStep] = useState<Step>("phone");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const cooldownTimer = useRef<number | null>(null);

  useEffect(() => {
    if (cooldown <= 0) return;
    cooldownTimer.current = window.setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => {
      if (cooldownTimer.current) window.clearTimeout(cooldownTimer.current);
    };
  }, [cooldown]);

  const requestOtp = async (clean: string) => {
    setSending(true);
    const { data, error } = await supabase.functions.invoke("send-phone-otp", {
      body: { phone: clean },
    });
    setSending(false);
    if (error) {
      toast.error("Couldn't send OTP", { description: error.message });
      return false;
    }
    if (data?.error) {
      toast.error(data.message || "Couldn't send OTP");
      return false;
    }
    setCooldown(30);
    toast.success(`OTP sent to +91 ${clean}`, {
      description: "Check your messages.",
    });
    return true;

  };

  const sendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = phone.replace(/\D/g, "");
    if (clean.length !== 10) {
      toast.error("Enter a valid 10-digit phone number");
      return;
    }
    setPhone(clean);
    const ok = await requestOtp(clean);
    if (ok) setStep("otp");
  };

  const resend = async () => {
    if (cooldown > 0) return;
    await requestOtp(phone);
  };

  const verifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length !== 6) {
      toast.error("Enter the 6-digit code");
      return;
    }
    setVerifying(true);
    const { data, error } = await supabase.functions.invoke("verify-phone-otp", {
      body: { phone, code: otp },
    });
    if (error || data?.error) {
      setVerifying(false);
      toast.error(data?.message || error?.message || "Verification failed");
      return;
    }
    const { token_hash } = data as { token_hash: string };
    const { error: vErr } = await supabase.auth.verifyOtp({
      token_hash,
      type: "magiclink",
    });
    setVerifying(false);
    if (vErr) {
      toast.error(vErr.message);
      return;
    }
    toast.success(`Welcome to ${site.brand.name} 💕`);
    // Return shoppers to where they were (e.g. the product they tried to add to cart).
    const from = (location.state as { from?: unknown } | null)?.from;
    const safeFrom = typeof from === "string" && from.startsWith("/") && !from.startsWith("//") && !from.startsWith("/auth") ? from : "/";
    navigate(safeFrom, { replace: true });
  };

  return (
    <div className="min-h-screen bg-gradient-hero flex items-center justify-center p-4">
      <Card className="relative w-full max-w-md rounded-3xl shadow-lift border-0 p-8">
        <button
          type="button"
          onClick={() => (step === "otp" ? (setStep("phone"), setOtp("")) : navigate(-1))}
          aria-label="Go back"
          className="absolute top-4 left-4 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-background/80 backdrop-blur border border-border/60 text-xs font-semibold text-foreground/80 hover:text-foreground hover:bg-background hover:shadow-sm active:scale-95 transition"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <Link to="/" className="flex items-center justify-center mb-6" aria-label={`${site.brand.name} home`}>
          <img src={media.logo} alt={site.brand.name} className="h-16 md:h-20 w-auto object-contain" />
        </Link>

        <div className="text-center mb-6">
          <h1 className="font-display text-2xl font-bold">
            {step === "phone" ? "Sign in with mobile" : "Verify your number"}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {step === "phone"
              ? "We'll text you a one-time password"
              : `Enter the 6-digit code sent to +91 ${phone}`}
          </p>
        </div>

        {step === "phone" ? (
          <form onSubmit={sendOtp} className="space-y-5">
            <div>
              <Label htmlFor="phone">Mobile number</Label>
              <div className="mt-1 flex items-center rounded-full border-2 border-border focus-within:border-primary overflow-hidden bg-background">
                <span className="pl-4 pr-2 text-sm font-semibold text-muted-foreground flex items-center gap-1">
                  <Phone className="w-4 h-4" /> +91
                </span>
                <Input
                  id="phone"
                  type="tel"
                  inputMode="numeric"
                  maxLength={10}
                  placeholder="10-digit mobile number"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
                  className="border-0 focus-visible:ring-0 rounded-none h-11"
                  autoFocus
                />
              </div>
            </div>

            <Button type="submit" variant="pill" size="lg" className="w-full" disabled={sending}>
              {sending ? (<><Loader2 className="w-4 h-4 animate-spin" /> Sending OTP…</>) : "Send OTP"}
            </Button>

            <p className="text-[11px] text-muted-foreground text-center">
              New here? An account will be created automatically.
            </p>
          </form>
        ) : (
          <form onSubmit={verifyOtp} className="space-y-5">
            <div>
              <Label htmlFor="otp">Enter OTP</Label>
              <div className="mt-1 flex items-center rounded-full border-2 border-border focus-within:border-primary overflow-hidden bg-background">
                <span className="pl-4 pr-2 text-sm font-semibold text-muted-foreground flex items-center gap-1">
                  <ShieldCheck className="w-4 h-4" />
                </span>
                <Input
                  id="otp"
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="• • • • • •"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                  className="border-0 focus-visible:ring-0 rounded-none h-11 tracking-[0.4em] font-semibold text-center"
                  autoFocus
                />
              </div>
            </div>

            <Button type="submit" variant="pill" size="lg" className="w-full" disabled={verifying || otp.length !== 6}>
              {verifying ? (<><Loader2 className="w-4 h-4 animate-spin" /> Verifying…</>) : "Verify & Sign in"}
            </Button>

            <div className="flex items-center justify-between text-sm">
              <button
                type="button"
                onClick={() => { setStep("phone"); setOtp(""); }}
                className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Change number
              </button>
              <button
                type="button"
                onClick={resend}
                disabled={cooldown > 0 || sending}
                className="text-primary font-semibold hover:underline disabled:opacity-50 disabled:no-underline"
              >
                {cooldown > 0 ? `Resend in ${cooldown}s` : sending ? "Sending…" : "Resend OTP"}
              </button>
            </div>
          </form>
        )}

        <p className="text-[11px] text-muted-foreground text-center mt-6">
          By continuing, you agree to our Terms & Privacy Policy.
        </p>
      </Card>
    </div>
  );
};

export default Auth;
