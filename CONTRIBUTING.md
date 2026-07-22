# Contributing to OpenCheck

Thanks for taking the time to improve OpenCheck. Contributions of any size are
welcome, especially fixes that make the checker clearer, more reliable, or
easier to use.

## Before you start

- Check the existing issues to avoid duplicate work.
- Small fixes can go straight to a pull request.
- For a new feature or a larger change, open an issue first so the idea can be
  discussed before you spend time building it.
- Look for issues labeled `good first issue` if this is your first contribution.

## Local setup

OpenCheck requires Node.js `^20.19.0` or `>=22.12.0`.

```bash
git clone https://github.com/zanmstfa/opencheck.git
cd opencheck
npm install
npm run dev
```

The development server will print a local URL. Open it in your browser and try
checking a public GitHub repository.

## Making a change

1. Create a branch from `main`:

   ```bash
   git switch -c type/short-description
   ```

2. Keep the change focused. Use the existing JavaScript and CSS style: two-space
   indentation, single quotes in JavaScript, and no semicolons.
3. Add or update tests when behavior changes.
4. Run the checks before opening a pull request:

   ```bash
   npm test
   npm run build
   ```

Useful branch prefixes include `feat/`, `fix/`, `docs/`, `test/`, and `chore/`.

## Commit messages

Use a short message that explains the change:

```text
feat: add shareable report links
fix: handle repository URLs with query parameters
docs: clarify local setup
```

## Pull requests

In the pull request, explain what changed, why it helps, and how you tested it.
Link the related issue with `Closes #123` when there is one. Screenshots are
helpful for visible interface changes.

Please be open to feedback. Reviews are about making the project better, not
about judging the contributor.
