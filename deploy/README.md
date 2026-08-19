# Deploying the DIP Studio site

The site is live at **https://dip-studio.vercel.app** (also
`dip-studio-eynna-hair.vercel.app`). It is public — no login, no password.

## Why there are two configs

The Vercel account has two projects:

- **`claude-code`** — imported from `cipiforrest-create/Claude-code` and linked
  at the repository root, so it builds the old ONYX demo that still lives
  there. The root `vercel.json` in this repo fixes that project *if* it is ever
  pointed at `gekicluna42-spec/Claude-code`: it installs and builds
  `dip-studio/` and publishes `dip-studio/dist`.
- **`dip-studio`** — the project actually serving the site. It has no git link
  (Vercel's GitHub App is not installed on `gekicluna42-spec`), so its build
  clones this repository over HTTPS and builds the subproject. Those are the
  files in `vercel-bootstrap/`.

## Redeploying

Hit **Redeploy** on the `dip-studio` project. The build clones the branch fresh
every time, so the newest commit on
`claude/dip-studio-cinematic-redesign-a1l1vg` goes live — there is no webhook,
so a push alone does not trigger it.

To make pushes deploy automatically, install the Vercel GitHub App on the
`gekicluna42-spec` account and link the `dip-studio` project to this
repository. Then the root `vercel.json` takes over and `vercel-bootstrap/`
becomes unnecessary.

## Build settings on the `dip-studio` project

Set in `vercel-bootstrap/vercel.json`, not in the dashboard:

| Setting | Value |
| --- | --- |
| Install | `echo no dependencies to install` |
| Build | `bash build.sh` |
| Output | `dist` |
| Framework | none |

Puppeteer's Chromium download is skipped during install; it is only used by the
QA harness, never by the build.
