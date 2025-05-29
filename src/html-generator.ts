/**
 * HTML生成機能
 * diff2htmlを使用してHTMLを生成
 */

import * as Diff2Html from "diff2html";
const { html: diff2htmlHtml } = Diff2Html;

/**
 * Convert git-style diff to unified diff format
 */
export function convertToUnifiedDiff(
  diffText: string,
  oldPath: string,
  newPath: string
): string {
  // If the input is already a unified diff, return as-is
  if (diffText.includes("---") && diffText.includes("+++")) {
    return diffText;
  }

  // Convert simple diff format to unified diff
  const lines = diffText.split("\n");
  const unifiedLines: string[] = [];

  // Add unified diff header
  unifiedLines.push(`--- a/${oldPath}`);
  unifiedLines.push(`+++ b/${newPath}`);

  // Process diff lines
  let lineNumber = 1;
  let addCount = 0;
  let removeCount = 0;

  for (const line of lines) {
    if (line.startsWith("@@")) {
      unifiedLines.push(line);
    } else if (line.startsWith("-")) {
      unifiedLines.push(line);
      removeCount++;
    } else if (line.startsWith("+")) {
      unifiedLines.push(line);
      addCount++;
    } else if (line.startsWith(" ") || line === "") {
      unifiedLines.push(line);
    } else {
      // Context line without prefix
      unifiedLines.push(` ${line}`);
    }
  }

  return unifiedLines.join("\n");
}

/**
 * Generate HTML diff visualization
 */
export function generateDiffHtml(
  diffText: string,
  options: {
    outputFormat?: "line-by-line" | "side-by-side";
    showFileList?: boolean;
    highlight?: boolean;
    oldPath?: string;
    newPath?: string;
    isImageOutput?: boolean;
  } = {}
): string {
  const {
    outputFormat = "side-by-side",
    showFileList = true,
    highlight = true,
    oldPath = "file.txt",
    newPath = "file.txt",
    isImageOutput = false,
  } = options;

  // Convert to unified diff if needed
  const unifiedDiff = convertToUnifiedDiff(diffText, oldPath, newPath);

  // Generate HTML using diff2html
  const diffHtml = diff2htmlHtml(unifiedDiff, {
    outputFormat,
    drawFileList: showFileList,
    matching: "lines",
    renderNothingWhenEmpty: false,
    maxLineSizeInBlockForComparison: 200,
    maxLineLengthHighlight: 10000,
  });

  // Different styles for HTML vs image output
  const customStyles = isImageOutput
    ? `
        /* Image-specific styles for PNG generation */
        .d2h-diff-table {
            font-size: 11px;
            table-layout: fixed;
            width: 100%;
        }
        .d2h-code-line,
        .d2h-code-line-ctn,
        .d2h-code-side-line,
        .d2h-code-line pre,
        .d2h-code-line code {
            word-wrap: break-word !important;
            word-break: break-all !important;
            white-space: pre-wrap !important;
            overflow-wrap: break-word !important;
            max-width: 500px !important;
            font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace !important;
            font-size: 10px !important;
        }
        .d2h-diff-tbody tr td {
            max-width: 500px !important;
            overflow-wrap: break-word !important;
            word-break: break-all !important;
            white-space: pre-wrap !important;
            vertical-align: top;
        }
        .d2h-code-side-emptyplaceholder,
        .d2h-code-side-line {
            max-width: 450px !important;
            word-wrap: break-word !important;
            word-break: break-all !important;
            white-space: pre-wrap !important;
        }
        .d2h-diff-table td.d2h-code-linenumber + td {
            max-width: 480px !important;
            word-wrap: break-word !important;
            word-break: break-all !important;
            white-space: pre-wrap !important;
        }`
    : `
        /* HTML-specific: Minimal overrides to preserve Diff2Html defaults */`;

  // Wrap in complete HTML document
  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Unified Diff Visualization</title>
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/diff2html/bundles/css/diff2html.min.css" />
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;
            margin: 0;
            padding: 20px;
            background-color: #ffffff;
            font-size: 14px;
        }
        .d2h-wrapper {
            max-width: none;
            overflow-x: auto;
        }
        .d2h-file-header {
            font-weight: 600;
            background-color: #f6f8fa;
        }
        ${customStyles}
        @media (max-width: 768px) {
            body { padding: 10px; font-size: 12px; }
        }
    </style>
</head>
<body>
    ${diffHtml}
    <script src="https://cdn.jsdelivr.net/npm/diff2html/bundles/js/diff2html-ui.min.js"></script>
    <script>
        document.addEventListener('DOMContentLoaded', function() {
            if (typeof Diff2HtmlUI !== 'undefined') {
                const targetElement = document.querySelector('.d2h-wrapper');
                if (targetElement) {
                    const diff2htmlUi = new Diff2HtmlUI(targetElement);
                    diff2htmlUi.highlightCode();
                }
            }
        });
    </script>
</body>
</html>`;
}
