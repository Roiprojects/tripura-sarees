// Magical "fly to cart" animation: clones an image and animates it along
// a curved path from the source element to the cart icon in the header/bottom nav.
export const flyToCart = (sourceEl: HTMLElement | null, imageUrl: string) => {
  if (typeof window === "undefined" || !sourceEl || !imageUrl) return;
  const target =
    (document.querySelector("[data-cart-target]") as HTMLElement | null) ?? null;
  if (!target) return;

  const src = sourceEl.getBoundingClientRect();
  const dst = target.getBoundingClientRect();

  const startX = src.left + src.width / 2;
  const startY = src.top + src.height / 2;
  const endX = dst.left + dst.width / 2;
  const endY = dst.top + dst.height / 2;

  const size = 72;

  const node = document.createElement("div");
  node.style.cssText = `
    position: fixed;
    left: ${startX - size / 2}px;
    top: ${startY - size / 2}px;
    width: ${size}px;
    height: ${size}px;
    border-radius: 9999px;
    overflow: hidden;
    pointer-events: none;
    z-index: 9999;
    box-shadow: 0 12px 30px -8px hsl(46 68% 47% / .55), 0 0 0 3px hsl(0 0% 100% / .9);
    background: white;
    will-change: transform, opacity;
  `;
  const img = document.createElement("img");
  img.src = imageUrl;
  img.alt = "";
  img.style.cssText = "width:100%;height:100%;object-fit:cover;display:block;";
  node.appendChild(img);

  // sparkle ring
  const ring = document.createElement("div");
  ring.style.cssText = `
    position: fixed;
    left: ${startX - 40}px;
    top: ${startY - 40}px;
    width: 80px;
    height: 80px;
    border-radius: 9999px;
    border: 2px solid hsl(46 75% 60% / .9);
    pointer-events: none;
    z-index: 9998;
    opacity: .9;
    will-change: transform, opacity;
  `;

  document.body.appendChild(ring);
  document.body.appendChild(node);

  const dx = endX - startX;
  const dy = endY - startY;

  const anim = node.animate(
    [
      { transform: "translate(0,0) scale(1) rotate(0deg)", opacity: 1, offset: 0 },
      { transform: `translate(${dx * 0.5}px, ${dy * 0.5 - 140}px) scale(0.85) rotate(180deg)`, opacity: 1, offset: 0.6 },
      { transform: `translate(${dx}px, ${dy}px) scale(0.15) rotate(360deg)`, opacity: 0.2, offset: 1 },
    ],
    { duration: 900, easing: "cubic-bezier(.45,.05,.55,.95)" },
  );

  ring.animate(
    [
      { transform: "scale(.4)", opacity: 0.9 },
      { transform: "scale(2.4)", opacity: 0 },
    ],
    { duration: 600, easing: "ease-out" },
  );

  setTimeout(() => ring.remove(), 650);

  anim.onfinish = () => {
    node.remove();
    // pop the cart icon
    target.animate(
      [
        { transform: "scale(1)" },
        { transform: "scale(1.3)" },
        { transform: "scale(1)" },
      ],
      { duration: 360, easing: "cubic-bezier(.34,1.56,.64,1)" },
    );
  };
};
