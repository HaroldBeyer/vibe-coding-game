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

## Entrega 01 — histórico

O primeiro protótipo Canvas de aliens foi substituído pelo projeto Phaser. Não retomar aquele código como direção do produto.

- `src/main.ts`: cena única, cidade com quatro prédios sólidos, jogador, perseguição direta, colisões, HUD, dano e reinício.
- `src/survival.ts`: normalização de movimento e lógica de stamina.
- `src/survival.test.ts`: três testes para velocidade diagonal, exaustão/recuperação e regeneração parado.
- `src/style.css`: apresentação provisória.
- Phaser 3.90.0, TypeScript ~5.9.3 e Vite ^7.2.2; versões resolvidas no package-lock.json.
- Controles: WASD/setas andar; Shift correr; P pausar; R reiniciar.
- Parâmetros atuais escolhidos na implementação, sujeitos à avaliação do diretor: andar 105 px/s, correr 175 px/s, stamina 100, consumo 32/s e recuperação 18/s. Ao esgotar, a corrida desbloqueia após recuperar 30. Dano 20, proteção após dano de 1,1 s. Cinco zumbis iniciais, mais um a cada cinco segundos, limite 30; velocidade entre 33 e 43 px/s.

## Validação e limites da entrega 01 — histórico

Na entrega inicial passaram `npm run build`, os três testes e requisições HTTP ao Vite. Não houve validação visual/interativa em navegador real. O build apresentou aviso de bundle acima de 500 kB; não impediu a compilação.

Zumbis seguem diretamente ao jogador e podem ficar presos nos prédios. Ainda não há navegação por caminhos. Também não há armas, combate ofensivo, ondas estruturadas, barricadas, arte final, áudio ou deploy público. Spawn contínuo atual é provisório e não equivale ao sistema de ondas planejado.

O protótipo foi enviado a `main` no commit `02a9115` (Build initial zombie survival prototype with Phaser and TypeScript). Não presumir que este ambiente ou processos em execução estejam disponíveis em outra sessão.

## Como retomar

1. Leia este documento e AGENTS.md, confira o estado Git e preserve mudanças existentes.
2. Execute `npm ci`, `npm test`, `npm run build` e `npm run dev`. O README informa requisitos de Node.
3. Valide no navegador quando possível; peça ao diretor feedback sobre movimento, fôlego, perseguição e sensação de tensão antes de ampliar o escopo.
4. A entrega 02 abaixo substitui o estado do primeiro protótipo. Avalie-a com o diretor antes de definir novas entregas. Ondas estruturadas e barricadas continuam pendentes.
5. Não reinicie o questionário das decisões já aprovadas. Não invente aprovação para recursos futuros ou balanceamento provisório.

O histórico deste chat pode não estar acessível ao próximo agente. Estes arquivos registram as decisões do projeto; não dependem de links locais de conversa.

## Entrega 02 — escopo aprovado e implementação local

Após avaliar e aprovar o primeiro protótipo, o diretor pediu combate com mouse, pistola de sete balas, munição coletável, visão menor, minimapa com áreas desconhecidas, mapa maior com becos, mais zumbis lentos com percepção/memória e um NPC que foge e também pode ser alvo.

Implementado no checkout (ainda não enviado ao GitHub):
- Cidade 2400 × 1800 com prédios e vielas; câmera 1,5×, escurecimento periférico e alcance visual de 240 px. Atores e munição são ocultados atrás de prédios.
- Mira pelo mouse, um disparo por clique esquerdo; hitscan de 470 px, um tiro por zumbi, primeiro alvo/parede bloqueia o disparo. Pistola começa com 7 balas e reserva zero.
- Caixas amarelas dão 7 balas de reserva ao passar por cima. E recarrega até sete em 1,15 s; não permite disparo durante a recarga. R continua reiniciando.
- Minimapa revela o terreno explorado; mantém áreas antigas escuras, desconhecidas pretas e marca apenas atores atualmente visíveis.
- Cerca de 60 zumbis iniciais (spawns aleatórios fora do raio inicial de segurança), reforços a cada 2 s até 110; velocidade 23–31 px/s. Visão omnidirecional curta de 145 px com oclusão. Audição de caminhada 42, corrida 105, NPC andando 55 e tiro 340 px. Sons atravessam paredes nesta versão. Memória de última posição por 3 s, sem rastrear alvo invisível.
- Navegação BFS por grade de 60 px e perseguição direta quando há linha de visão. NPC azul foge localmente de zumbis que vê em 230 px, tem 100 de vida e pode morrer. Sem missão de escolta ou fogo amigo.
- Parâmetros de combate/percepção são escolhas técnicas provisórias para avaliação; não são aprovação definitiva de balanceamento.
- src/world.ts concentra layout, raycast, visibilidade e navegação. Sete testes cobrem movimento/stamina, oclusão, disparos, rota e limites de mapa.

Limites: navegação/fuga simples podem sofrer em aglomerações e cantos. Ainda sem ondas estruturadas, barricadas, áudio, arte final ou deploy. O aviso de bundle grande do Phaser permanece.

Validação local da entrega 02: sete testes e build passaram. Navegador real renderizou cenário, HUD e minimapa sem erros no console; testados movimento, pausa, tiro com abate, coleta e recarga (7/7 com seis balas restantes na reserva após repor um disparo). A fuga do NPC foi observada, mas ainda não houve uma avaliação prolongada de balanceamento ou de todos os casos de morte/cantos.


## Entrega 03 — estado atual (substitui população, combate e controles da entrega 02)

Pedido aprovado: corrigir a recarga e os dois cursores; zumbis com vida para três tiros normais ou um crítico raro; começar com um zumbi e diversos civis, com transformação em zumbi quando mortos por um deles.

- O bug de recarga era conflito de controle, confirmado pelo diretor: R reiniciava. Agora R/E recarregam, e Enter reinicia. HUD, morte e README atualizados. Comandos discretos usam eventos de teclado enfileirados, para não perder toques rápidos entre frames; repetição de tecla não reinicia recarga.
- src/combat.ts concentra o estado da pistola, dano e infecção. Recarga de 1,15 s transfere só as balas necessárias da reserva; bloqueia tiro e não avança em pausa. Feedback distingue carregador cheio e falta de reserva.
- Cursor nativo oculto apenas sobre o canvas; mira própria some fora da área do jogo.
- Zumbis têm 3 unidades de vida, barra visível, um ponto de dano por acerto normal e 5% de crítico letal. Crítico tem feedback visual. Probabilidade de 5% é um parâmetro provisório escolhido na implementação.
- Exatamente um zumbi inicial e 24 civis (quantidade provisória). Removidos os reforços por tempo: toda multiplicação vem de conversões. Civis têm velocidades entre 24 e 40 px/s; um civil inicial anda a 22 e zumbis a 29 px/s. Fogem de ameaças visíveis, mas alguns podem ser alcançados ou encurralados.
- Civis têm 100 de vida e proteção de 1,1 s entre danos de 20; a morte por zumbi remove o civil e cria exatamente um zumbi no mesmo local. Novos zumbis podem infectar outros. Contadores de civis, zumbis, abates e infecções no HUD; civis visíveis no minimapa. Sem fogo amigo.
- Critérios de produto ainda pendentes: balanceamento prolongado da propagação e comportamento da fuga em cantos/aglomerados. Sem expansão para ondas, barricadas ou arte final.

Validação da entrega 03: 13 testes e build passaram. No navegador real, R completou a recarga sem zerar a partida (7/7, reserva 6); a primeira infecção mudou 1 zumbi/24 civis para 2/23. Um mesmo zumbi sobreviveu aos acertos normais com vida 2/3 e 1/3 e morreu no terceiro, com incremento do contador de abates. Enter restaurou 1 zumbi/24 civis e munição inicial. Cursor CSS verificado como none no canvas; console sem erros. Crítico de 5% validado por testes determinísticos, não por ocorrência aleatória no teste manual. Mantém-se o aviso de bundle grande do Phaser.

## Entrega 04 — estado atual: dez zumbis, oitenta civis, agrupamento e pânico

Escopo aprovado: iniciar com aproximadamente dez zumbis e oitenta civis; zumbis sem alvo vagam e têm tendência não garantida de formar hordas; civis raramente entram em pânico ao detectar zumbis, congelando ou correndo sem pensar.

- População inicial agora exatamente 10 zumbis e 80 civis, definida em src/behavior.ts. Mantida a transformação e a ausência de reforços automáticos.
- Zumbis ociosos vagam a 12 px/s, decidindo rumo a cada 2–5 s. Havendo outros visíveis em 220 px, em 45% das decisões misturam atração pelo grupo com direção aleatória. Há separação em distâncias menores que 38 px; não enxergam vizinhos através de prédios. Busca de alvo, som e memória têm prioridade sobre agrupamento.
- Civis detectam ameaça por visão existente de 230 px ou audição curta de 55 px. Chance de pânico de 4% por novo encontro; só pode sortear novamente após mais de 2 s sem detectar ameaça, e intervalo mínimo de 14 s entre episódios. Não há sorteio a cada frame.
- Pânico: 50% congelar por 2–3,5 s; 50% correr em direção aleatória por 1,5–3 s a 90 px/s, sem considerar a posição da ameaça. Colisões permanecem e podem redirecionar a corrida. Ao acabar, retoma o comportamento normal. Tom âmbar identifica civis em pânico.
- Probabilidades, raios e durações são parâmetros provisórios para avaliação. A quantidade inicial 10/80 segue o pedido do diretor. Demais sistemas e controles da entrega 03 preservados.

Validação da entrega 04: 17 testes e build passaram. Testes determinísticos cobrem atração opcional/separação, manutenção de rumo independente, chance de pânico por encontro (sem multiplicar por frames), congelamento, corrida, expiração e intervalo mínimo. No navegador real, confirmados 10 zumbis/80 civis iniciais, movimentação e propagação até 13/77 sem erros no console. Não foi validado visualmente um episódio raro de pânico nem o agrupamento em simulação prolongada; a frequência e a sensação de horda continuam sujeitas à avaliação do diretor. Aviso conhecido de bundle grande permanece.

## Entrega 05 — estado atual: hordas patrulhando, pânico identificado, spawns aleatórios

Pedido aprovado: hordas buscam sobreviventes em vez de ficar se aglomerando paradas; aumentar pânico e mostrar identificação acima dos humanos afetados; sortear todos os zumbis iniciais pelo mapa.

- Dez zumbis iniciais agora têm posição aleatória em espaço livre, fora de 300 px do jogador. Removido o primeiro zumbi de posição fixa. Civis continuam em 80 e a infecção permanece.
- Hordas sem alvo compartilham um destino de patrulha, com navegação por grade e velocidade de 23 px/s. Ao chegar a 50 px do destino ou após 18 s, escolhem outra área aleatória. Só descobrem humanos por visão/audição; perseguição e memória têm prioridade, sem rastrear sobreviventes ocultos.
- Adesão continua probabilística (45% com vizinhos ociosos visíveis, decisões espaçadas 3–6 s). Grupos compartilham a mesma rota e podem se dispersar após 28–44 s. A coesão tem peso de 15%, menor que o avanço de 85%, para não cancelar deslocamento. Isolados continuam vagando.
- Pânico agora tem chance provisória de 15% por encontro (antes 4%); durações e intervalo mínimo mantidos. Texto PÂNICO acompanha o civil enquanto afetado e visível; some ao se recuperar, sair da visão ou virar zumbi. Mantido o tom âmbar.

Validação da entrega 05: 19 testes e build passaram. Novos testes garantem avanço da patrulha mesmo com coesão apontando para trás. Navegador renderizou versão 05 com 10/80, deslocamento e percepção sem erros no console. Não houve validação visual prolongada das hordas nem captura de um episódio de pânico nesta rodada; duração/frequência permanecem provisórias. Aviso conhecido de bundle grande permanece.

## Entrega 06 — configuração central e envio ao repositório

Pedido aprovado: enviar o projeto ao GitHub e criar um arquivo para ajustar quantidades, porcentagens e demais parâmetros.

- src/config.ts agora centraliza população, jogador, stamina, arma, munição, zumbis, civis, pânico, hordas, mapa/navegação, visão e feedback. Probabilidades em 0–100. Sistemas consomem esses valores; defaults preservam o balanceamento da entrega 05.
- docs/BALANCING.md explica unidades, grupos, exemplos, atualização por Vite/build e restrições. Não há editor de configuração dentro do jogo.
- HUD usa tamanho configurado do carregador; minimapa se adapta às dimensões; células de navegação não dependem mais de um deslocamento fixo de 30. Pontos iniciais inválidos e parâmetros inconsistentes geram erro claro.
- Spawn aleatório tem fallback finito em células livres e rejeita raio de segurança impossível em vez de ignorá-lo ou travar.
- Testes incluem cenários alternativos de munição, dano, stamina, pânico, população e grade em processo isolado; cenários anteriores ainda verificam os defaults aprovados.
- O envio solicitado inclui as entregas locais 02–06, que ainda não estavam no remoto 4f48aaf. Push é versionamento, não deploy público.

Validação da entrega 06: 21 testes e build passaram, incluindo configuração alternativa e falha de spawn impossível. Navegador real carregou os defaults 10/80 sem erros no console; observado o rótulo PÂNICO acima de civil em âmbar. O aviso conhecido de bundle grande do Phaser permanece.
