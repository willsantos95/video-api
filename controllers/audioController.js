const ffmpeg = require('fluent-ffmpeg');
const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');
const { promisify } = require('util');

const execPromise = promisify(exec);

const getOutputPath = (inputPath, suffix, format = 'mp3') => {
  const dir = path.dirname(inputPath);
  const basename = path.basename(inputPath, path.extname(inputPath));
  return path.join(dir, `${basename}_${suffix}.${format}`);
};

const getExecutionTime = (startTime) => {
  return parseFloat(((Date.now() - startTime) / 1000).toFixed(2));
};

const extractAudio = (req, res) => {
  const startTime = Date.now();
  if (!req.file) {
    return res.status(400).json({ error: 'Nenhum arquivo enviado' });
  }

  const inputPath = req.file.path;
  const format = req.body.format || 'mp3'; // mp3, aac, wav, flac, ogg
  const bitrate = req.body.bitrate || '192k';
  const outputPath = getOutputPath(inputPath, 'audio', format);

  ffmpeg(inputPath)
    .output(outputPath)
    .audioCodec('libmp3lame')
    .audioBitrate(bitrate)
    .on('end', () => {
      res.json({
        success: true,
        message: 'Áudio extraído com sucesso',
        file: path.basename(outputPath),
        format: format,
        bitrate: bitrate,
        executionTime: getExecutionTime(startTime),
        url: `${process.env.API_URL || 'http://localhost:3000'}/download/${path.basename(outputPath)}`
      });
    })
    .on('error', (err) => {
      res.status(500).json({ error: err.message });
    })
    .run();
};

const addAudioToVideo = (req, res) => {
  const startTime = Date.now();
  const videoFile = req.files['video']?.[0];
  const audioFile = req.files['audio']?.[0];

  if (!videoFile || !audioFile) {
    return res.status(400).json({ error: 'Vídeo e áudio são obrigatórios' });
  }

  const videoPath = videoFile.path;
  const audioPath = audioFile.path;
  const outputPath = path.join(path.dirname(videoPath), `with_audio_${Date.now()}.mp4`);

  ffmpeg()
    .input(videoPath)
    .input(audioPath)
    .output(outputPath)
    .outputOptions([
      '-c:v copy',
      '-c:a aac',
      '-map 0:v:0',
      '-map 1:a:0'
    ])
    .on('end', () => {
      res.json({
        success: true,
        message: 'Áudio adicionado ao vídeo com sucesso',
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

const textToAudio = async (req, res) => {
  const startTime = Date.now();
  const { text, language = 'pt-BR', speed = 1.0 } = req.body;

  if (!text) {
    return res.status(400).json({ error: 'text é obrigatório' });
  }

  try {
    const outputPath = path.join(__dirname, '../uploads', `tts_${Date.now()}.mp3`);

    // Usar espeak para síntese de fala (open source)
    const cmd = `echo "${text}" | espeak -v ${language} -s ${Math.round(150 * speed)} -w ${outputPath}`;

    await execPromise(cmd);

    res.json({
      success: true,
      message: 'Áudio de texto gerado com sucesso',
      file: path.basename(outputPath),
      language: language,
      speed: speed,
      executionTime: getExecutionTime(startTime),
      url: `${process.env.API_URL || 'http://localhost:3000'}/download/${path.basename(outputPath)}`
    });
  } catch (err) {
    res.status(500).json({
      error: 'Falha ao gerar áudio. Certifique-se que espeak está instalado',
      details: err.message
    });
  }
};

const convertAudio = (req, res) => {
  const startTime = Date.now();
  if (!req.file) {
    return res.status(400).json({ error: 'Nenhum arquivo enviado' });
  }

  const { format = 'mp3', bitrate = '192k' } = req.body;
  const inputPath = req.file.path;
  const outputPath = getOutputPath(inputPath, 'converted', format);

  const codecMap = {
    'mp3': 'libmp3lame',
    'aac': 'aac',
    'wav': 'pcm_s16le',
    'flac': 'flac',
    'ogg': 'libvorbis'
  };

  ffmpeg(inputPath)
    .output(outputPath)
    .audioCodec(codecMap[format] || 'libmp3lame')
    .audioBitrate(bitrate)
    .on('end', () => {
      res.json({
        success: true,
        message: `Áudio convertido para ${format}`,
        file: path.basename(outputPath),
        format: format,
        bitrate: bitrate,
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
  extractAudio,
  addAudioToVideo,
  textToAudio,
  convertAudio
};
