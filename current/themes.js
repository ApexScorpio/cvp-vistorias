/**
 * LPXForms - Premium Theme System
 * Each theme controls all visual properties:
 * background, card, pills, text, inputs, highlights.
 * Contrast-safe: light themes use dark text, dark themes use light text.
 */

export const THEMES = {

    // ─── 1. MIDNIGHT (Default — current dark cobalt scheme) ───────────────────
    midnight: {
        id: 'midnight',
        name: 'Midnight',
        emoji: '🌙',
        primary: '#3b82f6',
        primaryDark: '#1d4ed8',
        primaryLight: '#60a5fa',
        accent: '#60a5fa',
        heroStart: '#020617',
        heroEnd: '#0f172a',
        textMain: '#F8FAFC',
        textMuted: '#94A3B8',
        cardBg: '#111827',
        pillBg: '#1e293b',
        pillText: '#F8FAFC',
        pillBorder: 'rgba(255,255,255,0.1)',
        // Input fields
        inputBg: '#1e293b',
        inputBorder: '#334155',
        inputText: '#F8FAFC',
        inputBgHover: '#273549',
        swatch: 'linear-gradient(135deg, #020617 0%, #1d4ed8 100%)',
    },

    // ─── 2. SCARLET (Deep red — premium alert) ────────────────────────────────
    scarlet: {
        id: 'scarlet',
        name: 'Scarlet',
        emoji: '🔴',
        primary: '#ef4444',
        primaryDark: '#b91c1c',
        primaryLight: '#f87171',
        accent: '#f87171',
        heroStart: '#0c0a09',
        heroEnd: '#1c0909',
        textMain: '#FEF2F2',
        textMuted: '#FECACA',
        cardBg: '#140808',
        pillBg: '#1f0a0a',
        pillText: '#FEF2F2',
        pillBorder: 'rgba(239,68,68,0.25)',
        inputBg: '#1f0a0a',
        inputBorder: '#7f1d1d',
        inputText: '#FEF2F2',
        inputBgHover: '#2d0e0e',
        swatch: 'linear-gradient(135deg, #ef4444 0%, #7f1d1d 100%)',
    },

    // ─── 3. OBSIDIAN (Ultra dark charcoal + gold) ─────────────────────────────
    obsidian: {
        id: 'obsidian',
        name: 'Obsidian',
        emoji: '⬛',
        primary: '#d4a017',
        primaryDark: '#a07a0e',
        primaryLight: '#f5c842',
        accent: '#f5c842',
        heroStart: '#0a0a0a',
        heroEnd: '#111111',
        textMain: '#F5F5F0',
        textMuted: '#A8A89C',
        cardBg: '#141414',
        pillBg: '#1c1c1c',
        pillText: '#F5F5F0',
        pillBorder: 'rgba(212,160,23,0.2)',
        inputBg: '#1c1c1c',
        inputBorder: '#333333',
        inputText: '#F5F5F0',
        inputBgHover: '#242424',
        swatch: 'linear-gradient(135deg, #111111 0%, #d4a017 100%)',
    },

    // ─── 4. AURORA (Purple/violet — modern, Stripe-like) ──────────────────────
    aurora: {
        id: 'aurora',
        name: 'Aurora',
        emoji: '🌌',
        primary: '#8b5cf6',
        primaryDark: '#6d28d9',
        primaryLight: '#a78bfa',
        accent: '#a78bfa',
        heroStart: '#0f0217',
        heroEnd: '#1a0533',
        textMain: '#FAF5FF',
        textMuted: '#C4B5FD',
        cardBg: '#160525',
        pillBg: '#1e0a36',
        pillText: '#FAF5FF',
        pillBorder: 'rgba(139,92,246,0.25)',
        inputBg: '#1e0a36',
        inputBorder: '#4c1d95',
        inputText: '#FAF5FF',
        inputBgHover: '#270d45',
        swatch: 'linear-gradient(135deg, #6d28d9 0%, #a78bfa 100%)',
    },

    // ─── 5. OCEAN (Deep teal/cyan) ────────────────────────────────────────────
    ocean: {
        id: 'ocean',
        name: 'Ocean',
        emoji: '🌊',
        primary: '#06b6d4',
        primaryDark: '#0e7490',
        primaryLight: '#22d3ee',
        accent: '#22d3ee',
        heroStart: '#020e14',
        heroEnd: '#041a24',
        textMain: '#ECFEFF',
        textMuted: '#67E8F9',
        cardBg: '#061820',
        pillBg: '#082030',
        pillText: '#ECFEFF',
        pillBorder: 'rgba(6,182,212,0.25)',
        inputBg: '#082030',
        inputBorder: '#164e63',
        inputText: '#ECFEFF',
        inputBgHover: '#0c2840',
        swatch: 'linear-gradient(135deg, #0e7490 0%, #22d3ee 100%)',
    },

    // ─── 6. EMERALD (Rich green) ──────────────────────────────────────────────
    emerald: {
        id: 'emerald',
        name: 'Emerald',
        emoji: '💚',
        primary: '#10b981',
        primaryDark: '#047857',
        primaryLight: '#34d399',
        accent: '#34d399',
        heroStart: '#020e09',
        heroEnd: '#041c10',
        textMain: '#F0FDF4',
        textMuted: '#6EE7B7',
        cardBg: '#061409',
        pillBg: '#072010',
        pillText: '#F0FDF4',
        pillBorder: 'rgba(16,185,129,0.25)',
        inputBg: '#072010',
        inputBorder: '#064e3b',
        inputText: '#F0FDF4',
        inputBgHover: '#0a2e16',
        swatch: 'linear-gradient(135deg, #047857 0%, #34d399 100%)',
    },

    // ─── 7. PEARL (Clean white — Linear/Notion style) ─────────────────────────
    pearl: {
        id: 'pearl',
        name: 'Pearl',
        emoji: '⚪',
        primary: '#2563eb',
        primaryDark: '#1d4ed8',
        primaryLight: '#3b82f6',
        accent: '#2563eb',
        heroStart: '#f8fafc',
        heroEnd: '#f1f5f9',
        textMain: '#0f172a',
        textMuted: '#64748b',
        cardBg: '#ffffff',
        pillBg: '#f1f5f9',
        pillText: '#1e293b',
        pillBorder: '#cbd5e1',
        inputBg: '#ffffff',
        inputBorder: '#e2e8f0',
        inputText: '#0f172a',
        inputBgHover: '#f8fafc',
        swatch: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
    },

    // ─── 8. SOLAR (Warm amber/orange, light) ──────────────────────────────────
    solar: {
        id: 'solar',
        name: 'Solar',
        emoji: '☀️',
        primary: '#d97706',
        primaryDark: '#b45309',
        primaryLight: '#f59e0b',
        accent: '#f59e0b',
        heroStart: '#fffbeb',
        heroEnd: '#fef3c7',
        textMain: '#451a03',
        textMuted: '#92400e',
        cardBg: '#ffffff',
        pillBg: '#fff7ed',
        pillText: '#7c2d12',
        pillBorder: '#fed7aa',
        inputBg: '#ffffff',
        inputBorder: '#fdba74',
        inputText: '#451a03',
        inputBgHover: '#fff7ed',
        swatch: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
    },

};

export const DEFAULT_THEME = 'midnight';

export function applyTheme(themeId) {
    const theme = THEMES[themeId] || THEMES[DEFAULT_THEME];
    const root = document.documentElement;

    // Core brand colors
    root.style.setProperty('--theme-primary', theme.primary);
    root.style.setProperty('--theme-primary-dark', theme.primaryDark);
    root.style.setProperty('--theme-primary-light', theme.primaryLight);
    root.style.setProperty('--theme-accent', theme.accent);

    // Background gradients
    root.style.setProperty('--theme-hero-start', theme.heroStart);
    root.style.setProperty('--theme-hero-end', theme.heroEnd);

    // Typography
    root.style.setProperty('--theme-text-main', theme.textMain);
    root.style.setProperty('--theme-text-muted', theme.textMuted);

    // Card/container background
    root.style.setProperty('--theme-card-bg', theme.cardBg);

    // Pills (choice buttons)
    root.style.setProperty('--theme-pill-bg', theme.pillBg);
    root.style.setProperty('--theme-pill-text', theme.pillText);
    root.style.setProperty('--theme-pill-border', theme.pillBorder);

    // Input fields (text, date, textarea)
    root.style.setProperty('--theme-input-bg', theme.inputBg);
    root.style.setProperty('--theme-input-border', theme.inputBorder);
    root.style.setProperty('--theme-input-text', theme.inputText);
    root.style.setProperty('--theme-input-bg-hover', theme.inputBgHover);

    document.documentElement.dataset.theme = theme.id;
}
