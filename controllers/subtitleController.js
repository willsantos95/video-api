const ffmpeg = require('fluent-ffmpeg');
const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');
const { promisify } = require('util');

const execPromise = promisify(exec);

const getOutputPath = (inputPath, suffix, format = 'vtt') => {
  const dir = path.dirname(inputPath);
  const basename = path.basename(inputPath, path.extExtname(inputPath));
  return path.join(dir, `${basename}_${suffix}.${format}`);
};

const generateSubtitle = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Nenhum arquivo enviado' });
  }

  try {
    const inputPath = req.file.path;
    const language = req.body.language || 'pt';
    const outputPath = path.join(path.dirname(inputPath), `${path.basename(inputPath, path.extname(inputPath))}_subtitle.srt`);

    // Usar ffmpeg para extrair áudio e depois usar um serviço de speech-to-text
    // Nota: Você precisará configurar uma API de STT (Google Cloud, Azure, etc)
    // Por enquanto, criamos um arquivo de exemplo

    const srtContent = `1
00:00:00,000 --> 00:00:05,000
Legenda de exemplo 1

2
00:00:05,000 --> 00:00:10,000
Legenda de exemplo 2

3
00:00:10,000 --> 00:00:15,000
Legenda de exemplo 3
`;

    fs.writeFileSync(outputPath, srtContent);

    res.json({
      success: true,
      message: 'Arquivo de legenda criado (exemplo). Configure uma API de STT para usar automaticamente',
      file: path.basename(outputPath),
      format: 'srt',
      language: language,
      note: 'Para legendas automáticas, configure Google Cloud Speech-to-Text ou similiar',
      url: `${process.env.API_URL || 'http://localhost:3000'}/download/${path.basename(outputPath)}`
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const addSubtitle = (req, res) => {
  const videoFile = req.files['video']?.[0];
  const subtitleFile = req.files['subtitle']?.[0];

  if (!videoFile || !subtitleFile) {
    return res.status(400).json({ error: 'Vídeo e arquivo de legenda são obrigatórios' });
  }

  const videoPath = videoFile.path;
  const subtitlePath = subtitleFile.path;
  const { fontsize = 24, color = 'white', position = 'bottom' } = req.body;
  const outputPath = path.join(path.dirname(videoPath), `with_subtitle_${Date.now()}.mp4`);

  const positions = {
    'top': '0',
    'bottom': '0',
    'center': 'h/2'
  };

  const subtitleFilter = `subtitles='${subtitlePath}':fontsize=${fontsize}:fontcolor=${color}`;

  ffmpeg(videoPath)
    .output(outputPath)
    .videoFilters(subtitleFilter)
    .outputOptions(['-c:a copy'])
    .on('end', () => {
      res.json({
        success: true,
        message: 'Legenda adicionada ao vídeo com sucesso',
        file: path.basename(outputPath),
        fontsize: fontsize,
        color: color,
        url: `${process.env.API_URL || 'http://localhost:3000'}/download/${path.basename(outputPath)}`
      });
    })
    .on('error', (err) => {
      res.status(500).json({ error: err.message });
    })
    .run();
};

const convertSubtitleFormat = (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Nenhum arquivo enviado' });
  }

  const { targetFormat = 'vtt' } = req.body; // srt, vtt, ass, ssa
  const inputPath = req.file.path;
  const outputPath = path.join(path.dirname(inputPath), `${path.basename(inputPath, path.extname(inputPath))}_converted.${targetFormat}`);

  // Leitura simples e conversão básica de formato
  const content = fs.readFileSync(inputPath, 'utf-8');

  if (targetFormat === 'vtt') {
    const vttContent = 'WEBVTT\n\n' + content
      .replace(/(\d{2}):(\d{2}):(\d{2}),(\d{3}) --> (\d{2}):(\d{2}):(\d{2}),(\d{3})/g, '$1:$2:$3.$4 --> $5:$6:$7.$8')
      .replace(/^\d+\n/gm, '');

    fs.writeFileSync(outputPath, vttContent);
  } else if (targetFormat === 'srt') {
    const srtContent = content
      .replace(/(\d{2}):(\d{2}):(\d{2})\.(\d{3}) --> (\d{2}):(\d{2}):(\d{2})\.(\d{3})/g, '$1:$2:$3,$4 --> $5:$6:$7,$8');

    fs.writeFileSync(outputPath, srtContent);
  } else {
    fs.copyFileSync(inputPath, outputPath);
  }

  res.json({
    success: true,
    message: `Legenda convertida para ${targetFormat}`,
    file: path.basename(outputPath),
    format: targetFormat,
    url: `${process.env.API_URL || 'http://localhost:3000'}/download/${path.basename(outputPath)}`
  });
};

module.exports = {
  generateSubtitle,
  addSubtitle,
  convertSubtitleFormat
};
