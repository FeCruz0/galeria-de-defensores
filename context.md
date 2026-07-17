# Contexto do Projeto: Galeria de Defensores Web

## Visão Geral
Aplicação Web Fullstack (Next.js, React, TypeScript, Supabase) para gerenciamento de fichas de 3D&T Alpha e Gaiden, e suporte a mesas de jogo multiplayer em tempo real com rolagens integradas.

## Estado Atual
1. **Arquitetura**: Next.js App Router estruturado diretamente na raiz do repositório.
2. **Autenticação**: Integrado Supabase Auth com proteção de rotas privadas via middleware Next.js.
3. **Persistência**: Tabelas PostgreSQL (perfis, personagens, mesas, mensagens e notificações) com RLS ativado no Supabase.
4. **Ficha de Personagem**: Visualização responsiva com botões de mutação direta de atributos, recursos com autosave debounced, e suporte a inventário equipável com bônus de atributos reais.
5. **Multiplayer**: Chat em tempo real, rolador de dados 3D, diário de campanha compartilhado (público/privado), distribuição de experiência (PEs) pelo mestre, e CRUD de status personalizados da mesa.
6. **Ficha Impressa (PDF)**: Layout A4 em preto e branco otimizado para economia de tinta e diagramação clássica do 3D&T Alpha ativado nativamente na impressão.
7. **Testes e Build**: Vitest configurado e executando com sucesso (28 testes cobrindo motor de regras, validações de sandbox e modificadores de status/equipamentos), e build de produção Next.js compilando com sucesso.
8. **Docker**: Adicionados `Dockerfile` e `docker-compose.yml` para facilitar a inicialização e testes locais do ambiente.

## Regras de Ouro (AI-Rules)
- **TDD Incremental**: Escrever teste -> Parar -> Aguardar OK -> Implementar.
- **Segurança com RLS**: Todas as consultas/escritas devem passar pelas políticas RLS (`auth.uid() = user_id`, etc.).
- **Debounced Save**: Mutação na ficha deve acionar o autosave após debounce para evitar sobrecarga de conexões.
