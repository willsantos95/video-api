# ⚡ Quick Start - Video API Testing Interface

Get started in 2 minutes.

---

## 🎯 What You'll Get

```
https://seu-dominio.com/          → Web Testing Interface (UI)
https://seu-dominio.com/health    → API Status Check
```

---

## 🚀 Deploy Now

### 1️⃣ Push to GitHub

```bash
git add video-api/
git commit -m "Add video-api: Instagram anti-detection with testing interface"
git push -u origin claude/n8n-ffmpeg-easypanel-1xqjwl
```

### 2️⃣ In EasyPanel

1. Create Application → Select Repository → `auto-insta`
2. Set Source Directory: `video-api`
3. Click Deploy

That's it! 🎉

---

## ✅ Verify It Works

Wait 2-3 minutes for build/deployment, then:

```bash
# Test API is alive
curl https://seu-dominio.com/health

# Expected response:
# {"status":"API rodando","timestamp":"2026-07-28T..."}
```

Open browser:
```
https://seu-dominio.com/
```

You should see the purple-themed testing interface.

---

## 🎬 Test the Interface

1. **Upload a video** - Drag and drop or click upload
2. **Choose endpoint** - Select "Lightweight" (recommended)
3. **Click Process** - Wait for processing
4. **Compare videos** - See original vs processed
5. **Download** - Save the modified video

---

## 🔗 Use in n8n

Update your n8n workflow:

**HTTP Request Node:**
- **URL:** `https://seu-dominio.com/api/instagram/lightweight`
- **Method:** POST
- **Body Type:** Form Data (Multipart)
- **Parameters:**
  - `video`: `{{ $binary.data }}` (Form Binary)
  - `borderSize`: `20`
  - `compression`: `23`

---

## 📊 Endpoints Available

| Endpoint | Best For | Modification | Protection |
|----------|----------|--------------|-----------|
| `/api/instagram/lightweight` | ⭐ Most videos | 5-10% | Good |
| `/api/instagram/simple` | Normal use | 15-20% | Very Good |
| `/api/instagram/optimized` | Maximum protection | 30-40% | Excellent |
| `/api/instagram/border` | Just borders | 10-15% | Medium |

---

## 🐛 If Something's Wrong

### API shows 404

→ Wait for deployment to complete (check EasyPanel logs)

### Testing interface won't load

→ Clear browser cache (Ctrl+Shift+Delete)

### Upload fails

→ Check file size (keep under 500MB)

### n8n can't connect

→ Test with curl first:
```bash
curl -X POST https://seu-dominio.com/api/instagram/lightweight \
  -F "video=@test.mp4"
```

---

## 📚 Full Documentation

- `DEPLOYMENT.md` - Detailed setup guide
- `LIGHTWEIGHT-GUIA.md` - Parameter tuning
- `README.md` - API reference

---

## 🎬 You're Ready!

1. ✅ Code deployed
2. ✅ Testing interface online
3. ✅ Ready for Instagram uploads
4. ✅ n8n integration ready

Happy filming! 🚀
