#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from "@modelcontextprotocol/sdk/types.js";

import { dirname, join } from "path";
import { chromium } from "playwright-core";
import { fileURLToPath } from "url";
import { generateDiffHtml } from './html-generator.js';
import { createGitHubGist, createLocalFallbackHtml } from './gist-creator.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Get default settings from environment
const DEFAULT_AUTO_OPEN = process.env.DEFAULT_AUTO_OPEN === "true";
const DEFAULT_OUTPUT_MODE =
  (process.env.DEFAULT_OUTPUT_MODE as "image" | "html") || "html";

const server = new Server(
  {
    name: "unified-diff-mcp",
    version: "1.1.0", // Updated for Web版Claude support
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

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
    outputType = DEFAULT_OUTPUT_MODE,
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
      viewport: { width: 1800, height: 1200 },
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

      const timestamp = new Date()
        .toISOString()
        .replace(/[-T:]/g, "")
        .slice(0, 14);
      const openUrl =
        outputType === "html" ? `file://${filePath}?t=${timestamp}` : filePath;

      console.error(`Attempting to open ${outputType}: ${openUrl}`);

      const platform = process.platform;
      let command: string;

      if (platform === "win32") {
        command = `start "" "${filePath}"`;
      } else if (platform === "darwin") {
        command =
          outputType === "html" ? `open "${openUrl}"` : `open "${filePath}"`;
      } else {
        command = `xdg-open "${filePath}"`;
      }

      await execAsync(command);
      console.error(`Successfully opened ${outputType}: ${filePath}`);
    } catch (error) {
      console.error(`Auto-open failed: ${error}`);
      // Fallback handling
      try {
        const { exec } = await import("child_process");
        const platform = process.platform;

        if (platform === "win32") {
          exec(`explorer "${filePath}"`);
        } else if (platform === "darwin") {
          exec(
            `osascript -e 'tell application "Finder" to open POSIX file "${filePath}"'`
          );
        } else {
          exec(`xdg-open "${filePath}"`);
        }
      } catch (fallbackError) {
        console.error(`Fallback auto-open also failed: ${fallbackError}`);
      }
    }
  }

  return filePath;
}

// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "visualize_diff_html_content",
        description:
          "Create a temporary GitHub Gist with HTML diff visualization that auto-deletes after specified time. Supports Web版Claude with enhanced security options.",
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
            // Web版Claude対応オプション
            securityLevel: {
              type: "string",
              enum: ["low", "medium", "high"],
              description: "Security level for Web版Claude (low: 60min, medium: 30min+password, high: 15min+password)",
              default: "medium",
            },
            webClaudeMode: {
              type: "boolean",
              description: "Enable Web版Claude compatibility mode with enhanced security",
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
        securityLevel = "medium",
        webClaudeMode = false,
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
        securityLevel?: "low" | "medium" | "high";
        webClaudeMode?: boolean;
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
          securityLevel,
          webClaudeMode,
        });

        // If autoOpen is requested, open in browser
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
                  text: `${result.message}\n\n🌐 **Auto-opened in browser!**`,
                },
              ],
            };
          } catch (openError) {
            return {
              content: [
                {
                  type: "text",
                  text: `${result.message}\n\n⚠️ **Could not auto-open browser**: ${openError}`,
                },
              ],
            };
          }
        }

        return {
          content: [
            {
              type: "text",
              text: result.message,
            },
          ],
        };
      } catch (error) {
        // Fallback for Web版Claude or when GitHub token is not available
        if (
          error instanceof Error && 
          (error.message.includes("GITHUB_TOKEN") || webClaudeMode)
        ) {
          try {
            const fallbackResult = await createLocalFallbackHtml(diff, {
              outputFormat: format,
              showFileList,
              highlight,
              oldPath,
              newPath,
              expiryMinutes,
              securityLevel,
            });

            // Auto-open fallback file if requested
            if (autoOpen) {
              try {
                const { exec } = await import("child_process");
                const { promisify } = await import("util");
                const execAsync = promisify(exec);

                const platform = process.platform;
                let command: string;

                if (platform === "win32") {
                  command = `start "" "${fallbackResult.filePath}"`;
                } else if (platform === "darwin") {
                  command = `open "${fallbackResult.filePath}"`;
                } else {
                  command = `xdg-open "${fallbackResult.filePath}"`;
                }

                await execAsync(command);

                return {
                  content: [
                    {
                      type: "text",
                      text: `${fallbackResult.message}\n\n🌐 **Auto-opened in browser!**`,
                    },
                  ],
                };
              } catch (openError) {
                return {
                  content: [
                    {
                      type: "text",
                      text: `${fallbackResult.message}\n\n⚠️ **Could not auto-open browser**: ${openError}`,
                    },
                  ],
                };
              }
            }

            return {
              content: [
                {
                  type: "text",
                  text: fallbackResult.message,
                },
              ],
            };
          } catch (fallbackError) {
            throw new McpError(
              ErrorCode.InternalError,
              `Both GitHub Gist and local fallback failed: ${fallbackError}`
            );
          }
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
  console.error("Unified Diff MCP Server v1.1.0 running on stdio");
  console.error("🌐 Web版Claude support enabled with enhanced security");
}

if (process.argv[1] === __filename) {
  main().catch((error) => {
    console.error("Server error:", error);
    process.exit(1);
  });
}

export { server };
