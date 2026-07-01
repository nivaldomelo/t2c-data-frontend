import { helpContentMap, routeDocs } from "@/docs/help-content";
import type { DocContent } from "@/docs/types";

export function getDocForPath(pathname: string): DocContent {
  const entry = routeDocs.find((item) => item.match(pathname));
  return entry?.doc ?? helpContentMap.default;
}
