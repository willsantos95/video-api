const ffmpeg = require('fluent-ffmpeg');
const path = require('path');
const fs = require('fs');

const getOutputPath = (inputPath, suffix, format = 'mp4') => {
  const dir = path.dirname(inputPath);
  const basename = path.basename(inputPath, path.extname(inputPath));
  return path.join(dir, `${basename}_${suffix}.${format}`);
};

const getExecutionTime = (startTime) => {
  return parseFloat(((Date.now() - startTime) / 1000).toFixed(2));
};

const compressVideo = (req, res) => {
  const startTime = Date.now();
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
        executionTime: getExecutionTime(startTime),
        url: `${process.env.API_URL || 'http://localhost:3000'}/download/${path.basename(outputPath)}`
      });
    })
    .on('error', (err) => {
      res.status(500).json({ error: err.message });
    })
    .run();
};

const convertFormat = (req, res) => {
  const startTime = Date.now();
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
        executionTime: getExecutionTime(startTime),
        url: `${process.env.API_URL || 'http://localhost:3000'}/download/${path.basename(outputPath)}`
      });
    })
    .on('error', (err) => {
      res.status(500).json({ error: err.message });
    })
    .run();
};

const trimVideo = (req, res) => {
  const startTime = Date.now();
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
        executionTime: getExecutionTime(startTime),
        url: `${process.env.API_URL || 'http://localhost:3000'}/download/${path.basename(outputPath)}`
      });
    })
    .on('error', (err) => {
      res.status(500).json({ error: err.message });
    })
    .run();
};

const resizeVideo = (req, res) => {
  const startTime = Date.now();
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
        executionTime: getExecutionTime(startTime),
        url: `${process.env.API_URL || 'http://localhost:3000'}/download/${path.basename(outputPath)}`
      });
    })
    .on('error', (err) => {
      res.status(500).json({ error: err.message });
    })
    .run();
};

const addWatermark = (req, res) => {
  const startTime = Date.now();
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
        executionTime: getExecutionTime(startTime),
        url: `${process.env.API_URL || 'http://localhost:3000'}/download/${path.basename(outputPath)}`
      });
    })
    .on('error', (err) => {
      res.status(500).json({ error: err.message });
    })
    .run();
};

const extractThumbnail = (req, res) => {
  const startTime = Date.now();
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
        executionTime: getExecutionTime(startTime),
        url: `${process.env.API_URL || 'http://localhost:3000'}/download/${path.basename(outputPath)}`
      });
    })
    .on('error', (err) => {
      res.status(500).json({ error: err.message });
    })
    .run();
};

const mergeVideos = (req, res) => {
  const startTime = Date.now();
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
        executionTime: getExecutionTime(startTime),
        url: `${process.env.API_URL || 'http://localhost:3000'}/download/${path.basename(outputPath)}`
      });
    })
    .on('error', (err) => {
      res.status(500).json({ error: err.message });
    })
    .run();
};

const removeLogo = (req, res) => {
  const startTime = Date.now();
  if (!req.file) {
    return res.status(400).json({ error: 'Nenhum arquivo enviado' });
  }

  const {
    method = 'blur',
    logoX = '10',
    logoY = '10',
    logoWidth = '200',
    logoHeight = '100',
    cropTop = '0',
    cropBottom = '0'
  } = req.body;

  const inputPath = req.file.path;
  const outputPath = getOutputPath(inputPath, `no-logo-${method}`);

  let videoFilter = '';

  if (method === 'blur') {
    videoFilter = `delogo=x=${logoX}:y=${logoY}:w=${logoWidth}:h=${logoHeight}`;
  } else if (method === 'crop') {
    const cropStr = `crop=iw:ih-${parseInt(cropTop)}-${parseInt(cropBottom)}:0:${cropTop}`;
    videoFilter = cropStr;
  } else if (method === 'pixelize') {
    videoFilter = `boxblur=10:2:enable='between(t,0,100)'[bg];[0][bg]overlay=x=${logoX}:y=${logoY}:w=${logoWidth}:h=${logoHeight}`;
  }

  ffmpeg(inputPath)
    .output(outputPath)
    .videoFilters(videoFilter)
    .outputOptions(['-c:a copy'])
    .on('end', () => {
      res.json({
        success: true,
        message: `Logo removido com método: ${method}`,
        file: path.basename(outputPath),
        method: method,
        executionTime: getExecutionTime(startTime),
        parameters: {
          logoX,
          logoY,
          logoWidth,
          logoHeight,
          cropTop,
          cropBottom
        },
        url: `${process.env.API_URL || 'http://localhost:3000'}/download/${path.basename(outputPath)}`
      });
    })
    .on('error', (err) => {
      res.status(500).json({ error: err.message });
    })
    .run();
};

const addLogo = (req, res) => {
  const startTime = Date.now();
  if (!req.files || !req.files.video || !req.files.logo) {
    return res.status(400).json({ error: 'Vídeo e logo são obrigatórios' });
  }

  const videoFile = req.files.video[0];
  const logoFile = req.files.logo[0];

  if (!videoFile || !logoFile) {
    return res.status(400).json({ error: 'Vídeo e logo são obrigatórios' });
  }

  const videoPath = videoFile.path;
  const logoPath = logoFile.path;
  const {
    position = 'top-right',
    scale = '0.2',
    opacity = '1.0',
    margin = '20',
    x = null,
    y = null
  } = req.body;

  const outputPath = path.join(path.dirname(videoPath), `with_logo_${Date.now()}.mp4`);

  const positionMap = {
    'top-left': `x=${margin}:y=${margin}`,
    'top-right': `x=W-w-${margin}:y=${margin}`,
    'bottom-left': `x=${margin}:y=H-h-${margin}`,
    'bottom-right': `x=W-w-${margin}:y=H-h-${margin}`,
    'center': `x=(W-w)/2:y=(H-h)/2`
  };

  let overlayPosition;
  if (x !== null && y !== null) {
    overlayPosition = `x=${x}:y=${y}`;
  } else {
    overlayPosition = positionMap[position];
  }

  const scaleFactor = parseFloat(scale);

  ffmpeg(videoPath)
    .input(logoPath)
    .output(outputPath)
    .complexFilter(`[1:v]scale=iw*${scaleFactor}:ih*${scaleFactor}[logo];[0:v][logo]overlay=${overlayPosition}`)
    .outputOptions(['-c:a aac', '-b:a 128k', '-c:v libx264', '-pix_fmt yuv420p'])
    .on('end', () => {
      const response = {
        success: true,
        message: 'Logo adicionado com sucesso',
        file: path.basename(outputPath),
        scale: scale,
        opacity: opacity,
        executionTime: getExecutionTime(startTime),
        url: `${process.env.API_URL || 'http://localhost:3000'}/download/${path.basename(outputPath)}`
      };

      if (x !== null && y !== null) {
        response.positioning = 'custom';
        response.x = x;
        response.y = y;
      } else {
        response.positioning = 'preset';
        response.position = position;
      }

      res.json(response);
    })
    .on('error', (err) => {
      res.status(500).json({ error: err.message });
    })
    .run();
};

const removeAndAddLogo = (req, res) => {
  const startTime = Date.now();
  if (!req.files || !req.files.video || !req.files.logo) {
    return res.status(400).json({ error: 'Vídeo e logo são obrigatórios' });
  }

  const videoFile = req.files.video[0];
  const logoFile = req.files.logo[0];

  if (!videoFile || !logoFile) {
    return res.status(400).json({ error: 'Vídeo e logo são obrigatórios' });
  }

  const videoPath = videoFile.path;
  const logoPath = logoFile.path;
  const {
    logoX = '10',
    logoY = '10',
    logoWidth = '200',
    logoHeight = '100',
    newLogoX = '50',
    newLogoY = '50',
    logoScale = '0.6',
    quality = '28',
    centerLogo = 'true',
    removalMethod = 'blur'
  } = req.body;

  const finalOutputPath = path.join(path.dirname(videoPath), `replaced_logo_${Date.now()}.mp4`);

  // Use old logo position if centerLogo is enabled (simpler and more reliable)
  const shouldCenter = centerLogo === 'true' || centerLogo === true;
  const overlayX = shouldCenter ? logoX : newLogoX;
  const overlayY = shouldCenter ? logoY : newLogoY;

  // Build removal filter based on method
  let removalFilterStr;
  if (removalMethod === 'pixelize') {
    removalFilterStr = `boxblur=15:4`;
  } else if (removalMethod === 'crop') {
    removalFilterStr = `crop=iw:ih-${logoHeight}:0:0`;
  } else {
    // default: blur (delogo)
    removalFilterStr = `delogo=x=${logoX}:y=${logoY}:w=${logoWidth}:h=${logoHeight}`;
  }

  const complexFilterStr = `[0]${removalFilterStr}[delogged];[1:v]scale=iw*${logoScale}:ih*${logoScale}[logo];[delogged][logo]overlay=x=${overlayX}:y=${overlayY}[out]`;

  ffmpeg(videoPath)
    .input(logoPath)
    .output(finalOutputPath)
    .complexFilter(complexFilterStr, ['out'])
    .outputOptions([
      '-c:v libx264',
      `-crf ${quality}`,
      '-preset fast',
      '-c:a aac',
      '-b:a 128k',
      '-pix_fmt yuv420p'
    ])
    .on('end', () => {
      res.json({
        success: true,
        message: 'Logo removido e novo logo adicionado com sucesso',
        file: path.basename(finalOutputPath),
        oldLogoRemoval: {
          method: removalMethod,
          x: logoX,
          y: logoY,
          width: logoWidth,
          height: logoHeight
        },
        newLogoAdded: {
          x: overlayX,
          y: overlayY,
          scale: logoScale,
          centered: shouldCenter
        },
        recommendations: {
          note: 'Se o borrão do logo antigo ainda é visível:',
          option1: 'Aumentar logoScale (ex: 0.7, 0.8, 1.0 para cobrir melhor)',
          option2: 'Trocar removalMethod para "pixelize" (mais sutil)',
          option3: 'Usar removalMethod "crop" para remover a área completamente'
        },
        executionTime: getExecutionTime(startTime),
        url: `${process.env.API_URL || 'http://localhost:3000'}/download/${path.basename(finalOutputPath)}`
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
  mergeVideos,
  removeLogo,
  addLogo,
  removeAndAddLogo
};
