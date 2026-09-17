import { X, Sparkles, Crown } from "lucide-react";
import { useState } from "react";
import { content } from "@/config/content";

const ICONS: Record<string, typeof Sparkles> = { sparkles: Sparkles, crown: Crown };
const MESSAGES = content.announcements.map((m) => ({ icon: ICONS[m.icon] ?? Sparkles, text: m.text }));

export const AnnouncementBar = () => {
  const [open, setOpen] = useState(true);
  if (!open) return null;

  // Build a long enough track by repeating the messages so the marquee never
  // shows a gap on wide screens. Two copies in the track lets us loop seamlessly.
  const track = [...MESSAGES, ...MESSAGES, ...MESSAGES, ...MESSAGES];

  return (
    <div className="relative bg-announcement text-announcement-foreground overflow-hidden">
      <style>{`
        @keyframes announce-marquee {
          from { transform: translateX(0); }
          to   { transform: translateX(-50%); }
        }
        @keyframes announce-shimmer {
          0%   { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        @keyframes announce-twinkle {
          0%,100% { opacity: .4; transform: scale(.85) rotate(0deg); }
          50%     { opacity: 1;  transform: scale(1.15) rotate(12deg); }
        }
        .announce-track {
          animation: announce-marquee 32s linear infinite;
        }
        .announce-track:hover { animation-play-state: paused; }
        .announce-shimmer::after {
          content: "";
          position: absolute; inset: 0;
          background: linear-gradient(110deg, transparent 30%, rgba(255,255,255,0.35) 50%, transparent 70%);
          animation: announce-shimmer 4.5s ease-in-out infinite;
          pointer-events: none;
        }
      `}</style>

      {/* Edge fades */}
      <div className="pointer-events-none absolute inset-y-0 left-0 w-10 bg-gradient-to-r from-announcement to-transparent z-10" />
      <div className="pointer-events-none absolute inset-y-0 right-10 w-10 bg-gradient-to-l from-announcement to-transparent z-10" />

      <div className="relative announce-shimmer">
        <div className="py-2 pr-10 overflow-hidden">
          <div className="announce-track flex w-max gap-12 whitespace-nowrap will-change-transform">
            {track.map((m, i) => {
              const Icon = m.icon;
              return (
                <span
                  key={i}
                  className="inline-flex items-center gap-2 text-xs md:text-sm font-semibold tracking-wide"
                >
                  <Icon
                    className="w-3.5 h-3.5 md:w-4 md:h-4 text-yellow-200"
                    style={{ animation: `announce-twinkle 2.${(i % 6) + 1}s ease-in-out infinite` }}
                  />
                  {m.text}
                  <Sparkles
                    className="w-3 h-3 text-yellow-200/80"
                    style={{ animation: `announce-twinkle 1.${(i % 5) + 4}s ease-in-out infinite` }}
                  />
                </span>
              );
            })}
          </div>
        </div>
      </div>

      <button
        onClick={() => setOpen(false)}
        aria-label="Dismiss"
        className="absolute right-3 top-1/2 -translate-y-1/2 z-20 opacity-80 hover:opacity-100 transition"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};
