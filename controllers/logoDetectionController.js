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

const detectLogo = (req, res) => {
  const startTime = Date.now();

  if (!req.files || !req.files.video || !req.files.logo) {
    return res.status(400).json({
      success: false,
      error: 'Vídeo e imagem da logo são obrigatórios'
    });
  }

  const videoFile = req.files.video[0];
  const logoFile = req.files.logo[0];

  if (!videoFile || !logoFile) {
    return res.status(400).json({
      success: false,
      error: 'Vídeo e imagem da logo são obrigatórios'
    });
  }

  const videoPath = videoFile.path;
  const logoPath = logoFile.path;
  const frameOutputPath = path.join(path.dirname(videoPath), `frame_${Date.now()}.jpg`);
  const resultsPath = path.join(path.dirname(videoPath), `detection_${Date.now()}.json`);

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
              error: 'Script de detecção não encontrado',
              hint: 'Instale Python 3 e OpenCV: pip install opencv-python numpy'
            });
          }

          try {
            const command = `python3 "${pythonScript}" "${frameOutputPath}" "${logoPath}" "${resultsPath}"`;
            console.log(`[Logo Detection] Executando: ${command}`);

            execSync(command, { timeout: 30000, stdio: 'pipe' });

            if (!fs.existsSync(resultsPath)) {
              throw new Error('Arquivo de resultados não gerado');
            }

            const results = JSON.parse(fs.readFileSync(resultsPath, 'utf-8'));
            cleanupFiles(frameOutputPath, resultsPath);

            if (!results.success) {
              return res.json({
                success: false,
                message: results.message || 'Falha na detecção',
                confidence: results.confidence || 0,
                executionTime: getExecutionTime(startTime)
              });
            }

            res.json({
              success: true,
              message: 'Logo detectada com sucesso',
              detection: {
                x: Math.round(results.x),
                y: Math.round(results.y),
                width: Math.round(results.width),
                height: Math.round(results.height),
                confidence: parseFloat(results.confidence.toFixed(4)),
                method: results.method,
                frameResolution: results.frame_resolution
              },
              executionTime: getExecutionTime(startTime)
            });
          } catch (pythonErr) {
            cleanupFiles(frameOutputPath, resultsPath);
            console.error('[Logo Detection] Erro Python:', pythonErr.message);

            return res.status(500).json({
              success: false,
              error: 'Erro na detecção: ' + pythonErr.message,
              hint: 'Verifique se Python 3, OpenCV e NumPy estão instalados',
              executionTime: getExecutionTime(startTime)
            });
          }
        } catch (err) {
          cleanupFiles(frameOutputPath, resultsPath);
          console.error('[Logo Detection] Erro processamento:', err.message);
          res.status(500).json({
            success: false,
            error: 'Erro ao processar detecção: ' + err.message,
            executionTime: getExecutionTime(startTime)
          });
        }
      })
      .on('error', (err) => {
        cleanupFiles(frameOutputPath, resultsPath);
        console.error('[Logo Detection] Erro FFmpeg:', err.message);
        res.status(500).json({
          success: false,
          error: 'Erro ao extrair frame: ' + err.message,
          executionTime: getExecutionTime(startTime)
        });
      })
      .run();
  } catch (err) {
    cleanupFiles(frameOutputPath, resultsPath);
    console.error('[Logo Detection] Erro geral:', err.message);
    res.status(500).json({
      success: false,
      error: err.message,
      executionTime: getExecutionTime(startTime)
    });
  }
};

module.exports = {
  detectLogo
};
