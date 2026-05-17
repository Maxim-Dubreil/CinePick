import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      ...(process.env.VITE_MOCK_AUTH === "true" && {
        "@/hooks/useAuth": path.resolve(__dirname, "./__mocks__/useAuth.ts"),
      }),
    },
  },
});
