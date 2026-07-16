# 📝 Tasks - Restrição de Sistema de Regras em Mesas de Jogo

## Fase 1: Atualizações Estruturais
- [x] Adicionar `rule_system_id` à tabela `tables` no arquivo `supabase/schema.sql`.
- [x] Adicionar a propriedade `rule_system_id` e `rule_systems` à interface `Table` em `src/types/game.ts`.

## Fase 2: Implementação
- [x] Implementar seleção de sistema de regras e inserção na criação de mesas em `src/app/tables/new/page.tsx`.
- [x] Modificar o carregamento da mesa para obter o relacionamento `rule_systems(name)` em `src/app/tables/[id]/page.tsx`.
- [x] Exibir o nome do sistema de regras no cabeçalho de `src/app/tables/[id]/page.tsx`.
- [x] Validar compatibilidade do `rule_system_id` do personagem antes de permitir o vínculo em `handleLinkCharacter`.

## Fase 3: Validação
- [x] Rodar testes unitários (`npx vitest run`).
- [x] Executar o build de produção (`npm run build`).
