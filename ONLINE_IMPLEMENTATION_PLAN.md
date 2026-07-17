# Plano de Implementação Geral: Galeria de Defensores Online (Atualizado)

Este documento serve como guia detalhado, checklist e roadmap para a migração do projeto **Galeria de Defensores** do aplicativo offline (Android Kotlin) para uma aplicação web fullstack com **React, Next.js, TypeScript e Supabase**.

Este plano foi atualizado após a análise dos diretórios legados (`galeria-defensores-offline-legacy` e `galeria-defensores-legacy`) para incluir a portabilidade dos catálogos nativos de 3D&T Alpha e Gaiden, o sistema de vantagens modulares, especializações, o CRUD completo da Sandbox de Sistemas de Regras, e os recursos avançados da Ficha de Personagem (Escalas, XP/Pontos, Rolagens Customizadas e Integração na Mesa).

---

## 🛠️ Stack Tecnológica Recomendada

1. **Frontend & Backend (API)**: `Next.js` (App Router) + `TypeScript` + `React`
2. **Estilização**: `Tailwind CSS` (visual dark premium baseado em HSL) + `Lucide Icons` + `Framer Motion` (para micro-animações)
3. **Autenticação & Banco de Dados**: `Supabase` (Autenticação JWT, Postgres Database, Row Level Security - RLS, Realtime replication)
4. **Gerenciamento de Estado**: `Zustand` (leve e reativo para fichas e chat) ou `React Query`
5. **Validação de Schemas**: `Zod` (validação estrutural de fichas, dados e sandbox)
6. **Testes**: `Vitest` (testes unitários offline para o motor de regras)

---

## 📋 Checklists de Desenvolvimento e Migração (Passo a Passo)

### 🟩 Fase 1: Setup do Ambiente e Estrutura Inicial (Concluída)
- [x] **Configurar Repositório Git**
  - [x] Branch ativa `feat/web-migration`.
- [x] **Configurar Projeto Supabase**
  - [x] Variáveis de ambiente configuradas no `.env.local`.
- [x] **Configurar Docker**
  - [x] Criado `Dockerfile` e `docker-compose.yml` para desenvolvimento local.
- [x] **Instalar Dependências**
  - [x] Supabase SSR, TypeScript, React, Tailwind, Lucide, Vitest.

---

### 🟨 Fase 2: Banco de Dados e Paridade Estrutural (Atualizado)
Precisamos ajustar o banco de dados no Supabase para acomodar a estrutura completa de customização que existia na Sandbox do projeto offline, além de dados da ficha como escala.

- [x] **Tabelas Iniciais Criadas (schema.sql)**
  - [x] Perfis de usuários (`profiles`).
  - [x] Mesas multiplayer (`tables` e `table_players`).
  - [x] Personagens (`characters`).
  - [x] Chat em tempo real (`chat_messages`).
  - [x] Notificações e convites (`notifications`).
- [x] **Ajustar Tabela de Sistemas de Regras (`rule_systems`)**
  - [x] Alterar `user_id` para aceitar `NULL` (para sistemas nativos como 3D&T Alpha e Gaiden criados pelo sistema e visíveis para todos).
  - [x] Adicionar colunas `advantages` (jsonb), `disadvantages` (jsonb) e `skills` (jsonb) para armazenar os catálogos customizados de cada sistema.
  - [x] Adicionar coluna `damage_types` (jsonb) para os tipos de danos específicos do sistema.
  - [x] Adicionar coluna `dice_config` (jsonb) para guardar quantidade e faces de dados (ex: 1d6).
  - [x] Adicionar coluna `is_base_system` (boolean, default false) para impedir a exclusão ou modificação de sistemas nativos pelos usuários.
- [x] **Ajustar Tabela de Personagens (`characters`)**
  - [x] Adicionar coluna `scale` (integer, default 0, not null) para comportar a escala do personagem (0=Ningen, 1=Sugoi, 2=Kiodai, 3=Kami).
- [/] **Seeding dos Sistemas Base**
  - [x] Estrutura e catálogos base migrados diretamente em TypeScript (`src/lib/catalogs/`).
- [x] **Configurar Políticas de Segurança Row Level Security (RLS)**
  - [x] `rule_systems`: Leitura pública de sistemas ativos (`is_active = true`), escrita permitida apenas se `user_id = auth.uid()`. (Impede modificação dos sistemas base).

---

### 🟧 Fase 3: Autenticação e Perfis (Concluída)
- [x] **Autenticação com Supabase**
  - [x] Fluxo de Login e Registro funcional em `/login` e `/register`.
- [x] **Middleware de Segurança**
  - [x] Proteção e redirecionamento de rotas autenticadas.
- [x] **Perfil de Usuário**
  - [x] Criação automática de perfil em `profiles` ao registrar novo usuário via trigger.

---

### 🟦 Fase 4: Core Engine e Catálogos de Regras (Nova)
Precisamos portar os grandes volumes de dados de regras do Kotlin para o ambiente TypeScript/Next.js.

- [x] **Migrar Catálogos Padrão para TypeScript (`src/lib/catalogs/`)**
  - [x] Criar catálogo de vantagens de 3D&T Alpha (`AdvantagesData.kt` -> `alpha-advantages.ts`).
  - [x] Criar catálogo de desvantagens de 3D&T Alpha (`DisadvantagesData.kt` -> `alpha-disadvantages.ts`).
  - [x] Criar catálogo de perícias e especializações (`SkillsData.ts` & `SpecializationsData.ts`).
  - [x] Criar catálogo de vantagens únicas (races) (`UniqueAdvantagesData.kt` -> `unique-advantages.ts`).
  - [x] Criar catálogo de vantagens e desvantagens de 3D&T Gaiden (`GaidenData.kt` -> `gaiden-catalog.ts`).
- [x] **Portabilidade do Motor de Regras**
  - [x] Validação estrutural e cálculo de limites PV/PM em [rules.ts](file:///home/felipe/projetos/galeria-de-defensores/src/lib/rules.ts).
  - [x] **Validação Dinâmica de Custo**: Adaptar `calculateScore` em `rules.ts` para computar vantagens modulares com seus modificadores, subtrair o custo das desvantagens e aplicar a regra "1 ponto para cada 3 itens" em *Manobras, Sentidos, Qualidades e Status Negativos*.
  - [x] Validações de sandbox e chaves em [validations.ts](file:///home/felipe/projetos/galeria-de-defensores/src/lib/validations.ts).
- [x] **Testes Unitários**
  - [x] Testes unitários com Vitest passando localmente e no Docker.

---

### 🟪 Fase 5: Ficha de Personagem Avançada (Atualizado)
Substituir a edição livre por seletores ricos baseados nos catálogos do sistema de regras escolhido.

- [x] **Seletor de Vantagem Única (Raça)**
  - [x] Modal de seleção que exibe a lista de raças do sistema de regras ativo.
  - [x] Aplicação automática dos bônus/penalidades na ficha e cálculo do custo em pontos.
- [x] **Seletor de Vantagens e Desvantagens com Suporte a Modificadores**
  - [x] Modal de busca e filtro de Vantagens/Desvantagens do sistema.
  - [x] **Modificadores Modulares**: Para vantagens como *Ataque Especial* ou *Armadura Extra*, abrir tela de seleção dos modificadores (ex: Amplo, Crítico, Devastador) que recalcula o custo total em pontos de forma reativa.
- [x] **Seletor de Perícias e Especializações**
  - [x] Escolha de Perícias (2 pontos).
  - [x] Seleção de Especializações associadas às perícias escolhidas, aplicando a regra de 1 ponto a cada 3 especializações.
- [x] **Controle de Escala**
  - [x] Seletor visual da Escala do personagem (Ningen, Sugoi, Kiodai, Kami) com indicação do multiplicador (x1, x10, x100, x1000).
- [x] **Controle de Experiência e Conversão Automática**
  - [x] Entradas para editar Experiência (XP) e Pontos Guardados.
  - [x] Implementar regra reativa: ao atingir 10 XP, subtrair 10 de XP e adicionar +1 em Pontos Guardados automaticamente.
- [x] **Motor de Rolagens Customizadas (Custom Rolls)**
  - [x] Criar gerenciador de rolagens personalizadas na ficha (criar, editar e excluir).
  - [x] Permitir a configuração de múltiplos componentes de dados, modificador global, atributos primários/secundários associados, acúmulo de críticos e custo de PM.
- [x] **Rolagem Rápida Interativa (Ficha Local)**
  - [x] Permitir que o jogador clique em qualquer atributo, perícia ou rolagem customizada diretamente da ficha para simular a rolagem física na tela com um feed de resultados local.
- [x] **Autosave Debounced**
  - [x] Salvamento automático de todas as alterações com debounce e indicador de status na tela de edição.
- [x] **Inventário Equipável e Modificadores**
  - [x] Suporte a itens no inventário que concedem bônus a atributos base, recalculando dinamicamente PV/PM máximos.
- [x] **Ficha Impressa & Exportação para PDF**
  - [x] Layout A4 clássico preto e branco otimizado para economia de tinta e diagramação do 3D&T Alpha nativo no print do navegador.

---

### 🟫 Fase 6: Sandbox e CRUD Completo de Sistemas de Regras (Atualizado)
Reconstruir a experiência de criação e edição de sistemas de regras do aplicativo offline legado.

- [x] **Painel do Customizador de Regras**
  - [x] Página de listagem dos sistemas do usuário e sistemas base públicos.
  - [x] Editor de Metadados: Nome, descrição, número e faces de dados, tipos de danos permitidos.
- [x] **Editor de Atributos e Recursos**
  - [x] Adicionar/editar atributos com nome, abreviação, cor e ordem de exibição.
  - [x] Adicionar/editar recursos com nome, cor e fórmula customizada (ex: `R * 5`, `F + H * 2`).
  - [x] Validação de fórmulas em tempo real no cliente antes de salvar.
  - [x] Validação de chaves e nomes únicos case-insensitive (método `validateUniqueNameAndKey` traduzido para TypeScript).
- [/] **Editor de Catálogos Personalizados**
  - [x] Customização e inclusão de catálogos e modificadores modulares suportados nativamente via importação/exportação da estrutura completa JSON no editor.
- [x] **Exportação e Importação de JSON**
  - [x] Copiar código JSON do sistema ou carregar arquivo `.json` externo para importar a estrutura completa de regras instantaneamente.

---

## 🌐 Fase 7: Sistemas Multiplayer e Tempo Real (Atualizado)
Aproveitando as funcionalidades da pasta `legacy` e integrando as fichas ativas com a mesa.

- [x] **Painel de Gerenciamento de Mesas (`/tables`)**
  - [x] Tela para criar mesa (Mestre define nome, descrição, se é privada e senha).
  - [x] Sistema para mestre convidar jogadores por email/username, gerando `notifications` do tipo `INVITE`.
- [x] **Chat da Mesa em Tempo Real**
  - [x] Chat persistente baseado em `chat_messages` conectado ao canal Realtime do Supabase.
  - [x] Suporte a mensagens de texto simples, mensagens do sistema (ex: entrada de jogador), imagens e rolagens de dados.
- [x] **Painel Lateral de Personagens na Mesa (Drawer)**
  - [x] Adicionar painel lateral na mesa (`/tables/[id]`) que lista todos os jogadores presentes e seus respectivos personagens vinculados.
- [x] **Integração de Rolagem da Ficha na Mesa**
  - [x] Permitir que o jogador abra sua ficha diretamente no painel da mesa e realize rolagens de atributos ou rolagens customizadas.
  - [x] Os resultados destas rolagens devem ser computados e enviados automaticamente como uma mensagem especial de rolagem (`ROLL`) para o chat da mesa em tempo real, visível para todos os jogadores e para o mestre.
- [x] **Distribuição de Experiência (PEs)**
  - [x] Painel do mestre para selecionar personagens ativos e conceder PEs simultaneamente com banners de notificação em tempo real.
- [x] **Diário de Campanha Compartilhado**
  - [x] Aba de anotações com diário público do mestre (sincronizado em tempo real) e notas privadas do jogador logado.
- [x] **Efeitos Temporários e Status Nativos**
  - [x] Ajustes nos cálculos do motor de regras para aplicar modificadores de status temporários (*Defendendo*, *Indefeso*, *Paralisado*).
- [x] **CRUD de Status Personalizados**
  - [x] Interface completa para o Mestre da mesa gerenciar tags de status adicionais com RLS do banco de dados e ouvinte realtime.

---

## 🎨 Fase 8: Visual Premium e Design UX
Como o app visa impressionar visualmente o usuário ("WOW factor"):
- [x] **Design System Visual**
  - [x] Escolha de tipografia moderna (*Outfit* via Google Fonts).
  - [x] Paleta de Cores Harmônica: Dark mode elegante (fundo cinza escuro azulado `#0f172a`, cards em `#1e293b`) com detalhes em gradientes neon (Roxo, Ciano, Violeta).
- [x] **Visual Glassmorphism**
  - [x] Uso de efeitos de vidro fosco (`backdrop-blur`) para modais, barras de navegação e cabeçalhos.
- [/] **Micro-interações e Transições (Framer Motion)**
  - [x] Transições e animações fluidas implementadas nativamente no CSS / Tailwind para maior performance e leveza.
  - [x] Feedbacks de clique suaves nos seletores de atributos e rolagens críticas.

---

## 🚀 Fase 9: Deploy e Otimização
- [/] **Otimização de Performance**
  - [x] Cache reativo centralizado com listeners em tempo real do Supabase e estado global.
- [ ] **Deploy na Vercel**
  - [ ] Vincular o repositório GitHub à Vercel.
  - [ ] Configurar as variáveis de ambiente no painel da Vercel.

---

## 🔮 Planos Futuros e Melhorias Legadas

Identificamos funcionalidades avançadas nos aplicativos Android legados que foram temporariamente simplificadas na versão Web e que formam o roadmap para o futuro:

### 1. Tabuleiro de Dados Virtuais com Física (Dice Board)
* **Objetivo**: Recriar o `DiceBoardView` legada usando HTML5 Canvas (ou Three.js/Cannon.js para 3D).
* **Especificações**:
  * Simulação de física de colisão elástica e atrito de rolagem entre dados.
  * Agitar para rolar (via sensor de acelerômetro da API do navegador em dispositivos móveis).
  * Efeitos sonoros reais e feedback tátil (vibrador do celular) ao colidir dados.
  * Rastro de luz neon e brilho neon para acertos críticos.

### 2. Editor Avançado de Rolagens Customizadas (Multi-Componentes)
* **Objetivo**: Aumentar a fidelidade da UI de rolagens personalizadas na Ficha de Personagem.
* **Especificações**:
  * **Multi-Componentes**: Interface para adicionar múltiplos conjuntos de dados de faces diferentes no mesmo rolo (ex: `2d6 + 1d10 - 1d4`).
  * **Controles por Componente**: Checkbox para dados negativos (`isNegative`), chave liga/desliga de crítico, multiplicador de crítico customizável (ex: x3) e limiar crítico específico (ex: crítico a partir de 5).
  * **Custo de PM e Tipos**: Definir o custo de Pontos de Magia (PM) do lançamento e categorizar a ação (Ataque, Defesa, Magia, Iniciativa).

### 3. Rastreador de Iniciativa e Combate Integrado
* **Objetivo**: Portabilidade do gerenciamento de combates do mestre e dos jogadores (`CombatState`).
* **Especificações**:
  * Painel de Iniciativa com controle ativo de rodadas e turnos dos participantes da mesa.
  * Sistema de ataque e reação pendente (quando o atacante declara a ação, o defensor recebe uma notificação para reagir com sua Esquiva/Defesa).
  * Histórico de log estruturado de ações físicas de combate.
