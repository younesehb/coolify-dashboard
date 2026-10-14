# Security policy

## Reporting a vulnerability

Please **do not open a public issue**. Report privately through GitHub:
[Report a vulnerability](https://github.com/younesehb/coolify-dashboard/security/advisories/new).

Include what you found, how to reproduce it, and the impact you expect. You will get an acknowledgement within a few days. Fixes are released as soon as practical, and you will be credited unless you prefer otherwise.

## Supported versions

Only the latest release and `main` receive security fixes.

## Scope

Launchpad holds a Coolify API token and can trigger deployments, so these matter most:

- Leaking the Coolify token or any Coolify data beyond the trimmed app list
- Running actions without `ACTIONS_PASSWORD`, or bypassing its rate limiting
- Using `/api/icon` or other endpoints to reach hosts that are not Coolify app domains (SSRF)
- Cross-site scripting through app names, descriptions, custom icons or wallpapers

Out of scope: anyone who can open the page seeing your app list. That is by design; put Launchpad behind authentication as the README explains.
