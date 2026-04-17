# @vibestartup/thing-lint

canonical-dialect linter for vibestartup Things. parses `main.tsx`, checks
that it stays in the subset the editor can roundtrip via the concrete-syntax
printer.

canonical rules:
- default-exports a function component
- imports only `@vibestartup/*` packages (plus `react`)
- no non-SDK hooks (no `useEffect`, `useState`, etc. — only `useParam`
  variants)
- no `new Function`, no `eval`

```ts
import { lint } from '@vibestartup/thing-lint'
const { canonical, findings } = lint(source)
```

MIT.
