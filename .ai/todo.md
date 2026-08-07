# 📝 Tasks - Galeria de Defensores

## ✅ Concluído: Fase 11, Item 2 - Espectadores e Visibilidade de Mesas
- [x] Schema do Supabase com colunas `max_players`, `allow_spectators` e `role` (`table_players`) e políticas RLS ajustadas.
- [x] Abstração da Camada de Serviços em `src/services/tableService.ts` (`fetchAllPublicTables`, `fetchTableMembers`, `joinTable`, `updateMemberRole`, `kickTableMember`).
- [x] Validação Server-Side Zod em `src/lib/validations/table.ts` e Server Actions em `src/actions/tableActions.ts`.
- [x] Formulário de criação de mesa atualizado (`src/app/tables/new/page.tsx`).
- [x] Dashboard com explorador de mesas públicas e sub-abas `Mesas de Jogo` / `Explorar Mesas Públicas` (`src/app/dashboard/page.tsx`).
- [x] VTT com Modo Espectador Passivo, Presença em Tempo Real (Supabase Presence) e gaveta/modais do Mestre para alteração de cargo e configurações (`src/app/tables/[id]/page.tsx`).
- [x] Suíte de testes unitários `tableService.test.ts` (52 testes aprovados).

## ✅ Concluído: Fase 11, Item 1 - Lobby Geral & Lista de Amigos (DMs)
- [x] Tabelas `friendships` e `direct_messages` com RLS em `supabase/schema.sql`.
- [x] Camada de Serviço `src/services/socialService.ts`.
- [x] Validação Zod & Server Actions em `src/actions/socialActions.ts`.
- [x] Componentes de UI `LobbyChat.tsx` (Broadcast) e `FriendsDrawer.tsx` (DMs).
- [x] Suíte de testes unitários `social.test.ts` (49 testes aprovados).

## ✅ Concluído: Fase 10 - Maturação de Arquitetura & Segurança Enterprise
- [x] Item 1: Abstração da Camada de Serviços (`src/services/`).
- [x] Item 2: Validação Server-Side & Anti-Cheat (`src/actions/`).
- [x] Item 3: Endurecimento do Banco de Dados (`supabase/schema.sql`).
