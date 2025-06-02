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
    version: "1.1.1", // Updated for Claude Code integration
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

/**
 * クロードコードのedit_file dryRun出力を処理する関数
 * dryRun出力から差分テキストを抽出する
 */
function processDryRunOutput(input: string): string {
  // クロードコードのdryRun出力形式をチェック
  if (!input) return '';
  
  // JSONフォーマットのdryRun出力をパースしてみる
  try {
    const jsonResult = JSON.parse(input);
    
    // JSONには通常diffプロパティが含まれる
    if (jsonResult.diff) {
      return jsonResult.diff;
    }
    
    // 詳細なdiff情報がある場合（formattedDiffなど）
    if (jsonResult.formattedDiff) {
      return jsonResult.formattedDiff;
    }
    
    // その他の可能性を確認
    if (typeof jsonResult === 'string' && jsonResult.includes('---') && jsonResult.includes('+++')) {
      return jsonResult;
    }
  } catch (e) {
    // JSONでない場合は通常のテキスト差分と判断
    // diffフォーマットのヘッダーを確認
    if (input.includes('---') && input.includes('+++')) {
      return input;
    }
  }
  
  // 差分形式でなければそのまま返す
  return input;
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
    outputType = DEFAULT_OUTPUT_MODE,
  } = options;

  // Process dry run output if necessary
  const processedDiff = processDryRunOutput(diffText);

  // Generate HTML first
  const html = generateDiffHtml(processedDiff, {
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
  
  // Cloud環境（Smithly）でのパス処理
  const fs = await import("fs/promises");
  const path = await import("path");
  
  // クラウド環境とローカル環境の判定
  const isCloudEnvironment = process.cwd().startsWith('/app') || process.env.SMITHLY_CLOUD === 'true';
  
  let outputDir: string;
  let filePath: string;
  
  if (isCloudEnvironment) {
    // クラウド環境（Smithly）の場合
    console.error('☁️ Cloud environment (Smithly) detected');
    outputDir = '/app/output';
    filePath = path.join(outputDir, filename);
    
    console.error(`📁 Cloud output dir: ${outputDir}`);
    console.error(`📄 Cloud file path: ${filePath}`);
  } else {
    // ローカル環境の場合
    console.error('🖥️ Local environment detected');
    outputDir = path.join(process.cwd(), "output");
    filePath = path.join(outputDir, filename);
  }

  // Ensure output directory exists
  try {
    await fs.access(outputDir);
    console.error(`✅ Output directory exists: ${outputDir}`);
  } catch {
    await fs.mkdir(outputDir, { recursive: true });
    console.error(`📁 Created output directory: ${outputDir}`);
  }

  if (outputType === "html") {
    // Save HTML file
    await fs.writeFile(filePath, html, "utf8");
    console.error(`✅ HTML file saved: ${filePath}`);
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
    console.error(`✅ PNG image saved: ${filePath}`);
  }

  // Auto-open if requested (クラウド環境では無効)
  // isCloudEnvironment already declared above, reuse it
  
  if (autoOpen && !isCloudEnvironment) {
    // ローカル環境でのautoOpen処理
    console.error('🖥️ Local environment: Processing autoOpen request');
  try {
  const { exec } = await import("child_process");
  const { promisify } = await import("util");
  const execAsync = promisify(exec);

  const targetPath = path.resolve(filePath);
  
  const timestamp = new Date()
  .toISOString()
            .replace(/[-T:]/g, "")
    .slice(0, 14);
          const openUrl = outputType === "html" ? `file://${targetPath}?t=${timestamp}` : targetPath;

  console.error(`Attempting to open ${outputType}: ${openUrl}`);

  const platform = process.platform;
  let command: string;

  if (platform === "win32") {
    command = `start "" "${targetPath}"`;
  } else if (platform === "darwin") {
            command = `open "${targetPath}"`;
  } else {
      command = `xdg-open "${targetPath}"`;
  }

  const result = await execAsync(command);
  console.error(`Successfully opened ${outputType}: ${targetPath}`);
  
          await new Promise(resolve => setTimeout(resolve, 1000));
  
  } catch (error) {
  console.error(`Auto-open failed: ${error}`);
  try {
  const { spawn } = await import("child_process");
  const fallbackPath = path.resolve(filePath);
    const platform = process.platform;

    if (platform === "win32") {
          spawn('cmd', ['/c', 'start', '', fallbackPath], { detached: true, stdio: 'ignore' });
            } else if (platform === "darwin") {
              spawn('open', [fallbackPath], { detached: true, stdio: 'ignore' });
            } else {
              try {
                spawn('xdg-open', [fallbackPath], { detached: true, stdio: 'ignore' });
              } catch (xdgError) {
                spawn('firefox', [fallbackPath], { detached: true, stdio: 'ignore' });
              }
            }
            console.error(`Fallback auto-open attempted for: ${fallbackPath}`);
          } catch (fallbackError) {
            console.error(`Fallback auto-open also failed: ${fallbackError}`);
          }
        }
  } else if (autoOpen && isCloudEnvironment) {
    console.error('☁️ Cloud environment: autoOpen not supported, content will be returned as data URI');
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

      // Process dry run output if necessary
      const processedDiff = processDryRunOutput(diff);

      try {
        const result = await createGitHubGist(processedDiff, {
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
        console.error(`🚨 Primary GitHub Gist creation failed: ${error}`);
        
        // Fallback for Web版Claude or when GitHub token is not available
        if (
          error instanceof Error && 
          (error.message.includes("GITHUB_TOKEN") || error.message.includes("token") || webClaudeMode)
        ) {
          console.error('🔄 Switching to secure local fallback mode...');
          try {
            const fallbackResult = await createLocalFallbackHtml(processedDiff, {
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

      // クラウド環境でのレスポンス処理
      const path = await import("path");
      const isCloudEnvironment = process.cwd().startsWith('/app') || process.env.SMITHLY_CLOUD === 'true';
      
      if (isCloudEnvironment) {
        // クラウド環境: HTMLコンテンツを直接返す
        console.error('☁️ Cloud environment: Returning HTML content directly');
        
        // ファイルからHTMLコンテンツを読み取り
        const fs = await import("fs/promises");
        let htmlContent: string;
        try {
          htmlContent = await fs.readFile(filePath, 'utf8');
        } catch (error) {
          throw new McpError(
            ErrorCode.InternalError,
            `Failed to read generated file: ${error}`
          );
        }
        
        // data URIとして埋め込み
        const dataUri = `data:text/html;charset=utf-8,${encodeURIComponent(htmlContent)}`;
        
        return {
          content: [
            {
              type: "text",
              text: `✅ **Diff ${outputType} generated successfully!**\n\n🌐 **Cloud Environment**: Smithly Docker container\n\n🔗 **Diff Visualization**:\n${dataUri}\n\n${
                autoOpen ? "🌐 **Status**: Content ready for viewing" : "📝 **Status**: Ready for manual opening"
              }\n\n🛠️ **Features**: Beautiful styling, responsive design, syntax highlighting\n🖥️ **Compatibility**: Works in all modern browsers\n\n💡 **使い方**: 上記リンクをクリックしてブラウザで表示！`,
            },
          ],
        };
      } else {
        // ローカル環境: ファイルURLを返す
        const finalPath = path.resolve(filePath);
        const fileUrl = `file://${finalPath}`;
        
        console.error(`🔗 Local file path: ${finalPath}`);
        console.error(`🌐 File URL: ${fileUrl}`);
        
        return {
          content: [
            {
              type: "text",
              text: `✅ **Diff ${outputType} generated successfully!**\n\n🔗 **File Location**:\n${fileUrl}\n\n${
                autoOpen ? "🌐 **Status**: Opened automatically in default application" : "📝 **Status**: Ready for manual opening"
              }\n\n🛠️ **Features**: Beautiful styling, responsive design, syntax highlighting\n🖥️ **Compatibility**: Works on all major operating systems\n\n💡 **使い方**: 上記リンクをクリックしてブラウザで開く！`,
            },
          ],
        };
      }
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
  console.error("Unified Diff MCP Server v1.1.1 running on stdio");
  console.error("🌐 Web版Claude support enabled with enhanced security");
  console.error("💻 Claude Code integration added with edit_file dryRun support");
}

if (process.argv[1] === __filename) {
  main().catch((error) => {
    console.error("Server error:", error);
    process.exit(1);
  });
}

export { server };