# 高度な統合ガイド

このドキュメントは、上級ユーザーおよび開発者向けの詳細な技術情報を提供します。

## 🛠️ 現在のツール仕様

### 利用可能なツール (v1.0+)

| ツール | 目的 | 出力 | 最適な用途 |
|--------|------|------|-----------|
| **`visualize_diff_html_content`** | GitHub Gist + ブラウザ表示 | GitHub Gist URL + HTMLプレビュー | 共有、即座の表示 |
| **`visualize_diff_output_file`** | ローカルファイル保存 | ローカルPNG/HTMLファイル | ドキュメント、プレゼンテーション |

### 詳細パラメータリファレンス

#### `visualize_diff_html_content`

**目的**: 美しいHTML差分可視化を含む一時的なGitHub Gistを作成

**パラメータ**:
- **`diff`** (string, 必須): 統一差分テキストまたはfilesystem edit_file dry-run出力
- **`format`** (string): `'line-by-line'` または `'side-by-side'` (デフォルト: `'side-by-side'`)
- **`showFileList`** (boolean): ファイルリストサマリーを表示 (デフォルト: `true`)
- **`highlight`** (boolean): シンタックスハイライトを有効化 (デフォルト: `true`)
- **`oldPath`** (string): コンテキスト表示用の元ファイルパス
- **`newPath`** (string): コンテキスト表示用の変更後ファイルパス
- **`autoOpen`** (boolean): ブラウザでHTMLプレビューを自動表示 (デフォルト: `false`)
- **`expiryMinutes`** (number): 自動削除時間、1-1440分 (デフォルト: `30`)
- **`public`** (boolean): パブリックGist vs シークレットGist (デフォルト: `false`)

**出力**:
- HTMLプレビュー付きGitHub Gist URL
- Raw HTMLコンテンツ（フォールバック用）
- 複数のビューアオプション（HTMLPreview、GitHack等）

#### `visualize_diff_output_file`

**目的**: 差分可視化を生成してローカル出力ディレクトリに保存

**パラメータ**:
- **`diff`** (string, 必須): 統一差分テキストまたはfilesystem edit_file dry-run出力
- **`format`** (string): `'line-by-line'` または `'side-by-side'` (デフォルト: `'side-by-side'`)
- **`showFileList`** (boolean): ファイルリストサマリーを表示 (デフォルト: `true`)
- **`highlight`** (boolean): シンタックスハイライトを有効化 (デフォルト: `true`)
- **`oldPath`** (string): コンテキスト表示用の元ファイルパス
- **`newPath`** (string): コンテキスト表示用の変更後ファイルパス
- **`autoOpen`** (boolean): 生成ファイルを自動表示 (デフォルト: `DEFAULT_AUTO_OPEN`から)
- **`outputType`** (string): `'html'` または `'image'` (デフォルト: `DEFAULT_OUTPUT_MODE`から)

**出力**:
- ローカルファイル: `/path/to/project/output/diff-image.html` または `.png`
- 固定ファイル名によりディスク容量の無駄遣いを防止

## 🏗️ アーキテクチャ詳細

### 差分処理パイプライン

```
入力差分テキスト
       │
       ▼
┌─────────────────┐
│ convertToUnified│  ◄── 様々な差分フォーマットを正規化
│ Diff()          │
└─────────────────┘
       │
       ▼
┌─────────────────┐
│ diff2html.html()│  ◄── シンタックスハイライト付きスタイル化HTML生成
└─────────────────┘
       │
       ▼
┌─────────────────┐
│ generateDiffHtml│  ◄── 完全なHTMLドキュメント + スタイルでラップ
│ ()              │
└─────────────────┘
       │
       ├─────────────────────┬─────────────────────┐
       ▼                     ▼                     ▼
┌─────────────────┐   ┌─────────────────┐   ┌─────────────────┐
│ GitHub Gist     │   │ ローカルHTML    │   │ Playwright      │
│ + HTMLプレビュー │   │ ファイル出力    │   │ スクリーンショット│
└─────────────────┘   └─────────────────┘   └─────────────────┘
                                                     │
                                                     ▼
                                              ┌─────────────────┐
                                              │ PNGイメージ     │
                                              │ 出力            │
                                              └─────────────────┘
```

### GitHub Gist統合

#### 機能
- **自動HTMLプレビュー**: 即座の表示のため`https://htmlpreview.github.io/`を使用
- **複数ビューア**: GitHack、RawGitの代替手段を提供
- **自動削除**: 設定可能な有効期限（1-1440分）
- **カウントダウンタイマー**: HTML内でリアルタイム削除カウントダウン
- **デフォルトでシークレット**: 安全で非公開のGist

#### 実装詳細
```typescript
// 有効期限通知付きGist作成
const htmlWithExpiry = baseHtml
  .replace('<body>', `<body><div id="expiry-notice">...</div>`)
  .replace('</body>', `<script>/* カウントダウンタイマー */</script></body>`);

// スケジュール削除
setTimeout(() => deleteGist(gistId), expiryMinutes * 60 * 1000);
```

### ローカルファイル出力戦略

#### ファイル管理
- **固定ファイル名**: `diff-image.html` と `diff-image.png` でディスク肥大化を防止
- **アトミック書き込み**: 自動表示前にファイル書き込み完了
- **ディレクトリ作成**: `/output` ディレクトリの自動作成
- **上書き戦略**: 最新の差分が前の出力を置き換え

#### PNG生成プロセス
```typescript
// 高品質PNG生成
const browser = await chromium.launch();
const page = await browser.newPage({ 
  viewport: { width: 1800, height: 1200 } 
});
await page.setContent(html);
await page.screenshot({ path: filePath, fullPage: true, type: "png" });
```

## 🌍 プラットフォーム固有の実装

### 自動表示メカニズム

| プラットフォーム | プライマリコマンド | フォールバックコマンド | 備考 |
|----------------|--------------------|----------------------|------|
| **Windows** | `start "" "${filePath}"` | `explorer "${filePath}"` | Windows 11+推奨 |
| **macOS** | `open "${filePath}"` | `osascript`経由のAppleScript | macOS Sequoia 15+推奨 |
| **Linux** | `xdg-open "${filePath}"` | なし | GUI環境が必要 |

#### Windows実装
```typescript
if (platform === 'win32') {
  command = `start "" "${filePath}"`;
  // フォールバック: exec(`explorer "${filePath}"`);
}
```

#### macOS実装
```typescript
if (platform === 'darwin') {
  command = outputType === 'html' 
    ? `open "${openUrl}"` // キャッシュバスティングURLをサポート
    : `open "${filePath}"`;
  // フォールバック: FinderでAppleScript
}
```

#### Linux実装
```typescript
if (platform !== 'win32' && platform !== 'darwin') {
  command = `xdg-open "${filePath}"`;
  // 注意: HTMLキャッシュバスティングは全てのデスクトップ環境で動作しない可能性
}
```

**Linuxテスト状況**: 実装済みですが、Ubuntu/その他のディストリビューションで包括的なテストは未実施。適切に設定されたデフォルトアプリケーションを持つGUI環境で動作するはずです。

## 🔧 高度な設定

### 環境変数

| 変数 | 型 | デフォルト | 説明 |
|------|----|-----------|----- |
| `GITHUB_TOKEN` | string | - | GitHub Gist機能に必要 |
| `DEFAULT_AUTO_OPEN` | boolean | `false` | グローバル自動表示設定 |
| `DEFAULT_OUTPUT_MODE` | string | `html` | デフォルト出力タイプ（`html` または `image`） |
| `NODE_ENV` | string | - | `development` または `production` |
| `PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD` | boolean | `false` | Chromiumダウンロードをスキップ |

### 高度なClaude Desktop設定

#### 開発モード（ホットリロード）
```json
{
  "mcpServers": {
    "unified-diff-mcp": {
      "command": "bun",
      "args": ["--watch", "/path/to/unified-diff-mcp/src/index.ts"],
      "env": {
        "NODE_ENV": "development",
        "GITHUB_TOKEN": "your_token_here",
        "DEFAULT_AUTO_OPEN": "true"
      }
    }
  }
}
```

#### 本番モード（安定版）
```json
{
  "mcpServers": {
    "unified-diff-mcp": {
      "command": "bun",
      "args": ["run", "/path/to/unified-diff-mcp/src/index.ts"],
      "env": {
        "NODE_ENV": "production",
        "GITHUB_TOKEN": "your_token_here",
        "DEFAULT_OUTPUT_MODE": "html"
      }
    }
  }
}
```

### diff2html設定

#### サポート機能
- **出力フォーマット**: 行毎、横並び比較
- **シンタックスハイライト**: 140+言語（JavaScript、TypeScript、Python、Go、Rust等）
- **レスポンシブデザイン**: CSSブレークポイント付きモバイル対応
- **ファイル統計**: 色分けされた追加/削除カウント
- **インタラクティブ機能**: 折りたたみ可能セクション、展開可能コンテキスト

#### カスタマイゼーションオプション
```typescript
const diffHtml = diff2htmlHtml(unifiedDiff, {
  outputFormat: 'side-by-side',
  drawFileList: true,
  matching: 'lines',
  renderNothingWhenEmpty: false,
  maxLineSizeInBlockForComparison: 200,
  maxLineLengthHighlight: 10000
});
```

## 🔄 典型的なワークフロー

### Claude Desktop統合

#### 基本的な差分レビューワークフロー
1. **ユーザーリクエスト**: 「適用前に変更内容を表示して」
2. **Claude**: filesystem MCP `edit_file` を `dryRun=true` で使用
3. **可視化**: `visualize_diff_html_content` がGitHub Gistを作成
4. **レビュー**: ユーザーがブラウザで美しい差分を確認
5. **決定**: ユーザーが承認または修正を要求
6. **実行**: filesystem MCP `edit_file` をdryRunなしで実行

#### ドキュメント化ワークフロー
1. **ユーザーリクエスト**: 「この差分をドキュメント用に保存して」
2. **Claude**: `visualize_diff_output_file` を `outputType=image` で使用
3. **出力**: 高品質PNG が `/output/diff-image.png` に保存
4. **使用**: 画像をドキュメント、プレゼンテーション等に埋め込み

### 他のMCPサーバーとの統合

#### 推奨MCPスタック
```json
{
  "mcpServers": {
    "filesystem": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "/path/to/project"]
    },
    "unified-diff-mcp": {
      "command": "bun",
      "args": ["run", "/path/to/unified-diff-mcp/src/index.ts"]
    },
    "git": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-git", "/path/to/project"]
    }
  }
}
```

#### 高度なGit + 差分ワークフロー
```
ユーザーリクエスト → filesystem dryRun → unified-diff可視化 → 
ユーザー承認 → filesystem編集 → git diff → unified-diff最終 → git commit
```

## 🐛 トラブルシューティング

### よくある問題

#### "Bun command not found"
**症状**: Claude DesktopがBunを実行できない
**解決方法**:
- **macOS**: `BUN_PATH=$(which bun) && sudo ln -sf $BUN_PATH /usr/local/bin/bun`
- **代替案**: 設定でフルパスを使用: `"command": "/Users/username/.bun/bin/bun"`
- **一般**: Bunインストール後にターミナルを再起動

#### "GitHub Gist creation failed"
**症状**: `visualize_diff_html_content` が失敗
**解決方法**:
- `GITHUB_TOKEN` が設定され有効であることを確認
- トークンが `gist` スコープ権限を持つことを確認
- トークンをテスト: `curl -H "Authorization: token YOUR_TOKEN" https://api.github.com/user`

#### "Auto-open not working"
**症状**: ファイルは生成されるが自動表示されない
**解決方法**:
- `DEFAULT_AUTO_OPEN=true` または `autoOpen=true` パラメータを確認
- **Windows**: HTML/PNGファイル用のデフォルトプログラムが設定されていることを確認
- **macOS**: システム設定 → 一般 → デフォルトWebブラウザを確認
- **Linux**: `xdg-utils` パッケージをインストール: `sudo apt install xdg-utils`

#### "PNG generation fails"
**症状**: HTMLは動作するが画像出力が失敗
**解決方法**:
- Playwrightが初回実行時にChromiumをダウンロードする必要がある可能性
- 利用可能ディスク容量を確認（1GB以上推奨）
- 競合するブラウザプロセスがないことを確認
- 試行: `bunx playwright install chromium`

### デバッグモード

トラブルシューティング用の詳細ログを有効化:

```json
{
  "env": {
    "NODE_ENV": "development",
    "DEBUG": "unified-diff-mcp:*"
  }
}
```

**デバッグ出力に含まれるもの**:
- ファイル操作詳細
- 差分処理ステップ
- 自動表示コマンド実行
- GitHub API相互作用
- エラースタックトレース

## 🔒 セキュリティ考慮事項

### ファイルアクセス
- サーバーは設定されたプロジェクトディレクトリ内でのみ動作
- 指定パス外のファイルへのアクセスは不可
- 全てのファイル操作はデバッグモードでログ記録

### ネットワークアクセス
- GitHub API呼び出し（Gist機能のみ）
- diff2html CSS/JS用CDNリソース
- その他の外部API呼び出しやデータ送信なし
- 全ての差分処理はローカルで実行

### プロセス分離
- PNG生成時のChromiumはサンドボックスモードで実行
- 永続的なブラウザ状態、Cookie、ローカルストレージなし
- 一時ファイルは自動クリーンアップ
- GitHub Gistは指定時間後に自動削除

### GitHub Token セキュリティ
- トークンは `gist` スコープのみ必要（最小権限）
- ローカル環境変数にのみ保存
- GitHub API以外への送信なし
- GitHub設定からいつでも取り消し可能

## 📊 パフォーマンス特性

### 典型的なパフォーマンス
- **HTML生成**: 標準差分で50-200ms
- **PNG生成**: 1-3秒（Chromium起動時間を含む）
- **GitHub Gist作成**: 500-2000ms（ネットワーク依存）
- **メモリ使用量**: PNG生成時100-300MB（Chromiumオーバーヘッド）

### 最適化のヒント
- より高速な生成には `outputType=html` を使用
- 一貫したパフォーマンスのため `DEFAULT_OUTPUT_MODE=html` に設定
- 実際の使用パターンに基づいて `expiryMinutes` を検討
- より良いセキュリティのため `public=false`（デフォルト）を使用

---

この高度なガイドは、パワーユーザーおよび開発者向けの全ての技術実装詳細、トラブルシューティングシナリオ、統合パターンをカバーしています。
