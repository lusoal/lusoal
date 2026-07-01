# Profile automation

Two independent things power this profile:

1. **GitHub metrics SVG** (`.github/workflows/metrics.yml`) — renders GitHub
   stats as a static SVG committed to the repo, so the README image never breaks
   (the public `github-readme-stats` service returns 503 under rate limits).
2. **AI usage stats** (`stats/`) — real Claude Code usage badges, below.

## One-time setup: GitHub metrics token

`lowlighter/metrics` needs a token to read your stats:

1. Create a **classic** Personal Access Token at
   <https://github.com/settings/tokens> with scopes `repo` and `read:org`
   (add `read:user` for account stats).
2. Add it as a repo secret named **`METRICS_TOKEN`**:
   `gh secret set METRICS_TOKEN` (paste the token when prompted).
3. Trigger the workflow once: `gh workflow run "GitHub metrics"`.

It then runs daily and commits `github-metrics.svg` +
`github-metrics-languages.svg`, which the README references.

---

# AI usage stats

Real Claude Code usage badges on my profile, aggregated across every machine I
work on. **Safe metrics only** — token counts and active days. Never prompts,
code, project names, or dollar cost (see `collect.mjs`).

## How it works

```
each machine ──> collect.mjs ──> stats/data/<machine>.json ──> git push
                                                                    │
                                          GitHub Action ──> render.mjs ──> README badges
```

`ccusage` reads Claude Code's local logs, so collection must run **on each
machine** — a GitHub Action alone can't see them.

## Set up a machine (run once per machine)

Requires Node 22+. Pick a unique `MACHINE` name per machine (e.g. `amazon`,
`personal`).

Run the collector, commit, and push:

```bash
cd path/to/lusoal
MACHINE=amazon node stats/collect.mjs   # or MACHINE=personal on your PC
git add stats/data/ && git commit -m "chore: update ai stats (amazon)" && git push
```

The push triggers the Action, which re-renders the README badges from all
machine files.

## Automate it (optional)

**macOS (launchd)** or **Linux (cron)** — run daily. Example cron entry:

```cron
0 20 * * *  cd ~/path/to/lusoal && git pull --quiet && MACHINE=amazon node stats/collect.mjs && git add stats/data && git commit -m "chore: ai stats" --quiet && git push --quiet
```

Use the matching `MACHINE` value on each host.
