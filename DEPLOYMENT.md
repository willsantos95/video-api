# 🚀 Deployment Guide - Video API with Testing Interface

Complete guide to deploy the video-api with Instagram anti-detection and integrated testing interface.

---

## 📋 Prerequisites

- Docker and Docker Compose installed
- EasyPanel or similar Docker hosting
- Node.js 18+ (for local development)

---

## 🎯 What's Included

- **Express.js REST API** with FFmpeg video processing
- **Instagram Anti-Detection** endpoints (lightweight, simple, optimized)
- **Testing Interface** at `/` (index.html) for visual testing
- **Audio/Video/Subtitle** processing capabilities
- **Form Data (Multipart)** upload support for video files

---

## 🐳 Docker Deployment (EasyPanel)

### Step 1: Prepare Files

All necessary files are included:
- `server.js` - Express application
- `Dockerfile` - Container configuration
- `docker-compose.yml` - Docker Compose setup
- `package.json` - Dependencies
- `controllers/` - API controllers
- `public/` - Web interface (index.html)

### Step 2: Deploy to EasyPanel

1. **Push to GitHub:**
```bash
git add video-api/
git commit -m "Add video-api with testing interface"
git push -u origin claude/n8n-ffmpeg-easypanel-1xqjwl
```

2. **In EasyPanel:**
   - Create new Application
   - Connect to your GitHub repository
   - Set Source Directory: `video-api`
   - Build Command: `npm install --production`
   - Start Command: `npm start`
   - Port: `3000`
   - Environment Variables:
     ```
     NODE_ENV=production
     PORT=3000
     API_URL=https://seu-dominio.com
     ```

3. **Click Deploy**

---

## 🌐 Access the API

Once deployed:

| URL | Purpose |
|-----|---------|
| `https://seu-dominio.com/` | 🎬 Testing Interface (Web UI) |
| `https://seu-dominio.com/health` | 📊 Health Check |
| `https://seu-dominio.com/api/instagram/lightweight` | 🎯 Lightweight Anti-Detection |
| `https://seu-dominio.com/api/instagram/simple` | Simple Anti-Detection |
| `https://seu-dominio.com/api/instagram/optimized` | Full Anti-Detection |

---

## 🧪 Testing Interface

### Access the Web UI

1. Navigate to: `https://seu-dominio.com/`
2. You'll see:
   - **Upload Area** - Drag and drop videos
   - **Endpoint Tabs** - Choose between 4 endpoints
   - **Parameters** - Customize settings
   - **Comparison** - View original vs processed
   - **Download** - Get processed video

### Features

- ✅ Real-time parameter adjustment
- ✅ Side-by-side video comparison
- ✅ File size and compression metrics
- ✅ Download processed videos
- ✅ Responsive design (mobile/desktop)
- ✅ No external dependencies (pure HTML/CSS/JS)

---

## 📱 Using with n8n

The API integrates seamlessly with n8n workflows:

### Add HTTP Request Node

1. **URL:** `https://seu-dominio.com/api/instagram/lightweight`
2. **Method:** POST
3. **Body Type:** Form Data (Multipart)
4. **Parameters:**
   - `video` (Form Binary): `{{ $binary.data }}`
   - `borderSize`: `20`
   - `borderColor`: `000000`
   - `compression`: `23`
   - `contrastBoost`: `1.02`
   - `saturation`: `1.0`

See `COMO-ADICIONAR-ANTI-DETECTION-N8N.md` for detailed steps.

---

## 🔧 Local Development

### Install Dependencies

```bash
cd video-api
npm install
```

### Set Environment

```bash
cp .env.example .env
# Edit .env if needed
```

### Run Locally

```bash
npm start
```

Then visit: `http://localhost:3000`

### Watch Logs

```bash
docker-compose logs -f
```

---

## 📊 API Endpoints

### Instagram Anti-Detection

**POST** `/api/instagram/lightweight`
- **Modification:** 5-10%
- **Quality:** Excellent
- **Protection:** Good
- **Default params:**
  - borderSize: 20px
  - compression: 23
  - contrastBoost: 1.02

**POST** `/api/instagram/simple`
- **Modification:** 15-20%
- **Quality:** Good
- **Protection:** Very Good
- **Default params:**
  - borderSize: 40px
  - compression: 28

**POST** `/api/instagram/optimized`
- **Modification:** 30-40%
- **Quality:** Good
- **Protection:** Excellent
- **Default params:**
  - borderSize: 40px
  - filters + vignette

---

## 📝 Example Usage

### cURL Test

```bash
curl -X POST https://seu-dominio.com/api/instagram/lightweight \
  -F "video=@seu-video.mp4" \
  -F "borderSize=20" \
  -F "compression=23"
```

### Node.js Fetch

```javascript
const formData = new FormData();
formData.append('video', videoFile);
formData.append('borderSize', '20');

const response = await fetch('https://seu-dominio.com/api/instagram/lightweight', {
  method: 'POST',
  body: formData
});

const data = await response.json();
console.log('Processed video:', data.file);
```

---

## 🐛 Troubleshooting

### "Cannot find module" Error

**Solution:** Ensure all dependencies are installed
```bash
npm install
```

### FFmpeg not found

**Solution:** FFmpeg is installed in Docker. For local dev:
```bash
# macOS
brew install ffmpeg

# Ubuntu
sudo apt-get install ffmpeg

# Or use Docker locally
docker-compose up
```

### 404 on Testing Interface

**Solution:** Make sure `public/index.html` exists
```bash
ls -la video-api/public/
# Should show: index.html
```

### API Returns 400 Error

**Solution:** Check request format:
- Ensure Content-Type is `multipart/form-data`
- Video parameter type must be binary
- File field name must match API expectation

---

## 📈 Performance Notes

| Operation | Time |
|-----------|------|
| Lightweight processing | 2-3 minutes |
| Simple processing | 2-3 minutes |
| Optimized processing | 3-5 minutes |
| n8n workflow (total) | 5-10 minutes |

*Times depend on video size and server resources*

---

## 🔐 Security

### File Upload Limits

Current: No limit enforced (configure as needed)

**To add limit in server.js:**
```javascript
const upload = multer({ 
  storage,
  limits: { fileSize: 500 * 1024 * 1024 } // 500MB
});
```

### File Cleanup

Uploaded files are stored in `/uploads`. Configure auto-cleanup:

Option 1: Manual deletion via API
```bash
DELETE /files/:filename
```

Option 2: Auto-delete after download (uncomment in server.js)
```javascript
// fs.unlinkSync(filepath);
```

---

## 📚 Documentation Files

- **README.md** - API overview
- **LIGHTWEIGHT-GUIA.md** - Lightweight endpoint parameters
- **INSTAGRAM-GUIDE.md** - All Instagram endpoints
- **COMO-ADICIONAR-ANTI-DETECTION-N8N.md** - n8n integration steps
- **N8N-EXAMPLES.md** - Workflow examples

---

## ✅ Verification Checklist

After deployment:

- [ ] `https://seu-dominio.com/health` returns 200
- [ ] `https://seu-dominio.com/` loads testing interface
- [ ] Video upload works in web UI
- [ ] Lightweight endpoint processes video
- [ ] Processed video downloads successfully
- [ ] n8n workflow can reach the API
- [ ] Test upload to Instagram (verify no "not original" warning)

---

## 🚀 Next Steps

1. **Test locally** with `docker-compose up`
2. **Deploy to EasyPanel**
3. **Update n8n workflow** with your domain
4. **Test end-to-end** with actual Instagram upload
5. **Monitor performance** and adjust parameters as needed

---

## 📞 Support

For issues:
1. Check logs: `docker-compose logs`
2. Test health: `curl https://seu-dominio.com/health`
3. Review documentation in each file
4. Check n8n workflow connection

Pronto! 🎬
