import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        ...(env.VITE_MOCK_AUTH === "true" && {
          "@/hooks/useAuth": path.resolve(__dirname, "./__mocks__/useAuth.ts"),
        }),
        "@": path.resolve(__dirname, "./src"),
      },
    },
  };
});
