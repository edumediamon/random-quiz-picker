/**
 * parser.js
 * JSON 및 CSV 문제 데이터셋 파싱 및 정규화 모듈
 */

const KEY_ALIASES = {
  id: ['id', '번호', '문제번호', '문항번호', 'no'],
  exam: ['exam', '시험', '자격증', '시험명', '자격증명', '출처', '기출', 'source'],
  subject: [
    'subject', '과목', '영역', '관련영역', '관련 영역', '분야', '대영역', '중영역', '소영역', '단원',
    'category', 'domain', 'area', 'area_label', 'arealabel', 'area_name', 'areaname', 'area_desc'
  ],
  type: ['type', '유형', '문제유형', '문제 유형', '문항유형', '문항 유형', '질문유형', '질문 유형', '포맷', 'format', 'questionType', 'itemType'],
  difficulty: ['difficulty', '난이도', '수준', '등급', 'level'],
  title: ['title', '제목', '소제목', '주제', '문제제목', 'number_label', 'numberlabel', 'q_label', 'label'],
  question: [
    'question', '문제', '본문', '문항', '질문', '문제본문', '지문',
    'type_label_question', 'typelabelquestion', 'label_question', 'labelquestion',
    'question_text', 'questionText', 'question_content', 'questionContent',
    'body', 'content', 'prompt', 'text', 'problem', 'quiz', 'item', 'desc', 'description'
  ],
  options: ['options', '보기', '선택지', '항목', '선지', 'choices'],
  answer: [
    'answer', '정답', '답', '해답',
    '모범답안', '모범 답안', '모범정답', '모범 정답',
    'solution', 'correct_answer', 'correctAnswer', 'model_answer', 'modelAnswer', 'model_ans', 'correct'
  ],
  explanation: [
    'explanation', '해설', '풀이', '설명',
    '해설및풀이', '해설 및 풀이', '풀이과정', 'commentary', 'note'
  ]
};

/**
 * 표준 CSV 문자열을 2차원 배열로 파싱 (RFC 4180 준수)
 * 큰따옴표 이스케이프(""), 필드 내부 쉼표, 줄바꿈을 정확히 처리합니다.
 */
function parseCSVToRows(csvText) {
  if (!csvText) return [];
  // UTF-8 BOM 제거
  let cleanText = csvText.charCodeAt(0) === 0xFEFF ? csvText.slice(1) : csvText;
  cleanText = cleanText.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  const rows = [];
  let currentRow = [];
  let currentField = '';
  let inQuotes = false;
  let i = 0;
  const len = cleanText.length;

  while (i < len) {
    const char = cleanText[i];

    if (inQuotes) {
      if (char === '"') {
        if (i + 1 < len && cleanText[i + 1] === '"') {
          // 이스케이프된 큰따옴표 ("")
          currentField += '"';
          i += 2;
          continue;
        } else {
          // 따옴표 닫힘
          inQuotes = false;
          i++;
          continue;
        }
      } else {
        currentField += char;
        i++;
        continue;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
        i++;
        continue;
      } else if (char === ',') {
        currentRow.push(currentField.trim());
        currentField = '';
        i++;
        continue;
      } else if (char === '\n') {
        currentRow.push(currentField.trim());
        // 빈 행이 아닌 경우에만 추가
        if (currentRow.some(field => field.length > 0)) {
          rows.push(currentRow);
        }
        currentRow = [];
        currentField = '';
        i++;
        continue;
      } else {
        currentField += char;
        i++;
        continue;
      }
    }
  }

  // 마지막 행 처리
  if (currentField.length > 0 || currentRow.length > 0) {
    currentRow.push(currentField.trim());
    if (currentRow.some(field => field.length > 0)) {
      rows.push(currentRow);
    }
  }

  return rows;
}

/**
 * 키 이름 정규화 (공백, 하이픈, 언더스코어 제거 및 소문자 변환)
 */
function normalizeKeyName(name) {
  return String(name || '').trim().toLowerCase().replace(/[\s_\-]/g, '');
}

/**
 * 필드명을 표준 스키마 키로 매핑
 */
function findCanonicalKey(headerName) {
  const clean = normalizeKeyName(headerName);
  for (const [canonical, aliases] of Object.entries(KEY_ALIASES)) {
    if (aliases.some(alias => normalizeKeyName(alias) === clean)) {
      return canonical;
    }
  }

  // 지능형 패턴 매칭 Fallback (복합 컬럼명 대응: 예 type_label_question, area_label 등)
  if (clean.includes('question') || clean.includes('문제본문') || clean.includes('지문')) {
    if (!clean.includes('type') || clean.includes('labelquestion') || clean.endsWith('question')) {
      return 'question';
    }
  }
  if (clean.includes('arealabel') || clean.includes('areaname') || clean.includes('과목명') || clean.includes('영역명')) {
    return 'subject';
  }
  if (clean.includes('numberlabel') || clean.includes('qlabel')) {
    return 'title';
  }
  if (clean.includes('modelanswer') || clean.includes('정답') || clean.includes('모범답')) {
    return 'answer';
  }

  return null;
}

/**
 * 단일 문제 객체 정규화
 */
function normalizeQuestion(rawObj, fallbackIndex = 1) {
  const normalized = {};

  for (const [key, value] of Object.entries(rawObj)) {
    const canonicalKey = findCanonicalKey(key);
    if (canonicalKey) {
      normalized[canonicalKey] = value;
    } else {
      normalized[key] = value;
    }
  }

  // 기본값 및 타입 정규화
  normalized.id = String(normalized.id || `q-${fallbackIndex}`).trim();
  normalized.exam = String(normalized.exam || '').trim();
  normalized.subject = String(normalized.subject || '').trim();
  normalized.type = String(normalized.type || '').trim();
  normalized.difficulty = String(normalized.difficulty || '').trim();

  // 제목 정규화
  if (normalized.title) {
    normalized.title = String(normalized.title).trim();
  } else if (normalized.type) {
    normalized.title = `[${normalized.type}] 문제 ${fallbackIndex}`;
  } else {
    normalized.title = `문제 ${fallbackIndex}`;
  }

  normalized.question = String(normalized.question || '').trim();

  // answer(정답 / 모범답안) 처리: 배열이거나 객체인 경우 안전하게 문자열 변환
  if (Array.isArray(normalized.answer)) {
    normalized.answer = normalized.answer.map(a => String(a).trim()).filter(Boolean).join(', ');
  } else if (normalized.answer !== null && typeof normalized.answer === 'object') {
    normalized.answer = JSON.stringify(normalized.answer);
  } else {
    normalized.answer = String(normalized.answer || '').trim();
  }

  normalized.explanation = String(normalized.explanation || '').trim();

  // options 처리 (배열이거나 파이프 | 구분 문자열인 경우)
  if (Array.isArray(normalized.options)) {
    normalized.options = normalized.options.map(opt => String(opt).trim()).filter(Boolean);
  } else if (typeof normalized.options === 'string') {
    const rawOptions = normalized.options.trim();
    if (rawOptions.startsWith('[') && rawOptions.endsWith(']')) {
      try {
        normalized.options = JSON.parse(rawOptions).map(opt => String(opt).trim());
      } catch (e) {
        normalized.options = rawOptions.split('|').map(opt => opt.trim()).filter(Boolean);
      }
    } else {
      normalized.options = rawOptions.split('|').map(opt => opt.trim()).filter(Boolean);
    }
  } else {
    normalized.options = [];
  }

  return normalized;
}

/**
 * CSV 텍스트를 문제 목록 배열로 파싱
 */
function parseCSVQuestions(csvText) {
  const rows = parseCSVToRows(csvText);
  if (rows.length < 2) {
    throw new Error('CSV 파일에 헤더와 최소 1개 이상의 데이터 행이 필요합니다.');
  }

  const headers = rows[0];
  const questions = [];

  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    const rawObj = {};
    headers.forEach((header, colIndex) => {
      rawObj[header] = row[colIndex] !== undefined ? row[colIndex] : '';
    });

    const question = normalizeQuestion(rawObj, r);
    if (question.question) {
      questions.push(question);
    }
  }

  if (questions.length === 0) {
    throw new Error('유효한 문제가 포함되어 있지 않습니다. 문제(question) 열을 확인하세요.');
  }

  return questions;
}

/**
 * JSON 텍스트 또는 객체를 문제 목록 배열로 파싱
 */
function parseJSONQuestions(jsonData) {
  let list;
  if (typeof jsonData === 'string') {
    try {
      list = JSON.parse(jsonData);
    } catch (err) {
      throw new Error(`JSON 문법 오류: ${err.message}`);
    }
  } else {
    list = jsonData;
  }

  // 최상위가 questions, data, items 프로퍼티를 가진 객체인 경우 지원
  if (list && !Array.isArray(list)) {
    if (Array.isArray(list.questions)) {
      list = list.questions;
    } else if (Array.isArray(list.data)) {
      list = list.data;
    } else if (Array.isArray(list.items)) {
      list = list.items;
    }
  }

  if (!Array.isArray(list)) {
    throw new Error('JSON 데이터는 문제 객체들의 배열(Array) 형태이어야 합니다.');
  }

  const questions = [];
  list.forEach((item, index) => {
    if (item && typeof item === 'object') {
      const q = normalizeQuestion(item, index + 1);
      if (q.question) {
        questions.push(q);
      }
    }
  });

  if (questions.length === 0) {
    throw new Error('유효한 문제가 포함되어 있지 않습니다.');
  }

  return questions;
}

/**
 * 파일 확장자나 내용에 따라 자동으로 CSV/JSON 판단하여 파싱
 */
function parseAuto(content, filename = '') {
  const trimmed = (content || '').trim();
  const lowerName = filename.toLowerCase();

  if (lowerName.endsWith('.json') || trimmed.startsWith('[') || trimmed.startsWith('{')) {
    try {
      return parseJSONQuestions(trimmed);
    } catch (e) {
      if (lowerName.endsWith('.json')) throw e;
    }
  }

  return parseCSVQuestions(trimmed);
}

/**
 * 문제 목록을 사람이 읽기 편한 구조화된 텍스트(TXT) 문서로 변환
 * @param {Array<Object>} questions 변환할 문제 객체 배열
 * @param {string} title 문서 헤더 제목
 * @param {Object} options 부가 설정 (예: 고정 일시 등)
 * @returns {string} 서식화된 TXT 문자열
 */
function formatQuestionsAsText(questions, title = '출제 문제 기록', options = {}) {
  const dateObj = options.date || new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const timestampStr = options.timestampStr || `${dateObj.getFullYear()}-${pad(dateObj.getMonth() + 1)}-${pad(dateObj.getDate())} ${pad(dateObj.getHours())}:${pad(dateObj.getMinutes())}:${pad(dateObj.getSeconds())}`;

  let output = '';
  output += '================================================================================\n';
  output += `[랜덤 문제 추출기] ${title}\n`;
  output += `저장 일시: ${timestampStr}\n`;
  output += `총 출제 문항 수: ${Array.isArray(questions) ? questions.length : 0}문항\n`;
  output += '================================================================================\n\n';

  if (!Array.isArray(questions) || questions.length === 0) {
    output += '(출제된 문제 내역이 없습니다.)\n';
    return output;
  }

  questions.forEach((q, idx) => {
    const tags = [
      q.exam ? `자격증/시험: ${q.exam}` : '',
      q.subject ? `관련 영역: ${q.subject}` : '',
      q.type ? `유형: ${q.type}` : '',
      q.difficulty ? `난이도: ${q.difficulty}` : ''
    ].filter(Boolean).join(' | ');

    output += `[문항 ${idx + 1}]`;
    if (tags) output += ` (${tags})`;
    output += '\n';
    output += `제목: ${q.title || '무제'} (ID: ${q.id || idx + 1})\n`;
    output += `문제:\n${q.question || ''}\n\n`;

    if (Array.isArray(q.options) && q.options.length > 0) {
      output += '보기:\n';
      q.options.forEach((opt, optIdx) => {
        output += `  ${optIdx + 1}) ${opt}\n`;
      });
      output += '\n';
    }

    output += `정답 / 모범답안:\n${q.answer || '(등록된 정답 또는 모범답안 없음)'}\n\n`;

    if (q.explanation) {
      output += `해설 / 풀이:\n${q.explanation}\n\n`;
    }

    output += '--------------------------------------------------------------------------------\n\n';
  });

  return output;
}

// 브라우저 및 Node.js 겸용 내보내기
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    parseCSVToRows,
    normalizeKeyName,
    findCanonicalKey,
    normalizeQuestion,
    parseCSVQuestions,
    parseJSONQuestions,
    parseAuto,
    formatQuestionsAsText,
    KEY_ALIASES
  };
} else if (typeof window !== 'undefined') {
  window.QuizParser = {
    parseCSVToRows,
    normalizeKeyName,
    findCanonicalKey,
    normalizeQuestion,
    parseCSVQuestions,
    parseJSONQuestions,
    parseAuto,
    formatQuestionsAsText,
    KEY_ALIASES
  };
}
