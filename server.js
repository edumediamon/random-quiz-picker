/**
 * server.js
 * 랜덤 문제 추출기 로컬 Node.js 서버
 * - 정적 파일 서빙 (index.html, css, js, data 등)
 * - 출제 이력 자동 저장/조회/초기화 API (/api/history)
 * - 프로젝트 폴더 내 history.txt 파일 실시간 연동
 */

const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const url = require('node:url');

const PORT = process.env.PORT || 3000;
const ROOT_DIR = __dirname;
const HISTORY_FILE = path.join(ROOT_DIR, 'history.txt');

// MIME 타입 매핑
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.csv': 'text/csv; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.svg': 'image/svg+xml'
};

/**
 * history.txt 파일에서 출제된 문제 ID 목록 추출
 */
function parseSeenIdsFromHistoryFile(content) {
  if (!content) return [];
  const seenIds = new Set();
  const idRegex = /\[기록 \d+\] ID:\s*([^\s|]+)/g;
  let match;
  while ((match = idRegex.exec(content)) !== null) {
    if (match[1]) {
      seenIds.add(match[1].trim());
    }
  }
  return Array.from(seenIds);
}

/**
 * 신규 출제 문제들을 history.txt 포맷 텍스트 블록으로 변환
 */
function formatQuestionsForHistoryFile(questions, existingCount = 0) {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const timestampStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;

  let chunk = '';
  questions.forEach((q, idx) => {
    const recordNum = existingCount + idx + 1;
    chunk += `[기록 ${recordNum}] ID: ${q.id || `unknown-${recordNum}`} | 일시: ${timestampStr}\n`;
    if (q.exam) chunk += `- 시험/자격증: ${q.exam}\n`;
    if (q.subject) chunk += `- 관련 영역: ${q.subject}\n`;
    if (q.type) chunk += `- 문제 유형: ${q.type}\n`;
    if (q.difficulty) chunk += `- 난이도: ${q.difficulty}\n`;
    if (q.title) chunk += `- 제목: ${q.title}\n`;
    chunk += `- 문제: ${q.question || ''}\n`;

    if (Array.isArray(q.options) && q.options.length > 0) {
      chunk += '- 보기:\n';
      q.options.forEach((opt, optIdx) => {
        chunk += `    ${optIdx + 1}) ${opt}\n`;
      });
    }

    chunk += `- 정답 / 모범답안: ${q.answer || '(등록된 정답 없음)'}\n`;
    if (q.explanation) {
      chunk += `- 해설 / 풀이: ${q.explanation}\n`;
    }
    chunk += '--------------------------------------------------------------------------------\n\n';
  });

  return chunk;
}

const server = http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url, true);
  let pathname = decodeURIComponent(parsedUrl.pathname);

  // CORS 헤더 설정
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // API 1: 서버 상태 확인 (GET /api/status)
  if (pathname === '/api/status' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({
      status: 'ok',
      server: 'random-quiz-picker-local-server',
      historyFile: HISTORY_FILE,
      exists: fs.existsSync(HISTORY_FILE)
    }));
    return;
  }

  // API 2: 출제 이력 조회 (GET /api/history)
  if (pathname === '/api/history' && req.method === 'GET') {
    let content = '';
    let seenIds = [];

    if (fs.existsSync(HISTORY_FILE)) {
      try {
        content = fs.readFileSync(HISTORY_FILE, 'utf-8');
        seenIds = parseSeenIdsFromHistoryFile(content);
      } catch (err) {
        console.error('history.txt 읽기 실패:', err);
      }
    }

    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({
      success: true,
      exists: fs.existsSync(HISTORY_FILE),
      count: seenIds.length,
      seenIds,
      filePath: HISTORY_FILE,
      content
    }));
    return;
  }

  // API 3: 출제 문제 이력 추가 (POST /api/history)
  if (pathname === '/api/history' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const payload = JSON.parse(body || '{}');
        const questions = Array.isArray(payload.questions) ? payload.questions : [];

        if (questions.length === 0) {
          res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify({ success: false, message: '저장할 문제가 없습니다.' }));
          return;
        }

        let existingContent = '';
        let currentSeenIds = [];
        if (fs.existsSync(HISTORY_FILE)) {
          existingContent = fs.readFileSync(HISTORY_FILE, 'utf-8');
          currentSeenIds = parseSeenIdsFromHistoryFile(existingContent);
        } else {
          // 최초 생성 시 헤더 작성
          const now = new Date();
          const pad = (n) => String(n).padStart(2, '0');
          const timestampStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
          existingContent = '================================================================================\n' +
            '[랜덤 문제 추출기] 출제 문제 누적 기록 및 중복 방지 이력\n' +
            `생성 일시: ${timestampStr}\n` +
            `파일 경로: ${HISTORY_FILE}\n` +
            '================================================================================\n\n';
          fs.writeFileSync(HISTORY_FILE, existingContent, 'utf-8');
        }

        const newChunk = formatQuestionsForHistoryFile(questions, currentSeenIds.length);
        fs.appendFileSync(HISTORY_FILE, newChunk, 'utf-8');

        // 갱신된 파일 재확인
        const updatedContent = fs.readFileSync(HISTORY_FILE, 'utf-8');
        const updatedSeenIds = parseSeenIdsFromHistoryFile(updatedContent);

        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({
          success: true,
          addedCount: questions.length,
          totalSeenCount: updatedSeenIds.length,
          seenIds: updatedSeenIds,
          filePath: HISTORY_FILE
        }));
      } catch (err) {
        console.error('history.txt 쓰기 실패:', err);
        res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ success: false, message: err.message }));
      }
    });
    return;
  }

  // API 4: 출제 이력 초기화 (DELETE /api/history)
  if (pathname === '/api/history' && req.method === 'DELETE') {
    try {
      if (fs.existsSync(HISTORY_FILE)) {
        fs.unlinkSync(HISTORY_FILE);
      }
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({
        success: true,
        message: 'history.txt 출제 이력 파일이 초기화되었습니다.'
      }));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ success: false, message: err.message }));
    }
    return;
  }

  // 정적 파일 서빙
  if (pathname === '/') pathname = '/index.html';
  const filePath = path.join(ROOT_DIR, pathname);

  // 보안: 디렉터리 탐색 공격 방지
  if (!filePath.startsWith(ROOT_DIR)) {
    res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('403 Forbidden');
    return;
  }

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('404 Not Found');
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    res.writeHead(200, { 'Content-Type': contentType });
    const stream = fs.createReadStream(filePath);
    stream.pipe(res);
  });
});

if (require.main === module) {
  server.listen(PORT, () => {
    console.log(`[랜덤 문제 추출기] 로컬 서버가 포트 ${PORT}에서 실행 중입니다.`);
    console.log(`- 웹 접속 URL: http://localhost:${PORT}`);
    console.log(`- 중복 방지 파일: ${HISTORY_FILE}`);
  });
}

module.exports = {
  server,
  HISTORY_FILE,
  parseSeenIdsFromHistoryFile,
  formatQuestionsForHistoryFile
};
