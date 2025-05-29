// 🔐 GitHub Personal Access Token を使用した認証付きGist作成
// より安全で高機能な実装

/**
 * 環境変数からGitHub認証情報を取得
 */
function getGitHubAuth(): { token?: string; username?: string } {
  return {
    token: process.env.GITHUB_TOKEN || process.env.GH_TOKEN,
    username: process.env.GITHUB_USERNAME || process.env.GH_USER
  };
}

/**
 * 認証付きでGitHub Gistを作成
 */
async function createAuthenticatedGist(
  htmlContent: string,
  options: {
    filename?: string;
    description?: string;
    isPublic?: boolean;
  } = {}
): Promise<{
  url: string;
  rawUrl: string;
  editUrl: string;
  gistId: string;
  isAuthenticated: boolean;
}> {
  const {
    filename = `diff-${new Date().toISOString().replace(/[-T:]/g, '').slice(0, 14)}.html`,
    description = `HTML Diff Visualization - ${new Date().toLocaleString()}`,
    isPublic = true
  } = options;

  const auth = getGitHubAuth();
  
  // ヘッダーの設定
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Accept': 'application/vnd.github.v3+json',
    'User-Agent': 'unified-diff-mcp/1.0.0'
  };

  // 認証トークンがある場合は追加
  if (auth.token) {
    headers['Authorization'] = `token ${auth.token}`;
  }

  try {
    const response = await fetch('https://api.github.com/gists', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        description,
        public: isPublic,
        files: {
          [filename]: {
            content: htmlContent
          }
        }
      })
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(`GitHub API error ${response.status}: ${error.message || 'Unknown error'}`);
    }

    const result = await response.json();
    
    return {
      url: result.html_url,                    // https://gist.github.com/username/gistid
      rawUrl: result.files[filename].raw_url,  // Raw HTML URL (直接ブラウザ表示)
      editUrl: `${result.html_url}/edit`,      // 編集URL
      gistId: result.id,                       // Gist ID
      isAuthenticated: !!auth.token            // 認証済みかどうか
    };
  } catch (error) {
    throw new Error(`Gist creation failed: ${error}`);
  }
}

/**
 * 匿名Gist作成のフォールバック
 */
async function createAnonymousGist(htmlContent: string): Promise<{
  url: string;
  rawUrl: string;
  isAuthenticated: boolean;
}> {
  try {
    const response = await fetch('https://api.github.com/gists', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/vnd.github.v3+json'
      },
      body: JSON.stringify({
        description: `Anonymous HTML Diff Visualization - ${new Date().toLocaleString()}`,
        public: true,
        files: {
          'diff-visualization.html': {
            content: htmlContent
          }
        }
      })
    });

    if (!response.ok) {
      throw new Error(`Anonymous Gist creation failed: ${response.status}`);
    }

    const result = await response.json();
    
    return {
      url: result.html_url,
      rawUrl: result.files['diff-visualization.html'].raw_url,
      isAuthenticated: false
    };
  } catch (error) {
    throw new Error(`Anonymous Gist creation failed: ${error}`);
  }
}

/**
 * スマートGist作成 - 認証ありを優先、フォールバックで匿名
 */
async function createSmartGist(
  htmlContent: string,
  options: {
    filename?: string;
    description?: string;
    oldPath?: string;
    newPath?: string;
  } = {}
): Promise<{
  url: string;
  rawUrl: string;
  editUrl?: string;
  gistId: string;
  isAuthenticated: boolean;
  owner?: string;
}> {
  const auth = getGitHubAuth();
  
  // ファイル名を改善
  const filename = options.filename || 
    `diff-${options.oldPath || options.newPath || 'file'}-${Date.now()}.html`
      .replace(/[^a-zA-Z0-9.-]/g, '_');

  const description = options.description || 
    `Diff: ${options.oldPath || 'file'} → ${options.newPath || 'file'} (${new Date().toLocaleString()})`;

  try {
    if (auth.token) {
      // 認証付きGist作成を試行
      console.error('Creating authenticated Gist...');
      const result = await createAuthenticatedGist(htmlContent, {
        filename,
        description,
        isPublic: true
      });
      
      return {
        ...result,
        owner: auth.username
      };
    } else {
      // 匿名Gist作成
      console.error('No GitHub token found, creating anonymous Gist...');
      const result = await createAnonymousGist(htmlContent);
      
      return {
        ...result,
        editUrl: undefined,
        gistId: result.url.split('/').pop() || '',
        owner: undefined
      };
    }
  } catch (error) {
    // 認証ありが失敗した場合、匿名でリトライ
    if (auth.token) {
      console.error('Authenticated Gist failed, trying anonymous...', error);
      try {
        const result = await createAnonymousGist(htmlContent);
        return {
          ...result,
          editUrl: undefined,
          gistId: result.url.split('/').pop() || '',
          owner: undefined
        };
      } catch (anonymousError) {
        throw new Error(`Both authenticated and anonymous Gist creation failed: ${error} | ${anonymousError}`);
      }
    } else {
      throw error;
    }
  }
}

/**
 * MCPツールハンドラー
 */
async function handleGitHubGistDiff(args: any) {
  const { diff, format, showFileList, highlight, oldPath, newPath } = args;
  
  try {
    // HTMLコンテンツ生成
    const htmlContent = generateDiffHtml(diff, {
      outputFormat: format || 'side-by-side',
      showFileList: showFileList !== false,
      highlight: highlight !== false,
      oldPath,
      newPath,
      isImageOutput: false,
    });

    // スマートGist作成
    const gistResult = await createSmartGist(htmlContent, {
      oldPath,
      newPath
    });

    const authStatus = gistResult.isAuthenticated 
      ? `✅ **Authenticated** (${gistResult.owner || 'your account'})` 
      : '🔓 **Anonymous** (consider setting GITHUB_TOKEN for better features)';

    return {
      content: [
        {
          type: "text",
          text: `🎉 **GitHub Gist created successfully!**

🌐 **View in browser**: ${gistResult.rawUrl}

📋 **Gist page**: ${gistResult.url}
${gistResult.editUrl ? `✏️ **Edit Gist**: ${gistResult.editUrl}` : ''}

🔐 **Authentication**: ${authStatus}

✨ **Features:**
- ✅ Direct browser display (no download)
- ✅ Beautiful ${format || 'side-by-side'} diff visualization
- ✅ Syntax highlighting enabled
- ✅ ${gistResult.isAuthenticated ? 'Owned by your GitHub account' : 'Anonymous (public)'}
- ✅ Permanent link (won't expire)

🚀 **Click the "View in browser" link to see your beautiful diff!**

---

📊 **Stats**: ${htmlContent.length} chars, ${(htmlContent.match(/\\n/g) || []).length} lines`,
        },
      ],
    };
  } catch (error) {
    // 完全なフォールバック
    const htmlContent = generateDiffHtml(diff, {
      outputFormat: format || 'side-by-side',
      showFileList: showFileList !== false,
      highlight: highlight !== false,
      oldPath,
      newPath,
    });
    
    return {
      content: [
        {
          type: "text",
          text: `⚠️ **Gist creation failed, but HTML is ready!**

❌ **Error**: ${error}

💡 **Suggestion**: Set GITHUB_TOKEN environment variable for better reliability

📋 **HTML Content** (copy and save as .html file):

\`\`\`html
${htmlContent}
\`\`\``,
        },
      ],
    };
  }
}

// 新しいMCPツール定義
const gitHubGistTool = {
  name: "visualize_diff_github_gist",
  description: "Create beautiful HTML diff and upload to GitHub Gist for browser viewing (supports authentication)",
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
