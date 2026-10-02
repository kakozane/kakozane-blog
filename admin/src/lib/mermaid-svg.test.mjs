import assert from 'node:assert/strict'
import test from 'node:test'

import { mermaidSVGWidth } from './mermaid-svg.ts'

test('Mermaid preview uses its SVG width without stretching', () => {
  assert.equal(mermaidSVGWidth('<svg width="100%" viewBox="4 4 196 164"></svg>'), 196)
  assert.equal(mermaidSVGWidth('<svg></svg>'), undefined)
})
