/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                background: "#021029",
                primary: {
                    DEFAULT: "#0EA5E9",
                    foreground: "#FFFFFF",
                    hover: "#38BDF8",
                },
                accent: {
                    DEFAULT: "#FACC15",
                    foreground: "#021029",
                    hover: "#FDE047",
                },
                surface: {
                    DEFAULT: "rgba(255, 255, 255, 0.05)",
                    hover: "rgba(255, 255, 255, 0.1)",
                    active: "rgba(255, 255, 255, 0.15)",
                },
                success: "#22c55e",
                warning: "#f59e0b",
                error: "#ef4444",
            },
            fontFamily: {
                sans: ['Inter', 'sans-serif'],
            },
            backgroundImage: {
                'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
                'gradient-conic': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
                'glass-gradient': 'linear-gradient(180deg, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0.03) 100%)',
            },
            animation: {
                marquee: 'marquee 25s linear infinite',
                'ping-slow': 'ping 3s cubic-bezier(0, 0, 0.2, 1) infinite',
                'pulse-glow': 'pulse-glow 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                'float': 'float 6s ease-in-out infinite',
            },
            keyframes: {
                marquee: {
                    '0%': { transform: 'translateX(0%)' },
                    '100%': { transform: 'translateX(-50%)' },
                },
                'pulse-glow': {
                    '0%, 100%': { opacity: 1, filter: 'brightness(1.2)' },
                    '50%': { opacity: 0.8, filter: 'brightness(1)' },
                },
                float: {
                    '0%, 100%': { transform: 'translateY(0)' },
                    '50%': { transform: 'translateY(-10px)' },
                }
            },
        },
    },
    plugins: [],
}
