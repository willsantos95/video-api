# 🎬 Exemplos de Uso com n8n

Aqui estão exemplos prontos para integrar a API de vídeos no n8n.

---

## 1️⃣ Fluxo Simples: Comprimir Vídeo

### Passos:

1. **Webhook** (receber arquivo)
   - Método: POST
   - Retornar dados binários: ✅

2. **HTTP Request**
   - Método: POST
   - URL: `http://sua-api.com/api/video/compress`
   - Autenticação: Nenhuma
   - Tipo de Corpo: Form Data (Multipart)
   - Adicionar Parâmetro:
     - Nome: `video`
     - Tipo: File
     - Valor: `{{ $binary.data }}`

3. **Set** (opcional - processar resposta)
   - Extrair URL do arquivo processado

---

## 2️⃣ Fluxo: Extrair Áudio + Converter

```
Webhook (vídeo)
    ↓
HTTP POST /api/audio/extract
    ↓
Salvar arquivo (opcional)
    ↓
HTTP POST /api/audio/convert (para MP3)
    ↓
Webhook de resposta com áudio
```

### Configuração:

**1º HTTP Request - Extrair Áudio:**
```
POST /api/audio/extract
Body (Form Data):
  - video: {{ $binary.data }}
  - format: mp3
  - bitrate: 192k
```

**2º HTTP Request - Converter (se necessário):**
```
POST /api/audio/convert
Body (Form Data):
  - audio: {{ $binary.data }}  // do response anterior
  - format: wav
```

---

## 3️⃣ Fluxo: Adicionar Legenda

```
Webhook (vídeo + arquivo .srt)
    ↓
HTTP POST /api/subtitle/add
    ↓
Webhookcallback com vídeo legendado
```

### Configuração no n8n:

**HTTP Request:**
```
POST /api/subtitle/add
Body (Form Data):
  - video: {{ $binary.video }}
  - subtitle: {{ $binary.subtitle }}
  - fontsize: 24
  - color: white
  - position: bottom
```

---

## 4️⃣ Fluxo: Text-to-Audio + Adicionar ao Vídeo

```
Webhook (vídeo + texto)
    ↓
HTTP POST /api/audio/from-text
    ↓
HTTP POST /api/audio/add-to-video
    ↓
Resposta com vídeo com áudio
```

### Configuração:

**1º HTTP Request - Gerar Áudio:**
```
POST /api/audio/from-text
Method: POST
Headers: Content-Type: application/json
Body (JSON):
{
  "text": "{{ $json.texto }}",
  "language": "pt-BR",
  "speed": 1.0
}
```

**2º HTTP Request - Adicionar Áudio:**
```
POST /api/audio/add-to-video
Body (Form Data):
  - video: {{ $binary.data }} // vídeo original
  - audio: {{ response[0].body.url }} // áudio gerado
```

---

## 5️⃣ Fluxo: Redimensionar + Comprimir

```
Webhook (vídeo)
    ↓
HTTP POST /api/video/resize (1280x720)
    ↓
HTTP POST /api/video/compress (qualidade)
    ↓
Salvar arquivo final
```

### Configuração:

**1º HTTP - Resize:**
```
POST /api/video/resize
Body (Form Data):
  - video: {{ $binary.data }}
  - width: 1280
  - height: 720
```

**2º HTTP - Compress:**
```
POST /api/video/compress
Body (Form Data):
  - video: {{ response[0].body.file }}
  - quality: 28
```

---

## 6️⃣ Fluxo: Unificar Múltiplos Vídeos

```
Webhook (múltiplos vídeos)
    ↓
HTTP POST /api/video/merge
    ↓
Resposta com vídeo unificado
```

### Nota:
O endpoint `/api/video/merge` aceita múltiplos arquivos via `videos[]`.

No n8n, você pode:
1. Receber array de vídeos
2. Fazer loop nos vídeos
3. Ou enviar tudo de uma vez como multipart

---

## 7️⃣ Fluxo Completo: Processar Vídeo do Instagram

```
Webhook (URL do vídeo)
    ↓
HTTP GET (baixar vídeo)
    ↓
HTTP POST /api/video/compress
    ↓
HTTP POST /api/video/resize (para Stories - 1080x1920)
    ↓
HTTP POST /api/subtitle/generate
    ↓
HTTP POST /api/subtitle/add (adicionar legendas automáticas)
    ↓
Salvar arquivo processado
    ↓
Webhook de notificação
```

---

## 📋 Template JSON para Importar no n8n

Você pode salvar este JSON e importar no n8n:

```json
{
  "nodes": [
    {
      "parameters": {
        "httpMethod": "POST",
        "url": "http://sua-api.com/api/video/compress",
        "bodyParametersUi": {
          "parameter": [
            {
              "name": "video",
              "value": "={{ $binary.data }}",
              "parameterType": "formBinary"
            },
            {
              "name": "quality",
              "value": "28",
              "parameterType": "formData"
            }
          ]
        }
      },
      "name": "Comprimir Vídeo",
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 4.1,
      "position": [750, 500]
    },
    {
      "parameters": {},
      "name": "Webhook",
      "type": "n8n-nodes-base.webhook",
      "typeVersion": 1,
      "position": [550, 500]
    }
  ],
  "connections": {
    "Webhook": {
      "main": [
        [
          {
            "node": "Comprimir Vídeo",
            "type": "main",
            "index": 0
          }
        ]
      ]
    }
  }
}
```

---

## 🔑 Variáveis de Ambiente no n8n

Se quiser usar variáveis, configure:

```
API_URL = http://sua-api.com
```

E use nos requests:
```
{{ $env.API_URL }}/api/video/compress
```

---

## 💡 Dicas de Performance

1. **Comprissão**: Qualidade 28-32 para web, 18-23 para alta qualidade
2. **Resize**: Redimensione ANTES de comprimir
3. **Batch**: Para múltiplos vídeos, processe em lotes (SplitInBatches)
4. **Timeout**: Configure timeout de 600+ segundos para vídeos grandes

---

## 🐛 Debugging

Se um request falhar, adicione um node **Set** para ver a resposta:

```
{{ JSON.stringify($json, null, 2) }}
```

Isso mostrará:
- Status code
- Mensagem de erro
- Arquivo gerado (se sucesso)

---

## 🚀 Próximos Passos

1. Deploy da API no EasyPanel ✅
2. Configurar webhook no n8n ✅
3. Testar um fluxo simples
4. Expandir para casos de uso complexos

Bom trabalho! 🎬
