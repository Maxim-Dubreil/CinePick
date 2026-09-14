import type { Session, User } from "@supabase/supabase-js";

const mockUser: User = {
  id: "mock-user-123",
  aud: "authenticated",
  role: "authenticated",
  email: "dev@example.com",
  email_confirmed_at: new Date().toISOString(),
  phone: undefined,
  confirmed_at: new Date().toISOString(),
  last_sign_in_at: new Date().toISOString(),
  app_metadata: {
    provider: "google",
    providers: ["google"],
  },
  user_metadata: {
    email: "dev@example.com",
    email_verified: true,
    full_name: "Dev User",
    iss: "https://accounts.google.com",
    name: "Dev User",
    picture: "https://via.placeholder.com/150",
    provider_id: "mock-provider-id",
    sub: "mock-sub",
  },
  identities: [
    {
      identity_id: "mock-identity-id",
      id: "mock-user-123",
      user_id: "mock-user-123",
      identity_data: {
        email: "dev@example.com",
        email_verified: true,
        full_name: "Dev User",
        iss: "https://accounts.google.com",
        name: "Dev User",
        picture: "https://via.placeholder.com/150",
        provider_id: "mock-provider-id",
        sub: "mock-sub",
      },
      provider: "google",
      last_sign_in_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ],
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

const mockSession: Session = {
  access_token: "mock-access-token-" + Math.random().toString(36).slice(2),
  token_type: "bearer",
  expires_in: 3600,
  refresh_token: "mock-refresh-token",
  user: mockUser,
};

export const useAuth = () => ({
  user: mockUser,
  session: mockSession,
  loading: false,
});
