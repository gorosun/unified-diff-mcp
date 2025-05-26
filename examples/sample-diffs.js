// Example usage of the unified-diff-mcp server

// Example 1: Basic unified diff
export const exampleDiff1 = `--- a/src/api.js
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

// Example 2: Filesystem edit_file dry-run output
export const filesystemDryRun = `--- /Users/username/project/src/utils.ts
+++ /Users/username/project/src/utils.ts
@@ -1,10 +1,15 @@
 export interface User {
   id: string;
   name: string;
+  email: string;
+  createdAt: Date;
 }

-export function createUser(name: string): User {
+export function createUser(name: string, email: string): User {
   return {
     id: crypto.randomUUID(),
-    name
+    name,
+    email,
+    createdAt: new Date()
   };
 }`;

// Example 3: Complex multi-file changes
export const multiFileDiff = `--- a/package.json
+++ b/package.json
@@ -15,6 +15,7 @@
     "typescript": "^5.3.0",
     "jest": "^29.0.0",
+    "prettier": "^3.0.0",
     "eslint": "^8.0.0"
   },
   "scripts": {`;
