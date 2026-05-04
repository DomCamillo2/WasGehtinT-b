export const SITE_NAME = "WasGehtTueb";
/** Marken-Logo (PNG in `public/`) */
export const SITE_LOGO_SRC = "/wasgeht-mark.png";
export const SITE_URL = "https://www.wasgehttueb.app";
export const SITE_DESCRIPTION =
  "Dein Event-Radar fuer Tuebingen: Studentenpartys, Clubnaechte, Community-Treffen und Tagesevents an einem Ort.";

export function absoluteUrl(path: string) {
  if (!path) {
    return SITE_URL;
  }

  if (/^https?:\/\//i.test(path)) {
    return path;
  }

  return new URL(path.startsWith("/") ? path : `/${path}`, SITE_URL).toString();
}
