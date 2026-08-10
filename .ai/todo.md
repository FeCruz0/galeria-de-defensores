## ✅ Concluído: Fase 11, Item 6 - Menu de Edição de Perfil & Dados Pessoais
- [x] Migração SQL `20260810000000_profile_details_and_location.sql` estendendo a tabela `profiles` e registrando o bucket de armazenamento `avatars`.
- [x] Atualizada interface `Profile` no arquivo `types/game.ts`.
- [x] Validações do formulário via Zod no arquivo `lib/validations/profile.ts`.
- [x] Camada de serviços (`profileService.ts`) e Server Actions (`profileActions.ts`) implementadas.
- [x] Modal de edição de perfil `ProfileEditModal.tsx` com envio de foto e auto-complete de endereço via ViaCEP.
- [x] Integração e atalho clicável no cabeçalho do Dashboard em `dashboard/page.tsx`.
- [x] Suíte de testes unitários `profileService.test.ts` (62/62 testes aprovados no projeto).

## ✅ Concluído: Fase 11, Item 5 - Aprimoramento da Exportação de PDF & Editor de Sistemas
- [x] Regras de mídia `@media print` no `globals.css` com tamanho A4, margens exatas e prevenção de quebra interna.
- [x] Cabeçalho e diagramação de alto contraste para a ficha imprimível em `src/app/characters/[id]/page.tsx`.
- [x] Refatoração do `SystemEditorModal.tsx` para eliminação de acessos DOM direct (`document.getElementById`) usando estados reativos `useState`.
- [x] Card de Live Preview em tempo real de atributos e recursos no Sandbox.
- [x] Assistente visual interativo de fórmulas para recursos com validação instantânea (`validateFormula`).
- [x] Suíte de testes (56/56 aprovados) e build do Next.js verificado.

## ✅ Concluído: Fase 11, Item 4 - PWA (Progressive Web App) & Suporte a Acesso Offline
- [x] Gerador dinâmico de manifesto PWA `src/app/manifest.ts` e ícones `icon-192x192.png` / `icon-512x512.png` em `public/`.
- [x] Service Worker nativo `public/sw.js` com estratégia *Stale-While-Revalidate* e pre-caching.
- [x] Componente de registro client-side `<ServiceWorkerRegister />` em `src/app/layout.tsx`.
- [x] Módulo IndexedDB `src/lib/offlineDb.ts` com stores `characters` e `sync_queue`.
- [x] Fallback de carregamento, autosave híbrido e engine de auto-sincronização no `page.tsx` da ficha.
- [x] Indicadores visuais de conectividade offline e status de sincronização.
- [x] Suíte de testes unitários `offlineDb.test.ts` (56/56 testes aprovados no projeto).

## ✅ Concluído: Fase 11, Item 3 - Mini-Ficha Resumida do Mestre (Quick NPC Tracker)
- [x] Tabela `table_npcs` no Supabase com RLS exclusivo para o Mestre.
- [x] Interface `TableNPC` em `src/types/game.ts` e validações Zod em `src/lib/validations/npc.ts`.
- [x] Camada de serviço `src/services/npcService.ts` e Server Actions em `src/actions/npcActions.ts`.
- [x] Componente UI `NpcTrackerDrawer.tsx` com ajuste rápido de recursos (`-1`, `+1`, `-5`, `+5`), rolagens 3D atalhos (**Ataque Físico**, **Distância**, **Defesa**, **Esquiva**) e envio automático ao chat narrativo da mesa.
- [x] Integração de escuta Realtime e botão no cabeçalho em `src/app/tables/[id]/page.tsx`.
- [x] Suíte de testes unitários em `src/services/__tests__/npcService.test.ts`.

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
