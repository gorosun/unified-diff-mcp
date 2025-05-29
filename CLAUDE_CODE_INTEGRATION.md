# Advanced Integration Guide

This document provides detailed technical information for advanced users and developers.

## 🛠️ Current Tool Specifications

### Available Tools (v1.0+)

| Tool | Purpose | Output | Best For |
|------|---------|--------|----------|
| **`visualize_diff_html_content`** | GitHub Gist + Browser display | GitHub Gist URL + HTML Preview | Sharing, instant viewing |
| **`visualize_diff_output_file`** | Local file storage | Local PNG/HTML files | Documentation, presentations |

### Detailed Parameter Reference

#### `visualize_diff_html_content`

**Purpose**: Creates temporary GitHub Gist with beautiful HTML diff visualization

**Parameters**:
- **`diff`** (string, required): Unified diff text or filesystem edit_file dry-run output
- **`format`** (string): `'line-by-line'` or `'side-by-side'` (default: `'side-by-side'`)
- **`showFileList`** (boolean): Show file list summary (default: `true`)
- **`highlight`** (boolean): Enable syntax highlighting (default: `true`)
- **`oldPath`** (string): Original file path for context display
- **`newPath`** (string): Modified file path for context display
- **`autoOpen`** (boolean): Auto-open HTML preview in browser (default: `false`)
- **`expiryMinutes`** (number): Auto-delete time, 1-1440 minutes (default: `30`)
- **`public`** (boolean): Create public gist vs secret gist (default: `false`)

**Output**:
- GitHub Gist URL with HTML preview
- Raw HTML content (for fallback)
- Multiple viewer options (HTMLPreview, GitHack, etc.)

#### `visualize_diff_output_file`

**Purpose**: Generates diff visualization and saves to local output directory

**Parameters**:
- **`diff`** (string, required): Unified diff text or filesystem edit_file dry-run output
- **`format`** (string): `'line-by-line'` or `'side-by-side'` (default: `'side-by-side'`)
- **`showFileList`** (boolean): Show file list summary (default: `true`)
- **`highlight`** (boolean): Enable syntax highlighting (default: `true`)
- **`oldPath`** (string): Original file path for context display
- **`newPath`** (string): Modified file path for context display
- **`autoOpen`** (boolean): Auto-open generated file (default: from `DEFAULT_AUTO_OPEN`)
- **`outputType`** (string): `'html'` or `'image'` (default: from `DEFAULT_OUTPUT_MODE`)

**Output**:
- Local file: `/path/to/project/output/diff-image.html` or `.png`
- Fixed filename prevents disk space bloat

## 🏗️ Architecture Details

### Diff Processing Pipeline

```
Input Diff Text
       │
       ▼
┌─────────────────┐
│ convertToUnified│  ◄── Normalize various diff formats
│ Diff()          │
└─────────────────┘
       │
       ▼
┌─────────────────┐
│ diff2html.html()│  ◄── Generate styled HTML with syntax highlighting
└─────────────────┘
       │
       ▼
┌─────────────────┐
│ generateDiffHtml│  ◄── Wrap in complete HTML document + styles
│ ()              │
└─────────────────┘
       │
       ├─────────────────────┬─────────────────────┐
       ▼                     ▼                     ▼
┌─────────────────┐   ┌─────────────────┐   ┌─────────────────┐
│ GitHub Gist     │   │ Local HTML      │   │ Playwright      │
│ + HTML Preview  │   │ File Output     │   │ Screenshot      │
└─────────────────┘   └─────────────────┘   └─────────────────┘
                                                     │
                                                     ▼
                                              ┌─────────────────┐
                                              │ PNG Image       │
                                              │ Output          │
                                              └─────────────────┘
```

### GitHub Gist Integration

#### Features
- **Automatic HTML Preview**: Uses `https://htmlpreview.github.io/` for instant viewing
- **Multiple Viewers**: GitHack, RawGit alternatives provided
- **Auto-deletion**: Configurable expiry (1-1440 minutes)
- **Countdown Timer**: Real-time deletion countdown in HTML
- **Secret by Default**: Secure, unlisted gists

#### Implementation Details
```typescript
// Gist creation with expiry notice
const htmlWithExpiry = baseHtml
  .replace('<body>', `<body><div id="expiry-notice">...</div>`)
  .replace('</body>', `<script>/* countdown timer */</script></body>`);

// Scheduled deletion
setTimeout(() => deleteGist(gistId), expiryMinutes * 60 * 1000);
```

### Local File Output Strategy

#### File Management
- **Fixed Filenames**: `diff-image.html` and `diff-image.png` prevent disk bloat
- **Atomic Writes**: Complete file write before auto-open
- **Directory Creation**: Automatic `/output` directory creation
- **Overwrite Strategy**: Latest diff replaces previous output

#### PNG Generation Process
```typescript
// High-quality PNG generation
const browser = await chromium.launch();
const page = await browser.newPage({ 
  viewport: { width: 1800, height: 1200 } 
});
await page.setContent(html);
await page.screenshot({ path: filePath, fullPage: true, type: "png" });
```

## 🌍 Platform-Specific Implementation

### Auto-Open Mechanisms

| Platform | Primary Command | Fallback Command | Notes |
|----------|----------------|------------------|-------|
| **Windows** | `start "" "${filePath}"` | `explorer "${filePath}"` | Windows 11+ recommended |
| **macOS** | `open "${filePath}"` | AppleScript via `osascript` | macOS Sequoia 15+ recommended |
| **Linux** | `xdg-open "${filePath}"` | None | Requires GUI environment |

#### Windows Implementation
```typescript
if (platform === 'win32') {
  command = `start "" "${filePath}"`;
  // Fallback: exec(`explorer "${filePath}"`);
}
```

#### macOS Implementation
```typescript
if (platform === 'darwin') {
  command = outputType === 'html' 
    ? `open "${openUrl}"` // Supports cache-busting URLs
    : `open "${filePath}"`;
  // Fallback: AppleScript with Finder
}
```

#### Linux Implementation
```typescript
if (platform !== 'win32' && platform !== 'darwin') {
  command = `xdg-open "${filePath}"`;
  // Note: HTML cache-busting may not work on all desktop environments
}
```

**Linux Testing Status**: Implemented but not comprehensively tested on Ubuntu/other distributions. Should work in GUI environments with properly configured default applications.

## 🔧 Advanced Configuration

### Environment Variables

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `GITHUB_TOKEN` | string | - | Required for GitHub Gist functionality |
| `DEFAULT_AUTO_OPEN` | boolean | `false` | Global auto-open setting |
| `DEFAULT_OUTPUT_MODE` | string | `html` | Default output type (`html` or `image`) |
| `NODE_ENV` | string | - | `development` or `production` |
| `PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD` | boolean | `false` | Skip Chromium download |

### Advanced Claude Desktop Configuration

#### Development Mode (Hot Reload)
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

#### Production Mode (Stable)
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

### diff2html Configuration

#### Supported Features
- **Output Formats**: Line-by-line, side-by-side comparison
- **Syntax Highlighting**: 140+ languages (JavaScript, TypeScript, Python, Go, Rust, etc.)
- **Responsive Design**: Mobile-friendly with CSS breakpoints
- **File Statistics**: Addition/deletion counts with color coding
- **Interactive Features**: Collapsible sections, expandable context

#### Customization Options
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

## 🔄 Typical Workflows

### Claude Desktop Integration

#### Basic Diff Review Workflow
1. **User Request**: "Show me the changes before applying"
2. **Claude**: Uses filesystem MCP `edit_file` with `dryRun=true`
3. **Visualization**: `visualize_diff_html_content` creates GitHub Gist
4. **Review**: User views beautiful diff in browser
5. **Decision**: User approves or requests modifications
6. **Execution**: filesystem MCP `edit_file` without dryRun

#### Documentation Workflow
1. **User Request**: "Save this diff for documentation"
2. **Claude**: Uses `visualize_diff_output_file` with `outputType=image`
3. **Output**: High-quality PNG saved to `/output/diff-image.png`
4. **Usage**: Image embedded in documentation, presentations, etc.

### Integration with Other MCP Servers

#### Recommended MCP Stack
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

#### Advanced Git + Diff Workflow
```
User Request → filesystem dryRun → unified-diff visualization → 
User Approval → filesystem edit → git diff → unified-diff final → git commit
```

## 🐛 Troubleshooting

### Common Issues

#### "Bun command not found"
**Symptoms**: Claude Desktop can't execute bun
**Solutions**:
- **macOS**: `BUN_PATH=$(which bun) && sudo ln -sf $BUN_PATH /usr/local/bin/bun`
- **Alternative**: Use full path in config: `"command": "/Users/username/.bun/bin/bun"`
- **General**: Restart terminal after Bun installation

#### "GitHub Gist creation failed"
**Symptoms**: `visualize_diff_html_content` fails
**Solutions**:
- Verify `GITHUB_TOKEN` is set and valid
- Check token has `gist` scope permissions
- Test token: `curl -H "Authorization: token YOUR_TOKEN" https://api.github.com/user`

#### "Auto-open not working"
**Symptoms**: Files generate but don't open automatically
**Solutions**:
- Verify `DEFAULT_AUTO_OPEN=true` or `autoOpen=true` parameter
- **Windows**: Ensure default programs are set for HTML/PNG files
- **macOS**: Check System Preferences → General → Default web browser
- **Linux**: Install `xdg-utils` package: `sudo apt install xdg-utils`

#### "PNG generation fails"
**Symptoms**: HTML works but image output fails
**Solutions**:
- Playwright may need to download Chromium on first run
- Check available disk space (>1GB recommended)
- Verify no conflicting browser processes
- Try: `bunx playwright install chromium`

### Debug Mode

Enable verbose logging for troubleshooting:

```json
{
  "env": {
    "NODE_ENV": "development",
    "DEBUG": "unified-diff-mcp:*"
  }
}
```

**Debug Output Includes**:
- File operation details
- Diff processing steps
- Auto-open command execution
- GitHub API interactions
- Error stack traces

## 🔒 Security Considerations

### File Access
- Server operates within configured project directory only
- No ability to access files outside specified paths
- All file operations are logged in debug mode

### Network Access
- GitHub API calls (only for Gist functionality)
- CDN resources for diff2html CSS/JS
- No other external API calls or data transmission
- All diff processing happens locally

### Process Isolation
- Chromium runs in sandboxed mode for PNG generation
- No persistent browser state, cookies, or local storage
- Temporary files cleaned up automatically
- GitHub Gists auto-delete after specified time

### GitHub Token Security
- Token only needs `gist` scope (minimal permissions)
- Stored only in local environment variables
- Never transmitted except to GitHub API
- Can be revoked anytime from GitHub settings

## 📊 Performance Characteristics

### Typical Performance
- **HTML Generation**: 50-200ms for standard diffs
- **PNG Generation**: 1-3 seconds (includes Chromium startup)
- **GitHub Gist Creation**: 500-2000ms (network dependent)
- **Memory Usage**: 100-300MB during PNG generation (Chromium overhead)

### Optimization Tips
- Use `outputType=html` for faster generation
- Set `DEFAULT_OUTPUT_MODE=html` for consistent performance
- Consider `expiryMinutes` based on actual usage patterns
- Use `public=false` (default) for better security

---

This advanced guide covers all technical implementation details, troubleshooting scenarios, and integration patterns for power users and developers.
