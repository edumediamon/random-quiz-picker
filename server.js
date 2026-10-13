/**
 * server.js
 * 랜덤 문제 추출기 로컬 Node.js 서버
 * - 정적 파일 서빙 (index.html, css, js, data 등)
 * - 출제 이력 API (/api/history)
 * - 이력은 "업로드한 문제 파일 + 추출 조건(자격증·영역·유형·난이도)" 조합마다
 *   프로젝트 폴더의 history/ 아래 개별 TXT 파일로 분리 저장된다.
 */

const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const PORT = Number(process.env.PORT) || 3000;
const ROOT_DIR = __dirname;
const HISTORY_DIR = path.resolve(process.env.QUIZ_HISTORY_DIR || path.join(ROOT_DIR, 'history'));

// 조건 키 구성 필드와 '전체' 선택 시 파일명에 쓰는 라벨
const HISTORY_KEY_FIELDS = ['exam', 'subject', 'type', 'difficulty'];
const ALL_LABELS = {
  exam: '전체자격증',
  subject: '전체영역',
  type: '전체유형',
  difficulty: '전체난이도'
};
const FIELD_LABELS = {
  exam: '자격증/시험',
  subject: '관련 영역',
  type: '문제 유형',
  difficulty: '난이도'
};

const MAX_BODY_BYTES = 5 * 1024 * 1024;
const MAX_QUESTIONS_PER_REQUEST = 1000;
const MAX_SEGMENT_LENGTH = 60;

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

// ==========================================================================
// 이력 키 / 파일명
// ==========================================================================

/**
 * 입력값을 { source, exam, subject, type, difficulty } 형태로 정규화
 * 비어 있거나 'ALL'인 조건은 'ALL'로 통일한다.
 */
function normalizeHistoryKey(input = {}) {
  const source = String(input.source ?? '').trim() || 'unknown-source';
  const key = { source };
  HISTORY_KEY_FIELDS.forEach(field => {
    const value = String(input[field] ?? '').trim();
    key[field] = value && value !== 'ALL' ? value : 'ALL';
  });
  return key;
}

/**
 * 파일명에 사용할 수 없는 문자를 치환하고 길이를 제한
 */
function sanitizeSegment(value) {
  const cleaned = String(value)
    .replace(/[\\/:*?"<>|\u0000-\u001f]/g, '_')
    .replace(/\s+/g, ' ')
    .replace(/^\.+/, '_')
    .trim();
  return cleaned.slice(0, MAX_SEGMENT_LENGTH);
}

/**
 * 조건 키로부터 사람이 읽을 수 있는 이력 파일명을 생성
 * 예: 내문제.json__정보처리기사__데이터베이스__전체유형__기초.txt
 * 치환/절단이 발생하면 서로 다른 키가 같은 파일을 공유하지 않도록 짧은 해시를 덧붙인다.
 */
function buildHistoryFileName(input = {}) {
  const key = normalizeHistoryKey(input);
  let altered = false;

  const segments = [key.source, ...HISTORY_KEY_FIELDS.map(f => key[f])].map((raw, idx) => {
    const field = idx === 0 ? null : HISTORY_KEY_FIELDS[idx - 1];
    if (field && raw === 'ALL') return ALL_LABELS[field];
    const safe = sanitizeSegment(raw);
    if (safe !== raw || !safe) altered = true;
    return safe || '_';
  });

  let base = segments.join('__');
  if (altered) {
    const hash = crypto.createHash('sha1').update(JSON.stringify(key)).digest('hex').slice(0, 8);
    base += `__${hash}`;
  }
  return `${base}.txt`;
}

/**
 * 이력 파일 절대 경로 반환 (history 디렉터리 밖으로 벗어나지 않음을 보장)
 */
function resolveHistoryPath(input = {}) {
  const fileName = buildHistoryFileName(input);
  const filePath = path.resolve(HISTORY_DIR, fileName);
  if (path.dirname(filePath) !== HISTORY_DIR) {
    throw new Error('잘못된 이력 파일 경로입니다.');
  }
  return { fileName, filePath };
}

// ==========================================================================
// 이력 파일 포맷 / 파싱
// ==========================================================================

function formatTimestamp(date = new Date()) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ` +
    `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

function normalizeId(id, fallback) {
  const value = String(id ?? '').replace(/[\r\n]+/g, ' ').trim();
  return value || fallback;
}

const RECORD_ID_REGEX = /^\[기록 \d+\] ID: (.+?) \| 일시:/gm;
const RECORD_LINE_REGEX = /^\[기록 \d+\]/gm;

/**
 * 이력 파일 내용에서 출제된 문제 ID 목록(중복 제거) 추출
 */
function parseSeenIdsFromHistoryFile(content) {
  if (!content) return [];
  const seenIds = new Set();
  for (const match of content.matchAll(RECORD_ID_REGEX)) {
    if (match[1]) seenIds.add(match[1].trim());
  }
  return Array.from(seenIds);
}

function countRecords(content) {
  if (!content) return 0;
  return (content.match(RECORD_LINE_REGEX) || []).length;
}

function buildHistoryHeader(key, fileName) {
  const normalized = normalizeHistoryKey(key);
  let header = '================================================================================\n';
  header += '[랜덤 문제 추출기] 출제 문제 누적 기록 및 중복 방지 이력\n';
  header += `생성 일시: ${formatTimestamp()}\n`;
  header += `문제 파일: ${normalized.source}\n`;
  HISTORY_KEY_FIELDS.forEach(field => {
    const value = normalized[field] === 'ALL' ? `전체 (${ALL_LABELS[field]})` : normalized[field];
    header += `${FIELD_LABELS[field]}: ${value}\n`;
  });
  header += `이력 파일: history/${fileName}\n`;
  header += '================================================================================\n\n';
  return header;
}

/**
 * 신규 출제 문제들을 이력 파일용 텍스트 블록으로 변환
 */
function formatQuestionsForHistoryFile(questions, existingCount = 0) {
  const timestampStr = formatTimestamp();
  let chunk = '';

  questions.forEach((q, idx) => {
    const recordNum = existingCount + idx + 1;
    chunk += `[기록 ${recordNum}] ID: ${normalizeId(q.id, `unknown-${recordNum}`)} | 일시: ${timestampStr}\n`;
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
    if (q.explanation) chunk += `- 해설 / 풀이: ${q.explanation}\n`;
    chunk += '--------------------------------------------------------------------------------\n\n';
  });

  return chunk;
}

// ==========================================================================
// 이력 저장소 조작
// ==========================================================================

function readHistory(key) {
  const { fileName, filePath } = resolveHistoryPath(key);
  const exists = fs.existsSync(filePath);
  const content = exists ? fs.readFileSync(filePath, 'utf-8') : '';
  const seenIds = parseSeenIdsFromHistoryFile(content);
  return { fileName, filePath, exists, content, seenIds };
}

function appendHistory(key, questions, { resetBeforeAppend = false } = {}) {
  const { fileName, filePath } = resolveHistoryPath(key);
  fs.mkdirSync(HISTORY_DIR, { recursive: true });

  if (resetBeforeAppend && fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, buildHistoryHeader(key, fileName), 'utf-8');
  }

  const existing = fs.readFileSync(filePath, 'utf-8');
  fs.appendFileSync(filePath, formatQuestionsForHistoryFile(questions, countRecords(existing)), 'utf-8');

  const seenIds = parseSeenIdsFromHistoryFile(fs.readFileSync(filePath, 'utf-8'));
  return { fileName, filePath, seenIds };
}

function deleteHistory(key) {
  const { fileName, filePath } = resolveHistoryPath(key);
  const existed = fs.existsSync(filePath);
  if (existed) fs.unlinkSync(filePath);
  return { fileName, existed };
}

// ==========================================================================
// HTTP 처리
// ==========================================================================

function sendJson(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(body));
}

function keyFromSearchParams(searchParams) {
  const input = { source: searchParams.get('source') };
  HISTORY_KEY_FIELDS.forEach(field => { input[field] = searchParams.get(field); });
  return input;
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', chunk => {
      size += chunk.length;
      if (size > MAX_BODY_BYTES) {
        reject(Object.assign(new Error('요청 본문이 너무 큽니다.'), { status: 413 }));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => {
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString('utf-8') || '{}'));
      } catch (err) {
        reject(Object.assign(new Error('JSON 형식이 올바르지 않습니다.'), { status: 400 }));
      }
    });
    req.on('error', reject);
  });
}

async function handleHistoryApi(req, res, searchParams) {
  if (req.method === 'GET') {
    const key = keyFromSearchParams(searchParams);
    const { fileName, exists, seenIds } = readHistory(key);
    sendJson(res, 200, {
      success: true,
      key: normalizeHistoryKey(key),
      fileName,
      exists,
      count: seenIds.length,
      seenIds
    });
    return;
  }

  if (req.method === 'POST') {
    const payload = await readJsonBody(req);
    const questions = Array.isArray(payload.questions) ? payload.questions : [];
    if (questions.length === 0 || questions.length > MAX_QUESTIONS_PER_REQUEST) {
      sendJson(res, 400, { success: false, message: `저장할 문제는 1~${MAX_QUESTIONS_PER_REQUEST}개여야 합니다.` });
      return;
    }
    const key = payload.key || {};
    const { fileName, seenIds } = appendHistory(key, questions, {
      resetBeforeAppend: payload.resetBeforeAppend === true
    });
    console.log(`[history] +${questions.length} -> history/${fileName} (총 ${seenIds.length}문항)`);
    sendJson(res, 200, {
      success: true,
      fileName,
      addedCount: questions.length,
      count: seenIds.length,
      seenIds
    });
    return;
  }

  if (req.method === 'DELETE') {
    const key = keyFromSearchParams(searchParams);
    const { fileName, existed } = deleteHistory(key);
    console.log(`[history] 초기화 -> history/${fileName} (${existed ? '삭제됨' : '파일 없음'})`);
    sendJson(res, 200, { success: true, fileName, existed });
    return;
  }

  sendJson(res, 405, { success: false, message: '지원하지 않는 메서드입니다.' });
}

function serveStatic(req, res, pathname) {
  if (pathname === '/') pathname = '/index.html';
  const filePath = path.resolve(ROOT_DIR, `.${pathname}`);

  // 디렉터리 탐색 방지
  if (filePath !== ROOT_DIR && !filePath.startsWith(ROOT_DIR + path.sep)) {
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
    const contentType = MIME_TYPES[path.extname(filePath).toLowerCase()] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': contentType });
    fs.createReadStream(filePath).pipe(res);
  });
}

const server = http.createServer(async (req, res) => {
  let parsed;
  let pathname;
  try {
    parsed = new URL(req.url, 'http://localhost');
    pathname = decodeURIComponent(parsed.pathname);
  } catch (err) {
    sendJson(res, 400, { success: false, message: '잘못된 요청 경로입니다.' });
    return;
  }

  try {
    if (pathname === '/api/status' && req.method === 'GET') {
      sendJson(res, 200, { status: 'ok', server: 'random-quiz-picker-local-server', historyDir: HISTORY_DIR });
      return;
    }
    if (pathname === '/api/history') {
      await handleHistoryApi(req, res, parsed.searchParams);
      return;
    }
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      sendJson(res, 405, { success: false, message: '지원하지 않는 메서드입니다.' });
      return;
    }
    serveStatic(req, res, pathname);
  } catch (err) {
    console.error('[server] 요청 처리 실패:', err);
    if (!res.headersSent) {
      sendJson(res, err.status || 500, { success: false, message: err.message });
    }
  }
});

if (require.main === module) {
  server.listen(PORT, () => {
    console.log(`[랜덤 문제 추출기] 로컬 서버가 포트 ${PORT}에서 실행 중입니다.`);
    console.log(`- 웹 접속 URL: http://localhost:${PORT}`);
    console.log(`- 조건별 이력 폴더: ${HISTORY_DIR}`);
  });
}

module.exports = {
  server,
  HISTORY_DIR,
  normalizeHistoryKey,
  buildHistoryFileName,
  resolveHistoryPath,
  parseSeenIdsFromHistoryFile,
  formatQuestionsForHistoryFile,
  readHistory,
  appendHistory,
  deleteHistory
};
