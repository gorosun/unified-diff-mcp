// 一時HTTPサーバーでHTMLを配信する案
async function serveHtmlTemporarily(htmlContent: string): Promise<string> {
  const http = await import('http');
  const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(htmlContent);
  });
  
  // ランダムポートで起動
  const port = Math.floor(Math.random() * 10000) + 3000;
  server.listen(port);
  
  const url = `http://localhost:${port}`;
  
  // 5秒後にサーバーを停止
  setTimeout(() => {
    server.close();
  }, 5000);
  
  return url;
}
