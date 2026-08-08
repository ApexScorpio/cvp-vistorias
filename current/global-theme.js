/**
 * Global App Theme
 * Sets the app-wide theme by writing CSS custom properties to :root.
 * Uses CSS variables (not hardcoded hex) in the override style so that
 * per-form themes (set via applyTheme) can override the app theme on view.html.
 */
import { THEMES, applyTheme } from './themes.js';

export { THEMES };

export const APP_THEME_KEY = 'lp_app_theme';

/** Apply the saved global app theme — call once on each page load */
export function applyGlobalTheme() {
    const saved = localStorage.getItem(APP_THEME_KEY) || 'midnight';
    const theme = THEMES[saved] || THEMES.midnight;
    applyTheme(saved);
    injectAppOverride(theme);
    return saved;
}

/** Save a new global theme and reapply */
export function setGlobalTheme(themeId) {
    localStorage.setItem(APP_THEME_KEY, themeId);
    const theme = THEMES[themeId] || THEMES.midnight;
    applyTheme(themeId);
    injectAppOverride(theme);
}

/**
 * Injects (or updates) a <style id="gt-override"> that overrides
 * hardcoded colors in dashboard/admin/responses pages.
 * IMPORTANT: uses CSS variables (var(--theme-*)) instead of hardcoded hex,
 * so that applyTheme() on view.html can still override everything.
 * No !important used — CSS variables cascade naturally through the whole page.
 */
function injectAppOverride(t) {
    const isDark = isColorDark(t.heroEnd);
    const primaryContrast = getContrastText(t.primary);

    const css = `
/* ═══════════════════════════════════════════════
   APP THEME OVERRIDE — uses CSS vars, no !important
   Theme: ${t.id}
════════════════════════════════════════════════ */

body {
    background: linear-gradient(135deg, var(--theme-hero-start) 0%, var(--theme-hero-end) 100%);
    background-attachment: fixed;
    color: var(--theme-text-main);
}

/* Dashboard cards */
.form-card {
    background: var(--theme-card-bg);
    border-color: ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'};
}
.form-card:hover { border-color: var(--theme-primary); }
.form-title { color: var(--theme-text-main); }
.form-date { color: var(--theme-text-muted); }
.form-icon { background: rgba(0,0,0,0.15); color: var(--theme-primary); }

/* Header */
.user-email { color: var(--theme-text-muted); }
.logout-btn {
    background: var(--theme-pill-bg);
    border-color: var(--theme-pill-border);
    color: var(--theme-pill-text);
}

/* Buttons */
.btn-create, .btn-primary {
    background: var(--theme-primary);
    color: ${primaryContrast};
}
.btn-create:hover, .btn-primary:hover { background: var(--theme-primary-dark); }
.btn-cancel { background: var(--theme-pill-bg); color: var(--theme-pill-text); }
.action-btn { background: var(--theme-pill-bg); color: var(--theme-text-muted); }
.action-btn:hover { color: var(--theme-primary); }

/* Modals and panels */
.lp-modal-content, .form-info-card, .filter-container, .response-card, .admin-card, .stat-card {
    background: var(--theme-card-bg);
    border-color: ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.08)'};
}
.lp-modal-content h3 { color: var(--theme-text-main); }
.lp-modal-content p, .form-info-subtitle { color: var(--theme-text-muted); }

/* Responses */
.response-card:hover { background: var(--theme-pill-bg); }
.response-email { color: var(--theme-text-main); }
.response-date { color: var(--theme-text-muted); }
.answer-a {
    background: var(--theme-pill-bg);
    border-color: var(--theme-pill-border);
    color: var(--theme-text-main);
}
.answer-q { color: var(--theme-text-muted); }

/* Empty state */
.empty-state { background: var(--theme-card-bg); }
.empty-state p { color: var(--theme-text-muted); }

/* Filter / tab buttons */
.filter-btn {
    background: var(--theme-pill-bg);
    border-color: var(--theme-pill-border);
    color: var(--theme-pill-text);
}
.filter-btn:hover, .filter-btn.active {
    background: var(--theme-primary);
    color: ${primaryContrast};
    border-color: var(--theme-primary);
}

/* Admin */
.admin-tabs button { background: var(--theme-pill-bg); color: var(--theme-text-muted); }
.admin-tabs button.active { background: var(--theme-primary); color: ${primaryContrast}; }
table { background: var(--theme-card-bg); color: var(--theme-text-main); }
th { background: var(--theme-pill-bg); color: var(--theme-text-muted); }
td { color: var(--theme-text-main); }

/* Settings inputs */
.settings-group select, .settings-group textarea, .settings-group input {
    background: var(--theme-pill-bg);
    border-color: var(--theme-pill-border);
    color: var(--theme-pill-text);
}
.settings-group label { color: var(--theme-text-main); }
.dashboard-controls h2 { color: var(--theme-text-main); }
`;

    let styleEl = document.getElementById('gt-override');
    if (!styleEl) {
        styleEl = document.createElement('style');
        styleEl.id = 'gt-override';
        document.head.appendChild(styleEl);
    }
    styleEl.textContent = css;
}

function isColorDark(hex) {
    if (!hex) return true;
    hex = hex.replace('#', '');
    if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    return ((r * 299) + (g * 587) + (b * 114)) / 1000 < 128;
}

function getContrastText(hex) {
    return isColorDark(hex) ? '#ffffff' : '#0f172a';
}
