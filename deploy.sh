#!/bin/bash

# ===========================================
# Aurix Dashboard - VPS Deployment Script
# ===========================================

set -e

echo "=========================================="
echo "  Aurix Dashboard - VPS Deployment"
echo "=========================================="

# Update system
echo "[1/6] Updating system packages..."
apt update -y && apt upgrade -y

# Install Docker if not exists
if ! command -v docker &> /dev/null; then
    echo "[2/6] Installing Docker..."
    apt install -y docker.io docker-compose-plugin
    systemctl enable --now docker
else
    echo "[2/6] Docker already installed ✓"
fi

# Create app directory
APP_DIR="/root/aurix-dashboard"
echo "[3/6] Setting up application directory..."

if [ -d "$APP_DIR" ]; then
    cd $APP_DIR
    echo "Pulling latest changes..."
    git pull origin main
else
    echo "Cloning repository..."
    git clone https://github.com/komsan13/data-center.git $APP_DIR
    cd $APP_DIR
fi

# Create data directory for SQLite persistence
mkdir -p data

# Build and run with Docker Compose
echo "[4/6] Building Docker image..."
docker compose build --no-cache

echo "[5/6] Starting application..."
docker compose up -d

echo "[6/6] Checking status..."
sleep 5
docker compose ps

echo ""
echo "=========================================="
echo "  Deployment Complete! ✓"
echo "=========================================="
echo ""
echo "  Access your dashboard at:"
echo "  http://$(hostname -I | awk '{print $1}'):3000"
echo ""
echo "  Useful commands:"
echo "  - View logs:    docker compose logs -f"
echo "  - Restart:      docker compose restart"
echo "  - Stop:         docker compose down"
echo "  - Rebuild:      docker compose up -d --build"
echo ""
