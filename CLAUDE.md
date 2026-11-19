# Ivy Shelf — notes for Claude

Personal book & game tracker PWA. The app lives in `hollow-shelf/` (served by GitHub Pages at
https://caro1ferreira.github.io/hollow-shelf/hollow-shelf/). Do not rename that folder or the repo:
the URL is what keeps Carol's on-device data.

## Standing rule: keep the README current
Every time something changes in the app (feature, fix, theme, friend, outfit, server), in the same push:
1. Update `README.md`: the relevant feature section and a new entry at the top of the **Changelog**
   (version + date + short bullets). Update the Roadmap checkboxes when an item ships.
2. Refresh the images in `docs/readme/` that show the changed screens (phone-framed screenshots,
   banner, friends sheet, theme gallery). Use sample data, never Carol's real library.
3. Bump the version shown in Settings (`js/app.js`) and the service-worker cache name (`sw.js`).

## Other conventions
- No secrets in the repo; API keys live only as Cloudflare Worker secrets.
- Keep storage key `ivy-hollow-shelf` and existing state fields backwards-compatible (`normalize()`).
- Game-inspired themes: colour/mood only — no logos, characters, names or game assets in the UI.
- Commit messages end with the Co-Authored-By / Claude-Session lines from the session.
