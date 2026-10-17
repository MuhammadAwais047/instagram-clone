# Fotogram — Instagram Clone 📸

An Instagram-style photo social app built with **pure vanilla JavaScript** — no frameworks, no build step, no API keys.

**Live demo:** https://muhammadawais047.github.io/instagram-clone/

## Features

- **Feed** — 12 seeded demo posts with photos from [picsum.photos](https://picsum.photos) (stable, seeded URLs)
- **Likes** — tap the heart or **double-click the photo** for the classic pop animation; state persists
- **Comments** — view the last 2, expand all, and add your own
- **Save** — bookmark posts (turns blue, persists)
- **Share** — uses the native share sheet where available, clipboard fallback otherwise
- **Stories** — tap a story ring for the full-screen viewer with 5s auto-advancing progress bars, prev/next, keyboard arrows, and "seen" ring dimming
- **Create** — compose posts with a shuffleable random photo and caption; new posts prepend to the feed and demo fans like/comment them while you watch
- **Explore** — grid of every post with hover stats; clicking a tile jumps to it in the feed
- **Profile** — your post count, likes given, comments written, and your photo grid
- **Notifications** — bell dropdown with unseen-dot; demo users follow/like/comment on your posts
- **Suggestions** — follow/unfollow demo users

Everything (posts, likes, comments, follows, seen stories) is stored in `localStorage` — each visitor gets their own little social network.

## Tech

- Single-page app in one `index.html` + `styles.css` + `app.js` (~600 lines of JS, zero dependencies)
- All rendering goes through `createElement` / `textContent` (no `innerHTML` with user data → XSS-safe)
- `prefers-reduced-motion` respected, keyboard accessible (Esc closes overlays, visible focus rings)
- Responsive: sidebar hides under 880px, profile stacks under 560px

## Run locally

```bash
python -m http.server 8080
# then open http://localhost:8080
```

(Any static server works — or just open `index.html` directly.)

---

Demo photos are served by picsum.photos and are placeholder images only. Built by [Muhammad Awais](https://github.com/MuhammadAwais047) as portfolio project #14.
