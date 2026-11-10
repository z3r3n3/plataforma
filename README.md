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
- CSV aceito: `pergunta;alt1;alt2;alt3;alt4;correta(1-4);tempo(opcional, até 180);habilidade(opcional, ex.: EF06MA04);indicador(opcional)`, em UTF-8 ou no formato do Excel.
- Cada partida é registrada automaticamente (pergunta a pergunta) no Painel de Avaliação, com a turma informada ao abrir a sala.
- Arquivo `.quiz.json`: leva o quiz completo, com imagens (exportado pelo botão ⬇ do painel).
- Os quizzes ficam no IndexedDB do navegador do professor; as imagens são comprimidas (JPEG, até ~140 KB) antes de ir para os celulares.

## Painel de Avaliação (`avaliacao.html`)

Registros e indicadores de aprendizagem baseados no Currículo de Referência de MS, para qualquer componente.

- `avaliacao-dados.js`: banco local (IndexedDB `jrmAvaliacao`: atividades, turmas, indicadores, configurações). Nada vai para servidor.
- `curriculo/habilidades.js`: códigos e descrições das habilidades do Currículo de Referência de MS (usado no quiz e no painel).
- Três fontes de dados: **quiz ao vivo** (registro automático), **avaliação por indicadores** (rubrica de 4 níveis para qualquer atividade, com habilidades do currículo ou indicadores do professor) e **relatórios dos jogos** (o estudante copia o relatório e o professor cola em Importar).
- Relatórios: por atividade (estilo Kahoot: pergunta mais difícil, alternativa errada mais escolhida, tempo médio, tabela por estudante) e por turma (habilidades a retomar/consolidadas, mapa estudantes × habilidades, texto pronto para o formulário de acompanhamento). Exporta CSV e imprime.
- Níveis padrão: Abaixo do básico (<40%), Básico (40–69%), Adequado (70–89%), Avançado (≥90%) — editáveis em Configurações.
- Os dados ficam no navegador do professor: use **Configurações → Baixar backup** para guardar ou levar a outro computador.
