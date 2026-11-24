const SV = (() => {
  const CH_TOKEN = 'sv_token';
  const CH_USUARIO = 'sv_usuario';
  let usuario = null;

  const esc = (t) => String(t).replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const icone = (nome, extra = '') =>
    `<span class="icone ${extra}" style="--src:url('/icones/${nome}.svg')"></span>`;
  const $ = (s, r = document) => r.querySelector(s);

  async function api(caminho, opcoes = {}) {
    const headers = { 'Content-Type': 'application/json', ...(opcoes.headers || {}) };
    const token = localStorage.getItem(CH_TOKEN);
    if (token) headers.Authorization = 'Bearer ' + token;
    const resp = await fetch('/api' + caminho, { ...opcoes, headers,
      body: opcoes.body ? JSON.stringify(opcoes.body) : undefined });
    let dados = null;
    try { dados = await resp.json(); } catch (e) { }
    if (!resp.ok) { const err = new Error((dados && dados.erro) || 'Erro'); err.status = resp.status; err.dados = dados; throw err; }
    return dados;
  }

  const logado = () => !!usuario;
  const getUsuario = () => usuario;

  function montarEstrutura() {
    document.body.insertAdjacentHTML('afterbegin', `
      <header class="cabecalho">
        <div class="secao-usuario">
          <img class="foto-perfil" id="fotoPerfil" alt="Foto de perfil">
          <span class="nome-usuario" id="nomeUsuario"></span>
          <button class="btn" id="btnVerPerfil" type="button">Ver Perfil</button>
        </div>
        <div class="secao-empresa">SAEPVision</div>
        <div class="secao-login" id="slotLogin"></div>
      </header>`);

    document.body.insertAdjacentHTML('beforeend', `
      <footer class="rodape">
        <span class="empresa">SAEPVision</span>
        <div class="redes">
          <a href="#" aria-label="Instagram">${icone('instagram')}</a>
          <a href="#" aria-label="TikTok">${icone('tiktok')}</a>
          <a href="#" aria-label="LinkedIn">${icone('linkedIn')}</a>
          <a href="#" aria-label="YouTube">${icone('youtube')}</a>
        </div>
        <span class="copy">Copyright 2026-2027</span>
      </footer>

      <div class="fundo-menu" id="fundoMenu" hidden></div>
      <aside class="menu-lateral" id="menuLateral">
        <button class="btn-fechar" id="fecharMenu" type="button" aria-label="Fechar">${icone('close')}</button>
        <div class="perfil">
          <img id="menuFoto" alt="Foto do fotógrafo">
          <h3 id="menuNome"></h3>
          <p class="numeros" id="menuLikes"></p>
          <p class="numeros" id="menuPubs"></p>
        </div>
        <a class="btn-publicacoes" href="publicacoes.html" id="btnSuasPublicacoes">Suas publicações</a>
      </aside>

      <div class="sobreposicao" id="modalLogin" hidden>
        <div class="modal" role="dialog" aria-modal="true">
          <button class="btn-fechar" id="fecharLogin" type="button" aria-label="Fechar">${icone('close')}</button>
          <h2>Login</h2>
          <form id="formLogin" novalidate>
            <div class="grupo">
              <label for="loginEmail">E-mail</label>
              <input type="email" id="loginEmail" placeholder="Digite seu e-mail" autocomplete="username">
              <div class="erro" id="erroEmail"></div>
            </div>
            <div class="grupo">
              <label for="loginSenha">Senha</label>
              <input type="password" id="loginSenha" placeholder="Digite sua senha" autocomplete="current-password">
              <div class="erro" id="erroSenha"></div>
            </div>
            <div class="erro erro-geral" id="erroLogin"></div>
            <div class="acoes">
              <button type="button" class="btn btn-contorno" id="btnCancelar">Cancelar</button>
              <button type="submit" class="btn" id="btnEntrar">Login</button>
            </div>
          </form>
        </div>
      </div>`);

    $('#btnVerPerfil').addEventListener('click', verPerfil);
    $('#fecharMenu').addEventListener('click', fecharMenu);
    $('#fundoMenu').addEventListener('click', fecharMenu);
    $('#fecharLogin').addEventListener('click', fecharLogin);
    $('#btnCancelar').addEventListener('click', fecharLogin);
    $('#formLogin').addEventListener('submit', enviarLogin);
    $('#modalLogin').addEventListener('mousedown', (e) => { if (e.target.id === 'modalLogin') fecharLogin(); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') { fecharLogin(); fecharMenu(); } });
  }

  function atualizarCabecalho() {
    const foto = $('#fotoPerfil'), nome = $('#nomeUsuario'), btn = $('#btnVerPerfil'), slot = $('#slotLogin');
    if (usuario) {
      foto.src = usuario.imagem;
      nome.textContent = '@' + usuario.nome;
      btn.disabled = usuario.tipo !== 'fotografo';
      btn.classList.remove('desabilitado');
      slot.innerHTML = '<button class="btn" id="btnLogout" type="button">Logout</button>';
      $('#btnLogout').addEventListener('click', logout);
    } else {
      foto.src = 'imagens_usuarios/saepVision.jpeg';
      nome.textContent = '@SAEPVision';
      btn.disabled = false;
      btn.classList.add('desabilitado');
      slot.innerHTML = '<button class="btn" id="btnAbrirLogin" type="button">Login</button>';
      $('#btnAbrirLogin').addEventListener('click', abrirLogin);
    }
  }

  function abrirLogin() {
    ['erroEmail', 'erroSenha', 'erroLogin'].forEach((i) => ($('#' + i).textContent = ''));
    $('#formLogin').reset();
    $('#modalLogin').hidden = false;
    $('#loginEmail').focus();
  }
  function fecharLogin() { $('#modalLogin').hidden = true; }

  async function enviarLogin(e) {
    e.preventDefault();
    const email = $('#loginEmail').value.trim();
    const senha = $('#loginSenha').value;
    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    $('#erroEmail').textContent = emailOk ? '' : 'E-mail inválido ou vazio';
    $('#erroSenha').textContent = senha ? '' : 'A senha é obrigatória e não pode estar vazia';
    $('#erroLogin').textContent = '';
    if (!emailOk || !senha) return;

    try {
      const r = await api('/login', { method: 'POST', body: { email, senha } });
      localStorage.setItem(CH_TOKEN, r.token);
      usuario = r.usuario;
      localStorage.setItem(CH_USUARIO, JSON.stringify(usuario));
      fecharLogin();
      atualizarCabecalho();
      document.dispatchEvent(new CustomEvent('sv:autenticado'));
    } catch (err) {
      $('#erroLogin').textContent = err.status === 401
        ? 'Usuário não encontrado ou senha incorreta' : 'Erro ao conectar com o servidor';
    }
  }

  async function logout() {
    try { await api('/logout', { method: 'POST' }); } catch (e) { }
    localStorage.removeItem(CH_TOKEN);
    localStorage.removeItem(CH_USUARIO);
    window.location.href = 'index.html';
  }

  async function verPerfil() {
    if (!usuario) return abrirLogin();
    if (usuario.tipo !== 'fotografo') return;
    $('#menuFoto').src = usuario.imagem;
    $('#menuNome').textContent = '@' + usuario.nome;
    try {
      const p = await api('/perfil');
      $('#menuLikes').textContent = `${p.likes} Likes`;
      $('#menuPubs').textContent = `${p.publicacoes} Publicações`;
    } catch (e) { }
    $('#fundoMenu').hidden = false;
    $('#menuLateral').classList.add('aberto');
  }
  function fecharMenu() {
    $('#menuLateral').classList.remove('aberto');
    $('#fundoMenu').hidden = true;
  }

  async function iniciar() {
    montarEstrutura();
    if (localStorage.getItem(CH_TOKEN)) {
      try { usuario = await api('/me'); localStorage.setItem(CH_USUARIO, JSON.stringify(usuario)); }
      catch (e) { localStorage.removeItem(CH_TOKEN); localStorage.removeItem(CH_USUARIO); usuario = null; }
    }
    atualizarCabecalho();
    return usuario;
  }

  return { iniciar, api, esc, icone, $, logado, getUsuario, abrirLogin };
})();
