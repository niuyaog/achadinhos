# Pre-Deploy Hardening - Achadinhos

Data: 2026-05-26  
Escopo: segurança pré-deploy sem alteração de layout visual e sem adicionar funcionalidades fora do MVP.

## Arquivos alterados

- `package.json`
- `package-lock.json`
- `scratch/checkDb.js`
- `src/proxy.ts`
- `src/app/admin/api/session/route.ts`
- `src/app/admin/layout.tsx`
- `src/app/admin/login/page.tsx`
- `src/app/admin/page.tsx`
- `src/app/admin/estatisticas/page.tsx`
- `src/app/admin/lojas/page.tsx`
- `src/app/admin/produtos/page.tsx`
- `src/app/go/[productSlug]/route.ts`
- `src/app/page.tsx`
- `src/app/produto/[slug]/page.tsx`
- `src/components/ProductCard.tsx`
- `src/components/ProductForm.tsx`
- `src/components/ProductSection.tsx`
- `src/lib/security/affiliateUrl.ts`
- `src/lib/services/shopeeSync.ts`
- `src/lib/supabase/adminAuth.ts`
- `src/lib/supabase/authHelper.ts`
- `src/lib/supabase/client.ts`
- `src/lib/supabase/config.ts`
- `src/lib/supabase/dataManager.ts`
- `src/lib/supabase/server.ts`
- `src/lib/supabase/session.ts`
- `src/types/index.ts`

## Problemas corrigidos

### Admin seguro

- Adicionado `src/proxy.ts` para proteger `/admin/:path*` antes da renderização da interface.
- Criado endpoint `POST /admin/api/session` para trocar o login Supabase por cookies HTTP-only.
- Criada validação server-side em `src/lib/supabase/adminAuth.ts`.
- O acesso admin agora exige:
  - usuário autenticado no Supabase;
  - `user.id` presente em `admin_users.user_id`.
- Usuário autenticado que não está em `admin_users` recebe bloqueio e não consegue criar sessão admin.
- O layout client-side continua existindo para UX, mas não é mais a única proteção.

### Simulação bloqueada em produção

- `admin@admin.com/admin` e `localStorage` de simulação agora só funcionam em desenvolvimento.
- Em produção sem Supabase configurado, o código falha de forma explícita.
- Em produção, erro real de Supabase não cai para mock/localStorage.
- Homepage não inicializa com mocks em produção.
- Sincronização Shopee simulada foi limitada ao modo de desenvolvimento.

### Allowed domain

- Criado `src/lib/security/affiliateUrl.ts`.
- Shopee, Amazon e SHEIN recebem domínio padrão seguro:
  - `shopee.com.br`
  - `amazon.com.br`
  - `shein.com`
- `getStores()` e produtos com lojas relacionadas normalizam `allowed_domain`.
- O formulário de produto valida `affiliate_url` antes de adicionar/salvar oferta.
- `/go` segue recusando URLs que não sejam `http/https` ou que não pertençam ao domínio permitido.

### Service role/server-only

- Instalado e registrado `server-only@0.0.1`.
- `src/lib/supabase/server.ts` e `src/lib/supabase/adminAuth.ts` agora são marcados com `import 'server-only'`.
- Removido fallback placeholder inseguro da service role.
- `createSupabaseAdminClient()` lança erro se `SUPABASE_SERVICE_ROLE_KEY` não existir.
- Service role fica restrita a módulos/rotas server-side.

### Lint e qualidade

- Removidos `any` explícitos principais.
- Corrigidos imports/variáveis não usados.
- Removido `Date.now()` do render do `ProductCard`.
- Ajustados os pontos de `set-state-in-effect` que bloqueavam o lint.
- Corrigida agregação de cliques no dashboard admin.

## Pontos pendentes

- `npm run build` ainda precisa ser reexecutado em ambiente Node consistente. Neste ambiente, o Node/NPM disponível é do Windows acessando projeto em WSL por UNC, e o build falha antes de validar o app.
- Confirmar no Supabase real se `admin_users.user_id` está preenchido com o UUID de `auth.users.id`; email sozinho não libera admin.
- Se alguma loja real estiver com `allowed_domain` nulo no banco, salvar a loja pelo admin ou atualizar o registro para persistir o domínio. O runtime já normaliza Shopee/Amazon/SHEIN.
- A sessão admin usa o access token atual salvo em cookie HTTP-only; refresh automático server-side pode ser adicionado depois, mas não foi incluído para manter o escopo do MVP.

## Comandos rodados

### TypeScript

```bash
"/mnt/c/Program Files/nodejs/node.exe" node_modules/typescript/bin/tsc --noEmit
```

Resultado: passou.

### ESLint direto

```bash
"/mnt/c/Program Files/nodejs/node.exe" node_modules/eslint/bin/eslint.js
```

Resultado: passou.

### `npm run lint`

```bash
npm run lint
```

Resultado: falhou por ambiente, não por erro de lint do projeto.

Trecho relevante:

```text
CMD.EXE foi iniciado tendo o caminho acima como pasta atual.
Não há suporte para caminhos UNC.
'eslint' não é reconhecido como um comando interno ou externo
```

### `npm run build`

```bash
npm run build
```

Resultado: falhou por ambiente, não chegou a validar a compilação do app.

Trecho relevante:

```text
CMD.EXE foi iniciado tendo o caminho acima como pasta atual.
Não há suporte para caminhos UNC.
'next' não é reconhecido como um comando interno ou externo
```

### Build direto com Next/Turbopack

```bash
"/mnt/c/Program Files/nodejs/node.exe" node_modules/next/dist/bin/next build
```

Resultado: falhou por conflito UNC do Turbopack.

Trecho relevante:

```text
Cannot depend on path (\\?\UNC\wsl.localhost\Ubuntu\home\yagon\site\src\lib\supabase\client.ts)
outside of root directory (\\wsl.localhost\Ubuntu\home\yagon\site)
```

### Build direto com Webpack

```bash
"/mnt/c/Program Files/nodejs/node.exe" node_modules/next/dist/bin/next build --webpack
```

Resultado: também falhou no ambiente UNC.

Trecho relevante:

```text
Module not found: Error: Can't resolve 'next-flight-client-entry-loader'
```

## Veredito

O hardening prioritário foi aplicado: `/admin` ganhou proteção server-side, admin é validado por `admin_users.user_id`, simulação ficou restrita ao desenvolvimento, links afiliados são validados por domínio, service role ficou server-only e o lint direto está limpo.

Antes do deploy final, falta rodar `npm run build` em um ambiente Node nativo/consistente, preferencialmente dentro do WSL com Node Linux instalado ou em uma pasta Windows local usando Node Windows.
