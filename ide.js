const $ = id => document.getElementById(id);
const slug = new URLSearchParams(location.search).get('exercise');
const storageKey = `frontend-practice:draft:${slug}`;
let sources = {}, original = {}, active = 'index.html', revision = 0, busy = false, leaveEditor = false;
const names = { 'index.html': 'HTML', 'style.css': 'CSS', 'script.js': 'JavaScript' };
// Keep histories per file: assigning textarea.value when switching tabs clears
// the browser's native undo stack, and setRangeText does not create undo steps.
const histories = {};
let beforeEdit = null;
function snapshotEditor() {
  const editor = $('editor');
  return { value: editor.value, start: editor.selectionStart, end: editor.selectionEnd, direction: editor.selectionDirection };
}
function history() { return histories[active] ||= { undo: [], redo: [] }; }
function remember(before) {
  if (!before || before.value === $('editor').value) return;
  const stack = history();
  stack.undo.push(before);
  if (stack.undo.length > 200) stack.undo.shift();
  stack.redo = [];
}
function restoreEdit(redo = false) {
  hideSuggestions();
  const stack = history(), from = redo ? stack.redo : stack.undo, to = redo ? stack.undo : stack.redo;
  const state = from.pop();
  if (!state) return;
  to.push(snapshotEditor());
  $('editor').value = state.value;
  $('editor').setSelectionRange(state.start, state.end, state.direction);
  beforeEdit = null;
  save();
}
function indentSelection(outdent) {
  const editor = $('editor'), before = snapshotEditor();
  const { value, start, end } = before;
  if (start === end && !outdent) {
    editor.setRangeText('  ', start, end, 'end');
  } else {
    const first = start === 0 ? 0 : value.lastIndexOf('\n', start - 1) + 1;
    // A selection ending at the next line's start does not include that line.
    const last = end > start && value[end - 1] === '\n' ? end - 1 : end;
    const newline = value.indexOf('\n', last);
    const limit = newline === -1 ? value.length : newline;
    const lines = value.slice(first, limit).split('\n');
    let offset = first;
    const edits = lines.map(line => {
      const remove = outdent ? (line.match(/^( {1,2}|\t)/)?.[0].length || 0) : 0;
      const edit = { at: offset, remove, insert: outdent ? '' : '  ' };
      offset += line.length + 1;
      return edit;
    });
    function move(position) {
      return position + edits.reduce((delta, edit) => {
        if (edit.at > position) return delta;
        return delta + edit.insert.length - Math.min(edit.remove, position - edit.at);
      }, 0);
    }
    const replacement = lines.map((line, i) => edits[i].insert + line.slice(edits[i].remove)).join('\n');
    editor.setRangeText(replacement, first, limit, 'preserve');
    editor.setSelectionRange(move(start), move(end), before.direction);
  }
  remember(before);
  save();
}

const completions = {
  "index.html": [
    "div",
    "button",
    "input",
    "label",
    "form",
    "section",
    "span",
    "p",
    "ul",
    "li",
    "a",
    "script",
    "link",
    "class",
    "id",
    "type",
    "placeholder",
    "aria-label"
  ],
  "style.css": [
    "display",
    "justify-content",
    "align-items",
    "background-color",
    "color",
    "padding",
    "margin",
    "gap",
    "border",
    "border-radius",
    "font-size",
    "font-weight",
    "width",
    "height",
    "max-width",
    "position",
    "transition",
    "grid-template-columns",
    "@media"
  ],
  "script.js": [
    "document.getElementById",
    "document.querySelector",
    "document.querySelectorAll",
    "document.createElement",
    "addEventListener",
    "classList.add",
    "classList.remove",
    "classList.toggle",
    "textContent",
    "console.log",
    "const",
    "let",
    "function",
    "if",
    "forEach",
    "preventDefault",
    "setInterval",
    "setTimeout",
    "JSON.parse",
    "JSON.stringify",
    "localStorage.getItem",
    "localStorage.setItem",
    "fetch"
  ]
};
const cssColors = ('transparent currentColor black white red green blue yellow orange purple pink gray grey silver navy teal aqua cyan lime olive maroon fuchsia magenta gold coral tomato salmon crimson indigo violet rebeccapurple chocolate brown beige ivory snow whitesmoke lightgray darkgray darkred darkgreen darkblue lightblue skyblue royalblue steelblue dodgerblue deepskyblue turquoise aquamarine seagreen forestgreen chartreuse greenyellow khaki lavender plum orchid hotpink deeppink mistyrose peachpuff tan wheat sienna slategray darkslategray aliceblue antiquewhite bisque blanchedalmond blueviolet burlywood cadetblue cornflowerblue cornsilk darkcyan darkgoldenrod darkgrey darkkhaki darkmagenta darkolivegreen darkorange darkorchid darksalmon darkseagreen darkslateblue darkslategrey darkturquoise darkviolet dimgray dimgrey firebrick floralwhite gainsboro ghostwhite goldenrod honeydew indianred lawngreen lemonchiffon lightcoral lightcyan lightgoldenrodyellow lightgreen lightgrey lightpink lightsalmon lightseagreen lightskyblue lightslategray lightslategrey lightsteelblue lightyellow linen mediumaquamarine mediumblue mediumorchid mediumpurple mediumseagreen mediumslateblue mediumspringgreen mediumturquoise mediumvioletred midnightblue mintcream moccasin navajowhite oldlace olivedrab orangered palegoldenrod palegreen paleturquoise palevioletred papayawhip peru powderblue rosybrown saddlebrown sandybrown seashell slateblue slategrey springgreen thistle yellowgreen rgb rgba hsl hsla').split(' ');
const cssLengths = ['auto', '0', 'min-content', 'max-content', 'fit-content'];
const cssValues = {
  display: ['block', 'inline', 'inline-block', 'flex', 'inline-flex', 'grid', 'inline-grid', 'none', 'contents', 'flow-root'],
  position: ['static', 'relative', 'absolute', 'fixed', 'sticky'],
  'justify-content': ['center', 'flex-start', 'flex-end', 'space-between', 'space-around', 'space-evenly', 'start', 'end'],
  'align-items': ['center', 'stretch', 'flex-start', 'flex-end', 'baseline', 'start', 'end'],
  'align-self': ['auto', 'center', 'stretch', 'flex-start', 'flex-end', 'baseline'],
  'align-content': ['center', 'stretch', 'space-between', 'space-around', 'space-evenly', 'flex-start', 'flex-end'],
  'flex-direction': ['row', 'column', 'row-reverse', 'column-reverse'],
  'flex-wrap': ['nowrap', 'wrap', 'wrap-reverse'],
  'text-align': ['left', 'right', 'center', 'justify', 'start', 'end'],
  'text-transform': ['uppercase', 'lowercase', 'capitalize', 'none'],
  'text-decoration': ['none', 'underline', 'overline', 'line-through', 'solid', 'dotted', 'dashed', 'wavy', ...cssColors],
  'font-weight': ['normal', 'bold', 'bolder', 'lighter', '100', '200', '300', '400', '500', '600', '700', '800', '900'],
  'font-style': ['normal', 'italic', 'oblique'],
  'font-family': ['Arial', 'Verdana', 'Georgia', 'monospace', 'sans-serif', 'serif', 'system-ui', 'cursive'],
  'font-size': ['small', 'medium', 'large', 'smaller', 'larger'],
  overflow: ['visible', 'hidden', 'auto', 'scroll', 'clip'],
  visibility: ['visible', 'hidden', 'collapse'],
  cursor: ['pointer', 'default', 'auto', 'text', 'move', 'grab', 'grabbing', 'not-allowed', 'wait', 'crosshair'],
  'box-sizing': ['border-box', 'content-box'],
  'border-style': ['solid', 'dashed', 'dotted', 'double', 'none', 'hidden', 'groove', 'ridge', 'inset', 'outset'],
  'border-width': ['thin', 'medium', 'thick'],
  'background-size': ['cover', 'contain', 'auto'],
  'background-repeat': ['no-repeat', 'repeat', 'repeat-x', 'repeat-y', 'space', 'round'],
  'background-position': ['center', 'top', 'bottom', 'left', 'right'],
  'object-fit': ['cover', 'contain', 'fill', 'none', 'scale-down'],
  'white-space': ['normal', 'nowrap', 'pre', 'pre-wrap', 'pre-line', 'break-spaces'],
  'transition-timing-function': ['ease', 'linear', 'ease-in', 'ease-out', 'ease-in-out', 'step-start', 'step-end'],
  'animation-iteration-count': ['infinite'],
  'animation-direction': ['normal', 'reverse', 'alternate', 'alternate-reverse'],
  'animation-fill-mode': ['none', 'forwards', 'backwards', 'both'],
  'animation-play-state': ['running', 'paused'],
  'list-style-type': ['none', 'disc', 'circle', 'square', 'decimal'],
  'grid-template-columns': ['none', 'subgrid', 'auto', 'min-content', 'max-content', 'repeat', 'minmax'],
  'grid-auto-flow': ['row', 'column', 'dense'],
  'scroll-behavior': ['auto', 'smooth'],
  'user-select': ['auto', 'none', 'text', 'all']
};
const cssProperties = [...new Set([...completions['style.css'], ...Object.keys(cssValues),
  'background', 'border-color', 'outline', 'outline-color', 'box-shadow', 'text-shadow',
  'min-width', 'min-height', 'max-height', 'top', 'right', 'bottom', 'left', 'inset',
  'padding-top', 'padding-right', 'padding-bottom', 'padding-left',
  'margin-top', 'margin-right', 'margin-bottom', 'margin-left',
  'row-gap', 'column-gap', 'line-height', 'letter-spacing', 'opacity', 'z-index',
  'overflow-x', 'overflow-y', 'flex', 'flex-grow', 'flex-shrink', 'flex-basis',
  'grid-template-rows', 'transition-duration', 'animation-duration', 'animation-delay'
])];
function cssSuggestionContext(before, token) {
  // Ignore delimiters inside comments, strings and functions.
  let segment = '', quote = '', comment = false, depth = 0;
  for (let i = 0; i < before.length; i++) {
    const char = before[i], next = before[i + 1];
    if (comment) { if (char === '*' && next === '/') { comment = false; i++; segment += ' '; } continue; }
    if (quote) { segment += char; if (char === '\\') { segment += next || ''; i++; } else if (char === quote) quote = ''; continue; }
    if (char === '/' && next === '*') { comment = true; i++; continue; }
    if (char === '"' || char === "'") quote = char;
    if (char === '(') depth++;
    if (char === ')') depth = Math.max(0, depth - 1);
    if (!depth && '{};'.includes(char)) segment = '';
    else segment += char;
  }
  if (comment || quote || depth) return { values: [], isValue: false };
  const declaration = segment.match(/^\s*([\w-]+)\s*:\s*([\s\S]*)$/);
  if (!declaration) return { values: cssProperties, isValue: false };
  const property = declaration[1].toLowerCase();
  let values = cssValues[property] || [];
  if (/color$/.test(property) || ['fill', 'stroke', 'background'].includes(property)) values = cssColors;
  if (/^(border|outline)(-(top|right|bottom|left))?$/.test(property)) values = [...cssValues['border-style'], ...cssValues['border-width'], ...cssColors];
  if (['box-shadow', 'text-shadow'].includes(property)) values = ['none', 'inset', ...cssColors];
  if (/^(overflow-[xy])$/.test(property)) values = cssValues.overflow;
  if (property === 'grid-template-rows') values = cssValues['grid-template-columns'];
  const length = /^(min-|max-)?(width|height)$|^(padding|margin|gap|inset|top|right|bottom|left|row-gap|column-gap|font-size|line-height|letter-spacing|flex-basis|border|outline|grid-template)/.test(property);
  if (length) values = [...values, ...(/^(min-|max-)?(width|height)$|^(margin|inset|top|right|bottom|left|flex-basis|grid-template)/.test(property) ? cssLengths : ['0'])];
  const numeric = token.match(/^(-?(?:\d*\.)?\d+)([a-z%]*)$/i);
  if (numeric) {
    const units = /(duration|delay)$/.test(property) ? ['s', 'ms'] : length ? ['px', 'rem', 'em', '%', 'vh', 'vw', 'ch', 'vmin', 'vmax', ...(property.startsWith('grid-') ? ['fr'] : [])] : [];
    values = [...units.map(unit => numeric[1] + unit), ...values];
  }
  // Never append a color name inside a manually entered hex color.
  if (/#[\da-f]*$/i.test(declaration[2])) values = [];
  else values = [...values, 'inherit', 'initial', 'unset', 'revert'];
  return { values: [...new Set(values)], isValue: true };
}

let suggestionState = null;
function hideSuggestions() {
  suggestionState = null;
  $('suggestion-popup').hidden = true;
  $('editor').removeAttribute('aria-activedescendant');
}
function showSuggestions(manual = false) {
  const editor = $('editor');
  if (editor.disabled || editor.selectionStart !== editor.selectionEnd) return hideSuggestions();
  const before = editor.value.slice(0, editor.selectionStart);
  const token = before.match(active === 'index.html' ? /[\w-]+$/ : active === 'style.css' ? /[@\w.%#-]+$/ : /[@\w$.-]+$/)?.[0] || '';
  const cssContext = active === 'style.css' ? cssSuggestionContext(before, token) : null;
  if (!manual && token.length < (cssContext?.isValue ? 0 : 2)) return hideSuggestions();
  let prefix = token, start = editor.selectionStart - token.length;
  let options = (cssContext ? cssContext.values : completions[active]).filter(label => label.toLowerCase().startsWith(prefix.toLowerCase()));
  // Offer member names after an object, e.g. button.addEventListener.
  if (!options.length && active === 'script.js' && token.includes('.')) {
    prefix = token.slice(token.lastIndexOf('.') + 1);
    start = editor.selectionStart - prefix.length;
    options = completions[active].filter(label => label.toLowerCase().startsWith(prefix.toLowerCase()));
  }
  if (!options.length) return hideSuggestions();
  const suffix = editor.value.slice(editor.selectionStart).match(/^[\w$-]*/)[0];
  suggestionState = { options: options.slice(0, 8), index: 0, start, end: editor.selectionStart + suffix.length, value: editor.value };
  $('suggestion-popup').hidden = false;
  renderSuggestions();
}
function renderSuggestions() {
  $('suggestions').replaceChildren();
  suggestionState.options.forEach((label, index) => {
    const option = document.createElement('div');
    option.id = 'suggestion-' + index;
    option.setAttribute('role', 'option');
    option.setAttribute('aria-selected', String(index === suggestionState.index));
    option.textContent = label;
    option.addEventListener('mousedown', event => event.preventDefault());
    option.onclick = () => acceptSuggestion(index);
    $('suggestions').append(option);
  });
  const selected = $('suggestions').children[suggestionState.index];
  $('editor').setAttribute('aria-activedescendant', selected.id);
  const list = $('suggestions');
  const itemRect = selected.getBoundingClientRect(), listRect = list.getBoundingClientRect();
  if (itemRect.top < listRect.top) list.scrollTop -= listRect.top - itemRect.top;
  if (itemRect.bottom > listRect.bottom) list.scrollTop += itemRect.bottom - listRect.bottom;
  positionSuggestions();
}
function acceptSuggestion(index = suggestionState?.index) {
  if (!suggestionState) return;
  const editor = $('editor'), state = suggestionState;
  if (editor.value !== state.value || editor.selectionStart !== editor.selectionEnd) return hideSuggestions();
  const before = snapshotEditor();
  editor.setRangeText(state.options[index], state.start, state.end, 'end');
  remember(before); beforeEdit = null; save(); hideSuggestions(); editor.focus();
}
// Measure the caret using a hidden copy with identical textarea typography.
function positionSuggestions() {
  if (!suggestionState) return;
  const editor = $('editor'), popup = $('suggestion-popup');
  const mirror = document.createElement('div'), caret = document.createElement('span');
  const style = getComputedStyle(editor);
  for (const property of ['fontFamily', 'fontSize', 'fontWeight', 'fontStyle', 'lineHeight', 'letterSpacing', 'tabSize', 'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft', 'borderTopWidth', 'borderLeftWidth', 'boxSizing']) mirror.style[property] = style[property];
  Object.assign(mirror.style, { position: 'fixed', visibility: 'hidden', whiteSpace: 'pre', top: '0', left: '0', width: editor.clientWidth + 'px', pointerEvents: 'none' });
  mirror.textContent = editor.value.slice(0, editor.selectionStart);
  caret.textContent = '\u200b'; mirror.append(caret); document.body.append(mirror);
  const rect = caret.getBoundingClientRect(), base = mirror.getBoundingClientRect();
  const x = rect.left - base.left - editor.scrollLeft;
  const y = rect.top - base.top - editor.scrollTop;
  mirror.remove();
  const line = parseFloat(style.lineHeight);
  if (x < 0 || x > editor.clientWidth || y < -line || y > editor.clientHeight) {
    popup.hidden = true; return;
  }
  popup.hidden = false;
  const wrap = editor.parentElement;
  const width = Math.min(310, wrap.clientWidth - 16);
  popup.style.width = width + 'px';
  const left = Math.max(8, Math.min(editor.offsetLeft + x, wrap.clientWidth - width - 8));
  const below = editor.offsetTop + y + line + 4;
  const above = editor.offsetTop + y - 4;
  const useAbove = wrap.clientHeight - below < 140 && above > wrap.clientHeight - below;
  const available = Math.max(50, useAbove ? above - 8 : wrap.clientHeight - below - 8);
  $('suggestions').style.maxHeight = Math.min(210, available - 30) + 'px';
  popup.style.left = left + 'px';
  popup.style.top = Math.max(8, useAbove ? above - popup.offsetHeight : below) + 'px';
}
$('editor').addEventListener('scroll', positionSuggestions);
new ResizeObserver(positionSuggestions).observe($('editor'));
$('suggest-button').onclick = () => { $('editor').focus(); showSuggestions(true); };
$('editor').addEventListener('blur', hideSuggestions);
$('editor').addEventListener('select', () => {
  if ($('editor').selectionStart !== $('editor').selectionEnd) hideSuggestions();
});

async function api(url, data) {
  const response = await fetch(url, data ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) } : {});
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || 'Request failed.');
  return result;
}
let highlightedValue = null, highlightedFile = null;
function highlightCode() {
  const value = $('editor').value;
  if (value === highlightedValue && active === highlightedFile) return;
  highlightedValue = value; highlightedFile = active;
  const rules = active === 'index.html'
    ? /(?<comment><!--[\s\S]*?(?:-->|$))|(?<string>"[^"\n]*"?|'[^'\n]*'?)|(?<tag><\/?[\w:-]+|\/?>)|(?<property>[\w:-]+(?=\s*=))|(?<punctuation>=)/g
    : active === 'style.css'
      ? /(?<comment>\/\*[\s\S]*?(?:\*\/|$))|(?<string>"(?:\\.|[^"\\])*"?|'(?:\\.|[^'\\])*'?)|(?<property>--?[\w-]+(?=\s*:)|[a-zA-Z][\w-]*(?=\s*:))|(?<number>#[\da-fA-F]{3,8}\b|-?\b\d+(?:\.\d+)?(?:px|rem|em|vh|vw|fr|ms|s|%)?)|(?<keyword>@[\w-]+|!important)|(?<function>[\w-]+(?=\())|(?<punctuation>[{}:;(),])/g
      : /(?<comment>\/\/[^\n]*|\/\*[\s\S]*?(?:\*\/|$))|(?<string>"(?:\\.|[^"\\\n])*"?|'(?:\\.|[^'\\\n])*'?|`(?:\\.|[^`\\])*`?)|(?<keyword>\b(?:const|let|var|function|return|if|else|for|while|do|switch|case|break|continue|new|class|extends|this|async|await|try|catch|finally|throw|import|export|from|typeof|instanceof|true|false|null|undefined)\b)|(?<number>\b(?:0x[\da-fA-F]+|\d+(?:\.\d+)?)\b)|(?<function>[\w$]+(?=\s*\())|(?<punctuation>[{}()[\];,.=+\-*/<>!?:&|])/g;
  const fragment = document.createDocumentFragment();
  let offset = 0;
  for (const match of value.matchAll(rules)) {
    fragment.append(document.createTextNode(value.slice(offset, match.index)));
    const span = document.createElement('span');
    span.className = 'syntax-' + Object.keys(match.groups).find(key => match.groups[key] !== undefined);
    // Source is always text, including HTML tags and script content.
    span.textContent = match[0]; fragment.append(span);
    offset = match.index + match[0].length;
  }
  fragment.append(document.createTextNode(value.slice(offset) + (value.endsWith('\n') ? '\n' : '')));
  $('highlight').replaceChildren(fragment);
  syncHighlight();
}
function syncHighlight() {
  const editor = $('editor'), layer = $('highlight');
  layer.style.width = editor.clientWidth + 'px';
  layer.style.height = editor.clientHeight + 'px';
  layer.scrollTop = editor.scrollTop;
  layer.scrollLeft = editor.scrollLeft;
}
function insertIndentedLine() {
  const editor = $('editor'), before = snapshotEditor();
  const lineStart = before.start === 0 ? 0 : before.value.lastIndexOf('\n', before.start - 1) + 1;
  const indent = before.value.slice(lineStart, before.start).match(/^[\t ]*/)[0];
  const opensBlock = before.value.slice(lineStart, before.start).trimEnd().endsWith('{');
  const unit = indent.includes('\t') ? '\t' : '  ';
  const nextIndent = indent + (opensBlock ? unit : '');
  const closing = opensBlock && before.value.slice(before.end).match(/^([\t ]*)}/);
  const insertion = '\n' + nextIndent + (closing ? '\n' + indent : '');
  editor.setRangeText(insertion, before.start, before.end + (closing ? closing[1].length : 0), 'end');
  const caret = before.start + 1 + nextIndent.length;
  editor.setSelectionRange(caret, caret);
  remember(before); beforeEdit = null; hideSuggestions(); save();
  // Keep the new line visible when typing at the bottom of the editor.
  const style = getComputedStyle(editor), lineHeight = parseFloat(style.lineHeight);
  const line = editor.value.slice(0, editor.selectionStart).split('\n').length - 1;
  const top = parseFloat(style.paddingTop) + line * lineHeight;
  if (top + lineHeight > editor.scrollTop + editor.clientHeight) editor.scrollTop = top + lineHeight - editor.clientHeight;
  if (top < editor.scrollTop) editor.scrollTop = top;
  editor.scrollLeft = 0;
  syncHighlight();
}
$('editor').addEventListener('scroll', syncHighlight);
new ResizeObserver(syncHighlight).observe($('editor'));

function position() {
  highlightCode();
  const before = $('editor').value.slice(0, $('editor').selectionStart).split('\n');
  $('position').textContent = `Ln ${before.length}, Col ${before.at(-1).length + 1}`;
  $('lines').textContent = Array.from({ length: $('editor').value.split('\n').length }, (_, i) => i + 1).join('\n');
  $('lines').scrollTop = $('editor').scrollTop;
}
function save() {
  sources[active] = $('editor').value; revision++;
  try { localStorage.setItem(storageKey, JSON.stringify(sources)); $('save-status').textContent = 'Draft saved locally'; }
  catch { $('save-status').textContent = 'Storage unavailable — keep this tab open'; }
  if ($('results').children.length) $('summary').textContent = 'Code changed since the last run. Run Code again to update results.';
  position();
}
function select(file) {
  hideSuggestions();
  beforeEdit = null;
  active = file; $('editor').value = sources[file]; $('filename').textContent = file;
  $('editor').setAttribute('aria-label', names[file] + ' code');
  document.querySelectorAll('[data-file]').forEach(button => { button.setAttribute('aria-selected', String(button.dataset.file === file)); button.tabIndex = button.dataset.file === file ? 0 : -1; });
  position();
}
function taskMarkdown(text) {
  // Render the repository brief as text, never as executable HTML.
  let code = null;
  for (const line of text.split('\n')) {
    if (line.startsWith('```')) { if (code) code = null; else { code = document.createElement('pre'); $('task').append(code); } continue; }
    if (code) { code.textContent += line + '\n'; continue; }
    if (!line.trim()) continue;
    const heading = line.match(/^(#{1,3})\s+(.*)/);
    const el = document.createElement(heading ? (heading[1].length === 1 ? 'h2' : 'h3') : 'p');
    const content = heading ? heading[2] : line;
    for (const part of content.split(/(`[^`]+`|\*\*[^*]+\*\*)/g)) {
      const node = document.createElement(part.startsWith('`') ? 'code' : part.startsWith('**') ? 'strong' : 'span');
      node.textContent = part.startsWith('`') ? part.slice(1, -1) : part.startsWith('**') ? part.slice(2, -2) : part;
      el.append(node);
    }
    $('task').append(el);
  }
}
let previewWidth = null;
function sizePreview() {
  const available = $('preview-stage').clientWidth;
  if (!available) return;
  const width = previewWidth || available;
  const scale = Math.min(1, available / width);
  const frame = $('preview');
  frame.style.width = width + 'px';
  frame.style.height = '720px';
  frame.style.transform = 'scale(' + scale + ')';
  $('preview-stage').style.height = (720 * scale) + 'px';
  $('preview-size').textContent = Math.round(width) + ' × 720 px · ' + Math.round(scale * 100) + '%';
  $('preview-width').value = Math.round(width);
}
$('preview-device').onchange = () => {
  if ($('preview-device').value === 'custom') return;
  previewWidth = $('preview-device').value === 'fit' ? null : Number($('preview-device').value);
  sizePreview();
};
$('preview-width').onchange = () => {
  if (!$('preview-width').reportValidity()) return;
  previewWidth = Number($('preview-width').value);
  $('preview-device').value = ['390', '768', '1280'].includes(String(previewWidth)) ? String(previewWidth) : 'custom';
  sizePreview();
};
function expandPreview(expand) {
  document.querySelector('.output').classList.toggle('expanded', expand);
  $('expand-preview').setAttribute('aria-expanded', String(expand));
  $('expand-preview').textContent = expand ? 'Close expanded preview' : 'Expand preview';
  sizePreview();
}
$('expand-preview').onclick = () => expandPreview($('expand-preview').getAttribute('aria-expanded') !== 'true');
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && $('expand-preview').getAttribute('aria-expanded') === 'true') {
    expandPreview(false); $('expand-preview').focus();
  }
});
new ResizeObserver(sizePreview).observe($('preview-stage'));
async function preview(snapshot = { ...sources }) {
  const result = await api('/api/preview', { slug, files: snapshot });
  $('preview').src = result.url;
}
function showError(error) { $('summary').textContent = error.message; $('summary').className = 'error'; }
async function run() {
  if (busy) return;
  busy = true; $('run').disabled = true; $('run').textContent = 'Running tests…';
  $('results').replaceChildren(); $('score').textContent = 'Running'; $('summary').className = '';
  $('summary').textContent = 'Checking your submission against the exercise test cases. This may take a moment.';
  const submittedRevision = revision, snapshot = { ...sources };
  try {
    // Preview failures must not prevent the grader from testing a submission.
    preview(snapshot).catch(() => {});
    const report = await api('/api/run', { slug, files: snapshot });
    $('score').textContent = `${report.passed} / ${report.total} passed`;
    $('summary').textContent = (report.passed === report.total ? 'All test cases passed. Well done!' : `${report.total - report.passed} test case(s) did not pass. Review the details below.`) + (submittedRevision !== revision ? ' Your code changed during this run; run again to test the latest edits.' : '');
    report.results.forEach(result => {
      const li = document.createElement('li'); li.className = result.status;
      const label = document.createElement('span'); label.textContent = `${result.status === 'passed' ? '✓ PASS' : result.status.toUpperCase()} · ${result.title}`; li.append(label);
      if (result.error) { const details = document.createElement('details'), summary = document.createElement('summary'), pre = document.createElement('pre'); summary.textContent = 'View test feedback'; pre.textContent = result.error; details.append(summary, pre); li.append(details); }
      $('results').append(li);
    });
  } catch (error) { $('score').textContent = 'Run unavailable'; showError(error); }
  finally { busy = false; $('run').disabled = false; $('run').textContent = '▶ Run Code'; }
}
document.querySelectorAll('[data-file]').forEach(button => {
  button.onclick = () => select(button.dataset.file);
  button.onkeydown = event => { if (!['ArrowLeft', 'ArrowRight'].includes(event.key)) return; event.preventDefault(); const tabs = [...document.querySelectorAll('[data-file]')]; const next = tabs[(tabs.indexOf(button) + (event.key === 'ArrowRight' ? 1 : 2)) % 3]; next.click(); next.focus(); };
});
$('editor').addEventListener('beforeinput', event => {
  if (event.inputType === 'historyUndo' || event.inputType === 'historyRedo') {
    event.preventDefault(); restoreEdit(event.inputType === 'historyRedo'); return;
  }
  beforeEdit = snapshotEditor();
});
$('editor').addEventListener('input', event => {
  remember(beforeEdit || { value: sources[active], start: 0, end: 0, direction: 'none' });
  beforeEdit = null;
  save();
  if (!event.isComposing) showSuggestions();
});
$('editor').addEventListener('scroll', () => { $('lines').scrollTop = $('editor').scrollTop; });
$('editor').addEventListener('click', () => { hideSuggestions(); position(); });
$('editor').addEventListener('keyup', position);
$('editor').addEventListener('keydown', event => {
  if (event.isComposing) return;
  if ((event.ctrlKey || event.metaKey) && event.code === 'Space') {
    event.preventDefault(); showSuggestions(true); return;
  }
  if (suggestionState && !event.ctrlKey && !event.metaKey && !event.altKey) {
    if (event.key === 'Escape') { event.preventDefault(); hideSuggestions(); return; }
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      suggestionState.index = (suggestionState.index + (event.key === 'ArrowDown' ? 1 : suggestionState.options.length - 1)) % suggestionState.options.length;
      renderSuggestions(); return;
    }
    if ((event.key === 'Enter' || event.key === 'Tab') && !event.shiftKey && $('editor').selectionStart === $('editor').selectionEnd) {
      event.preventDefault(); acceptSuggestion(); return;
    }
  }
  if (['ArrowLeft', 'ArrowRight', 'Home', 'End', 'Tab'].includes(event.key)) hideSuggestions();
  const key = event.key.toLowerCase();
  if ((event.ctrlKey || event.metaKey) && !event.altKey && (key === 'z' || key === 'y')) {
    event.preventDefault(); restoreEdit(key === 'y' || event.shiftKey); return;
  }
  if (event.key === 'Enter' && !event.ctrlKey && !event.metaKey && !event.altKey) {
    event.preventDefault(); insertIndentedLine(); return;
  }
  if (event.key === 'Escape') { leaveEditor = true; return; }
  if (event.key === 'Tab' && !leaveEditor) { event.preventDefault(); indentSelection(event.shiftKey); }
  leaveEditor = false;
});
document.addEventListener('keydown', event => { if ((event.ctrlKey || event.metaKey) && event.key === 'Enter' && !$('run').disabled) { event.preventDefault(); run(); } });
function showBrief(solution) {
  $('problem-panel').hidden = solution;
  $('solution-panel').hidden = !solution;
  $('problem-tab').setAttribute('aria-selected', String(!solution));
  $('solution-tab').setAttribute('aria-selected', String(solution));
  $('problem-tab').tabIndex = solution ? -1 : 0;
  $('solution-tab').tabIndex = solution ? 0 : -1;
  document.querySelector('aside').scrollTop = 0;
}
$('problem-tab').onclick = () => showBrief(false);
$('solution-tab').onclick = () => showBrief(true);
for (const id of ['problem-tab', 'solution-tab']) {
  $(id).onkeydown = event => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const solution = event.key === 'End' || (event.key !== 'Home' && id === 'problem-tab');
    showBrief(solution);
    $(solution ? 'solution-tab' : 'problem-tab').focus();
  };
}
function loadQuestionInfo(exercise) {
  // An already-running server may still return the older API response.
  // Missing metadata is not proof that this is the last question.
  const catalog = typeof exercises === 'undefined' ? [] : exercises;
  const index = catalog.findIndex(item => item.slug === slug);
  const hasNavigation = Object.prototype.hasOwnProperty.call(exercise, 'next');
  const next = hasNavigation ? exercise.next : catalog[index + 1]?.slug;
  const known = hasNavigation || index >= 0;
  const number = exercise.number || (index >= 0 ? index + 1 : null);
  const total = exercise.total || catalog.length;
  if (number && total) $('question-number').textContent = 'Question ' + number + ' / ' + total;
  $('next-question').disabled = !known || !next;
  $('next-question').textContent = !known ? 'Navigation unavailable' : next ? 'Next question →' : 'Last question';
  $('next-question').onclick = () => {
    if (known && next) location.assign('/ide.html?exercise=' + encodeURIComponent(next));
  };
  $('solution-files').replaceChildren();
  for (const file of Object.keys(names)) {
    const heading = document.createElement('h3'); heading.textContent = file;
    const source = exercise.solution?.[file];
    const content = document.createElement(source ? 'pre' : 'p');
    content.textContent = source || 'No reference code for this file.';
    if (source) { content.tabIndex = 0; content.setAttribute('aria-label', names[file] + ' reference code'); }
    $('solution-files').append(heading, content);
  }
}
$('run').onclick = run;
$('preview-button').onclick = async () => { $('preview-button').disabled = true; try { await preview(); } catch (error) { showError(error); } finally { $('preview-button').disabled = false; } };
$('reset').onclick = () => { if (!confirm('Reset all three files to the original starter code? This replaces your saved draft.')) return; sources = { ...original }; Object.keys(histories).forEach(file => delete histories[file]); select(active); save(); $('results').replaceChildren(); $('score').textContent = 'Not run yet'; $('summary').textContent = 'Draft reset. Run Code to check the starter files.'; preview().catch(showError); };
(async () => {
  try {
    const exercise = await api('/api/exercise?slug=' + encodeURIComponent(slug));
    original = exercise.files; sources = { ...original };
    try { const saved = JSON.parse(localStorage.getItem(storageKey)); if (saved && Object.keys(names).every(file => typeof saved[file] === 'string')) sources = Object.fromEntries(Object.keys(names).map(file => [file, saved[file]])); } catch { /* Continue with starter files if storage is unavailable. */ }
    $('title').textContent = exercise.task.split('\n')[0].replace(/^#\s*/, ''); document.title = $('title').textContent + ' · Coding workspace';
    taskMarkdown(exercise.task); loadQuestionInfo(exercise); select(active);
    ['editor', 'run', 'reset', 'preview-button'].forEach(id => $(id).disabled = false);
    $('save-status').textContent = 'Drafts save in this browser';
    await preview();
  } catch (error) { $('title').textContent = 'Unable to load workspace'; showError(error); }
})();
