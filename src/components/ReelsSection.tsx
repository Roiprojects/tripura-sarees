import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Sparkles, Volume2, VolumeX } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { site } from "@/config/site";

type Reel = {
  id: string;
  video_url: string;
  title: string | null;
  sort_order: number;
};

export const ReelsSection = () => {
  const { data: reels = [] } = useQuery({
    queryKey: ["reels-videos-public"],
    queryFn: async () => {
      const { data } = await supabase
        .from("reels_videos")
        .select("id,video_url,title,sort_order")
        .eq("status", "active")
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: false });
      return (data ?? []) as Reel[];
    },
    refetchOnWindowFocus: true,
  });

  // Only one reel can play with sound at a time (id of unmuted reel, or null).
  const [unmutedId, setUnmutedId] = useState<string | null>(null);
  const videoRefs = useRef<Record<string, HTMLVideoElement | null>>({});

  const toggleSound = (id: string) => {
    setUnmutedId((curr) => {
      const next = curr === id ? null : id;
      // Apply mute state immediately to all videos.
      Object.entries(videoRefs.current).forEach(([vid, el]) => {
        if (!el) return;
        el.muted = vid !== next;
        if (vid === next) {
          el.volume = 1;
          el.play().catch(() => {});
        }
      });
      return next;
    });
  };

  // Pause videos that aren't visible to save bandwidth & keep things smooth.
  useEffect(() => {
    if (!reels.length) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          const v = e.target as HTMLVideoElement;
          if (e.isIntersecting) {
            v.play().catch(() => {});
          } else {
            v.pause();
          }
        }
      },
      { threshold: 0.4 },
    );
    Object.values(videoRefs.current).forEach((v) => v && io.observe(v));
    return () => io.disconnect();
  }, [reels]);

  if (!reels.length) return null;

  return (
    <section className="py-10 md:py-16 overflow-hidden">
      <div className="container mb-6 md:mb-8 text-center md:text-left">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-[11px] font-bold uppercase tracking-wider ring-1 ring-primary/20 mb-2">
          <Sparkles className="w-3 h-3" /> {site.brand.name} Reels
        </div>
        <h2 className="font-display text-2xl md:text-4xl font-bold leading-tight">
          See the Drape in Motion
        </h2>
        <p className="text-muted-foreground mt-1.5 text-sm md:text-base">
          Watch how each weave falls, shines and moves when it's worn.
        </p>
      </div>

      <div className="container">
        <div
          className="grid grid-flow-col auto-cols-[82%] sm:auto-cols-[45%] md:auto-cols-[31%] lg:grid-flow-row lg:grid-cols-4 lg:auto-cols-auto gap-3 sm:gap-4 md:gap-5 overflow-x-auto lg:overflow-visible snap-x snap-mandatory pb-4 -mx-4 px-4 sm:-mx-6 sm:px-6 lg:mx-0 lg:px-0 scrollbar-none"
          style={{ scrollbarWidth: "none" }}
        >
        {reels.map((r) => {
          const isUnmuted = unmutedId === r.id;
          return (
            <div key={r.id} className="snap-start min-w-0">
              <div className="group relative aspect-[9/16] w-full rounded-[22px] md:rounded-3xl overflow-hidden bg-black shadow-[0_20px_50px_-15px_rgba(0,0,0,0.45)] ring-1 ring-black/5 transition-all duration-500 hover:-translate-y-1 hover:shadow-[0_30px_70px_-15px_rgba(15,94,75,0.5)]">
                <video
                  ref={(el) => { videoRefs.current[r.id] = el; }}
                  src={r.video_url}
                  muted={!isUnmuted}
                  loop
                  autoPlay
                  playsInline
                  preload="metadata"
                  controls={false}
                  disablePictureInPicture
                  className="absolute inset-0 w-full h-full object-cover"
                  onClick={() => toggleSound(r.id)}
                />
                {/* gradient overlay */}
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/70 via-black/0 to-black/20" />

                {/* Sound toggle */}
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); toggleSound(r.id); }}
                  aria-label={isUnmuted ? "Mute reel" : "Unmute reel"}
                  className="absolute top-3 right-3 z-10 w-9 h-9 rounded-full bg-black/55 hover:bg-black/75 backdrop-blur text-white flex items-center justify-center ring-1 ring-white/20 transition"
                >
                  {isUnmuted ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                </button>

                {r.title && (
                  <div className="absolute bottom-0 inset-x-0 p-4 text-white pointer-events-none">
                    <div className="text-sm md:text-base font-semibold drop-shadow line-clamp-2">{r.title}</div>
                  </div>
                )}
                {/* shine on hover */}
                <div className="pointer-events-none absolute -inset-y-10 -left-1/2 w-1/2 rotate-12 bg-gradient-to-r from-transparent via-white/25 to-transparent opacity-0 group-hover:opacity-100 group-hover:translate-x-[400%] transition-all duration-1000" />
              </div>
            </div>
          );
        })}
        </div>
      </div>
    </section>
  );
};
