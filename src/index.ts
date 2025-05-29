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
const DEFAULT_AUTO_OPEN = process.env.DEFAULT_AUTO_OPEN === "true";
const DEFAULT_OUTPUT_MODE =
  (process.env.DEFAULT_OUTPUT_MODE as "image" | "html") || "html";

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
      const timestamp = new Date()
        .toISOString()
        .replace(/[-T:]/g, "")
        .slice(0, 14); // yyyymmddHHMMss
      const openUrl =
        outputType === "html" ? `file://${filePath}?t=${timestamp}` : filePath;

      console.error(`Attempting to open ${outputType}: ${openUrl}`);

      // Cross-platform file opening
      const platform = process.platform;
      let command: string;

      if (platform === "win32") {
        // Windows: use 'start' command
        command = `start "" "${filePath}"`;
      } else if (platform === "darwin") {
        // macOS: use 'open' command
        command =
          outputType === "html" ? `open "${openUrl}"` : `open "${filePath}"`;
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

        if (platform === "win32") {
          // Windows fallback
          exec(`explorer "${filePath}"`);
        } else if (platform === "darwin") {
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
 * Create GitHub Gist with diff visualization
 */
async function createGitHubGist(
  diffText: string,
  options: {
    outputFormat?: "line-by-line" | "side-by-side";
    showFileList?: boolean;
    highlight?: boolean;
    oldPath?: string;
    newPath?: string;
    expiryMinutes?: number;
    public?: boolean;
  } = {}
): Promise<{
  success: boolean;
  htmlUrl: string;
  rawUrl: string;
  gistUrl: string;
  editUrl: string;
  gistId: string;
  expiresAt: Date;
  message: string;
}> {
  const {
    outputFormat = "side-by-side",
    showFileList = true,
    highlight = true,
    oldPath = "file.txt",
    newPath = "file.txt",
    expiryMinutes = 30,
    public: isPublic = false,
  } = options;

  const githubToken = process.env.GITHUB_TOKEN;
  if (!githubToken) {
    throw new Error("GITHUB_TOKEN environment variable is required");
  }

  const timestamp = Date.now();
  const filename = `diff-${timestamp}.html`;

  // Generate HTML content with expiry notice
  const baseHtml = generateDiffHtml(diffText, {
    outputFormat,
    showFileList,
    highlight,
    oldPath,
    newPath,
    isImageOutput: false,
  });

  // Add expiry notice and countdown to HTML
  const htmlWithExpiry = baseHtml
    .replace(
      "<body>",
      `<body>
    <div style="background: #fff3cd; border: 1px solid #ffeaa7; padding: 10px; margin: 10px 0; border-radius: 4px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;">
        <span id="expiry-notice">⏰ This page will auto-delete in ${expiryMinutes} minutes</span>
    </div>`
    )
    .replace(
      "</body>",
      `
    <script>
        // Countdown timer
        const expiryTime = Date.now() + ${expiryMinutes * 60 * 1000};
        const updateCountdown = () => {
            const remaining = Math.max(0, Math.floor((expiryTime - Date.now()) / 1000));
            const minutes = Math.floor(remaining / 60);
            const seconds = remaining % 60;
            const notice = document.getElementById('expiry-notice');
            if (notice) {
                notice.innerHTML = remaining > 0
                    ? \`⏰ This page will auto-delete in \${minutes}:\${seconds.toString().padStart(2, '0')}\`
                    : '🗑️ This content has expired';
            }
            if (remaining <= 0) {
                document.body.innerHTML = '<div style="text-align: center; padding: 50px; font-family: -apple-system, BlinkMacSystemFont, \'Segoe UI\', Helvetica, Arial, sans-serif;"><h1>🗑️ This content has expired</h1><p>This temporary diff visualization has been automatically removed.</p></div>';
            }
        };
        setInterval(updateCountdown, 1000);
        updateCountdown();
    </script>
</body>`
    );

  // Create Gist
  const gistData = {
    description: `Temporary diff visualization - Expires in ${expiryMinutes}min (${oldPath} → ${newPath})`,
    public: isPublic,
    files: {
      [filename]: {
        content: htmlWithExpiry,
      },
    },
  };

  const response = await fetch("https://api.github.com/gists", {
    method: "POST",
    headers: {
      Authorization: `token ${githubToken}`,
      Accept: "application/vnd.github.v3+json",
      "Content-Type": "application/json",
      "User-Agent": "unified-diff-mcp/1.0.0",
    },
    body: JSON.stringify(gistData),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `GitHub API error: ${response.status} ${response.statusText}\n${errorText}`
    );
  }

  const gist = await response.json();

  // Raw URL for direct HTML display
  const rawUrl = `https://gist.githubusercontent.com/${gist.owner.login}/${gist.id}/raw/${filename}`;
  const expiresAt = new Date(Date.now() + expiryMinutes * 60 * 1000);

  // Schedule automatic deletion
  setTimeout(async () => {
    try {
      const deleteResponse = await fetch(
        `https://api.github.com/gists/${gist.id}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `token ${githubToken}`,
            Accept: "application/vnd.github.v3+json",
            "User-Agent": "unified-diff-mcp/1.0.0",
          },
        }
      );
      console.error(
        `🗑️ Gist ${gist.id} ${
          deleteResponse.ok
            ? "deleted successfully"
            : `deletion failed: ${deleteResponse.status}`
        }`
      );
    } catch (error) {
      console.error(`🗑️ Failed to delete gist ${gist.id}:`, error);
    }
  }, expiryMinutes * 60 * 1000);

  const message = `🎉 GitHub Gist created successfully!
🌐 View HTML: https://htmlpreview.github.io/?${rawUrl}
📋 Gist page: ${gist.html_url}
✏️ Edit: ${gist.html_url}/edit
🔐 Visibility: ${isPublic ? "Public" : "Secret"}
⏰ Auto-delete: ${expiresAt.toLocaleString()}

💡 Alternative viewers:
- GitHack: https://gist.githack.com/${gist.owner.login}/${
    gist.id
  }/raw/${filename}
- RawGit: https://gistcdn.rawgit.org/${gist.owner.login}/${
    gist.id
  }/${gist.files[filename].raw_url.split("/").pop()}/${filename}`;

  return {
    success: true,
    htmlUrl: `https://htmlpreview.github.io/?${rawUrl}`, // HTML Preview URL
    rawUrl: rawUrl, // Raw URL
    gistUrl: gist.html_url,
    editUrl: `${gist.html_url}/edit`,
    gistId: gist.id,
    expiresAt,
    message,
  };
}

// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "visualize_diff_html_content",
        description:
          "Create a temporary GitHub Gist with HTML diff visualization that auto-deletes after specified time (replaces old HTML content functionality)",
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
              description:
                "Automatically open the HTML preview in browser",
              default: false,
            },
            expiryMinutes: {
              type: "number",
              description: "Minutes until automatic deletion",
              default: 30,
              minimum: 1,
              maximum: 1440,
            },
            public: {
              type: "boolean",
              description:
                "Create as public gist (default: false for secret gist)",
              default: false,
            },
          },
          required: ["diff"],
        },
      },
      {
        name: "visualize_diff_output_file",
        description:
          "Generate diff visualization and save to local output directory (PNG or HTML file)",
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
    ],
  };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    if (name === "visualize_diff_html_content") {
      const {
        diff,
        format = "side-by-side",
        showFileList = true,
        highlight = true,
        oldPath,
        newPath,
        autoOpen = false,
        expiryMinutes = 30,
        public: isPublic = false,
      } = args as {
        diff: string;
        format?: "line-by-line" | "side-by-side";
        showFileList?: boolean;
        highlight?: boolean;
        oldPath?: string;
        newPath?: string;
        autoOpen?: boolean;
        expiryMinutes?: number;
        public?: boolean;
      };

      if (!diff || typeof diff !== "string") {
        throw new McpError(
          ErrorCode.InvalidParams,
          "diff parameter is required and must be a string"
        );
      }

      if (expiryMinutes < 1 || expiryMinutes > 1440) {
        throw new McpError(
          ErrorCode.InvalidParams,
          "expiryMinutes must be between 1 and 1440 (24 hours)"
        );
      }

      try {
        const result = await createGitHubGist(diff, {
          outputFormat: format,
          showFileList,
          highlight,
          oldPath,
          newPath,
          expiryMinutes,
          public: isPublic,
        });

        // For backward compatibility, also include the raw HTML content
        const htmlContent = generateDiffHtml(diff, {
          outputFormat: format,
          showFileList,
          highlight,
          oldPath,
          newPath,
          isImageOutput: false,
        });

        // If autoOpen is requested, also open in browser
        if (autoOpen) {
          try {
            const { exec } = await import("child_process");
            const { promisify } = await import("util");
            const execAsync = promisify(exec);

            const platform = process.platform;
            let command: string;

            if (platform === "win32") {
              command = `start "" "${result.htmlUrl}"`;
            } else if (platform === "darwin") {
              command = `open "${result.htmlUrl}"`;
            } else {
              command = `xdg-open "${result.htmlUrl}"`;
            }

            await execAsync(command);

            return {
              content: [
                {
                  type: "text",
                  text: `${
                    result.message
                  }\n\n🌐 **Auto-opened in browser!**\n\n📋 **Raw HTML Content** (${
                    htmlContent.length
                  } chars):\n\n\`\`\`html\n${htmlContent.slice(0, 1000)}${
                    htmlContent.length > 1000
                      ? "...\n[Content truncated - see GitHub Gist for full HTML]"
                      : ""
                  }\n\`\`\``,
                },
              ],
            };
          } catch (openError) {
            // If browser open fails, just return the normal result
            return {
              content: [
                {
                  type: "text",
                  text: `${
                    result.message
                  }\n\n⚠️ **Could not auto-open browser**: ${openError}\n\n📋 **Raw HTML Content** (${
                    htmlContent.length
                  } chars):\n\n\`\`\`html\n${htmlContent.slice(0, 1000)}${
                    htmlContent.length > 1000
                      ? "...\n[Content truncated - see GitHub Gist for full HTML]"
                      : ""
                  }\n\`\`\``,
                },
              ],
            };
          }
        }

        return {
          content: [
            {
              type: "text",
              text: `${result.message}\n\n📋 **Raw HTML Content** (${
                htmlContent.length
              } chars):\n\n\`\`\`html\n${htmlContent.slice(0, 1000)}${
                htmlContent.length > 1000
                  ? "...\n[Content truncated - see GitHub Gist for full HTML]"
                  : ""
              }\n\`\`\``,
            },
          ],
        };
      } catch (error) {
        // Fallback to old behavior if GitHub token is not available
        if (error instanceof Error && error.message.includes("GITHUB_TOKEN")) {
          const htmlContent = generateDiffHtml(diff, {
            outputFormat: format,
            showFileList,
            highlight,
            oldPath,
            newPath,
            isImageOutput: false,
          });

          // If autoOpen is requested, save to temp file and open browser
          if (autoOpen) {
            const fs = await import("fs/promises");
            const os = await import("os");
            const path = await import("path");

            // Create temp file with timestamp
            const timestamp = new Date()
              .toISOString()
              .replace(/[-T:]/g, "")
              .slice(0, 14);
            const tempFileName = `diff-${timestamp}.html`;
            const tempFilePath = path.join(os.tmpdir(), tempFileName);

            // Save HTML to temp file
            await fs.writeFile(tempFilePath, htmlContent, "utf8");

            // Open in browser
            try {
              const { exec } = await import("child_process");
              const { promisify } = await import("util");
              const execAsync = promisify(exec);

              const platform = process.platform;
              let command: string;

              if (platform === "win32") {
                command = `start "" "${tempFilePath}"`;
              } else if (platform === "darwin") {
                command = `open "${tempFilePath}"`;
              } else {
                command = `xdg-open "${tempFilePath}"`;
              }

              await execAsync(command);

              return {
                content: [
                  {
                    type: "text",
                    text: `⚠️ GitHub token not available - fallback to local file\n\n🌐 **Opened in browser**: ${tempFilePath}\n\n📋 **HTML Content** (${htmlContent.length} chars):\n\n\`\`\`html\n${htmlContent}\n\`\`\``,
                  },
                ],
              };
            } catch (openError) {
              return {
                content: [
                  {
                    type: "text",
                    text: `⚠️ GitHub token not available - fallback to local HTML\n\n⚠️ **Could not open browser**: ${openError}\n📁 **Saved to**: ${tempFilePath}\n\n📋 **HTML Content**:\n\n\`\`\`html\n${htmlContent}\n\`\`\``,
                  },
                ],
              };
            }
          }

          return {
            content: [
              {
                type: "text",
                text: `⚠️ GitHub token not available - returning HTML content only\n\n💡 **Set GITHUB_TOKEN environment variable for GitHub Gist functionality**\n\n📋 **HTML Content**:\n\n\`\`\`html\n${htmlContent}\n\`\`\``,
              },
            ],
          };
        }

        throw new McpError(
          ErrorCode.InternalError,
          `GitHub Gist creation failed: ${
            error instanceof Error ? error.message : String(error)
          }`
        );
      }
    } else if (name === "visualize_diff_output_file") {
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
