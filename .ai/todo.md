# 📝 Tasks - Galeria de Defensores

## ✅ Concluído: Sistema de Exportação e Importação por PDF
- [x] Instalar dependência `pdf-lib` via npm/pnpm.
- [x] Criar utilitário `src/lib/pdfPayload.ts` com funções de exportação (embutindo JSON como anexo/metadado) e importação (extraindo JSON de PDF).
- [x] Criar teste unitário `src/lib/__tests__/pdfPayload.test.ts` e validar ciclo completo via `npx vitest run`.
- [x] Criar componente `src/components/PdfImportModal.tsx` com suporte a upload Drag-and-Drop de PDF.
- [x] Integrar botão "Exportar PDF com Dados Embutidos" na página da ficha de personagem (`src/app/characters/[id]/page.tsx`).
- [x] Integrar botão "Importar (PDF)" e "Exportar Sistema de Regras (PDF)" no Dashboard (`src/app/dashboard/page.tsx`).
- [x] Ajustar layout de 2 colunas responsivas da ficha de personagem (`lg:grid-cols-12`) e botão "Restaurar Padrões" no modal de preferências.

## ✅ Concluído: Personalização de Caixas por Drag-and-Drop
- [x] Implementar eventos Drag-and-Drop nativos (`draggable`, `onDragStart`, `onDragOver`, `onDrop`) na aba "Ordem da Ficha" do modal de preferências.
- [x] Adicionar suporte a arrastar e soltar os cards diretamente na tela da ficha (`attributes`, `resources`, `qualities`).
- [x] Manter suporte a arrastar/soltar e setas interativas para acessibilidade.

