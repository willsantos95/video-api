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

const getVideoInfo = (req, res) => {
  const startTime = Date.now();

  if (!req.file) {
    return res.status(400).json({
      success: false,
      error: 'Nenhum arquivo de vídeo enviado'
    });
  }

  const videoPath = req.file.path;

  try {
    ffmpeg.ffprobe(videoPath, (err, metadata) => {
      if (err) {
        return res.status(500).json({
          success: false,
          error: 'Erro ao ler metadados do vídeo: ' + err.message,
          executionTime: getExecutionTime(startTime)
        });
      }

      try {
        const videoStream = metadata.streams.find(stream => stream.codec_type === 'video');
        const audioStream = metadata.streams.find(stream => stream.codec_type === 'audio');

        if (!videoStream) {
          return res.status(400).json({
            success: false,
            error: 'Nenhuma stream de vídeo encontrada',
            executionTime: getExecutionTime(startTime)
          });
        }

        const duration = parseFloat(metadata.format.duration || 0);
        const bitrate = parseInt(metadata.format.bit_rate || 0);
        const size = fs.statSync(videoPath).size;

        let fps = 24;
        if (videoStream.r_frame_rate) {
          const [num, den] = videoStream.r_frame_rate.split('/');
          fps = Math.round((parseInt(num) / parseInt(den)) * 100) / 100;
        } else if (videoStream.avg_frame_rate) {
          const [num, den] = videoStream.avg_frame_rate.split('/');
          fps = Math.round((parseInt(num) / parseInt(den)) * 100) / 100;
        }

        const info = {
          success: true,
          video: {
            width: videoStream.width,
            height: videoStream.height,
            duration: parseFloat(duration.toFixed(2)),
            fps: fps,
            codec: videoStream.codec_name,
            bitrate: bitrate,
            format: metadata.format.format_name,
            size: size,
            sizeFormatted: formatBytes(size),
            resolution: `${videoStream.width}x${videoStream.height}`,
            aspectRatio: videoStream.display_aspect_ratio || 'N/A'
          },
          audio: audioStream ? {
            codec: audioStream.codec_name,
            sampleRate: audioStream.sample_rate,
            channels: audioStream.channels,
            bitrate: audioStream.bit_rate
          } : null,
          filename: req.file.originalname,
          executionTime: getExecutionTime(startTime)
        };

        res.json(info);
      } catch (parseErr) {
        res.status(500).json({
          success: false,
          error: 'Erro ao processar metadados: ' + parseErr.message,
          executionTime: getExecutionTime(startTime)
        });
      }
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message,
      executionTime: getExecutionTime(startTime)
    });
  }
};

const formatBytes = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
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
    logoScale = '0.8',
    quality = '28',
    centerLogo = 'true',
    removalColor = 'white',
    logoOffsetX = '0',
    logoOffsetY = '0',
    positionPreset = null
  } = req.body;

  const finalOutputPath = path.join(path.dirname(videoPath), `replaced_logo_${Date.now()}.mp4`);

  // Position presets to keep logo visible
  const positionPresets = {
    'top-left': { x: '20', y: '20' },
    'top-right': { x: 'W-w-20', y: '20' },
    'bottom-left': { x: '20', y: 'H-h-20' },
    'bottom-right': { x: 'W-w-20', y: 'H-h-20' },
    'center': { x: '(W-w)/2', y: '(H-h)/2' }
  };

  // Calculate overlay position
  const shouldCenter = centerLogo === 'true' || centerLogo === true;
  let overlayX, overlayY;

  if (positionPreset && positionPresets[positionPreset]) {
    overlayX = positionPresets[positionPreset].x;
    overlayY = positionPresets[positionPreset].y;
  } else if (shouldCenter) {
    overlayX = parseInt(logoX) + parseInt(logoOffsetX);
    overlayY = parseInt(logoY) + parseInt(logoOffsetY);
  } else {
    overlayX = parseInt(newLogoX) + parseInt(logoOffsetX);
    overlayY = parseInt(newLogoY) + parseInt(logoOffsetY);
  }

  // Build filter chain: drawbox to cover old logo + overlay new logo
  // drawbox: draw filled rectangle at old logo position with specified color
  const complexFilterStr = `[0]drawbox=x=${logoX}:y=${logoY}:w=${logoWidth}:h=${logoHeight}:color=${removalColor}:thickness=fill[covered];[1:v]scale=iw*${logoScale}:ih*${logoScale}[logo];[covered][logo]overlay=x=${overlayX}:y=${overlayY}[out]`;

  ffmpeg(videoPath)
    .input(logoPath)
    .output(finalOutputPath)
    .outputOptions([
      '-filter_complex', complexFilterStr,
      '-map', '[out]',
      '-map', '0:a:0',
      '-c:v', 'libx264',
      `-crf ${quality}`,
      '-preset', 'fast',
      '-c:a', 'aac',
      '-b:a', '128k',
      '-pix_fmt', 'yuv420p'
    ])
    .on('end', () => {
      res.json({
        success: true,
        message: 'Logo removido e novo logo adicionado com sucesso',
        file: path.basename(finalOutputPath),
        oldLogoRemoval: {
          method: 'drawbox (cobertura com cor sólida)',
          color: removalColor,
          x: logoX,
          y: logoY,
          width: logoWidth,
          height: logoHeight
        },
        newLogoAdded: {
          x: overlayX,
          y: overlayY,
          scale: logoScale,
          centered: shouldCenter,
          positionMode: positionPreset ? 'preset' : (shouldCenter ? 'old-logo-position' : 'custom'),
          offset: { x: logoOffsetX, y: logoOffsetY }
        },
        tips: {
          note: 'Se a cor de cobertura não combinar:',
          option1: 'Trocar removalColor: "black", "white", "0x00FF00" (verde), etc',
          option2: 'Aumentar logoScale para cobrir melhor a área',
          option3: 'Usar positionPreset: "top-right", "bottom-right", "center"'
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

const convertToReelsFormat = (req, res) => {
  const startTime = Date.now();
  if (!req.file) {
    return res.status(400).json({ error: 'Nenhum arquivo enviado' });
  }

  const { mode = 'crop', backgroundColor = 'black', quality = '28' } = req.body;
  // mode: 'crop' (corta o vídeo) ou 'pad' (adiciona barras pretas)

  const inputPath = req.file.path;
  const outputPath = getOutputPath(inputPath, 'reels-1080x1920');

  // Dimensões Reels/Shorts: 1080x1920 (vertical)
  const targetWidth = 1080;
  const targetHeight = 1920;

  let filterStr;

  if (mode === 'pad') {
    // Adiciona barras pretas (letterbox/pillarbox) para manter aspect ratio
    filterStr = `scale=${targetWidth}:${targetHeight}:force_original_aspect_ratio=decrease,pad=${targetWidth}:${targetHeight}:(ow-iw)/2:(oh-ih)/2:color=${backgroundColor}`;
  } else {
    // Corta a imagem para 1080x1920 (center crop)
    filterStr = `scale=${targetWidth}:-1,crop=${targetWidth}:${targetHeight}:(in_w-${targetWidth})/2:(in_h-${targetHeight})/2`;
  }

  ffmpeg(inputPath)
    .output(outputPath)
    .videoFilters(filterStr)
    .outputOptions([
      '-c:v', 'libx264',
      `-crf ${quality}`,
      '-preset', 'fast',
      '-c:a', 'aac',
      '-b:a', '128k',
      '-pix_fmt', 'yuv420p'
    ])
    .on('end', () => {
      res.json({
        success: true,
        message: 'Vídeo convertido para formato Reels/Shorts (1080x1920)',
        file: path.basename(outputPath),
        format: '1080x1920',
        mode: mode,
        backgroundColor: mode === 'pad' ? backgroundColor : null,
        executionTime: getExecutionTime(startTime),
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
  mergeVideos,
  removeLogo,
  addLogo,
  removeAndAddLogo,
  convertToReelsFormat,
  getVideoInfo
};
