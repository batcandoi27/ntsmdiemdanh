import type { Config } from "tailwindcss";

const config: Config = {
    content: [
        "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    ],
    theme: {
        extend: {
            colors: {
                background: "var(--background)",
                foreground: "var(--foreground)",
                primary: {
                    DEFAULT: "#00CED1", // Dark Turquoise
                    dark: "#008B8B",    // Dark Cyan
                    light: "#E0FFFF",   // Light Cyan
                    foreground: "#ffffff",
                },
                success: {
                    DEFAULT: "#10B981", // Emerald 500
                    foreground: "#ffffff",
                },
                warning: {
                    DEFAULT: "#F59E0B", // Amber 500
                    foreground: "#ffffff",
                },
                danger: {
                    DEFAULT: "#EF4444", // Red 500
                    foreground: "#ffffff",
                },
            },
        },
    },
    plugins: [],
};
export default config;
