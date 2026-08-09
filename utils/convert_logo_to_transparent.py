#!/usr/bin/env python3
"""
Converte uma logo para PNG com fundo transparente
Remove fundo branco, preto ou cinza
"""
import sys
import cv2
import numpy as np
from pathlib import Path

def remove_background(image_path, output_path=None, threshold=10):
    """
    Remove fundo de uma logo (branco, preto ou cinza)
    e salva como PNG com transparência
    """
    # Ler imagem
    img = cv2.imread(image_path, cv2.IMREAD_UNCHANGED)

    if img is None:
        print(f"❌ Erro: Não foi possível ler a imagem: {image_path}")
        return False

    print(f"📊 Imagem original:")
    print(f"   Dimensões: {img.shape[1]}x{img.shape[0]}")

    # Converter para RGBA se necessário
    if len(img.shape) == 2:
        # Escala de cinza
        print("   Formato: Escala de cinza")
        img = cv2.cvtColor(img, cv2.COLOR_GRAY2BGR)
    elif img.shape[2] == 3:
        # BGR sem alpha
        print("   Formato: BGR (sem canal alfa)")
    elif img.shape[2] == 4:
        print("   Formato: RGBA (já tem transparência)")

    # Converter para BGRA
    if img.shape[2] == 3:
        img_bgra = cv2.cvtColor(img, cv2.COLOR_BGR2BGRA)
    else:
        img_bgra = img.copy()

    # Detectar fundo para remover
    # Usar maior frequência de cores como fundo (geralmente branco)

    # Converter para HSV para melhor detecção de cor
    img_hsv = cv2.cvtColor(img[:, :, :3], cv2.COLOR_BGR2HSV)

    # Detectar cores similares (fundo)
    # Branco em HSV: alto V (brilho), baixo S (saturação)
    lower_white = np.array([0, 0, 200])
    upper_white = np.array([180, 30, 255])

    mask_white = cv2.inRange(img_hsv, lower_white, upper_white)

    # Detectar preto
    lower_black = np.array([0, 0, 0])
    upper_black = np.array([180, 255, 50])
    mask_black = cv2.inRange(img_hsv, lower_black, upper_black)

    # Combinar máscaras
    mask = cv2.bitwise_or(mask_white, mask_black)

    # Aplicar dilatação e erosão para melhorar
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (3, 3))
    mask = cv2.morphologyEx(mask, cv2.MORPH_OPEN, kernel, iterations=1)

    # Inverter máscara (queremos manter o que NÃO é fundo)
    mask_inv = cv2.bitwise_not(mask)

    # Aplicar máscara ao canal alpha
    img_bgra[:, :, 3] = mask_inv

    # Salvar resultado
    if output_path is None:
        base = Path(image_path).stem
        output_path = Path(image_path).parent / f"{base}_transparent.png"

    success = cv2.imwrite(str(output_path), img_bgra, [cv2.IMWRITE_PNG_COMPRESSION, 9])

    if success:
        print(f"\n✅ Logo convertida com sucesso!")
        print(f"   Salvo em: {output_path}")

        # Verificar resultado
        alpha = img_bgra[:, :, 3]
        has_trans = np.any(alpha < 255)
        if has_trans:
            print(f"   ✅ Transparência detectada")
            print(f"   Alpha min/max/média: {alpha.min()}/{alpha.max()}/{alpha.mean():.0f}")

        return True
    else:
        print(f"\n❌ Erro ao salvar: {output_path}")
        return False

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Uso: python3 convert_logo_to_transparent.py <imagem_entrada> [saida.png]")
        print("\nExemplo:")
        print("  python3 convert_logo_to_transparent.py logo.jpg")
        print("  python3 convert_logo_to_transparent.py logo.jpg logo_transparent.png")
        sys.exit(1)

    input_path = sys.argv[1]
    output_path = sys.argv[2] if len(sys.argv) > 2 else None

    print("🔄 Convertendo logo para PNG com transparência...")
    print("="*50)

    if remove_background(input_path, output_path):
        print("\n" + "="*50)
        print("✅ Pronto para usar! Use o novo arquivo PNG no /api/video/add-logo")
    else:
        print("\n" + "="*50)
        print("❌ Erro na conversão. Tente:")
        print("   1. Usar uma imagem PNG ao invés de JPG")
        print("   2. Usar uma imagem com fundo mais uniforme")
        sys.exit(1)
