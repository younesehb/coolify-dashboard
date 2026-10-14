# Contributing

Thanks for helping make Launchpad better. Bug reports, ideas and pull requests are all welcome.

## Before you start

- **Bugs:** open an issue with steps to reproduce, your Coolify version and your browser.
- **Features:** open an issue first for anything bigger than a small fix, so we can agree on the approach before you spend time on it.
- **Security issues:** never in a public issue. See [SECURITY.md](SECURITY.md).

## Setup

You need Node 20+ (`nvm use` picks the version in `.nvmrc`).

```sh
npm install
npm run demo        # sample data, no Coolify needed
```

Against a real instance: copy `.env.example` to `.env`, fill in `COOLIFY_URL` and `COOLIFY_TOKEN`, then run `npm run dev:server` and `npm run dev` in two terminals.

## Project layout

| Path                        | What it is                                                                       |
| --------------------------- | -------------------------------------------------------------------------------- |
| `server.js`                 | Zero-dependency Node server: Coolify proxy, icon resolver, actions, static files |
| `demo.js`                   | Sample data for `DEMO=true`                                                      |
| `src/App.jsx`               | Home screen, widgets, search, dock, state                                        |
| `src/Grid.jsx`              | Icon grid, drag and drop, folders                                                |
| `src/Folder.jsx`            | Open folder panel                                                                |
| `src/Peek.jsx`              | Long-press card and actions                                                      |
| `src/Settings.jsx`          | Customise panel                                                                  |
| `src/prefs.js`              | Per-browser preferences                                                          |
| `src/bits/`                 | Vendored React Bits components (do not edit; see THIRD_PARTY_NOTICES.md)         |
| `DESIGN.md`, `PRODUCT.md`   | Design system and product notes                                                  |

## Pull requests

- Keep each PR focused on one change.
- Run `npm run check` (formatting, server syntax, production build). `npm run format` fixes formatting.
- For visual changes, attach before/after screenshots, ideally from `npm run demo` at desktop and phone width.
- Keep the server dependency-free unless there is a strong reason.
- Never commit tokens, passwords or real domains. Use `example.com` in examples.

## Releases

Maintainers add the release notes to `CHANGELOG.md` and tag `vX.Y.Z` on `main`. CI then publishes `ghcr.io/younesehb/coolify-dashboard:X.Y.Z`; every push to `main` also updates `:latest`.

By contributing you agree that your work is released under the [MIT License](LICENSE) and that you follow the [Code of Conduct](CODE_OF_CONDUCT.md).
