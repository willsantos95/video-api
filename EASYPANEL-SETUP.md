# Instalação no EasyPanel

## Opção 1: Instalar com Dockerfile Atualizado (Recomendado)

O novo `Dockerfile` já inclui Python3 + OpenCV automaticamente.

### Passos:

1. **Fazer upload do novo Dockerfile**
   - Substituir o arquivo `Dockerfile` atual pelo novo (que inclui Python + OpenCV)

2. **Fazer rebuild da imagem Docker**
   - No EasyPanel, encontrar o serviço `video-api`
   - Clicar em **Rebuild** ou **Redeploy**
   - Aguardar build completar (~5-10 minutos)

3. **Verificar instalação**
   ```
   # Abrir terminal do container
   docker exec -it <container-id> sh
   python3 -c "import cv2; print(cv2.__version__)"
   ```

## Opção 2: Instalar Manualmente (Se não quiser rebuild)

Se preferir não fazer rebuild, instale manualmente dentro do container:

1. **Acessar shell do container**
   ```bash
   docker exec -it <container-id> sh
   ```

2. **Instalar Python + OpenCV**
   ```bash
   # Instalar pacotes (Alpine Linux)
   apk add --no-cache python3 py3-pip gcc musl-dev
   
   # Instalar OpenCV + NumPy
   pip3 install opencv-python numpy
   ```

3. **Verificar instalação**
   ```bash
   python3 -c "import cv2; print('OpenCV versão:', cv2.__version__)"
   ```

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
