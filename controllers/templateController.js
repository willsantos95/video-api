// Moldura da identidade "Recorte de Cinema" aplicada a um vídeo (Reels 1080x1920).
//
// Composição:
//   - vídeo deitado/quadrado: fundo com o próprio vídeo desfocado + vídeo inteiro no centro
//   - vídeo em pé: preenche a tela (corta as sobras)
//   - por cima: assets/recorte/moldura.png (degradês, selo, cantos e rodapé)
//   - título (Bebas Neue) e subtítulo (Playfair Italic) escritos com drawtext,
//     com quebra de linha e tamanho automáticos

const ffmpeg = require('fluent-ffmpeg');
const path = require('path');
const fs = require('fs');
const axios = require('axios');
const opentype = require('opentype.js');
const { spawn } = require('child_process');

const ASSETS = path.join(__dirname, '..', 'assets');
const FONTES = {
  titulo: path.join(ASSETS, 'fonts', 'BebasNeue-Regular.ttf'),
  subtitulo: path.join(ASSETS, 'fonts', 'PlayfairDisplay-BoldItalic.ttf'),
};
const MOLDURA = path.join(ASSETS, 'recorte', 'moldura.png');

const W = 1080;
const H = 1920;
const MARGEM_X = 60;
const LARGURA_TEXTO = W - MARGEM_X * 2;
const TOPO_TITULO = 250;
const AREA_VIDEO_ALTURA = 1100; // caixa central para vídeo deitado

const fonteCache = {};
function fonte(nome) {
  if (!fonteCache[nome]) fonteCache[nome] = opentype.loadSync(FONTES[nome]);
  return fonteCache[nome];
}

function larguraTexto(nome, texto, tamanho) {
  return fonte(nome).getAdvanceWidth(texto, tamanho);
}

/** Quebra o texto em linhas que caibam na largura. */
function quebrar(nome, texto, tamanho, largura) {
  const palavras = texto.split(/\s+/).filter(Boolean);
  const linhas = [];
  let atual = '';
  for (const p of palavras) {
    const teste = atual ? `${atual} ${p}` : p;
    if (larguraTexto(nome, teste, tamanho) <= largura || !atual) atual = teste;
    else { linhas.push(atual); atual = p; }
  }
  if (atual) linhas.push(atual);
  return linhas;
}

/** Corta com reticências até caber. */
function encurtar(nome, texto, tamanho, largura) {
  if (larguraTexto(nome, texto, tamanho) <= largura) return texto;
  let t = texto;
  while (t.length > 1 && larguraTexto(nome, `${t}…`, tamanho) > largura) t = t.slice(0, -1);
  return `${t.trim()}…`;
}

/** Escolhe o maior tamanho (120 → 72) em que o título cabe em até 2 linhas. */
function montarTitulo(texto) {
  const t = String(texto || '').replace(/\s+/g, ' ').trim().toUpperCase();
  for (let tam = 120; tam >= 72; tam -= 4) {
    const linhas = quebrar('titulo', t, tam, LARGURA_TEXTO);
    if (linhas.length <= 2) return { tamanho: tam, linhas };
  }
  const linhas = quebrar('titulo', t, 72, LARGURA_TEXTO);
  const segunda = encurtar('titulo', linhas.slice(1).join(' '), 72, LARGURA_TEXTO);
  return { tamanho: 72, linhas: [linhas[0], segunda] };
}

function sondar(arquivo) {
  return new Promise((ok, falha) => {
    ffmpeg.ffprobe(arquivo, (err, dados) => {
      if (err) return falha(err);
      const v = (dados.streams || []).find((s) => s.codec_type === 'video');
      if (!v) return falha(new Error('O arquivo não tem faixa de vídeo'));
      let largura = v.width, altura = v.height;
      const rot = Math.abs(Number(v.tags?.rotate || v.side_data_list?.find((s) => s.rotation !== undefined)?.rotation || 0));
      if (rot === 90 || rot === 270) [largura, altura] = [altura, largura];
      ok({
        largura, altura,
        temAudio: (dados.streams || []).some((s) => s.codec_type === 'audio'),
        duracao: Number(dados.format?.duration || 0),
      });
    });
  });
}

async function baixar(url, destino) {
  const resp = await axios.get(url, { responseType: 'stream', timeout: 120000, maxContentLength: 2e9 });
  await new Promise((ok, falha) => {
    const f = fs.createWriteStream(destino);
    resp.data.pipe(f);
    f.on('finish', ok);
    f.on('error', falha);
  });
  return destino;
}


// ── Cena embutida ─────────────────────────────────────────────────────────
// Muitos vídeos de origem já vêm "em pé", com a cena deitada no meio e faixas
// paradas em cima/embaixo (às vezes com legenda gravada). Para achar a cena,
// comparamos alguns quadros espalhados pelo vídeo: as linhas/colunas que mudam
// são a cena; o que fica parado (faixas, legenda, marca d'água) fica de fora.

const AMOSTRA_LARGURA = 96;
const AMOSTRA_QUADROS = 16;

function lerQuadrosCinza(arquivo, duracao, larg, alt) {
  return new Promise((ok, falha) => {
    const fps = Math.max(0.05, AMOSTRA_QUADROS / Math.max(1, duracao));
    const args = ['-v', 'error', '-i', arquivo, '-an',
      '-vf', `fps=${fps.toFixed(4)},scale=${larg}:${alt}:flags=area,format=gray`,
      '-frames:v', String(AMOSTRA_QUADROS + 1), '-f', 'rawvideo', 'pipe:1'];
    const p = spawn('ffmpeg', args);
    const partes = [];
    let erro = '';
    p.stdout.on('data', (d) => partes.push(d));
    p.stderr.on('data', (d) => { erro += d; });
    p.on('error', falha);
    p.on('close', (code) => {
      if (code !== 0) return falha(new Error(`ffmpeg (amostra) saiu com ${code}: ${erro.slice(-300)}`));
      const buf = Buffer.concat(partes);
      const tam = larg * alt;
      const quadros = [];
      for (let i = 0; i + tam <= buf.length; i += tam) quadros.push(buf.subarray(i, i + tam));
      ok(quadros);
    });
  });
}

/** Maior faixa contínua acima do limite (tolera buracos de até `folga` posições). */
function maiorFaixa(valores, limite, folga = 2) {
  let melhor = null, ini = -1, ultimo = -1;
  const fechar = () => {
    if (ini >= 0 && (!melhor || ultimo - ini > melhor.fim - melhor.ini)) melhor = { ini, fim: ultimo };
  };
  valores.forEach((v, i) => {
    if (v >= limite) {
      if (ini < 0 || i - ultimo > folga + 1) { fechar(); ini = i; }
      ultimo = i;
    }
  });
  fechar();
  return melhor;
}

/** Puro (sem ffmpeg) — exportado para teste. Devolve o recorte da cena em fração (0–1) ou null. */
function analisarMovimento(quadros, larg, alt) {
  if (quadros.length < 3) return null;
  const linhas = new Float64Array(alt), colunas = new Float64Array(larg);
  for (let q = 1; q < quadros.length; q++) {
    const a = quadros[q - 1], b = quadros[q];
    for (let y = 0; y < alt; y++) {
      for (let x = 0; x < larg; x++) {
        const d = Math.abs(a[y * larg + x] - b[y * larg + x]);
        linhas[y] += d; colunas[x] += d;
      }
    }
  }
  const n = quadros.length - 1;
  for (let y = 0; y < alt; y++) linhas[y] /= n * larg;
  for (let x = 0; x < larg; x++) colunas[x] /= n * alt;

  const corte = (vals) => {
    const ord = Array.from(vals).sort((p, q) => p - q);
    const p90 = ord[Math.floor(ord.length * 0.9)];
    if (p90 < 3) return null; // quase nada se mexe: não dá para afirmar nada
    return maiorFaixa(vals, Math.max(2, p90 * 0.25));
  };
  const fy = corte(linhas), fx = corte(colunas);
  if (!fy) return null;
  const y0 = fy.ini / alt, y1 = (fy.fim + 1) / alt;
  const x0 = fx ? fx.ini / larg : 0, x1 = fx ? (fx.fim + 1) / larg : 1;
  // só recorta se sobrar uma faixa parada de verdade (≥ 12% da altura) e a cena for razoável
  if (y1 - y0 > 0.88 || y1 - y0 < 0.2) return null;
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
}

async function detectarCena(arquivo, info) {
  if (info.largura / info.altura > 0.75) return null; // já é deitado
  const larg = AMOSTRA_LARGURA;
  const alt = Math.max(2, Math.round((larg * info.altura) / info.largura / 2) * 2);
  try {
    const quadros = await lerQuadrosCinza(arquivo, info.duracao, larg, alt);
    const r = analisarMovimento(quadros, larg, alt);
    if (!r) return null;
    // um respiro de 1 linha da amostra para dentro, para não pegar borda da faixa
    const margemY = 1 / alt, margemX = r.w < 0.98 ? 1 / larg : 0;
    const x = Math.round((r.x + margemX) * info.largura / 2) * 2;
    const y = Math.round((r.y + margemY) * info.altura / 2) * 2;
    const w = Math.round((r.w - 2 * margemX) * info.largura / 2) * 2;
    const h = Math.round((r.h - 2 * margemY) * info.altura / 2) * 2;
    if (w < 64 || h < 64 || w / h <= 0.75) return null; // cena recortada ainda em pé: usa tela cheia
    return { x, y, w, h };
  } catch (e) {
    console.warn('[recorte-template] não consegui analisar a cena:', e.message);
    return null;
  }
}

const drawtext = (fonteArquivo, textfile, tamanho, cor, y) =>
  `drawtext=fontfile='${fonteArquivo}':textfile='${textfile}':expansion=none:fontsize=${tamanho}:fontcolor=${cor}` +
  `:x=${MARGEM_X}:y=${y}:shadowcolor=black@0.55:shadowx=0:shadowy=4`;

/**
 * Monta o filtro do ffmpeg. Exportado para teste.
 * @returns {{ filtro: string, arquivosTexto: {caminho:string, texto:string}[], titulo: object }}
 */
function montarFiltro({ largura, altura, titulo, subtitulo, prefixoTmp, fundo = 'blur', cena = null }) {
  const deitado = !!cena || largura / altura > 0.75; // tudo que não é praticamente vertical
  const partes = [];
  // cena embutida num vídeo em pé: recorta só ela e segue como vídeo deitado
  const origem = cena ? '[src]' : '[0:v]';
  if (cena) partes.push(`[0:v]crop=${cena.w}:${cena.h}:${cena.x}:${cena.y},setsar=1[src]`);
  if (deitado) {
    const fundoFiltro = fundo === 'preto'
      ? `color=c=0x0E0D12:s=${W}x${H}[bg];${origem}null[b]`
      : `${origem}split=2[a][b];[a]scale=${W}:${H}:force_original_aspect_ratio=increase,crop=${W}:${H},gblur=sigma=28,eq=brightness=-0.2:saturation=0.75[bg]`;
    partes.push(fundoFiltro);
    partes.push(`[b]scale=w=${W}:h=${AREA_VIDEO_ALTURA}:force_original_aspect_ratio=decrease:force_divisible_by=2,setsar=1[fg]`);
    partes.push(`[bg][fg]overlay=x=(W-w)/2:y=(H-h)/2:shortest=1[v1]`);
  } else {
    partes.push(`[0:v]scale=${W}:${H}:force_original_aspect_ratio=increase,crop=${W}:${H},setsar=1[v1]`);
  }
  partes.push(`[v1][1:v]overlay=0:0:shortest=1[v2]`);

  const t = montarTitulo(titulo);
  const arquivosTexto = [];
  const textos = [];
  const altLinha = Math.round(t.tamanho * 0.95);
  t.linhas.forEach((linha, i) => {
    const caminho = `${prefixoTmp}_t${i}.txt`;
    arquivosTexto.push({ caminho, texto: linha });
    textos.push(drawtext(FONTES.titulo, caminho, t.tamanho, '0xF5EFE6', TOPO_TITULO + i * altLinha));
  });
  const sub = String(subtitulo || '').replace(/\s+/g, ' ').trim();
  if (sub) {
    const caminho = `${prefixoTmp}_s.txt`;
    arquivosTexto.push({ caminho, texto: encurtar('subtitulo', sub, 50, LARGURA_TEXTO) });
    textos.push(drawtext(FONTES.subtitulo, caminho, 50, '0xF4B942', TOPO_TITULO + t.linhas.length * altLinha + 12));
  }
  partes.push(`[v2]${textos.join(',')},fps=30,format=yuv420p[out]`);
  return { filtro: partes.join(';'), arquivosTexto, titulo: t, deitado };
}

const recorteTemplate = async (req, res) => {
  const inicio = Date.now();
  const temporarios = [];
  try {
    const { titulo, subtitulo = '', videoUrl, quality = '23', fundo = 'blur' } = req.body || {};
    if (!titulo || !String(titulo).trim()) return res.status(400).json({ error: 'Informe o titulo' });

    let entrada = req.file?.path;
    if (!entrada) {
      if (!videoUrl) return res.status(400).json({ error: 'Envie o vídeo (campo video) ou videoUrl' });
      entrada = path.join(__dirname, '..', 'uploads', `video-${Date.now()}-${Math.round(Math.random() * 1e9)}.mp4`);
      await baixar(videoUrl, entrada);
    }
    temporarios.push(entrada);

    const info = await sondar(entrada);
    const saida = path.join(path.dirname(entrada), `${path.basename(entrada, path.extname(entrada))}_recorte.mp4`);
    const prefixoTmp = path.join(path.dirname(entrada), `${path.basename(entrada, path.extname(entrada))}_txt`);
    const cena = String(req.body?.detectarCena ?? 'true') === 'false' ? null : await detectarCena(entrada, info);
    const { filtro, arquivosTexto, titulo: t, deitado } = montarFiltro({
      largura: info.largura, altura: info.altura, titulo, subtitulo, prefixoTmp, fundo, cena,
    });
    for (const a of arquivosTexto) { fs.writeFileSync(a.caminho, a.texto, 'utf8'); temporarios.push(a.caminho); }

    const crf = Math.min(35, Math.max(16, parseInt(quality, 10) || 23));
    const opcoes = ['-map', '[out]', '-c:v', 'libx264', '-preset', 'veryfast', '-crf', String(crf),
      '-pix_fmt', 'yuv420p', '-movflags', '+faststart'];
    if (info.temAudio) opcoes.push('-map', '0:a:0', '-c:a', 'aac', '-b:a', '128k');

    await new Promise((ok, falha) => {
      ffmpeg(entrada)
        .input(MOLDURA).inputOptions(['-loop', '1'])
        .complexFilter(filtro)
        .outputOptions([...opcoes, '-shortest'])
        .output(saida)
        .on('end', ok)
        .on('error', (err, _out, stderr) => falha(new Error(`${err.message}\n${String(stderr || '').slice(-800)}`)))
        .run();
    });

    res.json({
      success: true,
      message: 'Moldura Recorte de Cinema aplicada',
      file: path.basename(saida),
      url: `${(process.env.API_URL || 'http://localhost:3000').replace(/\/+$/, '')}/download/${path.basename(saida)}`,
      layout: cena ? 'cena-recortada-com-fundo' : deitado ? 'video-centralizado-com-fundo' : 'tela-cheia',
      cena,
      titulo: { linhas: t.linhas, tamanho: t.tamanho },
      duracao: info.duracao,
      executionTime: parseFloat(((Date.now() - inicio) / 1000).toFixed(2)),
    });
  } catch (err) {
    console.error('[recorte-template]', err);
    res.status(500).json({ error: err.message });
  } finally {
    for (const f of temporarios) fs.promises.unlink(f).catch(() => undefined);
  }
};

module.exports = { recorteTemplate, montarFiltro, montarTitulo, analisarMovimento, detectarCena };
