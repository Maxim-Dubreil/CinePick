import type { WatchProvider, WatchProviderCategory } from "@/lib/backend/api";

export const WATCH_PROVIDER_CATEGORY_ORDER: WatchProviderCategory[] = [
  "free",
  "subscription",
  "rent_buy",
];

export const WATCH_PROVIDER_CATEGORY_LABELS: Record<WatchProviderCategory, string> = {
  free: "Gratuit",
  subscription: "Abonnement",
  rent_buy: "Location / achat",
};

export interface WatchProviderGroup {
  category: WatchProviderCategory;
  label: string;
  providers: WatchProvider[];
}

/** Buckets a flat provider list into the 3 display categories, in the fixed
 * order the ticket specifies — categories with no provider are dropped, so
 * callers never need to check for emptiness themselves. */
export function groupWatchProvidersByCategory(
  providers: WatchProvider[],
): WatchProviderGroup[] {
  return WATCH_PROVIDER_CATEGORY_ORDER.map((category) => ({
    category,
    label: WATCH_PROVIDER_CATEGORY_LABELS[category],
    providers: providers.filter((provider) => provider.category === category),
  })).filter((group) => group.providers.length > 0);
}
