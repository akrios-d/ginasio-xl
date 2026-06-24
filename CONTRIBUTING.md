# Contributing to Ginásio XL

## Getting started

```bash
git clone <repo-url>
cd ginasio-xl
npm install
ng serve
```

---

## Commit message format

All commits must follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<optional scope>): <description>
```

| Type | When to use |
|------|-------------|
| `feat` | Nova funcionalidade visível ao utilizador |
| `fix` | Correcção de bug |
| `perf` | Melhoria de performance |
| `refactor` | Mudança de código sem nova feature nem bug fix |
| `docs` | Documentação apenas |
| `test` | Adicionar ou actualizar testes |
| `ci` | CI/CD |
| `build` | Build system ou dependências externas |
| `chore` | Tarefas de manutenção (bumps de versão, tooling) |
| `style` | Formatação, espaços — sem alteração de lógica |

Exemplos:

```
feat(treino): adicionar visualização de progressão por exercício
fix(avaliacao): corrigir cálculo de IMC no formulário
chore: bump angular to 22.0.3
```

Breaking changes: adicionar `!` após o tipo ou footer `BREAKING CHANGE:`.

---

## Versioning automático

A versão em `package.json` é incrementada automaticamente no `pre-push` via `scripts/bump-version.js`:

| Commits no push | Bump |
|-----------------|------|
| `feat!` / `BREAKING CHANGE:` | major (X.0.0) |
| `feat` | minor (x.Y.0) |
| `fix` / `perf` / `refactor` | patch (x.y.Z) |
| `chore` / `docs` / `style` / etc. | sem bump |

O bump é feito por amend ao último commit — não aparece como commit separado.

---

## Code style

- Angular 22 com standalone components e signals — sem NgModules
- Sem comentários excepto quando o *porquê* não é óbvio
- Sem abstrações desnecessárias além do que a tarefa exige
- Strings do utilizador sempre em português (PT)

---

## Submeter um pull request

1. Cria um branch a partir de `main`:
   ```bash
   git checkout -b feat/minha-feature
   ```
2. Faz as alterações e testa no browser.
3. Commit com mensagem convencional.
4. Abre pull request contra `main`.

---

## Questões

Contacta **ghfelipe@hotmail.com**.
