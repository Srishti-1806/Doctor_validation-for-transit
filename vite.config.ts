import { defineConfig } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import tailwindcss from "@tailwindcss/vite";
import viteReact from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [
    tanstackStart({
      // server entry is inferred from the repository layout, but you can override
      // config here if needed.
    }),
    viteReact(),
    tailwindcss(),
  ],
  resolve: {
    tsconfigPaths: true,
    alias: [
      { find: /^@\//, replacement: "/src/" },
      // The mongodb driver's tr46 dep does `require("punycode/")`; the trailing
      // slash breaks unenv's punycode shim on Cloudflare Workers. Rewrite it
      // to the plain "punycode" package we installed explicitly.
      { find: /^punycode\/$/, replacement: "punycode" },
    ],
  },
});
