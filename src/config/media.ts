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

import storeFrontAsset from "@/assets/sarees/store-front.jpg";
import sareeWallAsset from "@/assets/sarees/store-saree-wall.jpg";
import bridalFlatlayAsset from "@/assets/sarees/store-bridal-flatlay.jpg";
import loomAsset from "@/assets/sarees/story-loom.jpg";
import silkSideAsset from "@/assets/sarees/side-silk.jpg";
import bridalSideAsset from "@/assets/sarees/side-bridal.jpg";
import handloomSideAsset from "@/assets/sarees/side-handloom.jpg";
import designerSideAsset from "@/assets/sarees/side-designer.jpg";

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
