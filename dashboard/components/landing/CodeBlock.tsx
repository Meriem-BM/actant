import { Fragment, type ReactNode } from 'react'

type CodeLanguage = 'auto' | 'bash' | 'ts' | 'tsx' | 'js'

interface CodeBlockProps {
  children: ReactNode
  language?: CodeLanguage
}

type TokenKind =
  | 'plain'
  | 'comment'
  | 'string'
  | 'number'
  | 'keyword'
  | 'literal'
  | 'function'
  | 'type'
  | 'command'
  | 'variable'
  | 'flag'

type Token = {
  value: string
  kind: TokenKind
}

const TS_KEYWORDS = new Set([
  'import',
  'from',
  'export',
  'default',
  'const',
  'let',
  'var',
  'if',
  'else',
  'return',
  'await',
  'async',
  'new',
  'for',
  'while',
  'try',
  'catch',
  'throw',
  'interface',
  'type',
  'extends',
  'as',
])

const TS_LITERALS = new Set(['true', 'false', 'null', 'undefined'])

const BASH_COMMANDS = new Set([
  'npm',
  'bun',
  'pnpm',
  'yarn',
  'npx',
  'cd',
  'cp',
  'mv',
  'rm',
  'cat',
  'echo',
  'make',
  'forge',
  'git',
])

const TS_TOKEN_PATTERN =
  /(\/\/.*$|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`|\b\d+(?:\.\d+)?\b|\b[A-Za-z_][A-Za-z0-9_]*\b)/g
const BASH_TOKEN_PATTERN =
  /(#.*$|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|\$[A-Za-z_][A-Za-z0-9_]*|--?[A-Za-z0-9-]+|\b\d+(?:\.\d+)?\b|\b[A-Za-z_][A-Za-z0-9_-]*\b)/g

function toCode(value: ReactNode): string {
  if (typeof value === 'string') {
    return value
  }
  if (typeof value === 'number') {
    return String(value)
  }
  return String(value ?? '')
}

function resolveLanguage(code: string, preferred: CodeLanguage): 'bash' | 'ts' {
  if (preferred === 'bash') return 'bash'
  if (preferred === 'ts' || preferred === 'tsx' || preferred === 'js') return 'ts'

  const sample = code.trim()
  if (
    sample.includes('import ') ||
    sample.includes('const ') ||
    sample.includes('await ') ||
    sample.includes('=>')
  ) {
    return 'ts'
  }
  return 'bash'
}

function tokenizeLine(
  line: string,
  pattern: RegExp,
  classify: (value: string, start: number) => TokenKind,
): Token[] {
  const tokens: Token[] = []
  let cursor = 0
  let match: RegExpExecArray | null

  pattern.lastIndex = 0
  while ((match = pattern.exec(line))) {
    const start = match.index
    if (start > cursor) {
      tokens.push({ value: line.slice(cursor, start), kind: 'plain' })
    }
    const value = match[0]
    tokens.push({ value, kind: classify(value, start) })
    cursor = start + value.length
  }

  if (cursor < line.length) {
    tokens.push({ value: line.slice(cursor), kind: 'plain' })
  }

  if (tokens.length === 0) {
    tokens.push({ value: '', kind: 'plain' })
  }

  return tokens
}

function highlightTs(line: string): Token[] {
  return tokenizeLine(line, TS_TOKEN_PATTERN, (value, start) => {
    if (value.startsWith('//')) return 'comment'
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'")) ||
      (value.startsWith('`') && value.endsWith('`'))
    ) {
      return 'string'
    }
    if (/^\d/.test(value)) return 'number'
    if (TS_KEYWORDS.has(value)) return 'keyword'
    if (TS_LITERALS.has(value)) return 'literal'
    if (/^[A-Z]/.test(value)) return 'type'

    const tail = line.slice(start + value.length)
    if (/^\s*\(/.test(tail)) {
      return 'function'
    }

    return 'plain'
  })
}

function highlightBash(line: string): Token[] {
  const firstWord = line.trimStart().split(/\s+/)[0] ?? ''

  return tokenizeLine(line, BASH_TOKEN_PATTERN, (value) => {
    if (value.startsWith('#')) return 'comment'
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      return 'string'
    }
    if (value.startsWith('$')) return 'variable'
    if (value.startsWith('-')) return 'flag'
    if (/^\d/.test(value)) return 'number'
    if (value === firstWord || BASH_COMMANDS.has(value)) return 'command'
    return 'plain'
  })
}

export default function CodeBlock({ children, language = 'auto' }: CodeBlockProps) {
  const code = toCode(children).replace(/\r\n/g, '\n')
  const resolved = resolveLanguage(code, language)
  const lines = code.split('\n')

  return (
    <pre className="code-block">
      <code>
        {lines.map((line, lineIndex) => {
          const tokens = resolved === 'bash' ? highlightBash(line) : highlightTs(line)
          return (
            <Fragment key={`${line}-${lineIndex}`}>
              <span className="code-line">
                {tokens.map((token, tokenIndex) => (
                  <span
                    key={`${token.value}-${tokenIndex}`}
                    className={`code-token code-token--${token.kind}`}
                  >
                    {token.value || '\u00A0'}
                  </span>
                ))}
              </span>
              {lineIndex < lines.length - 1 ? '\n' : null}
            </Fragment>
          )
        })}
      </code>
    </pre>
  )
}
