# Revisão de Código e Segurança - Achadinhos

Data da revisão inicial: 2026-05-26  
Atualização pós-hardening: 2026-05-26  
Projeto analisado: `/home/yagon/site`

## Resumo executivo

O projeto implementa uma vitrine afiliada de achadinhos com homepage, cards, página de produto, rota `/go`, painel admin, upload de imagens, estatísticas e integração Supabase. A ideia do MVP está consistente e a arquitetura continua adequada para a fase atual.

Após a etapa de hardening pré-deploy, os principais riscos apontados na revisão inicial foram tratados: `/admin` deixou de depender apenas de `useEffect` client-side, usuários admin agora são validados por `admin_users.user_id`, o modo mock ficou restrito a desenvolvimento, links afiliados passaram por validação de domínio e a service role foi isolada em módulos `server-only`.

O ponto ainda pendente para deploy final é ambiental: `npm run build` precisa ser reexecutado em Node nativo/consistente. Neste ambiente, o Node/NPM disponível é do Windows acessando o projeto no WSL por UNC, e o build falha antes de validar a aplicação.

## Relatório complementar

O detalhamento da etapa de hardening está em:

- `PRE_DEPLOY_HARDENING.md`

Este arquivo é a revisão consolidada pós-modificações.

## Escopo e limitações

- O diretório não é um repositório Git, então a revisão considerou o estado atual dos arquivos.
- As políticas RLS reais do Supabase não estão versionadas no projeto; a auditoria depende do que está aplicado no painel Supabase.
- Seguindo o `AGENTS.md`, a documentação local do Next em `node_modules/next/dist/docs/` foi consultada para App Router, Proxy, Route Handlers, cookies, variáveis de ambiente e segurança de dados.

## Validações executadas

| Validação | Resultado | Observação |
| --- | --- | --- |
| TypeScript direto: `node.exe node_modules/typescript/bin/tsc --noEmit` | Passou | Sem erros de tipo. |
| ESLint direto: `node.exe node_modules/eslint/bin/eslint.js` | Passou | Lint do projeto limpo no caminho direto. |
| `npm run lint` | Falhou por ambiente | O `npm` chamado é Windows via UNC e não encontra `eslint`. |
| `npm run build` | Falhou por ambiente | O `npm` chamado é Windows via UNC e não encontra `next`. |
| `next build` direto via Turbopack | Falhou por ambiente | Turbopack aborta por conflito de paths UNC/WSL. |
| `next build --webpack` direto | Falhou por ambiente | Webpack não resolve loader interno neste contexto UNC. |

## Correções aplicadas

### Admin seguro

Status: corrigido.

- Adicionado `src/proxy.ts` para proteger `/admin/:path*` antes da UI carregar.
- Criado `POST /admin/api/session` para gravar sessão admin em cookies HTTP-only.
- Criado `src/lib/supabase/adminAuth.ts` com validação server-side.
- O acesso admin agora exige usuário autenticado no Supabase e presença de `auth.users.id` em `admin_users.user_id`.
- Usuários autenticados sem permissão admin são bloqueados.
- O layout client-side continua existindo apenas como UX; não é mais a única barreira.

### Simulação em produção

Status: corrigido.

- `admin@admin.com/admin` só funciona em desenvolvimento.
- Mock/localStorage só é usado em desenvolvimento.
- Em produção, Supabase mal configurado falha explicitamente.
- Erro real de Supabase em produção não cai para dados mockados.

### Links afiliados e allowed domain

Status: corrigido no runtime e no fluxo admin.

- Criado `src/lib/security/affiliateUrl.ts`.
- Shopee, Amazon e SHEIN recebem domínios padrão:
  - `shopee.com.br`
  - `amazon.com.br`
  - `shein.com`
- `ProductForm` valida `affiliate_url` antes de adicionar oferta.
- `/go` recusa URLs sem `http/https` ou fora do domínio permitido.

### Service role

Status: corrigido.

- Adicionado `server-only@0.0.1`.
- `src/lib/supabase/server.ts` e `src/lib/supabase/adminAuth.ts` foram marcados com `import 'server-only'`.
- Removido fallback placeholder da service role.
- `createSupabaseAdminClient()` falha se `SUPABASE_SERVICE_ROLE_KEY` não estiver configurada.

### Lint

Status: corrigido no lint direto.

- Removidos `any` explícitos principais.
- Corrigidos imports e variáveis não usados.
- Removido `Date.now()` do render do `ProductCard`.
- Ajustados erros de `set-state-in-effect`.
- Corrigida agregação de cliques no dashboard admin.

## Segurança atual

Pontos fortes após hardening:

- `/admin` agora tem barreira server-side via Proxy.
- Permissão admin depende de `admin_users.user_id`, não só de login válido.
- Tokens admin são mantidos em cookies HTTP-only.
- Service role está isolada de client-side.
- Rota `/go` reduz risco de open redirect e XSS refletido.
- Mocks não mascaram erros reais em produção.

Pontos ainda recomendados:

- Confirmar no Supabase real se `admin_users.user_id` está preenchido com UUID de `auth.users.id`.
- Versionar as políticas RLS em arquivo SQL dentro do projeto.
- Adicionar rate limiting no `/go` para reduzir spam de cliques.
- Adicionar headers de segurança/CSP antes do deploy público.
- Implementar refresh server-side da sessão admin no futuro, se o painel precisar ficar aberto por longos períodos.

## Pendências antes do deploy

1. Rodar `npm run build` em ambiente Node consistente.
2. Confirmar `admin_users.user_id` no Supabase real.
3. Testar com usuário autenticado não-admin.
4. Testar criar produto, editar oferta, upload de imagem, clique `/go` e estatísticas.
5. Persistir `allowed_domain` no banco para qualquer loja real que ainda esteja nula.

## Veredito

O hardening prioritário foi aplicado. O projeto está mais seguro e previsível do que na revisão inicial, com TypeScript e ESLint direto passando. Eu consideraria o código em bom estado para homologação funcional, mas ainda não marcaria como pronto para deploy final até um build limpo em ambiente Node nativo/consistente.
