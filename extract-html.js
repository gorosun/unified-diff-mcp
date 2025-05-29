#!/usr/bin/env node

import { spawn } from 'child_process';
import { writeFileSync } from 'fs';

const testDiff = `--- a/example.py
+++ b/example.py
@@ -1,5 +1,8 @@
 import os
 import sys
+import json
+import logging
 
 def main():
-    print("Hello World")
+    print("Hello, Enhanced World!")
+    logging.info("アプリケーションが開始されました")`;

const request = {
  jsonrpc: "2.0",
  id: 1,
  method: "tools/call",
  params: {
    name: "visualize_diff_html_content",
    arguments: {
      diff: testDiff,
      oldPath: "example.py",
      newPath: "example.py",
      format: "side-by-side"
    }
  }
};

const child = spawn('node', ['dist/index.js'], {
  stdio: ['pipe', 'pipe', 'pipe']
});

let output = '';
child.stdout.on('data', (data) => {
  output += data.toString();
});

child.stderr.on('data', (data) => {
  console.error('Server:', data.toString());
});

child.on('close', (code) => {
  try {
    const response = JSON.parse(output);
    if (response.result && response.result.content) {
      const text = response.result.content[0].text;
      
      // Extract HTML content between ```html and ```
      const startMarker = '```html\n';
      const endMarker = '\n```';
      const startIndex = text.indexOf(startMarker);
      const endIndex = text.lastIndexOf(endMarker);
      
      if (startIndex !== -1 && endIndex !== -1) {
        const htmlContent = text.substring(startIndex + startMarker.length, endIndex);
        writeFileSync('smithery-test-output.html', htmlContent, 'utf8');
        console.log('✅ HTML file saved as smithery-test-output.html');
        console.log('📊 HTML Content Length:', htmlContent.length);
        console.log('🎨 Features included: Syntax highlighting, side-by-side diff, responsive design');
      } else {
        console.error('❌ Could not extract HTML content');
      }
    }
  } catch (e) {
    console.error('❌ Parse error:', e);
  }
});

// Send the request
child.stdin.write(JSON.stringify(request) + '\n');
child.stdin.end();
