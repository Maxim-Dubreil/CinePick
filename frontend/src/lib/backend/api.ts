const API_URL = import.meta.env.VITE_API_URL as string;

if (!API_URL) {
  throw new Error("Missing VITE_API_URL environment variable");
}

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, options);
  } catch {
    throw new ApiError(0, "Network error");
  }
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new ApiError(res.status, text);
  }
  return res.json() as Promise<T>;
}

export async function getWatchlistCount(
  username: string,
): Promise<{ username: string; count: number }> {
  return apiFetch(
    `/watchlist/count?username=${encodeURIComponent(username)}`,
  );
}
