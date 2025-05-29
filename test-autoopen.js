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
      format: "side-by-side",
      autoOpen: true  // ✨ 新機能テスト！
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
  console.log('🎯 Testing autoOpen feature...\n');
  try {
    const response = JSON.parse(output);
    if (response.result && response.result.content) {
      const text = response.result.content[0].text;
      console.log('✅ Response received!');
      console.log('📄 Response preview:');
      console.log(text.substring(0, 200) + '...\n');
      
      if (text.includes('🌐 **Opened in browser**')) {
        console.log('🎉 SUCCESS: autoOpen feature is working!');
        console.log('🚀 Browser should open automatically with the diff visualization');
      } else if (text.includes('Generated HTML diff visualization:')) {
        console.log('ℹ️  INFO: Standard HTML content returned (autoOpen might be false or failed)');
      } else {
        console.log('❓ UNKNOWN: Unexpected response format');
      }
    }
  } catch (e) {
    console.error('❌ Parse error:', e);
    console.log('Raw output:', output);
  }
});

// Send the request
child.stdin.write(JSON.stringify(request) + '\n');
child.stdin.end();
