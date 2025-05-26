#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from "@modelcontextprotocol/sdk/types.js";

import * as Diff2Html from "diff2html";
import { dirname, join } from "path";
import { chromium } from "playwright-core";
import { fileURLToPath } from "url";
const { html: diff2htmlHtml } = Diff2Html;

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Get default settings from environment
const DEFAULT_AUTO_OPEN = process.env.DEFAULT_AUTO_OPEN === 'true';
const DEFAULT_OUTPUT_MODE = (process.env.DEFAULT_OUTPUT_MODE as 'image' | 'html') || 'html';

const server = new Server(
  {
    name: "unified-diff-mcp",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

/**
 * Convert git-style diff to unified diff format
 */
function convertToUnifiedDiff(
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
function generateDiffHtml(
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
  const customStyles = isImageOutput ? `
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
        }` : `
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

/**
 * Generate diff visualization and save to output directory
 */
async function generateDiffVisualization(
  diffText: string,
  options: {
    outputFormat?: "line-by-line" | "side-by-side";
    showFileList?: boolean;
    highlight?: boolean;
    oldPath?: string;
    newPath?: string;
    autoOpen?: boolean;
    outputType?: "image" | "html";
  } = {}
): Promise<string> {
  const {
    outputFormat = "side-by-side",
    showFileList = true,
    highlight = true,
    oldPath = "file.txt",
    newPath = "file.txt",
    autoOpen = false,
    outputType = DEFAULT_OUTPUT_MODE, // Default from environment
  } = options;

  // Generate HTML first
  const html = generateDiffHtml(diffText, {
    outputFormat,
    showFileList,
    highlight,
    oldPath,
    newPath,
    isImageOutput: outputType === "image",
  });

  // Generate filename (always the same, overwriting previous files)
  const extension = outputType === "html" ? "html" : "png";
  const filename = `diff-image.${extension}`;
  const filePath = join(__dirname, "..", "output", filename);

  // Ensure output directory exists
  const fs = await import("fs/promises");
  const outputDir = join(__dirname, "..", "output");
  try {
    await fs.access(outputDir);
  } catch {
    await fs.mkdir(outputDir, { recursive: true });
  }

  if (outputType === "html") {
    // Save HTML file
    await fs.writeFile(filePath, html, "utf8");
  } else {
    // Generate PNG image
    const browser = await chromium.launch();
    const page = await browser.newPage({
      viewport: { width: 1800, height: 1200 }, // Increased width significantly
    });

    await page.setContent(html);
    await page.screenshot({
      path: filePath,
      fullPage: true,
      type: "png",
    });

    await browser.close();
  }

  // Auto-open if requested
  if (autoOpen) {
    try {
      const { exec } = await import("child_process");
      const { promisify } = await import("util");
      const execAsync = promisify(exec);

      // Add timestamp query parameter to avoid browser cache
      const timestamp = new Date().toISOString().replace(/[-T:]/g, '').slice(0, 14); // yyyymmddHHMMss
      const openUrl = outputType === "html" ? `file://${filePath}?t=${timestamp}` : filePath;
      
      console.error(`Attempting to open ${outputType}: ${openUrl}`);
      
      // Cross-platform file opening
      const platform = process.platform;
      let command: string;
      
      if (platform === 'win32') {
        // Windows: use 'start' command
        command = `start "" "${filePath}"`;
      } else if (platform === 'darwin') {
        // macOS: use 'open' command
        command = outputType === "html" ? `open "${openUrl}"` : `open "${filePath}"`;
      } else {
        // Linux: use 'xdg-open' command
        command = `xdg-open "${filePath}"`;
      }
      
      await execAsync(command);
      console.error(`Successfully opened ${outputType}: ${filePath}`);
    } catch (error) {
      console.error(`Auto-open failed: ${error}`);
      // Fallback: try with system default
      try {
        const { exec } = await import("child_process");
        const platform = process.platform;
        
        if (platform === 'win32') {
          // Windows fallback
          exec(`explorer "${filePath}"`);
        } else if (platform === 'darwin') {
          // macOS fallback with AppleScript
          exec(
            `osascript -e 'tell application "Finder" to open POSIX file "${filePath}"'`
          );
        } else {
          // Linux fallback
          exec(`xdg-open "${filePath}"`);
        }
      } catch (fallbackError) {
        console.error(`Fallback auto-open also failed: ${fallbackError}`);
      }
    }
  }

  return filePath;
}

/**
 * Generate diff image and save to output directory (backward compatibility)
 */
async function generateDiffImage(
  diffText: string,
  options: {
    outputFormat?: "line-by-line" | "side-by-side";
    showFileList?: boolean;
    highlight?: boolean;
    oldPath?: string;
    newPath?: string;
    autoOpen?: boolean;
  } = {}
): Promise<string> {
  return generateDiffVisualization(diffText, {
    ...options,
    outputType: "image",
  });
}

/**
 * Parse filesystem edit_file dry-run output
 */
function parseDryRunOutput(dryRunText: string): {
  oldPath?: string;
  newPath?: string;
  diffContent: string;
} {
  const lines = dryRunText.split("\n");
  let oldPath: string | undefined;
  let newPath: string | undefined;
  let diffStartIndex = 0;

  // Look for file paths in the dry-run output
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.includes("---") && line.includes("/")) {
      oldPath = line.replace(/^---\s*/, "").trim();
    } else if (line.includes("+++") && line.includes("/")) {
      newPath = line.replace(/^\+\+\+\s*/, "").trim();
      diffStartIndex = i + 1;
      break;
    } else if (line.startsWith("@@")) {
      diffStartIndex = i;
      break;
    }
  }

  const diffContent = lines.slice(diffStartIndex).join("\n");

  return {
    oldPath,
    newPath,
    diffContent: dryRunText, // Use full text as diff content
  };
}

// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "visualize_diff_image",
        description:
          "Generate image visualization of unified diff and save to output directory",
        inputSchema: {
          type: "object",
          properties: {
            diff: {
              type: "string",
              description:
                "Unified diff text or filesystem edit_file dry-run output",
            },
            format: {
              type: "string",
              enum: ["line-by-line", "side-by-side"],
              description: "Output format for the diff visualization",
              default: "side-by-side",
            },
            showFileList: {
              type: "boolean",
              description: "Show file list summary",
              default: true,
            },
            highlight: {
              type: "boolean",
              description: "Enable syntax highlighting",
              default: true,
            },
            oldPath: {
              type: "string",
              description: "Path of the original file (optional)",
            },
            newPath: {
              type: "string",
              description: "Path of the modified file (optional)",
            },
            autoOpen: {
              type: "boolean",
              description: "Automatically open the generated output",
              default: DEFAULT_AUTO_OPEN,
            },
            outputType: {
              type: "string",
              enum: ["image", "html"],
              description: "Output format: image (PNG) or HTML file",
              default: DEFAULT_OUTPUT_MODE,
            },
          },
          required: ["diff"],
        },
      },
      {
        name: "parse_filesystem_diff_image",
        description:
          "Parse filesystem edit_file dry-run output and generate image diff",
        inputSchema: {
          type: "object",
          properties: {
            dryRunOutput: {
              type: "string",
              description: "Output from filesystem edit_file with dryRun=true",
            },
            format: {
              type: "string",
              enum: ["line-by-line", "side-by-side"],
              description: "Output format for the diff visualization",
              default: "side-by-side",
            },
            highlight: {
              type: "boolean",
              description: "Enable syntax highlighting",
              default: true,
            },
            autoOpen: {
              type: "boolean",
              description: "Automatically open the generated output",
              default: DEFAULT_AUTO_OPEN,
            },
            outputType: {
              type: "string",
              enum: ["image", "html"],
              description: "Output format: image (PNG) or HTML file",
              default: DEFAULT_OUTPUT_MODE,
            },
          },
          required: ["dryRunOutput"],
        },
      },
    ],
  };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    if (name === "visualize_diff_image") {
      const {
        diff,
        format = "side-by-side",
        showFileList = true,
        highlight = true,
        oldPath,
        newPath,
        autoOpen = DEFAULT_AUTO_OPEN,
        outputType = DEFAULT_OUTPUT_MODE,
      } = args as {
        diff: string;
        format?: "line-by-line" | "side-by-side";
        showFileList?: boolean;
        highlight?: boolean;
        oldPath?: string;
        newPath?: string;
        autoOpen?: boolean;
        outputType?: "image" | "html";
      };

      if (!diff || typeof diff !== "string") {
        throw new McpError(
          ErrorCode.InvalidParams,
          "diff parameter is required and must be a string"
        );
      }

      const filePath = await generateDiffVisualization(diff, {
        outputFormat: format,
        showFileList,
        highlight,
        oldPath,
        newPath,
        autoOpen,
        outputType,
      });

      return {
        content: [
          {
            type: "text",
            text: `Generated diff ${outputType}: ${filePath}${
              autoOpen ? " (opened automatically)" : ""
            }`,
          },
        ],
      };
    } else if (name === "parse_filesystem_diff_image") {
      const {
        dryRunOutput,
        format = "side-by-side",
        highlight = true,
        autoOpen = DEFAULT_AUTO_OPEN,
        outputType = DEFAULT_OUTPUT_MODE,
      } = args as {
        dryRunOutput: string;
        format?: "line-by-line" | "side-by-side";
        highlight?: boolean;
        autoOpen?: boolean;
        outputType?: "image" | "html";
      };

      if (!dryRunOutput || typeof dryRunOutput !== "string") {
        throw new McpError(
          ErrorCode.InvalidParams,
          "dryRunOutput parameter is required and must be a string"
        );
      }

      const parsed = parseDryRunOutput(dryRunOutput);
      const filePath = await generateDiffVisualization(parsed.diffContent, {
        outputFormat: format,
        showFileList: true,
        highlight,
        oldPath: parsed.oldPath,
        newPath: parsed.newPath,
        autoOpen,
        outputType,
      });

      return {
        content: [
          {
            type: "text",
            text: `Parsed filesystem diff and generated ${outputType}:\n${
              parsed.oldPath ? `Old: ${parsed.oldPath}` : ""
            }\n${
              parsed.newPath ? `New: ${parsed.newPath}` : ""
            }\n${outputType === "html" ? "File" : "Image"}: ${filePath}${
              autoOpen ? " (opened automatically)" : ""
            }`,
          },
        ],
      };
    }

    throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
  } catch (error) {
    if (error instanceof McpError) {
      throw error;
    }
    throw new McpError(
      ErrorCode.InternalError,
      `Error executing tool ${name}: ${error}`
    );
  }
});

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Unified Diff MCP Server running on stdio");
}

if (process.argv[1] === __filename) {
  main().catch((error) => {
    console.error("Server error:", error);
    process.exit(1);
  });
}

export { server };
