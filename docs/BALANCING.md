# Balanceamento

Edite **src/config.ts**. É o ponto central dos parâmetros de gameplay; os valores atuais preservam a versão aprovada.

Porcentagens usam **0–100**: `15` significa 15%, `0` desativa a chance, `100` garante o sorteio quando as demais condições são atendidas. Tempo em segundos, distância em pixels, velocidade em pixels/segundo. Valores `Min`/`Max` definem um intervalo aleatório.

Com `npm run dev`, salve o arquivo e o Vite recarrega a partida. Em produção, execute novo build e publique `dist/`. O menu inicial → Configurações oferece mais de 50 ajustes de gameplay, validados e salvos no localStorage deste navegador. Salvar volta ao menu; Iniciar jogo usa esses valores. Restaurar padrões preenche o formulário com os valores do código: salve para confirmar. Configurações salvas têm precedência sobre os padrões de src/config.ts. Geometria do mapa, navegação e orçamentos internos de desempenho continuam apenas no código.

| Grupo | Ajusta |
|---|---|
| population | Quantidades iniciais de zumbis/civis e raio de segurança do jogador |
| player | Vida, velocidade de andar/correr, invulnerabilidade e spawn |
| stamina | Capacidade, consumo, regeneração e percentual para desbloquear corrida |
| pistol | Carregador, reserva inicial, recarga, cadência, dano, crítico, alcance e ruído |
| ammo | Caixas no mapa, balas por caixa e localização da primeira |
| zombie | Vida, dano por contato, velocidades, visão, audição, memória e mudanças de rumo |
| civilian | Vida, velocidades, visão, audição, invulnerabilidade e posições iniciais opcionais |
| panic | Chance, proporção congelar/correr, duração, velocidade, cooldown e etiqueta |
| horde | Adesão, raio de agrupamento, separação, coesão, patrulha e dispersão |
| world | Dimensões, espaçamento dos quarteirões, grade, frequência de navegação e escombros |
| vision | Campo visível, zoom e escurecimento periférico |
| audio | Volumes de trilha/efeitos/master e alcance dos rosnados |
| feedback | Tremor da câmera, rastros de tiro, flash de dano e texto de crítico |

Exemplos de alterações independentes:

```ts
population: { zombies: 20, civilians: 100, zombieSafeRadius: 300 },
// Dentro de panic:
chancePercent: 30,    // 30% por novo encontro
freezePercent: 70,    // entre os episódios, 70% congelam e 30% correm
// Dentro de pistol:
criticalPercent: 2,   // 2% por acerto
// Dentro de horde:
joinPercent: 60,      // maior chance de aderir quando há vizinhos ociosos
```

Amostras acima mostram campos isolados; preserve os demais campos do arquivo.

- Mais vida ou menos dano aumenta os tiros necessários. Crítico permanece letal. A regra de três tiros é o padrão `zombie.health: 3` / `pistol.damage: 1`.
- Civis mortos por contato sempre viram zumbis. Não há reforços automáticos: `population.zombies` só define o início.
- `panic.chancePercent` só é sorteado em um novo encontro; cooldown e intervalo sem ameaça continuam valendo mesmo com 100%.
- `horde.patrolCohesionPercent` deve ficar abaixo de 50 para a atração pelo grupo não cancelar o avanço.
- Ao mudar mapa ou quarteirões, ajuste `player.spawn`, `ammo.firstBox` e `civilian.initialPositions` para posições livres. Use `initialPositions: []` para todos os civis terem spawn aleatório. O minimapa se ajusta às dimensões.
- A grade precisa dividir largura e altura. Configurações inválidas falham com mensagem no console; um raio de segurança impossível também é rejeitado, sem loop infinito.
- Geometria dos sprites, cores e disposição do HUD continuam no código da cena; este arquivo concentra o balanceamento, não um sistema de skins/layout.

Os testes existentes incluem cenários com expectativas do balanceamento padrão e uma verificação isolada com parâmetros alternativos. Ao mudar deliberadamente os padrões, revise expectativas numéricas correspondentes dos testes.

Áudio: `audio.masterPercent`, `audio.musicPercent`, `audio.effectsPercent` (0–100) e `audio.growlRadius`. Os sliders mudam o volume durante a sessão; os defaults ficam no arquivo central. M alterna mute. Fontes da trilha e efeitos em `public/audio/README.md`.

Civis agora têm `civilian.runSpeed`, `civilian.sprintDistance` e `civilian.stamina` independentes. A perseguição padrão dos zumbis é 135 px/s, acima da caminhada dos humanos, mas abaixo da corrida. `panic.runSpeed` só é usado com fôlego. Ajuste essas relações juntas ao balancear.

Passeio dos civis: civilian.roamMinDistance/roamMaxDistance definem a distância preferida dos destinos; roamDestinationSeconds renova destinos; roamArrivalRadius marca chegada; roamPausePercent/Min/Max controlam pausas; roamStuckSeconds define a checagem de falta de progresso. Fuga e pânico sempre têm prioridade.

NPCs: `npc.soldiers` e `npc.medics` fazem parte do total `population.civilians` (não são extras). `npc.interactionRadius`, `socialRadius`, `socialInterval`, `socialTalkPercent` e `alertSeconds` regulam contato/avisos. `healAmount`, `healRange`, `healSeekRange`, `healCooldown`, `medicalCharges` regulam atendimento. `soldierRounds`, `soldierClip`, `soldierShotInterval`, `soldierReloadSeconds`, `soldierRange`, `soldierRetreatRange` e `ammoGift` regulam os soldados. `initialGreetingSeconds` controla a breve espera dos dois contatos iniciais. Interação por F; curativos/munição são limitados.


Iluminação: `lighting.ambient` (0–1), `lampRadius`, `shopRadius`, `minimumSight` (fração do alcance no escuro), `darkSpread` (radianos extras), `darknessOpacity` (0–1), `textureCell` (resolução do mapa de sombras, pixels). Distribuição determinística dos postes em src/lighting.ts, compartilhada com arte/percepção. Visão e audição dos zumbis não usam penalidade luminosa. `audio.effectRadius`, `voiceRadius`, `voiceCooldown`, `helpInterval` controlam a mixagem espacial e repetição de vozes.


Hordas: `population.zombies/mutants` define a entrada inicial; `waves.zombiesPerHorde/mutantsPerHorde` define cada reforço, `reinforcements` quantos reforços (3), `intervalSeconds` intervalo (120 s), `minimumMutants` reposição mínima contínua. `waves.spawn` é o centro único, `spawnRadius` a área local de formação e `spacing` separa corpos (mínimo 18 px). O centro/raio precisam acomodar todos em chão livre; configuração insuficiente falha explicitamente. A primeira entrada usa os mesmos pontos dos reforços, sem sorteio pelo mapa. `population.zombieSafeRadius` não rege mais as hordas fixas.


Interiores/portas: `interiors.everyBlocks` seleciona os prédios largos a cada N quarteirões (2 = 12 acessíveis no mapa padrão). `wallThickness` (4–14 px), `doorwayWidth` (36–150 px), `revealDistance` controla remoção do telhado perto da porta aberta. `doors.health`, `attackDamage`, `mutantDamage`, `attackInterval`, `attackRange`, `interactionRadius` controlam cerco e uso. Portas começam abertas; danos persistem ao abrir/fechar; só o reinício restaura. Não existe reparo ou colocação de barricada nesta entrega.


Comportamento social: `panic.civilianChancePercent` (40%) vale para civis, `panic.chancePercent` (15%) para especialistas. `tactics.civilianGuardRange/Distance`, `squadRange/Spacing`, `escortRange/Distance`, `allyMemory`, `thinkInterval` regulam proteção local e grupos. `shelterChancePercent` é a chance por tentativa espaçada por `shelterPlanInterval`; `shelterSearchRadius`, `shelterDangerRadius`, `shelterEntryTimeout`, `shelterHoldSeconds` regulam abrigo. Visão/iluminação ainda limitam percepção de aliados e entradas.


Ritmo atual: player.walkSpeed/runSpeed = 78/132, civilian.speedMin/Max = 64/75 e runSpeed = 128; zombie.chaseSpeed/wanderSpeed = 100/80, horde.patrolSpeed = 90, mutant.speed = 170, panic.runSpeed = 142. zombie.contactDamage = 40 vale para jogador/NPC; doors.attackDamage/mutantDamage = 18/36. world.mazeDistrictsEnabled liga duas obras labirínticas; regiões/segmentos compartilhados em world.ts.


Corpo a corpo não militar: melee.civilianDamage = 0,5, civilianCooldown = 1,6 s, civilianKnockbackSpeed = 80 px/s e civilianKnockbackSeconds = 0,14. Vale para civis/médicos. Pânico dos civis comuns: panic.civilianChancePercent = 60% por encontro, com cooldown.


Gore: `gore.enabled`, `particlesPerHit`, `maxParticles`, `maxStains`, `maxCorpses`, `maxRemains`, `gravity`, `groundRefreshSeconds`. Manchas/restos são cosméticos e persistentes com descarte dos mais antigos ao atingir o limite; reinício limpa tudo. Configuração padrão: 14 gotas por impacto, máximo 220 em voo, 420 manchas, 64 torsos e 100 partes; chão atualizado a cada 0,1 s.


Esquadrões/evacuação: `tactics.squadMaxMembers` limita cada grupo a 1–5 (padrão 5); `npc.soldiers` continua 2 inicialmente. `escortCivilianLimit` (6) é o máximo de não militares por missão, `evacuationTimeout` (45 s) limita espera, `evacuationCooldown` (35 s) impede reatribuição contínua e `coverHoldSeconds` (12 s) mantém cobertura após fechar. `shelterHoldSeconds` (25 s) continua governando os civis abrigados. Todos os escoltados vivos precisam estar dentro e além da soleira; a porta também precisa estar livre fisicamente.


Resgates recorrentes (substitui guarda parada e saída temporizada dos resgatados): coverHoldSeconds removido. `shelterCapacity` (12) limita residentes/reservas; `rescueSearchSeconds` (8 s) força saída em patrulha antes de outra missão; `rescueSearchMinDistance` (300 px) e `rescueSearchLifetime` (18 s) regulam exploração externa. `medicFollowDistance` (60 px) regula médicos acompanhando tropa. `shelterHoldSeconds` continua apenas para medo temporário de quem se refugiou sozinho; civis entregues não saem pelo relógio. Médicos não contam como residentes de evacuação.


Abrigos agora usam `tactics.shelterCapacity = 7`, contando civis presentes e reservas/plans a caminho. `playerFollowDistance` (55 px), `playerFollowSight` (420 px, sujeito à luz/paredes), `playerFollowMemory` (6 s) e `playerFollowSprintDistance` (120 px) governam ordens de seguir. F/clique abre Siga-me/Pare de me seguir para qualquer papel.


População e grupos: `npc.spawnColumns/spawnRows` dividem o mapa em 4×4 setores para distribuir os 80 humanos; `npc.spawnSeparation` exige 90 px entre posições iniciais. `civilian.initialPositions` está vazio, mas pode fornecer posições fixas antes do sorteio. `tactics.squadMaxMembers=3`, `escortCivilianLimit=5` e `medicsPerGroup=1` limitam grupos autônomos e seguidores do jogador. Vagas de comboios contam no limite de civis acompanhantes. Abrigos continuam com sete vagas.


Objetivo: três ondas por padrão (início, 120 s, 240 s), eliminar todos os infectados e manter ao menos um civil comum vivo. A reposição mínima de evoluídos termina quando entra a última onda. Morte do jogador ou perda do último civil encerra a partida. `lighting.influencePercent` (0–100) regula as penalidades humanas de visão/dispersão no escuro; zero mantém iluminação visual e colisão/oclusão, mas remove as penalidades. O formulário permite reduzir o total de ondas para testes rápidos.
