#!/usr/bin/env bash
# Deploy na VPS: rode DENTRO da VPS, na pasta do repositório.
# Uso: ./deploy.sh            (usa os valores padrão abaixo)
#      SITE_DIR=/var/www/app BRANCH=main ./deploy.sh
set -euo pipefail

BRANCH="${BRANCH:-main}"
SITE_DIR="${SITE_DIR:-/var/www/html}"   # pasta servida pelo nginx (ajuste)
RELOAD_NGINX="${RELOAD_NGINX:-0}"       # 1 para recarregar o nginx ao final

cd "$(dirname "$0")"

echo "==> Atualizando código ($BRANCH)"
git fetch origin "$BRANCH"
git checkout "$BRANCH"
git pull --ff-only origin "$BRANCH"

echo "==> Instalando dependências"
npm ci

echo "==> Gerando build"
npm run build

echo "==> Publicando em $SITE_DIR"
mkdir -p "$SITE_DIR"
BACKUP="${SITE_DIR%/}.bak"
rm -rf "$BACKUP"
cp -a "$SITE_DIR" "$BACKUP" 2>/dev/null || true
rsync -a --delete dist/ "$SITE_DIR"/

if [ "$RELOAD_NGINX" = "1" ]; then
  echo "==> Recarregando nginx"
  sudo nginx -t && sudo systemctl reload nginx
fi

echo "==> Deploy concluído ($(git rev-parse --short HEAD)). Backup anterior em $BACKUP"
