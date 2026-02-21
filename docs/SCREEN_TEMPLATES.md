## 2026-02-10 — Media Delivery Governance Locked: Public vs Private (Supabase)

### Decision
Adopt **Option 1** for Supabase delivery: make `product-media` bucket **PUBLIC** and deliver product images via stable public URLs (no signed tokens) to enable CDN + `expo-image` disk caching and eliminate tile/list rendering delays.

### Tiered Delivery Policy (by MediaKind)
- **Public:**
  - `product-image` → `product-media` (PUBLIC)
  - `business-logo`, `business-cover` → `business-assets` (PUBLIC by default)
- **Private (signed URLs only when needed):**
  - `user-avatar`, `user-cover` → `user-media` (PRIVATE by default)

### Non-negotiable Rules
1. Never sign what you do not need to protect.
2. Public buckets must return stable `getPublicUrl(path)` URLs.
3. If private signed URLs are used, the API must cache and reuse signed URLs per `{bucket,path}` until near expiry (do not rotate per read).
4. Public image cache headers must be aggressive for immutable assets.
5. Mobile uses `expo-image` with disk cache for list/tile surfaces; web consumes the same delivery URLs.

## 2026-02-05 — Memory and State Management

...

---

### 3.4 Media governance

...

AI background removal is allowed **only** for product images, not avatars/covers/logos.

#### 3.4.1 Media delivery governance (public vs private) — locked
BizAssist must use a tiered delivery policy by `MediaKind` to balance POS-grade performance with privacy.

**Public delivery (stable URLs; cache-friendly; recommended for speed):**
- `product-image` → bucket `product-media` **PUBLIC**
- `business-logo`, `business-cover` → bucket `business-assets` **PUBLIC** (default)

**Private delivery (signed URLs; used only when privacy is required):**
- `user-avatar`, `user-cover` → bucket `user-media` **PRIVATE** by default

**Rules (non-negotiable):**
1. **Never sign what you do not need to protect.** Signed URLs introduce cache misses and list/tile latency in mobile and web.
2. **Public buckets must return stable public URLs** via `getPublicUrl(path)` (no token query params). These URLs are the canonical delivery format for product and business branding images.
3. **Private buckets may return signed URLs**, but the API must not rotate URL identities on every read:
   - Cache `{bucket, path} → {signedUrl, expiresAt}` and reuse until near expiry (refresh only within a short grace window).
4. **Cache headers for public images must be aggressive** for immutable assets (e.g., `public, max-age=31536000, immutable`) to maximize CDN + client cache hit rate.
5. **Mobile must use `expo-image` with disk cache** for list/tile surfaces.
6. **Web must consume the same delivery URLs** (public URLs for product/branding; signed URLs only for user-private media when required).

**Objective:** Product and POS tile imagery must be instant after first load; privacy controls apply only to user identity media.
