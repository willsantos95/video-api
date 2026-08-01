#!/bin/sh
# Script para instalar OpenCV no container (opcional)
# Use se precisar de detecção automática de logo

echo "================================"
echo "Instalando OpenCV + Build Tools"
echo "================================"

echo "Instalando compilador e ferramentas de build..."
apk add --no-cache gcc g++ musl-dev make cmake ninja git

echo ""
echo "Instalando OpenCV (pode demorar 10-15 minutos)..."
pip3 install --no-cache-dir --break-system-packages opencv-python-headless

echo ""
echo "Verificando instalação..."
python3 -c "import cv2; print('✓ OpenCV instalado com sucesso! Versão:', cv2.__version__)"

echo ""
echo "================================"
echo "✓ Instalação completa!"
echo "================================"
echo ""
echo "Agora você pode usar:"
echo "  - POST /api/video/detect-logo"
echo "  - 🔍 Detect Logo Position na interface"
echo ""
