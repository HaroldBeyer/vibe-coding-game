# Personagens — primeira passagem de arte

characters-atlas.png: atlas 1536 × 1024 com transparência, gerado com a ferramenta integrada ImageGen para este projeto. Prompt completo em characters-atlas.prompt.txt.

Grade 3 × 2, todos orientados para a direita e vistos de cima:
- Linha 1: jogador, civil azul, civil bordô.
- Linha 2: zumbi oliva, zumbi de terno, civil amarelo.

src/art.ts extrai cada célula para uma textura de 52 × 52 durante o carregamento, sem suavização. A cena exibe personagens em 38 × 38 mantendo o raio físico de 9 px. O PNG original e seu canal alfa permanecem intactos. São poses únicas nesta entrega, ainda sem animações de caminhada.

Não foi usado um pacote comercial nem arte de outro jogo. Os elementos urbanos são desenhados proceduralmente no Phaser em src/art.ts.

npc-roles-atlas.png: segundo atlas gerado com ImageGen integrado para este projeto, com dois soldados e dois médicos. Prompt em npc-roles-atlas.prompt.txt. Grade 2 × 2, orientação para a direita; linha superior soldados, inferior médicos. Integrado com transparência preservada e o mesmo raio físico dos civis. Símbolo médico em verde/azulado.
