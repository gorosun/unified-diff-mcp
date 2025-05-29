# Unified Diff MCP Server

[![smithery badge](https://smithery.ai/badge/@gorosun/unified-diff-mcp)](https://smithery.ai/server/@gorosun/unified-diff-mcp)

Beautiful diff visualization for Claude Desktop. Transform code diffs into stunning visual comparisons with GitHub Gist integration and local file output.

<img src="examples/screenshot.png" alt="Unified Diff Visualization Screenshot" width="800" style="max-width: 100%; height: auto;">

## ✨ Features

- 🎨 **Beautiful HTML diff visualization** using diff2html
- 🌐 **GitHub Gist integration** for instant sharing
- 📁 **Local file output** (PNG/HTML) 
- 🔄 **Auto-delete functionality** for temporary diffs
- 🖥️ **Cross-platform support** (Windows, macOS, Linux)
- ⚡ **High-performance** with Bun runtime
- 🌐 **Web Claude Support** with enhanced security levels
- 🔒 **Multi-level security** (Low/Medium/High) for different use cases

## 🚀 Quick Start

### Installing via Smithery

```bash
bunx @smithery/cli install @gorosun/unified-diff-mcp --client claude --config '{
  "defaultAutoOpen": true,
  "defaultOutputMode": "html",
  "githubUsername": "your_actual_github_username",
  "githubToken": "ghp_your_actual_token_here"
}'
```

### Manual Installation

1. **Install [Claude Desktop](https://claude.ai/download)** and **[Bun](https://bun.sh)**
2. **Clone and build:**
   ```bash
   git clone https://github.com/gorosun/unified-diff-mcp.git
   cd unified-diff-mcp
   bun install
   ```
3. **Configure Claude Desktop** - see [Configuration](#configuration) below

## 🛠️ Tools Overview

| Tool | Purpose | Output | Best For |
|------|---------|--------|----------|
| **`visualize_diff_html_content`** | Browser display & sharing | GitHub Gist + HTML preview URL | Quick sharing, instant viewing |
| **`visualize_diff_output_file`** | Local file storage | PNG/HTML files | Local storage, presentations |

## 📖 Usage Examples

### 🎯 Optimal Prompts by Purpose

| Purpose | Recommended Prompt | Tool Used | Output |
|---------|-------------------|-----------|--------|
| **Quick Preview** | `Please visualize and preview the following diff:`<br>`以下のdiffを可視化してプレビューしてください` | `visualize_diff_html_content` | GitHub Gist + HTML preview URL |
| **Local Storage** | `Please visualize and save the following diff to a file:`<br>`以下のdiffを可視化してファイルに保存してください` | `visualize_diff_output_file` | Local HTML/PNG file |
| **Share with Others** | `Please visualize the following diff and create a shareable link:`<br>`以下のdiffを可視化して共有リンクを作成してください` | `visualize_diff_html_content` | GitHub Gist with shareable URL |
| **Image Export** | `Please visualize and save the following diff as a PNG image:`<br>`以下のdiffを可視化してPNG画像で保存してください` | `visualize_diff_output_file` | Local PNG image |
| **Code Review** | `Please visualize the following diff in side-by-side format:`<br>`以下のdiffをside-by-side形式で可視化してください` | Either tool | Side-by-side comparison |
| **Documentation** | `Please visualize and save the following diff as an HTML file:`<br>`以下のdiffを可視化してHTMLファイルで保存してください` | `visualize_diff_output_file` | Local HTML file |
| **🌐 Web Claude (Secure)** | `Please visualize this diff with high security for Web Claude:`<br>`以下のdiffをWeb版Claude用に高セキュリティで可視化してください` | `visualize_diff_html_content` | Password-protected Secret Gist |

### Share diff instantly (GitHub Gist)
```
visualize_diff_html_content:
- Creates temporary GitHub Gist
- Auto-deletes after 30 minutes
- Instant browser-ready URLs
- Perfect for code reviews
```

### Save diff locally
```
visualize_diff_output_file:
- Saves PNG or HTML to local disk
- Auto-opens in browser (optional)
- Perfect for documentation
```

## 🎛️ Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `GITHUB_TOKEN` | GitHub Personal Access Token (for Gist integration) | Required for `visualize_diff_html_content` |
| `DEFAULT_AUTO_OPEN` | Auto-open generated files | `false` |
| `DEFAULT_OUTPUT_MODE` | Default output format (`html` or `image`) | `html` |

### GitHub Token Setup

1. Go to [GitHub Settings > Personal Access Tokens](https://github.com/settings/tokens)
2. Generate new token with `gist` scope
3. Add to your environment:
   ```bash
   export GITHUB_TOKEN="your_token_here"
   ```

### Claude Desktop Configuration

**macOS:**
```bash
code ~/Library/Application\ Support/Claude/claude_desktop_config.json
```

**Windows:**
```bash
code %APPDATA%\Claude\claude_desktop_config.json
```

**Configuration template:**
```json
{
  "mcpServers": {
    "unified-diff-mcp": {
      "command": "bun",
      "args": ["run", "/path/to/unified-diff-mcp/src/index.ts"],
      "env": {
        "GITHUB_TOKEN": "your_github_token_here",
        "DEFAULT_AUTO_OPEN": "true",
        "DEFAULT_OUTPUT_MODE": "html"
      }
    }
  }
}
```

## 📋 Parameters Reference

### Common Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `diff` | string | *(required)* | Unified diff text |
| `format` | string | `side-by-side` | Display format (`line-by-line` or `side-by-side`) |
| `showFileList` | boolean | `true` | Show file list summary |
| `highlight` | boolean | `true` | Enable syntax highlighting |
| `oldPath` | string | `file.txt` | Original file path |
| `newPath` | string | `file.txt` | Modified file path |
| `autoOpen` | boolean | `false` | Auto-open in browser |

### GitHub Gist Specific

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `expiryMinutes` | number | `30` | Auto-delete time (1-1440 minutes) |
| `public` | boolean | `false` | Public vs secret gist |

### Local File Specific

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `outputType` | string | `html` | Output format (`html` or `image`) |

## 🌍 Platform Support

| Platform | Auto-Open | Commands |
|----------|-----------|----------|
| **Windows** | ✅ | `start` (primary), `explorer` (fallback) |
| **macOS** | ✅ | `open` (primary), AppleScript (fallback) |
| **Linux** | ✅ | `xdg-open` |

## 🔧 Development

**Development mode (with hot reload):**
```json
{
  "command": "bun",
  "args": ["--watch", "/path/to/unified-diff-mcp/src/index.ts"]
}
```

**Production mode:**
```json
{
  "command": "bun",
  "args": ["run", "/path/to/unified-diff-mcp/src/index.ts"]
}
```

## 📚 Advanced Usage

### 🔒 Web Claude Security Levels

For Web Claude users where GitHub Token isn't available, you can choose from multiple security levels:

| Security Level | Configuration | Features | Use Cases |
|---------|---------|--------|--------|
| **🟢 Low** | Secret Gist + 60min auto-delete | URL-only access | Code examples, learning |
| **🟡 Medium** | Secret Gist + Password + 30min auto-delete | URL + Access code required | Team reviews |
| **🔴 High** | Secret Gist + Password + 15min auto-delete | URL + Access code + Short duration | Sensitive code |

### Usage Example
```
Please visualize this diff with high security for Web Claude:
--- a/config.js
+++ b/config.js
@@ -1,3 +1,4 @@
 const config = {
-  apiKey: 'old-key'
+  apiKey: 'new-secure-key',
+  timeout: 5000
 };
```

**Response Example**:
```
🌐 **Web Claude Compatible - Secure Diff Visualization**

🔴 **Security Level**: High Security - Secret Gist + Password (15min auto-delete)
📋 **Preview Link**: https://htmlpreview.github.io/?...
🔑 **Access Code**: `a7x9k2`
⏰ **Auto-delete**: 15 minutes
```

### 🔄 Fallback Functionality

When GitHub Token is unavailable, the system falls back to local files:
- Password-protected HTML saved as temporary file
- Automatic browser opening
- Access control based on security level

For detailed setup and integration guides:

- 🇺🇸 **English**: [CLAUDE_CODE_INTEGRATION.md](CLAUDE_CODE_INTEGRATION.md)
- 🇯🇵 **日本語**: [CLAUDE_CODE_INTEGRATION_JP.md](CLAUDE_CODE_INTEGRATION_JP.md)

## 🤝 Supported Clients

- **Claude Desktop** (Primary)
- **Claude Code** (CLI)
- **VS Code + MCP Extension**
- **Cline** and other MCP clients

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

### Dependencies

| Library | License | Purpose |
|---------|---------|---------|
| **diff2html** | MIT | HTML diff generation |
| **playwright-core** | Apache 2.0 | Browser automation |
| **@modelcontextprotocol/sdk** | MIT | MCP integration |

---

**Made with ❤️ for the Claude Desktop community**
