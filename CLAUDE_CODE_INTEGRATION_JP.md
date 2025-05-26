# Claude Desktop & Code MCP 統合 - 詳細ガイド

このドキュメントは、メインのREADME.mdでカバーされていない詳細情報を提供します。

## MCPツール仕様

### HTML視覚化ツール

#### `visualize_diff`

diff2htmlを使用してunified diffのHTML視覚化を生成します。

**パラメータ:**
- `diff` (string, required): Unified diff テキストまたは filesystem edit_file dry-run出力
- `format` (string, optional): 出力形式 - 'line-by-line' または 'side-by-side' (デフォルト: 'side-by-side')
- `showFileList` (boolean, optional): ファイルリスト概要を表示 (デフォルト: true)
- `highlight` (boolean, optional): シンタックスハイライトを有効化 (デフォルト: true)
- `oldPath` (string, optional): 元ファイルのパス
- `newPath` (string, optional): 変更後ファイルのパス

#### `parse_filesystem_diff`

filesystem edit_file dry-run出力を解析してHTML diffを生成します。

**パラメータ:**
- `dryRunOutput` (string, required): filesystem edit_file with dryRun=true の出力
- `format` (string, optional): 出力形式 - 'line-by-line' または 'side-by-side' (デフォルト: 'side-by-side')
- `highlight` (boolean, optional): シンタックスハイライトを有効化 (デフォルト: true)

### ビジュアル化ツール

#### `visualize_diff_image`

unified diffのHTMLイメージまたは画像イメージで生成して視覚化します。

**パラメータ:**
- `diff` (string, required): Unified diff テキストまたは filesystem edit_file dry-run出力
- `format` (string, optional): 出力形式 - 'line-by-line' または 'side-by-side' (デフォルト: 'side-by-side')
- `showFileList` (boolean, optional): ファイルリスト概要を表示 (デフォルト: true)
- `highlight` (boolean, optional): シンタックスハイライトを有効化 (デフォルト: true)
- `oldPath` (string, optional): 元ファイルのパス
- `newPath` (string, optional): 変更後ファイルのパス

#### `parse_filesystem_diff_image`

filesystem edit_file dry-run出力を解析してHTMLイメージまたは画像イメージ diffを生成します。

**パラメータ:**
- `dryRunOutput` (string, required): filesystem edit_file with dryRun=true の出力
- `format` (string, optional): 出力形式 - 'line-by-line' または 'side-by-side' (デフォルト: 'side-by-side')
- `highlight` (boolean, optional): シンタックスハイライトを有効化 (デフォルト: true)

## 詳細設定オプション

### 高度な環境変数

README.mdで説明した基本的な環境変数に加えて：

```json
{
  "env": {
    "NODE_ENV": "production",
    "DEFAULT_AUTO_OPEN": "true",
    "DEFAULT_OUTPUT_MODE": "html",
    "PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD": "false"
  }
}
```

### diff2html設定

サーバーは様々なdiff2html設定オプションをサポート:

- **出力形式**: line-by-line、side-by-side
- **シンタックスハイライト**: JavaScript、TypeScript、Python、Go、Rustなど140以上の言語をサポート
- **レスポンシブデザイン**: ブレークポイント付きのモバイル対応レイアウト
- **ファイル統計**: カラーコーディング付きの追加/削除数
- **インタラクティブ機能**: 折りたたみ可能なセクション、展開可能なコンテキスト

### プラットフォーム固有の実装詳細

#### Windows自動オープン実装
- プライマリ: `start \"\" \"${filePath}\"` コマンド
- フォールバック: `explorer \"${filePath}\"` コマンド
- HTMLファイル: デフォルトブラウザで開く
- 画像ファイル: デフォルト画像ビューアで開く
- **推奨**: 最適な互換性のためWindows 11以降

#### macOS自動オープン実装
- プライマリ: HTMLキャッシュ回避のURL対応付き `open \"${filePath}\"` コマンド
- フォールバック: AppleScript経由 `osascript -e 'tell application \"Finder\" to open POSIX file \"${filePath}\"'`
- クエリパラメータ付き `file://` URLの完全サポート
- **推奨**: 最適な互換性のためmacOS Sequoia 15以降

#### Linux自動オープン実装
- プライマリ: `xdg-open \"${filePath}\"` コマンド
- 要求: `xdg-utils` パッケージ（通常はプリインストール済み）
- 注意: すべてのデスクトップ環境でHTMLキャッシュ回避が動作しない場合があります

**動作検証状況**: Linux自動オープン機能は実装されていますが、Ubuntuやその他のLinuxディストリビューションでの包括的なテストは実施されていません。適切に設定されたデフォルトアプリケーションを持つGUI環境では動作するはずですが、ご自身の責任でご使用ください。様々なLinuxディストリビューションでテストされた方からのフィードバックをお待ちしています。

## アーキテクチャ詳細

### 差分処理パイプライン

```
差分テキスト入力
       │
       ▼
┌─────────────────┐
│ convertToUnified│  ◄── 様々な差分形式を処理
│ Diff()          │
└─────────────────┘
       │
       ▼
┌─────────────────┐
│ diff2html.html()│  ◄── スタイル付きHTMLを生成
└─────────────────┘
       │
       ▼
┌─────────────────┐
│ generateDiffHtml│  ◄── 完全なHTMLドキュメントでラップ
│ ()              │
└─────────────────┘
       │
       ▼
┌─────────────────┐    ┌─────────────────┐
│ HTML出力        │    │ Playwright      │
│ (ブラウザ)      │    │ スクリーンショット│
└─────────────────┘    └─────────────────┘
                              │
                              ▼
                       ┌─────────────────┐
                       │ PNG出力         │
                       │ (画像ビューア)  │
                       └─────────────────┘
```

### ファイル出力戦略

- **固定ファイル名**: ディスク容量肥大を防ぐため `diff-image.html` と `diff-image.png`
- **アトミック書き込み**: ファイルが完全に書き込まれてから開かれる
- **ディレクトリ作成**: 出力ディレクトリが存在しない場合は自動作成
- **エラーハンドリング**: ファイル操作の堅牢なフォールバック機構

## 使用パターンとベストプラクティス

### 典型的なClaude Desktopワークフロー

1. **ユーザーリクエスト**: 「ファイルYの関数Xを修正」
2. **Claudeアクション**: filesystem MCP `edit_file` with `dryRun=true`
3. **差分生成**: unified-diff-mcp `parse_filesystem_diff_image`
4. **ユーザーレビュー**: 視覚的差分が自動的に開く
5. **確認**: ユーザーが承認または変更を要求
6. **実行**: filesystem MCP `edit_file` without dryRun

### 他のMCPサーバーとの統合

#### 推奨MCPスタック
- **@modelcontextprotocol/server-filesystem**: コアファイル操作
- **unified-diff-mcp**: 差分視覚化（本プロジェクト）
- **@modelcontextprotocol/server-git**: Git操作（オプション）

#### Git統合を含む高度なワークフロー
```
ユーザーリクエスト → filesystem dryRun → unified-diff視覚化 → 
ユーザー承認 → filesystem edit → git diff → git commit
```

### パフォーマンス考慮事項

- **HTML生成**: 典型的な差分で約50-200ms
- **PNG生成**: 約1-3秒（Chromium起動を含む）
- **メモリ使用量**: PNG生成中約100-300MB（Chromiumオーバーヘッド）
- **ディスク容量**: 固定ファイル名により出力ファイルの蓄積を防止

### 一般的なコマンドと使用例

#### 基本的な差分レビュー
- 「適用前に変更内容を見せて」
- 「修正の視覚的差分を生成して」
- 「進める前に差分画像が欲しい」

#### 形式固有のリクエスト
- 「シンタックスハイライト付きのサイドバイサイド差分を表示」
- 「行単位の差分表示を生成」
- 「変更のPNG画像を作成」

#### 安全優先ワークフロー
- 「変更前に常に差分を表示」
- 「視覚的確認付きの安全編集モードを有効化」
- 「すべてのファイル修正を事前レビュー」

## トラブルシューティング

### 一般的な問題と解決策

#### 「Bunコマンドが見つからない」
- 解決策: 設定で `which bun` のフルパスを使用
- 代替案: Bunインストール後にターミナルを再起動

#### 「自動オープンが動作しない」
- `DEFAULT_AUTO_OPEN=true` が設定されているか確認
- プラットフォーム固有のコマンドが利用可能か確認
- Linux: `xdg-utils` がインストールされているか確認

#### 「PNG生成が失敗する」
- PlaywrightがChromiumをダウンロードする必要がある場合あり
- 利用可能なディスク容量を確認（1GB以上推奨）
- 競合するブラウザプロセスがないか確認

#### 「HTMLが正しく表示されない」
- CDNリソースのインターネット接続を確認
- HTMLファイルが破損していないか確認
- ブラウザで手動で開いてみる

### デバッグモード

トラブルシューティングのため、詳細ログを有効化できます：

```json
{
  "env": {
    "NODE_ENV": "development",
    "DEBUG": "unified-diff-mcp:*"
  }
}
```

これにより以下の詳細ログが提供されます：
- ファイル操作
- 差分処理ステップ
- 自動オープン試行
- エラースタックトレース

## セキュリティ考慮事項

### ファイルアクセス
- サーバーは設定されたプロジェクトディレクトリのみにアクセス
- 指定されたパス外のファイルにアクセスする能力なし
- すべてのファイル操作がログ記録される

### ネットワークアクセス
- diff2html CSS/JSのCDNリソースのみにアクセス
- 外部API呼び出しやデータ送信なし
- すべての処理がローカルで実行

### プロセス分離
- PNG生成のためChromiumがサンドボックスモードで実行
- 永続的なブラウザ状態やクッキーなし
- 一時ファイルは自動的にクリーンアップ

この詳細ガイドは、メインREADMEドキュメントに含まれていない実装詳細、トラブルシューティング、ベストプラクティスをカバーしています。
