/**
 * app.js
 * 랜덤 문제 추출기 메인 애플리케이션 DOM 컨트롤러
 */

// 내장 기본 백업 샘플 (file:// 로컬 프로토콜에서 fetch 차단 시 즉각 동작 보장)
const EMBEDDED_SAMPLE_DATA = [
  {
    id: "excel-01",
    exam: "컴퓨터활용능력 2급",
    subject: "스프레드시트",
    type: "수식 작성",
    difficulty: "기초",
    title: "조건에 맞는 합계 구하기",
    question: "A1:D8은 제목행을 포함한 직원 표입니다. D열은 근태점수이며 B1:B2에는 '직위', '과장'이 입력되어 있습니다. 조건에 맞는 근태점수 합계를 구하는 데이터베이스 함수를 작성하세요. 필드는 열 번호 4로 지정합니다.",
    options: [
      "=DSUM(A1:D8, 4, B1:B2)",
      "=SUMIF(B1:B2, \"과장\", D1:D8)",
      "=DAVERAGE(A1:D8, 4, B1:B2)",
      "=SUM(A1:D8, 4)"
    ],
    answer: "=DSUM(A1:D8, 4, B1:B2)",
    explanation: "DSUM 함수는 지정한 조건에 맞는 레코드의 합계를 계산합니다. 형식은 DSUM(데이터범위, 열번호, 조건범위)입니다."
  },
  {
    id: "excel-02",
    exam: "컴퓨터활용능력 2급",
    subject: "스프레드시트",
    type: "계산형",
    difficulty: "기초",
    title: "숫자가 입력된 셀 개수 세기",
    question: "A1:A6 범위에 10, '서울', 빈 셀, 20, '부산', 30이 입력되어 있습니다. =COUNT(A1:A6) 수식의 실행 결과는 얼마인가요?",
    options: ["2", "3", "5", "6"],
    answer: "3",
    explanation: "COUNT 함수는 범위 내에서 숫자가 들어있는 셀의 개수만 셉니다. 10, 20, 30 총 3개입니다."
  },
  {
    id: "excel-03",
    exam: "컴퓨터활용능력 2급",
    subject: "스프레드시트",
    type: "수식 작성",
    difficulty: "보통",
    title: "평균 및 반올림 함수 조합",
    question: "B2:B5의 평균값을 구한 뒤 소수점 둘째 자리까지 반올림하여 표시하는 수식을 작성하세요.",
    options: [
      "=ROUND(AVERAGE(B2:B5), 2)",
      "=AVERAGE(ROUND(B2:B5, 2))",
      "=ROUNDUP(AVERAGE(B2:B5), 2)",
      "=TRUNC(AVERAGE(B2:B5), 2)"
    ],
    answer: "=ROUND(AVERAGE(B2:B5), 2)",
    explanation: "AVERAGE로 평균을 구한 후 ROUND 함수의 자릿수 인수로 2를 지정하여 소수 둘째 자리까지 표시합니다."
  },
  {
    id: "info-01",
    exam: "정보처리기사",
    subject: "데이터베이스",
    type: "SQL 작성",
    difficulty: "기초",
    title: "전체 테이블 조회 SQL",
    question: "employees 테이블의 모든 열과 모든 행을 조회하는 표준 SQL 문을 작성하세요.",
    options: [
      "SELECT * FROM employees;",
      "SHOW * FROM employees;",
      "GET ALL FROM employees;",
      "FIND * IN employees;"
    ],
    answer: "SELECT * FROM employees;",
    explanation: "SELECT 절에 와일드카드(*)를 지정하고 FROM 절에 대상 테이블명을 지정합니다."
  },
  {
    id: "info-02",
    exam: "정보처리기사",
    subject: "데이터베이스",
    type: "단답형",
    difficulty: "기초",
    title: "트랜잭션 ACID 특성",
    question: "트랜잭션의 모든 연산이 완전히 수행되거나 전혀 수행되지 않아야 한다는 성질(All or Nothing)을 무엇이라 하는가?",
    options: [
      "원자성(Atomicity)",
      "일관성(Consistency)",
      "격리성(Isolation)",
      "영속성(Durability)"
    ],
    answer: "원자성(Atomicity)",
    explanation: "원자성(Atomicity)은 트랜잭션을 더 이상 분할할 수 없는 하나의 논리적 단위로 처리하는 특성입니다."
  },
  {
    id: "info-03",
    exam: "정보처리기사",
    subject: "데이터베이스",
    type: "단답형",
    difficulty: "보통",
    title: "중복 제거 키워드",
    question: "SELECT 질의 결과에서 중복된 행을 제거하고 유일한 레코드만 조회할 때 사용하는 SQL 키워드는 무엇인가?",
    options: ["DISTINCT", "UNIQUE", "GROUP BY", "LIMIT"],
    answer: "DISTINCT",
    explanation: "SELECT DISTINCT 컬럼명 FROM 테이블 형식으로 사용합니다."
  },
  {
    id: "elec-01",
    exam: "전기기사",
    subject: "전기설비 계산",
    type: "계산형",
    difficulty: "기초",
    title: "단상 부하의 유효전력",
    question: "단상 교류 회로에서 전압 220V, 전류 10A, 역률이 0.8일 때 유효전력(W)은 얼마인가?",
    options: ["1760W", "2200W", "1320W", "2750W"],
    answer: "1760W",
    explanation: "단상 유효전력 P = V * I * cosθ = 220 * 10 * 0.8 = 1760W 입니다."
  },
  {
    id: "history-01",
    exam: "한국사능력검정",
    subject: "근현대사",
    type: "객관식",
    difficulty: "기초",
    title: "3·1 운동의 연도",
    question: "일제 강점기 비폭력 만세 운동이자 대한민국 임시정부 수립의 도화선이 된 3·1 운동이 일어난 해는?",
    options: ["1919년", "1910년", "1926년", "1945년"],
    answer: "1919년",
    explanation: "3·1 만세 운동은 1919년 3월 1일 고종 황제의 인산일을 기해 전국적으로 일어났습니다."
  }
];

document.addEventListener('DOMContentLoaded', () => {
  // 인스턴스 초기화
  const engine = new QuizEngine();
  let currentMode = 'single'; // 'single' 또는 'multi'
  let latestPickedResult = null;

  // DOM 요소 참조
  const themeToggleBtn = document.getElementById('theme-toggle-btn');
  const themeIcon = document.getElementById('theme-icon');
  const btnLoadSample = document.getElementById('btn-load-sample');
  const btnHeaderSample = document.getElementById('btn-header-sample');
  const btnHeaderReset = document.getElementById('btn-header-reset');
  const btnResetData = document.getElementById('btn-reset-data');
  const dropzone = document.getElementById('dropzone');
  const fileInput = document.getElementById('file-input');
  const dataBadge = document.getElementById('data-badge');
  const fileInfoText = document.getElementById('file-info-text');
  const btnGoogleDrive = document.getElementById('btn-google-drive');
  const btnGoogleSettings = document.getElementById('btn-google-settings');
  const googleDriveModal = document.getElementById('google-drive-modal');
  const btnCloseGoogleModal = document.getElementById('btn-close-google-modal');
  const btnSaveGoogleConfig = document.getElementById('btn-save-google-config');
  const btnClearGoogleConfig = document.getElementById('btn-clear-google-config');
  const inputGoogleClientId = document.getElementById('input-google-client-id');
  const inputGoogleApiKey = document.getElementById('input-google-api-key');

  const filterExam = document.getElementById('filter-exam');
  const filterSubject = document.getElementById('filter-subject');
  const filterType = document.getElementById('filter-type');
  const filterDifficulty = document.getElementById('filter-difficulty');
  const filterKeyword = document.getElementById('filter-keyword');
  const btnResetFilters = document.getElementById('btn-reset-filters');
  const matchedCountEl = document.getElementById('matched-count');
  const totalCountEl = document.getElementById('total-count');

  const modeSingleBtn = document.getElementById('mode-single-btn');
  const modeMultiBtn = document.getElementById('mode-multi-btn');
  const multiCountWrapper = document.getElementById('multi-count-wrapper');
  const countSelect = document.getElementById('count-select');
  const checkExcludeSeen = document.getElementById('check-exclude-seen');
  const btnResetSeen = document.getElementById('btn-reset-seen');
  const seenCountEl = document.getElementById('seen-count');
  const btnExportHistoryTxt = document.getElementById('btn-export-history-txt');
  const historyExportCountEl = document.getElementById('history-export-count');
  const historyStorageBadge = document.getElementById('history-storage-badge');
  const historyFileLabelEl = document.getElementById('history-file-label');
  const historyFileCountEl = document.getElementById('history-file-count');
  const btnPickRandom = document.getElementById('btn-pick-random');

  // 현재 세션에서 출제된 문제 목록 (수동 TXT 다운로드용, 조건과 무관하게 누적)
  const questionHistory = [];

  // ==========================================================================
  // 조건별 출제 이력 (history/ 폴더 또는 LocalStorage)
  // 이력 키 = 문제 파일 + 자격증 + 영역 + 유형 + 난이도 (검색어는 제외)
  // ==========================================================================
  const HISTORY_KEY_FIELDS = ['exam', 'subject', 'type', 'difficulty'];
  const LOCAL_STORAGE_HISTORY_PREFIX = 'quiz_picker_seen::';
  const LEGACY_STORAGE_KEYS = ['quiz_picker_seen_ids', 'quiz_picker_history_questions'];

  let currentSourceId = null;      // 업로드 파일명 등 이력 분류용 원본 식별자
  let serverAvailable = null;      // null: 미확인, true/false: 확인됨
  let activeHistoryKeyStr = null;  // 현재 엔진에 적재된 이력 키
  let historyLoadToken = 0;        // 늦게 도착한 응답 무시용
  let historyReady = Promise.resolve();

  // 단일 history.txt 시절의 브라우저 저장값 정리
  LEGACY_STORAGE_KEYS.forEach(k => {
    try { localStorage.removeItem(k); } catch (e) { /* 무시 */ }
  });

  function getHistoryKey() {
    const filters = getActiveFilters();
    const key = { source: currentSourceId };
    HISTORY_KEY_FIELDS.forEach(field => { key[field] = filters[field] || 'ALL'; });
    return key;
  }

  function historyKeyToQuery(key) {
    const params = new URLSearchParams();
    params.set('source', key.source);
    HISTORY_KEY_FIELDS.forEach(field => params.set(field, key[field]));
    return params.toString();
  }

  function localStorageKeyFor(key) {
    return LOCAL_STORAGE_HISTORY_PREFIX + JSON.stringify(key);
  }

  function readLocalSeenIds(key) {
    try {
      const ids = JSON.parse(localStorage.getItem(localStorageKeyFor(key)) || '[]');
      return Array.isArray(ids) ? ids : [];
    } catch (e) {
      return [];
    }
  }

  function writeLocalSeenIds(key, ids) {
    try {
      localStorage.setItem(localStorageKeyFor(key), JSON.stringify(Array.from(ids)));
    } catch (e) {
      console.warn('LocalStorage 저장 실패:', e);
    }
  }

  function updateHistoryBadge(fileName, count) {
    if (!historyStorageBadge) return;
    historyStorageBadge.style.display = 'inline-flex';
    const label = serverAvailable ? `📁 history/${fileName}` : '💾 브라우저 저장';
    if (historyFileLabelEl) historyFileLabelEl.textContent = label;
    if (historyFileCountEl) historyFileCountEl.textContent = count;
    historyStorageBadge.title = serverAvailable
      ? `현재 조건의 출제 이력 파일: history/${fileName}`
      : '로컬 서버 미실행: 브라우저 저장소에 조건별로 보관됩니다.';
  }

  async function fetchSeenIds(key) {
    if (serverAvailable !== false) {
      try {
        const res = await fetch(`/api/history?${historyKeyToQuery(key)}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (!data.success) throw new Error(data.message || '이력 조회 실패');
        serverAvailable = true;
        return { seenIds: data.seenIds || [], fileName: data.fileName };
      } catch (err) {
        console.warn('조건별 이력 서버 조회 실패, 브라우저 저장소로 전환:', err);
        serverAvailable = false;
      }
    }
    return { seenIds: readLocalSeenIds(key), fileName: null };
  }

  /**
   * 현재 문제 파일/필터 조건에 맞는 이력으로 중복 제외 목록을 교체
   */
  function switchHistoryContext() {
    if (!currentSourceId) {
      activeHistoryKeyStr = null;
      engine.resetSeen();
      updateSeenStatus();
      if (historyStorageBadge) historyStorageBadge.style.display = 'none';
      historyReady = Promise.resolve();
      return historyReady;
    }

    const key = getHistoryKey();
    const keyStr = JSON.stringify(key);
    if (keyStr === activeHistoryKeyStr) return historyReady;

    activeHistoryKeyStr = keyStr;
    const token = ++historyLoadToken;
    engine.resetSeen();
    updateSeenStatus();

    historyReady = fetchSeenIds(key).then(({ seenIds, fileName }) => {
      if (token !== historyLoadToken) return; // 그 사이 조건이 바뀐 경우 무시
      seenIds.forEach(id => engine.seenQuestionIds.add(id));
      updateSeenStatus();
      updateHistoryBadge(fileName, seenIds.length);
    });
    return historyReady;
  }

  async function persistPickedQuestions(key, questions, resetBeforeAppend) {
    // 브라우저 저장소에는 항상 같은 키로 보관 (서버 장애 대비)
    const localIds = resetBeforeAppend ? new Set() : new Set(readLocalSeenIds(key));
    questions.forEach(q => localIds.add(q.id));
    writeLocalSeenIds(key, localIds);

    if (!serverAvailable) {
      if (JSON.stringify(key) === activeHistoryKeyStr) updateHistoryBadge(null, localIds.size);
      return;
    }

    try {
      const res = await fetch('/api/history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, questions, resetBeforeAppend })
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || `HTTP ${res.status}`);
      if (JSON.stringify(key) === activeHistoryKeyStr) updateHistoryBadge(data.fileName, data.count);
    } catch (err) {
      console.warn('조건별 이력 파일 저장 실패:', err);
      showToast('이력 파일 저장에 실패했습니다. 브라우저 저장소에는 보관되었습니다.', 'error');
    }
  }

  async function clearHistoryForKey(key) {
    try { localStorage.removeItem(localStorageKeyFor(key)); } catch (e) { /* 무시 */ }
    if (!serverAvailable) {
      updateHistoryBadge(null, 0);
      return;
    }
    try {
      const res = await fetch(`/api/history?${historyKeyToQuery(key)}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || `HTTP ${res.status}`);
      updateHistoryBadge(data.fileName, 0);
    } catch (err) {
      console.warn('조건별 이력 초기화 실패:', err);
      showToast('이력 파일 초기화에 실패했습니다.', 'error');
    }
  }

  const resultsContainer = document.getElementById('results-container');
  const toastContainer = document.getElementById('toast-container');

  // ==========================================================================
  // 토스트 메시지 함수
  // ==========================================================================
  function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    const icon = type === 'success' ? '✓' : type === 'error' ? '⚠' : 'ℹ';
    toast.innerHTML = `<span>${icon}</span><span>${message}</span>`;
    toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(20px)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 3200);
  }

  // ==========================================================================
  // 테마 관리 (다크 / 라이트)
  // ==========================================================================
  function initTheme() {
    const savedTheme = localStorage.getItem('quiz_picker_theme') || 'dark';
    setTheme(savedTheme);
  }

  function setTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    themeIcon.textContent = theme === 'dark' ? '🌙' : '☀️';
    localStorage.setItem('quiz_picker_theme', theme);
  }

  themeToggleBtn.addEventListener('click', () => {
    const currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
  });

  // ==========================================================================
  // 데이터 로드 및 필터 갱신
  // ==========================================================================
  function loadQuestions(questions, sourceName = '데이터', sourceId = sourceName) {
    engine.setQuestions(questions);
    currentSourceId = sourceId;
    activeHistoryKeyStr = null;

    // 뱃지 상태 업데이트
    dataBadge.className = 'data-status-badge';
    dataBadge.innerHTML = `<span>● ${escapeHtml(sourceName)} (${engine.totalCount}문제)</span>`;
    fileInfoText.textContent = `현재 등록된 문제: 총 ${engine.totalCount}개`;

    // 필터 옵션 채우기
    populateFilters();
    updateMatchedCount();
    switchHistoryContext();

    showToast(`${escapeHtml(sourceName)} ${engine.totalCount}문제를 성공적으로 불러왔습니다.`, 'success');
  }

  function populateFilters() {
    const options = engine.getFilterOptions();

    // 현재 선택값 보존
    const prevExam = filterExam.value;
    const prevSubject = filterSubject.value;
    const prevType = filterType ? filterType.value : 'ALL';
    const prevDiff = filterDifficulty.value;

    // 자격증 선택상자
    filterExam.innerHTML = '<option value="ALL">전체 자격증 / 시험</option>' +
      options.exams.map(e => `<option value="${escapeHtml(e)}">${escapeHtml(e)}</option>`).join('');

    // 과목 / 관련 영역 선택상자
    filterSubject.innerHTML = '<option value="ALL">전체 영역 / 과목</option>' +
      options.subjects.map(s => `<option value="${escapeHtml(s)}">${escapeHtml(s)}</option>`).join('');

    // 유형 선택상자
    if (filterType) {
      filterType.innerHTML = '<option value="ALL">전체 유형</option>' +
        options.types.map(t => `<option value="${escapeHtml(t)}">${escapeHtml(t)}</option>`).join('');
    }

    // 난이도 선택상자
    filterDifficulty.innerHTML = '<option value="ALL">전체 난이도</option>' +
      options.difficulties.map(d => `<option value="${escapeHtml(d)}">${escapeHtml(d)}</option>`).join('');

    // 이전 값 복원
    if (options.exams.includes(prevExam)) filterExam.value = prevExam;
    if (options.subjects.includes(prevSubject)) filterSubject.value = prevSubject;
    if (filterType && options.types.includes(prevType)) filterType.value = prevType;
    if (options.difficulties.includes(prevDiff)) filterDifficulty.value = prevDiff;
  }

  function getActiveFilters() {
    return {
      exam: filterExam.value,
      subject: filterSubject.value,
      type: filterType ? filterType.value : 'ALL',
      difficulty: filterDifficulty.value,
      keyword: filterKeyword.value
    };
  }

  function updateMatchedCount() {
    const filtered = engine.filterQuestions(getActiveFilters());
    matchedCountEl.textContent = filtered.length;
    totalCountEl.textContent = engine.totalCount;
  }

  function updateSeenStatus() {
    seenCountEl.textContent = engine.seenCount;
    btnResetSeen.style.display = engine.seenCount > 0 ? 'inline-flex' : 'none';
  }

  function updateHistoryStatus() {
    if (historyExportCountEl) {
      historyExportCountEl.textContent = questionHistory.length;
    }
    if (btnExportHistoryTxt) {
      btnExportHistoryTxt.style.display = questionHistory.length > 0 ? 'inline-flex' : 'none';
    }
  }

  // ==========================================================================
  // 출제 문제 TXT 파일 포맷 및 다운로드 함수
  // ==========================================================================
  function formatQuestionsAsText(questions, title = '출제 문제 기록') {
    if (window.QuizParser && typeof window.QuizParser.formatQuestionsAsText === 'function') {
      return window.QuizParser.formatQuestionsAsText(questions, title);
    }

    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const timestampStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;

    let output = '';
    output += '================================================================================\n';
    output += `[랜덤 문제 추출기] ${title}\n`;
    output += `저장 일시: ${timestampStr}\n`;
    output += `총 출제 문항 수: ${questions.length}문항\n`;
    output += '================================================================================\n\n';

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
      output += `제목: ${q.title} (ID: ${q.id})\n`;
      output += `문제:\n${q.question}\n\n`;

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

  function downloadQuestionsAsTxt(questions, filenamePrefix = '출제문제_기록') {
    if (!questions || questions.length === 0) {
      showToast('저장할 출제 문제 내역이 없습니다.', 'error');
      return;
    }

    const textContent = formatQuestionsAsText(questions, filenamePrefix === '시험지_문제목록' ? '시험지 문제 목록' : '출제 문제 누적 이력');
    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const dateStr = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
    const filename = `${filenamePrefix}_${dateStr}.txt`;

    const blob = new Blob([textContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    showToast(`${questions.length}개의 문제가 ${filename} 파일로 저장되었습니다.`, 'success');
  }

  // 필터 변경 이벤트: 조건이 바뀌면 해당 조건의 이력 파일로 전환
  const filterElements = [filterExam, filterSubject, filterType, filterDifficulty].filter(Boolean);
  filterElements.forEach(el => {
    el.addEventListener('change', () => {
      updateMatchedCount();
      switchHistoryContext();
    });
  });
  filterKeyword.addEventListener('input', updateMatchedCount);

  btnResetFilters.addEventListener('click', () => {
    filterExam.value = 'ALL';
    filterSubject.value = 'ALL';
    if (filterType) filterType.value = 'ALL';
    filterDifficulty.value = 'ALL';
    filterKeyword.value = '';
    updateMatchedCount();
    switchHistoryContext();
    showToast('필터 조건이 초기화되었습니다.', 'info');
  });

  // ==========================================================================
  // 빈 상태 렌더링 및 전체 초기화 함수
  // ==========================================================================
  function renderEmptyState(message = '상단의 조건을 선택한 후 <strong>\'무작위 문제 가져오기\'</strong> 버튼을 클릭하세요.') {
    resultsContainer.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">💡</div>
        <h3 class="empty-state-title">문제를 가져올 준비가 되었습니다</h3>
        <p>${message}</p>
      </div>
    `;
  }

  function resetAll() {
    engine.setQuestions([]);
    questionHistory.length = 0;
    dataBadge.className = 'data-status-badge empty';
    dataBadge.innerHTML = '<span>데이터 미등록</span>';
    fileInfoText.textContent = '준비된 파일이 없으신가요? 샘플 문제를 불러와 즉시 체험해보세요.';
    fileInput.value = '';

    filterExam.innerHTML = '<option value="ALL">전체 자격증 / 시험</option>';
    filterSubject.innerHTML = '<option value="ALL">전체 영역 / 과목</option>';
    if (filterType) filterType.innerHTML = '<option value="ALL">전체 유형</option>';
    filterDifficulty.innerHTML = '<option value="ALL">전체 난이도</option>';
    filterKeyword.value = '';

    matchedCountEl.textContent = '0';
    totalCountEl.textContent = '0';

    // 메모리 상태만 초기화하고 history/ 폴더의 조건별 기록은 보존한다.
    currentSourceId = null;
    switchHistoryContext();
    updateHistoryStatus();

    renderEmptyState('데이터를 업로드하거나 <strong>\'샘플 불러오기\'</strong>를 클릭하세요.');
    showToast('화면과 데이터가 초기화되었습니다. (history 폴더의 조건별 기록은 보존됩니다)', 'info');
  }

  if (btnHeaderReset) btnHeaderReset.addEventListener('click', resetAll);
  if (btnResetData) btnResetData.addEventListener('click', resetAll);
  if (btnExportHistoryTxt) {
    btnExportHistoryTxt.addEventListener('click', () => {
      downloadQuestionsAsTxt(questionHistory, '출제문제_누적이력');
    });
  }

  // ==========================================================================
  // 파일 업로드 및 샘플 로드 처리
  // ==========================================================================
  async function fetchSampleQuestions() {
    try {
      const res = await fetch('data/sample-questions.json');
      if (!res.ok) throw new Error('파일 응답 실패');
      const data = await res.json();
      const questions = QuizParser.parseJSONQuestions(data);
      loadQuestions(questions, '표준 샘플 문제셋', 'sample-questions.json');
    } catch (err) {
      // 로컬 파일 시스템(file://) 등에서 fetch 불가 시 내장 백업 데이터 즉시 로드
      console.warn('Fetch 실패, 내장 샘플 데이터로 전환:', err);
      const parsed = QuizParser.parseJSONQuestions(EMBEDDED_SAMPLE_DATA);
      loadQuestions(parsed, '내장 샘플 문제셋', 'sample-questions.json');
    }
  }

  btnLoadSample.addEventListener('click', fetchSampleQuestions);
  btnHeaderSample.addEventListener('click', fetchSampleQuestions);

  // 드롭존 클릭 시 파일 선택창 열기
  dropzone.addEventListener('click', () => fileInput.click());
  dropzone.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      fileInput.click();
    }
  });

  // 드래그 앤 드롭 이벤트
  dropzone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropzone.classList.add('dragover');
  });

  dropzone.addEventListener('dragleave', () => {
    dropzone.classList.remove('dragover');
  });

  dropzone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropzone.classList.remove('dragover');
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleUploadedFiles(Array.from(e.dataTransfer.files));
    }
  });

  fileInput.addEventListener('change', (e) => {
    if (e.target.files && e.target.files.length > 0) {
      handleUploadedFiles(Array.from(e.target.files));
      fileInput.value = ''; // 동일 파일 재선택 허용
    }
  });

  async function handleUploadedFiles(files) {
    if (!files || files.length === 0) return;

    if (files.length === 1) {
      showToast(`"${files[0].name}" 파일을 읽는 중...`, 'info');
    } else {
      showToast(`${files.length}개 파일을 읽어 병합하는 중...`, 'info');
    }

    const readPromises = files.map((file) => {
      return new Promise((resolve) => {
        const lowerName = file.name.toLowerCase();
        const isExcel = lowerName.endsWith('.xlsx') || lowerName.endsWith('.xls');
        const reader = new FileReader();

        reader.onload = (event) => {
          try {
            const data = event.target.result;
            const questions = QuizParser.parseAuto(data, file.name);
            if (!Array.isArray(questions) || questions.length === 0) {
              resolve({ success: false, fileName: file.name, error: '유효한 문제 데이터가 없습니다.' });
            } else {
              resolve({ success: true, fileName: file.name, questions });
            }
          } catch (err) {
            resolve({ success: false, fileName: file.name, error: err.message });
          }
        };

        reader.onerror = () => {
          resolve({ success: false, fileName: file.name, error: '파일 읽기 오류' });
        };

        if (isExcel) {
          reader.readAsArrayBuffer(file);
        } else {
          reader.readAsText(file, 'UTF-8');
        }
      });
    });

    const results = await Promise.all(readPromises);
    const successful = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);

    if (failed.length > 0) {
      const failedMsg = failed.map(f => `"${f.fileName}" (${f.error})`).join(', ');
      if (successful.length === 0) {
        showToast(`파일 불러오기 실패: ${failedMsg}`, 'error');
        return;
      } else {
        showToast(`일부 파일 제외됨: ${failedMsg}`, 'warning');
      }
    }

    if (successful.length === 0) return;

    // 문제 데이터 병합 및 고유 식별자(ID) 보장
    const isMultiple = successful.length > 1;
    const mergedQuestions = [];
    const fileNames = successful.map(s => s.fileName);

    successful.forEach((item, fileIdx) => {
      item.questions.forEach((q, qIdx) => {
        const rawId = q.id !== undefined && q.id !== null && String(q.id).trim() ? String(q.id).trim() : `${qIdx + 1}`;
        const uniqueId = isMultiple ? `${item.fileName}__${rawId}` : rawId;
        mergedQuestions.push({
          ...q,
          id: uniqueId,
          _sourceFile: item.fileName
        });
      });
    });

    const sourceName = isMultiple
      ? `${fileNames.length}개 파일 (${fileNames.slice(0, 2).join(', ')}${fileNames.length > 2 ? ' 외 ' + (fileNames.length - 2) + '개' : ''})`
      : `업로드 파일 (${fileNames[0]})`;

    const sourceId = isMultiple
      ? `다중파일_${fileNames.length}개_${fileNames[0].replace(/\.[^/.]+$/, '')}`
      : fileNames[0];

    loadQuestions(mergedQuestions, sourceName, sourceId);
  }

  // ==========================================================================
  // Google Drive & Google Picker 연동
  // ==========================================================================
  const GOOGLE_CLIENT_ID_KEY = 'quiz_picker_google_client_id';
  const GOOGLE_API_KEY_KEY = 'quiz_picker_google_api_key';
  const GOOGLE_SCOPE = 'https://www.googleapis.com/auth/drive.readonly';

  let tokenClient = null;
  let pickerApiLoaded = false;
  let currentGoogleAccessToken = null;

  // 서버 환경변수에서 설정 조회 (로컬 서버 연동 시 기본값으로 지원)
  async function checkServerGoogleConfig() {
    try {
      const res = await fetch('/api/google-config');
      if (!res.ok) return;
      const data = await res.json();
      if (data.clientId && !localStorage.getItem(GOOGLE_CLIENT_ID_KEY)) {
        localStorage.setItem(GOOGLE_CLIENT_ID_KEY, data.clientId);
      }
      if (data.apiKey && !localStorage.getItem(GOOGLE_API_KEY_KEY)) {
        localStorage.setItem(GOOGLE_API_KEY_KEY, data.apiKey);
      }
    } catch (e) {
      // 서버 미실행 또는 네트워크 오류 시 무시
    }
  }

  function getGoogleConfig() {
    const clientId = (localStorage.getItem(GOOGLE_CLIENT_ID_KEY) || '').trim();
    const apiKey = (localStorage.getItem(GOOGLE_API_KEY_KEY) || '').trim();
    return { clientId, apiKey };
  }

  function openGoogleModal() {
    if (!googleDriveModal) return;
    const { clientId, apiKey } = getGoogleConfig();
    if (inputGoogleClientId) inputGoogleClientId.value = clientId;
    if (inputGoogleApiKey) inputGoogleApiKey.value = apiKey;
    googleDriveModal.style.display = 'flex';
  }

  function closeGoogleModal() {
    if (!googleDriveModal) return;
    googleDriveModal.style.display = 'none';
  }

  // ESC 키로 모달 닫기 (접근성 보장)
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && googleDriveModal && googleDriveModal.style.display === 'flex') {
      closeGoogleModal();
    }
  });

  if (btnCloseGoogleModal) {
    btnCloseGoogleModal.addEventListener('click', closeGoogleModal);
  }
  if (googleDriveModal) {
    googleDriveModal.addEventListener('click', (e) => {
      if (e.target === googleDriveModal) closeGoogleModal();
    });
  }

  if (btnGoogleSettings) {
    btnGoogleSettings.addEventListener('click', openGoogleModal);
  }

  if (btnSaveGoogleConfig) {
    btnSaveGoogleConfig.addEventListener('click', () => {
      const clientId = (inputGoogleClientId?.value || '').trim();
      const apiKey = (inputGoogleApiKey?.value || '').trim();
      if (!clientId || !apiKey) {
        showToast('Google OAuth Client ID와 API Key를 모두 입력해주세요.', 'error');
        return;
      }
      localStorage.setItem(GOOGLE_CLIENT_ID_KEY, clientId);
      localStorage.setItem(GOOGLE_API_KEY_KEY, apiKey);
      tokenClient = null;
      closeGoogleModal();
      showToast('Google Drive 연동 정보가 브라우저에 저장되었습니다.', 'success');
    });
  }

  if (btnClearGoogleConfig) {
    btnClearGoogleConfig.addEventListener('click', () => {
      localStorage.removeItem(GOOGLE_CLIENT_ID_KEY);
      localStorage.removeItem(GOOGLE_API_KEY_KEY);
      if (inputGoogleClientId) inputGoogleClientId.value = '';
      if (inputGoogleApiKey) inputGoogleApiKey.value = '';
      tokenClient = null;
      currentGoogleAccessToken = null;
      showToast('Google Drive 연동 설정이 초기화되었습니다.', 'info');
    });
  }

  const btnClearGoogleToken = document.getElementById('btn-clear-google-token');
  if (btnClearGoogleToken) {
    btnClearGoogleToken.addEventListener('click', async () => {
      currentGoogleAccessToken = null;
      closeGoogleModal();
      const { clientId } = getGoogleConfig();
      if (!clientId) {
        showToast('먼저 Client ID를 설정해주세요.', 'warning');
        openGoogleModal();
        return;
      }
      showToast('Google 계정 선택 창을 엽니다...', 'info');
      try {
        await loadPickerApi();
        if (!tokenClient) tokenClient = await initGisClient(clientId);
        tokenClient.requestAccessToken({ prompt: 'select_account' });
      } catch (err) {
        showToast(`계정 전환 오류: ${err.message}`, 'error');
      }
    });
  }

  // 비동기 스크립트 로드 대기 헬퍼 (async defer 대응)
  function waitForGlobal(name, timeoutMs = 4000) {
    return new Promise((resolve, reject) => {
      const start = Date.now();
      const check = () => {
        if (window[name] !== undefined) return resolve(window[name]);
        if (Date.now() - start >= timeoutMs) {
          return reject(new Error(`Google SDK(${name}) 로딩 시간 초과. 네트워크 또는 광고 차단 확장프로그램을 확인해주세요.`));
        }
        setTimeout(check, 100);
      };
      check();
    });
  }

  // Google Picker API 로드
  async function loadPickerApi() {
    if (pickerApiLoaded) return;
    const gapi = await waitForGlobal('gapi');
    return new Promise((resolve, reject) => {
      gapi.load('picker', {
        callback: () => {
          pickerApiLoaded = true;
          resolve();
        },
        onerror: () => reject(new Error('Google Picker 라이브러리 로드에 실패했습니다.'))
      });
    });
  }

  // Google Identity Services (GIS) 토큰 클라이언트 초기화
  async function initGisClient(clientId) {
    const google = await waitForGlobal('google');
    if (!google.accounts || !google.accounts.oauth2) {
      throw new Error('Google Identity Services SDK(google.accounts.oauth2)를 불러올 수 없습니다.');
    }
    return google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: GOOGLE_SCOPE,
      callback: (tokenResponse) => {
        if (tokenResponse.error !== undefined) {
          showToast(`Google 인증 오류: ${tokenResponse.error_description || tokenResponse.error}`, 'error');
          return;
        }
        currentGoogleAccessToken = tokenResponse.access_token;
        createAndShowPicker(currentGoogleAccessToken);
      },
      error_callback: (err) => {
        console.warn('Google Identity 토큰 요청 에러:', err);
        const msg = err?.message || err?.type || '로그인 창이 닫혔거나 팝업이 차단되었습니다.';
        showToast(`Google 계정 접근 오류: ${msg}`, 'error');
      }
    });
  }

  // Google Drive 파일 선택창 열기
  async function handleGoogleDrivePicker() {
    const { clientId, apiKey } = getGoogleConfig();
    if (!clientId || !apiKey) {
      showToast('Google Drive를 연동하려면 먼저 Client ID와 API Key 설정이 필요합니다.', 'info');
      openGoogleModal();
      return;
    }

    try {
      await loadPickerApi();
      if (!tokenClient) {
        tokenClient = await initGisClient(clientId);
      }

      if (currentGoogleAccessToken) {
        createAndShowPicker(currentGoogleAccessToken);
      } else {
        tokenClient.requestAccessToken({ prompt: 'select_account' });
      }
    } catch (err) {
      showToast(`Google Drive 연동 실패: ${err.message}`, 'error');
    }
  }

  if (btnGoogleDrive) {
    btnGoogleDrive.addEventListener('click', handleGoogleDrivePicker);
  }

  // Google Picker 생성 및 화면 표시
  function createAndShowPicker(accessToken) {
    const { apiKey } = getGoogleConfig();
    try {
      // 1. 내 드라이브(My Drive) 전체 파일 및 폴더 뷰 (개인 드라이브 파일 표시)
      const myDriveView = new google.picker.DocsView()
        .setIncludeFolders(true);

      // 2. 스프레드시트/엑셀 전용 탭 (내 드라이브의 엑셀 및 구글 시트)
      const sheetsView = new google.picker.DocsView(google.picker.ViewId.SPREADSHEETS)
        .setIncludeFolders(true);

      const builder = new google.picker.PickerBuilder()
        .enableFeature(google.picker.Feature.MULTISELECT_ENABLED)
        .setOAuthToken(accessToken)
        .addView(myDriveView)
        .addView(sheetsView)
        .addView(new google.picker.DocsUploadView())
        .setDeveloperKey(apiKey)
        .setTitle('Google Drive에서 문제 파일 선택 (다중 선택 가능)')
        .setCallback((data) => handlePickerCallback(data, accessToken));

      const picker = builder.build();
      picker.setVisible(true);
    } catch (err) {
      console.error('Picker 생성 실패:', err);
      currentGoogleAccessToken = null;
      showToast(`Google Picker 창 열기 실패: ${err.message}`, 'error');
    }
  }

  // Picker에서 파일 선택 후 다운로드 및 파싱 (단일 및 다중 파일 일괄 지원)
  async function handlePickerCallback(data, accessToken) {
    if (data[google.picker.Response.ACTION] === google.picker.Action.CANCEL) {
      return;
    }

    if (data[google.picker.Response.ACTION] !== google.picker.Action.PICKED) {
      return;
    }

    const docs = data[google.picker.Response.DOCUMENTS];
    if (!docs || docs.length === 0) return;

    if (docs.length === 1) {
      showToast(`Google Drive에서 "${docs[0][google.picker.Document.NAME] || '파일'}"을 가져오는 중...`, 'info');
    } else {
      showToast(`Google Drive에서 ${docs.length}개 파일을 가져오는 중...`, 'info');
    }

    const fetchPromises = docs.map(async (doc) => {
      const fileId = doc[google.picker.Document.ID];
      const fileName = doc[google.picker.Document.NAME] || 'google_drive_file';
      const mimeType = doc[google.picker.Document.MIME_TYPE] || '';
      const lowerName = fileName.toLowerCase();
      const isExcel = lowerName.endsWith('.xlsx') || lowerName.endsWith('.xls') || mimeType.includes('spreadsheetml') || mimeType.includes('ms-excel');
      const isGoogleSheet = mimeType === 'application/vnd.google-apps.spreadsheet' || mimeType === 'application/vnd.google.apps.spreadsheet';

      let downloadUrl = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`;
      if (isGoogleSheet) {
        // 구글 시트는 CSV로 내보내면 1번째 시트만 추출되므로, 모든 시트 유지를 위해 xlsx로 일괄 내보내기 수행
        downloadUrl = `https://www.googleapis.com/drive/v3/files/${fileId}/export?mimeType=application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`;
      }

      const res = await fetch(downloadUrl, {
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      });

      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          currentGoogleAccessToken = null;
          throw new Error('Google Drive 접근 권한이 만료되었습니다. 다시 시도해주세요.');
        }
        throw new Error(`다운로드 실패 (HTTP ${res.status})`);
      }

      let payload;
      if (isExcel || isGoogleSheet) {
        payload = await res.arrayBuffer();
      } else {
        payload = await res.text();
      }

      const parseFileName = isGoogleSheet && !lowerName.endsWith('.xlsx') ? `${fileName}.xlsx` : fileName;
      const questions = QuizParser.parseAuto(payload, parseFileName);
      if (!Array.isArray(questions) || questions.length === 0) {
        throw new Error('유효한 문제 데이터가 없습니다.');
      }

      return { fileName, questions };
    });

    const results = await Promise.allSettled(fetchPromises);
    const successful = [];
    const failed = [];

    results.forEach((res, idx) => {
      const docName = docs[idx][google.picker.Document.NAME] || `파일_${idx + 1}`;
      if (res.status === 'fulfilled') {
        successful.push(res.value);
      } else {
        failed.push({ fileName: docName, error: res.reason ? res.reason.message : '불러오기 실패' });
      }
    });

    if (failed.length > 0) {
      const failedMsg = failed.map(f => `"${f.fileName}" (${f.error})`).join(', ');
      if (successful.length === 0) {
        showToast(`Google Drive 파일 불러오기 실패: ${failedMsg}`, 'error');
        return;
      } else {
        showToast(`일부 파일 제외됨: ${failedMsg}`, 'warning');
      }
    }

    if (successful.length === 0) return;

    const isMultiple = successful.length > 1;
    const mergedQuestions = [];
    const fileNames = successful.map(s => s.fileName);

    successful.forEach((item) => {
      item.questions.forEach((q, qIdx) => {
        const rawId = q.id !== undefined && q.id !== null && String(q.id).trim() ? String(q.id).trim() : `${qIdx + 1}`;
        const uniqueId = isMultiple ? `${item.fileName}__${rawId}` : rawId;
        mergedQuestions.push({
          ...q,
          id: uniqueId,
          _sourceFile: item.fileName
        });
      });
    });

    const sourceName = isMultiple
      ? `Google Drive ${fileNames.length}개 (${fileNames.slice(0, 2).join(', ')}${fileNames.length > 2 ? ' 외 ' + (fileNames.length - 2) + '개' : ''})`
      : `Google Drive (${fileNames[0]})`;

    const sourceId = isMultiple
      ? `GoogleDrive_${fileNames.length}개_${fileNames[0].replace(/\.[^/.]+$/, '')}`
      : `GoogleDrive_${fileNames[0]}`;

    loadQuestions(mergedQuestions, sourceName, sourceId);
  }

  // ==========================================================================
  // 모드 전환 및 풀이 이력 관리
  // ==========================================================================
  modeSingleBtn.addEventListener('click', () => {
    currentMode = 'single';
    modeSingleBtn.classList.add('active');
    modeSingleBtn.setAttribute('aria-selected', 'true');
    modeMultiBtn.classList.remove('active');
    modeMultiBtn.setAttribute('aria-selected', 'false');
    multiCountWrapper.style.display = 'none';
  });

  modeMultiBtn.addEventListener('click', () => {
    currentMode = 'multi';
    modeMultiBtn.classList.add('active');
    modeMultiBtn.setAttribute('aria-selected', 'true');
    modeSingleBtn.classList.remove('active');
    modeSingleBtn.setAttribute('aria-selected', 'false');
    multiCountWrapper.style.display = 'flex';
  });

  btnResetSeen.addEventListener('click', async () => {
    if (!currentSourceId) return;
    const key = getHistoryKey();
    engine.resetSeen();
    questionHistory.length = 0;
    updateSeenStatus();
    updateHistoryStatus();
    await clearHistoryForKey(key);
    showToast('현재 조건의 출제 이력이 초기화되었습니다. (다른 조건의 기록은 유지됩니다)', 'info');
  });

  // ==========================================================================
  // 무작위 문제 추출 실행
  // ==========================================================================
  let isPicking = false;

  btnPickRandom.addEventListener('click', async () => {
    if (engine.totalCount === 0) {
      showToast('먼저 문제 데이터를 업로드하거나 샘플을 불러오세요.', 'error');
      return;
    }
    if (isPicking) return; // 연타 시 같은 문제가 중복 기록되는 것을 방지
    isPicking = true;

    try {
      // 현재 조건의 이력이 모두 적재된 뒤에 추출
      await switchHistoryContext();

      const filters = getActiveFilters();
      const historyKey = getHistoryKey();
      const count = currentMode === 'single' ? 1 : parseInt(countSelect.value, 10);
      const excludeSeen = checkExcludeSeen.checked;

      const result = engine.pickRandom(filters, count, { excludeSeen });
      updateSeenStatus();

      if (result.items.length === 0) {
        showToast(result.message || '조건에 일치하는 문제가 없습니다.', 'error');
        return;
      }

      if (result.seenReset) {
        showToast('이 조건의 문제를 모두 풀어 이력을 새로 시작합니다.', 'info');
      }

      // 세션 누적 목록(수동 TXT 다운로드용)
      result.items.forEach(item => questionHistory.push(item));
      updateHistoryStatus();

      latestPickedResult = result;

      if (currentMode === 'single') {
        renderSingleQuestion(result.items[0], result);
      } else {
        renderMultiQuestions(result.items, result);
      }

      // 조건별 이력 파일 저장. 완료 전에는 다음 추출을 막아 기록 순서를 보장한다.
      // (검색어로 좁힌 풀에서의 순환은 파일 전체를 비우지 않음)
      const resetBeforeAppend = result.seenReset && !filters.keyword.trim();
      await persistPickedQuestions(historyKey, result.items, resetBeforeAppend);
    } finally {
      isPicking = false;
    }
  });

  // ==========================================================================
  // 렌더링 함수: 1문제 즉석 풀이 뷰
  // ==========================================================================
  function renderSingleQuestion(q, resultMeta) {
    const card = document.createElement('article');
    card.className = 'question-card';
    card.setAttribute('aria-label', `문제: ${q.title || q.id}`);

    const hasOptions = Array.isArray(q.options) && q.options.length > 0;

    let optionsHtml = '';
    if (hasOptions) {
      optionsHtml = `
        <div class="options-list" role="list">
          ${q.options.map((opt, idx) => `
            <div class="option-item" role="listitem" tabindex="0" onclick="this.classList.toggle('selected')">
              <span class="option-number">${idx + 1}</span>
              <span class="option-text">${escapeHtml(opt)}</span>
            </div>
          `).join('')}
        </div>
      `;
    }

    // 뱃지 목록 생성
    const badgesHtml = [
      q.exam ? `<span class="badge badge-exam">${escapeHtml(q.exam)}</span>` : '',
      q.subject ? `<span class="badge badge-subject">${escapeHtml(q.subject)}</span>` : '',
      q.type ? `<span class="badge badge-type">${escapeHtml(q.type)}</span>` : '',
      q.difficulty ? `<span class="badge badge-difficulty difficulty-${escapeHtml(q.difficulty)}">${escapeHtml(q.difficulty)}</span>` : ''
    ].filter(Boolean).join('');

      const seenProgressInfo = checkExcludeSeen.checked
        ? ` (진행: ${engine.seenCount} / ${resultMeta.poolTotal}문제 중복 제외)`
        : '';

      card.innerHTML = `
        <div class="card-header">
          <div class="badge-group">
            ${badgesHtml}
          </div>
          <span class="question-id-tag">ID: ${escapeHtml(q.id)}</span>
        </div>

        <h3 class="question-title">${escapeHtml(q.title)}</h3>
        <div class="question-body">${escapeHtml(q.question)}</div>

        ${optionsHtml}

        <div class="answer-box">
          <button class="answer-toggle-btn" type="button" aria-expanded="false" onclick="toggleAnswer(this)">
            <span>👁 정답 및 해설 확인</span>
          </button>
          <div class="answer-content">
            <div class="answer-label">정답 / 모범답안</div>
            <div class="answer-text">${escapeHtml(q.answer || '(등록된 정답 또는 모범답안이 없습니다)')}</div>
            ${q.explanation ? `
              <div class="answer-label" style="margin-top: 10px;">해설 / 풀이</div>
              <div class="explanation-text">${escapeHtml(q.explanation)}</div>
            ` : ''}
          </div>
        </div>

        <div class="single-nav-bar">
          <span class="dropzone-subtext">추출 대상: 총 ${resultMeta.poolTotal}문제${seenProgressInfo}</span>
          <div style="display: flex; gap: 8px; align-items: center; flex-wrap: wrap;">
            <button id="btn-single-save-current-txt" class="btn btn-outline" type="button" title="현재 출제된 1문제를 TXT 파일로 저장합니다.">
              <span>💾 현재 문제 TXT</span>
            </button>
            <button id="btn-single-save-all-txt" class="btn btn-secondary" type="button" title="지금까지 출제된 모든 누적 문제(${questionHistory.length}개)를 TXT 파일로 저장합니다.">
              <span>💾 누적 이력 TXT (${questionHistory.length})</span>
            </button>
            <button id="btn-next-single" class="btn btn-primary" type="button">
              <span>다음 랜덤 문제 🎲</span>
            </button>
          </div>
        </div>
      `;

    resultsContainer.innerHTML = '';
    resultsContainer.appendChild(card);

    // TXT 저장 이벤트
    card.querySelector('#btn-single-save-current-txt').addEventListener('click', () => {
      downloadQuestionsAsTxt([q], `문제_${q.id || '단일'}`);
    });

    card.querySelector('#btn-single-save-all-txt').addEventListener('click', () => {
      downloadQuestionsAsTxt(questionHistory, '출제문제_누적이력');
    });

    // 다음 문제 버튼 이벤트
    card.querySelector('#btn-next-single').addEventListener('click', () => {
      btnPickRandom.click();
    });

    card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  // ==========================================================================
  // 렌더링 함수: N문제 시험지 묶음 뷰
  // ==========================================================================
  function renderMultiQuestions(questions, resultMeta) {
    const wrapper = document.createElement('div');

    // 상단 툴바
    const toolbar = document.createElement('div');
    toolbar.className = 'multi-view-header';
    toolbar.innerHTML = `
      <div class="multi-view-title">
        <span>📑 무작위 추출 문제지 (${questions.length}문제)</span>
      </div>
      <div class="multi-view-actions">
        <button id="btn-toggle-all-answers" class="btn btn-outline" type="button">
          <span>모든 정답 토글</span>
        </button>
        <button id="btn-copy-exam" class="btn btn-secondary" type="button">
          <span>📋 텍스트 복사</span>
        </button>
        <button id="btn-download-multi-txt" class="btn btn-outline" type="button" title="현재 시험지에 추출된 문제들을 TXT 파일로 저장합니다.">
          <span>💾 시험지 TXT 저장</span>
        </button>
        <button id="btn-download-multi-history-txt" class="btn btn-secondary" type="button" title="지금까지 출제된 모든 누적 문제(${questionHistory.length}개)를 TXT 파일로 저장합니다.">
          <span>💾 누적 이력 TXT (${questionHistory.length})</span>
        </button>
        <button id="btn-print-exam" class="btn btn-primary" type="button">
          <span>🖨️ 시험지 인쇄</span>
        </button>
      </div>
    `;
    wrapper.appendChild(toolbar);

    // 문제 리스트
    questions.forEach((q, index) => {
      const card = document.createElement('article');
      card.className = 'question-card';
      card.setAttribute('aria-label', `문제 ${index + 1}: ${q.title}`);

      const hasOptions = Array.isArray(q.options) && q.options.length > 0;
      let optionsHtml = '';
      if (hasOptions) {
        optionsHtml = `
          <div class="options-list" role="list">
            ${q.options.map((opt, idx) => `
              <div class="option-item" role="listitem" tabindex="0" onclick="this.classList.toggle('selected')">
                <span class="option-number">${idx + 1}</span>
                <span class="option-text">${escapeHtml(opt)}</span>
              </div>
            `).join('')}
          </div>
        `;
      }

      const badgesHtml = [
        q.exam ? `<span class="badge badge-exam">${escapeHtml(q.exam)}</span>` : '',
        q.subject ? `<span class="badge badge-subject">${escapeHtml(q.subject)}</span>` : '',
        q.type ? `<span class="badge badge-type">${escapeHtml(q.type)}</span>` : '',
        q.difficulty ? `<span class="badge badge-difficulty difficulty-${escapeHtml(q.difficulty)}">${escapeHtml(q.difficulty)}</span>` : ''
      ].filter(Boolean).join('');

      card.innerHTML = `
        <div class="card-header">
          <div class="badge-group">
            ${badgesHtml}
          </div>
          <span class="question-id-tag">#${index + 1} (${escapeHtml(q.id)})</span>
        </div>

        <h3 class="question-title">${index + 1}. ${escapeHtml(q.title)}</h3>
        <div class="question-body">${escapeHtml(q.question)}</div>

        ${optionsHtml}

        <div class="answer-box">
          <button class="answer-toggle-btn" type="button" aria-expanded="false" onclick="toggleAnswer(this)">
            <span>👁 정답 및 해설 확인</span>
          </button>
          <div class="answer-content">
            <div class="answer-label">정답 / 모범답안</div>
            <div class="answer-text">${escapeHtml(q.answer || '(등록된 정답 또는 모범답안이 없습니다)')}</div>
            ${q.explanation ? `
              <div class="answer-label" style="margin-top: 10px;">해설 / 풀이</div>
              <div class="explanation-text">${escapeHtml(q.explanation)}</div>
            ` : ''}
          </div>
        </div>
      `;
      wrapper.appendChild(card);
    });

    resultsContainer.innerHTML = '';
    resultsContainer.appendChild(wrapper);

    // 일괄 정답 토글 이벤트
    let allExpanded = false;
    wrapper.querySelector('#btn-toggle-all-answers').addEventListener('click', () => {
      allExpanded = !allExpanded;
      wrapper.querySelectorAll('.answer-content').forEach(el => {
        if (allExpanded) el.classList.add('show');
        else el.classList.remove('show');
      });
      wrapper.querySelectorAll('.answer-toggle-btn').forEach(btn => {
        btn.setAttribute('aria-expanded', String(allExpanded));
      });
    });

    // 시험지 TXT 저장 이벤트
    wrapper.querySelector('#btn-download-multi-txt').addEventListener('click', () => {
      downloadQuestionsAsTxt(questions, '시험지_문제목록');
    });

    // 누적 이력 TXT 저장 이벤트
    wrapper.querySelector('#btn-download-multi-history-txt').addEventListener('click', () => {
      downloadQuestionsAsTxt(questionHistory, '출제문제_누적이력');
    });

    // 인쇄 이벤트
    wrapper.querySelector('#btn-print-exam').addEventListener('click', () => {
      window.print();
    });

    // 텍스트 클립보드 복사 이벤트
    wrapper.querySelector('#btn-copy-exam').addEventListener('click', () => {
      const formattedText = questions.map((q, idx) => {
        const tags = [q.exam, q.subject, q.type, q.difficulty].filter(Boolean).join(' / ');
        let text = `[문제 ${idx + 1}]`;
        if (tags) text += ` (${tags})`;
        text += `\n제목: ${q.title}\n본문: ${q.question}\n`;
        if (q.options && q.options.length > 0) {
          text += `보기:\n${q.options.map((opt, i) => `  ${i + 1}) ${opt}`).join('\n')}\n`;
        }
        text += `정답 / 모범답안: ${q.answer}\n`;
        if (q.explanation) {
          text += `해설: ${q.explanation}\n`;
        }
        return text;
      }).join('\n----------------------------------------\n\n');

      navigator.clipboard.writeText(formattedText)
        .then(() => showToast('문제와 정답이 클립보드에 복사되었습니다.', 'success'))
        .catch(() => showToast('클립보드 복사에 실패했습니다.', 'error'));
    });

    wrapper.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  // ==========================================================================
  // 유틸리티 함수
  // ==========================================================================
  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  window.toggleAnswer = function (button) {
    const content = button.nextElementSibling;
    const isShowing = content.classList.contains('show');
    if (isShowing) {
      content.classList.remove('show');
      button.setAttribute('aria-expanded', 'false');
    } else {
      content.classList.add('show');
      button.setAttribute('aria-expanded', 'true');
    }
  };

  // 초기화 실행
  initTheme();
  fetchSampleQuestions();
  checkServerGoogleConfig();
});
