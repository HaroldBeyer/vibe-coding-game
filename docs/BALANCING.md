# Balanceamento

Edite **src/config.ts**. É o ponto central dos parâmetros de gameplay; os valores atuais preservam a versão aprovada.

Porcentagens usam **0–100**: `15` significa 15%, `0` desativa a chance, `100` garante o sorteio quando as demais condições são atendidas. Tempo em segundos, distância em pixels, velocidade em pixels/segundo. Valores `Min`/`Max` definem um intervalo aleatório.

Com `npm run dev`, salve o arquivo e o Vite recarrega a partida. Em produção, execute novo build e publique `dist/`. Não há editor dentro do jogo nem persistência de configurações do navegador.

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
