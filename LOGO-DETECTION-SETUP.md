# Logo Detection Setup

## Overview

O endpoint `/api/video/detect-logo` detecta automaticamente a posição da logo antiga em um vídeo usando template matching com OpenCV.

## Installation Requirements

### Python 3 + OpenCV

```bash
# Instalar Python 3 (se não tiver)
sudo apt-get install python3 python3-pip

# Instalar OpenCV e NumPy
pip3 install opencv-python numpy
```

### Verification

```bash
python3 -c "import cv2; print(cv2.__version__)"
```

## API Endpoint

### POST `/api/video/detect-logo`

Detecta a posição de uma logo em um vídeo.

**Request (multipart/form-data):**
```
- video: arquivo de vídeo (obrigatório)
- logo: imagem da logo (PNG ou JPG, obrigatório)
```

**Response Success:**
```json
{
  "success": true,
  "message": "Logo detectada com sucesso",
  "coordinates": {
    "x": 145,
    "y": 78,
    "width": 240,
    "height": 120,
    "confidence": 0.85
  },
  "logoPosition": {
    "x": 145,
    "y": 78,
    "width": 240,
    "height": 120,
    "confidence": 0.85,
    "scale": 1.0
  },
  "executionTime": 2.34
}
```

**Response Fallback (sem Python/OpenCV):**
```json
{
  "success": false,
  "message": "Detecção automática não disponível. Use a detecção manual.",
  "hint": "Instale Python 3 e OpenCV: pip install opencv-python numpy"
}
```

## How Template Matching Works

1. **Extrai um frame do vídeo** (primeiro frame, 1 segundo)
2. **Converte para escala de cinza** para melhor matching
3. **Tenta diferentes escalas** da template (0.5x até 2x do tamanho original)
4. **Usa template matching normalizado** (TM_CCOEFF_NORMED)
5. **Retorna a melhor correspondência** com confiança > 0.5

## Workflow

### Option 1: Auto-Detection (Recomendado)

1. Ir para **Video Tab** → **🔍 Detect Logo Position**
2. Fazer upload do vídeo
3. Fazer upload da imagem da logo atual
4. Clicar em **"Detectar Logo"**
5. Os campos de **Logo Antigo** (X, Y, Largura, Altura) são preenchidos automaticamente
6. Ir para **🔄 Replace Logo** 
7. Os valores já estão preenchidos, ajuste a posição da nova logo e clique em **"Substituir Logo"**

### Option 2: Manual Detection

Se a detecção automática não funcionar:

1. Abrir o vídeo em um player (VLC, etc.)
2. Pausar no ponto onde a logo aparece
3. Medir manualmente:
   - **X**: distância da esquerda até a logo (em pixels)
   - **Y**: distância do topo até a logo (em pixels)
   - **Width**: largura da logo
   - **Height**: altura da logo
4. Preencher os campos manualmente em **🔄 Replace Logo**

## Troubleshooting

### "Logo not detected in frame"
- A logo pode estar em movimento ou em escala diferente no vídeo
- Tente com a primeira logo que aparece no vídeo
- Ajuste o tamanho da imagem da logo (mais perto do tamanho real)

### "Confidence < 0.5"
- Mude para detecção manual
- A logo pode ter filtros ou efeitos no vídeo
- Use um frame melhor onde a logo é mais visível

### Python/OpenCV não encontrados
- Siga as instruções de instalação acima
- Verifique: `python3 -c "import cv2"`
- Reinicie o servidor da API após instalar

## Performance

- **Tempo de detecção**: 2-5 segundos
- **Tempo total (detect + replace)**: 30-40 segundos
- Não incluso no tempo de encodificação do vídeo

## Tips

- Use uma **imagem da logo com fundo transparente** (PNG) para melhor detecção
- Se a logo mudar de tamanho no vídeo, use a primeira ocorrência
- A confiança (confidence) indica a precisão: > 0.8 é excelente, > 0.6 é bom
- Para logos muito pequenas ou muito grandes, use detecção manual
