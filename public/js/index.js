(async () => {
  const { $, api, esc, icone } = SV;
  await SV.iniciar();

  const campo = $('#campoBusca'), erro = $('#erroBusca'), galeria = $('#galeria');
  let filtro = '';
  let ultimoJson = '';

  function ajustarPlaceholder() {
    campo.placeholder = SV.logado()
      ? 'Digite o nome do fotógrafo'
      : 'Digite o nome do fotógrafo... ex: @fotografo1';
  }

  function cardHtml(p) {
    return `
      <article class="card" data-id="${p.id}">
        <div class="foto">
          <img src="${esc(p.url)}" alt="${esc(p.titulo)}">
          <div class="tooltip">Foto tirada por: @${esc(p.fotografo)}<br>Local: ${esc(p.local)}</div>
        </div>
        <div class="info">
          <span class="titulo">${esc(p.titulo)}</span>
          <button class="curtida ${p.curtido ? 'ativa' : ''}" type="button" aria-label="Curtir">
            ${icone('coracao')}<span class="qtd">${p.curtidas}</span>
          </button>
        </div>
      </article>`;
  }

  function desenhar(lista) {
    galeria.innerHTML = lista.length
      ? lista.map(cardHtml).join('')
      : '<p class="vazio">Nenhuma fotografia cadastrada.</p>';
  }

  async function carregar(termo = filtro, silencioso = false) {
    try {
      const lista = await api('/publicacoes?fotografo=' + encodeURIComponent(termo));
      filtro = termo;
      erro.textContent = '';
      const json = JSON.stringify(lista);
      if (json !== ultimoJson) { ultimoJson = json; desenhar(lista); }
    } catch (e) {
      if (e.status === 404 && !silencioso) erro.textContent = 'Fotógrafo não encontrado';
      else if (!silencioso) erro.textContent = 'Erro ao carregar as fotografias';
    }
  }

  $('#formBusca').addEventListener('submit', (e) => {
    e.preventDefault();
    if (!SV.logado()) return SV.abrirLogin();
    const termo = campo.value.trim();
    if (termo && !/^@?[\p{L}\p{N}_.-]+$/u.test(termo)) {
      erro.textContent = 'Formato inválido (exemplo: fotografo1)';
      return;
    }
    carregar(termo);
  });
  campo.addEventListener('focus', () => { if (!SV.logado()) { campo.blur(); SV.abrirLogin(); } });
  campo.addEventListener('click', () => { if (!SV.logado()) SV.abrirLogin(); });

  galeria.addEventListener('click', async (e) => {
    const btn = e.target.closest('.curtida');
    if (!btn) return;
    if (!SV.logado()) return SV.abrirLogin();
    const id = btn.closest('.card').dataset.id;
    try {
      const r = await api(`/publicacoes/${id}/curtir`, { method: 'POST' });
      btn.classList.toggle('ativa', r.curtido);
      btn.querySelector('.qtd').textContent = r.curtidas;
      ultimoJson = '';
    } catch (err) { if (err.status === 401) SV.abrirLogin(); }
  });

  document.addEventListener('sv:autenticado', () => { ajustarPlaceholder(); ultimoJson = ''; carregar(); });

  ajustarPlaceholder();
  await carregar('');
  setInterval(() => carregar(filtro, true), 4000);
})();
