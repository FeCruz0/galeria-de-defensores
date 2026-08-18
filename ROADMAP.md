# 🗺️ Roadmap de Atualizações - Galeria de Defensores

Este documento reúne e organiza as próximas atualizações e novas funcionalidades planejadas para o projeto, priorizadas por grau de dificuldade de implementação (da mais fácil/rápida para a mais complexa).

---

## 🛡️ Medidas de Segurança para Teste Alfa (Prioridade Máxima)

### 🔑 1. Autenticação e Registro Seguro (`/register`)
* **Descrição**: Prevenção de falhas no registro, cadastros inválidos e vazamento de exceções.
* **Checklist**:
  - [x] Implementar validação estrita no formulário de registro (`/register`) com Zod exigindo de 3 a 30 caracteres alfanuméricos (`/^[a-zA-Z0-9_\-]+$/`) no nome de usuário, evitando falhas na trigger do banco (`check_username_min_length`).
  - [x] Adicionar pré-checagem de disponibilidade do nome de usuário antes de invocar `supabase.auth.signUp()`.
  - [x] Traduzir todas as exceções de autenticação do Supabase para mensagens amigáveis em português sem expor detalhes internos da infraestrutura.

### 🔒 2. Defesa em Profundidade nas Server Actions (Server-Side Auth Enforcement)
* **Descrição**: Garantia de autorização estrita no servidor sem confiar em IDs de usuários passados pelo payload do cliente.
* **Checklist**:
  - [x] Substituir o recebimento de `userId`, `senderId` ou `currentUserId` via payload do cliente pela extração direta e segura no servidor via `const { data: { user } } = await supabase.auth.getUser()` em todas as Server Actions (`socialActions.ts`, `tableActions.ts`, `profileActions.ts`, `gameActions.ts`).
  - [x] Rejeitar a execução imediatamente no servidor caso o usuário autenticado na sessão não seja válido ou não seja o proprietário do recurso mutado.

### ⚡ 3. Proteção Anti-Abuso & Cooldown no Chat (Realtime & Payloads)
* **Descrição**: Evitar estouro de cotas, spam e consumo excessivo no banco de dados e nos canais do Supabase Realtime durante os testes alfa.
* **Checklist**:
  - [x] Adicionar trava de cooldown (*throttle*) de 500ms a 1s no envio de mensagens de chat e rolagens para evitar sobrecarga no Supabase Realtime.
  - [x] Aplicar limites rígidos de tamanho (`maxLength`) em todas as áreas de entrada de texto (mensagens de chat, notas de diário de campanha e biografia).

### 🗄️ 4. Endurecimento do Supabase Storage & Políticas RLS
* **Descrição**: Isolamento total de arquivos de upload e reforço de auditoria no banco relacional.
* **Checklist**:
  - [x] Garantir que as políticas RLS do bucket `avatars` restrinjam o upload para que o usuário só consiga salvar/substituir arquivos dentro do seu próprio subdiretório (`auth.uid()::text = (storage.foldername(name))[1]`).
  - [x] Ajustar a política RLS da tabela `audit_logs` trocando `WITH CHECK (true)` por `WITH CHECK (auth.uid() = user_id)`.
  - [x] Caso a tabela `tables` utilize senhas para proteger acesso a mesas privadas, armazenar o hash ou validar via função RPC isolada sem expor a coluna `password` em queries `SELECT`.

---

## 🚦 Regras & Restrições de Ficha (Alta Prioridade)

### 📊 Limitação de Distribuição por Pontos Disponíveis
* **Regra**: A ficha do personagem deve respeitar estritamente a pontuação total do personagem (`points_total`). O jogador deve primeiro definir os pontos totais da ficha (ou ganhar pontos de experiência convertidos) para então poder aumentar atributos ou comprar vantagens.
* **Checklist**:
  - [x] Adicionar um validador visual na tela de criação e edição que exiba claramente o saldo de pontos (`Pontos Disponíveis = Pontos Totais - Pontos Gastos`).
  - [x] Bloquear o botão de aumento de atributos (`+`) e adição de novas vantagens/perícias caso o saldo de pontos seja zero ou negativo.
  - [x] Exibir mensagem de aviso em toast ou modal informando que o saldo de pontos é insuficiente para realizar a ação.
  - [x] Substituir todas as chamadas nativas de `alert()`, `confirm()` por um componente de modal customizado (`SystemModal.tsx`) integrado ao design da aplicação.
  - [x] Adicionar verificação de limite também nas funções de backend/API de atualização para garantir consistência.

---

## 🎯 Próximas Atualizações (Ordenadas por Dificuldade)

### ⚡ 1. Atalhos Rápidos de Rolagem (Quick Actions Bar) — Easiest
* **Descrição**: Uma barra de atalhos flutuante no topo ou lateral da ficha do personagem para rolagens de dados frequentes com um único clique.
* **Checklist**:
  - [x] Implementar um componente de barra horizontal flutuante na ficha (`[id]/page.tsx`).
  - [x] Adicionar botões pré-configurados para rolagens base: **Ataque Padrão** (`1d6 + F + H`), **Defesa Padrão** (`1d6 + A + H`), **Esquiva** (`1d6 + H`) e **Iniciativa** (`1d6 + H`).
  - [x] Vincular as rolagens ao rolo 3D dinâmico da tela e à publicação no chat da mesa ativa.

### 🎁 2. Distribuição de Experiência (PEs) — Easy
* **Descrição**: Painel exclusivo do Mestre na mesa de jogo para distribuir Pontos de Experiência (PEs) para um ou mais jogadores de forma simultânea.
* **Checklist**:
  - [x] Criar modal de controle do Mestre na tela da mesa (`tables/[id]/page.tsx`).
  - [x] Permitir selecionar múltiplos personagens ativos na mesa através de checkboxes.
  - [x] Adicionar campo de entrada numérica para a quantidade de PEs a serem distribuídos.
  - [x] Implementar trigger de notificação em tempo real para os jogadores informando: *"Você recebeu X PEs do Mestre!"*.

### 📔 3. Diário de Campanha Compartilhado — Medium
* **Descrição**: Um espaço dinâmico de anotações na mesa para documentar a história, pistas, NPCs e registrar notas públicas e confidenciais.
* **Checklist**:
  - [x] Criar aba de "Diário de Campanha" ao lado do Chat na tela da mesa.
  - [x] Seção **Diário do Mestre (Público)**: Editável apenas pelo mestre, visível para todos os jogadores em tempo real.
  - [x] Seção **Notas Pessoais (Privado)**: Editável e visível apenas para o jogador logado (salvo localmente ou associado ao personagem).
  - [x] Sincronização em tempo real das alterações públicas via canal Supabase.

### 🩺 4. Marcadores de Status & Efeitos Temporários — Medium
* **Descrição**: Sistema de seleção de condições físicas ou mágicas na ficha de personagem que alteram atributos e rolagens automaticamente enquanto ativos.
* **Checklist**:
  - [x] Criar componente de seleção de status no card de atributos (ex: *Defendendo*, *Concentrando*, *Paralisado*, *Indefeso*).
  - [x] Aplicar modificadores de status nos cálculos em tempo real:
    - *Defendendo*: Dobra a Armadura (`A`) nos cálculos de FD.
    - *Indefeso*: Reduz Habilidade (`H`) e Armadura (`A`) para 0 nas rolagens de FD.
  - [x] Exibir indicadores estéticos ou badges animados de status ao lado do avatar do personagem na mesa para o Mestre e outros jogadores.

### 🎒 5. Inventário Equipável e Modificadores — Hard
* **Descrição**: Transformação da seção de inventário para suportar o uso prático de armas, armaduras e escudos com mutações de atributos na ficha.
* **Checklist**:
  - [x] Adicionar suporte a atributos dinâmicos no modelo de item (`InventoryItem`): `bonus_attribute`, `bonus_value`, `is_equipped`.
  - [x] Adicionar botão de toggle rápido "Equipar/Usar" no item na lista de inventário.
  - [x] Modificar o motor de cálculo da ficha para somar os bônus dos itens equipados aos atributos reais do personagem nas rolagens e recursos.

### 📄 6. Sistema de Exportação e Importação por PDF (Fichas & Regras de Sistema) — Hard
* **Descrição**: Substituição do modelo legado de backup via arquivos `.json` por um sistema unificado de exportação/importação de Fichas de Personagem e Sistemas de Regras através de PDFs interativos com payload de dados embutidos.
* **Checklist**:
  - [x] Desenhar layout específico CSS `@media print` para exportação e impressão de fichas em folha A4.
  - [x] Integrar biblioteca de geração de PDF (`pdf-lib`) para embutir os dados da ficha e dos sistemas de regras (JSON embutido/anexo) dentro do próprio arquivo PDF.
  - [x] Criar modal e área de importação Drag-and-Drop de arquivos PDF: extrai automaticamente os metadados embutidos e restaura a Ficha ou instala o Sistema de Regras no app.
  - [x] Suportar exportação de Livro de Regras em PDF que sirva simultaneamente para leitura humana e como instalador automático de módulo de sistema.

### 🎨 7. Interface de Personalização de Temas Visuais & Avatares — Hard
* **Descrição**: Customização de cores, avatares e temas visuais (Fantasia Clássica, Ficção Científica, Cyberpunk).
* **Checklist**:
  - [x] Criar paletas de temas globais (Dark, Cyberpunk, Retro/3D&T clássico) no Tailwind.
  - [x] Desenvolver modal de "Preferências de Exibição" nas configurações da ficha e dashboard.

---

## 👥 Fase 11: Recursos Sociais, Lobby, Espectadores & Ferramentas do Mestre (Planejado)

### 💬 1. Lobby Geral & Lista de Amigos
* **Descrição**: Sala de bate-papo global integrada (Lobby) para conversação em tempo real e sistema de amizades para mensagens privadas (DM).
* **Checklist**:
  - [x] Criar painel de Lobby Geral com chat em tempo real via canais de Broadcast do Supabase (sem persistência em disco).
  - [x] Implementar sistema de amizades: adicionar amigos pelo chat do lobby, lista de membros ou buscando pelo ID do usuário.
  - [x] Criar lista de amigos interativa com status de presença (online/offline).
  - [x] Implementar chat privado (DMs) em tempo real entre amigos com RLS rigoroso para garantir a privacidade dos dados.

### 👁️ 2. Espectadores e Visibilidade de Mesas
* **Descrição**: Listagem global de todas as mesas criadas, gerenciamento dinâmico de limites/papéis pelo Mestre e modo espectador passivo.
* **Checklist**:
  - [x] Modificar a criação/configuração da mesa (`tables`) para definir um limite máximo de jogadores (excluindo o Mestre) e permitir a edição livre de configurações básicas da mesa (nome, descrição, limite, permissão de espectadores) a qualquer momento pelo Mestre.
  - [x] Listar publicamente todas as mesas criadas no dashboard global de todos os usuários.
  - [x] Implementar modo "Espectador": usuários não vinculados como jogador ou mestre podem entrar em mesas públicas (caso permitido) e assistir a ficha, chat narrativo e rolagens em tempo real, com interações de escrita, envio de mensagens e rolagens desativadas.
  - [x] Criar ações de moderação do Mestre: promover um espectador para jogador (respeitando o limite configurado), rebaixar um jogador para espectador, banir espectadores e banir jogadores da mesa de forma definitiva.
  - [x] Exibir lista lateral de usuários online na mesa ativa com tags distintivas: **Mestre**, **Jogador** ou **Espectador** via canais de Presença Realtime do Supabase.

### 👺 3. Mini-Ficha Resumida do Mestre (Quick NPC Tracker)
* **Descrição**: Painel compacto e simplificado de uso exclusivo do Mestre para gerenciar ameaças, capangas e NPCs diretamente na mesa.
* **Checklist**:
  - [x] Criar painel/drawer de Mini-Ficha rápida visível e acessível estritamente pelo Mestre (`master_id`).
  - [x] Permitir cadastro ágil de atributos base (F, H, R, A, PdF), controle rápido de PV/PM e botões de atalho para rolagens instantâneas no chat narrativo sem expor a ficha inteira para os jogadores.

### 📱 4. PWA (Progressive Web App) & Suporte a Acesso Offline
* **Descrição**: Transformação da aplicação em um Web App instalável com cache local e sincronização offline de fichas.
* **Checklist**:
  - [x] Configurar Manifest do PWA (`manifest.ts`) e Service Worker com estratégia de cache para permitir o uso e carregamento do app offline.
  - [x] Armazenar fichas e dados locais via `IndexedDB` para edição e rolagens sem conexão com sincronização automática ao reconectar ao Supabase.

### 📝 5. Aprimoramento da Exportação de PDF & Editor de Sistemas
* **Descrição**: Melhorias incrementais na formatação do PDF da ficha para impressão e otimizações na UX do editor de sistemas customizados.
* **Checklist**:
  - [x] Ajustar espaçamento, quebras de página e margens no CSS `@media print` para garantir impressão perfeita em A4.
  - [x] Otimizar a criação/edição de atributos e recursos customizados no Sandbox do sistema de regras com um construtor de formulários mais visual.

### 👤 6. Menu de Edição de Perfil & Dados Pessoais
* **Descrição**: Menu ou modal dedicado para o usuário gerenciar suas informações de perfil (username, avatar, about) e dados pessoais adicionais de localização (CEP, país, estado, cidade).
* **Checklist**:
  - [x] Criar modal/tela de edição de perfil "Meu Perfil" no Dashboard com validação Zod.
  - [x] Implementar upload de imagem de avatar integrado ao Supabase Storage.
  - [x] Adicionar campos CEP, país, estado e cidade no formulário com preenchimento automático de endereço via ViaCEP.
  - [x] Implementar Server Action e RLS para atualizar com segurança a tabela `profiles` no banco.

---

## ⚡ Fase 12: Excelência em Engenharia & Melhores Práticas de Arquitetura (Planejado)

### 🗄️ 1. Versionamento de Migrações com Supabase CLI
* **Descrição**: Transição do arquivo de script monolítico para versionamento nativo de migrações SQL através do Supabase CLI.
* **Checklist**:
  - [x] Criar diretório `supabase/migrations/` e migrar a estrutura existente para arquivos numerados timestamped (`20260807000000_init_schema.sql`, `20260807000001_phase11_social_and_spectators.sql`, `20260807000002_future_npcs_audit_and_indexes.sql`).
  - [x] Criar os manuais de arquitetura e banco de dados ([DATABASE.md](DATABASE.md) e [ARCHITECTURE.md](ARCHITECTURE.md)).
  - [x] Integrar fluxo de execução de migrações nos ambientes de desenvolvimento local e docker.

### 🧩 2. Decomposição de Componentes Monolíticos (Refatoração de Mesa VTT)
* **Descrição**: Desmembrar telas extensas (especialmente `tables/[id]/page.tsx`) em subcomponentes modulares e focados.
* **Checklist**:
  - [x] Extrair painel de chat e envio de mensagens para `TableChatPanel.tsx`.
  - [x] Extrair rolador de dados e visualizador 3D para `TableDiceRollerPanel.tsx`.
  - [x] Extrair modais do Mestre para `TableSettingsModal.tsx` e `TableMembersModal.tsx`.

### 🚀 3. Otimização de Performance com React Server Components (RSC)
* **Descrição**: Migrar buscas de dados estáticos do Dashboard e tabelas para o servidor antes de renderizar no cliente.
* **Checklist**:
  - [x] Carregar dados de perfill, personagens e mesas em componentes Server-Side no Next.js (App Router).
  - [x] Reduzir payloads de transferência no cliente utilizando carregamento progressivo.

### 🛡️ 4. Tratamento Global de Erros & Observabilidade (Error Boundaries)
* **Descrição**: Implementação de tratamento gracioso de falhas de runtime e feedback de carregamento.
* **Checklist**:
  - [x] Criar arquivos `error.tsx` e `loading.tsx` com Skeleton Loaders na estrutura de rotas do App Router.
  - [x] Adicionar capturador genérico de exceções não tratadas nas Server Actions.

### 🚦 5. Proteção Anti-Abuse & Rate Limiting em Server Actions
* **Descrição**: Proteção contra requisições abusivas e spam em ações mutáveis de banco.
* **Checklist**:
  - [x] Configurar middleware ou biblioteca de rate-limiting (ex: `@upstash/ratelimit`) para Server Actions públicas e de chat.

### 🏗️ 1. Abstração da Camada de Serviços (Service Layer) — High Priority
* **Descrição**: Desacoplar chamadas diretas do cliente Supabase (`supabase.from(...)`) dos componentes React `.tsx` para arquivos de serviço encapsulados, facilitando manutenibilidade e testes.
* **Checklist**:
  - [x] Criar `src/services/characterService.ts` para operações CRUD e sincronização da ficha.
  - [x] Criar `src/services/tableService.ts` para gerenciamento da mesa VTT e convites.
  - [x] Criar `src/services/systemService.ts` para importação/exportação de regras e Sandbox.

### 🛡️ 2. Validação Server-Side & Anti-Cheat (Next.js Server Actions) — High Priority
* **Descrição**: Garantir que mutações de pontos, distribuições de XP e rolagens críticas de dados sejam validadas no servidor via Next.js Server Actions antes de serem gravadas no banco.
* **Checklist**:
  - [x] Criar esquemas rigorosos com `Zod` para todas as mutações sensíveis da API/Server Actions.
  - [x] Executar a validação do motor de regras ([rules.ts](file:///home/felipe/projetos/galeria-de-defensores/src/lib/rules.ts)) no servidor para impedir payloads falsificados do cliente.
  - [x] Registrar sementes/entradas das rolagens oficiais de dados para garantir auditoria anti-cheat nas mesas.

### 🔐 3. Endurecimento do Banco de Dados (PostgreSQL Constraints & Triggers) — Medium Priority
* **Descrição**: Adicionar garantias físicas no PostgreSQL em [schema.sql](file:///home/felipe/projetos/galeria-de-defensores/supabase/schema.sql) para impedir inconsistência de dados mesmo se a API falhar.
* **Checklist**:
  - [x] Adicionar restrições `CHECK` nativas para saldo não negativo de `points_total`, `experience` e valores de atributos.
  - [x] Criar triggers PostgreSQL para atualização automática do campo `updated_at`.
  - [x] Realizar auditoria completa de políticas RLS em todas as tabelas.

### 🛡️ 4. Restrições de Espectadores & Configuração de Mesa Privada — High Priority
* **Descrição**: Bloqueio de rolagens de dados por espectadores, desativação de controles na Ficha Rápida e nova regra para impedir que um jogador ativo entre como espectador.
* **Checklist**:
  - [x] Restringir rolagens e toggles de status na Ficha Rápida (`TableClient.tsx`) quando visualizada por espectadores ou usuários não autorizados.
  - [x] Desabilitar botão de espectador na exploração de mesas do Dashboard se o usuário já for jogador ativo daquela mesa.
  - [x] Definir mesas como privadas por padrão ao criar (`TableNewClient.tsx`) e alertar visualmente sobre a visibilidade pública ao desmarcar.

---

## 🚀 Fase 13: Modularização Avançada, Realtime Presence & Testes E2E (Planejado)

### 🧩 1. Sub-decomposição de Componentes Monolíticos de Ficha & VTT
* **Descrição**: Extrair abas extensas do `CharacterClient.tsx` (~3.400 linhas) e painéis do `TableClient.tsx` (~2.200 linhas) para subcomponentes modulares e isolados em `src/components/character-sheet/` e `src/components/vtt/`.
* **Checklist**:
  - [x] Extrair abas de Atributos, Vantagens, Inventário, Magias e Rolagens da ficha para componentes dedicados.
  - [x] Extrair gerenciador de NPCs do Mestre e diário de campanha da mesa VTT para componentes dedicados.
  - [ ] Criar custom hooks (`useCharacterPoints`, `useVttSession`) para encapsular o estado e regras de negócio.

### 👥 2. Supabase Realtime Presence & Experiência Otimista (React 19)
* **Descrição**: Adicionar indicadores de presença de jogadores online na mesa em tempo real e atualizações instantâneas de interface com `useOptimistic`.
* **Checklist**:
  - [ ] Configurar canal de Presence do Supabase Realtime para exibir avatares de jogadores online/offline na mesa.
  - [ ] Adicionar indicadores de "digitando no chat..." e "rolando dados...".
  - [ ] Utilizar `useOptimistic` do React 19 para atualizações instantâneas de PV/PM e envio de chat sem lag de rede.

### 🎭 3. Testes End-to-End (E2E) com Playwright
* **Descrição**: Implementar suíte de testes de ponta a ponta simulando navegadores reais para validar a jornada completa do usuário.
* **Checklist**:
  - [ ] Configurar Playwright no projeto e integrar scripts de teste no `package.json`.
  - [ ] Escrever teste E2E para o fluxo: Login -> Criar Personagem -> Entrar na Mesa -> Rolar Dados -> Baixar PDF.

---

## 🔮 Fase 14: Recursos VTT Next-Gen & Integração com IA (Futuro)

### 🗺️ 1. Grid Tático Interativo & Tokens
* **Descrição**: Canvas 2D/SVG opcional na Mesa VTT para movimentação de tokens em mapa de batalha com medição de distância.
* **Checklist**:
  - [ ] Implementar mapa de fundo com upload de imagem e grid personalizável (quadrados/hexágonos).
  - [ ] Permitir arrastar tokens de personagens e NPCs sobre o mapa com atualização via Supabase Realtime.

### 🔊 2. Gerenciador de Áudio & Efeitos Sonoros VTT
* **Descrição**: Reprodução de efeitos sonoros locais (rolagem de dados) e músicas de ambiente controladas pelo Mestre.
* **Checklist**:
  - [ ] Adicionar efeitos sonoros Web Audio API para rolagens de dados (sucesso, crítico, falha).
  - [ ] Criar painel de controle de música ambiente para o Mestre (batalha, taberna, mistério).

### 🤖 3. Gerador de Fichas e NPCs com IA (Gemini API)
* **Descrição**: Integração com IA para geração instantânea de histórico, atributos e ficha de NPCs para 3D&T Alpha.
* **Checklist**:
  - [ ] Criar Server Action integrada à API do Gemini para gerar NPCs com base em prompts curtos do Mestre.
  - [ ] Permitir inserção direta do NPC gerado na mesa VTT com um único clique.



