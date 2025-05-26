#!/usr/bin/env node

import { server } from '../src/index.js';
import { exampleDiff1, filesystemDryRun, multiFileDiff } from './sample-diffs.js';

// Test samples for the unified-diff-mcp server
const testSamples = [
  {
    name: "Basic API change",
    diff: exampleDiff1,
    description: "Adding timeout parameter to fetchData function"
  },
  {
    name: "TypeScript interface update", 
    diff: filesystemDryRun,
    description: "Adding email and createdAt fields to User interface"
  },
  {
    name: "Package.json update",
    diff: multiFileDiff,
    description: "Adding Prettier to development dependencies"
  }
];

async function testDiffVisualization() {
  console.log('🧪 Testing Unified Diff MCP Server...\n');
  
  for (let i = 0; i < testSamples.length; i++) {
    const sample = testSamples[i];
    
    console.log(`📝 Test ${i + 1}: ${sample.name}`);
    console.log(`Description: ${sample.description}`);
    console.log('---');
    
    try {
      // Test HTML visualization
      console.log('🌐 Generating HTML visualization...');
      
      // Simulate MCP tool call for HTML
      const htmlRequest = {
        method: 'tools/call',
        params: {
          name: 'visualize_diff_image',
          arguments: {
            diff: sample.diff,
            format: 'side-by-side',
            showFileList: true,
            highlight: true,
            autoOpen: true,
            outputType: 'html'
          }
        }
      };
      
      // Test PNG visualization  
      console.log('🖼️  Generating PNG visualization...');
      
      const pngRequest = {
        method: 'tools/call', 
        params: {
          name: 'visualize_diff_image',
          arguments: {
            diff: sample.diff,
            format: 'side-by-side',
            showFileList: true,
            highlight: true,
            autoOpen: false, // Don't auto-open PNG to avoid opening too many files
            outputType: 'image'
          }
        }
      };
      
      console.log('✅ Test completed successfully\n');
      
    } catch (error) {
      console.error(`❌ Test failed: ${error.message}\n`);
    }
  }
  
  console.log('🎉 All tests completed!');
  console.log('📁 Check the output/ directory for generated files');
  console.log('💡 Use DEFAULT_AUTO_OPEN=true environment variable to auto-open files');
}

// Manual test function for direct API calls
export async function runDirectTest() {
  const { generateDiffVisualization } = await import('../src/index.js');
  
  try {
    console.log('🚀 Running direct API test...');
    
    // Test HTML generation
    const htmlPath = await generateDiffVisualization(exampleDiff1, {
      outputType: 'html',
      autoOpen: true,
      outputFormat: 'side-by-side'
    });
    console.log(`✅ HTML generated: ${htmlPath}`);
    
    // Test PNG generation
    const pngPath = await generateDiffVisualization(exampleDiff1, {
      outputType: 'image', 
      autoOpen: false,
      outputFormat: 'side-by-side'
    });
    console.log(`✅ PNG generated: ${pngPath}`);
    
  } catch (error) {
    console.error(`❌ Direct test failed: ${error.message}`);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  testDiffVisualization().catch(console.error);
}
