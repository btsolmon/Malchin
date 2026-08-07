# Malchin ui — Rich Terrain Upgrade

This patch is designed for the `ui` branch structure.

## What it changes

- Adds `lib/game/terrainGenerator.ts`
- Adds deterministic seeded terrain generation
- Adds elevation, moisture, fertility, roughness and heat maps
- Replaces straight biome boundaries with irregular natural transitions
- Adds meadow, dry-steppe and rocky biome behavior
- Makes tree/bush/stone placement biome-aware and deterministic
- Reworks base terrain shading around biome/elevation/moisture
- Adds richer grass/flower/rock/reed terrain clusters
- Makes puddles prefer lower, wetter terrain
- Adds permanent soft dirt paths between important world areas
- Keeps the existing river geometry/current system
- Keeps summer/winter terrain caches

## Apply

1. Extract this ZIP anywhere.
2. Open Terminal in the root of your Malchin repository.
3. Make sure you are on `ui` and your working tree is clean:

```bash
git switch ui
git status
```

4. Run the installer using the extracted script path, for example:

```bash
zsh ~/Downloads/malchin-ui-rich-terrain/apply.sh
```

The script creates a backup branch before changing files.

## Verify

```bash
bunx tsc --noEmit
bun run dev
```

Then test the whole map, especially forest/desert transitions, river ford, camp area, puddles and object placement.

## Commit

```bash
git add .
git commit -m "Upgrade procedural terrain and biome generation"
git push origin ui
```

## Undo

The installer prints the backup branch name. Before committing, you can restore with:

```bash
git reset --hard <backup-branch-name>
```
