# RVASCII — Runbooks

**Language:** Think in English. Respond to user in Russian.

## Runbook: Deploy to GitHub Pages

```bash
npm run build
cd dist
git init
git remote add origin https://github.com/rdzhbv/rvascii.git
git checkout -b gh-pages
git add -A && git commit -m "deploy"
git push -u origin gh-pages --force
```

Then enable Pages in repo settings → branch `gh-pages` → `/ (root)`.

## Runbook: Add a new charset preset

1. Open `src/types.ts`
2. Add entry to `CHARSET_PRESETS` array:
   ```ts
   { id: 'my-preset', name: 'My Preset', chars: ' .-:=+#%@█' }
   ```
3. UI automatically picks it up (no changes to controls needed)

## Runbook: Add a new color filter

1. Open `src/types.ts`
2. Add entry to `COLOR_FILTERS` array:
   ```ts
   { id: 'my-filter', name: 'My Filter', type: 'palette', colors: [[...], [...]] }
   ```
3. UI automatically picks it up

## Runbook: Update AGENTS.md

After any change to:
- `src/types.ts` (new types or presets)
- New module added to `src/`
- Export format added
- Pipeline changed

→ Update `AGENTS.md` to reflect the change.

## Runbook: Create a new agent

1. Create `.opencode/agents/<name>.md`
2. Set `mode: subagent` (or `primary` if it should be default)
3. Define `permission` block
4. Write prompt in English with language instruction
5. Update `PROJECT.md` agent table if needed
