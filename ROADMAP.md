# 🗺️ Roadmap de Atualizações - Galeria de Defensores

Este documento reúne e organiza as próximas atualizações e novas funcionalidades planejadas para o projeto, priorizadas por grau de dificuldade de implementação (da mais fácil/rápida para a mais complexa).

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
  - [ ] Criar painel de Lobby Geral com chat em tempo real via canais de Broadcast do Supabase (sem persistência em disco).
  - [ ] Implementar sistema de amizades: adicionar amigos pelo chat do lobby, lista de membros ou buscando pelo ID do usuário.
  - [ ] Criar lista de amigos interativa com status de presença (online/offline).
  - [ ] Implementar chat privado (DMs) em tempo real entre amigos com RLS rigoroso para garantir a privacidade dos dados.

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
  - [ ] Criar painel/drawer de Mini-Ficha rápida visível e acessível estritamente pelo Mestre (`master_id`).
  - [ ] Permitir cadastro ágil de atributos base (F, H, R, A, PdF), controle rápido de PV/PM e botões de atalho para rolagens instantâneas no chat narrativo sem expor a ficha inteira para os jogadores.

### 📱 4. PWA (Progressive Web App) & Suporte a Acesso Offline
* **Descrição**: Transformação da aplicação em um Web App instalável com cache local e sincronização offline de fichas.
* **Checklist**:
  - [ ] Configurar Manifest do PWA (`manifest.json`) e Service Worker com estratégia de cache para permitir o uso e carregamento do app offline.
  - [ ] Armazenar fichas e dados locais via `IndexedDB` para edição e rolagens sem conexão com sincronização automática ao reconectar ao Supabase.

### 📝 5. Aprimoramento da Exportação de PDF & Editor de Sistemas
* **Descrição**: Melhorias incrementais na formatação do PDF da ficha para impressão e otimizações na UX do editor de sistemas customizados.
* **Checklist**:
  - [ ] Ajustar espaçamento, quebras de página e margens no CSS `@media print` para garantir impressão perfeita em A4.
  - [ ] Otimizar a criação/edição de atributos e recursos customizados no Sandbox do sistema de regras com um construtor de formulários mais visual.

---

## ⚡ Fase 12: Excelência em Engenharia & Melhores Práticas de Arquitetura (Planejado)

### 🗄️ 1. Versionamento de Migrações com Supabase CLI
* **Descrição**: Transição do arquivo de script monolítico para versionamento nativo de migrações SQL através do Supabase CLI.
* **Checklist**:
  - [ ] Criar diretório `supabase/migrations/` e migrar a estrutura existente para arquivos numerados timestamped (ex: `20260807000000_schema.sql`).
  - [ ] Integrar fluxo de execução de migrações nos ambientes de desenvolvimento local e docker.

### 🧩 2. Decomposição de Componentes Monolíticos (Refatoração de Mesa VTT)
* **Descrição**: Desmembrar telas extensas (especialmente `tables/[id]/page.tsx`) em subcomponentes modulares e focados.
* **Checklist**:
  - [ ] Extrair painel de chat e envio de mensagens para `TableChatPanel.tsx`.
  - [ ] Extrair rolador de dados e visualizador 3D para `TableDiceRollerPanel.tsx`.
  - [ ] Extrair modais do Mestre para `TableSettingsModal.tsx` e `TableMembersModal.tsx`.

### 🚀 3. Otimização de Performance com React Server Components (RSC)
* **Descrição**: Migrar buscas de dados estáticos do Dashboard e tabelas para o servidor antes de renderizar no cliente.
* **Checklist**:
  - [ ] Carregar dados de perfill, personagens e mesas em componentes Server-Side no Next.js (App Router).
  - [ ] Reduzir payloads de transferência no cliente utilizando carregamento progressivo.

### 🛡️ 4. Tratamento Global de Erros & Observabilidade (Error Boundaries)
* **Descrição**: Implementação de tratamento gracioso de falhas de runtime e feedback de carregamento.
* **Checklist**:
  - [ ] Criar arquivos `error.tsx` e `loading.tsx` com Skeleton Loaders na estrutura de rotas do App Router.
  - [ ] Adicionar capturador genérico de exceções não tratadas nas Server Actions.

### 🚦 5. Proteção Anti-Abuse & Rate Limiting em Server Actions
* **Descrição**: Proteção contra requisições abusivas e spam em ações mutáveis de banco.
* **Checklist**:
  - [ ] Configurar middleware ou biblioteca de rate-limiting (ex: `@upstash/ratelimit`) para Server Actions públicas e de chat.

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


