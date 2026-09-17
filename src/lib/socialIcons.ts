import { Facebook, Instagram, Linkedin, Twitter, Youtube, type LucideIcon } from "lucide-react";

const SOCIAL_ICONS: Record<string, LucideIcon> = {
  instagram: Instagram,
  youtube: Youtube,
  facebook: Facebook,
  twitter: Twitter,
  linkedin: Linkedin,
};

/** Icon for a `site.socials[].platform` value (falls back to Instagram). */
export const socialIcon = (platform: string): LucideIcon => SOCIAL_ICONS[platform.toLowerCase()] ?? Instagram;
