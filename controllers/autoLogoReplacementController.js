const ffmpeg = require('fluent-ffmpeg');
const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');

const getExecutionTime = (startTime) => {
  return parseFloat(((Date.now() - startTime) / 1000).toFixed(2));
};

const cleanupFiles = (...files) => {
  files.forEach(file => {
    try {
      if (fs.existsSync(file)) fs.unlinkSync(file);
    } catch (e) {
      console.error(`Failed to cleanup ${file}:`, e.message);
    }
  });
};

const autoReplaceLogoWithDetection = (req, res) => {
  const startTime = Date.now();

  if (!req.files || !req.files.video || !req.files.oldLogo || !req.files.newLogo) {
    return res.status(400).json({
      success: false,
      error: 'Vídeo, logo antiga e logo nova são obrigatórios'
    });
  }

  const videoFile = req.files.video[0];
  const oldLogoFile = req.files.oldLogo[0];
  const newLogoFile = req.files.newLogo[0];

  if (!videoFile || !oldLogoFile || !newLogoFile) {
    return res.status(400).json({
      success: false,
      error: 'Vídeo, logo antiga e logo nova são obrigatórios'
    });
  }

  const videoPath = videoFile.path;
  const oldLogoPath = oldLogoFile.path;
  const newLogoPath = newLogoFile.path;
  const frameOutputPath = path.join(path.dirname(videoPath), `frame_${Date.now()}.jpg`);
  const detectResultsPath = path.join(path.dirname(videoPath), `detect_${Date.now()}.json`);
  const finalOutputPath = path.join(path.dirname(videoPath), `replaced_auto_${Date.now()}.mp4`);

  const {
    quality = '28',
    blendMode = 'overlay',
    logoOffsetX = '0',
    logoOffsetY = '0',
    coverColor = 'white'
  } = req.body;

  try {
    ffmpeg(videoPath)
      .seekInput(0)
      .output(frameOutputPath)
      .outputOptions(['-vframes', '1', '-q:v', '2'])
      .on('end', () => {
        try {
          const pythonScript = path.join(__dirname, '..', 'utils', 'detect_logo.py');

          if (!fs.existsSync(pythonScript)) {
            cleanupFiles(frameOutputPath);
            return res.status(500).json({
              success: false,
              error: 'Script de detecção não encontrado'
            });
          }

          try {
            const detectCommand = `python3 "${pythonScript}" "${frameOutputPath}" "${oldLogoPath}" "${detectResultsPath}"`;
            console.log(`[Auto Replace] Detectando logo...`);

            execSync(detectCommand, { timeout: 30000, stdio: 'pipe' });

            if (!fs.existsSync(detectResultsPath)) {
              throw new Error('Falha ao gerar resultado de detecção');
            }

            const detectionResults = JSON.parse(fs.readFileSync(detectResultsPath, 'utf-8'));

            if (!detectionResults.success) {
              cleanupFiles(frameOutputPath, detectResultsPath);
              return res.json({
                success: false,
                message: 'Não foi possível detectar a logo antiga',
                error: detectionResults.message,
                executionTime: getExecutionTime(startTime)
              });
            }

            console.log(`[Auto Replace] Logo detectada em (${detectionResults.x}, ${detectionResults.y})`);

            const logoX = Math.round(detectionResults.x);
            const logoY = Math.round(detectionResults.y);
            const logoWidth = Math.round(detectionResults.width);
            const logoHeight = Math.round(detectionResults.height);
            const confidence = detectionResults.confidence;

            const offsetX = parseInt(logoOffsetX);
            const offsetY = parseInt(logoOffsetY);

            const newLogoX = logoX + offsetX;
            const newLogoY = logoY + offsetY;

            const complexFilterStr = `[0]drawbox=x=${logoX}:y=${logoY}:w=${logoWidth}:h=${logoHeight}:color=${coverColor}:thickness=fill[covered];[1:v]scale=${logoWidth}:${logoHeight}[logo];[covered][logo]overlay=x=${newLogoX}:y=${newLogoY}[out]`;

            console.log(`[Auto Replace] Substituindo logo com filter: ${complexFilterStr}`);

            ffmpeg(videoPath)
              .input(newLogoPath)
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
                cleanupFiles(frameOutputPath, detectResultsPath);

                res.json({
                  success: true,
                  message: 'Logo substituída automaticamente com sucesso',
                  file: path.basename(finalOutputPath),
                  detection: {
                    x: logoX,
                    y: logoY,
                    width: logoWidth,
                    height: logoHeight,
                    confidence: parseFloat(confidence.toFixed(4))
                  },
                  replacement: {
                    method: 'drawbox + overlay',
                    coverColor: coverColor,
                    positionOffset: {
                      x: offsetX,
                      y: offsetY
                    }
                  },
                  executionTime: getExecutionTime(startTime),
                  url: `${process.env.API_URL || 'http://localhost:3000'}/download/${path.basename(finalOutputPath)}`
                });
              })
              .on('error', (err) => {
                cleanupFiles(frameOutputPath, detectResultsPath);
                console.error('[Auto Replace] Erro FFmpeg:', err.message);
                res.status(500).json({
                  success: false,
                  error: 'Erro ao substituir logo: ' + err.message,
                  executionTime: getExecutionTime(startTime)
                });
              })
              .run();
          } catch (pythonErr) {
            cleanupFiles(frameOutputPath, detectResultsPath);
            console.error('[Auto Replace] Erro detecção:', pythonErr.message);
            res.status(500).json({
              success: false,
              error: 'Erro na detecção: ' + pythonErr.message,
              executionTime: getExecutionTime(startTime)
            });
          }
        } catch (err) {
          cleanupFiles(frameOutputPath, detectResultsPath);
          console.error('[Auto Replace] Erro processamento:', err.message);
          res.status(500).json({
            success: false,
            error: 'Erro ao processar: ' + err.message,
            executionTime: getExecutionTime(startTime)
          });
        }
      })
      .on('error', (err) => {
        cleanupFiles(frameOutputPath, detectResultsPath);
        console.error('[Auto Replace] Erro extração frame:', err.message);
        res.status(500).json({
          success: false,
          error: 'Erro ao extrair frame: ' + err.message,
          executionTime: getExecutionTime(startTime)
        });
      })
      .run();
  } catch (err) {
    cleanupFiles(frameOutputPath, detectResultsPath);
    console.error('[Auto Replace] Erro geral:', err.message);
    res.status(500).json({
      success: false,
      error: err.message,
      executionTime: getExecutionTime(startTime)
    });
  }
};

module.exports = {
  autoReplaceLogoWithDetection
};
