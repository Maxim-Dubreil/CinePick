#!/bin/bash
PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
SYNC_DIR="$HOME/cinepick-claude-sync"

mkdir -p "$SYNC_DIR"

cp "$PROJECT_DIR/TASKS.md" "$SYNC_DIR/"
cp "$PROJECT_DIR/AGENTS.md" "$SYNC_DIR/"
cp "$PROJECT_DIR/ARCHITECTURE.md" "$SYNC_DIR/"
cp "$PROJECT_DIR/CONSTRAINTS.md" "$SYNC_DIR/"
cp "$PROJECT_DIR/PRD.md" "$SYNC_DIR/"
cp "$PROJECT_DIR/ONBOARDING.md" "$SYNC_DIR/"

echo "✓ Docs copiées dans $SYNC_DIR"
echo "→ Upload ces fichiers dans ton projet Claude.ai"
xdg-open "https://claude.ai" 2>/dev/null || true
