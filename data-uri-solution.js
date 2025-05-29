/**
 * Generate a data URI for HTML content that can be opened directly in browser
 */
function generateDataUri(htmlContent: string): string {
  // Base64エンコード
  const base64Html = Buffer.from(htmlContent, 'utf8').toString('base64');
  return `data:text/html;base64,${base64Html}`;
}

// 使用例
const dataUri = generateDataUri(htmlContent);
const openCommand = `open "${dataUri}"`;  // macOS
// または
const openCommand = `xdg-open "${dataUri}"`;  // Linux
