/**
 * @param {Record<string, string>} filters
 * @param {number} page
 * @param {number} pageSize
 */
export function buildTimelineQuery(filters, page, pageSize) {
  const params = new URLSearchParams();
  params.set("page", String(page));
  params.set("page_size", String(pageSize));
  for (const [key, value] of Object.entries(filters)) {
    if (!value.trim()) continue;
    params.set(key, value.trim());
  }
  return params.toString();
}
