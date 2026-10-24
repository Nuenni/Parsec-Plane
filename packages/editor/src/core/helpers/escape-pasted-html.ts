/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

// "<" that opens an HTML tag, closing tag, comment or declaration, but not a markdown autolink
// like <https://example.com> or <mail@example.com>
const HTML_TAG_START = /<(?![A-Za-z][A-Za-z0-9+.-]{1,31}:[^\s<>]*>)(?![^\s@<>]+@[^\s@<>]+>)(?=[A-Za-z/!?])/g;
const FENCE = /^ {0,3}(```|~~~)/;
const INDENTED_CODE = /^( {4}|\t)/;
const INLINE_CODE = /(`+)[\s\S]*?\1/g;

const escapeOutsideInlineCode = (line: string): string => {
  let result = "";
  let lastIndex = 0;
  for (const match of line.matchAll(INLINE_CODE)) {
    result += line.slice(lastIndex, match.index).replace(HTML_TAG_START, "&lt;") + match[0];
    lastIndex = (match.index ?? 0) + match[0].length;
  }
  return result + line.slice(lastIndex).replace(HTML_TAG_START, "&lt;");
};

/**
 * Pasted plain text is parsed as markdown with HTML enabled, so a line like
 * `<script src="…"></script>` turns into an element the schema does not know and
 * silently disappears. Escaping the tags keeps them as visible text while the rest
 * of the markdown (lists, emphasis, links) is still converted. Code spans, fenced
 * and indented code blocks are left untouched, they already render their content as text.
 */
export const escapeHtmlInPastedMarkdown = (text: string): string => {
  let inFence = false;
  return text
    .split("\n")
    .map((line) => {
      if (FENCE.test(line)) {
        inFence = !inFence;
        return line;
      }
      if (inFence || INDENTED_CODE.test(line)) return line;
      return escapeOutsideInlineCode(line);
    })
    .join("\n");
};
