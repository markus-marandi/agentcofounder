import type { ComponentType } from "react";
import type { ShowcaseBlockId, ShowcaseBlockProps } from "../../kernel/types.js";
import { HomeScreenSidebar } from "./HomeScreenSidebar.js";

/** Maps a parameters.json `showcase.blocks[]` id to its vendored component. */
export const showcaseBlocks: Record<ShowcaseBlockId, ComponentType<ShowcaseBlockProps>> = {
  "home-screen-sidebar": HomeScreenSidebar,
};
