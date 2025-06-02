/**
 * Web版Claude対応セキュリティ機能
 * Web版ClaudeでGitHubトークンが使えない場合のセキュリティ強化
 */

import { generateDiffHtml } from './html-generator.js';

export interface WebSecurityOptions {
  securityLevel: 'low' | 'medium' | 'high';
  expiryMinutes?: number;
  customAccessCode?: string;
}

export interface SecureGistConfig {
  expiryMinutes: number;
  passwordProtected: boolean;
  accessCode?: string;
  publicGist: boolean;
  description: string;
}

/**
 * Generate simple hash for password protection
 */
export function generateSimpleHash(input?: string): string {
  const text = input || Math.random().toString(36).substring(2, 8);
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    const char = text.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16);
}

/**
 * セキュリティレベル別設定生成
 */
export function getSecurityConfig(
  securityLevel: 'low' | 'medium' | 'high',
  customOptions?: Partial<WebSecurityOptions>
): SecureGistConfig {
  const configs = {
    low: {
      expiryMinutes: 60,
      passwordProtected: false,  // パスワード保護を無効化
      publicGist: false,
      description: '🟢 Low Security - Secret Gist (60min auto-delete)'
    },
    medium: {
      expiryMinutes: 30,
      passwordProtected: false,  // パスワード保護を無効化
      publicGist: false,
      description: '🟡 Medium Security - Secret Gist (30min auto-delete)'
    },
    high: {
      expiryMinutes: 15,
      passwordProtected: false,  // パスワード保護を無効化
      publicGist: false,
      description: '🔴 High Security - Secret Gist (15min auto-delete)'
    }
  };

  const baseConfig = configs[securityLevel];
  // パスワード保護が無効なのでアクセスコードも生成しない
  const accessCode = undefined;

  return {
    ...baseConfig,
    expiryMinutes: customOptions?.expiryMinutes || baseConfig.expiryMinutes,
    accessCode
  };
}

/**
 * パスワード保護HTML生成
 */
export function generatePasswordProtectedHTML(
  diffText: string, 
  accessCode: string,
  options: {
    outputFormat?: "line-by-line" | "side-by-side";
    showFileList?: boolean;
    highlight?: boolean;
    oldPath?: string;
    newPath?: string;
    expiryMinutes?: number;
  } = {}
): string {
  const baseDiffHtml = generateDiffHtml(diffText, {
    ...options,
    isImageOutput: false
  });
  
  const expectedHash = generateSimpleHash(accessCode);
  
  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>🔒 Secure Diff Preview</title>
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/diff2html/bundles/css/diff2html.min.css" />
    <style>
        .password-overlay {
            position: fixed;
            top: 0; left: 0;
            width: 100%; height: 100%;
            background: rgba(0,0,0,0.95);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 9999;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;
        }
        .password-form {
            background: white;
            padding: 40px;
            border-radius: 12px;
            text-align: center;
            box-shadow: 0 10px 25px rgba(0,0,0,0.3);
            max-width: 400px;
            width: 90%;
        }
        .password-form h3 {
            margin-top: 0;
            color: #333;
            font-size: 24px;
        }
        .password-form input {
            width: 100%;
            padding: 12px;
            margin: 15px 0;
            border: 2px solid #ddd;
            border-radius: 6px;
            font-size: 16px;
            box-sizing: border-box;
        }
        .password-form button {
            width: 100%;
            padding: 12px;
            background: #007bff;
            color: white;
            border: none;
            border-radius: 6px;
            font-size: 16px;
            cursor: pointer;
            transition: background 0.2s;
        }
        .password-form button:hover {
            background: #0056b3;
        }
        .security-info {
            margin-top: 20px;
            padding: 15px;
            background: #f8f9fa;
            border-radius: 6px;
            font-size: 14px;
            color: #666;
            text-align: left;
        }
        .countdown-timer {
            margin-top: 10px;
            padding: 10px;
            background: #fff3cd;
            border-radius: 4px;
            border: 1px solid #ffeaa7;
            font-size: 13px;
            color: #856404;
        }
    </style>
</head>
<body>
    <div id="password-overlay" class="password-overlay">
        <div class="password-form">
            <h3>🔒 Secure Diff Access</h3>
            <p>This diff visualization is password protected for security.</p>
            <input type="password" id="password-input" placeholder="Enter access code" onkeypress="handleKeyPress(event)">
            <button onclick="checkPassword()">🔓 Access Diff</button>
            <div class="security-info">
                <strong>🛡️ Security Level:</strong> Secret Gist + Password<br>
                <strong>🔒 Access:</strong> URL + Password Required<br>
                <strong>⏰ Auto-delete:</strong> ${options.expiryMinutes || 30} minutes
            </div>
            ${options.expiryMinutes ? `
            <div class="countdown-timer">
                <span id="countdown-display">⏰ Expires in ${options.expiryMinutes} minutes</span>
            </div>
            ` : ''}
        </div>
    </div>
    
    <div id="diff-content" style="display:none;">
        ${baseDiffHtml.replace(/<\/head>/, '</head>').replace(/<body[^>]*>/, '').replace(/<\/body>/, '').replace(/<\/html>/, '')}
    </div>
    
    <script src="https://cdn.jsdelivr.net/npm/diff2html/bundles/js/diff2html-ui.min.js"></script>
    <script>
        function simpleHash(str) {
            let hash = 0;
            for (let i = 0; i < str.length; i++) {
                const char = str.charCodeAt(i);
                hash = ((hash << 5) - hash) + char;
                hash = hash & hash;
            }
            return Math.abs(hash).toString(16);
        }
        
        function checkPassword() {
            const password = document.getElementById('password-input').value;
            const expectedHash = '${expectedHash}';
            
            if (simpleHash(password) === expectedHash) {
                document.getElementById('password-overlay').style.display = 'none';
                document.getElementById('diff-content').style.display = 'block';
                
                // Initialize diff2html UI
                if (typeof Diff2HtmlUI !== 'undefined') {
                    const targetElement = document.querySelector('.d2h-wrapper');
                    if (targetElement) {
                        const diff2htmlUi = new Diff2HtmlUI(targetElement);
                        diff2htmlUi.highlightCode();
                    }
                }
            } else {
                alert('🚫 Invalid access code. Please try again.');
                document.getElementById('password-input').value = '';
            }
        }
        
        function handleKeyPress(event) {
            if (event.key === 'Enter') {
                checkPassword();
            }
        }
        
        ${options.expiryMinutes ? `
        // Countdown timer
        const expiryTime = Date.now() + ${options.expiryMinutes * 60 * 1000};
        function updateCountdown() {
            const remaining = Math.max(0, Math.floor((expiryTime - Date.now()) / 1000));
            const minutes = Math.floor(remaining / 60);
            const seconds = remaining % 60;
            const display = document.getElementById('countdown-display');
            if (display) {
                display.innerHTML = remaining > 0
                    ? \`⏰ Expires in \${minutes}:\${seconds.toString().padStart(2, '0')}\`
                    : '🗑️ This content has expired';
            }
        }
        setInterval(updateCountdown, 1000);
        updateCountdown();
        ` : ''}
        
        // Focus on password input
        document.addEventListener('DOMContentLoaded', function() {
            document.getElementById('password-input').focus();
        });
    </script>
</body>
</html>`;
}

/**
 * Web版Claude向けセキュアレスポンス生成
 */
export function generateWebClaudeSecurityResponse(config: SecureGistConfig, gistResult: any, accessCode?: string): string {
  const securityEmoji = {
    15: '🔴',  // High security
    30: '🟡',  // Medium security  
    60: '🟢'   // Low security
  }[config.expiryMinutes] || '🟡';

  return `🌐 **Web版Claude対応 - シンプルdiff可視化**

${securityEmoji} **セキュリティレベル**: ${config.description}
⏰ **自動削除**: ${config.expiryMinutes}分後

🔗 **プレビューリンク**:
${gistResult.htmlUrl}

✅ **改善された体験**:
• パスワード不要 - 即座アクセス可能
• Secret Gist - GitHub検索・プロフィールに非表示
• 短時間自動削除 - ${config.expiryMinutes}分で自動削除
• 美しいスタイリングと高速読み込み

💡 **使い方**: 上記リンクをクリックして即座表示！`;
}
