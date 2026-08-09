# 🎨 Fix: Logo com Transparência (Fundo Transparente)

## ❌ O Problema

Ao adicionar uma logo com fundo transparente, o FFmpeg estava "preenchendo" as áreas transparentes com uma cor sólida, fazendo parecer que a logo tinha um fundo branco/preto mesmo que fosse PNG transparente.

## ✅ A Solução

Atualizei os filtros FFmpeg para preservar corretamente o canal alpha (transparência):

### Mudanças Implementadas

1. **addLogo endpoint**: 
   ```javascript
   // Antes:
   .complexFilter(`[1:v]scale=iw*${scaleFactor}:ih*${scaleFactor}[logo];[0:v][logo]overlay=${overlayPosition}`)
   
   // Depois:
   .complexFilter(`[1:v]scale=iw*${scaleFactor}:ih*${scaleFactor},format=rgba[logo];[0:v][logo]overlay=${overlayPosition}:format=auto`)
   ```

2. **removeAndAddLogo endpoint**:
   ```javascript
   // Adicionado format=rgba e overlay:format=auto
   const complexFilterStr = `[0]drawbox=...;[1:v]scale=...,format=rgba[logo];[covered][logo]overlay=...:format=auto[out]`;
   ```

3. **Posições adicionadas**:
   - ✅ `top-center`
   - ✅ `bottom-center`

---

## 🔧 Como Usar

### 1. Preparar a Logo com Transparência

**Usando Photoshop:**
1. Abra a logo em Photoshop
2. Vá a: Image → Mode → RGB (se não for)
3. Adicione canal alfa: Layer → Layer Mask → Reveal All
4. Use a ferramenta de seleção (Magic Wand) para selecionar o fundo
5. Delete o fundo (tecla Delete)
6. Salve como PNG: File → Export As → PNG

**Usando GIMP (grátis):**
1. Abra a logo em GIMP
2. Vá a: Image → Mode → RGB
3. Adicione transparência: Layer → Transparency → Add Alpha Channel
4. Use a ferramenta "Select by Color" para selecionar o fundo branco
5. Delete (Select → Invert, depois Delete)
6. Exporte: File → Export As → logo.png

**Usando online (grátis):**
- [Remove.bg](https://remove.bg) - Remove fundo automaticamente
- Resultado: PNG com transparência

---

## 📋 Verificar se a Logo Tem Transparência

```bash
# Usar o script que criei:
python3 video-api/utils/check_logo_transparency.py logo.png
```

**Saída esperada:**
```
📊 Informações da Imagem:
   Caminho: logo.png
   Dimensões: 200x200
   Canais: 4

✅ Tem canal alfa (RGBA)
   Min alpha: 0
   Max alpha: 255
   Média alpha: 187.45
   ✅ Contém áreas transparentes
   ✅ Contém áreas semi-transparentes (anti-aliasing)

====================================================
✅ Logo COM TRANSPARÊNCIA - FFmpeg preservará corretamente!
```

---

## 🚀 Testar a Logo

### 1. Verificar Transparência
```bash
python3 video-api/utils/check_logo_transparency.py minha_logo.png
```

### 2. Adicionar Logo ao Vídeo
```bash
curl -X POST http://localhost:3000/api/video/add-logo \
  -F "video=@video.mp4" \
  -F "logo=@minha_logo.png" \
  -F "position=bottom-center" \
  -F "scale=0.15"
```

### 3. Verificar Resultado
- Baixe o vídeo de saída
- Abra em um player (VLC, etc)
- Verifique se a logo apareça com fundo transparente (mostrando o vídeo atrás)
- ✅ Sucesso se ver a logo sem fundo sólido!

---

## 📝 Parâmetros do Endpoint

### POST /api/video/add-logo

```bash
curl -X POST http://localhost:3000/api/video/add-logo \
  -F "video=@video.mp4" \
  -F "logo=@logo.png" \
  -F "position=bottom-center" \
  -F "scale=0.15" \
  -F "opacity=1.0"
```

| Parâmetro | Padrão | Descrição |
|-----------|--------|-----------|
| `position` | top-right | Posição preset |
| `scale` | 0.2 | Escala da logo (0.1 = 10%, 0.5 = 50%) |
| `opacity` | 1.0 | Opacidade (0.0-1.0) |
| `margin` | 20 | Margem do preset em pixels |
| `x`, `y` | null | Posição customizada (pixels) |

### Posições Disponíveis
- `top-left`
- `top-center` ✨ (NOVO)
- `top-right`
- `bottom-left`
- `bottom-center` ✨ (NOVO)
- `bottom-right`
- `center`
- Custom: `x` e `y` em pixels

---

## 🎯 Posições Recomendadas

Para logo com fundo transparente:

| Caso | Posição | Scale |
|------|---------|-------|
| Logo pequena no rodapé | `bottom-center` | 0.10-0.15 |
| Logo no canto superior | `top-right` | 0.15-0.20 |
| Logo centralizada | `center` | 0.20-0.30 |
| Watermark sutil | `bottom-right` | 0.10 |

---

## ⚠️ Dicas Importantes

### Logo Não Apareceu Transparente?

1. **Verificar se PNG tem transparência:**
   ```bash
   python3 video-api/utils/check_logo_transparency.py logo.png
   ```

2. **Se NÃO tem transparência:**
   - Use Remove.bg ou GIMP para adicionar fundo transparente
   - Salve como PNG (não JPG!)

3. **Se TEM mas ainda aparece com fundo:**
   - Tente com scale menor: `scale=0.10`
   - Tente outra posição: `position=top-center`
   - Verifique tamanho da logo: min 50px recomendado

### Performance

- Logo transparente = mesma velocidade que logo opaca
- Processamento: ~15-20 segundos (dependendo do vídeo)

---

## 📊 Fluxo n8n com Logo Transparente

```
1. Upload vídeo
   ↓
2. Upload logo PNG (com transparência)
   ↓
3. /api/video/add-logo
   - position: bottom-center
   - scale: 0.15
   ↓
4. /api/video/to-reels (convertendo para Reels/Shorts)
   - addFooter: true
   ↓
5. Download → Instagram
```

---

## 🔬 Formato PNG com Transparência (Technical)

Requisitos técnicos da logo PNG:

- **Formato:** PNG (não JPG!)
- **Canal:** RGBA (4 canais: Red, Green, Blue, Alpha)
- **Compressão:** PNG padrão (deflate)
- **Tamanho recomendado:** 200x200 até 800x800 px
- **Proporção:** Qualquer (quadrada melhor para overlay)

---

**Versão:** v6 (Logo Transparency Fix)  
**Data:** 2026-08-09  
**Status:** ✅ Production Ready
