# Unified Diff MCP Server

A Model Context Protocol (MCP) server for visualizing unified diffs using diff2html. Designed to work seamlessly with filesystem edit_file dry-run output.

<img src="examples/screenshot.png" alt="Unified Diff Visualization Screenshot" width="800" style="max-width: 100%; height: auto;">

## Features

- Beautiful HTML diff visualization using diff2html
- High-quality PNG image generation via Playwright + Chromium
- High-performance processing with Bun runtime
- Seamless integration with filesystem MCP dry-run output
- Fixed filename output (diff-image.html/png) for disk space efficiency
- Browser cache-busting with timestamp query parameters

## Quick Start

### 1. Install Claude Desktop

Download and install platform-specific installer from [https://claude.ai/download](https://claude.ai/download)

### 2. Install Bun Runtime

**Mac / Linux:**
```bash
$ curl -fsSL https://bun.sh/install | bash
```

**Windows:**
```powershell
$ powershell -c "irm bun.sh/install.ps1 | iex"
```

**Verify Installation:**
```bash
$ bun --version
```

**Note:** If `bun` command is not found, restart your terminal or use the full path returned by `which bun` in your configuration.

### 3. Install and Build Project

```bash
# Install dependencies
bun install
```

### 4. Configure Claude Desktop

Choose your language configuration:

- **English**: [examples/en/claude-desktop-config.json](examples/en/claude-desktop-config.json)
- **日本語**: [examples/jp/claude-desktop-config.json](examples/jp/claude-desktop-config.json)

Copy the configuration to your Claude Desktop config file:

**macOS:**
```bash
$ code ~/Library/Application Support/Claude/claude_desktop_config.json
```

**Windows:**
```bash
$ code %APPDATA%\Claude\claude_desktop_config.json
```

## Configuration

### Environment Variables

Both configurations support the following environment variables:

- `DEFAULT_AUTO_OPEN`: Set to "true" to automatically open generated diff files
- `DEFAULT_OUTPUT_MODE`: Set to "html" or "image" for default output format
- `NODE_ENV`: Set to "production" for production deployment

### Cross-Platform Support

The `DEFAULT_AUTO_OPEN` feature works on all platforms:

- **Windows**: Uses `start` command (primary) and `explorer` (fallback) - Windows 11 or later recommended
- **macOS**: Uses `open` command (primary) and AppleScript (fallback) - macOS Sequoia 15 or later recommended
- **Linux**: Uses `xdg-open` command

**Note on Ubuntu/Linux Support**: While the auto-open functionality is implemented for Linux systems using `xdg-open`, we haven't conducted comprehensive testing on Ubuntu or other Linux distributions. The feature should work in GUI environments with properly configured default applications, but please use at your own discretion. If you successfully test this on Ubuntu or other Linux distributions, we would greatly appreciate your feedback and reports to help improve our documentation and support.

### Path Configuration

Update the following placeholders in your configuration:

- `/path/to/your/project` - Your project directory for filesystem MCP
- `/Users/gorosun/.bun/bin/bun` - Your Bun executable path (use `which bun` to find this)
- `/Users/gorosun/projects/gorosun/unified-diff-mcp/src/index.ts` - Your unified-diff-mcp path

**Find your Bun path:**
```bash
$ which bun
# Example output: /Users/username/.bun/bin/bun
```

**Find your project path:**
```bash
$ cd /path/to/unified-diff-mcp
$ pwd
# Example output: /Users/username/projects/unified-diff-mcp
```

### Development vs Production

**Development (with hot reload):**
```json
{
  "mcpServers": {
    "unified-diff-mcp": {
      "command": "bun",
      "args": ["--watch", "/path/to/unified-diff-mcp/src/index.ts"]
    }
  }
}
```

**Production (Bun - recommended):**
```json
{
  "mcpServers": {
    "unified-diff-mcp": {
      "command": "/path/to/bun",  // Use output from: which bun
      "args": ["/path/to/unified-diff-mcp/src/index.ts"],
      "env": {
        "NODE_ENV": "production",
        "DEFAULT_AUTO_OPEN": "true",
        "DEFAULT_OUTPUT_MODE": "html"
      }
    }
  }
}
```

## Advanced Usage

For detailed setup and usage instructions:

- **English**: [CLAUDE_CODE_INTEGRATION.md](CLAUDE_CODE_INTEGRATION.md)
- **日本語**: [CLAUDE_CODE_INTEGRATION_JP.md](CLAUDE_CODE_INTEGRATION_JP.md)

## Supported Clients

- **Claude Desktop** (Primary target)
- **Claude Code** (Command-line integration)
- **VS Code + MCP Extension**
- **Cline** and other MCP-compatible clients

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

### Dependencies

This project uses the following open-source libraries:

- **diff2html** - MIT License - Pretty diff to HTML generator
- **playwright-core** - Apache 2.0 License - Browser automation library  
- **@modelcontextprotocol/sdk** - MIT License - Model Context Protocol SDK

All dependencies are compatible with commercial and non-commercial use.
