import tailwindcss from "@tailwindcss/vite";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";

export default defineConfig(({ command, mode }) => {
  const env = loadEnv(mode, process.cwd());

  if (command === "build" && !env.VITE_TURNSTILE_SITE_KEY?.trim()) {
    throw new Error(
      "Missing required production environment variable: VITE_TURNSTILE_SITE_KEY",
    );
  }

  return {
    server: {
      port: 3001,
    },
    resolve: {
      tsconfigPaths: true,
    },
    plugins: [
      tailwindcss(),
      tanstackRouter({
        target: "react",
        autoCodeSplitting: true,
      }),
      react(),
    ],
  };
});
