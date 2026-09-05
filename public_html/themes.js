// LPXForms Theme Engine
export const THEMES = {
    cobalt: {
        id: 'cobalt',
        name: 'Cobalt Blue',
        primary: '#3b82f6',
        heroStart: '#020617',
        heroMid: '#1e293b',
        heroEnd: '#0f172a',
        cardBg: '#0b1120',
        textMain: '#f8fafc'
    },
    midnight: {
        id: 'midnight',
        name: 'Midnight Dark',
        primary: '#6366f1',
        heroStart: '#090d16',
        heroMid: '#111827',
        heroEnd: '#030712',
        cardBg: '#0f172a',
        textMain: '#f8fafc'
    },
    emerald: {
        id: 'emerald',
        name: 'Emerald Green',
        primary: '#10b981',
        heroStart: '#022c22',
        heroMid: '#064e3b',
        heroEnd: '#0f172a',
        cardBg: '#06201b',
        textMain: '#f8fafc'
    },
    crimson: {
        id: 'crimson',
        name: 'Crimson Red',
        primary: '#ef4444',
        heroStart: '#450a0a',
        heroMid: '#7f1d1d',
        heroEnd: '#0f172a',
        cardBg: '#1c0909',
        textMain: '#f8fafc'
    },
    amber: {
        id: 'amber',
        name: 'Warm Amber',
        primary: '#f59e0b',
        heroStart: '#451a03',
        heroMid: '#78350f',
        heroEnd: '#0f172a',
        cardBg: '#1c1106',
        textMain: '#f8fafc'
    }
};

export function applyTheme(themeId) {
    const t = THEMES[themeId] || THEMES.cobalt;
    const root = document.documentElement;
    root.style.setProperty('--theme-primary', t.primary);
    root.style.setProperty('--theme-hero-start', t.heroStart);
    root.style.setProperty('--theme-hero-mid', t.heroMid);
    root.style.setProperty('--theme-hero-end', t.heroEnd);
    root.style.setProperty('--theme-card-bg', t.cardBg);
    root.style.setProperty('--theme-text-main', t.textMain);
}

if (typeof window !== 'undefined') {
    window.applyTheme = applyTheme;
    window.THEMES = THEMES;
}
