/**
 * quiz-engine.js
 * 문제 필터링, Fisher-Yates 무작위 셔플 및 세션 관리 엔진
 */

class QuizEngine {
  constructor(questions = []) {
    this.questions = questions;
    this.seenQuestionIds = new Set();
  }

  setQuestions(questions) {
    this.questions = Array.isArray(questions) ? questions : [];
    this.seenQuestionIds.clear();
  }

  get totalCount() {
    return this.questions.length;
  }

  /**
   * 데이터셋에 존재하는 고유한 필터 목록 추출 (자격증, 과목/영역, 유형, 난이도)
   */
  getFilterOptions() {
    const exams = new Set();
    const subjects = new Set();
    const types = new Set();
    const difficulties = new Set();

    this.questions.forEach(q => {
      if (q.exam) exams.add(q.exam);
      if (q.subject) subjects.add(q.subject);
      if (q.type) types.add(q.type);
      if (q.difficulty) difficulties.add(q.difficulty);
    });

    return {
      exams: Array.from(exams).sort(),
      subjects: Array.from(subjects).sort(),
      types: Array.from(types).sort(),
      difficulties: Array.from(difficulties).sort()
    };
  }

  /**
   * 조건에 맞게 문제 필터링
   * @param {Object} filters { exam, subject, type, difficulty, keyword }
   */
  filterQuestions(filters = {}) {
    const {
      exam = 'ALL',
      subject = 'ALL',
      type = 'ALL',
      difficulty = 'ALL',
      keyword = ''
    } = filters;

    const lowerKeyword = (keyword || '').trim().toLowerCase();

    return this.questions.filter(q => {
      if (exam !== 'ALL' && q.exam !== exam) return false;
      if (subject !== 'ALL' && q.subject !== subject) return false;
      if (type !== 'ALL' && q.type !== type) return false;
      if (difficulty !== 'ALL' && q.difficulty !== difficulty) return false;

      if (lowerKeyword) {
        const titleMatch = (q.title || '').toLowerCase().includes(lowerKeyword);
        const questionMatch = (q.question || '').toLowerCase().includes(lowerKeyword);
        const subjectMatch = (q.subject || '').toLowerCase().includes(lowerKeyword);
        const typeMatch = (q.type || '').toLowerCase().includes(lowerKeyword);
        const examMatch = (q.exam || '').toLowerCase().includes(lowerKeyword);
        if (!titleMatch && !questionMatch && !subjectMatch && !typeMatch && !examMatch) {
          return false;
        }
      }

      return true;
    });
  }

  /**
   * Fisher-Yates (Knuth) 공정 셔플 알고리즘
   */
  static shuffle(array) {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  /**
   * 조건 범위 내에서 무작위 문제 추출
   * @param {Object} filters 조건 필터 객체
   * @param {number} count 추출할 문제 수 (기본값: 1)
   * @param {Object} options { excludeSeen: boolean }
   */
  pickRandom(filters = {}, count = 1, options = {}) {
    const { excludeSeen = false } = options;

    let candidatePool = this.filterQuestions(filters);
    const poolTotal = candidatePool.length;

    if (poolTotal === 0) {
      return {
        items: [],
        totalAvailable: 0,
        poolTotal: 0,
        seenReset: false,
        message: '선택한 조건에 일치하는 문제가 없습니다.'
      };
    }

    let seenReset = false;
    if (excludeSeen) {
      const unseenPool = candidatePool.filter(q => !this.seenQuestionIds.has(q.id));
      if (unseenPool.length === 0) {
        // 이미 해당 조건의 모든 문제를 확인한 경우 세션 이력 초기화 후 재추출
        candidatePool.forEach(q => this.seenQuestionIds.delete(q.id));
        seenReset = true;
      } else {
        candidatePool = unseenPool;
      }
    }

    // Fisher-Yates 셔플 수행
    const shuffled = QuizEngine.shuffle(candidatePool);
    const actualCount = Math.min(Math.max(1, count), shuffled.length);
    const picked = shuffled.slice(0, actualCount);

    // 추출된 문제 ID 기록
    picked.forEach(q => this.seenQuestionIds.add(q.id));

    return {
      items: picked,
      totalAvailable: candidatePool.length,
      poolTotal,
      requestedCount: count,
      actualCount,
      seenReset
    };
  }

  /**
   * 확인한 문제 이력 초기화
   */
  resetSeen() {
    this.seenQuestionIds.clear();
  }

  get seenCount() {
    return this.seenQuestionIds.size;
  }
}

// 브라우저 및 Node.js 겸용 내보내기
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { QuizEngine };
} else if (typeof window !== 'undefined') {
  window.QuizEngine = QuizEngine;
}
