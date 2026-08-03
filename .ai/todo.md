# 📝 Tasks - Galeria de Defensores

## ✅ Concluído: Fase 10, Item 3 - Endurecimento do Banco de Dados (Constraints & Triggers)
- [x] Adicionar restrições `CHECK` nativas em `characters` (`points_total`, `points_spent`, `experience`, `saved_points`, `scale`) em `supabase/schema.sql`.
- [x] Adicionar restrições `CHECK` em `profiles` (`username` min length).
- [x] Criar função PL/pgSQL `handle_updated_at()` e triggers `BEFORE UPDATE` em `profiles` e `characters`.
- [x] Realizar auditoria de políticas RLS em `rule_systems`, `characters` e `tables`.
- [x] Executar suíte de testes (`npx vitest run`) e build de produção (`npm run build`).

## ✅ Concluído: Fase 10, Item 2 - Validação Server-Side & Anti-Cheat (Server Actions)
- [x] Criar esquemas `Zod` de validação em `src/lib/validations/actions.ts`.
- [x] Criar `src/actions/gameActions.ts` com Next.js Server Actions.
- [x] Implementar validação server-side do orçamento de pontos usando `rules.ts`.
- [x] Implementar auditoria server-side de rolagens de dados.
- [x] Criar testes unitários para Server Actions (`src/actions/__tests__/actions.test.ts`).
- [x] Executar suíte de testes e build de produção.

## ✅ Concluído: Fase 10, Item 1 - Abstração da Camada de Serviços (Service Layer)
- [x] Criar `src/services/characterService.ts`.
- [x] Criar `src/services/tableService.ts`.
- [x] Criar `src/services/systemService.ts`.
- [x] Criar testes unitários para a camada de serviços (`src/services/__tests__/services.test.ts`).
- [x] Executar suíte de testes e build de produção.
