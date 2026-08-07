const ffmpeg = require('fluent-ffmpeg');
const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');

const getExecutionTime = (startTime) => {
  return parseFloat(((Date.now() - startTime) / 1000).toFixed(2));
};

const detectLogo = (req, res) => {
  const startTime = Date.now();

  if (!req.files || !req.files.video || !req.files.logo) {
    return res.status(400).json({ error: 'Vídeo e imagem da logo são obrigatórios' });
  }

  const videoFile = req.files.video[0];
  const logoFile = req.files.logo[0];

  if (!videoFile || !logoFile) {
    return res.status(400).json({ error: 'Vídeo e imagem da logo são obrigatórios' });
  }

  const videoPath = videoFile.path;
  const logoPath = logoFile.path;
  const frameOutputPath = path.join(path.dirname(videoPath), `frame_${Date.now()}.jpg`);
  const resultsPath = path.join(path.dirname(videoPath), `detection_${Date.now()}.json`);

  try {
    // 1. Extrair primeiro frame do vídeo
    ffmpeg(videoPath)
      .seekInput(0)
      .output(frameOutputPath)
      .outputOptions(['-vframes', '1', '-q:v', '2'])
      .on('end', () => {
        try {
          // 2. Executar detecção Python (se disponível)
          const pythonScript = path.join(__dirname, '..', 'utils', 'detect_logo.py');

          if (fs.existsSync(pythonScript)) {
            try {
              const command = `python3 "${pythonScript}" "${frameOutputPath}" "${logoPath}" "${resultsPath}"`;
              execSync(command, { timeout: 30000 });

              if (fs.existsSync(resultsPath)) {
                const results = JSON.parse(fs.readFileSync(resultsPath, 'utf-8'));

                // Limpar arquivos temporários
                fs.unlinkSync(frameOutputPath);
                fs.unlinkSync(resultsPath);

                res.json({
                  success: true,
                  message: 'Logo detectada com sucesso',
                  logoPosition: results,
                  executionTime: getExecutionTime(startTime),
                  coordinates: {
                    x: Math.round(results.x),
                    y: Math.round(results.y),
                    width: Math.round(results.width),
                    height: Math.round(results.height),
                    confidence: results.confidence
                  }
                });
                return;
              }
            } catch (pythonErr) {
              console.log('Python detection fallback activated');
            }
          }

          // 3. Fallback: detecção simples (edge case)
          fs.unlinkSync(frameOutputPath);
          res.json({
            success: false,
            message: 'Detecção automática não disponível. Use a detecção manual.',
            hint: 'Instale Python 3 e OpenCV: pip install opencv-python numpy',
            executionTime: getExecutionTime(startTime)
          });
        } catch (err) {
          if (fs.existsSync(frameOutputPath)) fs.unlinkSync(frameOutputPath);
          if (fs.existsSync(resultsPath)) fs.unlinkSync(resultsPath);
          res.status(500).json({ error: err.message });
        }
      })
      .on('error', (err) => {
        res.status(500).json({ error: 'Erro ao extrair frame: ' + err.message });
      })
      .run();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = {
  detectLogo
};
