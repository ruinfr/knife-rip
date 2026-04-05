"use client";

import { addCollection } from "@iconify/react";
import { icons as mdiIcons } from "@iconify-json/mdi";
import { icons as tablerIcons } from "@iconify-json/tabler";

addCollection(mdiIcons);
addCollection(tablerIcons);

/** Bundles mdi + tabler so icons render without the Iconify API (works with strict CSP on Vercel). */
export function IconifyRegister() {
  return null;
}
