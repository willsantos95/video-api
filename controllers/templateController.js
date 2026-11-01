// Molduras das páginas aplicadas a um vídeo (Reels 1080x1920).
//
// Temas: recorte (Recorte de Cinema), animacao (Momento da Animação), comedia (Comédia Controversa).
//
// Composição:
//   - vídeo deitado/quadrado: fundo com o próprio vídeo desfocado + vídeo inteiro no centro
//   - vídeo em pé com a cena deitada no meio: recorta a cena e segue como deitado
//   - vídeo em pé de verdade: preenche a tela (corta as sobras)
//   - por cima: assets/<tema>/moldura.png (degradês, selo, enfeites e rodapé)
//   - título e subtítulo escritos com drawtext, com quebra de linha e tamanho automáticos

const ffmpeg = require('fluent-ffmpeg');
const path = require('path');
const fs = require('fs');
const axios = require('axios');
const opentype = require('opentype.js');
const { spawn } = require('child_process');

const ASSETS = path.join(__dirname, '..', 'assets');
const fonteArq = (nome) => path.join(ASSETS, 'fonts', nome);

// Cada tema: arquivo da moldura, posição do título e estilo do título/subtítulo.
// Cores no formato do ffmpeg (0xRRGGBB). borda/sombra opcionais.
const TEMAS = {
  recorte: {
    moldura: path.join(ASSETS, 'recorte', 'moldura.png'),
    topo: 250,
    titulo: { fonte: fonteArq('BebasNeue-Regular.ttf'), cor: '0xF5EFE6', max: 120, min: 72, caixaAlta: true, alturaLinha: 0.95 },
    subtitulo: { fonte: fonteArq('PlayfairDisplay-BoldItalic.ttf'), cor: '0xF4B942', tamanho: 50, espaco: 12 },
  },
  animacao: {
    moldura: path.join(ASSETS, 'animacao', 'moldura.png'),
    topo: 225,
    titulo: { fonte: fonteArq('Fredoka-Bold.ttf'), cor: '0xFFF4E0', max: 104, min: 64, caixaAlta: false, alturaLinha: 1.08,
      borda: { largura: 7, cor: '0x1E2A5A' }, sombra: { cor: '0xFF7A3D', x: 0, y: 7 } },
    subtitulo: { fonte: fonteArq('Nunito-Black.ttf'), cor: '0xFFC93C', tamanho: 46, espaco: 18, borda: { largura: 5, cor: '0x1E2A5A' } },
  },
  comedia: {
    moldura: path.join(ASSETS, 'comedia', 'moldura.png'),
    topo: 225,
    titulo: { fonte: fonteArq('Bangers-Regular.ttf'), cor: '0xFFD400', max: 124, min: 76, caixaAlta: true, alturaLinha: 1.2,
      borda: { largura: 7, cor: '0x111111' }, sombra: { cor: '0xFF2E2E', x: 7, y: 7 } },
    subtitulo: { fonte: fonteArq('Inter-ExtraBold.ttf'), cor: '0xFFFFFF', tamanho: 44, espaco: 30, borda: { largura: 4, cor: '0x111111' } },
  },
};
const ALIAS_TEMA = { 'recorte-de-cinema': 'recorte', cinema: 'recorte', 'momento-da-animacao': 'animacao', anima: 'animacao', 'comedia-controversa': 'comedia' };
function pegarTema(nome) {
  const n = String(nome || 'recorte').toLowerCase().trim();
  return TEMAS[ALIAS_TEMA[n] || n] ? { nome: ALIAS_TEMA[n] || n, ...TEMAS[ALIAS_TEMA[n] || n] } : null;
}

const W = 1080;
const H = 1920;
const MARGEM_X = 60;
const LARGURA_TEXTO = W - MARGEM_X * 2;
const AREA_VIDEO_ALTURA = 1100; // caixa central para vídeo deitado

// "nome" aqui é o caminho do arquivo da fonte
const fonteCache = {};
function fonte(arquivo) {
  if (!fonteCache[arquivo]) fonteCache[arquivo] = opentype.loadSync(arquivo);
  return fonteCache[arquivo];
}

function larguraTexto(arquivo, texto, tamanho) {
  return fonte(arquivo).getAdvanceWidth(texto, tamanho);
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

/** Escolhe o maior tamanho (max → min) em que o título cabe em até 2 linhas. */
function montarTitulo(texto, estilo = TEMAS.recorte.titulo) {
  let t = String(texto || '').replace(/\s+/g, ' ').trim();
  if (estilo.caixaAlta) t = t.toUpperCase();
  const largura = LARGURA_TEXTO - (estilo.borda ? estilo.borda.largura * 2 : 0) - (estilo.sombra ? Math.abs(estilo.sombra.x) : 0);
  for (let tam = estilo.max; tam >= estilo.min; tam -= 4) {
    const linhas = quebrar(estilo.fonte, t, tam, largura);
    if (linhas.length <= 2) return { tamanho: tam, linhas };
  }
  const linhas = quebrar(estilo.fonte, t, estilo.min, largura);
  const segunda = encurtar(estilo.fonte, linhas.slice(1).join(' '), estilo.min, largura);
  return { tamanho: estilo.min, linhas: [linhas[0], segunda] };
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

function drawtext(estilo, textfile, tamanho, y) {
  const borda = estilo.borda ? `:borderw=${estilo.borda.largura}:bordercolor=${estilo.borda.cor}` : '';
  const sombra = estilo.sombra
    ? `:shadowcolor=${estilo.sombra.cor}:shadowx=${estilo.sombra.x}:shadowy=${estilo.sombra.y}`
    : ':shadowcolor=black@0.55:shadowx=0:shadowy=4';
  const x = MARGEM_X + (estilo.borda ? estilo.borda.largura : 0);
  return `drawtext=fontfile='${estilo.fonte}':textfile='${textfile}':expansion=none:fontsize=${tamanho}:fontcolor=${estilo.cor}` +
    `:x=${x}:y=${y}${borda}${sombra}`;
}

/**
 * Monta o filtro do ffmpeg. Exportado para teste.
 * @returns {{ filtro: string, arquivosTexto: {caminho:string, texto:string}[], titulo: object }}
 */
function montarFiltro({ largura, altura, titulo, subtitulo, prefixoTmp, fundo = 'blur', cena = null, tema = pegarTema('recorte') }) {
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

  const t = montarTitulo(titulo, tema.titulo);
  const arquivosTexto = [];
  const textos = [];
  const altLinha = Math.round(t.tamanho * tema.titulo.alturaLinha);
  t.linhas.forEach((linha, i) => {
    const caminho = `${prefixoTmp}_t${i}.txt`;
    arquivosTexto.push({ caminho, texto: linha });
    textos.push(drawtext(tema.titulo, caminho, t.tamanho, tema.topo + i * altLinha));
  });
  const sub = String(subtitulo || '').replace(/\s+/g, ' ').trim();
  if (sub) {
    const st = tema.subtitulo;
    const caminho = `${prefixoTmp}_s.txt`;
    const larguraSub = LARGURA_TEXTO - (st.borda ? st.borda.largura * 2 : 0);
    arquivosTexto.push({ caminho, texto: encurtar(st.fonte, sub, st.tamanho, larguraSub) });
    textos.push(drawtext(st, caminho, st.tamanho, tema.topo + t.linhas.length * altLinha + st.espaco));
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
    const tema = pegarTema(req.body?.tema || req.params?.tema);
    if (!tema) return res.status(400).json({ error: `Tema inválido. Use: ${Object.keys(TEMAS).join(', ')}` });

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
      largura: info.largura, altura: info.altura, titulo, subtitulo, prefixoTmp, fundo, cena, tema,
    });
    for (const a of arquivosTexto) { fs.writeFileSync(a.caminho, a.texto, 'utf8'); temporarios.push(a.caminho); }

    const crf = Math.min(35, Math.max(16, parseInt(quality, 10) || 23));
    const opcoes = ['-map', '[out]', '-c:v', 'libx264', '-preset', 'veryfast', '-crf', String(crf),
      '-pix_fmt', 'yuv420p', '-movflags', '+faststart'];
    if (info.temAudio) opcoes.push('-map', '0:a:0', '-c:a', 'aac', '-b:a', '128k');

    await new Promise((ok, falha) => {
      ffmpeg(entrada)
        .input(tema.moldura).inputOptions(['-loop', '1'])
        .complexFilter(filtro)
        .outputOptions([...opcoes, '-shortest'])
        .output(saida)
        .on('end', ok)
        .on('error', (err, _out, stderr) => falha(new Error(`${err.message}\n${String(stderr || '').slice(-800)}`)))
        .run();
    });

    res.json({
      success: true,
      message: `Moldura aplicada (tema ${tema.nome})`,
      tema: tema.nome,
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

module.exports = { recorteTemplate, montarFiltro, montarTitulo, analisarMovimento, detectarCena, TEMAS, pegarTema };
