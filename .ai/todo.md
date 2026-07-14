# 📝 Tasks - Barra de Atalhos Rápidos de Rolagem (Quick Actions Bar)

## Fase 1: Testes Automatizados (TDD)
- [ ] Adicionar testes unitários em `src/__tests__/game.test.ts` para testar os modificadores das ações rápidas (Ataque: F+H, Defesa: A+H, Esquiva/Iniciativa: H).

## Fase 2: Implementação
- [ ] Criar estado `profileName` e carregar o perfil do usuário em `src/app/characters/[id]/page.tsx`.
- [ ] Implementar a função `handleQuickRoll` em `src/app/characters/[id]/page.tsx`.
- [ ] Criar a interface visual da barra de atalhos rápidos flutuante no final da página da ficha.
- [ ] Integrar a publicação das rolagens no chat da mesa via `chat_messages` caso o personagem esteja vinculado a uma mesa ativa.

## Fase 3: Validação
- [ ] Executar suíte de testes (`npx vitest run`) e garantir aprovação.
- [ ] Rodar build de produção (`npm run build`).
