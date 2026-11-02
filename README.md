# Dead District

Protótipo de sobrevivência para browser em Phaser 3 + TypeScript + Vite.

Requer Node.js 22.12+ (validado com 24). Instale com `npm ci`, execute `npm run dev`. `npm run build` verifica tipos e gera `dist/`; `npm test` valida movimento e stamina.

WASD/setas: andar. Shift: correr. P: pausar. R: reiniciar. Corrida consome stamina; ao esgotar, precisa recuperar 30% para voltar. Contato causa 20 de dano com 1,1 segundo de proteção. Zumbis lentos aparecem aos poucos, até 30. A cidade tem prédios sólidos; zumbis seguem diretamente e podem ficar bloqueados nos prédios nesta versão (sem navegação por caminhos).

Primeira entrega: formas provisórias, movimento, perseguição, dano e reinício. Armas, ondas estruturadas, barricadas, pixel art e áudio black metal ficam para próximas entregas. Desktop com teclado.
