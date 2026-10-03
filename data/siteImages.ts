/**
 * ONE FILE TO CONTROL EVERY IMAGE ON THE SITE.
 * Change a link here, save, and the matching page updates. No other file needs editing.
 *
 * You can paste any of these as "src":
 *   1) Local file:        "/images/gallery/item-1.jpg"      (file inside the public folder)
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

  /** Photo beside the text on the About page (replace with your own shop photo) */
  aboutPhoto: img("/images/company/shop.jpg", "B & B Machinery shop"),

  /** Photos on the Gallery page. Add or remove lines freely. */
  gallery: [
    { src: "/images/company/shop.jpg", alt: "B & B Machinery shop front, Pokhara", tag: "Shop" },
    { src: "/images/gallery/shop-2.jpg", alt: "Inside the B & B Machinery showroom", tag: "Shop" },
    { src: "/images/gallery/item-1.jpg", alt: "Machinery available at B & B", tag: "Items" },
    { src: "/images/gallery/item-2.jpg", alt: "Tools and equipment at B & B", tag: "Items" },
  ] as { src: string; alt: string; tag: string }[],

  /**
   * Product photos by product id. Anything listed here overrides the default image.
   * ids: corn-sheller, self-propelled-reaper, power-tiller, cordless-tool-kit, chainsaw, mechanical-tools, machinery
   * Example:  "power-tiller": gdrive("1AbCdEfGh..."),
   */
  products: {} as Record<string, string>,
};

export const productImage = (id: string, fallback: string) => siteImages.products[id] || fallback;