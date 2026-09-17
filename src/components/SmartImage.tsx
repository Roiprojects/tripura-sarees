import { useEffect, useState, ImgHTMLAttributes } from "react";
import { cn } from "@/lib/utils";
import { resolveImage, PLACEHOLDER_IMAGE } from "@/lib/resolveImage";

type Props = Omit<ImgHTMLAttributes<HTMLImageElement>, "src"> & {
  src?: string | null;
  /** Mark as above-the-fold to load eagerly with high fetch priority */
  priority?: boolean;
  /** Aspect ratio class for the wrapper (e.g. "aspect-square"). If omitted, wrapper fills parent. */
  aspect?: string;
  wrapperClassName?: string;
  /** Custom fallback URL (defaults to /placeholder.svg, base-prefixed) */
  fallback?: string;
};

/**
 * SmartImage: deployment-safe image with normalized URL, shimmer placeholder,
 * onError fallback, lazy/eager loading, and aspect-ratio support.
 */
export const SmartImage = ({
  src,
  alt,
  width,
  height,
  priority,
  aspect,
  wrapperClassName,
  className,
  fallback = PLACEHOLDER_IMAGE,
  decoding = "async",
  onError,
  ...rest
}: Props) => {
  const initial = resolveImage(src);
  const [current, setCurrent] = useState<string>(initial);
  const [loaded, setLoaded] = useState(false);
  const [errored, setErrored] = useState(false);

  useEffect(() => {
    const next = resolveImage(src);
    setCurrent(next);
    setLoaded(false);
    setErrored(false);
  }, [src]);

  return (
    <div
      className={cn(
        "relative overflow-hidden bg-muted",
        aspect,
        wrapperClassName,
      )}
    >
      {!loaded && (
        <div
          aria-hidden
          className="absolute inset-0 animate-shimmer bg-[linear-gradient(110deg,hsl(var(--muted))_8%,hsl(var(--muted-foreground)/0.08)_18%,hsl(var(--muted))_33%)] bg-[length:200%_100%]"
        />
      )}
      <img
        src={current}
        alt={alt ?? ""}
        width={width}
        height={height}
        loading={priority ? "eager" : "lazy"}
        // @ts-expect-error fetchpriority is a valid HTML attribute
        fetchpriority={priority ? "high" : "auto"}
        decoding={decoding}
        onLoad={() => setLoaded(true)}
        onError={(e) => {
          if (!errored && current !== fallback) {
            setErrored(true);
            setCurrent(fallback);
          } else {
            setLoaded(true);
          }
          onError?.(e);
        }}
        className={cn(
          "transition-opacity duration-500",
          loaded ? "opacity-100" : "opacity-0",
          className,
        )}
        {...rest}
      />
    </div>
  );
};

export default SmartImage;
