# 📝 Tasks - Galeria de Defensores

## 🎯 Em Andamento: Varredura de Tradução UI (Inglês -> Português)
- [ ] Mapear todos os termos em inglês visíveis na UI em componentes, modais, headers e visualizações de fichas/mesas/sandbox.
- [ ] Substituir rótulos de UI:
  - `advantages` -> `Vantagens`
  - `disadvantages` -> `Desvantagens`
  - `skills` -> `Perícias`
  - `specializations` -> `Especializações`
  - `inventory` -> `Inventário`
  - `spells` -> `Magias`
  - `damage_types` -> `Tipos de Dano`
  - `resources` -> `Recursos`
- [ ] Preservar contratos de dados/banco de dados Supabase (`RuleSystem`, `Character`) mantendo compatibilidade de API.
- [ ] Executar suíte de testes (`npx vitest run`) e build (`npm run build`).

## ✅ Concluído: Edição de Sistemas e Catálogo de Regras
- [x] Componente `SystemEditorModal.tsx` centralizado.
- [x] Gerenciamento de Vantagens, Desvantagens e Perícias no editor do sistema.
- [x] Suporte a `appliedCostPt` e vantagens modulares.
