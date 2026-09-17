// ─────────────────────────────────────────────────────────────────────────────
// BRAND & STORE IMAGES — swap these imports to rebrand.
//
// Only images that identify the business live here (logo, storefront, store
// interior, press clipping, About-page story photos). Product, banner and
// category artwork is managed from the admin panel or lives in src/assets.
//
// The store ships with illustrated placeholders in src/assets/sarees/.
// Put real photos of your studio and sarees in src/assets/brand/ and point
// the imports at them.
// ─────────────────────────────────────────────────────────────────────────────
import logoAsset from "@/assets/brand/logo.svg";
import logoMarkAsset from "@/assets/brand/logo-mark.svg";

import storeFrontAsset from "@/assets/sarees/store-front.svg";
import sareeWallAsset from "@/assets/sarees/store-saree-wall.svg";
import bridalFlatlayAsset from "@/assets/sarees/store-bridal-flatlay.svg";
import loomAsset from "@/assets/sarees/story-loom.svg";
import silkSideAsset from "@/assets/sarees/side-silk.svg";
import bridalSideAsset from "@/assets/sarees/side-bridal.svg";
import handloomSideAsset from "@/assets/sarees/side-handloom.svg";
import designerSideAsset from "@/assets/sarees/side-designer.svg";

export const media = {
  logo: logoAsset,
  /** Square emblem for round or square slots (chat bubble, admin dashboard) */
  logoMark: logoMarkAsset,
  /** "Visit us" section (homepage + contact page) — use real photos of your shop */
  store: {
    front: storeFrontAsset,
    interior: sareeWallAsset,
    highlight: silkSideAsset,
    event: bridalFlatlayAsset,
  },
  /** About page */
  about: {
    hero: sareeWallAsset,
    /** Story collage: tall image, two small images */
    storyTall: bridalSideAsset,
    storyWide: bridalFlatlayAsset,
    storySmall: handloomSideAsset,
    galleryExtra: designerSideAsset,
    boutique: storeFrontAsset,
    /** One image per entry in content.about.timeline, in order */
    timeline: [loomAsset, handloomSideAsset, bridalFlatlayAsset, sareeWallAsset, storeFrontAsset],
  },
  /** Press page featured clipping */
  pressFeature: bridalFlatlayAsset,
};
