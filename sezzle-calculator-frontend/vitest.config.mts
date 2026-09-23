import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
    plugins: [react()],
    resolve: {
        alias: {
            "@": fileURLToPath(new URL("./src", import.meta.url)),
        },
    },
    test: {
        environment: "jsdom",
        setupFiles: ["./vitest.setup.ts"],
        coverage: {
            provider: "v8",
            reportOnFailure: true,
            reporter: ["text", "html"],
            include: ["src/**/*.{ts,tsx}"],
            exclude: ["**/*.config.*", "**/*.d.ts", "**/__tests__/**", "**/*.test.{ts,tsx}", "src/app/layout.tsx", "src/app/page.tsx"],
        },
    },
});
