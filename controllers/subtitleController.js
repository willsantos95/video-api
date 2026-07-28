const ffmpeg = require('fluent-ffmpeg');
const path = require('path');
const fs = require('fs');
const { OpenAI } = require('openai');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const getOutputPath = (inputPath, suffix, format = 'srt') => {
  const dir = path.dirname(inputPath);
  const basename = path.basename(inputPath, path.extname(inputPath));
  return path.join(dir, `${basename}_${suffix}.${format}`);
};

const generateSubtitle = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Nenhum arquivo enviado' });
  }

  if (!process.env.OPENAI_API_KEY) {
    return res.status(400).json({ error: 'OPENAI_API_KEY não configurada' });
  }

  try {
    const inputPath = req.file.path;
    const language = req.body.language || 'pt';
    const outputPath = getOutputPath(inputPath, 'subtitle');
    const audioPath = path.join(path.dirname(inputPath), `audio_${Date.now()}.mp3`);

    // 1. Extrair áudio do vídeo
    await new Promise((resolve, reject) => {
      ffmpeg(inputPath)
        .output(audioPath)
        .audioCodec('libmp3lame')
        .audioChannels(1)
        .audioFrequency(16000)
        .on('end', resolve)
        .on('error', reject)
        .run();
    });

    // 2. Transcrever com OpenAI Whisper
    const transcript = await openai.audio.transcriptions.create({
      file: fs.createReadStream(audioPath),
      model: 'whisper-1',
      language: language === 'pt' ? 'pt' : language
    });

    // 3. Gerar arquivo SRT com timestamps
    const srtContent = generateSRTFromTranscription(transcript.text);
    fs.writeFileSync(outputPath, srtContent);

    // Limpar arquivo de áudio temporário
    fs.unlinkSync(audioPath);

    res.json({
      success: true,
      message: 'Legendas geradas com OpenAI Whisper',
      file: path.basename(outputPath),
      format: 'srt',
      language: language,
      transcription: transcript.text,
      url: `${process.env.API_URL || 'http://localhost:3000'}/download/${path.basename(outputPath)}`
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const generateSRTFromTranscription = (text) => {
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
  let srt = '';
  let timeInSeconds = 0;
  const avgWordsPerSecond = 3;

  sentences.forEach((sentence, index) => {
    const trimmedSentence = sentence.trim();
    const wordCount = trimmedSentence.split(/\s+/).length;
    const duration = Math.max((wordCount / avgWordsPerSecond), 2);

    const startTime = formatSRTTime(timeInSeconds);
    const endTime = formatSRTTime(timeInSeconds + duration);

    srt += `${index + 1}\n${startTime} --> ${endTime}\n${trimmedSentence}\n\n`;
    timeInSeconds += duration;
  });

  return srt;
};

const formatSRTTime = (seconds) => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 1000);

  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')},${String(ms).padStart(3, '0')}`;
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
