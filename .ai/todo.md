# 📝 Tasks - Galeria de Defensores

## 🎲 Ajuste de Rotação Suave de Pouso (Slow Landing Rotation)
- [ ] Ajustar limiar de início da fase de pouso (`currentSpeed < 6.5`) em `DiceRollOverlay.tsx`.
- [ ] Reduzir o fator de interpolação `lerpAngle` para `0.035` (correção muito lenta e gradual).
- [ ] Ajustar amortecimento angular de spin (`newDhRx *= 0.90`) para sincronizar com a desaceleração.
- [ ] Validar com testes unitários (`npx vitest run`) e build (`npm run build`).

## ✅ Concluído: Varredura de Tradução UI (Inglês -> Português)
- [x] Mapear todos os termos em inglês visíveis na UI em componentes, modais, headers e visualizações de fichas/mesas/sandbox.
- [x] Substituir rótulos de UI.
- [x] Preservar contratos de dados/banco de dados Supabase (`RuleSystem`, `Character`).
- [x] Executar suíte de testes e build.

## ✅ Concluído: Edição de Sistemas e Catálogo de Regras
- [x] Componente `SystemEditorModal.tsx` centralizado.
- [x] Gerenciamento de Vantagens, Desvantagens e Perícias.
- [x] Suporte a `appliedCostPt` e vantagens modulares.
