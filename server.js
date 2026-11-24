const express = require('express');
const mysql = require('mysql2/promise');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const DB = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '1234',
  database: process.env.DB_NAME || 'saepvision',
};
const PORT = process.env.PORT || 3000;

const pool = mysql.createPool({ ...DB, waitForConnections: true, connectionLimit: 10 });
const app = express();

['get', 'post', 'delete'].forEach((m) => {
  const orig = app[m].bind(app);
  app[m] = (p, ...hs) => orig(p, ...hs.map((h) =>
    h.constructor.name === 'AsyncFunction' ? (q, s, n) => h(q, s, n).catch(n) : h));
});
app.use(express.json({ limit: '15mb' }));
app.use(express.static(path.join(__dirname, 'public')));

const sessoes = new Map();

function tokenDe(req) {
  const h = req.headers.authorization || '';
  return h.startsWith('Bearer ') ? h.slice(7) : null;
}

async function carregarUsuario(req) {
  const id = sessoes.get(tokenDe(req));
  if (!id) return null;
  const [rows] = await pool.query(
    'SELECT id_usuario, nome, nome_usuario, email, imagem_usuario, tipo FROM tb_usuario WHERE id_usuario = ?', [id]);
  return rows[0] || null;
}

app.use('/api', async (req, res, next) => {
  try { req.usuario = await carregarUsuario(req); next(); } catch (e) { next(e); }
});

function exigeLogin(req, res, next) {
  if (!req.usuario) return res.status(401).json({ erro: 'Não autenticado' });
  next();
}
function exigeFotografo(req, res, next) {
  if (!req.usuario) return res.status(401).json({ erro: 'Não autenticado' });
  if (req.usuario.tipo !== 'fotografo') return res.status(403).json({ erro: 'Apenas fotógrafos' });
  next();
}

const formatarUsuario = (u) => ({
  id: u.id_usuario, nome: u.nome, nome_usuario: u.nome_usuario,
  imagem: 'imagens_usuarios/' + u.imagem_usuario, tipo: u.tipo,
});

app.post('/api/login', async (req, res) => {
  const { email, senha } = req.body || {};
  const [rows] = await pool.query(
    'SELECT * FROM tb_usuario WHERE email = ? AND senha = ?', [String(email || ''), String(senha || '')]);
  if (!rows.length) return res.status(401).json({ erro: 'Usuário não encontrado ou senha incorreta' });
  const token = crypto.randomBytes(24).toString('hex');
  sessoes.set(token, rows[0].id_usuario);
  res.json({ token, usuario: formatarUsuario(rows[0]) });
});

app.post('/api/logout', (req, res) => { sessoes.delete(tokenDe(req)); res.json({ ok: true }); });

app.get('/api/me', exigeLogin, (req, res) => res.json(formatarUsuario(req.usuario)));

const SQL_PUBLICACOES = `
  SELECT p.id_publicacao AS id, p.titulo_imagem AS titulo, p.local_foto AS local,
         p.url_fotografia AS url, u.nome AS fotografo,
         (SELECT COUNT(*) FROM tb_curtida c WHERE c.id_publicacao = p.id_publicacao) AS curtidas,
         EXISTS(SELECT 1 FROM tb_curtida c WHERE c.id_publicacao = p.id_publicacao AND c.id_usuario = ?) AS curtido
  FROM tb_publicacao p
  JOIN tb_usuario u ON u.id_usuario = p.id_usuario`;

const mapPub = (r) => ({ ...r, curtidas: Number(r.curtidas), curtido: !!r.curtido });

app.get('/api/publicacoes', async (req, res) => {
  const idLogado = req.usuario ? req.usuario.id_usuario : 0;
  let busca = String(req.query.fotografo || '').trim().replace(/^@/, '').toLowerCase();

  if (busca) {
    const like = '%' + busca.replace(/[%_\\]/g, '\\$&') + '%';
    const [fots] = await pool.query(
      `SELECT id_usuario FROM tb_usuario
       WHERE tipo = 'fotografo' AND (LOWER(nome) LIKE ? OR LOWER(nome_usuario) LIKE ?)`, [like, like]);
    if (!fots.length) return res.status(404).json({ erro: 'Fotógrafo não encontrado' });
    const ids = fots.map((f) => f.id_usuario);
    const [rows] = await pool.query(
      SQL_PUBLICACOES + ' WHERE p.id_usuario IN (?) ORDER BY p.id_publicacao', [idLogado, ids]);
    return res.json(rows.map(mapPub));
  }
  const [rows] = await pool.query(SQL_PUBLICACOES + ' ORDER BY p.id_publicacao', [idLogado]);
  res.json(rows.map(mapPub));
});

app.post('/api/publicacoes/:id/curtir', exigeLogin, async (req, res) => {
  const idPub = Number(req.params.id);
  const idUser = req.usuario.id_usuario;
  const [pub] = await pool.query('SELECT 1 FROM tb_publicacao WHERE id_publicacao = ?', [idPub]);
  if (!pub.length) return res.status(404).json({ erro: 'Publicação não encontrada' });

  const [ja] = await pool.query(
    'SELECT id_curtida FROM tb_curtida WHERE id_usuario = ? AND id_publicacao = ?', [idUser, idPub]);
  let curtido;
  if (ja.length) {
    await pool.query('DELETE FROM tb_curtida WHERE id_curtida = ?', [ja[0].id_curtida]);
    curtido = false;
  } else {
    await pool.query('INSERT INTO tb_curtida (id_usuario, id_publicacao) VALUES (?, ?)', [idUser, idPub]);
    curtido = true;
  }
  const [[{ total }]] = await pool.query(
    'SELECT COUNT(*) AS total FROM tb_curtida WHERE id_publicacao = ?', [idPub]);
  res.json({ curtido, curtidas: Number(total) });
});

app.get('/api/perfil', exigeFotografo, async (req, res) => {
  const id = req.usuario.id_usuario;
  const [[{ likes }]] = await pool.query(
    `SELECT COUNT(*) AS likes FROM tb_curtida c
     JOIN tb_publicacao p ON p.id_publicacao = c.id_publicacao WHERE p.id_usuario = ?`, [id]);
  const [[{ publicacoes }]] = await pool.query(
    'SELECT COUNT(*) AS publicacoes FROM tb_publicacao WHERE id_usuario = ?', [id]);
  res.json({ likes: Number(likes), publicacoes: Number(publicacoes) });
});

app.get('/api/minhas-publicacoes', exigeFotografo, async (req, res) => {
  const id = req.usuario.id_usuario;
  const [rows] = await pool.query(SQL_PUBLICACOES + ' WHERE p.id_usuario = ? ORDER BY p.id_publicacao DESC', [id, id]);
  res.json(rows.map(mapPub));
});

const EXTENSOES = { jpg: 'jpg', jpeg: 'jpg', png: 'png', gif: 'gif', webp: 'webp' };

app.post('/api/publicacoes', exigeFotografo, async (req, res) => {
  const { titulo, local, arquivo_nome, arquivo_base64 } = req.body || {};
  const erros = {};
  if (!String(titulo || '').trim()) erros.titulo = 'O título da imagem é obrigatório';
  if (!String(local || '').trim()) erros.local = 'O local onde a foto foi tirada é obrigatório';

  let ext = null;
  if (!arquivo_nome || !arquivo_base64) {
    erros.imagem = 'Selecione uma imagem';
  } else {
    ext = EXTENSOES[path.extname(String(arquivo_nome)).slice(1).toLowerCase()];
    if (!ext) erros.imagem = 'Formato inválido. Use JPG, JPEG, PNG, GIF ou WEBP';
  }
  if (Object.keys(erros).length) return res.status(400).json({ erros });

  const dados = String(arquivo_base64).replace(/^data:[^;]+;base64,/, '');
  const nomeArquivo = `upload_${Date.now()}_${crypto.randomBytes(3).toString('hex')}.${ext}`;
  fs.writeFileSync(path.join(__dirname, 'public', 'fotografias', nomeArquivo), Buffer.from(dados, 'base64'));

  const [r] = await pool.query(
    'INSERT INTO tb_publicacao (titulo_imagem, local_foto, id_usuario, url_fotografia) VALUES (?,?,?,?)',
    [String(titulo).trim(), String(local).trim(), req.usuario.id_usuario, 'fotografias/' + nomeArquivo]);
  res.status(201).json({ id: r.insertId });
});

app.delete('/api/publicacoes/:id', exigeFotografo, async (req, res) => {
  const [rows] = await pool.query(
    'SELECT url_fotografia FROM tb_publicacao WHERE id_publicacao = ? AND id_usuario = ?',
    [Number(req.params.id), req.usuario.id_usuario]);
  if (!rows.length) return res.status(404).json({ erro: 'Publicação não encontrada' });
  await pool.query('DELETE FROM tb_publicacao WHERE id_publicacao = ?', [Number(req.params.id)]);
  const arq = path.basename(rows[0].url_fotografia);
  if (arq.startsWith('upload_')) fs.unlink(path.join(__dirname, 'public', 'fotografias', arq), () => {});
  res.json({ ok: true });
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ erro: 'Erro interno do servidor' });
});

app.listen(PORT, () => console.log(`SAEPVision rodando em http://localhost:${PORT}`));
