# Dead District — decisões e continuidade

Registro de 2026-11-02. Fonte: decisões explícitas do usuário durante a concepção do projeto.

## Objetivo e colaboração

Publicar um jogo pequeno de browser. O usuário é engenheiro de software desde 2019 e quer trabalhar como diretor: escolher direção, experiência e escopo enquanto o agente implementa e valida. Comunicar em português brasileiro, com discussão técnica adequada à experiência dele. Perguntar sobre decisões de produto ainda abertas; resolver detalhes técnicos rotineiros autonomamente.

“Dead District” é o título de trabalho adotado pelo protótipo; o nome definitivo não foi aprovado. A referência inicial foi descrita pelo usuário como “aliens infestation 2 last stand”; a identidade exata dessa referência não foi confirmada. Os inimigos foram explicitamente alterados de aliens para zumbis.

## Decisões aprovadas

- Plataforma: browser; primeira implementação para desktop com teclado.
- Stack: Phaser + TypeScript, usando Vite; arquitetura enxuta, evoluindo conforme necessário.
- Câmera: top down quase vertical, referência Hotline Miami; isso define a perspectiva, não um combate rápido.
- Experiência: pesada e tensa.
- Loop pretendido: arena com ondas e defesa de barricadas.
- Cenário: cidade destruída.
- Movimento: caminhada e corrida limitada por stamina.
- Inimigos iniciais: zumbis lentos perseguindo o jogador.
- Primeira entrega: personagem andando, perseguição, dano por contato, morte e reinício simples.
- Arte da primeira entrega: formas provisórias para avaliar gameplay.
- Direção futura: pixel art suja, identidade e trilha black metal. Nenhuma música ou arte final foi escolhida/licenciada.

## Implementação atual

O primeiro protótipo Canvas de aliens foi substituído pelo projeto Phaser. Não retomar aquele código como direção do produto.

- `src/main.ts`: cena única, cidade com quatro prédios sólidos, jogador, perseguição direta, colisões, HUD, dano e reinício.
- `src/survival.ts`: normalização de movimento e lógica de stamina.
- `src/survival.test.ts`: três testes para velocidade diagonal, exaustão/recuperação e regeneração parado.
- `src/style.css`: apresentação provisória.
- Phaser 3.90.0, TypeScript ~5.9.3 e Vite ^7.2.2; versões resolvidas no package-lock.json.
- Controles: WASD/setas andar; Shift correr; P pausar; R reiniciar.
- Parâmetros atuais escolhidos na implementação, sujeitos à avaliação do diretor: andar 105 px/s, correr 175 px/s, stamina 100, consumo 32/s e recuperação 18/s. Ao esgotar, a corrida desbloqueia após recuperar 30. Dano 20, proteção após dano de 1,1 s. Cinco zumbis iniciais, mais um a cada cinco segundos, limite 30; velocidade entre 33 e 43 px/s.

## Validação e limites conhecidos

Na entrega inicial passaram `npm run build`, os três testes e requisições HTTP ao Vite. Não houve validação visual/interativa em navegador real. O build apresentou aviso de bundle acima de 500 kB; não impediu a compilação.

Zumbis seguem diretamente ao jogador e podem ficar presos nos prédios. Ainda não há navegação por caminhos. Também não há armas, combate ofensivo, ondas estruturadas, barricadas, arte final, áudio ou deploy público. Spawn contínuo atual é provisório e não equivale ao sistema de ondas planejado.

O protótipo foi enviado a `main` no commit `02a9115` (Build initial zombie survival prototype with Phaser and TypeScript). Não presumir que este ambiente ou processos em execução estejam disponíveis em outra sessão.

## Como retomar

1. Leia este documento e AGENTS.md, confira o estado Git e preserve mudanças existentes.
2. Execute `npm ci`, `npm test`, `npm run build` e `npm run dev`. O README informa requisitos de Node.
3. Valide no navegador quando possível; peça ao diretor feedback sobre movimento, fôlego, perseguição e sensação de tensão antes de ampliar o escopo.
4. Alinhe a próxima entrega com ele. Possibilidades ainda não aprovadas como próxima tarefa: navegação dos zumbis, combate, ondas e barricadas.
5. Não reinicie o questionário das decisões já aprovadas. Não invente aprovação para recursos futuros ou balanceamento provisório.

O histórico deste chat pode não estar acessível ao próximo agente. Estes arquivos registram as decisões do projeto; não dependem de links locais de conversa.
