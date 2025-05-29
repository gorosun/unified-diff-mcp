// 🌐 外部API経由でHTMLファイルを共有する新しいツール
// Smithery/Docker環境向けの解決策

/**
 * Generate HTML diff and upload to external service for sharing
 */
async function generateAndUploadDiff(
  diffText: string,
  options: {
    outputFormat?: "line-by-line" | "side-by-side";
    showFileList?: boolean;
    highlight?: boolean;
    oldPath?: string;
    newPath?: string;
    service?: "file.io" | "tmpfiles" | "0x0.st";
  } = {}
): Promise<{ url: string; html: string; service: string }> {
  const htmlContent = generateDiffHtml(diffText, options);
  
  try {
    if (options.service === "file.io" || !options.service) {
      // file.io API - 1回ダウンロードで自動削除
      const FormData = (await import('form-data')).default;
      const fetch = (await import('node-fetch')).default;
      
      const form = new FormData();
      const htmlBuffer = Buffer.from(htmlContent, 'utf8');
      form.append('file', htmlBuffer, {
        filename: `diff-${Date.now()}.html`,
        contentType: 'text/html'
      });
      
      const response = await fetch('https://file.io/', {
        method: 'POST',
        body: form
      });
      
      const result = await response.json() as any;
      
      if (result.success && result.link) {
        return {
          url: result.link,
          html: htmlContent,
          service: "file.io (auto-delete after download)"
        };
      }
    }
    
    if (options.service === "0x0.st") {
      // 0x0.st - シンプルなファイル共有
      const FormData = (await import('form-data')).default;
      const fetch = (await import('node-fetch')).default;
      
      const form = new FormData();
      form.append('file', Buffer.from(htmlContent, 'utf8'), `diff-${Date.now()}.html`);
      
      const response = await fetch('https://0x0.st/', {
        method: 'POST',
        body: form
      });
      
      const url = await response.text();
      
      if (url.startsWith('https://')) {
        return {
          url: url.trim(),
          html: htmlContent,
          service: "0x0.st (24h retention)"
        };
      }
    }
    
    throw new Error('All upload services failed');
    
  } catch (error) {
    throw new Error(`Upload failed: ${error}`);
  }
}

// 新しいMCPツールとして追加する場合
const newTool = {
  name: "visualize_diff_and_share",
  description: "Generate HTML diff visualization and upload to external sharing service (ideal for Docker/Smithery)",
  inputSchema: {
    type: "object",
    properties: {
      diff: {
        type: "string",
        description: "Unified diff text or filesystem edit_file dry-run output",
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
      service: {
        type: "string",
        enum: ["file.io", "0x0.st"],
        description: "External sharing service to use",
        default: "file.io",
      },
    },
    required: ["diff"],
  },
};

// ハンドラー実装例
async function handleDiffAndShare(args: any) {
  const { diff, format, showFileList, highlight, oldPath, newPath, service } = args;
  
  try {
    const result = await generateAndUploadDiff(diff, {
      outputFormat: format,
      showFileList,
      highlight,
      oldPath,
      newPath,
      service
    });
    
    return {
      content: [
        {
          type: "text",
          text: `🎉 HTML diff uploaded successfully!

🌐 **Direct Link**: ${result.url}
📋 **Service**: ${result.service}
🔗 **Click to view**: Simply click the link above to view the beautiful diff in your browser!

⚠️ **Note**: Link will expire according to service policy (file.io: after first download, 0x0.st: after 24h)

📄 **HTML Content** (${result.html.length} chars):

\`\`\`html
${result.html}
\`\`\``,
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: "text",
          text: `❌ Upload failed: ${error}

📋 **HTML Content** (fallback):

\`\`\`html
${generateDiffHtml(diff, { outputFormat: format, showFileList, highlight, oldPath, newPath })}
\`\`\``,
        },
      ],
    };
  }
}
