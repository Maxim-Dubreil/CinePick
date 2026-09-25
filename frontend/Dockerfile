# --- Stage 1: build the static bundle --------------------------------------
FROM node:24-alpine AS build
RUN npm install -g pnpm@11.27.1
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .

# VITE_* values are inlined into the JS at build time, not read at runtime —
# they must be passed as build args. The anon key is public by design (RLS
# protects the data); never pass a secret here.
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY
ARG VITE_API_URL=/api
ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL \
    VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY \
    VITE_API_URL=$VITE_API_URL \
    VITE_MOCK_AUTH=false
RUN pnpm build

# --- Stage 2: serve it with Caddy (also the reverse proxy to the backend) ---
FROM caddy:2-alpine
COPY Caddyfile /etc/caddy/Caddyfile
COPY --from=build /app/dist /srv
