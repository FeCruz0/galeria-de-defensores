# 📝 Tasks - Galeria de Defensores

## 🎯 Em Andamento: Correção da Permissão de Edição de Sistema Customizado na Ficha
- [ ] Carregar `user_id` em `setSystemDef` ao buscar o sistema de regras em `src/app/characters/[id]/page.tsx`.
- [ ] Carregar `currentUser` (usuário logado) e armazenar no estado da ficha.
- [ ] Ajustar verificação de permissão: `!systemDef.is_base_system && systemDef.user_id === currentUser.id`.
- [ ] Se o sistema pertencer a outro usuário, exibir mensagem informativa apropriada no `SystemModal`.
- [ ] Permitir a edição e salvamento direto em `rule_systems` no Supabase quando a verificação for bem-sucedida.
- [ ] Executar testes (`npx vitest run`) e validar build (`npm run build`).

## ✅ Concluído: Edição de Sistema Customizado e Tipos de Dano
- [x] Validações e testes unitários.
- [x] Modal de edição de sistema na ficha.
- [x] Gerenciamento inline de tipos de dano.
