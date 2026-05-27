# FINAL_VALIDATION.md

# Validação Final Pós-Hardening - Achadinhos

## Escopo

Validação pós-hardening focada em segurança, fluxo real com Supabase e regressões principais. Não foram adicionadas funcionalidades, não houve alteração de layout e não houve refatoração ampla.

## Arquivos Alterados Nesta Validação

- `src/lib/supabase/clicksServer.ts`
- `src/app/go/[productSlug]/route.ts`
- `FINAL_VALIDATION.md`

## O Que Foi Testado

### 1. Admin

- Conferido que `/admin` está protegido server-side por `src/proxy.ts`.
- Conferido que `/admin/login` e `/admin/api/session` ficam fora do bloqueio do proxy.
- Conferido que a sessão admin é validada por `admin_users.user_id` em `src/lib/supabase/adminAuth.ts`.
- Consultado Supabase com service role:
  - existe 1 linha em `admin_users`;
  - a linha possui `user_id`;
  - o `user_id` corresponde a um usuário real do Supabase Auth.
- Cenário de usuário não-admin autenticado não pôde ser testado end-to-end porque o Supabase atual possui apenas 1 usuário Auth, e ele é admin.
- Cenário anônimo foi validado por leitura de código: sem cookie `achadinhos_admin_access_token`, o proxy redireciona para `/admin/login`.

### 2. Produtos

- Conferido fluxo de código de criação/edição em `ProductForm` e `saveProduct`.
- Conferido que a homepage filtra `products.filter((p) => p.is_active)`.
- Consultado banco real:
  - 6 produtos amostrados;
  - 6 ativos;
  - 0 inativos;
  - 3 destaques ativos;
  - todos os produtos ativos amostrados possuem imagem e oferta ativa.
- Como não há produto inativo no banco atual, a validação real de "produto inativo não aparece" ficou dependente de teste manual ou fixture temporária.

### 3. Ofertas

- Conferido que o admin impede loja duplicada no mesmo produto por `store_id`: ao selecionar loja já existente, a oferta é editada/substituída, não duplicada.
- Conferido que `affiliate_url` é validado no admin por `getAffiliateUrlValidationError`.
- Conferido que `/go` valida `affiliate_url` com `isAllowedAffiliateUrl` antes de redirecionar.
- Consultado banco real:
  - Shopee, Amazon e SHEIN possuem `allowed_domain` correto;
  - nenhuma oferta ativa amostrada viola o domínio permitido;
  - nenhuma duplicidade de loja por produto foi encontrada.

### 4. Upload de Imagens

- Conferido que o bucket `product-images` existe.
- Conferido que o bucket está público para leitura.
- Teste de upload anônimo:
  - bloqueado por RLS, como esperado.
- Teste de upload com service role:
  - upload funcionou;
  - leitura indireta/URL pública é compatível com bucket público;
  - arquivo de validação foi removido.
- Upload autenticado via UI admin ainda depende de teste manual com login admin real no navegador.
- Reordenar/remover imagens foi validado por leitura de código em `ProductForm`; teste visual/manual ainda recomendado.

### 5. Homepage Pública

- Conferido que a homepage carrega `getProducts`, `getCategories` e `getClickStats`.
- Consultado Supabase real com anon key:
  - leitura de `products` permitida;
  - leitura de `categories` permitida;
  - leitura de `stores` permitida;
  - leitura de `product_offers` permitida;
  - leitura de `product_images` permitida.
- Categorias esperadas existem e estão ativas no banco:
  - `blusas`
  - `calcas`
  - `vestidos`
  - `tenis`
  - `acessorios`
  - `beleza`
  - `perfumes`
- As abas fixas `Novidades` e `Mais clicados` continuam presentes em `CategoryTabs`.
- `Produtos em destaque`, `Novidades` e `Mais clicados` continuam montados na homepage.

### 6. Rota `/go`

- Conferido que `/go/[productSlug]?store=...` busca produto ativo e oferta ativa.
- Conferido que URLs fora de `http/https` são recusadas por `isAllowedAffiliateUrl`.
- Conferido que o hostname precisa ser igual ou subdomínio do `allowed_domain`.
- Conferido que não há open redirect direto por query string: o redirect usa apenas `affiliate_url` salvo no banco e validado.
- Conferido que erros HTML usam escape via `escapeHTML`, reduzindo risco de XSS refletido.
- Teste real pré-correção:
  - insert anônimo em `clicks` falhou com RLS: `new row violates row-level security policy for table "clicks"`.
- Correção aplicada:
  - `/go` passou a registrar clique via módulo server-only com service role.
- Teste pós-correção:
  - insert com service role em `clicks` funcionou;
  - registro foi lido de volta;
  - registro de validação foi removido.
- Teste HTTP end-to-end da rota foi tentado com Next dev, mas o ambiente Windows Node + WSL/UNC reiniciou o servidor por erros de watcher e fechou conexão. Não foi feita alteração de código por esse problema de ambiente.

### 7. Estatísticas

- Conferido que `/admin/estatisticas` fica sob o matcher protegido `/admin/:path*`.
- Conferido que a tela usa helpers de cliques e agregações tipadas.
- Consultado Supabase real:
  - leitura anônima de `admin_users` não expôs linhas;
  - leitura anônima de `clicks` retornou 0 linhas;
  - insert anônimo em `clicks` foi bloqueado por RLS.
- Clique registrado por service role foi validado e removido em seguida.
- Visualização do clique em `/admin/estatisticas` ainda depende de teste manual com sessão admin real.

### 8. Produção

- Conferido que `isSimulationMode()` só retorna verdadeiro fora de produção e sem Supabase configurado.
- Conferido que `admin@admin.com/admin` só é aceito no ramo de simulação.
- Conferido que em produção, sem env pública do Supabase, `client.ts` lança erro explícito.
- Conferido que `dataManager` bloqueia fallback mock fora do modo de simulação.
- Conferido que mocks/localStorage continuam restritos a `isSimulationMode()`.

### 9. Allowed Domain

Resultado no banco real:

| Loja | `allowed_domain` | Esperado | Status |
| --- | --- | --- | --- |
| Shopee | `shopee.com.br` | `shopee.com.br` | OK |
| Amazon | `amazon.com.br` | `amazon.com.br` | OK |
| SHEIN | `shein.com` | `shein.com` | OK |

SQL de correção: não necessário, pois os três domínios já estão corretos.

SQL seguro caso seja necessário reaplicar futuramente:

```sql
update public.stores
set allowed_domain = 'shopee.com.br'
where slug = 'shopee'
  and (allowed_domain is null or lower(allowed_domain) <> 'shopee.com.br');

update public.stores
set allowed_domain = 'amazon.com.br'
where slug = 'amazon'
  and (allowed_domain is null or lower(allowed_domain) <> 'amazon.com.br');

update public.stores
set allowed_domain = 'shein.com'
where slug = 'shein'
  and (allowed_domain is null or lower(allowed_domain) <> 'shein.com');
```

## O Que Passou

- TypeScript direto passou.
- ESLint direto passou.
- Supabase real está configurado no `.env.local`.
- `admin_users` possui admin com `user_id` válido.
- Lojas obrigatórias possuem `allowed_domain` correto.
- Categorias públicas esperadas existem no banco.
- Produtos ativos possuem imagens e ofertas.
- Ofertas ativas respeitam os domínios permitidos.
- Não foram encontradas lojas duplicadas no mesmo produto.
- Bucket `product-images` existe.
- Upload anônimo no bucket é bloqueado.
- Upload via service role no bucket funciona e foi limpo.
- RLS bloqueia insert anônimo em `clicks`.
- Gravação de clique com service role funciona.
- Service role continua isolada em módulos `server-only`.

## O Que Falhou

### Falha Real Corrigida

- `/go` tentava registrar clique usando o cliente anon do Supabase.
- O banco real bloqueia insert anônimo em `clicks` por RLS.
- Resultado antes da correção: redirect podia acontecer, mas o clique não era registrado.

Correção:

- Criado `src/lib/supabase/clicksServer.ts` com `import 'server-only'`.
- Atualizado `src/app/go/[productSlug]/route.ts` para registrar clique com service role no servidor.

### Falhas de Ambiente

- `npm run lint` falhou por Windows Node/CMD em caminho UNC:
  - `CMD.EXE foi iniciado tendo o caminho acima como pasta atual`
  - `Não há suporte para caminhos UNC`
  - `'eslint' não é reconhecido`
- `npm run build` falhou pelo mesmo problema UNC:
  - `'next' não é reconhecido`
- Build direto com Turbopack falhou por inconsistência UNC:
  - `Cannot depend on path (\\?\UNC\wsl.localhost\Ubuntu\home\yagon\site\src\lib\supabase\client.ts) outside of root directory`
- Build direto com webpack falhou também no ambiente UNC:
  - `Can't resolve 'next-flight-client-entry-loader'`
- `next dev` subiu, mas reiniciou repetidamente por `Watchpack Error: EISDIR` em `\\wsl.localhost`.

Nenhuma dessas falhas indicou erro real de TypeScript/ESLint do projeto.

## O Que Foi Corrigido

- Bug de registro de clique em `/go` com RLS real.
- Antes: insert de clique dependia do cliente anon.
- Depois: insert de clique da rota `/go` usa service role em módulo server-only.
- O helper client-side `registerAffiliateClick` foi preservado para não reescrever o projeto nem alterar fluxos fora do escopo.

## O Que Ainda Depende De Teste Manual

- Login real no navegador com o usuário admin.
- Bloqueio de usuário autenticado não-admin, porque o Supabase atual não possui usuário não-admin para teste.
- Criação de produto via UI admin.
- Edição de produto via UI admin.
- Ativar/desativar produto via UI admin.
- Confirmar visualmente que produto inativo não aparece, usando um produto inativo real ou fixture temporária.
- Adicionar/editar ofertas Shopee, Amazon e SHEIN pelo formulário.
- Testar bloqueio visual de `affiliate_url` inválido no formulário.
- Upload autenticado pelo admin para `product-images`.
- Confirmar imagem principal no card.
- Confirmar galeria na página do produto.
- Remover/reordenar imagem via UI.
- Confirmar clique novo aparecendo em `/admin/estatisticas` com sessão admin real.
- Rodar `npm install`, `npm run lint` e `npm run build` em caminho Windows nativo, fora de `\\wsl.localhost`.

## Comandos Rodados

```bash
npm run lint
npm run build
"/mnt/c/Program Files/nodejs/node.exe" node_modules/typescript/bin/tsc --noEmit
"/mnt/c/Program Files/nodejs/node.exe" node_modules/eslint/bin/eslint.js
"/mnt/c/Program Files/nodejs/node.exe" node_modules/next/dist/bin/next build
"/mnt/c/Program Files/nodejs/node.exe" node_modules/next/dist/bin/next build --webpack
"/mnt/c/Program Files/nodejs/node.exe" node_modules/next/dist/bin/next dev -p 3010
```

Também foram rodados scripts Node temporários via stdin para:

- checar variáveis Supabase sem imprimir segredos;
- consultar lojas/categorias/produtos/admins;
- checar RLS anon;
- testar insert anon em `clicks`;
- testar insert service role em `clicks`;
- testar bucket `product-images`;
- testar upload anônimo e service role.

## Resultado De `npm run lint`

Falhou por ambiente Windows/UNC antes de executar o ESLint corretamente:

```text
'\\wsl.localhost\Ubuntu\home\yagon\site'
CMD.EXE foi iniciado tendo o caminho acima como pasta atual.
Não há suporte para caminhos UNC.
'eslint' não é reconhecido como um comando interno ou externo.
```

Validação alternativa:

```bash
"/mnt/c/Program Files/nodejs/node.exe" node_modules/eslint/bin/eslint.js
```

Resultado: passou sem erros.

## Resultado De `npm run build`

Falhou por ambiente Windows/UNC antes de executar o Next corretamente:

```text
'\\wsl.localhost\Ubuntu\home\yagon\site'
CMD.EXE foi iniciado tendo o caminho acima como pasta atual.
Não há suporte para caminhos UNC.
'next' não é reconhecido como um comando interno ou externo.
```

Validações alternativas:

- `next build` direto com Turbopack: falhou por caminho UNC inconsistente.
- `next build --webpack`: falhou tentando resolver loader interno do Next em caminho UNC.

Resultado: build ainda precisa ser rodado em ambiente Windows nativo ou Node Linux nativo, fora do caminho UNC.

## Pronto Para Copiar Para Windows?

Sim, o projeto está pronto para copiar para uma pasta Windows nativa e rodar:

```bash
npm install
npm run lint
npm run build
```

O código passou em TypeScript e ESLint diretos, o banco real foi validado nos pontos críticos, e o único bug real encontrado na validação foi corrigido. A aprovação final de deploy ainda depende de um `npm run build` limpo em ambiente nativo consistente e dos testes manuais de UI admin listados acima.
