import { defineConfig } from "tsup";

export default defineConfig([
  {
    entry: ["src/index.tsx"],
    format: ["esm", "cjs"],
    dts: true,
    sourcemap: true,
    clean: true,
    external: ["@angkorgate/react", "next", "next/navigation", "react", "react-dom"],
    banner: {
      js: '"use client";',
    },
  },
  {
    entry: ["src/server.ts"],
    format: ["esm", "cjs"],
    dts: true,
    sourcemap: true,
    clean: false,
    external: ["@angkorgate/react", "next", "next/server", "next/headers"],
  },
]);
