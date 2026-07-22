# OpenCheck

[![CI](https://github.com/zanmstfa/opencheck/actions/workflows/ci.yml/badge.svg)](https://github.com/zanmstfa/opencheck/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-65f4ce.svg)](LICENSE)

OpenCheck gives public GitHub repositories a quick contribution-readiness
check. Paste a repository URL and get a focused report showing what is ready
for contributors and what could be improved next.

OpenCheck is guidance, not a verdict on project quality. It reads public data
through the GitHub REST API and does not require a login or access token.

## What OpenCheck checks

Each report looks for six practical signals:

- A root `README`
- An open-source `LICENSE`
- A contribution guide
- Issue templates
- A pull request template
- An open issue labeled `good first issue`

The six checks are combined into a readiness score. Missing items include a
short next step, so the report stays useful instead of only showing a number.

## Using OpenCheck

Enter any public GitHub repository using one of these formats:

```text
https://github.com/owner/repository
github.com/owner/repository
owner/repository
```

OpenCheck does not support private repositories. Checks use GitHub's public API,
so repeated requests may temporarily reach GitHub's unauthenticated rate limit.

## Local development

OpenCheck requires Node.js `^20.19.0` or `>=22.12.0`.

```bash
git clone https://github.com/zanmstfa/opencheck.git
cd opencheck
npm install
npm run dev
```

The development server will print the local URL to open in your browser.

## Testing and production build

Run the automated tests:

```bash
npm test
```

Create the production build:

```bash
npm run build
```

Both commands also run automatically for pull requests through GitHub Actions.

## Contributing

Contributions are welcome. Read [CONTRIBUTING.md](CONTRIBUTING.md) for setup,
branch, testing, and pull request guidance. Beginner-friendly tasks are marked
with the `good first issue` label.

## License

OpenCheck is available under the [MIT License](LICENSE).
