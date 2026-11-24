# SAEPVision

## Como rodar
1. Abra o **MySQL Workbench**, abra `banco.sql` e execute tudo (Ctrl+Shift+Enter). Isso cria o banco `saepvision`, as tabelas, os dados do `tb_usuario.csv` e publicações de exemplo.
2. Se o seu MySQL tiver senha no usuário `root`, edite o bloco `DB` no topo do `server.js` (ou defina `DB_PASSWORD`).
3. No terminal, dentro desta pasta:
   ```
   npm install
   npm start
   ```
4. Acesse http://localhost:3000

## Logins de teste (senha 123456)
- Fotógrafos: fotografo1@email.com, fotografo2@gmail.com, fotografo3@gmail.com
- Comuns: usuario1@gmail.com, usuario2@gmail.com, usuario3@gmail.com

## Estrutura
- `banco.sql` – entregável 1 (banco em .SQL)
- `server.js` – API (Express + mysql2)
- `public/` – páginas `index.html` e `publicacoes.html`, CSS, JS, ícones, fotos e fonte Inter
