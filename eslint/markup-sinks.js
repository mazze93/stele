// === MARKUP-SINK GATE ===
//
// Policy, stated before the code:
//   In STELE, pasted, extracted, and model-derived content is text, never
//   markup. No source file may reach an HTML-parsing sink, whatever the
//   content's origin: innerHTML, outerHTML, insertAdjacentHTML,
//   document.write / writeln, createContextualFragment, setHTMLUnsafe /
//   parseHTMLUnsafe, dangerouslySetInnerHTML, or an iframe srcdoc.
//
// Today the paste surface (InheritPanel, CollaboratorPanel) is inert because
// React escapes JSX text by default. That protection holds only because no
// one has written a markup-rendering feature yet. This gate makes it hold
// structurally: reaching for a sink fails `pnpm lint`, which CI runs on every
// push and pull request (.github/workflows/typecheck.yml).
//
// Why this repo in particular: ADR-0004. The operator's API key lives in the
// browser tier, so any script injected into bundle.html can read it. An
// unsandboxed srcdoc iframe, or an about:blank iframe filled with
// document.write, inherits the parent page's origin, so markup injected there
// reaches the key as well.
//
// A genuine need to render markup is a reviewed design change, recorded in
// docs/journal/DECISIONS.md: a sandboxed iframe (sandbox="allow-scripts",
// never combined with allow-same-origin) or a vetted sanitizer. It is not an
// inline rule suppression. evals/markup-sinks.test.ts fails on any inline
// directive that switches these rules off, and on any file-wide blanket one.
//
// Flat-config caveat: a rule configured in two config objects is REPLACED by
// the later object, not merged. Add further no-restricted-properties or
// no-restricted-syntax entries here rather than in a new block, or one set
// silently disappears. The eval test fails if the set that disappears is
// this one.
//
// Known perimeter (not caught; separate mitigations if they ever matter):
// sink names computed at runtime (el[name] = x, setAttribute(name, x)),
// aliased documents (const d = document; d.write(x)), DOMParser output
// imported into the live document, and inline script in site/public/*.html,
// which ESLint does not lint.

// Every message carries this tag so the eval test can tell this gate's
// reports from any other no-restricted-* entry added later.
export const MARKUP_SINK_TAG = '[markup-sink]'

const SINK_MESSAGE =
  `${MARKUP_SINK_TAG} HTML-parsing sink. STELE renders pasted, extracted, ` +
  'and model-derived content as text only. See eslint/markup-sinks.js.'

const SRCDOC_MESSAGE =
  `${MARKUP_SINK_TAG} srcdoc. An unsandboxed srcdoc iframe inherits this ` +
  "page's origin, and with it the operator's API key (ADR-0004). " +
  'See eslint/markup-sinks.js.'

// --- member access: el.innerHTML, el['innerHTML'], destructuring ---
const SINK_PROPERTIES = [
  'innerHTML',
  'outerHTML',
  'insertAdjacentHTML',
  'createContextualFragment',
  'setHTMLUnsafe',
  'parseHTMLUnsafe',
]

const restrictedProperties = [
  ...SINK_PROPERTIES.map(property => ({ property, message: SINK_MESSAGE })),
  { property: 'srcdoc', message: SRCDOC_MESSAGE },
]

// --- syntax shapes member access does not see ---
const SINK_KEY = '/^(innerHTML|outerHTML|dangerouslySetInnerHTML)$/'
const SRCDOC_KEY = '/^srcdoc$/i' // DOM spells it srcdoc, React spells it srcDoc

const restrictedSyntax = [
  // JSX props
  { selector: "JSXAttribute[name.name='dangerouslySetInnerHTML']", message: SINK_MESSAGE },
  { selector: `JSXAttribute[name.name=${SRCDOC_KEY}]`, message: SRCDOC_MESSAGE },

  // Object-literal keys: Object.assign(el, { innerHTML }), createElement('iframe', { srcDoc })
  { selector: `Property[key.name=${SINK_KEY}]`, message: SINK_MESSAGE },
  { selector: `Property[key.value=${SINK_KEY}]`, message: SINK_MESSAGE },
  { selector: `Property[key.name=${SRCDOC_KEY}]`, message: SRCDOC_MESSAGE },
  { selector: `Property[key.value=${SRCDOC_KEY}]`, message: SRCDOC_MESSAGE },

  // Attribute writes by literal name
  { selector: `CallExpression[callee.property.name='setAttribute'][arguments.0.value=${SRCDOC_KEY}]`, message: SRCDOC_MESSAGE },
  { selector: `CallExpression[callee.property.name='setAttributeNS'][arguments.1.value=${SRCDOC_KEY}]`, message: SRCDOC_MESSAGE },

  // document.write / writeln, including iframe.contentDocument.write and win.document.write.
  // Spelled as an alternation on purpose: /^writeln?$/ matched writeln but
  // NOT write under this esquery — caught by the eval, not by reading.
  { selector: "MemberExpression[property.name=/^(write|writeln)$/][object.name='document']", message: SINK_MESSAGE },
  { selector: 'MemberExpression[property.name=/^(write|writeln)$/][object.property.name=/^(document|contentDocument)$/]', message: SINK_MESSAGE },
]

export const markupSinkGate = {
  name: 'stele/markup-sink-gate',
  files: ['**/*.{ts,tsx}'],
  rules: {
    'no-restricted-properties': ['error', ...restrictedProperties],
    'no-restricted-syntax': ['error', ...restrictedSyntax],
  },
}
