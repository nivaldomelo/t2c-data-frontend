export type PageResponse<T> = {
  items?: T[];
  total?: number;
  page?: number;
  page_size?: number;
  has_more?: boolean;
};

export function normalizePageItems<T>(response: T[] | PageResponse<T> | null | undefined): T[] {
  return Array.isArray(response) ? response : response?.items ?? [];
}
