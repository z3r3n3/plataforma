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

## Oficina do Poeta e Painel Poético (projeto Tecendo Palavras)

- `jogos/oficina-do-poeta.html`: lições (verso, rima, ritmo, figuras, formas, poesia e história, reescrita, declamação), editor com Raio-X de rimas e sílabas, revisão com colega e histórico de versões, cartão em PNG, gravação da declamação e link do poema.
- `jogos/painel-poetico.html`: varal on-line, página de cada poema com QR Code e modo exposição.
- O poema vai codificado no próprio link (`painel-poetico.html#p=…`), sem servidor.
- Para o painel da turma: Google Formulário (pergunta “Cole aqui o link do seu poema”) → planilha com a coluna `Aprovado` (escrever `sim`) → Publicar na Web em CSV. Cole o link no botão ⚙️ Professor do painel ou na constante `LINK_PLANILHA`. O link curto do formulário vai em `LINK_FORMULARIO` (nas duas páginas) ou no endereço `oficina-do-poeta.html?form=https://forms.gle/…`.

## Quiz STE ao vivo (`quiz/`)

Versão on-line do Quiz STE do Prof. José Rene: o professor abre `quiz/` e projeta, os estudantes entram em `quiz/jogar.html` com o PIN.

- `rede.js`: conexão com o Firebase Realtime Database (ou modo de teste local com `?teste=1`).
- `config.js`: configuração do app Web do Firebase (não é senha).
- `regras-firebase.json`: regras de segurança, para colar em Realtime Database → Regras.
- CSV aceito: `pergunta;alt1;alt2;alt3;alt4;correta(1-4);tempo(opcional, até 180)`, em UTF-8 ou no formato do Excel.
- Arquivo `.quiz.json`: leva o quiz completo, com imagens (exportado pelo botão ⬇ do painel).
- Os quizzes ficam no IndexedDB do navegador do professor; as imagens são comprimidas (JPEG, até ~140 KB) antes de ir para os celulares.
