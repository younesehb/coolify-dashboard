# Third-party notices

Launchpad's own code is MIT licensed (see [LICENSE](LICENSE)). This repository also vendors the files below, which keep their original license.

## React Bits: `src/bits/GlassSurface.jsx`, `src/bits/Dock.jsx`

Source: https://github.com/DavidHDev/react-bits. Vendored unmodified apart from a header comment.

The Commons Clause allows using these components in any application, including commercially, but not selling or redistributing the components themselves. If you fork Launchpad, keep them as part of the app, not as a standalone component library.

```text
MIT + Commons Clause License Condition v1.0

Copyright (c) 2026 David Haz

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, and distribute the Software **as part of an application, website, or product**, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

## Commons Clause Restriction

You may use this Software, including for any commercial purpose, **so long as you do not sell, sublicense, or redistribute the components themselves-whether alone, in a bundle, or as a ported version.**

## No Warranty

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

```

## Coolify service logos

Service icons are loaded at runtime from the [Coolify repository](https://github.com/coollabsio/coolify) (`public/svgs`) via jsDelivr and are not bundled. Each logo remains the trademark of its owner.

## npm dependencies

Runtime dependencies (React, motion, dnd-kit, lucide-react) are MIT or ISC licensed. Run `npx license-checker --production --summary` for the full list.
