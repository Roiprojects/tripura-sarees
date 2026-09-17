import { useEffect, useRef, useState } from "react";
import { MessageCircle, Video } from "lucide-react";
import { site } from "@/config/site";
import { content } from "@/config/content";
import { media } from "@/config/media";

const PHONE = site.contact.whatsapp;
const WA_TEXT = encodeURIComponent(content.whatsapp.general);
const VIDEO_TEXT = encodeURIComponent(
  "Hi! I'd like to schedule a WhatsApp video consultation to view sarees."
);

export const FloatingContact = () => {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  const openVideoConsultation = () => {
    setOpen(false);
    window.dispatchEvent(new Event("store:open-video-consultation"));
  };

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onEsc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onEsc);
    };
  }, [open]);

  return (
    <>
      <style>{`
        @keyframes fc-border-spin { to { transform: rotate(360deg); } }
        @keyframes fc-ring {
          0% { transform: scale(1); opacity: .55; }
          100% { transform: scale(1.9); opacity: 0; }
        }
        @keyframes fc-pop {
          0% { opacity: 0; transform: translateY(10px) scale(.9); filter: blur(3px); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes fc-sparkle {
          0%, 100% { opacity: .35; transform: translate3d(0,0,0) scale(.9); }
          50% { opacity: .9; transform: translate3d(-4px,-5px,0) scale(1.08); }
        }
      `}</style>

      <div
        ref={wrapRef}
        className="fixed right-3 sm:right-5 bottom-20 md:bottom-6 z-[60] flex flex-col items-end gap-3"
      >
        {open && (
          <div
            className="relative flex flex-col items-end gap-2.5"
            style={{ animation: "fc-pop 220ms cubic-bezier(.2,.8,.2,1)" }}
          >
            <span
              aria-hidden
              className="absolute -right-1 -bottom-2 h-28 w-28 rounded-full bg-sky/25 blur-2xl"
              style={{ animation: "fc-sparkle 2.4s ease-in-out infinite" }}
            />

            <button
              type="button"
              onClick={openVideoConsultation}
              aria-label="Book a video consultation"
              className="relative flex items-center gap-2.5 pl-2 pr-4 py-2 rounded-full bg-gradient-to-r from-emerald-800 via-emerald-700 to-amber-600 text-white shadow-[0_14px_34px_-10px_rgba(15,94,75,0.75)] ring-1 ring-white/45 backdrop-blur transition-transform hover:scale-[1.03] active:scale-95"
            >
              <span className="w-9 h-9 rounded-full bg-white/20 ring-1 ring-white/45 flex items-center justify-center">
                <Video className="w-5 h-5" />
              </span>
              <span className="text-sm font-bold whitespace-nowrap">
                Video Consultation
              </span>
            </button>

            <a
              href={`https://wa.me/${PHONE}?text=${WA_TEXT}`}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Chat on WhatsApp"
              onClick={() => setOpen(false)}
              className="relative flex items-center gap-2.5 pl-2 pr-4 py-2 rounded-full bg-gradient-to-r from-[#5BE584] via-[#25D366] to-[#0f9d58] text-white shadow-[0_14px_34px_-10px_rgba(37,211,102,0.75)] ring-1 ring-white/45 backdrop-blur transition-transform hover:scale-[1.03] active:scale-95"
            >
              <span className="w-9 h-9 rounded-full bg-white/15 ring-1 ring-white/40 flex items-center justify-center backdrop-blur">
                <MessageCircle className="w-5 h-5" />
              </span>
              <span className="text-sm font-bold whitespace-nowrap">
                Chat on WhatsApp
              </span>
            </a>
          </div>
        )}

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-label={open ? "Close contact options" : "Open contact options"}
          aria-expanded={open}
          className="relative w-12 h-12 md:w-16 md:h-16 rounded-full shadow-[0_12px_34px_-8px_rgba(15,94,75,0.6)] hover:scale-110 active:scale-95 transition-transform"
        >
          {!open && (
            <>
              <span
                aria-hidden
                className="absolute inset-0 rounded-full bg-sky/50"
                style={{ animation: "fc-ring 2s ease-out infinite" }}
              />
              <span
                aria-hidden
                className="absolute inset-0 rounded-full bg-sky/50"
                style={{ animation: "fc-ring 2s ease-out 1s infinite" }}
              />
            </>
          )}
          <span className="relative w-full h-full rounded-full bg-white ring-2 ring-sky/70 flex items-center justify-center overflow-hidden">
            <img
              src={media.logoMark}
              alt={site.brand.name}
              className="w-full h-full object-contain p-0.5"
            />
          </span>
        </button>
      </div>
    </>
  );
};
