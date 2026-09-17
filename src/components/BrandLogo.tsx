import { Link } from "react-router-dom";
import { site } from "@/config/site";
import { media } from "@/config/media";

export const BrandLogo = () => (
  <Link to="/" className="flex items-center shrink-0" aria-label={`${site.brand.name} home`}>
    <img
      src={media.logo}
      alt={`${site.brand.name} - ${site.brand.tagline}`}
      className="h-12 md:h-14 w-auto object-contain"
    />
  </Link>
);
