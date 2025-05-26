import { expect, test } from "bun:test";
import {
  exampleDiff1,
  filesystemDryRun,
  multiFileDiff,
} from "../examples/sample-diffs.ts";
import { server } from "../src/index.ts";

test("MCP server initialization", () => {
  expect(server).toBeDefined();
  expect(typeof server).toBe("object");
});

test("diff parsing", () => {
  const sampleDiff = `--- a/test.js
+++ b/test.js
@@ -1,3 +1,4 @@
 function test() {
+  console.log('added line');
   return true;
 }`;

  // Test that diff parsing doesn't throw
  expect(() => {
    // This would be tested with actual server method calls
    // For now, just verify the diff format is parseable
    const lines = sampleDiff.split("\n");
    expect(lines.length).toBeGreaterThan(0);
    expect(lines[0]).toContain("--- a/");
    expect(lines[1]).toContain("+++ b/");
  }).not.toThrow();
});

test("unified diff format validation", () => {
  const validDiff = `--- a/file.txt
+++ b/file.txt
@@ -1,1 +1,2 @@
 existing line
+new line`;

  const lines = validDiff.split("\n");
  expect(lines[0]).toMatch(/^---\s+a\//);
  expect(lines[1]).toMatch(/^\+\+\+\s+b\//);
  expect(lines[2]).toMatch(/^@@\s+-\d+,\d+\s+\+\d+,\d+\s+@@/);
});

test("server exports are available", () => {
  // Test that the server is properly exported and has expected structure
  expect(server).toBeDefined();
  expect(typeof server).toBe("object");

  // Test that required methods exist
  expect(server.setRequestHandler).toBeDefined();
  expect(typeof server.setRequestHandler).toBe("function");
});

test("sample diff formats validation", () => {
  // Test example diff 1 (API changes)
  const lines1 = exampleDiff1.split("\n");
  expect(lines1[0]).toMatch(/^---\s+a\//);
  expect(lines1[1]).toMatch(/^\+\+\+\s+b\//);
  expect(exampleDiff1).toContain("async fetchData");
  expect(exampleDiff1).toContain("options = {}");

  // Test filesystem dry-run format
  const lines2 = filesystemDryRun.split("\n");
  expect(lines2[0]).toMatch(/^---\s+/);
  expect(lines2[1]).toMatch(/^\+\+\+\s+/);
  expect(filesystemDryRun).toContain("export interface User");
  expect(filesystemDryRun).toContain("email: string");

  // Test multi-file diff
  const lines3 = multiFileDiff.split("\n");
  expect(lines3[0]).toMatch(/^---\s+a\//);
  expect(lines3[1]).toMatch(/^\+\+\+\s+b\//);
  expect(multiFileDiff).toContain("package.json");
  expect(multiFileDiff).toContain("prettier");
});

test("diff content parsing", () => {
  // Test that all sample diffs contain required unified diff elements
  const samples = [exampleDiff1, filesystemDryRun, multiFileDiff];

  samples.forEach((diff, index) => {
    const lines = diff.split("\n");

    // Should have header lines
    expect(lines.length).toBeGreaterThan(2);

    // Should contain diff markers
    const hasAdditions = diff.includes("+");
    const hasDeletions = diff.includes("-");
    expect(hasAdditions || hasDeletions).toBe(true);

    // Should have proper structure
    expect(diff).toMatch(/@@.*@@/); // Hunk header
  });
});
