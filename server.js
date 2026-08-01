const express = require('express');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, 'uploads');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ storage });

const videoController = require('./controllers/videoController');
const audioController = require('./controllers/audioController');
const subtitleController = require('./controllers/subtitleController');
const instagramController = require('./controllers/instagramController');
const logoDetectionController = require('./controllers/logoDetectionController');

app.get('/health', (req, res) => {
  res.json({ status: 'API rodando', timestamp: new Date() });
});

// Rotas de vídeo
app.post('/api/video/compress', upload.single('video'), videoController.compressVideo);
app.post('/api/video/convert', upload.single('video'), videoController.convertFormat);
app.post('/api/video/trim', upload.single('video'), videoController.trimVideo);
app.post('/api/video/resize', upload.single('video'), videoController.resizeVideo);
app.post('/api/video/watermark', upload.single('video'), videoController.addWatermark);
app.post('/api/video/thumbnail', upload.single('video'), videoController.extractThumbnail);
app.post('/api/video/merge', upload.array('videos', 10), videoController.mergeVideos);
app.post('/api/video/remove-logo', upload.single('video'), videoController.removeLogo);
app.post('/api/video/add-logo', upload.fields([{ name: 'video' }, { name: 'logo' }]), videoController.addLogo);
app.post('/api/video/replace-logo', upload.fields([{ name: 'video' }, { name: 'logo' }]), videoController.removeAndAddLogo);
app.post('/api/video/detect-logo', upload.fields([{ name: 'video' }, { name: 'logo' }]), logoDetectionController.detectLogo);

// Rotas de áudio
app.post('/api/audio/extract', upload.single('video'), audioController.extractAudio);
app.post('/api/audio/add-to-video', upload.fields([{ name: 'video' }, { name: 'audio' }]), audioController.addAudioToVideo);
app.post('/api/audio/from-text', audioController.textToAudio);
app.post('/api/audio/convert', upload.single('audio'), audioController.convertAudio);

// Rotas de legendas
app.post('/api/subtitle/generate', upload.single('video'), subtitleController.generateSubtitle);
app.post('/api/subtitle/add', upload.fields([{ name: 'video' }, { name: 'subtitle' }]), subtitleController.addSubtitle);
app.post('/api/subtitle/convert', upload.single('subtitle'), subtitleController.convertSubtitleFormat);

// Rotas de Instagram (Anti-Detection)
app.post('/api/instagram/border', upload.single('video'), instagramController.addBorder);
app.post('/api/instagram/gradient-border', upload.single('video'), instagramController.addGradientBorder);
app.post('/api/instagram/pattern-border', upload.single('video'), instagramController.addPatternBorder);
app.post('/api/instagram/blur-sides', upload.single('video'), instagramController.addBlurSides);
app.post('/api/instagram/vignette', upload.single('video'), instagramController.addVignette);
app.post('/api/instagram/zoom', upload.single('video'), instagramController.addZoomEffect);
app.post('/api/instagram/filter', upload.single('video'), instagramController.addColorFilter);
app.post('/api/instagram/optimized', upload.single('video'), instagramController.instagramOptimized);
app.post('/api/instagram/simple', upload.single('video'), instagramController.simpleAntiDetection);
app.post('/api/instagram/lightweight', upload.single('video'), instagramController.lightweightAntiDetection);

// Servir arquivos processados
app.get('/download/:filename', (req, res) => {
  const filepath = path.join(__dirname, 'uploads', req.params.filename);

  if (!fs.existsSync(filepath)) {
    return res.status(404).json({ error: 'Arquivo não encontrado' });
  }

  res.download(filepath, (err) => {
    if (err) console.error(err);
    // Opcional: deletar arquivo após download
    // fs.unlinkSync(filepath);
  });
});

// Listar arquivos
app.get('/files', (req, res) => {
  const uploadsDir = path.join(__dirname, 'uploads');

  if (!fs.existsSync(uploadsDir)) {
    return res.json({ files: [] });
  }

  const files = fs.readdirSync(uploadsDir).map(file => ({
    filename: file,
    size: fs.statSync(path.join(uploadsDir, file)).size,
    url: `${process.env.API_URL || 'http://localhost:3000'}/download/${file}`
  }));

  res.json({ files });
});

// Deletar arquivo
app.delete('/files/:filename', (req, res) => {
  const filepath = path.join(__dirname, 'uploads', req.params.filename);

  if (!fs.existsSync(filepath)) {
    return res.status(404).json({ error: 'Arquivo não encontrado' });
  }

  fs.unlinkSync(filepath);
  res.json({ message: 'Arquivo deletado com sucesso' });
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: err.message || 'Erro interno do servidor' });
});

app.listen(PORT, () => {
  console.log(`📹 API de vídeos rodando em http://localhost:${PORT}`);
  console.log(`📊 Status: http://localhost:${PORT}/health`);
});

module.exports = app;
