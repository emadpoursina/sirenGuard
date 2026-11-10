# sirenGuard

macOS menu-bar utility with a floating lock button.

## Website target patterns

Flagged websites accept a hostname, an optional subdomain wildcard, and an optional path:

- `youtube.com` — any page on youtube.com
- `*.youtube.com` or `*youtube.com` — youtube.com and its subdomains
- `youtube.com/shorts` — only `/shorts` and pages under it
- `*youtube.com/shorts` — only Shorts on youtube.com and its subdomains
- `youtube.com/shorts*` — wildcard path match

## Setup

```bash
bun install
```

## Run

```bash
bun start
```
