# JRM Aventuras Educativas

Plataforma de jogos educativos gratuitos, alinhados ao Currículo de Referência de Mato Grosso do Sul, do 1º ao 9º ano. Sem anúncios, sem cadastro e sem coleta de dados.

## Estrutura

| Arquivo | O que é |
|---|---|
| `index.html` | Página inicial com o catálogo e os filtros por componente e ano |
| `catalogo.js` | Lista de jogos (título, componente, anos, habilidades) |
| `jogos/` | Um arquivo HTML por jogo |
| `professor.html` | Área do Professor |
| `apoie.html` | Página de apoio por PIX (preencha `PIX.chave` no código) |
| `privacidade.html` | Política de privacidade |
| `estilo.css` | Estilo comum das páginas |

## Como adicionar um jogo

1. Coloque o arquivo em `jogos/`, com nome sem espaços nem acentos (ex.: `jogos/ciclo-da-agua.html`).
2. Em `catalogo.js`, acrescente um bloco na lista `JOGOS` com `arquivo`, `titulo`, `componente`, `anos`, `tipo`, `icone`, `descricao` e `habilidades`.

## Publicação

O site é publicado pelo GitHub Pages: **Settings → Pages → Branch `main` / pasta `/ (root)`**.
