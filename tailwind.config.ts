import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        sticker: {
          yellow: "hsl(var(--sticker-yellow))",
          pink: "hsl(var(--sticker-pink))",
          blue: "hsl(var(--sticker-blue))",
          green: "hsl(var(--sticker-green))",
          orange: "hsl(var(--sticker-orange))",
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: {
            height: "0",
          },
          to: {
            height: "var(--radix-accordion-content-height)",
          },
        },
        "accordion-up": {
          from: {
            height: "var(--radix-accordion-content-height)",
          },
          to: {
            height: "0",
          },
        },
        "float-circular": {
          "0%": {
            transform: "translate(0px, 0px)",
          },
          "25%": {
            transform: "translate(3px, -3px)",
          },
          "50%": {
            transform: "translate(0px, -6px)",
          },
          "75%": {
            transform: "translate(-3px, -3px)",
          },
          "100%": {
            transform: "translate(0px, 0px)",
          },
        },
        "float-circular-2": {
          "0%": {
            transform: "translate(0px, 0px) rotate(0deg)",
          },
          "25%": {
            transform: "translate(4px, -2px) rotate(90deg)",
          },
          "50%": {
            transform: "translate(2px, -5px) rotate(180deg)",
          },
          "75%": {
            transform: "translate(-2px, -4px) rotate(270deg)",
          },
          "100%": {
            transform: "translate(0px, 0px) rotate(360deg)",
          },
        },
        "float-circular-3": {
          "0%": {
            transform: "translate(0px, 0px)",
          },
          "20%": {
            transform: "translate(5px, -1px)",
          },
          "40%": {
            transform: "translate(3px, -7px)",
          },
          "60%": {
            transform: "translate(-1px, -5px)",
          },
          "80%": {
            transform: "translate(-4px, -2px)",
          },
          "100%": {
            transform: "translate(0px, 0px)",
          },
        },
        "float-wobble": {
          "0%": {
            transform: "translate(0px, 0px) rotate(0deg)",
          },
          "15%": {
            transform: "translate(2px, -1px) rotate(-2deg)",
          },
          "30%": {
            transform: "translate(-1px, -3px) rotate(1deg)",
          },
          "45%": {
            transform: "translate(3px, -2px) rotate(-1deg)",
          },
          "60%": {
            transform: "translate(-2px, -4px) rotate(2deg)",
          },
          "75%": {
            transform: "translate(1px, -1px) rotate(-1deg)",
          },
          "100%": {
            transform: "translate(0px, 0px) rotate(0deg)",
          },
        },
        "float-bounce": {
          "0%, 100%": {
            transform: "translate(0px, 0px)",
          },
          "25%": {
            transform: "translate(2px, -8px)",
          },
          "50%": {
            transform: "translate(-1px, -3px)",
          },
          "75%": {
            transform: "translate(3px, -6px)",
          },
        },
        "shake": {
          '0%, 100%': { transform: 'translateX(0)' },
          '10%, 30%, 50%, 70%, 90%': { transform: 'translateX(-4px)' },
          '20%, 40%, 60%, 80%': { transform: 'translateX(4px)' },
        },
        "flash": {
          '0%': { opacity: '0' },
          '30%': { opacity: '1' },
          '100%': { opacity: '0' },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "bounce-in": "bounce 0.6s cubic-bezier(0.68, -0.55, 0.265, 1.55)",
        "pulse-soft": "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "float-circular": "float-circular 8s ease-in-out infinite",
        "float-circular-2": "float-circular-2 6s ease-in-out infinite",
        "float-circular-3": "float-circular-3 10s ease-in-out infinite",
        "float-wobble": "float-wobble 7s ease-in-out infinite",
        "float-bounce": "float-bounce 5s ease-in-out infinite",
      },
      backgroundImage: {
        "gradient-primary": "var(--gradient-primary)",
        "gradient-background": "var(--gradient-background)",
        "gradient-card": "var(--gradient-card)",
      },
      boxShadow: {
        "soft": "var(--shadow-soft)",
        "card": "var(--shadow-card)",
        "sticker": "var(--shadow-sticker)",
      },
      transitionTimingFunction: {
        "bounce": "cubic-bezier(0.68, -0.55, 0.265, 1.55)",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
