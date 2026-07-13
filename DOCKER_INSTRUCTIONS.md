# Guia de Uso com Docker

Este projeto está configurado para rodar a aplicação web Next.js usando o Docker e o Docker Compose. Abaixo estão as instruções detalhadas de como configurar e subir o projeto.

## Pré-requisitos

Certifique-se de ter instalado em sua máquina:
1. **Docker**
2. **Docker Compose**

---

## Passo a Passo

### 1. Configurar o Banco de Dados (Supabase)
Como este projeto utiliza o Supabase para autenticação, banco de dados PostgreSQL e sincronização em tempo real (Realtime):
1. Crie um projeto gratuito no [Supabase](https://supabase.com/).
2. Vá em **SQL Editor** no painel do Supabase, crie uma nova query, copie o conteúdo do arquivo [supabase/schema.sql](supabase/schema.sql) e execute-o. Isso criará todas as tabelas, funções, triggers e políticas de segurança necessárias.

### 2. Configurar as Variáveis de Ambiente
Na raiz do projeto, edite o arquivo `.env.local` (ou crie-o se não existir) e adicione suas credenciais do Supabase:
```env
NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua-chave-anon-publica-do-supabase
```
> [!IMPORTANT]
> A aplicação Next.js precisa dessas chaves válidas para se conectar ao banco de dados e realizar a autenticação. Se você usar placeholders inválidos (como `your-supabase-url-here`), as chamadas de API falharão e a autenticação não funcionará.

### 3. Construir e Iniciar o Container
Para baixar as imagens base, instalar as dependências e iniciar o servidor de desenvolvimento, execute o seguinte comando na raiz do projeto:
```bash
docker compose up --build
```

### 4. Acessar a Aplicação
Uma vez que o terminal indicar que o Next.js está rodando, abra o seu navegador e acesse:
* **[http://localhost:3000](http://localhost:3000)**

Qualquer alteração feita no código local será refletida automaticamente dentro do container graças aos volumes mapeados.

---

## Comandos Úteis do Docker

- **Parar os containers:**
  ```bash
  docker compose down
  ```

- **Rodar os Testes Unitários dentro do Container:**
  Você pode rodar os testes do Vitest usando o container ativo:
  ```bash
  docker compose exec web npx vitest run
  ```

- **Acessar o terminal do container:**
  ```bash
  docker compose exec web sh
  ```

- **Visualizar os logs:**
  ```bash
  docker compose logs -f web
  ```
