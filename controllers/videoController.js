const ffmpeg = require('fluent-ffmpeg');
const path = require('path');
const fs = require('fs');

const getOutputPath = (inputPath, suffix, format = 'mp4') => {
  const dir = path.dirname(inputPath);
  const basename = path.basename(inputPath, path.extname(inputPath));
  return path.join(dir, `${basename}_${suffix}.${format}`);
};

const compressVideo = (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Nenhum arquivo enviado' });
  }

  const inputPath = req.file.path;
  const outputPath = getOutputPath(inputPath, 'compressed');
  const quality = req.body.quality || 28; // 18-51 (menor = melhor)

  ffmpeg(inputPath)
    .output(outputPath)
    .outputOptions([
      '-c:v libx264',
      `-crf ${quality}`,
      '-c:a aac',
      '-b:a 128k'
    ])
    .on('end', () => {
      res.json({
        success: true,
        message: 'Vídeo comprimido com sucesso',
        file: path.basename(outputPath),
        url: `${process.env.API_URL || 'http://localhost:3000'}/download/${path.basename(outputPath)}`
      });
    })
    .on('error', (err) => {
      res.status(500).json({ error: err.message });
    })
    .run();
};

const convertFormat = (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Nenhum arquivo enviado' });
  }

  const inputPath = req.file.path;
  const format = req.body.format || 'mp4'; // mp4, avi, mkv, mov, webm, flv
  const outputPath = getOutputPath(inputPath, 'converted', format);

  ffmpeg(inputPath)
    .output(outputPath)
    .on('end', () => {
      res.json({
        success: true,
        message: `Vídeo convertido para ${format}`,
        file: path.basename(outputPath),
        url: `${process.env.API_URL || 'http://localhost:3000'}/download/${path.basename(outputPath)}`
      });
    })
    .on('error', (err) => {
      res.status(500).json({ error: err.message });
    })
    .run();
};

const trimVideo = (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Nenhum arquivo enviado' });
  }

  const { start, duration } = req.body; // start e duration em segundos
  if (!start || !duration) {
    return res.status(400).json({ error: 'start e duration são obrigatórios' });
  }

  const inputPath = req.file.path;
  const outputPath = getOutputPath(inputPath, 'trimmed');

  ffmpeg(inputPath)
    .seekInput(start)
    .duration(duration)
    .output(outputPath)
    .on('end', () => {
      res.json({
        success: true,
        message: 'Vídeo cortado com sucesso',
        file: path.basename(outputPath),
        url: `${process.env.API_URL || 'http://localhost:3000'}/download/${path.basename(outputPath)}`
      });
    })
    .on('error', (err) => {
      res.status(500).json({ error: err.message });
    })
    .run();
};

const resizeVideo = (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Nenhum arquivo enviado' });
  }

  const { width, height } = req.body;
  if (!width || !height) {
    return res.status(400).json({ error: 'width e height são obrigatórios' });
  }

  const inputPath = req.file.path;
  const outputPath = getOutputPath(inputPath, `${width}x${height}`);

  ffmpeg(inputPath)
    .output(outputPath)
    .videoFilters(`scale=${width}:${height}`)
    .on('end', () => {
      res.json({
        success: true,
        message: 'Vídeo redimensionado com sucesso',
        file: path.basename(outputPath),
        resolution: `${width}x${height}`,
        url: `${process.env.API_URL || 'http://localhost:3000'}/download/${path.basename(outputPath)}`
      });
    })
    .on('error', (err) => {
      res.status(500).json({ error: err.message });
    })
    .run();
};

const addWatermark = (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Nenhum arquivo enviado' });
  }

  const { text, position = 'bottom-right', fontSize = 24 } = req.body;
  if (!text) {
    return res.status(400).json({ error: 'text é obrigatório' });
  }

  const inputPath = req.file.path;
  const outputPath = getOutputPath(inputPath, 'watermark');

  const positions = {
    'top-left': '10:10',
    'top-right': 'W-tw-10:10',
    'bottom-left': '10:H-th-10',
    'bottom-right': 'W-tw-10:H-th-10'
  };

  const textFilter = `drawtext=text='${text}':fontsize=${fontSize}:fontcolor=white:x=${positions[position]}:y=${positions[position]}`;

  ffmpeg(inputPath)
    .output(outputPath)
    .videoFilters(textFilter)
    .on('end', () => {
      res.json({
        success: true,
        message: 'Marca d\'água adicionada com sucesso',
        file: path.basename(outputPath),
        url: `${process.env.API_URL || 'http://localhost:3000'}/download/${path.basename(outputPath)}`
      });
    })
    .on('error', (err) => {
      res.status(500).json({ error: err.message });
    })
    .run();
};

const extractThumbnail = (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Nenhum arquivo enviado' });
  }

  const { timestamp = '00:00:01', size = '320x240' } = req.body;
  const inputPath = req.file.path;
  const outputPath = getOutputPath(inputPath, 'thumbnail', 'jpg');

  ffmpeg(inputPath)
    .seekInput(timestamp)
    .output(outputPath)
    .outputOptions(['-vframes', '1', `-s ${size}`])
    .on('end', () => {
      res.json({
        success: true,
        message: 'Miniatura extraída com sucesso',
        file: path.basename(outputPath),
        url: `${process.env.API_URL || 'http://localhost:3000'}/download/${path.basename(outputPath)}`
      });
    })
    .on('error', (err) => {
      res.status(500).json({ error: err.message });
    })
    .run();
};

const mergeVideos = (req, res) => {
  if (!req.files || req.files.length < 2) {
    return res.status(400).json({ error: 'Mínimo 2 vídeos necessários' });
  }

  const videoPaths = req.files.map(f => f.path);
  const outputPath = path.join(path.dirname(videoPaths[0]), `merged_${Date.now()}.mp4`);

  const concatFile = path.join(path.dirname(videoPaths[0]), `concat_${Date.now()}.txt`);
  const content = videoPaths.map(p => `file '${p}'`).join('\n');

  fs.writeFileSync(concatFile, content);

  ffmpeg()
    .input(concatFile)
    .inputOptions('-f concat', '-safe 0')
    .output(outputPath)
    .on('end', () => {
      fs.unlinkSync(concatFile);
      res.json({
        success: true,
        message: 'Vídeos unificados com sucesso',
        file: path.basename(outputPath),
        url: `${process.env.API_URL || 'http://localhost:3000'}/download/${path.basename(outputPath)}`
      });
    })
    .on('error', (err) => {
      res.status(500).json({ error: err.message });
    })
    .run();
};

module.exports = {
  compressVideo,
  convertFormat,
  trimVideo,
  resizeVideo,
  addWatermark,
  extractThumbnail,
  mergeVideos
};
