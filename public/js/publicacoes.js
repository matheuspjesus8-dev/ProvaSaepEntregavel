(async () => {
  const { $, api, esc, icone } = SV;
  const usuario = await SV.iniciar();
  if (!usuario || usuario.tipo !== 'fotografo') { window.location.href = 'index.html'; return; }

  const EXT_OK = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
  const inputArq = $('#imagem'), nomeArq = $('#nomeArquivo'), lista = $('#publicacoes');
  let ultimoJson = '';

  $('#btnArquivo').addEventListener('click', () => inputArq.click());
  inputArq.addEventListener('change', () => {
    nomeArq.textContent = inputArq.files[0] ? inputArq.files[0].name : 'Nenhum arquivo escolhido';
    $('#erroImagem').textContent = '';
  });

  const lerBase64 = (arq) => new Promise((ok, falha) => {
    const r = new FileReader();
    r.onload = () => ok(r.result);
    r.onerror = falha;
    r.readAsDataURL(arq);
  });

  $('#formFoto').addEventListener('submit', async (e) => {
    e.preventDefault();
    const titulo = $('#titulo').value.trim();
    const local = $('#local').value.trim();
    const arq = inputArq.files[0];

    const erros = {
      titulo: titulo ? '' : 'O título da imagem é obrigatório',
      local: local ? '' : 'O local onde a foto foi tirada é obrigatório',
      imagem: '',
    };
    if (!arq) erros.imagem = 'Selecione uma imagem';
    else if (!EXT_OK.includes(arq.name.split('.').pop().toLowerCase()))
      erros.imagem = 'Formato inválido. Use JPG, JPEG, PNG, GIF ou WEBP';

    $('#erroTitulo').textContent = erros.titulo;
    $('#erroLocal').textContent = erros.local;
    $('#erroImagem').textContent = erros.imagem;
    if (erros.titulo || erros.local || erros.imagem) return;

    try {
      await api('/publicacoes', { method: 'POST',
        body: { titulo, local, arquivo_nome: arq.name, arquivo_base64: await lerBase64(arq) } });
      $('#formFoto').reset();
      nomeArq.textContent = 'Nenhum arquivo escolhido';
      carregar();
    } catch (err) {
      const d = (err.dados && err.dados.erros) || {};
      $('#erroTitulo').textContent = d.titulo || '';
      $('#erroLocal').textContent = d.local || '';
      $('#erroImagem').textContent = d.imagem || (d.titulo || d.local ? '' : 'Erro ao cadastrar a publicação');
    }
  });

  function desenhar(itens) {
    lista.innerHTML = itens.length ? itens.map((p) => `
      <article class="card simples" data-id="${p.id}">
        <div class="foto"><img src="${esc(p.url)}" alt="${esc(p.titulo)}"></div>
        <div class="info">
          <span class="titulo">${esc(p.titulo)}</span>
          <button class="lixeira" type="button" aria-label="Excluir publicação">${icone('lixeira')}</button>
        </div>
      </article>`).join('') : '<p class="vazio">Você ainda não possui publicações.</p>';
  }

  async function carregar() {
    try {
      const itens = await api('/minhas-publicacoes');
      const json = JSON.stringify(itens);
      if (json !== ultimoJson) { ultimoJson = json; desenhar(itens); }
    } catch (e) { if (e.status === 401 || e.status === 403) window.location.href = 'index.html'; }
  }

  lista.addEventListener('click', async (e) => {
    const btn = e.target.closest('.lixeira');
    if (!btn) return;
    await api('/publicacoes/' + btn.closest('.card').dataset.id, { method: 'DELETE' });
    carregar();
  });

  await carregar();
  setInterval(carregar, 5000);
})();
