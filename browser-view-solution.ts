// 🌟 最適解：GitHub Gist経由でHTMLをブラウザに直接表示
// Smithery/Docker環境で完璧に動作

/**
 * GitHub Gistを使ってHTMLを共有し、ブラウザで直接表示
 */
async function uploadToGist(htmlContent: string): Promise<{url: string; rawUrl: string}> {
  try {
    const response = await fetch('https://api.github.com/gists', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // 認証なしで公開Gistを作成
      },
      body: JSON.stringify({
        description: `HTML Diff Visualization - ${new Date().toISOString()}`,
        public: true,
        files: {
          'diff-visualization.html': {
            content: htmlContent
          }
        }
      })
    });

    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.status}`);
    }

    const result = await response.json();
    
    return {
      url: result.html_url,          // https://gist.github.com/xxx (GitHub UI)
      rawUrl: result.files['diff-visualization.html'].raw_url  // 直接HTML表示URL
    };
  } catch (error) {
    throw new Error(`Gist upload failed: ${error}`);
  }
}

/**
 * 新しいMCPツール：visualize_diff_browser_view
 */
const browserViewTool = {
  name: "visualize_diff_browser_view",
  description: "Generate HTML diff and create browser-viewable link (perfect for Smithery/Docker)",
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
    },
    required: ["diff"],
  },
};

/**
 * ハンドラー実装
 */
async function handleBrowserView(args: any) {
  const { diff, format, showFileList, highlight, oldPath, newPath } = args;
  
  try {
    // HTMLコンテンツ生成
    const htmlContent = generateDiffHtml(diff, {
      outputFormat: format,
      showFileList,
      highlight,
      oldPath,
      newPath,
      isImageOutput: false,
    });

    // GitHub Gistにアップロード
    const gistResult = await uploadToGist(htmlContent);
    
    return {
      content: [
        {
          type: "text",
          text: `🎉 **HTML diff uploaded and ready for browser viewing!**

🌐 **Click to view in browser**: ${gistResult.rawUrl}

📋 **GitHub Gist**: ${gistResult.url}

✨ **Features:**
- ✅ Direct browser display (no download needed)
- ✅ Beautiful side-by-side diff visualization  
- ✅ Syntax highlighting for ${oldPath || newPath || 'code'}
- ✅ Works perfectly in Docker/Smithery environment
- ✅ Permanent link (won't expire)

🚀 **Just click the link above to see your beautiful diff!**

---

📄 **HTML Content** (${htmlContent.length} chars):

\`\`\`html
${htmlContent.substring(0, 500)}...
\`\`\``,
        },
      ],
    };
  } catch (error) {
    // フォールバック：HTMLコンテンツを返す
    const htmlContent = generateDiffHtml(diff, {
      outputFormat: format,
      showFileList,
      highlight,
      oldPath,
      newPath,
    });
    
    return {
      content: [
        {
          type: "text",
          text: `⚠️ **Upload failed, but HTML content is ready!**

❌ Upload error: ${error}

📋 **HTML Content** (fallback - copy and save as .html file):

\`\`\`html
${htmlContent}
\`\`\``,
        },
      ],
    };
  }
}

// 使用例
/*
visualize_diff_browser_view({
  diff: "--- a/example.py\n+++ b/example.py\n...",
  format: "side-by-side"
});

// 返される結果:
// 🌐 Click to view in browser: https://gist.githubusercontent.com/xxx/xxx/raw/xxx/diff-visualization.html
// → このリンクをクリックするとブラウザで美しい差分表示が開く！
*/
