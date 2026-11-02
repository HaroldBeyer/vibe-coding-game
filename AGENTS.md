# Instruções para agentes

Leia `docs/PROJECT_CONTEXT.md` antes de propor ou implementar mudanças.

- Converse em português brasileiro. O usuário é engenheiro de software desde 2019; discuta decisões técnicas sem tutoriais básicos.
- O usuário atua como diretor do jogo. Você implementa e valida; ele decide direção criativa, experiência e escopo. Faça perguntas quando essas escolhas estiverem abertas, sem perguntar sobre cada detalhe técnico rotineiro.
- Preserve decisões já aprovadas. Não amplie o escopo nem substitua a stack sem alinhamento. Prefira arquitetura enxuta e entregas pequenas, jogáveis e revisáveis.
- Use o checkout existente. Em tarefas cloud ele já é isolado; não crie worktree sem pedido explícito.
- Stack: Phaser 3 + TypeScript + Vite. Consulte package.json e o lockfile para versões e comandos. Instale com npm ci.
- Valide mudanças de código com npm test e npm run build. Para mudanças de gameplay, teste também no navegador quando houver essa capacidade. Informe claramente quando o comportamento visual/interativo não foi verificado.
- Não confunda recursos planejados com implementados. Não declare o jogo publicado: push no GitHub não é deploy.
- Atualize o contexto quando novas decisões de produto forem aprovadas. Não inclua dados pessoais ou credenciais desnecessários na documentação.
