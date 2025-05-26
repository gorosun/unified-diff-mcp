# Claude Desktop & Code MCP Integration - Advanced Guide

This document provides detailed information not covered in the main README.md.

## MCP Tool Specifications

### HTML Visualization Tools

#### `visualize_diff`

Generate HTML visualization of unified diff using diff2html.

**Parameters:**
- `diff` (string, required): Unified diff text or filesystem edit_file dry-run output
- `format` (string, optional): Output format - 'line-by-line' or 'side-by-side' (default: 'side-by-side')
- `showFileList` (boolean, optional): Show file list summary (default: true)
- `highlight` (boolean, optional): Enable syntax highlighting (default: true)
- `oldPath` (string, optional): Path of the original file
- `newPath` (string, optional): Path of the modified file

#### `parse_filesystem_diff`

Parse filesystem edit_file dry-run output and generate HTML diff.

**Parameters:**
- `dryRunOutput` (string, required): Output from filesystem edit_file with dryRun=true
- `format` (string, optional): Output format - 'line-by-line' or 'side-by-side' (default: 'side-by-side')
- `highlight` (boolean, optional): Enable syntax highlighting (default: true)

### Visualization Tools

#### `visualize_diff_image`

Generate HTML or image visualization of unified diff.

**Parameters:**
- `diff` (string, required): Unified diff text or filesystem edit_file dry-run output
- `format` (string, optional): Output format - 'line-by-line' or 'side-by-side' (default: 'side-by-side')
- `showFileList` (boolean, optional): Show file list summary (default: true)
- `highlight` (boolean, optional): Enable syntax highlighting (default: true)
- `oldPath` (string, optional): Path of the original file
- `newPath` (string, optional): Path of the modified file

#### `parse_filesystem_diff_image`

Parse filesystem edit_file dry-run output and generate HTML or image diff.

**Parameters:**
- `dryRunOutput` (string, required): Output from filesystem edit_file with dryRun=true
- `format` (string, optional): Output format - 'line-by-line' or 'side-by-side' (default: 'side-by-side')  
- `highlight` (boolean, optional): Enable syntax highlighting (default: true)

## Detailed Configuration Options

### Advanced Environment Variables

Beyond the basic environment variables mentioned in README.md:

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

### diff2html Configuration

The server supports various diff2html configuration options:

- **Output Formats**: line-by-line, side-by-side
- **Syntax Highlighting**: 140+ languages supported including JavaScript, TypeScript, Python, Go, Rust, etc.
- **Responsive Design**: Mobile-friendly layouts with breakpoints
- **File Statistics**: Addition/deletion counts with color coding
- **Interactive Features**: Collapsible sections, expandable context

### Platform-specific Implementation Details

#### Windows Auto-Open Implementation
- Primary: `start \"\" \"${filePath}\"` command
- Fallback: `explorer \"${filePath}\"` command
- HTML files: Opens with default browser
- Image files: Opens with default image viewer
- **Recommended**: Windows 11 or later for optimal compatibility

#### macOS Auto-Open Implementation
- Primary: `open \"${filePath}\"` command with URL support for HTML cache-busting
- Fallback: AppleScript via `osascript -e 'tell application \"Finder\" to open POSIX file \"${filePath}\"'`
- Full support for `file://` URLs with query parameters
- **Recommended**: macOS Sequoia 15 or later for optimal compatibility

#### Linux Auto-Open Implementation
- Primary: `xdg-open \"${filePath}\"` command
- Requires: `xdg-utils` package (usually pre-installed)
- Note: HTML cache-busting may not work on all desktop environments

**Testing Status**: The Linux auto-open functionality has been implemented but not comprehensively tested on Ubuntu or other Linux distributions. While it should work in GUI environments with properly configured default applications, please use at your own discretion. We welcome feedback from users who test this on various Linux distributions.

## Architecture Details

### Diff Processing Pipeline

```
Input Diff Text
       │
       ▼
┌─────────────────┐
│ convertToUnified│  ◄── Handles various diff formats
│ Diff()          │
└─────────────────┘
       │
       ▼
┌─────────────────┐
│ diff2html.html()│  ◄── Generates styled HTML
└─────────────────┘
       │
       ▼
┌─────────────────┐
│ generateDiffHtml│  ◄── Wraps in complete HTML document
│ ()              │
└─────────────────┘
       │
       ▼
┌─────────────────┐    ┌─────────────────┐
│ HTML Output     │    │ Playwright      │
│ (Browser)       │    │ Screenshot      │
└─────────────────┘    └─────────────────┘
                              │
                              ▼
                       ┌─────────────────┐
                       │ PNG Output      │
                       │ (Image Viewer)  │
                       └─────────────────┘
```

### File Output Strategy

- **Fixed Filenames**: `diff-image.html` and `diff-image.png` to prevent disk bloat
- **Atomic Writes**: Files are written completely before being opened
- **Directory Creation**: Output directory is created automatically if it doesn't exist
- **Error Handling**: Robust fallback mechanisms for file operations

## Usage Patterns and Best Practices

### Typical Claude Desktop Workflow

1. **User Request**: \"Modify function X in file Y\"
2. **Claude Action**: filesystem MCP `edit_file` with `dryRun=true`
3. **Diff Generation**: unified-diff-mcp `parse_filesystem_diff_image`
4. **User Review**: Visual diff automatically opens
5. **Confirmation**: User approves or requests changes
6. **Execution**: filesystem MCP `edit_file` without dryRun

### Integration with Other MCP Servers

#### Recommended MCP Stack
- **@modelcontextprotocol/server-filesystem**: Core file operations
- **unified-diff-mcp**: Diff visualization (this project)
- **@modelcontextprotocol/server-git**: Git operations (optional)

#### Advanced Workflow with Git Integration
```
User Request → filesystem dryRun → unified-diff visualization → 
User Approval → filesystem edit → git diff → git commit
```

### Performance Considerations

- **HTML Generation**: ~50-200ms for typical diffs
- **PNG Generation**: ~1-3 seconds (includes Chromium startup)
- **Memory Usage**: ~100-300MB during PNG generation (Chromium overhead)
- **Disk Space**: Fixed filenames prevent accumulation of output files

### Common Commands and Use Cases

#### Basic Diff Review
- \"Show me the changes before applying\"
- \"Generate a visual diff of the modifications\"
- \"I want to see the diff image before proceeding\"

#### Format-Specific Requests
- \"Show side-by-side diff with syntax highlighting\"
- \"Generate line-by-line diff view\"
- \"Create PNG image of the changes\"

#### Safety-First Workflow
- \"Always show me diffs before making changes\"
- \"Enable safe editing mode with visual confirmation\"
- \"Pre-review all file modifications\"

## Troubleshooting

### Common Issues and Solutions

#### \"Bun command not found\"
- Solution: Use full path from `which bun` in configuration
- Alternative: Restart terminal after Bun installation

#### \"Auto-open not working\"
- Check `DEFAULT_AUTO_OPEN=true` is set
- Verify platform-specific commands are available
- On Linux: Ensure `xdg-utils` is installed

#### \"PNG generation fails\"
- Playwright may need to download Chromium
- Check available disk space (>1GB recommended)
- Verify no conflicting browser processes

#### \"HTML not displaying correctly\"
- Check internet connection for CDN resources
- Verify HTML file is not corrupted
- Try opening manually in browser

### Debug Mode

For troubleshooting, you can enable verbose logging:

```json
{
  "env": {
    "NODE_ENV": "development",
    "DEBUG": "unified-diff-mcp:*"
  }
}
```

This provides detailed logs about:
- File operations
- Diff processing steps
- Auto-open attempts
- Error stack traces

## Security Considerations

### File Access
- Server only accesses the configured project directory
- No ability to access files outside specified paths
- All file operations are logged

### Network Access
- Only accesses CDN resources for diff2html CSS/JS
- No external API calls or data transmission
- All processing happens locally

### Process Isolation
- Chromium runs in sandboxed mode for PNG generation
- No persistent browser state or cookies
- Temporary files are cleaned up automatically

This advanced guide covers implementation details, troubleshooting, and best practices not included in the main README documentation.
