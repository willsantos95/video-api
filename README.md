# 🎬 API de Processamento de Vídeos

API completa para edição de vídeos, criação de áudios e legendas com FFmpeg. Perfeita para integração com n8n.

## ✨ Funcionalidades

### 📹 Edição de Vídeos
- ✅ Compressão/redução de qualidade
- ✅ Conversão de formatos (MP4, AVI, MKV, MOV, WebM, FLV)
- ✅ Corte/trim de vídeos
- ✅ Redimensionamento (resize)
- ✅ Adição de marca d'água (watermark)
- ✅ Extração de miniaturas (thumbnail)
- ✅ Unificação de múltiplos vídeos

### 🎵 Processamento de Áudio
- ✅ Extração de áudio de vídeos
- ✅ Adição de áudio em vídeos
- ✅ Síntese de fala (text-to-audio)
- ✅ Conversão de formatos de áudio (MP3, AAC, WAV, FLAC, OGG)

### 📝 Legendas
- ✅ Geração de arquivos de legenda
- ✅ Adição de legendas em vídeos
- ✅ Conversão de formatos de legenda (SRT, VTT, ASS, SSA)

---

## 🚀 Instalação no EasyPanel

### Opção 1: Via Docker Compose (Recomendado)

1. **Faça clone ou copie os arquivos para o EasyPanel**

2. **No painel EasyPanel:**
   - Vá em **Projetos** → **Novo Projeto**
   - Selecione **Docker Compose**
   - Cole o conteúdo do `docker-compose.yml`
   - Clique em **Implantar**

3. **Aguarde o build completar** (pode levar 5-10 minutos)

### Opção 2: Via Dockerfile

1. **Upload dos arquivos**
2. **No EasyPanel:**
   - Crie um novo serviço
   - Tipo: **Docker**
   - Faça upload do Dockerfile
   - Configure a porta **3000**
   - Deploy

---

## 📖 Uso da API

### Base URL
```
http://seu-dominio.com:3000
```

### Health Check
```bash
GET /health
```

---

## 📹 Endpoints de Vídeos

### Comprimir Vídeo
```bash
POST /api/video/compress
Content-Type: multipart/form-data

video: [arquivo.mp4]
quality: 28  # 18-51 (menor = melhor, padrão = 28)
```

**Resposta:**
```json
{
  "success": true,
  "message": "Vídeo comprimido com sucesso",
  "file": "video_compressed.mp4",
  "url": "http://seu-dominio.com/download/video_compressed.mp4"
}
```

---

### Converter Formato
```bash
POST /api/video/convert
Content-Type: multipart/form-data

video: [arquivo.mp4]
format: "avi"  # mp4, avi, mkv, mov, webm, flv
```

---

### Cortar Vídeo
```bash
POST /api/video/trim
Content-Type: multipart/form-data

video: [arquivo.mp4]
start: 10        # segundos
duration: 30     # segundos
```

---

### Redimensionar Vídeo
```bash
POST /api/video/resize
Content-Type: multipart/form-data

video: [arquivo.mp4]
width: 1280
height: 720
```

---

### Adicionar Marca d'Água
```bash
POST /api/video/watermark
Content-Type: multipart/form-data

video: [arquivo.mp4]
text: "Minha Marca"
position: "bottom-right"  # top-left, top-right, bottom-left, bottom-right
fontSize: 24
```

---

### Extrair Miniatura
```bash
POST /api/video/thumbnail
Content-Type: multipart/form-data

video: [arquivo.mp4]
timestamp: "00:00:05"    # timestamp para captura
size: "320x240"          # resolução
```

---

### Unificar Vídeos
```bash
POST /api/video/merge
Content-Type: multipart/form-data

videos: [arquivo1.mp4, arquivo2.mp4, arquivo3.mp4]
```

---

## 🎵 Endpoints de Áudio

### Extrair Áudio de Vídeo
```bash
POST /api/audio/extract
Content-Type: multipart/form-data

video: [arquivo.mp4]
format: "mp3"      # mp3, aac, wav, flac, ogg
bitrate: "192k"    # 128k, 192k, 256k, 320k
```

---

### Adicionar Áudio em Vídeo
```bash
POST /api/audio/add-to-video
Content-Type: multipart/form-data

video: [arquivo.mp4]
audio: [audio.mp3]
```

---

### Text-to-Audio
```bash
POST /api/audio/from-text
Content-Type: application/json

{
  "text": "Seu texto aqui",
  "language": "pt-BR",    # pt-BR, en-US, es-ES, etc
  "speed": 1.0            # 0.5 a 2.0
}
```

---

### Converter Áudio
```bash
POST /api/audio/convert
Content-Type: multipart/form-data

audio: [arquivo.mp3]
format: "wav"      # mp3, aac, wav, flac, ogg
bitrate: "192k"
```

---

## 📝 Endpoints de Legendas

### Gerar Arquivo de Legenda
```bash
POST /api/subtitle/generate
Content-Type: multipart/form-data

video: [arquivo.mp4]
language: "pt"     # pt, en, es, etc
```

---

### Adicionar Legenda em Vídeo
```bash
POST /api/subtitle/add
Content-Type: multipart/form-data

video: [arquivo.mp4]
subtitle: [legenda.srt]
fontsize: 24
color: "white"
position: "bottom"  # top, bottom, center
```

---

### Converter Formato de Legenda
```bash
POST /api/subtitle/convert
Content-Type: multipart/form-data

subtitle: [legenda.srt]
targetFormat: "vtt"  # srt, vtt, ass, ssa
```

---

## 📂 Gerenciamento de Arquivos

### Listar Arquivos
```bash
GET /files
```

**Resposta:**
```json
{
  "files": [
    {
      "filename": "video_compressed.mp4",
      "size": 52428800,
      "url": "http://seu-dominio.com/download/video_compressed.mp4"
    }
  ]
}
```

---

### Deletar Arquivo
```bash
DELETE /files/video_compressed.mp4
```

---

### Download de Arquivo
```bash
GET /download/video_compressed.mp4
```

---

## 🔗 Integração com n8n

### Exemplo 1: Comprimir Vídeo

1. **Webhook com upload de vídeo**
2. **HTTP Request:**
   - Método: `POST`
   - URL: `http://sua-api.com/api/video/compress`
   - Tipo de corpo: `Form-Data (Multipart)`
   - Campos:
     - `video`: `{{ $binary.data }}`
     - `quality`: `28`

3. **Processar resposta**

### Exemplo 2: Extrair Áudio e Converter

1. **Upload de vídeo via webhook**
2. **HTTP POST → /api/audio/extract**
3. **Salvar arquivo retornado**
4. **HTTP POST → /api/audio/convert** (para formato desejado)

---

## 🛠️ Variáveis de Ambiente

Crie um arquivo `.env` com:

```env
NODE_ENV=production
PORT=3000
API_URL=https://seu-dominio.com
UPLOAD_DIR=./uploads
MAX_FILE_SIZE=5000000000
```

---

## 📦 Dependências

- Node.js 18+
- FFmpeg
- Express.js
- Multer
- Fluent-ffmpeg

---

## 🐛 Troubleshooting

### "FFmpeg not found"
```bash
# Verificar instalação
ffmpeg -version

# Se não estiver instalado (fora do Docker)
apt-get install ffmpeg  # Ubuntu/Debian
brew install ffmpeg     # macOS
```

### "Arquivo muito grande"
- Aumentar `MAX_FILE_SIZE` no `.env`
- Considerar compressão antes de enviar

### "Timeout no processamento"
- Aumentar tempo limite do servidor
- Usar qualidade menor para compressão
- Dividir vídeo grande em partes

---

## 📊 Performance

- ⚡ Compressão: ~100 MB/min (depende da qualidade)
- ⚡ Conversão: ~50-100 MB/min
- ⚡ Extração de áudio: ~200 MB/min

---

## 📝 Licença

MIT

---

## 👨‍💻 Suporte

Para dúvidas ou sugestões, abra uma issue no repositório.
