/**
 * ONE FILE TO CONTROL EVERY IMAGE ON THE SITE.
 * Change a link here, save, and the matching page updates. No other file needs editing.
 *
 * You can paste any of these as "src":
 *   1) Local file:        "/images/shop.jpg"               (file inside the public folder)
 *   2) Google Drive:      gdrive("FILE_ID")                  (share file -> "Anyone with the link"; FILE_ID is the part between /d/ and /view)
 *   3) Google Photos:     "https://lh3.googleusercontent.com/pw/..."
 *        (open the photo in Google Photos, right-click the picture -> "Copy image address")
 *        NOTE: the short photos.app.goo.gl share links do NOT work as images.
 *   4) Free stock (Pexels): px(PHOTO_ID)                     (number at the end of a pexels.com/photo/... link)
 */
export type Img = { src: string; alt: string };

export const px = (id: number, w = 1600) =>
  `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=${w}`;
export const gdrive = (fileId: string, w = 1600) => `https://lh3.googleusercontent.com/d/${fileId}=w${w}`;

const img = (src: string, alt: string): Img => ({ src, alt });

export const siteImages = {
  /** Big banner behind the title of each page */
  hero: {
    about: img(px(14383512), "Organised workshop with hand tools on a workbench"),
    products: img(px(35284420), "Tractor and trailer in a golden wheat field"),
    services: img(px(29785581), "Assorted hand tools on a garage workbench"),
    brands: img(px(162553), "Wrenches and tools arranged on a workshop wall"),
    gallery: img(px(34125493), "Wheat harvesting in a golden field"),
    contact: img(px(5194769), "Pile of assorted hand tools"),
    location: img(px(32539260), "Tractor in a wheat field under a cloudy sky"),
  },

  /** Photo beside the text on the About page */
  aboutPhoto: img(
    "/images/IMG-20261004-WA0010.jpg",
    "Machinery Tools Nepal storefront with agricultural equipment outside",
  ),

  /** Photos on the Gallery page. Add or remove lines freely. */
  gallery: [
    { src: "/images/IMG-20261004-WA0010.jpg", alt: "Machinery Tools Nepal storefront with agricultural equipment outside", tag: "Shop" },
    { src: "/images/IMG-20261004-WA0002.jpg", alt: "Agricultural equipment displayed outside a machinery shop", tag: "Shop" },
    { src: "/images/shop.jpg", alt: "Inside the Machinery Tools Nepal showroom", tag: "Shop" },
    { src: "/images/IMG-20261004-WA0003.jpg", alt: "Machinery and tools on display inside the showroom", tag: "Showroom" },
    { src: "/images/IMG-20261004-WA0006.jpg", alt: "View across the Machinery Tools Nepal showroom and counter", tag: "Showroom" },
    { src: "/images/IMG-20261004-WA0005.jpg", alt: "Metal rods stacked in stock", tag: "Stock" },
    { src: "/images/IMG-20261004-WA0001.jpg", alt: "Red walk-behind harvesting machine viewed from the side", tag: "Equipment" },
    { src: "/images/IMG-20261004-WA0007.jpg", alt: "Several power tillers displayed together", tag: "Equipment" },
  ] as { src: string; alt: string; tag: string }[],

  /**
   * Product photos by product id. Anything listed here overrides the default image.
   * ids: corn-sheller, self-propelled-reaper, power-tiller, cordless-tool-kit, chainsaw, mechanical-tools, machinery
   * Example:  "power-tiller": gdrive("1AbCdEfGh..."),
   */
  products: {} as Record<string, string>,
};

export const productImage = (id: string, fallback: string) => siteImages.products[id] || fallback;
