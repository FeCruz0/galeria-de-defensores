# 📝 Tasks - Distribuição de Pontos e Ficha Limitada

## Fase 1: Testes Automatizados (TDD)
- [ ] Criar testes unitários em `src/__tests__/game.test.ts` para as novas regras de distribuição e saldo de pontos.

## Fase 2: Implementação
- [ ] Inicializar `saved_points` com o valor de `points_total` na criação do personagem em `src/app/characters/new/page.tsx`.
- [ ] Implementar `handlePointsTotalChange` na ficha de personagem (`src/app/characters/[id]/page.tsx`).
- [ ] Adicionar botões de incremento/decremento para `points_total` na interface da ficha.
- [ ] Integrar consumo/retorno de `saved_points` no manipulador de atributos `handleAttributeChange`.
- [ ] Validar saldo de `saved_points` e deduzir/devolver pontos ao adicionar, editar e remover vantagens, desvantagens, perícias, especializações e vantagens únicas.

## Fase 3: Validação
- [ ] Rodar suíte de testes (`npx vitest run`) e garantir aprovação.
- [ ] Validar compilação (`npm run build`).
