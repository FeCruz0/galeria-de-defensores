# Checklist de Implementação - Galeria de Defensores Online

- [x] Criar diretório `web` e inicializar Next.js
  - [x] Executar: `npx -y create-next-app@latest web --typescript --tailwind --eslint --src-dir --app --import-alias "@/*"`
- [x] Configurações Iniciais de Ambiente
  - [x] Adicionar `web/.env.local` ao `.gitignore`
- [x] Instalar Dependências no diretório `web`
  - [x] Executar: `npm install @supabase/supabase-js @supabase/ssr zod zustand lucide-react`
- [x] Configurar chaves do Supabase no arquivo `.env.local`
- [x] Criar script de esquema SQL do banco de dados (Supabase/PostgreSQL)
  - [x] Criar arquivo `web/supabase/schema.sql` com as definições de tabelas e políticas RLS.
- [x] Criar definições de tipos TypeScript para o motor de jogo (`web/src/types/game.ts`)
  - [x] Mapear interfaces com base nos modelos Kotlin legados (`Character`, `Table`, `ChatMessage`, etc.).
- [x] Configurar o cliente do Supabase no Next.js (`web/src/lib/supabase.ts`)
  - [x] Criar arquivo utilitário para instanciar o Supabase Client.
- [x] Implementar motor de regras e cálculos de pontuação de 3D&T (`web/src/lib/rules.ts`)
  - [x] Portar funções de cálculo de PV, PM e custo total de pontuação do Kotlin para TypeScript.
- [x] Criar validações e esquemas Zod (`web/src/lib/validations.ts`)
  - [x] Implementar validação estrutural de personagens e sistema sandbox.
  - [x] Portar a lógica de validação de unicidade case-insensitive (`validateUniqueNameAndKey`).
- [x] Criar testes unitários para o motor de regras e validações (`web/src/__tests__/game.test.ts`)
  - [x] Instalar Vitest: `npm install -D vitest`
  - [x] Escrever casos de teste para `calculateScore`, `getMaxPv`, `getMaxPm` e `validateUniqueNameAndKey` no arquivo `web/src/__tests__/game.test.ts`.
  - [x] Executar os testes via `npx vitest run`.

- [x] Configurar helpers do Supabase SSR (`web/src/utils/supabase/`)
  - [x] Criar client component helper (`web/src/utils/supabase/client.ts`)
  - [x] Criar server component helper (`web/src/utils/supabase/server.ts`)
  - [x] Criar middleware helper (`web/src/utils/supabase/middleware.ts`)
- [x] Criar o middleware de autenticação e proteção de rotas (`web/src/middleware.ts`)
- [x] Criar páginas de autenticação no Next.js (Fase 3)
  - [x] Criar página de login (`web/src/app/login/page.tsx`)
  - [x] Criar página de cadastro (`web/src/app/register/page.tsx`)
- [x] Criar página de Dashboard (`web/src/app/dashboard/page.tsx`)
  - [x] Exibir perfil do usuário e listagem de personagens carregados do Supabase.
  - [x] Implementar botão de logout e link para criar novos personagens ou mesas.
- [x] Criar página de criação de personagem (`web/src/app/characters/new/page.tsx`)
  - [x] Implementar formulário de dados básicos (Nome, Conceito, Pontos Iniciais).
  - [x] Adicionar seleção do sistema de regras aplicável (carregando do banco).
  - [x] Inicializar atributos e recursos dinâmicos baseados no sistema escolhido e salvar no Supabase.
- [x] Criar página de Ficha do Personagem (`web/src/app/characters/[id]/page.tsx`)
  - [x] Implementar carregamento e visualização completa dos dados da ficha em abas.
  - [x] Criar botões de incremento/decremento de atributos e contadores de PV/PM com autosave/debounce.
  - [x] Permitir gerenciamento de vantagens, desvantagens, perícias e inventário.
- [x] Criar página de criação de mesa (`web/src/app/tables/new/page.tsx`)
  - [x] Implementar formulário para definir nome, descrição e senha da mesa.
- [x] Criar página da Mesa de Jogo em Tempo Real (`web/src/app/tables/[id]/page.tsx`)
  - [x] Conectar ao canal Realtime do Supabase para mensagens de chat.
  - [x] Integrar rolagens de dados rápidas e visualização das rolagens do grupo.

- [x] Mover aplicação web de `web/*` para a raiz do repositório
- [x] Deletar a pasta Android `/app`
- [x] Deletar a pasta `/legacy`
- [x] Deletar arquivos gradle e configurações Android na raiz do projeto
- [x] Ajustar o arquivo `.gitignore` da raiz
- [x] Atualizar as documentações `README.md` e `context.md` com a nova estrutura de raiz

- [x] Configurar Docker para desenvolvimento local
  - [x] Criar `Dockerfile` na raiz do projeto.
  - [x] Criar `docker-compose.yml` na raiz do projeto.
  - [x] Adicionar instruções de execução via Docker no `README.md`.













