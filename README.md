# Dead District

Protótipo de sobrevivência para browser: Phaser 3 + TypeScript + Vite.

Node.js 22.12+ (validado também com 26). `npm ci`, depois `npm run dev`.
`npm test` valida movimento, stamina, visibilidade, disparos, recarga, infecção e navegação; `npm run build` verifica tipos e gera `dist/`.

## Controles

- WASD / setas: andar; Shift: correr com stamina.
- Mouse: mirar; clique esquerdo: um tiro (pistola semiautomática).
- R ou E: recarregar em 1,15 s. Carregador de 7; reserva inicial zero.
- Passe pelas caixas amarelas para recolher 7 balas de reserva.
- P: pausar; Enter: reiniciar a partida inteira.

## Protótipo 05

Cidade de 2400 × 1800, quarteirões e vielas; câmera próxima e visibilidade curta.
Minimapa: preto é desconhecido, cinza escuro é explorado, claro é visão atual.
Inimigos e civis só aparecem quando estão visíveis; paredes ocultam atores e bloqueiam tiros.
Só a mira do jogo aparece sobre o canvas; fora dele, o cursor normal retorna.

A partida começa com **10 zumbis e 80 civis**. Todos os zumbis iniciais têm posições sorteadas em ruas livres, fora de 300 px do jogador. Não há reforços automáticos.
Civis azuis fogem de ameaças e têm velocidades diferentes; podem ser alcançados ou encurralados.
Têm 100 de vida, perdem 20 por ataque (proteção de 1,1 s) e se transformam em zumbis ao morrer.
A transformação acontece no local da morte, uma vez por civil. Um novo zumbi também pode infectar outros.
O HUD mostra a população viva, abates e infecções. Não há fogo amigo.

Zumbis têm uma barra de vida: **3 tiros normais** para matar ou **1 crítico (5% por acerto)**.
Disparos param no primeiro zumbi ou parede. Recarga bloqueia disparos e usa somente a munição necessária.
Pausa congela a recarga; pressionar R/E novamente não reinicia seu progresso.

Quando não perseguem nem investigam alvos, os zumbis vagam a 12 px/s e mudam de rumo a cada 2–5 s.
Em 45% das decisões com vizinhos visíveis num raio de 220 px, combinam a direção aleatória com uma atração leve pelo grupo. Mantêm distância curta entre corpos; ainda podem se separar e vagar sozinhos.
Quando entram em horda, compartilham um destino de patrulha e avançam a 23 px/s. Buscam outra área ao chegar ou depois de 18 s; grupos podem se dispersar após 28–44 s. Só perseguem sobreviventes detectados por visão/audição.

Civis podem entrar em pânico ao ver um zumbi a até 230 px ou ouvi-lo a até 55 px.
Chance de 15% por novo encontro (ao menos 2 s sem detectar ameaça), sem sorteios por frame.
O pânico dura 2–3,5 s parado ou 1,5–3 s correndo a 90 px/s numa direção aleatória, com intervalo mínimo de 14 s entre episódios. Depois retomam a fuga normal. Tom âmbar e o texto PÂNICO acima do civil identificam o efeito.

Zumbis perseguem a 29 px/s; visão de 145 px com oclusão e memória de 3 s.
Audição de passos 42, corrida 105, civis andando 55 e tiros 340 px; sons atravessam paredes.
Ao perder um alvo, investigam sua última posição. Navegação por grade contorna prédios.

Arte continua provisória. Sem ondas estruturadas, barricadas, áudio ou deploy público.
Navegação e fuga são simples; aglomerações ainda podem bloquear passagens.

## Configuração

Edite src/config.ts para alterar o balanceamento. Porcentagens de 0 a 100; tempos em segundos e distâncias em pixels. Veja [guia de balanceamento](docs/BALANCING.md) para os grupos, exemplos e restrições.
