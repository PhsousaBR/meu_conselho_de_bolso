# Conselho de Bolso (Next.js Edition)

App de gestão financeira para microempresas de serviços.

## Instalação e Execução Local

1. Instale as dependências:
   ```bash
   npm install
   ```

2. Crie um arquivo `.env.local` na raiz com suas chaves do Supabase:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=sua_url_supabase
   NEXT_PUBLIC_SUPABASE_ANON_KEY=sua_key_anon
   ```

3. Execute o servidor de desenvolvimento:
   ```bash
   npm run dev
   ```
   Acesse `http://localhost:3000`.

## Configuração do Supabase

1. Crie um novo projeto no Supabase.
2. Vá em **SQL Editor** e execute o conteúdo do arquivo `db_setup.sql`.
3. Certifique-se de que a autenticação (Email/Senha) está ativada.

## Deploy na Vercel

1. Crie um repositório no GitHub/GitLab com este código.
2. Acesse [vercel.com](https://vercel.com) e crie um novo projeto importando o repositório.
3. Nas configurações de **Environment Variables**, adicione:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Clique em **Deploy**.

## Estrutura

- `app/`: Páginas e rotas (App Router).
- `components/`: Componentes de UI reutilizáveis.
- `services/`: Lógica de interação com Supabase.
- `types.ts`: Definições de tipos TypeScript.
