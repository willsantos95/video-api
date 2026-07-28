# 🎙️ OpenAI Whisper - Setup Legendas Automáticas

Guia completo para usar OpenAI Whisper para gerar legendas automáticas a partir de vídeos.

---

## 📋 Pré-requisitos

- API Key do OpenAI (criar em https://platform.openai.com/api-keys)
- Node.js 18+ (já instalado)
- Créditos na conta OpenAI (~$0.006 por minuto de áudio)

---

## 🚀 Setup (5 minutos)

### 1️⃣ **Obter API Key do OpenAI**

1. Acesse https://platform.openai.com/api-keys
2. Clique em "Create new secret key"
3. Copie a chave (começa com `sk-`)
4. ⚠️ Guarde em segurança, não compartilhe!

### 2️⃣ **Configurar no Backend**

**Criar arquivo `.env`:**

```env
NODE_ENV=production
PORT=3000
API_URL=https://seu-dominio.com

OPENAI_API_KEY=sk-seu-api-key-aqui
```

### 3️⃣ **Instalar Dependência**

```bash
cd video-api
npm install openai
```

Ou se já tiver clonado o ZIP atualizado:
```bash
npm install
```

### 4️⃣ **Testar Localmente**

```bash
npm start
```

Depois:
```bash
curl -X POST http://localhost:3000/api/subtitle/generate \
  -F "video=@seu-video.mp4"
```

Resposta esperada:
```json
{
  "success": true,
  "message": "Legendas geradas com OpenAI Whisper",
  "transcription": "Conteúdo do áudio transcrito...",
  "file": "seu-video_subtitle.srt",
  "url": "http://localhost:3000/download/seu-video_subtitle.srt"
}
```

---

## 🔗 **Usar no n8n**

### **Opção A: Usar endpoint `/api/subtitle/generate` (RECOMENDADO)**

No seu fluxo n8n:

```
Google Drive
    ↓
Download File
    ↓
Read/Write Files from Disk
    ↓
🆕 HTTP Request → Generate Subtitles
    ↓
Add Subtitles to Video
    ↓
Instagram
```

**Configurar node HTTP Request:**

| Campo | Valor |
|-------|-------|
| **Name** | `🎙️ Generate Subtitles with Whisper` |
| **URL** | `https://seu-dominio.com/api/subtitle/generate` |
| **Method** | `POST` |
| **Send Body** | ✅ Ativado |
| **Body Type** | `Form Data (Multipart)` |

**Parâmetros:**

```
Name: video
Type: Form Binary
Value: {{ $binary.data }}

Name: language
Type: Form Data
Value: pt
```

**Resultado:**
```json
{
  "file": "video_subtitle.srt",
  "url": "https://seu-dominio.com/download/video_subtitle.srt",
  "transcription": "..."
}
```

### **Opção B: Usar OpenAI diretamente no n8n (ChatGPT / Code node)**

Mais controle, mas mais complexo. Pule se usar Opção A.

---

## 📊 **Linguagens Suportadas**

O Whisper suporta **99+ idiomas**. Exemplos:

| Idioma | Code |
|--------|------|
| Português | `pt` |
| Português Brasil | `pt-BR` |
| English | `en` |
| Español | `es` |
| Français | `fr` |
| Deutsch | `de` |
| 中文 | `zh` |
| 日本語 | `ja` |

---

## 💰 **Preços OpenAI Whisper**

```
$0.006 por minuto de áudio
$0.36 por hora de áudio

Exemplos:
- 10 min vídeo = $0.06
- 1 hora vídeo = $0.36
```

**Estimativa mensal (100 vídeos de 10 min):**
```
100 × 10 min × $0.006 = $6/mês
```

---

## 🔍 **Testar via API Tester**

Se usando a interface de testes:

1. Acesse `https://seu-dominio.com/`
2. Vá para aba **"📝 Legendas"**
3. Clique em **"Generate Subtitles"**
4. Faça upload de um vídeo
5. Clique **"Gerar"**
6. Aguarde 1-2 minutos
7. Download do arquivo `.srt`

---

## 🎬 **Fluxo Completo: Instagram com Legendas**

```
1. Google Drive
   ↓
2. Download vídeo
   ↓
3. ✨ GENERATE SUBTITLES (OpenAI Whisper)
   ↓
4. ADD SUBTITLES to video
   ↓
5. Instagram Lightweight (anti-detection)
   ↓
6. Post to Instagram
```

---

## ⚙️ **Customizações**

### **Alterar velocidade de palavras/segundo**

No `subtitleController.js`, linha ~70:
```javascript
const avgWordsPerSecond = 3; // Alterar conforme necessário
```

Valores recomendados:
- **2.5** = Mais tempo por legenda (leitura lenta)
- **3.0** = Normal (padrão)
- **4.0** = Menos tempo por legenda (leitura rápida)

### **Usar outro idioma como padrão**

No corpo do request:
```json
{
  "language": "es"  // Para espanhol
}
```

---

## 🐛 **Troubleshooting**

### Erro: "OPENAI_API_KEY não configurada"

**Solução:**
1. Criar arquivo `.env` na pasta `video-api/`
2. Adicionar: `OPENAI_API_KEY=sk-seu-api-key`
3. Reiniciar o servidor

### Erro: "Invalid API Key"

**Solução:**
1. Verificar se a chave está correta
2. Testar a chave em: https://platform.openai.com/account/api-keys
3. Gerar nova chave se necessário

### Erro: "Insufficient quota"

**Solução:**
1. Você não tem créditos na conta OpenAI
2. Adicione crédito em: https://platform.openai.com/account/billing/overview
3. Espere alguns minutos após adicionar crédito

### Vídeo muito grande (>25MB)

**Solução:**
1. Comprimir vídeo primeiro: `/api/video/compress`
2. Depois gerar legendas
3. Ou aumentar o limite de arquivo no Dockerfile

---

## 📱 **Resultado no Instagram**

Após adicionar legendas com Whisper + anti-detection:

✅ Vídeo com legendas automáticas  
✅ Sem aviso de "conteúdo não original"  
✅ Pronto para publicar  
✅ Melhor engajamento (legendas aumentam views)

---

## 🎯 **Próximos Passos**

1. ✅ Obter API Key
2. ✅ Configurar `.env`
3. ✅ `npm install`
4. ✅ Testar `/api/subtitle/generate`
5. ✅ Integrar no n8n
6. ✅ Publicar no Instagram

---

## 📞 **Documentação Completa**

- OpenAI API: https://platform.openai.com/docs/api-reference
- Whisper Model: https://platform.openai.com/docs/guides/speech-to-text
- Preços: https://openai.com/pricing

---

## 💡 **Dica Pro**

Combine com n8n scheduling para:

```
Todos os dias às 10h:
1. Download vídeos do Google Drive
2. Gerar legendas com Whisper
3. Aplicar lightweight anti-detection
4. Publicar no Instagram automaticamente
```

Automação completa! 🤖

Pronto para usar! 🚀
