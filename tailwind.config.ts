import type { Config } from "tailwindcss";

const config: Config = {
    content: [
        "./src/**/*.{js,ts,jsx,tsx,mdx}",
        "./app/**/*.{js,ts,jsx,tsx,mdx}",
        "./components/**/*.{js,ts,jsx,tsx,mdx}",
    ],
    theme: {
        extend: {
            colors: {
                app: "var(--bg-app)",
                surface: {
                    DEFAULT: "var(--surface-card)",
                    card: "var(--surface-card)",
                    section: "var(--surface-section)",
                    input: "var(--surface-input)",
                    hover: "var(--surface-hover)",
                    selected: "var(--surface-selected)",
                    subtle: "var(--surface-subtle)",
                },
                text: {
                    primary: "var(--text-primary)",
                    secondary: "var(--text-secondary)",
                    tertiary: "var(--text-tertiary)",
                    disabled: "var(--text-disabled)",
                    inverse: "var(--text-inverse)",
                },
                border: {
                    subtle: "var(--border-subtle)",
                    DEFAULT: "var(--border-default)",
                    strong: "var(--border-strong)",
                    focus: "var(--border-focus)",
                },
                primary: {
                    DEFAULT: "var(--primary)",
                    hover: "var(--primary-hover)",
                    active: "var(--primary-active)",
                    soft: "var(--primary-soft)",
                    foreground: "var(--primary-foreground)",
                },
                success: {
                    DEFAULT: "var(--success)",
                    hover: "var(--success-hover)",
                    soft: "var(--success-soft)",
                    foreground: "var(--success-foreground)",
                },
                warning: {
                    DEFAULT: "var(--warning)",
                    hover: "var(--warning-hover)",
                    soft: "var(--warning-soft)",
                    foreground: "var(--warning-foreground)",
                },
                danger: {
                    DEFAULT: "var(--danger)",
                    hover: "var(--danger-hover)",
                    soft: "var(--danger-soft)",
                    foreground: "var(--danger-foreground)",
                },
                info: {
                    DEFAULT: "var(--info)",
                    hover: "var(--info-hover)",
                    soft: "var(--info-soft)",
                    foreground: "var(--info-foreground)",
                },
                // Retain compatibility with background/foreground
                background: "var(--bg-app)",
                foreground: "var(--text-primary)",
            },
            boxShadow: {
                xs: "0 1px 2px 0 rgba(15, 23, 42, 0.04)",
                card: "0 1px 3px 0 rgba(15, 23, 42, 0.06), 0 1px 2px -1px rgba(15, 23, 42, 0.04)",
                cardHover: "0 10px 15px -3px rgba(15, 23, 42, 0.08), 0 4px 6px -4px rgba(15, 23, 42, 0.04)",
                dropdown: "0 10px 25px -5px rgba(15, 23, 42, 0.12), 0 8px 10px -6px rgba(15, 23, 42, 0.06)",
            },
            borderRadius: {
                card: "1rem", // 16px
                modal: "1.5rem", // 24px
            }
        },
    },
    plugins: [],
};
export default config;
