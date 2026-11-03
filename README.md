# Dead District

Protótipo de sobrevivência para browser: Phaser 3 + TypeScript + Vite.

Node.js 22.12+ (validado também com 26). `npm ci`, depois `npm run dev`.
`npm test` valida movimento, stamina, visibilidade, disparos, recarga, infecção e navegação; `npm run build` verifica tipos e gera `dist/`.

## Partida e configurações

O menu inicial oferece **Iniciar jogo** e **Configurações**, com mais de 50 parâmetros de combate, população, IA, movimento, luz e portas. Valores ficam salvos neste navegador; **Restaurar padrões** seguido de **Salvar configurações** recupera o balanceamento original. Durante a partida, **Menu inicial** encerra a sessão e retorna à tela inicial.

Vença eliminando todos os infectados após a última onda, com ao menos um dos 67 civis comuns vivo. Os nove soldados e quatro médicos são apoio. Se o jogador morrer ou o último civil morrer/for infectado, a partida termina. Enter inicia uma nova tentativa.

## Controles

- WASD / setas: andar; Shift: correr com stamina.
- Mouse: mirar; clique esquerdo: um tiro (pistola semiautomática).
- R ou E: recarregar em 1,15 s. Carregador de 7; reserva inicial zero.
- Passe pelas caixas amarelas para recolher 7 balas de reserva.
- P: pausar; Enter: reiniciar a partida inteira.

## Versão de desenvolvimento

Cidade de 2400 × 1800, quarteirões e vielas; câmera próxima e visibilidade curta.
Minimapa: preto é desconhecido, cinza escuro é explorado, claro é visão atual.
Inimigos e civis só aparecem quando estão visíveis; paredes ocultam atores e bloqueiam tiros.
Só a mira do jogo aparece sobre o canvas; fora dele, o cursor normal retorna.

A partida começa com **30 zumbis, 1 evoluído e 80 NPCs humanos**. Os infectados entram por um ponto fixo a oeste; reforços de 30 comuns + 1 evoluído chegam aos 2 e 4 minutos (três ondas no total). Antes da última onda, se todos os evoluídos morrerem, outro entra pelo mesmo ponto. Infecções também aumentam a população.
Civis azuis fogem de ameaças e têm velocidades diferentes; podem ser alcançados ou encurralados.
Têm 100 de vida, perdem 40 por ataque (proteção de 1,1 s) e se transformam em zumbis ao morrer.
A transformação acontece no local da morte, uma vez por civil. Um novo zumbi também pode infectar outros.
O HUD mostra a população viva, abates e infecções. Não há fogo amigo.

Zumbis têm uma barra de vida: **3 tiros normais** para matar ou **1 crítico (5% por acerto)**.
Disparos param no primeiro zumbi ou parede. Recarga bloqueia disparos e usa somente a munição necessária.
Pausa congela a recarga; pressionar R/E novamente não reinicia seu progresso.

Quando não perseguem nem investigam alvos, os zumbis vagam a 110 px/s e mudam de rumo a cada 2–5 s.
Em 45% das decisões com vizinhos visíveis num raio de 220 px, combinam a direção aleatória com uma atração leve pelo grupo. Mantêm distância curta entre corpos; ainda podem se separar e vagar sozinhos.
Quando entram em horda, compartilham um destino de patrulha e avançam a 120 px/s. Buscam outra área ao chegar ou depois de 18 s; grupos podem se dispersar após 28–44 s. Só perseguem sobreviventes detectados por visão/audição.

Civis podem entrar em pânico ao ver um zumbi a até 230 px ou ouvi-lo a até 55 px.
Chance de 15% por novo encontro (ao menos 2 s sem detectar ameaça), sem sorteios por frame.
O pânico dura 2–3,5 s parado ou 1,5–3 s correndo a 190 px/s enquanto há stamina numa direção aleatória, com intervalo mínimo de 14 s entre episódios. Depois retomam a fuga normal. Tom âmbar e o texto PÂNICO acima do civil identificam o efeito.

Zumbis perseguem a 135 px/s; visão de 145 px com oclusão e memória de 3 s.
Audição de passos 42, corrida 105, civis andando 55 e tiros 340 px; sons atravessam paredes.
Ao perder um alvo, investigam sua última posição. Navegação por grade contorna prédios.

Primeira passagem de pixel art e cenário urbano; detalhes abaixo. Sem ondas estruturadas, barricadas ou deploy público.
Navegação e fuga são simples; aglomerações ainda podem bloquear passagens.

## Configuração

Edite src/config.ts para alterar o balanceamento. Porcentagens de 0 a 100; tempos em segundos e distâncias em pixels. Veja [guia de balanceamento](docs/BALANCING.md) para os grupos, exemplos e restrições.

## Arte atual

Primeira passagem visual em uma cidade alemã fictícia: lojas, calçadas, telhados, trilhos de bonde, postes e iluminação. Sprites de jogador, três civis e dois zumbis em public/assets/characters-atlas.png; procedência e prompt acompanham o asset. Cenário procedural em src/art.ts. As poses ainda não têm animações de caminhada; esta é uma passagem revisável de arte, não a direção final aprovada.

## Movimento e áudio

Zumbis perseguem a 135 px/s: mais rápidos que o jogador andando (105) e civis andando (85–100).
Jogador corre a 175; civis usam stamina própria para correr a 170 em ameaça próxima, ou 190 na corrida de pânico. Sem fôlego, voltam a andar.

Áudio começa após interação no jogo ou no botão **ATIVAR ÁUDIO**. **M** silencia; os controles sob o jogo ajustam trilha e efeitos separadamente. P pausa também a música. Loop instrumental original sintetizado inspirado em black metal; detalhes e fonte em [public/audio/README.md](public/audio/README.md).

Civis também circulam sozinhos sem ameaça, escolhem destinos e navegam pelas vielas; fuga e pânico interrompem o passeio. Ajustes em civilian.roam* no arquivo de configuração.

## NPCs e interações

Cidade alemã genérica restaurada; mapas específicos cancelados.
**F** conversa/interage com alguém próximo. Entre os 80 humanos há 2 soldados, 4 médicos e 74 civis comuns por padrão.
Soldados enfrentam zumbis e podem dividir munição uma vez; médicos atendem você e outros NPCs, com curativos/cooldown limitados. Civis conversam e compartilham avisos locais de perigo. Papéis não impedem pânico, fuga ou transformação em zumbi.
Parâmetros em `config.npc`; sprites de papéis e prompt em public/assets/npc-roles-atlas.*.


## Interiores e portas
Há 12 prédios acessíveis: lojas, bares e clínicas. O bar a sudeste do início tem entrada na face norte; aproxime-se da abertura e entre para remover o telhado. Móveis e paredes são sólidos.
**F ou clique na porta próxima** abre/fecha. Portas fechadas bloqueiam corpos, visão e tiros; não podem fechar sobre personagens. Infectados batem até destruir, e evoluídos causam mais dano. Não há reparo: uma porta destruída permanece aberta até reiniciar. Vida e controles aparecem junto à porta. Ajustes em `config.interiors` e `config.doors`.


## Sangue e gore
Tiros/mordidas/corpo a corpo geram respingos; mortes deixam poças e restos em pixel art, com desmembramento nas mortes humanas e críticos de infectados. Partículas respeitam paredes e portas; efeitos no chão ficam até reiniciar, dentro de limites de quantidade. `config.gore` controla habilitação e limites de partículas/manchas/corpos/restos. Tudo é cosmético.


Soldados formam grupos locais de até cinco e tentam evacuar pequenos grupos de civis para prédios seguros. Guiam a aproximação, cobrem a entrada e aguardam os sobreviventes passarem antes de fechar a porta. A quantidade inicial permanece configurada em dois soldados; o limite de esquadrão é independente dela. Parâmetros em `config.tactics`.


Depois de fechar uma entrega, os soldados partem para procurar outros civis e lembram a base para novos comboios. Resgatados permanecem dentro com a porta fechada; abrigo cheio ou comprometido exige outro local. Médicos acompanham a patrulha quando conseguem, priorizando atendimento e segurança. Capacidade e busca são configuráveis em `config.tactics`.


Abrigos recebem até **7 civis planejados**, contando quem já está dentro e vagas reservadas para quem está chegando; os próximos grupos procuram outro prédio quando ele enche. Na interação com qualquer NPC, use **Siga-me / Pare de me seguir** para dar ou cancelar a ordem. O acompanhante corre com stamina se ficar para trás; pânico pode interromper a obediência e, ao perder contato, ele aguarda reencontrar você.
