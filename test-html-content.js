#!/usr/bin/env node

import { spawn } from 'child_process';

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
  console.log('Response:', output);
  try {
    const response = JSON.parse(output);
    if (response.result && response.result.content) {
      console.log('HTML Content Length:', response.result.content[0].text.length);
      console.log('First 500 chars:', response.result.content[0].text.substring(0, 500));
    }
  } catch (e) {
    console.error('Parse error:', e);
  }
});

// Send the request
child.stdin.write(JSON.stringify(request) + '\n');
child.stdin.end();
