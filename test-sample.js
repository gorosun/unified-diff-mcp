#!/usr/bin/env bun

// Simple test script to generate sample diff visualizations
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import * as Diff2Html from "diff2html";
import { chromium } from "playwright-core";

const { html: diff2htmlHtml } = Diff2Html;

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const sampleDiff = `--- a/src/api.js
+++ b/src/api.js
@@ -10,7 +10,8 @@ export class ApiClient {
   }

-  async fetchData(url) {
+  async fetchData(url, options = {}) {
     try {
+      const timeout = options.timeout || 5000;
       const response = await fetch(url);
       return await response.json();
     } catch (error) {`;

// Generate HTML diff visualization
function generateDiffHtml(diffText, options = {}) {
  const {
    outputFormat = "side-by-side",
    showFileList = true,
    highlight = true,
    oldPath = "file.txt",
    newPath = "file.txt",
    isImageOutput = false,
  } = options;

  // Generate HTML using diff2html
  const diffHtml = diff2htmlHtml(diffText, {
    outputFormat,
    drawFileList: showFileList,
    matching: "lines",
    renderNothingWhenEmpty: false,
    maxLineSizeInBlockForComparison: 200,
    maxLineLengthHighlight: 10000,
  });

  // Wrap in complete HTML document
  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Unified Diff Visualization</title>
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/diff2html/bundles/css/diff2html.min.css" />
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;
            margin: 0;
            padding: 20px;
            background-color: #ffffff;
            font-size: 14px;
        }
        .d2h-wrapper {
            max-width: none;
            overflow-x: auto;
        }
        .d2h-file-header {
            font-weight: 600;
            background-color: #f6f8fa;
        }
    </style>
</head>
<body>
    ${diffHtml}
</body>
</html>`;
}

async function generateDiffVisualization(diffText, options = {}) {
  const {
    outputFormat = "side-by-side",
    showFileList = true,
    highlight = true,
    oldPath = "src/api.js",
    newPath = "src/api.js",
    autoOpen = false,
    outputType = "html",
  } = options;

  // Generate HTML first
  const html = generateDiffHtml(diffText, {
    outputFormat,
    showFileList,
    highlight,
    oldPath,
    newPath,
    isImageOutput: outputType === "image",
  });

  // Generate filename (always the same, overwriting previous files)
  const extension = outputType === "html" ? "html" : "png";
  const filename = `diff-image.${extension}`;
  const filePath = join(__dirname, "output", filename);

  // Ensure output directory exists
  const fs = await import("fs/promises");
  const outputDir = join(__dirname, "output");
  try {
    await fs.access(outputDir);
  } catch {
    await fs.mkdir(outputDir, { recursive: true });
  }

  if (outputType === "html") {
    // Save HTML file
    await fs.writeFile(filePath, html, "utf8");
  } else {
    // Generate PNG image
    const browser = await chromium.launch();
    const page = await browser.newPage({
      viewport: { width: 1800, height: 1200 },
    });

    await page.setContent(html);
    await page.screenshot({
      path: filePath,
      fullPage: true,
      type: "png",
    });

    await browser.close();
  }

  // Auto-open if requested
  if (autoOpen) {
    try {
      const { exec } = await import("child_process");
      const { promisify } = await import("util");
      const execAsync = promisify(exec);

      // Cross-platform file opening
      const platform = process.platform;
      let command;
      
      if (platform === 'win32') {
        command = `start "" "${filePath}"`;
      } else if (platform === 'darwin') {
        command = `open "${filePath}"`;
      } else {
        command = `xdg-open "${filePath}"`;
      }
      
      await execAsync(command);
      console.log(`✅ Opened ${outputType}: ${filePath}`);
    } catch (error) {
      console.error(`❌ Auto-open failed: ${error.message}`);
    }
  }

  return filePath;
}

async function testSampleDiff() {
  console.log('🧪 Testing sample diff visualization...\n');
  
  try {
    // Test HTML visualization with auto-open
    console.log('🌐 Generating HTML visualization...');
    const htmlPath = await generateDiffVisualization(sampleDiff, {
      outputType: 'html',
      autoOpen: true,
      outputFormat: 'side-by-side',
      showFileList: true,
      highlight: true,
      oldPath: 'src/api.js',
      newPath: 'src/api.js'
    });
    console.log(`📄 HTML saved: ${htmlPath}`);
    
    // Wait a moment before generating PNG
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Test PNG visualization
    console.log('🖼️  Generating PNG visualization...');
    const pngPath = await generateDiffVisualization(sampleDiff, {
      outputType: 'image',
      autoOpen: true,
      outputFormat: 'side-by-side',
      showFileList: true,
      highlight: true,
      oldPath: 'src/api.js',
      newPath: 'src/api.js'
    });
    console.log(`🖼️  PNG saved: ${pngPath}`);
    
    console.log('\n🎉 Test completed successfully!');
    console.log('📁 Check the output/ directory for generated files');
    
  } catch (error) {
    console.error(`❌ Test failed: ${error.message}`);
    console.error(error.stack);
  }
}

testSampleDiff();
