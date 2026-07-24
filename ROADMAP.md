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

## 🔮 Futuros Upgrades & Expansões (Baixa Prioridade / Backlog)

### 🧩 Reorganização Dinâmica por Drag-and-Drop das Box
* **Descrição**: Sistema de Drag-and-Drop interativo fluido (usando biblioteca especializada como `@hello-pangea/dnd`) para customizar a ordem das caixas na ficha.
* **Checklist**:
  - [ ] Implementar reordenação fluida de colunas e seções da ficha.

