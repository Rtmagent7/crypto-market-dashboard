import { createCn } from "cn/config";

/**
 * Class merger aware of the Tidewater type scale (globals.css `--text-*`). Without this,
 * `text-meta` is read as a color and silently dropped next to `text-muted`.
 */
export const cn = createCn({
  extend: {
    classGroups: {
      "font-size": [{ text: ["pulse", "page-title", "panel-title", "cell", "meta"] }],
      "font-family": [{ font: ["condensed"] }],
      rounded: [{ rounded: ["panel", "control"] }],
    },
  },
});
