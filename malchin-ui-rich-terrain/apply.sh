#!/bin/sh
set -e

if [ ! -d .git ]; then
  echo "Error: run this inside the Malchin repository root."
  exit 1
fi

branch=$(git branch --show-current)
if [ "$branch" != "ui" ]; then
  echo "Error: current branch is '$branch'. Switch to ui first: git switch ui"
  exit 1
fi

if [ -n "$(git status --porcelain)" ]; then
  echo "Error: working tree is not clean. Commit or stash your changes first."
  exit 1
fi

stamp=$(date +%Y%m%d-%H%M%S)
backup="ui-before-rich-terrain-$stamp"
git branch "$backup"
echo "Backup branch created: $backup"

script_dir=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
patch_file="$script_dir/terrain-upgrade.patch"

if git apply --check "$patch_file"; then
  git apply "$patch_file"
else
  echo "Normal patch context differs; trying Git 3-way apply..."
  git apply --3way "$patch_file"
fi

echo ""
echo "Terrain upgrade applied."
echo "Next run:"
echo "  bunx tsc --noEmit"
echo "  bun run dev"
echo ""
echo "If everything looks good:"
echo "  git add ."
echo "  git commit -m \"Upgrade procedural terrain and biome generation\""
echo "  git push origin ui"
echo ""
echo "To undo before committing: git reset --hard $backup"
