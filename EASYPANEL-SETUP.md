# Instalação no EasyPanel

## ✅ Setup Padrão (RECOMENDADO)

O novo `Dockerfile` usa **Debian slim** (não Alpine) e inclui **OpenCV pré-instalado**.

### Vantagens:
- ✅ OpenCV + NumPy inclusos
- ✅ Detecção de logo **funciona imediatamente**
- ✅ Build mais rápido que Alpine com compilação
- ✅ Menor que imagem full Debian
- ✅ Sem scripts adicionais necessários

### Passos:

1. **Fazer upload do novo Dockerfile**
   - Substituir o arquivo `Dockerfile` atual pelo novo

2. **Fazer rebuild no EasyPanel**
   - Clicar em **Rebuild** ou **Redeploy**
   - Aguardar build completar (~3-5 minutos)

3. **Verificar instalação**
   ```bash
   # Abrir terminal do container
   docker exec -it <container-id> bash
   
   # Verificar OpenCV
   python3 -c "import cv2; print('✓ OpenCV:', cv2.__version__)"
   ```

4. **Pronto!** ✅
   - API rodando com todas as funcionalidades
   - Detecção de logo **ativa**
   - `/api/video/detect-logo` funciona

## Tamanho da Imagem
- **Alpine**: ~400MB (com compilação de OpenCV = falha)
- **Slim com pré-compilado**: ~550MB (funciona)
- **Full Debian**: ~1.2GB (desnecessário)

## Opção 3: Via Docker Compose

Se estiver usando `docker-compose.yml`:

```yaml
version: '3.8'
services:
  video-api:
    build: .
    ports:
      - "3000:3000"
    volumes:
      - ./uploads:/app/uploads
    environment:
      - NODE_ENV=production
      - PORT=3000
```

Depois execute:
```bash
docker-compose build
docker-compose up -d
```

## Troubleshooting

### "python3: command not found"
- Dockerfile não foi atualizado
- Faça rebuild com o novo Dockerfile

### "ModuleNotFoundError: No module named 'cv2'"
- Instale com: `pip3 install opencv-python`
- Verifique: `pip3 list | grep opencv`

### Build demora muito
- OpenCV precisa compilar (~5-10 minutos)
- Paciência! O build só acontece uma vez

### "Sem espaço em disco"
- OpenCV + dependências usam ~500MB
- Libere espaço ou use versão slim do OpenCV

## Testar Detecção de Logo

1. **Ir para a interface web**
   - `http://seu-dominio:3000`

2. **Video Tab → 🔍 Detect Logo Position**
   - Upload vídeo + logo
   - Clicar em **"Detectar Logo"**
   - Se funcionar, Python + OpenCV está instalado! ✅

## Performance

Com OpenCV instalado:
- **Detecção de logo**: 2-5 segundos
- **Replace logo**: 30-40 segundos total
- Sem OpenCV: Falls back para detecção manual

## Arquivo Atualizado

O novo `Dockerfile` inclui:
- ✅ Node.js 18 (para API)
- ✅ FFmpeg (para vídeos)
- ✅ Python 3 (para IA)
- ✅ OpenCV (para visão computacional)
- ✅ NumPy (para processamento)

Tudo em um único container! 🚀
