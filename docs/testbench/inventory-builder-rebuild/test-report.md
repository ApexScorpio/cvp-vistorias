# TEST REPORT & VERIFICATION BASELINE
Data: 2026-09-11 18:05:00

## 1. Syntax Verification (node --check)
- inventario.js: PASS (0 errors)
- public_html/inventario.js: PASS (0 errors)

## 2. Mirror Parity Verification (SHA-256 Byte-Equality)
- inventario.html == public_html/inventario.html: true (9717cd0be3bf6280cc1d95787b9badb30e25b794ab6c5fd4c1e3d4ebcf0282af)
- inventario.js == public_html/inventario.js: true (f8e5d749bd8b6c63ef6366cf687a9db5dc1f3bf3dafcd0e5c698c035dc93e330)
- inventory-pills.css == public_html/inventory-pills.css: true (6dfd51578ec4dc2b42942a4546477393f6aff52255990993e92e90028632a2a5)

## 3. Protected File Integrity (inventory_view.html)
- Expected Protected SHA-256: 3273338c0d45d1bad711676e53b9858cd9d71b98b5d8d1ad0bc6a0cea0c1876b
- Root Hash: 3273338c0d45d1bad711676e53b9858cd9d71b98b5d8d1ad0bc6a0cea0c1876b
- Mirror Hash: 3273338c0d45d1bad711676e53b9858cd9d71b98b5d8d1ad0bc6a0cea0c1876b
- Untouched Status: true

## 4. Real Form Verification
- Form ID: 9LtmhbAdkb9ZcCEX6TEv (Check List - Material)
- Rest Layout Verified: Cruz Vermelha Portuguesa Portimão cover, 24 schema blocks, counters, resting pill widths intact.
- Interactivity Verified: Pill text editing, QT counts, + row adder, settings popover, location switching.
