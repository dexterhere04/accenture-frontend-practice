const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const ROOT = __dirname;
const PORT = Number(process.env.PORT || 4173);
const files = ['index.html', 'style.css', 'script.js'];
const slugs = fs.readdirSync(path.join(ROOT, 'exercises')).filter(s => /^[\w-]+$/.test(s) && fs.existsSync(path.join(ROOT, 'exercises', s, 'test.spec.js'))).sort();
const mime = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json', '.md': 'text/plain', '.svg': 'image/svg+xml' };
function send(res, status, data) { res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }); res.end(JSON.stringify(data)); }
function serve(res, file) { fs.readFile(file, (err, data) => { res.writeHead(err ? 404 : 200, { 'Content-Type': mime[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' }); res.end(err ? 'Not found' : data); }); }
async function submission(req) {
  let body = '';
  for await (const chunk of req) { body += chunk; if (body.length > 600000) throw new Error('Submission is too large (maximum 600 KB).'); }
  const value = JSON.parse(body);
  if (!slugs.includes(value.slug) || !value.files || files.some(f => typeof value.files[f] !== 'string')) throw new Error('Invalid exercise or files.');
  return value;
}
async function snapshot(value) {
  const prefix = `/exercises/${value.slug}/`;
  const server = http.createServer((req, res) => {
    let pathname;
    try { pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname); } catch { res.writeHead(400); return res.end(); }
    const name = pathname.startsWith(prefix) ? pathname.slice(prefix.length) : '';
    if (files.includes(name)) { res.writeHead(200, { 'Content-Type': mime[path.extname(name)], 'Cache-Control': 'no-store' }); return res.end(value.files[name]); }
    // Only exercise data/assets are accessible on the isolated preview origin.
    if (/^[\w.-]+$/.test(name) && /\.(json|png|jpg|svg|webp)$/.test(name)) return serve(res, path.join(ROOT, 'exercises', value.slug, name));
    res.writeHead(404); res.end('Not found');
  });
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
  return { server, origin: `http://127.0.0.1:${server.address().port}`, prefix };
}
let grading = false;
const previews = [];
async function grade(value) {
  const site = await snapshot(value);
  try {
    const env = { ...process.env, IDE_BASE_URL: site.origin, SOLUTION: '', FORCE_COLOR: '0' };
    const output = await new Promise((resolve, reject) => {
      const child = spawn(process.execPath, [require.resolve('@playwright/test/cli'), 'test', `exercises/${value.slug}/test.spec.js`, '--config=ide.playwright.config.js'], { cwd: ROOT, env, windowsHide: true });
      let stdout = '', stderr = '';
      const timer = setTimeout(() => child.kill(), 180000);
      child.stdout.on('data', chunk => { stdout += chunk; });
      child.stderr.on('data', chunk => { stderr += chunk; });
      child.on('error', err => { clearTimeout(timer); reject(err); });
      child.on('close', () => { clearTimeout(timer); resolve({ stdout, stderr }); });
    });
    let report;
    try { report = JSON.parse(output.stdout); } catch { throw new Error('The grader could not finish. Check Chromium is installed with npx playwright install chromium. ' + output.stderr.slice(-1200)); }
    if (report.errors?.length) throw new Error(report.errors.map(e => e.message || e.value).join('\n'));
    const results = [];
    function walk(suite) {
      for (const spec of suite.specs || []) for (const test of spec.tests || []) {
        const last = test.results.at(-1);
        results.push({ title: spec.title, status: last?.status || 'skipped', duration: last?.duration || 0, error: (last?.errors || []).map(e => e.message || e.value).join('\n').replace(/\u001b\[[0-9;]*m/g, '') });
      }
      for (const child of suite.suites || []) walk(child);
    }
    for (const suite of report.suites || []) walk(suite);
    if (!results.length) throw new Error((report.errors || []).map(e => e.message).join('\n') || 'No test cases were found.');
    return { results, passed: results.filter(t => t.status === 'passed').length, total: results.length };
  } finally { site.server.close(); site.server.closeAllConnections(); }
}
const server = http.createServer(async (req, res) => {
  try {
    if (!['localhost', '127.0.0.1'].includes((req.headers.host || '').split(':')[0])) return send(res, 403, { error: 'Local access only.' });
    const url = new URL(req.url, `http://${req.headers.host}`);
    if (url.pathname.startsWith('/api/')) {
      if (req.headers.origin && req.headers.origin !== url.origin) return send(res, 403, { error: 'Cross-origin requests are not allowed.' });
      if (req.method === 'GET' && url.pathname === '/api/exercise') {
        const slug = url.searchParams.get('slug');
        if (!slugs.includes(slug)) return send(res, 404, { error: 'Exercise not found.' });
        const dir = path.join(ROOT, 'exercises', slug);
        const sources = Object.fromEntries(files.map(f => [f, fs.existsSync(path.join(dir, f)) ? fs.readFileSync(path.join(dir, f), 'utf8') : '']));
        const solution = Object.fromEntries(files.map(f => [f, fs.existsSync(path.join(dir, 'solution', f)) ? fs.readFileSync(path.join(dir, 'solution', f), 'utf8') : '']));
        const index = slugs.indexOf(slug);
        return send(res, 200, { files: sources, solution, task: fs.readFileSync(path.join(dir, 'task.md'), 'utf8'), next: slugs[index + 1] || null, number: index + 1, total: slugs.length });
      }
      if (req.method === 'POST' && ['/api/run', '/api/preview'].includes(url.pathname)) {
        const value = await submission(req);
        if (url.pathname === '/api/preview') {
          const site = await snapshot(value);
          const close = () => { site.server.close(); site.server.closeAllConnections(); const i = previews.indexOf(close); if (i >= 0) previews.splice(i, 1); };
          previews.push(close);
          if (previews.length > 20) previews[0]();
          setTimeout(close, 30 * 60 * 1000).unref();
          return send(res, 200, { url: site.origin + site.prefix + 'index.html' });
        }
        if (grading) return send(res, 409, { error: 'Another test run is in progress. Please try again shortly.' });
        grading = true;
        try { return send(res, 200, await grade(value)); } finally { grading = false; }
      }
      return send(res, 404, { error: 'Endpoint not found.' });
    }
    const pathname = decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname);
    const allowed = /^\/(index.html|dashboard\.(css|js)|ide\.(html|css|js))$/.test(pathname) || /^\/exercises\/[\w-]+\/(solution\/)?[\w.-]+\.(html|css|js|json|md|png|jpg|svg)$/.test(pathname);
    if (!allowed) return send(res, 404, { error: 'Not found.' });
    serve(res, path.join(ROOT, pathname));
  } catch (err) { send(res, 400, { error: err.message }); }
});
server.listen(PORT, '127.0.0.1', () => console.log(`Practice IDE running at http://localhost:${PORT}`));
