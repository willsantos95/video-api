#!/usr/bin/env python3
"""
Verifica se uma imagem de logo tem canal alfa (transparência)
"""
import sys
import cv2
import numpy as np

def check_transparency(image_path):
    # Ler imagem com alpha channel
    img = cv2.imread(image_path, cv2.IMREAD_UNCHANGED)

    if img is None:
        print(f"❌ Erro: Não foi possível ler a imagem: {image_path}")
        return False

    print(f"📊 Informações da Imagem:")
    print(f"   Caminho: {image_path}")
    print(f"   Dimensões: {img.shape[1]}x{img.shape[0]}")
    print(f"   Canais: {img.shape[2] if len(img.shape) > 2 else 1}")

    # Verificar se tem canal alfa
    if len(img.shape) == 2:
        print(f"\n❌ Não tem canais de cor (imagem em escala de cinza)")
        return False

    if img.shape[2] < 4:
        print(f"\n❌ Não tem canal alfa (RGBA). Canais: {img.shape[2]}")
        print(f"   Formato atual: {'BGR' if img.shape[2] == 3 else 'outro'}")
        return False

    # Tem canal alfa
    alpha_channel = img[:,:,3]

    # Verificar se o alpha não é totalmente opaco
    has_transparency = np.any(alpha_channel < 255)
    has_semi_transparency = np.any((alpha_channel > 0) & (alpha_channel < 255))

    print(f"\n✅ Tem canal alfa (RGBA)")
    print(f"   Min alpha: {alpha_channel.min()}")
    print(f"   Max alpha: {alpha_channel.max()}")
    print(f"   Média alpha: {alpha_channel.mean():.2f}")

    if has_transparency:
        print(f"   ✅ Contém áreas transparentes")
        if has_semi_transparency:
            print(f"   ✅ Contém áreas semi-transparentes (anti-aliasing)")
    else:
        print(f"   ❌ Não contém áreas transparentes (alpha=255 em toda parte)")

    return has_transparency

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Uso: python3 check_logo_transparency.py <caminho_logo>")
        print("\nExemplo:")
        print("  python3 check_logo_transparency.py logo.png")
        sys.exit(1)

    logo_path = sys.argv[1]
    has_trans = check_transparency(logo_path)

    print("\n" + "="*50)
    if has_trans:
        print("✅ Logo COM TRANSPARÊNCIA - FFmpeg preservará corretamente!")
    else:
        print("⚠️  Logo SEM TRANSPARÊNCIA - Considere converter para PNG com fundo transparente")
        print("\nDica: Abra a logo em Photoshop/GIMP e:")
        print("  1. Mude para modo RGBA (Imagem > Modo > RGBA)")
        print("  2. Remova o fundo branco (Select > Color Range > branco > Delete)")
        print("  3. Salve como PNG com transparência")
