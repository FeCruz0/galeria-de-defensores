# 🏗️ Documentação da Arquitetura de Software — Galeria de Defensores

Este documento descreve a arquitetura de software, padrões de código e diretrizes de engenharia adotados no projeto **Galeria de Defensores**.

---

## 📐 Visão Geral da Stack Tecnológica

* **Core Framework:** Next.js 15+ (App Router)
* **Linguagem:** TypeScript (Modo Estrito)
* **Estilização & UI:** Vanilla CSS + Tailwind CSS v4 + Lucide React Icons
* **Banco de Dados & BaaS:** Supabase (PostgreSQL, Row Level Security - RLS, Realtime & Auth)
* **Testes Unitários:** Vitest
* **Validação de Schemas:** Zod

---

## 🏛️ Camadas da Aplicação (Layered Architecture)

A aplicação segue um desacoplamento estrito em 4 camadas para garantir manutenibilidade, testabilidade e reutilização de código:

```
┌─────────────────────────────────────────────────────────┐
│              1. User Interface (React / TSX)            │
│  Components, Pages (App Router), Drawers & Glass Toast  │
└───────────────────────────┬─────────────────────────────┘
                            │ (Submete Forms / Triggers)
┌───────────────────────────▼─────────────────────────────┐
│       2. Server Actions Layer (Validation & Anti-Cheat) │
│   Zod Schemas + Regras de Negócio Server-Side ('use server') │
└───────────────────────────┬─────────────────────────────┘
                            │ (Invoca Serviços Encapsulados)
┌───────────────────────────▼─────────────────────────────┐
│          3. Service Layer (src/services/*.ts)           │
│   Encapsulamento de Queries Supabase & Motor de Regras  │
└───────────────────────────┬─────────────────────────────┘
                            │ (Comunicação PostgREST / Realtime)
┌───────────────────────────▼─────────────────────────────┐
│           4. Database Layer (PostgreSQL & RLS)          │
│   Tabelas, Constraints CHECK, Triggers & Policies RLS   │
└─────────────────────────────────────────────────────────┘
```

### 1. Camada de UI (React Client & Server Components)
* Localização: `src/app/` e `src/components/`
* Diretriz: Componentes de cliente (`'use client'`) mantêm apenas estado de UI e chamam Server Actions ou a camada de serviços.
* UX: Sem uso de `alert()`, `confirm()` ou `prompt()` nativos do navegador. Confirmações e avisos são exibidos via `SystemModal.tsx` e toasts glassmorphic.

### 2. Camada de Server Actions (`src/actions/`)
* Localização: `src/actions/tableActions.ts`, `src/actions/socialActions.ts`, etc.
* Responsabilidade: **Validação Server-Side e Anti-Cheat**.
* Funcionamento: Toda mutação que chega do cliente é parseada via esquemas `Zod` (`safeParse`). Se os dados forem manipulados ou inválidos, o servidor rejeita a ação antes de contatar o banco de dados.

### 3. Camada de Serviços (`src/services/`)
* Localização: `src/services/tableService.ts`, `src/services/socialService.ts`, `src/services/characterService.ts`, `src/services/systemService.ts`.
* Responsabilidade: Isolar completamente chamadas diretas do SDK do Supabase (`supabase.from(...)`) da camada de renderização React.
* Facilidade de Testes: Permite mockar serviços com facilidade em testes unitários com Vitest.

### 4. Camada de Banco de Dados (`supabase/`)
* Localização: `supabase/schema.sql` e `supabase/migrations/`
* Responsabilidade: Garantir a integridade física dos dados através de restrições `CHECK`, triggers nativas do PostgreSQL e políticas RLS (Row Level Security).

---

## 🛡️ Diretrizes de Segurança & Anti-Cheat

1. **Validação Rigorosa no Servidor:**
   Nenhum parâmetro de rolagem crítica ou saldo de pontos (`points_total`, `experience`) é aceito cegamente do cliente. O servidor re-calcula o saldo disponível usando as regras oficiais de [rules.ts](file:///home/felipe/projetos/galeria-de-defensores/src/lib/rules.ts).

2. **RLS (Row Level Security):**
   Todas as 13 tabelas do Supabase possuem RLS ativado. Mesmo que um usuário mal-intencionado execute requisições HTTP diretas à API do Supabase, o banco de dados rejeitará a operação se ele não for o autor/mestre/membro autorizado.

3. **Modo Espectador Passivo:**
   Espectadores possuem permissão de leitura de chat e fichas, mas a política RLS da tabela `chat_messages` bloqueia requisições `INSERT` para usuários com `role = 'spectator'`.

---

## 🧪 Padrão TDD (Test-Driven Development) & Testes

* **Framework:** Vitest
* **Suíte de Testes:** Localizada em `src/services/__tests__/`, `src/actions/__tests__/` e `src/lib/__tests__/`.
* **Comando de Execução:** `npx vitest run`
