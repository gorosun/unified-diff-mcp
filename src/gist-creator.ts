/**
 * GitHub Gist作成機能
 * Web版Claude対応のセキュリティ強化を含む
 */

import { generateDiffHtml } from './html-generator.js';
import { 
  getSecurityConfig, 
  generatePasswordProtectedHTML, 
  generateWebClaudeSecurityResponse,
  type WebSecurityOptions 
} from './web-security.js';

export interface GistOptions {
  outputFormat?: "line-by-line" | "side-by-side";
  showFileList?: boolean;
  highlight?: boolean;
  oldPath?: string;
  newPath?: string;
  expiryMinutes?: number;
  public?: boolean;
  // Web版Claude対応オプション
  webClaudeMode?: boolean;
  securityLevel?: 'low' | 'medium' | 'high';
  customAccessCode?: string;
}

export interface GistResult {
  success: boolean;
  htmlUrl: string;
  rawUrl: string;
  gistUrl: string;
  editUrl: string;
  gistId: string;
  expiresAt: Date;
  message: string;
  // Web版Claude対応
  accessCode?: string;
  securityInfo?: string;
}

/**
 * Create GitHub Gist with diff visualization (Web版Claude対応)
 */
export async function createGitHubGist(
  diffText: string,
  options: GistOptions = {}
): Promise<GistResult> {
  const {
    outputFormat = "side-by-side",
    showFileList = true,
    highlight = true,
    oldPath = "file.txt",
    newPath = "file.txt",
    expiryMinutes = 30,
    public: isPublic = false,
    webClaudeMode = false,
    securityLevel = 'medium',
    customAccessCode
  } = options;

  const githubToken = process.env.GITHUB_TOKEN;
  
  // Web版Claudeモード（GitHubトークンなし）の場合
  if (webClaudeMode || !githubToken) {
    return await createWebClaudeGist(diffText, {
      ...options,
      securityLevel: securityLevel || 'medium'
    });
  }

  // 通常のGist作成（Desktop版Claude）
  return await createStandardGist(diffText, options, githubToken);
}

/**
 * Web版Claude向けセキュアGist作成
 */
async function createWebClaudeGist(
  diffText: string,
  options: GistOptions
): Promise<GistResult> {
  // この場合はローカル一時ファイル生成にフォールバック
  // 本来はCloudflare Workers等にデプロイしてHTTP endpoint提供
  throw new Error("Web版Claude mode requires deployment to cloud service (Cloudflare Workers/Vercel)");
}

/**
 * 標準的なGist作成（Desktop版Claude）
 */
async function createStandardGist(
  diffText: string,
  options: GistOptions,
  githubToken: string
): Promise<GistResult> {
  const {
    outputFormat = "side-by-side",
    showFileList = true,
    highlight = true,
    oldPath = "file.txt",  
    newPath = "file.txt",
    expiryMinutes = 30,
    public: isPublic = false,
    securityLevel = 'low',
    customAccessCode
  } = options;

  const timestamp = Date.now();
  const filename = `diff-${timestamp}.html`;

  // セキュリティ設定取得
  const securityConfig = getSecurityConfig(securityLevel, {
    expiryMinutes,
    customAccessCode
  });

  // HTML生成（パスワード保護の場合）
  let htmlContent: string;
  if (securityConfig.passwordProtected && securityConfig.accessCode) {
    htmlContent = generatePasswordProtectedHTML(
      diffText,
      securityConfig.accessCode,
      {
        outputFormat,
        showFileList,
        highlight,
        oldPath,
        newPath,
        expiryMinutes: securityConfig.expiryMinutes
      }
    );
  } else {
    const baseHtml = generateDiffHtml(diffText, {
      outputFormat,
      showFileList,
      highlight,
      oldPath,
      newPath,
      isImageOutput: false,
    });

    // 有効期限通知を追加
    htmlContent = baseHtml
      .replace(
        "<body>",
        `<body>
    <div style="background: #fff3cd; border: 1px solid #ffeaa7; padding: 10px; margin: 10px 0; border-radius: 4px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;">
        <span id="expiry-notice">⏰ This page will auto-delete in ${securityConfig.expiryMinutes} minutes</span>
    </div>`
      )
      .replace(
        "</body>",
        `
    <script>
        // Countdown timer
        const expiryTime = Date.now() + ${securityConfig.expiryMinutes * 60 * 1000};
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
                document.body.innerHTML = '<div style="text-align: center; padding: 50px; font-family: -apple-system, BlinkMacSystemFont, \\'Segoe UI\\', Helvetica, Arial, sans-serif;"><h1>🗑️ This content has expired</h1><p>This temporary diff visualization has been automatically removed.</p></div>';
            }
        };
        setInterval(updateCountdown, 1000);
        updateCountdown();
    </script>
</body>`
      );
  }

  // Gist作成
  const gistData = {
    description: `${securityConfig.description} (${oldPath} → ${newPath})`,
    public: securityConfig.publicGist,
    files: {
      [filename]: {
        content: htmlContent,
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
  const rawUrl = `https://gist.githubusercontent.com/${gist.owner.login}/${gist.id}/raw/${filename}`;
  const expiresAt = new Date(Date.now() + securityConfig.expiryMinutes * 60 * 1000);

  // 自動削除スケジュール
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
  }, securityConfig.expiryMinutes * 60 * 1000);

  // メッセージ生成
  const message = generateWebClaudeSecurityResponse(securityConfig, {
    htmlUrl: `https://htmlpreview.github.io/?${rawUrl}`,
    gistUrl: gist.html_url,
    editUrl: `${gist.html_url}/edit`
  }, securityConfig.accessCode);

  return {
    success: true,
    htmlUrl: `https://htmlpreview.github.io/?${rawUrl}`,
    rawUrl: rawUrl,
    gistUrl: gist.html_url,
    editUrl: `${gist.html_url}/edit`,
    gistId: gist.id,
    expiresAt,
    message,
    accessCode: securityConfig.accessCode,
    securityInfo: securityConfig.description
  };
}

/**
 * フォールバック: GitHubトークンなしの場合のローカルHTML生成
 */
export async function createLocalFallbackHtml(
  diffText: string,
  options: GistOptions = {}
): Promise<{ filePath: string; message: string; accessCode?: string }> {
  const {
    outputFormat = "side-by-side",
    showFileList = true,
    highlight = true,
    oldPath = "file.txt",
    newPath = "file.txt",
    securityLevel = 'medium',
    customAccessCode
  } = options;

  const fs = await import("fs/promises");
  const os = await import("os");
  const path = await import("path");

  // セキュリティ設定
  const securityConfig = getSecurityConfig(securityLevel, {
    expiryMinutes: options.expiryMinutes,
    customAccessCode
  });

  // HTML生成
  let htmlContent: string;
  if (securityConfig.passwordProtected && securityConfig.accessCode) {
    htmlContent = generatePasswordProtectedHTML(
      diffText,
      securityConfig.accessCode,
      {
        outputFormat,
        showFileList,
        highlight,
        oldPath,
        newPath,
        expiryMinutes: securityConfig.expiryMinutes
      }
    );
  } else {
    htmlContent = generateDiffHtml(diffText, {
      outputFormat,
      showFileList,
      highlight,
      oldPath,
      newPath,
      isImageOutput: false,
    });
  }

  // 一時ファイルに保存
  const timestamp = new Date()
    .toISOString()
    .replace(/[-T:]/g, "")
    .slice(0, 14);
  const tempFileName = `secure-diff-${timestamp}.html`;
  const tempFilePath = path.join(os.tmpdir(), tempFileName);

  await fs.writeFile(tempFilePath, htmlContent, "utf8");

  const message = `⚠️ **GitHub token not available - Local fallback mode**

🔒 **Security Level**: ${securityConfig.description}
📁 **Local file**: ${tempFilePath}
${securityConfig.accessCode ? `🔑 **Access code**: \`${securityConfig.accessCode}\`` : ''}

💡 **For Web版Claude support**: Deploy to Cloudflare Workers or Vercel
🖥️ **For full features**: Use Claude Desktop with GITHUB_TOKEN`;

  return {
    filePath: tempFilePath,
    message,
    accessCode: securityConfig.accessCode
  };
}