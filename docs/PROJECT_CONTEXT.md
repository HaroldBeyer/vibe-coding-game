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

## Entrega 07 — primeira passagem visual: cidade alemã e sprites

Pedido aprovado: melhorar o visual, trabalhar uma cidade grande alemã, criar sprites de jogador/zumbis/civis e adicionar postes e lojas.

- Cidade fictícia Neustadt: telhados de cores variadas com telhas, cumeeiras, claraboias quebradas, chaminés, danos e fachadas comerciais. Letreiros de Bäckerei, Späti, Apotheke, Bücher, Metzgerei, Eckkneipe, Radwerk, Imbiss, Kaffee e Kiosk.
- Ruas com calçadas de pedra, meios-fios, travessias, marcações gastas, trilhos de bonde e paradas H/TRAM. Postes com iluminação âmbar, lixeiras, bicicletas, poças, rachaduras e destroços. Arte urbana em src/art.ts, mantendo a geometria sólida existente de world.ts; postes e mobiliário são decoração, sem novas colisões/navegação.
- Atlas raster transparente gerado com a ferramenta integrada ImageGen e salvo em public/assets/characters-atlas.png. Seis aparências: jogador com mochila/pistola, três civis e dois zumbis. Prompt completo e procedência junto ao atlas. Poses únicas; ainda sem animações de caminhada.
- Integração pelo preload do Phaser; texturas individuais de 52 px extraídas em runtime, exibidas em 38 px para leitura. Raio físico mantido em 9 px com ajuste pela escala. Caixas de munição agora têm textura própria.
- Cabeçalho, moldura, rodapé e paleta atualizados; gameplay/HUD continuam em português, sinalização diegética em alemão. Removidos os rótulos de protótipo dentro do jogo. Nome Dead District continua provisório; Neustadt é a ambientação fictícia desta passagem visual.
- tsconfig inclui tipos do Vite para carregar assets com BASE_URL correto. O balanceamento de src/config.ts permanece.

Validação da entrega 07: 21 testes e build passaram. No navegador real, conferidos atlas/sprites, fachadas, iluminação, movimento, parada na borda das lojas, coleta de munição, tiro, recarga (7/7, reserva 6) e reinício sem avisos/erros no console. A partida continuou funcionando por mais de 90 s com infecções. O aviso de bundle grande do Phaser permanece. Assets urbanos decorativos não receberam novos bloqueios físicos; animação de caminhada e áudio seguem pendentes.

Acabamento adicional da entrega 07: variação de quarteirões com Parkhaus e carros no estacionamento de cobertura (dentro de prédios já sólidos), painéis solares, bancos e mapas nas paradas, placas de nomes de ruas. Tudo decorativo, sem novos sistemas de gameplay. Build novamente validado após o acabamento.

## Entrega 08 — perseguição rápida, corrida dos civis e áudio

Pedido aprovado: zumbis mais rápidos que civis/jogador andando, mas ultrapassáveis quando os humanos correm; adicionar efeitos e trilha black metal.

- Jogador mantém 105 andando / 175 correndo. Civis andam 85–100 (primeiro 85), correm a 170 quando a ameaça está até 110 px e há stamina; pânico correndo chega a 190. Cada civil tem fôlego próprio, com os mesmos defaults 100/32 consumo/18 recuperação/30% desbloqueio; configurações separadas em civilian.stamina. Exaustos voltam à caminhada, congelamento do pânico permanece.
- Zumbis: 135 perseguindo, 120 em patrulha de horda e 110 vagando, acima de todos os humanos andando. Sem mudança de população, vida ou dano.
- src/audio.ts: efeitos sintetizados para tiro, vazio, recarga, arma pronta, coleta, passos, impacto, dano, rosnado próximo, transformação e morte. Rosnados têm atenuação/distância e posição estéreo; passos só com deslocamento real. Sem sons de passos para cada um dos 80 civis simultaneamente.
- Música original sintetizada de aproximadamente 42,67 s, 180 BPM: guitarras distorcidas/tremolo, baixo e blast beats com variação em meio tempo. Sem vocais nem samples de obras existentes. Compositor reproduzível em scripts/generate-music.mjs; OGG e MP3 em public/audio/, com procedência/instruções. Primeira trilha sintetizada inspirada em black metal, não gravação de banda.
- Áudio só começa após interação. M alterna mute, controles separados de trilha/efeitos e volumes padrão em config.audio. Música pausa em P, morte e página oculta, retoma ao continuar/reiniciar sem duplicar contextos. Efeito de morte pode terminar sua cauda.
- Velocidades e volumes são parâmetros provisórios ajustáveis. Civilian sprintDistance e fôlego também estão no arquivo central.

Validação: 23 testes e build passaram. Testes verificam hierarquia de velocidades e stamina civil. OGG decodificado com duração correta e pico medido de -3,7 dBFS, sem clipping digital. No navegador real, reprodução avançou, pausa em P reteve a posição, mute em M permaneceu durante o resume, volume de trilha mudou 28→27→28 e tiro/recarga rodaram sem erros no console. A qualidade musical e o equilíbrio subjetivo dos sons precisam da avaliação do diretor ouvindo. O aviso conhecido de bundle grande permanece.

## Entrega 09 — civis circulando por conta própria

Pedido aprovado: civis andarem mais autonomamente, em vez de só se moverem ao detectar zumbis.

- Sem ameaça, cada civil escolhe seu próprio destino e caminha até ele, usando navegação por grade para contornar prédios. Fuga e pânico interrompem o passeio; depois escolhe uma rota nova.
- Novos parâmetros civilian.roam*: destinos preferidos entre 180–480 px, renovação após 12 s, chegada em 16 px, 15% de chance de pausa de 0,4–1,2 s. Verifica falta de progresso a cada 1,5 s e troca o destino se bloqueado. Em local sem candidato próximo, usa um ponto livre do mapa como fallback.
- Passeio usa velocidade de caminhada; não gasta stamina. Quantidades, corrida, percepção, combate e áudio permanecem.
- 25 testes e build passaram, incluindo destino livre, rota ao redor de prédio e escolha junto à borda do mapa. Navegador carregou sem erros e foi observada circulação dos civis na rua e vielas. Aglomerações ainda podem exigir nova escolha de caminho.

## Entrega 10 — dois mapas geográficos e NPCs regionais

Pedido aprovado: opções de Frankfurt am Main/Sachsenhausen e Cabula VI/Salvador, começando no módulo policial; pesquisar para maior fidelidade e adaptar a aparência/roupas dos civis. O diretor confirmou o Largo no encontro da Anísio Melhor com Teódulo de Albuquerque.

- Seletor acima do canvas; troca inicia nova partida via ?map=frankfurt ou ?map=cabula. Título, HUD, cenário e civis acompanham a escolha.
- Bases derivadas de OSM em public/maps/, 4800 × 3600, norte para cima. Frankfurt tem 1134 footprints e Cabula 219, além de vias reais. Colisões rasterizadas em 12 px, navegação 24 px, spawn em componente conectado. Rios bloqueiam; vias/ponte são liberadas. Ruas alargadas para gameplay, sem alegação de reconstrução 1:1.
- Cabula começa no Largo confirmado, com marcador MÓDULO POLICIAL. A implantação/arquitetura exata do prédio não foi verificada; marcador não é um footprint cadastral. Pesquisa, fontes e limites em docs/MAP_RESEARCH.md; atribuição/ODbL na interface e public/maps/README.md. Cobertura de prédios no Cabula é incompleta conforme a base disponível.
- Renderização própria em src/map-art.ts; prédios irregulares, vias, praças e marcos da base. Cenário estático rasterizado uma vez em texturas para evitar a queda de desempenho observada na primeira versão detalhada.
- Atlas de oito NPCs gerado com ImageGen, com prompt em public/assets/: quatro roupas de outono para Frankfurt e quatro roupas leves para Salvador, diversidade de cabelos/tons de pele em ambos. Poses únicas.
- config.maps.defaultMap e spawnOverrides controlam mapa padrão/pontos opcionais. Os mapas geográficos usam suas dimensões/grade/spawn; valores antigos de world e player.spawn permanecem no cenário sintético dos testes legados.
- 26 testes passaram, incluindo ambos os mapas em processos isolados: pontos iniciais livres, 20 spawns com distância segura por mapa, navegação até a primeira munição, colisão/raycast. Build passou. Ambos abriram no navegador sem erros após rasterizar o cenário; Cabula voltou a avançar em tempo real e Frankfurt renderizou corretamente.

## Entrega 11 — cidade genérica restaurada e NPCs com papéis

O diretor rejeitou/cancelou os mapas específicos e os NPCs regionais. Restaurar a cidade grande alemã genérica e os civis anteriores; implementar interações entre NPCs/jogador, com soldados, médicos e civis comuns.

- Removidos seletor e lógica geográfica, bases e assets regionais do checkout. Mesmo URLs antigos ?map=cabula/frankfurt agora carregam Neustadt genérica. A entrega 10 acima é histórica/cancelada, não descreve o estado atual. Mantidos sprites comuns, cenário alemão procedural, áudio, corrida, pânico, hordas e circulação autônoma.
- O total continua 80 humanos: defaults provisórios de 4 soldados, 4 médicos e 72 comuns. Quantidades/alcances/limites em config.npc. Primeiro médico/soldado ficam próximos ao jogador por até 8 s para facilitar contato, sem impedir fuga/combate se surgir perigo.
- F interage com o NPC visível mais próximo em até 75 px: civis conversam/informam sobre alertas locais; médico cura até 30 (cap na vida máxima), com 5 curativos e cooldown de 8 s; soldado pode dividir 7 balas uma única vez, descontadas do próprio estoque.
- Soldados atacam zumbis visíveis em 250 px, com mesmos danos/críticos da pistola. Têm 14 balas totais, carregador de 7, recarga de 1,6 s e intervalo de 0,8 s entre tiros. Atiram com som/ruído, recuam de ameaça próxima e fogem quando ficam sem munição; pânico continua possível. Abates NPC separados dos do jogador no HUD. Sem fogo amigo.
- Médicos procuram/tratam NPCs feridos próximos quando não estão fugindo; não ressuscitam mortos/infectados. NPCs trocam avisos em até 90 px com linha de visão; informação expira sem retransmissão infinita. Pequenos diálogos ocasionais e balões de fala. Avisos não dão conhecimento global do mapa.
- Sprites próprios de soldados e médicos em public/assets/npc-roles-atlas.png, gerados com ImageGen integrado; prompt completo ao lado. Dois visuais de cada papel; civis usam o atlas genérico anterior. Etiquetas distinguem os papéis, além do pânico.
- src/npc.ts concentra distribuição de papéis, cura e doação, com testes de limites/recursos. 28 testes e build passaram. Navegador confirmou cidade/restauração mesmo em URL antigo, F com resposta do médico quando saudável, reserva +7 do soldado e abates dos soldados, sem erros no console. Cura de feridos/limites validada nos modelos; não houve avaliação prolongada de todo o balanceamento no navegador.


## Combate e evolução — 2026-11-03
Pedido aprovado: menu ao clicar em NPCs, recuo/dispersão, soldados com munição finita e corpo a corpo, civis capazes de se defender, 30 zumbis + 1 criatura rápida inicial. Interpretado e comunicado: “3 players” significa três humanos mortos pelo mesmo zumbi, incluindo NPCs. Conversão continua criando um zumbi novo, enquanto o agressor evolui na terceira vítima; mortes não são compartilhadas pela horda.
Implementado: rastejante quadrúpede provisório, 225 px/s, 5 de vida, crítico tira 2,5 (cinco tiros comuns ou dois críticos). Evolução restaura a vida da criatura. Corpo a corpo dá 1 de dano, intervalo 1,1 s, alcance 43 px e empurra por 0,22 s respeitando paredes. Civis e especialistas se defendem quando calmos. Botão direito permite defesa do jogador na direção da mira. Armas têm dispersão, penalidade em movimento e recuo físico; pistola acumula dispersão recuperada com o tempo. Soldados conservam estoque de 14 balas, com recargas de sete. Clique em NPC próximo ou F abre conversa/perigo/ajuda específica; mundo continua rodando. Afastamento, morte e reinício fecham o menu. Parâmetros em src/config.ts.

## Ajuste de dificuldade — 2026-11-03
Reduzidos soldados iniciais de 4 para 2, mantendo 80 NPCs totais (4 médicos e 74 civis comuns). Dano por contato dos zumbis aumentado de 20 para 30, compartilhado por jogador e NPCs; humanos com 100 de vida morrem no quarto ataque sem cura. População inimiga permanece 30 zumbis e 1 rastejante.


## Iluminação e sons — 2026-11-03
Pedido: sons de armas/mortes/pânico/socorro; ruas com iluminação desigual afetando mira e visão humana, sem penalidade aos zumbis.
- src/lighting.ts compartilha fontes fixas entre postes/vitrines, mapa de sombras e percepção. Postes quebrados, luz quente/fria e ambientação noturna azul. Prédios bloqueiam a luz. Escurecimento pré-calculado numa textura de 8 px, amostras de luz em cache; reinício reaproveita os cálculos. Somente humanos usam humanSees: jogador para atores/munição/minimapa, civis para ameaça e soldados/médicos para alvos. Visão/ audição dos zumbis e audição humana preservadas.
- Escuro acrescenta até .11 rad de dispersão ao jogador/soldados, além de movimento/recuo; mira amplia o círculo e HUD mostra luz/penalidade. Distância humana varia conforme iluminação do observador e alvo, mínimo de 42% do alcance-base; linha de visão continua obrigatória. Luz não revela áreas fora do alcance/atrás de paredes.
- Pistola e fuzil têm efeitos distintos e pequenos clarões; mortes comuns/mutantes/humanas, gritos de pânico e socorro ao ser ferido ou durante pânico. Sons atenuados por distância e panorama estéreo; vozes com intervalo global de 2,2 s e pedidos individuais com intervalo de 9 s. Vozes provisórias sintetizadas offline, sem API externa. Ajustes em config.lighting/config.audio.

Validação: 33 testes e build passaram. Navegador confirmou cenário noturno, HUD de luz, mira ampliada e reinício; reprodução da trilha chegou a readyState 4/paused false, sem erros de console na sessão final. WAVs de socorro verificados com duração e sinal não nulo. Não houve avaliação auditiva humana da mixagem. Corrigidos cancelamento normal de play() na pausa/reinício e foco do canvas após usar controles de áudio.


## Hordas na entrada oeste — 2026-11-03
Pedido: spawn em local específico, 30 iniciais e três hordas de 30 a cada dois minutos, sempre com evoluído. Implementado/comunicado: ponto fixo na borda oeste (90,870), formação local de 85 px com corpos separados 23 px e exclusão de paredes. Entrada inicial tem 30 comuns + 1 evoluído; reforços aos 120/240/360 segundos têm 30 comuns + 1 evoluído cada. São 120 comuns programados, além de evoluídos/infecções. A interpretação de “sempre” mantém ao menos um evoluído vivo: se todos morrerem, outro entra nesse mesmo ponto no próximo update; essa manutenção continua depois da última horda. Evolução por três vítimas permanece ativa.
HordeSchedule em src/waves.ts usa elapsed da cena: pausa/morte interrompem e reinício restaura onda 1, sem setInterval ou gatilho por abates. Os grupos saem em patrulha compartilhada e mantêm percepção/fuga/ataques anteriores. HUD mostra horda/contagem regressiva e minimapa marca a entrada conhecida; cenário tem sinalização no ponto. config.waves controla centro, raio, espaçamento, quantidade, intervalo e mínimo de evoluídos; population.zombies/mutants controlam a entrada inicial. Não há uma quinta horda programada nem condição nova de vitória. Infecções continuam surgindo onde o humano morreu.

Validação das hordas: 37 testes passaram, incluindo horários exatos, ausência de duplicatas/quinta horda, reset, formação livre e mínimo de evoluídos. Navegador confirmou 31 inimigos iniciais, horda 1/4, contagem regressiva e marcador oeste, sem erros no console. Reforços de seis minutos validados pelo agendador automatizado, sem partida manual completa.


## Cidade acessível e portas destrutíveis — 2026-11-03
Pedido aprovado: trabalhar cidade/interiores, portas fecháveis bloqueando infectados que tentam quebrá-las.
- 12 prédios acessíveis no mapa padrão: lojas, bares e clínicas. O bar a sudeste do spawn tem entrada norte em (1350,965). Interiores com piso, prateleiras, balcões/caixa, mesas e maca conforme tipo; móveis sólidos. Telhado individual some dentro ou ao se aproximar da porta aberta e volta ao afastar. Personagens atrás de telhados fechados não vazam visualmente.
- Geometria compartilhada em world.ts: footprints preservados para arte; structuralWalls/collisionRects descrevem paredes/móveis reais. Portas fechadas participam de blocked, raycast, visão, tiro e física; abertas/destruídas desabilitam corpo. Navegação checa segmentos entre células para não atravessar paredes estreitas. Infectados planejam até entradas fechadas e atacam quando próximos; rotas são invalidadas ao mudar portas.
- F ou clique na porta próxima abre/fecha, com prioridade sobre interação NPC. Não fecha sobre jogador/NPC/infectado. Vida de 160; ataque comum 12, evoluído 24, intervalo individual 0,9 s, alcance 36. Vida exibida ao fechar; sons de manuseio/pancada/ruptura. Destruída fica aberta e não pode ser reparada nesta entrega. Reinício restaura todas abertas com vida cheia. Móveis e portas bloqueiam todos os corpos, inclusive NPCs. NPCs atravessam portas abertas, não as operam.
- Luz de teto nos interiores; bake estático considera paredes e ignora folhas das portas, evitando recalcular o mapa inteiro ao abrir/fechar. Visão e tiros continuam reagindo imediatamente à folha. config.interiors/config.doors regulam distribuição, espessura, largura, revelação, interação, resistência e ataques.
- 41 testes e build passaram. Testes cobrem entrada livre, demais prédios sólidos, fechamento sem esmagar, colisão/oclusão, dano até quebra única, evoluído mais forte, reset e navegação aberta/fechada. Navegador confirmou entrada no bar, telhado removido, fechamento por dentro, movimento bloqueado, reabertura e saída; sem erros de console. Cerco completo por uma horda não foi observado no navegador; dano/quebra validados no modelo e integração de ataque implementada.


## Proteção, esquadrões, refúgios e portas sem travamento — 2026-11-03
Pedido aprovado: civis próximos aos soldados, mais pânico, fuga para prédios fechando portas; soldados protegendo médicos e formando esquadrões; corrigir lag das portas.
- Civis seguem soldados que percebem localmente, mantendo distância de ~90 px e evitando aproximar-se de ameaça evidente. Memória de aliados de 5 s, sem rastrear posições invisíveis. Pânico dos civis sobe de 15% para 40% por encontro; especialistas mantêm 15% e os cooldowns continuam válidos.
- Humanos não militares ameaçados podem escolher entrada visível próxima e segura, sem infectados conhecidos no interior, entrar, fechar a porta sem esmagar ocupantes e ficar abrigados por 25 s. Se a ameaça continuar percebida, o medo prolonga a espera. Porta rompida ou infectado percebido no mesmo interior abandona o plano; após acalmar, voltam à maçaneta, abrem e saem. Não operam portas à distância. Rótulos mostram COM SOLDADO, BUSCANDO ABRIGO e ABRIGADO/MEDO.
- Soldados se conectam por encontros locais, formam esquadrões com líder estável e compartilham médicos observados. Escoltam, priorizam infectados próximos do médico e tentam recompor a formação. Continuam com munição finita, corpo a corpo e pânico. Número de soldados permanece 2. Decisões sociais recalculadas a cada 0,65 s. Parâmetros em config.tactics e panic.civilianChancePercent; funções testáveis em src/tactics.ts.
- Causa do lag: fechar/abrir invalidava todas as rotas, gerando dezenas de BFS com raycasts de paredes. Grafo estático pré-calculado, máscaras locais de portas, campos de distância compartilhados por célula-destino, cache limitado e rotas existentes atualizadas sob demanda. Rotas dos infectados ignoram folhas e não precisam invalidar ao alterná-las. Uma porta apenas sincroniza seu corpo físico.
- Benchmark Node com 80 rotas humanas e 10 infectadas após alternar porta: antes 270–305 ms; depois de preparar o grafo, 0,03–1,65 ms nas amostras locais. Medição do subsistema de navegação, não garantia de frame time completo. Testes confirmam que uma rota existente reage a fechamento/reabertura/quebra sem novo handle.
- Validação: 46 testes e build passaram. Navegador mostrou COM SOLDADO e SOLDADO/ESCOLTA e confirmou alternância repetida da porta sem erros de console. Formação de esquadrões, escolha de abrigo e regras de fechamento foram validadas nos modelos; ciclo completo de um civil entrando, aguardando e saindo ainda não foi observado em partida manual.


## Ritmo mais lento e vielas labirínticas — 2026-11-03
Pedido: desacelerar movimentação geral, ataques mais fortes dos zumbis, trechos mais fechados/labirínticos da cidade.
- Locomoção reduzida cerca de 25%: jogador 78/132 andando/correndo, civis e especialistas 64–75/128, pânico 142, zumbi perseguindo 100/ocioso 80/patrulha 90, evoluído 170 px/s. Infectados comuns continuam mais rápidos que caminhada e mais lentos que corrida; evoluído mais rápido que todos os humanos. Cadência de passos do jogador acompanha o ritmo mais lento.
- Dano dos infectados em humanos sobe de 30 para 40, três ataques contra vida cheia sem cura. Portas recebem 18 por ataque comum e 36 por evoluído (antes 12/24); resistência 160 preservada.
- Dois trechos de obra fecham partes das avenidas em chicanes: região 540–1020/780–960, a oeste do início, e 1500–1980/1200–1380, a sudeste. Barreiras opacas e sólidas com avisos de obra, desvios em S, bolsões sem saída e corredores transitáveis de ~50 px. Duas entradas conectadas por região; sem lacrar casas/portas ou ponto inicial. Colisão, tiros, visão, luz e navegação compartilham mazeWalls. config.world.mazeDistrictsEnabled alterna os trechos.

Validação desta mudança: 48 testes e build passaram. Novos testes percorrem ambos os trechos nos dois sentidos, conferindo bloqueios/visão, corredores livres, desvio vertical e comprimento maior que linha reta. Navegador confirmou movimento mais lento, obras desenhadas e combate; sem erros no console. Travessia completa validada pela navegação automatizada, não por uma partida manual sem inimigos.


## Civis mais vulneráveis — 2026-11-03
Pedido interpretado como enfraquecer corpo a corpo civil, reduzir empurrão e aumentar pânico. Humanos não militares (civis/médicos) agora dão 0,5 de dano corpo a corpo, intervalo 1,6 s, empurrão 80 px/s durante 0,14 s (antes 1 de dano, 1,1 s, 260 px/s por 0,22 s). São seis golpes civis para matar um zumbi comum com vida cheia. Chance de pânico dos civis comuns sobe de 40% para 60% por novo encontro, preservando cooldowns. Parâmetros melee.civilian* e panic.civilianChancePercent. Jogador/soldados usam perfil treinado existente; médicos mantêm a chance de pânico dos especialistas.


## Sangue e gore em pixel art — 2026-11-03
Pedido: sangue ao tomar tiro, desmembramento/sangue nas mortes causadas por infectados.
- GoreField em gore-model.ts simula gotas/partes sem corpos Arcade; Gore em gore.ts desenha manchas, torso, braços/pernas/cabeça, com cores de roupa por personagem. Tiros do jogador e soldados, corpo a corpo e mordidas acionam respingos; críticos aumentam o jato e mortes críticas de infectados soltam cabeça. Mortes humanas causadas por infectados deixam torso, poça e três partes. A conversão do civil continua criando infectado no local, com restos visuais no chão. Jogador morto é substituído pelo torso/restos enquanto a animação termina, mesmo com física pausada.
- Sangue e restos persistem até reinício, sujeitos a limites FIFO: 220 partículas simultâneas, 420 manchas, 64 corpos e 100 restos. Sprays param em paredes/portas; renderização respeita percepção/telhados/iluminação, com ground redraw a 10 Hz. Não bloqueiam movimento/tiros nem alteram rotas. Sem geração de bitmaps externa: partículas e desmembramento procedurais em pixel art. Som molhado de impacto via Web Audio.
- Aviso de morte deslocado para baixo para não cobrir o corpo. Pausa congela efeitos; reinício recria o sistema limpo. config.gore regula habilitação, quantidades, gravidade e atualização visual.
- 51 testes passaram e build passou. Testes cobrem queda do sangue, bloqueio por parede, desmembramento, descarte de referências a atores, limites sob 300 mortes e desligamento. Benchmark local da simulação cosmética com 30 mortes simultâneas: média 0,72 ms/update, máximo 4,43 ms nas 60 amostras (não inclui render/IA). Navegador confirmou sangue/morte causada pela horda, partículas e chão manchado, aviso de morte abaixo do corpo e execução sem erros no console. Impactos direcionais, limites e partes assentadas também validados no modelo; não houve avaliação prolongada de quatro hordas completas.


## Esquadrões limitados e evacuação de civis — 2026-11-03
Pedido: soldados andando em esquadrões de até cinco e tentando escoltar civis para áreas fechadas.
- squadGroups agora limita a cinco soldados por grupo, inclusive em redes de encontros com mais membros. Contatos locais/memória/líder estável permanecem. Quantidade inicial preservada em 2 soldados, conforme redução já aprovada; capacidade é independente do total configurado.
- Cada grupo pode organizar uma escolta de até seis humanos não militares percebidos por seus membros. Escolhe abrigo intacto com entrada conhecida, evitando infectados detectados e portas já fechadas por outros grupos. Um militar guia a retaguarda percebida e outros tomam posições de cobertura nas laterais, sem ocupar o corredor da porta. Disparos podem acontecer durante a aproximação e priorizam ameaças aos escoltados; munição finita/pânico/melee continuam.
- Civis recebem plano compartilhado, vão para dentro e não fecham a porta nos companheiros da mesma missão. Só depois de todos os sobreviventes estarem além da soleira, o responsável aproxima-se da maçaneta e tenta fechar, respeitando ocupantes e alcance. Guarda cobre por 12 s após fechar; civis permanecem abrigados pelo menos 25 s após a porta ficar segura. Depois voltam ao comportamento anterior, com cooldown de 35 s antes de nova escolta.
- Porta rompida, infectados conhecidos no abrigo, perda do grupo ou prazo de 45 s encerram a missão; mortos não impedem fechamento indefinidamente, sobreviventes que já chegaram mantêm abrigo normal. A separação/união dos esquadrões encerra missões que perderam seu grupo e libera planos externos. Rótulos ESCOLTADO, ESCOLTA CIVIS e ABRIGADO distinguem estados.
- config.tactics: squadMaxMembers (1–5), escortCivilianLimit, evacuationTimeout, evacuationCooldown, coverHoldSeconds. Funções testáveis: escortArrived e escortCoverPoint.
- 54 testes e build passaram. Testes validam rede de 12 soldados dividida em 5/5/2, nenhum membro perdido, impossibilidade de fechar com alguém fora/na soleira e posições de cobertura desobstruindo passagem. Navegador confirmou escolta em andamento, porta fechada pelo grupo e dois civis abrigados no bar, com fechamento novamente ao abrir para conferir; sem erros de console. Limite de cinco validado automaticamente; a sessão visual usou os dois soldados padrão.


## Resgates recorrentes e médicos acompanhantes — 2026-11-03
Pedido: soldados fecham o abrigo com os civis dentro, partem para explorar/procurar novos civis e médicos seguem quando possível.
- Entrega concluída termina a missão imediatamente, sem os antigos 12 s de guarda parada. Civis entregues recebem estado settled/CIVIL RESGATADO e permanecem no prédio, sem sair ao vencer o antigo tempo de medo. Porta rompida ou infectado percebido dentro ainda permite abandonar o refúgio e fugir.
- Esquadrão registra a porta/base e inicia busca ativa em destinos externos a pelo menos 300 px. Há 8 s mínimos de patrulha antes de aceitar nova missão, evitando ficar reatribuindo os mesmos moradores. Seguidores de esquadrão acompanham o líder; combate continua prioritário quando necessário.
- Base conhecida pode ser reutilizada mesmo fechada, com conhecimento estático da entrada. Novos civis se aproximam pelo lado de fora; o responsável abre quando o comboio chega perto, espera passagem e fecha novamente. Moradores não fecham a porta contra uma missão ativa. Capacidade padrão 12 residentes, incluindo reservas de outras missões para evitar superlotação; cheia/comprometida leva à busca de outro prédio. Cada comboio mantém limite 6.
- Só civis comuns entram na lista de residentes de evacuação. Médicos acompanham soldados percebidos/memorizados localmente, com distância 60 px, e priorizam atendimento; ainda podem fugir/abrigar-se temporariamente sob perigo/pânico. Se ficam numa casa fechada ao seguir uma tropa fora, tentam alcançar a maçaneta e sair. Soldados protegem médicos no combate, sem deixar a patrulha calma presa numa perseguição mútua médico/soldado.
- Corrigida uma tolerância de chegada: NPCs paravam até 15 px antes do alvo interno e às vezes não ultrapassavam o limite necessário da soleira. shelterEntryPoint agora garante avanço suficiente e alcance da maçaneta. Aproximação lateral ao reabrir a base também respeita essa tolerância.
- Novos parâmetros tactics.shelterCapacity, rescueSearchSeconds, rescueSearchMinDistance, rescueSearchLifetime e medicFollowDistance; coverHoldSeconds foi removido. Permanecem dois soldados iniciais e limite cinco por esquadrão.
- Validação: 58 testes e build passaram. Testes novos cobrem permanência após o tempo antigo, distinção médico/civil, base fechada conhecida versus desconhecida/comprometida, busca distante externa e tolerância de entrada. Navegador mostrou médico ACOMPANHANDO ESQUADRÃO e civis CIVIL RESGATADO no bar após a entrega, sem erros de console. Segundo comboio completo até a mesma base não foi observado manualmente; seleção/reabertura e coordenação foram implementadas, com regras de base cobertas nos modelos.


## Abrigos de sete e ordens de seguir — 2026-11-03
Pedido: no máximo sete civis por abrigo antes de buscar outro; opção seguir/parar de seguir na interação NPC.
- tactics.shelterCapacity reduzida de 12 para 7. Planejamento conta civis presentes no prédio, planos de abrigo a caminho e reservas de escoltas, deduplicados; não apenas os moradores já entregues. Seleção de abrigo recebe filtro de vagas para escolher outro local quando cheio, inclusive no refúgio individual. Quem já está no prédio pode assumir seu próprio lugar sem ser rejeitado pelo limite. Não há expulsão/teleporte de um oitavo que entre por movimento autônomo ou ordem explícita; o limite rege as tentativas de alojamento.
- Menu de todos os papéis (F/clique) alterna Siga-me/Pare de me seguir. Seguir cancela o plano individual de abrigo, remove o civil de sua escolta e retira soldado da organização autônoma; grupo remanescente pode herdar a missão com novo líder. Parar devolve a rotina normal, sem congelar o NPC no lugar. Seguidores são excluídos de novas missões de evacuação.
- Ordem de seguir tem prioridade sobre exploração/escolta/abrigo automático; pânico, congelamento e empurrão ainda podem interromper temporariamente o movimento. Distância de formação 55 px, corrida com stamina para recuperar atraso acima de 120 px. Posição do jogador só atualiza quando percebida; memória de 6 s. Ao perder contato por mais tempo, NPC aguarda o reencontro mantendo a ordem. Seguidores alcançam/operam maçanetas para atravessar portas fechadas, sem ação à distância. Rótulos SEGUINDO VOCÊ/ESPERANDO VOCÊ/COM VOCÊ dão feedback.
- Parâmetros novos: tactics.playerFollowDistance, playerFollowSight, playerFollowMemory, playerFollowSprintDistance. Aliados ainda podem reconhecer soldados que estejam seguindo o jogador, conforme proximidade/percepção.
- 60 testes e build passaram. Testes novos validam sete vagas, rejeição de base cheia e memória sem rastrear jogador invisível. Navegador confirmou médico seguindo após deslocamento do jogador, cancelamento e alternância das duas opções; sem erros de console. Transferência de escolta e abertura de portas pelo seguidor não foram observadas em uma partida manual completa.


## População dispersa e grupos menores — 2026-11-03
- NPCs iniciais distribuídos alternadamente entre 16 setores (4×4), em terreno livre com margem de 26 px e distância mínima de 90 px. Removidas posições fixas perto do jogador; continuam 80 humanos, dois soldados e quatro médicos no total.
- Esquadrões autônomos limitados a três soldados; cada grupo recebe até cinco civis acompanhantes/evacuados e um médico. Associação única por NPC, com preferência por vínculos anteriores e percepção/memória local. Reservas de comboios ocupam vagas antes dos acompanhantes espontâneos; médicos excedentes mantêm suas próprias rotinas.
- Ordens de seguir o jogador também aceitam no máximo três soldados, cinco civis e um médico. Ao exceder, NPC recusa com mensagem; parar de seguir libera vaga. Capacidade dos abrigos permanece sete civis.
- Parâmetros: npc.spawnColumns/spawnRows/spawnSeparation, tactics.squadMaxMembers=3, escortCivilianLimit=5, medicsPerGroup=1.
- Validação: 62 testes e build passaram. Modelos cobrem distribuição pelos 16 setores, separação/colisão e vagas reservadas/limites. Navegador iniciou e executou a partida sem erros de console; limites completos de grupos não foram observados manualmente.


## Composição inicial revisada — 2026-11-03
- População mantém 80 NPCs humanos: quatro médicos (5%), nove soldados (11,25%) e 67 civis comuns (83,75%). Limites por grupo continuam três soldados, cinco civis e um médico.


## Objetivo, três ondas e menu de configurações — 2026-11-03
- Padrão reduzido para três ondas: inicial e dois reforços, aos 120/240 s. Cada onda mantém 30 comuns + um evoluído; infecções continuam. Reposição mínima de evoluídos só funciona enquanto há reforços futuros, evitando impedir a limpeza final.
- Vitória exige todas as ondas lançadas, zero infectados vivos e pelo menos um civil comum sobrevivente; perder todos os civis comuns encerra com derrota. Morte do jogador continua encerrando. Soldados/médicos são apoio e não contam como civis para o objetivo. HUD agora mostra especificamente os civis comuns. Resultado congela simulação; Enter reinicia, botão Menu inicial retorna à tela inicial.
- Tela inicial antes de instanciar Phaser: Iniciar jogo e Configurações, resumo de composição e objetivo. Mais de 50 parâmetros editáveis, agrupados em partida, combate, humanos, infectados e luz/cidade. Inclui danos, vidas, munição, velocidades, stamina, pânico, cura, grupos, visão/audição/memória, hordas, escuridão e portas. Geometria e parâmetros internos de desempenho permanecem no código.
- Ajustes são validados por faixa/passo e coerência (ao menos um civil comum), persistem no localStorage versionado, aplicados antes dos módulos calcularem constantes. Armazenamento inválido usa padrões completos. Salvar recarrega no menu; Restaurar padrões preenche o formulário e requer salvar. Padrões sempre vêm do código.
- Novo lighting.influencePercent regula apenas penalidades humanas de visão/mira: 0 desativa ambas, preservando iluminação visual, paredes e visão dos zumbis.
- Validação: 66 testes e build passaram; QA no navegador confirmou menu, salvamento persistente de dano, restauração, início da partida e retorno ao menu, sem erros de console. Condições de encerramento e parada da reposição são cobertas nos modelos; vitória/derrota completas não foram jogadas manualmente.
