#!/usr/bin/env python3
"""
Ferramenta para medir tamanho do logo no vídeo
Extrai frame e calcula dimensões aproximadas
"""

import cv2
import sys
from pathlib import Path

def measure_logo(video_path, output_frame='frame_measured.jpg'):
    """
    Extrai primeiro frame e mostra informações do vídeo
    """
    try:
        cap = cv2.VideoCapture(video_path)

        # Ler primeiro frame
        ret, frame = cap.read()
        if not ret:
            print("❌ Erro ao ler vídeo")
            return

        height, width, _ = frame.shape

        # Salvar frame
        cv2.imwrite(output_frame, frame)

        print("✅ Frame extraído com sucesso!")
        print(f"\n📐 Dimensões do vídeo:")
        print(f"   Largura: {width}px")
        print(f"   Altura: {height}px")
        print(f"\n💾 Frame salvo em: {output_frame}")
        print(f"\n📋 Como usar:")
        print(f"   1. Abra {output_frame} em um editor de imagem")
        print(f"   2. Use a ferramenta de seleção retangular")
        print(f"   3. Selecione o logo antigo")
        print(f"   4. Anote: X, Y, Largura, Altura em pixels")
        print(f"\n💡 Exemplo de resultado esperado:")
        print(f"   X: 150, Y: 100, Largura: 200, Altura: 120")

        cap.release()

    except Exception as e:
        print(f"❌ Erro: {e}")
        sys.exit(1)

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python measure_logo.py <video_path>")
        sys.exit(1)

    video_path = sys.argv[1]
    measure_logo(video_path)
