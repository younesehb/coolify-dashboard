# Changelog

All notable changes to this project are documented here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses [Semantic Versioning](https://semver.org/).

## [1.4.0] - 2026-10-16

### Added

- Custom links: add any website or tool as an icon on the home screen, with its site icon or your own; links can be dragged into folders, searched, edited and removed.
- Coolify databases on the home screen with their logos and status, plus Start, Restart and Stop actions.
- Coolify widget (projects, servers, apps, databases, running count, version) and Deployments widget (running and recent deployments with commit and result).
- Containers browser: every Docker container with live CPU, memory, network and disk I/O, sortable, searchable and groupable by project; each app's peek card shows its own containers. Uses `DOCKER_HOST`, ideally a read-only socket proxy.

### Fixed

- Tall peek cards no longer cover the lifted icon; they centre and scroll when there is no room.

## [1.3.0] - 2026-10-15

### Added

- Server widget with the device name, OS, CPU model, memory, disk and uptime, and an *About This Server* sheet with kernel, architecture, platform, load and Coolify version. `SERVER_NAME` overrides the name.
- A status dot on every app and folder icon, and real framework and service logos in the demo.

### Changed

- Demo mode now describes an obviously fictional machine; it never reads the host it runs on.
- Image builds time out after 30 minutes and newer pushes supersede running builds.

## [1.2.0] - 2026-10-14

### Added

- System widgets: CPU, memory and disk gauges, memory and storage usage, and network in/out with a 10-minute sparkline. Sampled from procfs every 5 seconds, no dependencies. Network traffic needs `/proc` mounted read-only and `HOST_PROC` (see README).
- `/api/metrics` endpoint, `HOST_PROC` and `DISK_PATH` settings, and simulated metrics in demo mode.

## [1.1.0] - 2026-10-14

### Added

- Launchpad logo, favicon, home-screen icons and a web app manifest: add it to your phone's home screen and it opens full screen.
- Demo GIF, social preview card, FAQ and roadmap in the README.

## [1.0.0] - 2026-10-14

### Added

- Home screen for every Coolify application and service: logos, status, domains, projects and environments, read live from the Coolify API.
- Liquid-glass widgets (health, instance totals, needs attention), greeting, search bar and Spotlight-style search (`⌘K`).
- Drag-and-drop icon ordering, folders (hold one icon over another), and sorting by name, status, recent deploy or project.
- Long-press / right-click peek card with quick links and Redeploy, Restart, Stop and Start behind `ACTIONS_PASSWORD`, with a progress ring until Coolify finishes.
- macOS-style magnifying dock, live status alerts, and phone layout.
- Customise panel: wallpapers and uploads, glass blur and frost, icon size, widgets, dock, hidden and renamed apps, custom icons, export/import.
- Demo mode (`DEMO=true`), Docker image on GHCR, Docker Compose file.

[1.4.0]: https://github.com/younesehb/coolify-dashboard/releases/tag/v1.4.0
[1.3.0]: https://github.com/younesehb/coolify-dashboard/releases/tag/v1.3.0
[1.2.0]: https://github.com/younesehb/coolify-dashboard/releases/tag/v1.2.0
[1.1.0]: https://github.com/younesehb/coolify-dashboard/releases/tag/v1.1.0
[1.0.0]: https://github.com/younesehb/coolify-dashboard/releases/tag/v1.0.0
