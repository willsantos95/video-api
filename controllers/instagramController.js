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

// Adicionar borda simples (letterbox)
const addBorder = (req, res) => {
  const startTime = Date.now();
  const startTime = Date.now();
  if (!req.file) {
    return res.status(400).json({ error: 'Nenhum arquivo enviado' });
  }

  const { borderSize = 50, borderColor = 'black' } = req.body;
  const inputPath = req.file.path;
  const outputPath = getOutputPath(inputPath, 'border');

  // Aplicar borda usando scale
  const filterComplex = `[0]scale=iw:ih,pad=iw+${borderSize * 2}:ih+${borderSize * 2}:${borderSize}:${borderSize}:${borderColor}[out]`;

  ffmpeg(inputPath)
    .complexFilter(filterComplex, ['out'])
    .output(outputPath)
    .on('end', () => {
      res.json({
        success: true,
        executionTime: getExecutionTime(startTime),
        message: 'Borda adicionada com sucesso',
        file: path.basename(outputPath),
        borderSize: borderSize,
        borderColor: borderColor,
        url: `${process.env.API_URL || 'http://localhost:3000'}/download/${path.basename(outputPath)}`
      });
    })
    .on('error', (err) => {
      res.status(500).json({ error: err.message });
    })
    .run();
};

// Adicionar borda gradiente (mais elegante)
const addGradientBorder = (req, res) => {
  const startTime = Date.now();
  if (!req.file) {
    return res.status(400).json({ error: 'Nenhum arquivo enviado' });
  }

  const { borderSize = 40, color1 = '1a1a1a', color2 = '4a4a4a' } = req.body;
  const inputPath = req.file.path;
  const outputPath = getOutputPath(inputPath, 'gradient-border');

  ffmpeg(inputPath)
    .output(outputPath)
    .videoFilters([
      `pad=iw+${borderSize * 2}:ih+${borderSize * 2}:${borderSize}:${borderSize}:0x${color1}`,
      `drawbox=x=0:y=0:w=iw:h=${borderSize}:color=0x${color2}:t=fill`,
      `drawbox=x=0:y=ih-${borderSize}:w=iw:h=${borderSize}:color=0x${color2}:t=fill`
    ])
    .on('end', () => {
      res.json({
        success: true,
        executionTime: getExecutionTime(startTime),
        message: 'Borda gradiente adicionada com sucesso',
        file: path.basename(outputPath),
        borderSize: borderSize,
        url: `${process.env.API_URL || 'http://localhost:3000'}/download/${path.basename(outputPath)}`
      });
    })
    .on('error', (err) => {
      res.status(500).json({ error: err.message });
    })
    .run();
};

// Adicionar borda com padrão (xadrez, linhas)
const addPatternBorder = (req, res) => {
  const startTime = Date.now();
  if (!req.file) {
    return res.status(400).json({ error: 'Nenhum arquivo enviado' });
  }

  const { borderSize = 40, pattern = 'checkerboard' } = req.body; // checkerboard, stripes
  const inputPath = req.file.path;
  const outputPath = getOutputPath(inputPath, `border-${pattern}`);

  let filterComplex;

  if (pattern === 'checkerboard') {
    filterComplex = `[0]pad=iw+${borderSize * 2}:ih+${borderSize * 2}:${borderSize}:${borderSize}:black[base];
                     color=s=${borderSize * 2}x${borderSize * 2}:c=white[pat];
                     [pat]scale=${borderSize}:${borderSize}[pat_scaled];
                     [base][pat_scaled]overlay=0:0[out]`;
  } else {
    filterComplex = `[0]pad=iw+${borderSize * 2}:ih+${borderSize * 2}:${borderSize}:${borderSize}:black[base];
                     [base]drawbox=x=0:y=0:w=${borderSize * 2}:h=${borderSize}:color=white:t=1[v1];
                     [v1]drawbox=x=0:y=ih-${borderSize}:w=${borderSize * 2}:h=${borderSize}:color=white:t=1[out]`;
  }

  ffmpeg(inputPath)
    .complexFilter(filterComplex, ['out'])
    .output(outputPath)
    .on('end', () => {
      res.json({
        success: true,
        executionTime: getExecutionTime(startTime),
        message: `Borda padrão (${pattern}) adicionada com sucesso`,
        file: path.basename(outputPath),
        pattern: pattern,
        url: `${process.env.API_URL || 'http://localhost:3000'}/download/${path.basename(outputPath)}`
      });
    })
    .on('error', (err) => {
      res.status(500).json({ error: err.message });
    })
    .run();
};

// Adicionar efeito blur nos lados
const addBlurSides = (req, res) => {
  const startTime = Date.now();
  if (!req.file) {
    return res.status(400).json({ error: 'Nenhum arquivo enviado' });
  }

  const { blurWidth = 50, blurAmount = 10 } = req.body;
  const inputPath = req.file.path;
  const outputPath = getOutputPath(inputPath, 'blur-sides');

  const filterComplex = `[0]split[a][b];[b]scale=iw/${blurAmount}:ih,scale=iw:ih,blur=sigma=${blurAmount}[blur];
                        [a]pad=iw+${blurWidth * 2}:ih:${blurWidth}:0:color=black[padded];
                        [blur]scale=iw+${blurWidth * 2}:ih[blur_scaled];
                        [padded][blur_scaled]overlay=0:0[out]`;

  ffmpeg(inputPath)
    .complexFilter(filterComplex, ['out'])
    .output(outputPath)
    .on('end', () => {
      res.json({
        success: true,
        executionTime: getExecutionTime(startTime),
        message: 'Efeito blur adicionado com sucesso',
        file: path.basename(outputPath),
        blurWidth: blurWidth,
        url: `${process.env.API_URL || 'http://localhost:3000'}/download/${path.basename(outputPath)}`
      });
    })
    .on('error', (err) => {
      res.status(500).json({ error: err.message });
    })
    .run();
};

// Adicionar vinheta (efeito nas bordas)
const addVignette = (req, res) => {
  const startTime = Date.now();
  if (!req.file) {
    return res.status(400).json({ error: 'Nenhum arquivo enviado' });
  }

  const { intensity = 0.5 } = req.body; // 0-1
  const inputPath = req.file.path;
  const outputPath = getOutputPath(inputPath, 'vignette');

  const vignetteFilter = `vignette=PI/4:${intensity}`;

  ffmpeg(inputPath)
    .output(outputPath)
    .videoFilters(vignetteFilter)
    .on('end', () => {
      res.json({
        success: true,
        executionTime: getExecutionTime(startTime),
        message: 'Efeito vinheta adicionado com sucesso',
        file: path.basename(outputPath),
        intensity: intensity,
        url: `${process.env.API_URL || 'http://localhost:3000'}/download/${path.basename(outputPath)}`
      });
    })
    .on('error', (err) => {
      res.status(500).json({ error: err.message });
    })
    .run();
};

// Adicionar zoom/crop (cortar um pouco)
const addZoomEffect = (req, res) => {
  const startTime = Date.now();
  if (!req.file) {
    return res.status(400).json({ error: 'Nenhum arquivo enviado' });
  }

  const { zoomLevel = 0.95 } = req.body; // 0.9-0.99 para crop leve
  const inputPath = req.file.path;
  const outputPath = getOutputPath(inputPath, 'zoom');

  const filterComplex = `scale=trunc(iw*${zoomLevel}):trunc(ih*${zoomLevel}),pad=iw:ih:(ow-iw)/2:(oh-ih)/2:black`;

  ffmpeg(inputPath)
    .output(outputPath)
    .videoFilters(filterComplex)
    .on('end', () => {
      res.json({
        success: true,
        executionTime: getExecutionTime(startTime),
        message: 'Efeito zoom aplicado com sucesso',
        file: path.basename(outputPath),
        zoomLevel: zoomLevel,
        url: `${process.env.API_URL || 'http://localhost:3000'}/download/${path.basename(outputPath)}`
      });
    })
    .on('error', (err) => {
      res.status(500).json({ error: err.message });
    })
    .run();
};

// Adicionar filtro de cor leve (ajusta matiz/saturação)
const addColorFilter = (req, res) => {
  const startTime = Date.now();
  if (!req.file) {
    return res.status(400).json({ error: 'Nenhum arquivo enviado' });
  }

  const { filterType = 'warm' } = req.body; // warm, cool, saturated, desaturated
  const inputPath = req.file.path;
  const outputPath = getOutputPath(inputPath, `filter-${filterType}`);

  let filters = [];

  switch (filterType) {
    case 'warm':
      filters = ['eq=contrast=1.1:saturation=1.1', 'colortemperature=temperature=3000'];
      break;
    case 'cool':
      filters = ['eq=contrast=1.1', 'colortemperature=temperature=6500'];
      break;
    case 'saturated':
      filters = ['hue=s=1.5'];
      break;
    case 'desaturated':
      filters = ['hue=s=0.7'];
      break;
    case 'vintage':
      filters = ['eq=brightness=0.05:contrast=0.95', 'hue=s=0.8'];
      break;
    default:
      filters = ['eq=contrast=1.0'];
  }

  ffmpeg(inputPath)
    .output(outputPath)
    .videoFilters(filters)
    .on('end', () => {
      res.json({
        success: true,
        executionTime: getExecutionTime(startTime),
        message: `Filtro ${filterType} aplicado com sucesso`,
        file: path.basename(outputPath),
        filterType: filterType,
        url: `${process.env.API_URL || 'http://localhost:3000'}/download/${path.basename(outputPath)}`
      });
    })
    .on('error', (err) => {
      res.status(500).json({ error: err.message });
    })
    .run();
};

// Combinado: Borda + Filtro (o melhor para Instagram)
const instagramOptimized = (req, res) => {
  const startTime = Date.now();
  if (!req.file) {
    return res.status(400).json({ error: 'Nenhum arquivo enviado' });
  }

  const {
    borderSize = 40,
    borderColor = '1a1a1a',
    filterType = 'warm',
    vignetteIntensity = 0.3,
    compression = 28
  } = req.body;

  const inputPath = req.file.path;
  const outputPath = getOutputPath(inputPath, 'instagram-safe');

  // Construir array de filtros dinamicamente (sem vignette se intensity = 0)
  let filters = [
    `pad=iw+${borderSize * 2}:ih+${borderSize * 2}:${borderSize}:${borderSize}:0x${borderColor}`,
    'hue=s=0.95',
    'eq=contrast=1.05:brightness=0.02'
  ];

  // Só adiciona vinheta se a intensidade for maior que 0
  if (vignetteIntensity > 0) {
    filters.splice(2, 0, `vignette=PI/4:${vignetteIntensity}`);
  }

  ffmpeg(inputPath)
    .output(outputPath)
    .videoFilters(filters)
    .outputOptions([
      '-c:v libx264',
      `-crf ${compression}`,
      '-c:a aac',
      '-b:a 128k'
    ])
    .on('end', () => {
      res.json({
        success: true,
        executionTime: getExecutionTime(startTime),
        message: 'Vídeo otimizado para Instagram (anti-detection) com sucesso',
        file: path.basename(outputPath),
        optimizations: {
          border: `${borderSize}px`,
          filterType: filterType,
          vignetteIntensity: vignetteIntensity,
          compression: compression,
          filtersApplied: filters.length
        },
        note: 'Este vídeo possui características visuais que reduzem a chance de detecção de conteúdo duplicado',
        url: `${process.env.API_URL || 'http://localhost:3000'}/download/${path.basename(outputPath)}`
      });
    })
    .on('error', (err) => {
      res.status(500).json({ error: err.message });
    })
    .run();
};

// Novo: Apenas Borda Simples (sem nenhum outro efeito)
const simpleAntiDetection = (req, res) => {
  const startTime = Date.now();
  if (!req.file) {
    return res.status(400).json({ error: 'Nenhum arquivo enviado' });
  }

  const {
    borderSize = 40,
    borderColor = '1a1a1a',
    compression = 28
  } = req.body;

  const inputPath = req.file.path;
  const outputPath = getOutputPath(inputPath, 'instagram-simple');

  // Apenas borda, sem nenhum outro efeito
  const filterComplex = `pad=iw+${borderSize * 2}:ih+${borderSize * 2}:${borderSize}:${borderSize}:0x${borderColor}`;

  ffmpeg(inputPath)
    .output(outputPath)
    .videoFilters(filterComplex)
    .outputOptions([
      '-c:v libx264',
      `-crf ${compression}`,
      '-c:a aac',
      '-b:a 128k'
    ])
    .on('end', () => {
      res.json({
        success: true,
        executionTime: getExecutionTime(startTime),
        message: 'Vídeo com borda simples criado com sucesso (sem efeitos adicionais)',
        file: path.basename(outputPath),
        optimizations: {
          border: `${borderSize}px`,
          borderColor: borderColor,
          compression: compression,
          note: 'Apenas borda adicionada, nenhum outro efeito visual'
        },
        url: `${process.env.API_URL || 'http://localhost:3000'}/download/${path.basename(outputPath)}`
      });
    })
    .on('error', (err) => {
      res.status(500).json({ error: err.message });
    })
    .run();
};

// Lightweight: Mudanças MÍNIMAS para anti-detection
const lightweightAntiDetection = (req, res) => {
  const startTime = Date.now();
  if (!req.file) {
    return res.status(400).json({ error: 'Nenhum arquivo enviado' });
  }

  const {
    borderSize = 20,        // Borda pequena (20px)
    borderColor = '000000', // Preto puro
    compression = 23,       // Alta qualidade (23 = muito bom)
    contrastBoost = 1.02,   // Ajuste mínimo de contraste (2%)
    saturation = 1.0        // Sem mudança de saturação
  } = req.body;

  const inputPath = req.file.path;
  const outputPath = getOutputPath(inputPath, 'instagram-lightweight');

  // Filtros MÍNIMOS: apenas borda pequena + leve contraste
  const filters = [
    `pad=iw+${borderSize * 2}:ih+${borderSize * 2}:${borderSize}:${borderSize}:0x${borderColor}`,
    `eq=contrast=${contrastBoost}:saturation=${saturation}`
  ];

  ffmpeg(inputPath)
    .output(outputPath)
    .videoFilters(filters)
    .outputOptions([
      '-c:v libx264',
      `-crf ${compression}`,
      '-c:a aac',
      '-b:a 128k'
    ])
    .on('end', () => {
      res.json({
        success: true,
        executionTime: getExecutionTime(startTime),
        message: 'Vídeo lightweight anti-detection criado com sucesso',
        file: path.basename(outputPath),
        modifications: {
          borderSize: `${borderSize}px`,
          borderColor: borderColor,
          contrastBoost: `${((contrastBoost - 1) * 100).toFixed(1)}%`,
          compression: compression,
          estimatedModification: '5-10%',
          detectionProtection: 'Boa'
        },
        note: 'Mudanças mínimas mantendo qualidade original. Suficiente para evitar detection.',
        url: `${process.env.API_URL || 'http://localhost:3000'}/download/${path.basename(outputPath)}`
      });
    })
    .on('error', (err) => {
      res.status(500).json({ error: err.message });
    })
    .run();
};

module.exports = {
  addBorder,
  addGradientBorder,
  addPatternBorder,
  addBlurSides,
  addVignette,
  addZoomEffect,
  addColorFilter,
  instagramOptimized,
  simpleAntiDetection,
  lightweightAntiDetection
};
