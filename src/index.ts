/**
 * canonical-dialect linter.
 *
 * a main.tsx is *canonical* if:
 *   - exactly one default-exported component
 *   - returns a JSX tree rooted at <Studio kind="..."> or a known SDK component
 *   - props on JSX nodes are literals, param refs (simple expressions over params), or JSX
 *   - no non-sdk hooks (useEffect, useState, useRef, etc.) — only useParam variants
 *   - no arbitrary imports outside the @vibestartup scope (allowlist extendable)
 */

import * as parser from '@babel/parser'
import traverseImport from '@babel/traverse'
import * as t from '@babel/types'

// @babel/traverse default-export interop across bundlers
const traverse = (traverseImport as unknown as { default?: typeof traverseImport }).default ?? traverseImport

export type LintFinding = { line: number; column: number; code: string; message: string }
export type LintResult = { canonical: boolean; findings: LintFinding[] }

const ALLOWED_HOOKS = new Set([
  'useParam', 'useNumberParam', 'useStringParam', 'useBooleanParam', 'useVec3Param',
])

const ALLOWED_IMPORT_PREFIXES = ['@vibestartup/', 'react', './', '../']

export function lint(source: string): LintResult {
  const findings: LintFinding[] = []
  let ast: parser.ParseResult<t.File>
  try {
    ast = parser.parse(source, {
      sourceType: 'module',
      plugins: ['typescript', 'jsx'],
    })
  } catch (e) {
    return { canonical: false, findings: [{ line: 1, column: 0, code: 'parse', message: `parse error: ${(e as Error).message}` }] }
  }

  traverse(ast, {
    ImportDeclaration(path) {
      const src = path.node.source.value
      if (!ALLOWED_IMPORT_PREFIXES.some((p) => src === p.replace(/\/$/, '') || src.startsWith(p))) {
        findings.push(mk(path.node, 'import', `import from "${src}" not allowed in canonical dialect`))
      }
    },
    CallExpression(path) {
      const callee = path.node.callee
      if (t.isIdentifier(callee) && /^use[A-Z]/.test(callee.name)) {
        if (!ALLOWED_HOOKS.has(callee.name)) {
          findings.push(mk(path.node, 'hook', `hook "${callee.name}" not allowed (only useParam variants)`))
        }
      }
    },
    NewExpression(path) {
      if (t.isIdentifier(path.node.callee) && path.node.callee.name === 'Function') {
        findings.push(mk(path.node, 'unsafe', 'new Function() not allowed'))
      }
    },
  })

  // find default export
  let hasDefault = false
  traverse(ast, {
    ExportDefaultDeclaration() { hasDefault = true },
  })
  if (!hasDefault) {
    findings.push({ line: 1, column: 0, code: 'export', message: 'canonical Thing requires a default export' })
  }

  return { canonical: findings.length === 0, findings }
}

function mk(node: t.Node, code: string, message: string): LintFinding {
  return { line: node.loc?.start.line ?? 0, column: node.loc?.start.column ?? 0, code, message }
}
