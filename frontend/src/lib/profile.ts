import type { User } from "@supabase/supabase-js";
import type { UserProfile } from "@/contexts/ProfileContext";

/** `users.full_name`/`avatar_url` (editable, never touched by Google) take priority
 * over the OAuth-provided `user_metadata`, which Supabase overwrites from Google on
 * every sign-in and would otherwise silently discard a custom edit. */
export function getDisplayName(user: User, profile: UserProfile | null): string {
  return (
    profile?.full_name ??
    (user.user_metadata?.full_name as string | undefined) ??
    user.email ??
    "Utilisateur"
  );
}

export function getAvatarUrl(
  user: User,
  profile: UserProfile | null,
): string | undefined {
  return (
    profile?.avatar_url ??
    (user.user_metadata?.picture as string | undefined) ??
    undefined
  );
}
