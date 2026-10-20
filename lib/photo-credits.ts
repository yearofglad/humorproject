export type PhotoCredit = { author: string; source: string; license: string; licenseUrl: string | null; changes: string };

export const PHOTO_CREDITS: Record<string, PhotoCredit> = {
  "/photos/butler.webp": {
    "author": "Beyond My Ken",
    "source": "https://commons.wikimedia.org/wiki/File:2014_Columbia_University_Butler_Library_from_front.jpg",
    "license": "CC BY-SA 4.0",
    "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0",
    "changes": "Resized and converted to WebP."
  },
  "/photos/central-park.webp": {
    "author": "Matt & Janet Dustin",
    "source": "https://commons.wikimedia.org/wiki/File:Central_Park_Skyline.jpg",
    "license": "CC BY 2.0",
    "licenseUrl": "https://creativecommons.org/licenses/by/2.0",
    "changes": "Resized and converted to WebP."
  },
  "/photos/dorm.webp": {
    "author": "Ecapone6",
    "source": "https://commons.wikimedia.org/wiki/File:Dormroom.JPG",
    "license": "Public domain",
    "licenseUrl": null,
    "changes": "Resized and converted to WebP."
  },
  "/photos/subway.webp": {
    "author": "David Shankbone",
    "source": "https://commons.wikimedia.org/wiki/File:NYCS_R46_interior.jpg",
    "license": "CC BY 2.5",
    "licenseUrl": "https://creativecommons.org/licenses/by/2.5",
    "changes": "Resized and converted to WebP."
  },
  "/photos/pizza.webp": {
    "author": "Hungrydudes",
    "source": "https://commons.wikimedia.org/wiki/File:NYPizzaPie.jpg",
    "license": "CC BY 2.0",
    "licenseUrl": "https://creativecommons.org/licenses/by/2.0",
    "changes": "Resized and converted to WebP."
  }
};
