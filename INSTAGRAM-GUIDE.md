# 📸 Guia: Proteção Anti-Detection para Instagram

Como evitar aviso de "Conteúdo não original" adicionando bordas, efeitos e filtros ao vídeo.

---

## 🎯 Por que funciona?

O Instagram usa **análise de fingerprint** para detectar conteúdo duplicado. Alterando:
- ✅ Dimensões (adicionando borda)
- ✅ Cores (filtros)
- ✅ Contraste (efeitos visuais)
- ✅ Geometria (zoom/crop)

...o fingerprint muda e o vídeo é visto como "novo"!

---

## 📹 Endpoints Disponíveis

### 1️⃣ Borda Simples

**Adiciona uma borda preta/colorida ao redor do vídeo**

```bash
curl -X POST https://seu-dominio.com/api/instagram/border \
  -F "video=@video.mp4" \
  -F "borderSize=50" \
  -F "borderColor=black"
```

**Parâmetros:**
- `borderSize`: 20-100 (pixels)
- `borderColor`: `black`, `white`, `navy`, `darkgreen`, etc

**Melhor para:**
- Mudar aspecto ratio
- Simples e eficaz

---

### 2️⃣ Borda Gradiente

**Borda mais elegante com gradiente de cores**

```bash
curl -X POST https://seu-dominio.com/api/instagram/gradient-border \
  -F "video=@video.mp4" \
  -F "borderSize=40" \
  -F "color1=1a1a1a" \
  -F "color2=4a4a4a"
```

**Parâmetros:**
- `borderSize`: 20-80 (pixels)
- `color1`: cor escura (hex: `1a1a1a`)
- `color2`: cor clara (hex: `4a4a4a`)

**Melhor para:**
- Visual mais profissional
- YouTube + Instagram

---

### 3️⃣ Borda com Padrão

**Adiciona textura/padrão na borda**

```bash
curl -X POST https://seu-dominio.com/api/instagram/pattern-border \
  -F "video=@video.mp4" \
  -F "borderSize=40" \
  -F "pattern=checkerboard"
```

**Parâmetros:**
- `pattern`: `checkerboard` ou `stripes`
- `borderSize`: 20-60 (pixels)

**Melhor para:**
- Algo diferente/criativo
- Chamar atenção

---

### 4️⃣ Blur nos Lados

**Adiciona efeito blur/desfoque nos lados**

```bash
curl -X POST https://seu-dominio.com/api/instagram/blur-sides \
  -F "video=@video.mp4" \
  -F "blurWidth=50" \
  -F "blurAmount=10"
```

**Parâmetros:**
- `blurWidth`: 30-100 (largura do blur)
- `blurAmount`: 5-20 (intensidade)

**Melhor para:**
- Efeito cinemático
- TikTok + Instagram

---

### 5️⃣ Vinheta

**Efeito de escurecimento nas bordas (profissional)**

```bash
curl -X POST https://seu-dominio.com/api/instagram/vignette \
  -F "video=@video.mp4" \
  -F "intensity=0.5"
```

**Parâmetros:**
- `intensity`: 0.1-1.0 (quanto mais alto, mais escuro)

**Melhor para:**
- Vídeos já bons
- Apenas aperfeiçoamento

---

### 6️⃣ Zoom/Crop

**Faz crop/zoom leve no vídeo**

```bash
curl -X POST https://seu-dominio.com/api/instagram/zoom \
  -F "video=@video.mp4" \
  -F "zoomLevel=0.95"
```

**Parâmetros:**
- `zoomLevel`: 0.90-0.99 (quanto menor, mais zoom)

**Melhor para:**
- Remover watermark leve
- Mudar composição

---

### 7️⃣ Filtro de Cor

**Aplica filtro de cor/temperatura**

```bash
curl -X POST https://seu-dominio.com/api/instagram/filter \
  -F "video=@video.mp4" \
  -F "filterType=warm"
```

**Parâmetros - filterType:**
- `warm`: Mais quente (amarelado)
- `cool`: Mais frio (azulado)
- `saturated`: Cores mais vibrantes
- `desaturated`: Cores mais neutras
- `vintage`: Efeito retrô

**Melhor para:**
- Manter aspecto visual
- Simples aplicação

---

### 🏆 8️⃣ INSTAGRAM OPTIMIZED (Recomendado!)

**Combina TUDO: Borda + Vinheta + Filtro + Compressão**

```bash
curl -X POST https://seu-dominio.com/api/instagram/optimized \
  -F "video=@video.mp4" \
  -F "borderSize=40" \
  -F "borderColor=1a1a1a" \
  -F "filterType=warm" \
  -F "vignetteIntensity=0.3" \
  -F "compression=28"
```

**Parâmetros:**
- `borderSize`: 30-60 (recomendado: 40)
- `borderColor`: hex code (recomendado: `1a1a1a`)
- `filterType`: warm, cool, saturated, desaturated, vintage
- `vignetteIntensity`: 0.2-0.5 (recomendado: 0.3)
- `compression`: 20-32 (mais alto = mais comprimido)

**Resposta:**
```json
{
  "success": true,
  "message": "Vídeo otimizado para Instagram (anti-detection) com sucesso",
  "file": "video_instagram-safe.mp4",
  "optimizations": {
    "border": "40px",
    "filterType": "warm",
    "vignetteIntensity": 0.3,
    "compression": 28
  },
  "note": "Este vídeo possui características visuais que reduzem a chance de detecção de conteúdo duplicado",
  "url": "https://seu-dominio.com/download/video_instagram-safe.mp4"
}
```

---

## 🔄 Fluxo Completo com n8n

```
Webhook (vídeo do YouTube)
    ↓
HTTP POST /api/instagram/optimized
    ↓
Salvar arquivo
    ↓
Fazer upload para Instagram
    ↓
✅ Sem aviso de conteúdo não original!
```

### Configuração no n8n:

**1. Webhook:**
- Método: POST
- Retornar dados binários: ✅

**2. HTTP Request:**
```
POST /api/instagram/optimized
Body (Form Data):
  - video: {{ $binary.data }}
  - borderSize: 40
  - borderColor: 1a1a1a
  - filterType: warm
  - vignetteIntensity: 0.3
  - compression: 28
```

**3. Set (opcional):**
```javascript
{
  "videoUrl": "{{ $json.url }}",
  "fileName": "{{ $json.file }}",
  "message": "Pronto para fazer upload no Instagram!"
}
```

---

## 📱 Recomendações por Plataforma

### Instagram Feed
```bash
curl -X POST https://seu-dominio.com/api/instagram/optimized \
  -F "video=@video.mp4" \
  -F "borderSize=40" \
  -F "borderColor=000000" \
  -F "filterType=warm"
```
- Dimensões: 1080x1350 (Portrait) ou 1200x628 (Landscape)
- Borda preta elegante

### Instagram Stories
```bash
curl -X POST https://seu-dominio.com/api/video/resize \
  -F "video=@video.mp4" \
  -F "width=1080" \
  -F "height=1920" | 
curl -X POST https://seu-dominio.com/api/instagram/optimized \
  -F "video=@" \
  -F "borderSize=20"
```
- Dimensões: 1080x1920 (Full Screen)
- Borda pequena

### Instagram Reels / TikTok
```bash
curl -X POST https://seu-dominio.com/api/instagram/optimized \
  -F "video=@video.mp4" \
  -F "borderSize=50" \
  -F "filterType=cool" \
  -F "vignetteIntensity=0.4"
```
- Dimensões: 1080x1920
- Mais efeitos visuais

### YouTube Shorts
```bash
curl -X POST https://seu-dominio.com/api/instagram/optimized \
  -F "video=@video.mp4" \
  -F "borderSize=30" \
  -F "filterType=saturated"
```
- Dimensões: 1080x1920
- Cores mais vibrantes

---

## 🎨 Combinações Recomendadas

### Opção 1: Simples e Eficaz
```bash
curl -X POST https://seu-dominio.com/api/instagram/border \
  -F "video=@video.mp4" \
  -F "borderSize=50" \
  -F "borderColor=black"
```

### Opção 2: Profissional
```bash
curl -X POST https://seu-dominio.com/api/instagram/optimized \
  -F "video=@video.mp4" \
  -F "borderSize=40" \
  -F "filterType=warm"
```

### Opção 3: Criativo
```bash
curl -X POST https://seu-dominio.com/api/instagram/blur-sides \
  -F "video=@video.mp4" \
  -F "blurWidth=60" \
  -F "blurAmount=15"
```

### Opção 4: Discreto (apenas efeitos)
```bash
curl -X POST https://seu-dominio.com/api/instagram/vignette \
  -F "video=@video.mp4" \
  -F "intensity=0.2"
```

---

## ⚠️ Dicas Importantes

1. **Comece simples**: Uma borda preta já reduz muito a detecção
2. **Não exagere**: Muito efeito fica óbvio e prejudica qualidade
3. **Teste diferentes opções**: Cada vídeo é diferente
4. **Combine técnicas**: Borda + Filtro funciona melhor que só borda
5. **Mantenha qualidade**: Use `compression=28` ou melhor

---

## 📊 Efetividade

| Técnica | Efetividade | Qualidade Visual |
|---------|------------|------------------|
| Borda simples | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| Borda gradiente | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| Blur nos lados | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| Vinheta | ⭐⭐ | ⭐⭐⭐⭐ |
| Filtro de cor | ⭐⭐ | ⭐⭐⭐⭐⭐ |
| **OPTIMIZED** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ |

---

## 🚀 Próximos Passos

1. ✅ Fazer deploy da API
2. ✅ Testar um endpoint
3. ✅ Integrar com n8n
4. ✅ Fazer upload no Instagram
5. ✅ Verificar se não tem aviso

Bom uso! 🎬
