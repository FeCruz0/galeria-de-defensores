# 📝 Tasks - Galeria de Defensores

## ✅ Concluído: Fase 10, Item 1 - Abstração da Camada de Serviços (Service Layer)
- [x] Criar `src/services/characterService.ts` (CRUD de fichas e busca por ID/usuário).
- [x] Criar `src/services/tableService.ts` (Gerenciamento de mesas VTT, participantes e distribuição de XP).
- [x] Criar `src/services/systemService.ts` (Busca e customização de sistemas de regras no Sandbox).
- [x] Criar testes unitários para a camada de serviços (`src/services/__tests__/services.test.ts`).
- [x] Executar suíte de testes (`npx vitest run`) e build de produção (`npm run build`).

## ✅ Concluído: Ajuste de Rotação Suave de Pouso (Slow Landing Rotation)
- [x] Ajustar limiar de início da fase de pouso (`currentSpeed < 6.5`) em `DiceRollOverlay.tsx`.
- [x] Reduzir o fator de interpolação `lerpAngle` para `0.035`.
- [x] Ajustar amortecimento angular de spin (`newDhRx *= 0.90`).
- [x] Validar com testes unitários e build.
