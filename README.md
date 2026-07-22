# OpenCheck

OpenCheck gives public GitHub repositories a quick contribution-readiness check.

It looks for six practical signals:

- README
- Open-source license
- Contribution guide
- Issue templates
- Pull request template
- An open issue labeled `good first issue`

The score is guidance, not a verdict on project quality. OpenCheck reads public data through the GitHub REST API and does not require a login or access token.

## Local development

```bash
npm install
npm run dev
```

Run the automated checks with:

```bash
npm test
```
