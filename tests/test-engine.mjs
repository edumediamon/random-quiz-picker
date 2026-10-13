/**
 * test-engine.mjs
 * 파서 및 무작위 추출 엔진 단위 테스트
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert';

// CommonJS 모듈 가져오기
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);

const {
  parseCSVToRows,
  parseCSVQuestions,
  parseJSONQuestions,
  parseAuto,
  formatQuestionsAsText
} = require('../js/parser.js');

const { QuizEngine } = require('../js/quiz-engine.js');

const __dirname = path.dirname(fileURLToPath(import.meta.url));

console.log('--- 1. CSV 파서 RFC 4180 단위 테스트 ---');
const testCSV = `id,자격증,과목,유형,난이도,제목,문제,보기,정답,해설
1,테스트자격,과목A,단답형,기초,"따옴표 ""포함"" 제목","문제 내에 쉼표, 그리고 줄바꿈\n줄바꿈이 있는 문제",보기1|보기2|보기3,정답1,"해설입니다, 쉼표 포함"
2,테스트자격,과목B,서술형,심화,단답형 문제,다음 빈칸을 채우시오,,단답정답,단답해설`;

const parsedRows = parseCSVToRows(testCSV);
assert.strictEqual(parsedRows.length, 3, '헤더 포함 총 3개 행이어야 함');
assert.strictEqual(parsedRows[1][5], '따옴표 "포함" 제목', '따옴표 이스케이프 정상 처리');
assert.strictEqual(parsedRows[1][6], '문제 내에 쉼표, 그리고 줄바꿈\n줄바꿈이 있는 문제', '필드 내 쉼표 및 줄바꿈 처리');

const questionsFromCSV = parseCSVQuestions(testCSV);
assert.strictEqual(questionsFromCSV.length, 2, '문제 2건 파싱 완료');
assert.strictEqual(questionsFromCSV[0].exam, '테스트자격', '자격증 한글 헤더 매핑');
assert.strictEqual(questionsFromCSV[0].type, '단답형', '유형 한글 헤더 매핑');
assert.strictEqual(questionsFromCSV[0].options.length, 3, '파이프 구분 보기 3개 분리');
assert.strictEqual(questionsFromCSV[1].options.length, 0, '보기가 없는 주관식 문제 빈 배열');
console.log('✓ CSV 파서 테스트 통과');

console.log('--- 2. JSON 파서 단위 테스트 (관련 영역, 유형, 모범답안 검증) ---');
const testJSONWithUserFields = JSON.stringify([
  {
    "관련 영역": "스프레드시트 실무",
    "유형": "수식 작성형",
    "문제": "A1 셀과 B1 셀의 합계를 구하는 수식을 작성하세요.",
    "모범답안": "=SUM(A1, B1)",
    "해설": "SUM 함수는 인수로 전달된 값들의 총합을 구합니다."
  },
  {
    "관련영역": "데이터베이스 설계",
    "문제유형": "단답형",
    "문제": "관계형 데이터베이스에서 중복 데이터를 최소화하기 위한 과정은?",
    "모범 답안": "정규화(Normalization)",
    "해설및풀이": "이상 현상을 방지하기 위해 정규화를 진행합니다."
  },
  {
    "영역": "알고리즘",
    "유형": "복수정답형",
    "문제": "정렬 알고리즘의 평균 시간복잡도가 O(n log n)인 것을 모두 고르시오.",
    "모범답안": ["퀵 정렬", "병합 정렬", "힙 정렬"]
  }
]);

const userParsed = parseJSONQuestions(testJSONWithUserFields);
assert.strictEqual(userParsed.length, 3, '총 3개 문항 파싱');

// 문항 1 검증: '관련 영역', '유형', '모범답안'
assert.strictEqual(userParsed[0].subject, '스프레드시트 실무', '관련 영역 -> subject 매핑');
assert.strictEqual(userParsed[0].type, '수식 작성형', '유형 -> type 매핑');
assert.strictEqual(userParsed[0].answer, '=SUM(A1, B1)', '모범답안 -> answer 매핑');
assert.strictEqual(userParsed[0].explanation, 'SUM 함수는 인수로 전달된 값들의 총합을 구합니다.');

// 문항 2 검증: '관련영역', '문제유형', '모범 답안'
assert.strictEqual(userParsed[1].subject, '데이터베이스 설계', '관련영역 -> subject 매핑');
assert.strictEqual(userParsed[1].type, '단답형', '문제유형 -> type 매핑');
assert.strictEqual(userParsed[1].answer, '정규화(Normalization)', '모범 답안 -> answer 매핑');

// 문항 3 검증: 배열 형태의 모범답안
assert.strictEqual(userParsed[2].subject, '알고리즘');
assert.strictEqual(userParsed[2].type, '복수정답형');
assert.strictEqual(userParsed[2].answer, '퀵 정렬, 병합 정렬, 힙 정렬', '배열 형태 모범답안 안전 문자열 변환');

console.log('✓ [관련 영역 / 유형 / 모범답안] JSON 파서 테스트 통과');

console.log('--- 3. 실제 샘플 데이터 파일 파싱 검증 ---');
const jsonSamplePath = path.join(__dirname, '../data/sample-questions.json');
const csvSamplePath = path.join(__dirname, '../data/sample-questions.csv');

const rawJson = fs.readFileSync(jsonSamplePath, 'utf-8');
const rawCsv = fs.readFileSync(csvSamplePath, 'utf-8');

const sampleFromJSON = parseAuto(rawJson, 'sample.json');
const sampleFromCSV = parseAuto(rawCsv, 'sample.csv');

assert.ok(sampleFromJSON.length >= 10, 'JSON 샘플 문제 10건 이상 확인');
assert.strictEqual(sampleFromJSON.length, sampleFromCSV.length, 'JSON과 CSV 샘플의 문항 수가 일치해야 함');
console.log(`✓ 샘플 데이터 로드 확인 (${sampleFromJSON.length} 문항 일치)`);

console.log('--- 4. QuizEngine 필터 (유형 포함) 및 무작위 추출 테스트 ---');
const engine = new QuizEngine(sampleFromJSON);

// 필터 옵션 추출 (유형 포함)
const filterOpts = engine.getFilterOptions();
assert.ok(filterOpts.exams.includes('컴퓨터활용능력 2급'));
assert.ok(filterOpts.types.length > 0, '문제 유형 옵션 추출 확인');
assert.ok(filterOpts.types.includes('계산형') || filterOpts.types.includes('객관식'));
console.log('✓ 고유 필터 옵션(유형 포함) 정상 추출');

// 유형 필터링 테스트
const filteredCalc = engine.filterQuestions({ type: '계산형' });
assert.ok(filteredCalc.length >= 3);
filteredCalc.forEach(q => assert.strictEqual(q.type, '계산형'));
console.log(`✓ 유형 필터링(계산형: ${filteredCalc.length}건) 정상 작동`);

// 1문제 랜덤 추출
const pickSingle = engine.pickRandom({ type: '객관식' }, 1);
assert.strictEqual(pickSingle.items.length, 1);
assert.strictEqual(pickSingle.items[0].type, '객관식');
assert.ok(pickSingle.items[0].answer, '정답(모범답안) 존재 확인');

// N문제 랜덤 추출 (5문제)
const pickMulti = engine.pickRandom({}, 5);
assert.strictEqual(pickMulti.items.length, 5);
const idSet = new Set(pickMulti.items.map(item => item.id));
assert.strictEqual(idSet.size, 5, '추출된 5개 문항에 중복이 없어야 함');
console.log('✓ 1문제 및 N문제 랜덤 무작위 추출 통과');

console.log('--- 5. 출제 문제 TXT 파일 포맷터 단위 테스트 ---');
const txtOutput = formatQuestionsAsText(pickMulti.items, '단위테스트 출제 기록');
assert.ok(txtOutput.includes('[랜덤 문제 추출기] 단위테스트 출제 기록'), '헤더 타이틀 확인');
assert.ok(txtOutput.includes('총 출제 문항 수: 5문항'), '문항 수 확인');
assert.ok(txtOutput.includes('[문항 1]'), '첫 번째 문항 마커 확인');
assert.ok(txtOutput.includes('정답 / 모범답안:'), '정답/모범답안 섹션 확인');
assert.ok(txtOutput.includes('===================='), '구분선 확인');

// 빈 목록 처리 검증
const emptyTxt = formatQuestionsAsText([], '빈 목록');
assert.ok(emptyTxt.includes('(출제된 문제 내역이 없습니다.)'), '빈 문제 목록 안전 메시지 확인');
console.log('✓ 출제 문제 TXT 포맷터 테스트 통과');

console.log('--- 6. 조건별 history 중복 방지 파일 파서 및 포맷터 단위 테스트 ---');
const {
  normalizeHistoryKey,
  buildHistoryFileName,
  resolveHistoryPath,
  parseSeenIdsFromHistoryFile,
  formatQuestionsForHistoryFile,
  appendHistory,
  readHistory,
  deleteHistory,
  HISTORY_DIR
} = require('../server.js');

const historyChunk = formatQuestionsForHistoryFile([
  { id: 'hist-01', title: '테스트1', question: '질문1', answer: '답1' },
  { id: 'hist-02', title: '테스트2', question: '질문2', answer: '답2' }
], 0);

assert.ok(historyChunk.includes('[기록 1] ID: hist-01'));
assert.ok(historyChunk.includes('[기록 2] ID: hist-02'));

const parsedIds = parseSeenIdsFromHistoryFile(historyChunk);
assert.strictEqual(parsedIds.length, 2, 'history 파일에서 2개 ID 추출');
assert.ok(parsedIds.includes('hist-01'));
assert.ok(parsedIds.includes('hist-02'));

// 조건별 파일명 생성 테스트
const testKey1 = {
  source: 'my-quiz.json',
  exam: '정보처리기사',
  subject: '데이터베이스',
  type: '단답형',
  difficulty: '기초'
};
const fileName1 = buildHistoryFileName(testKey1);
assert.strictEqual(fileName1, 'my-quiz.json__정보처리기사__데이터베이스__단답형__기초.txt');

// 'ALL' 조건이 포함된 파일명 생성 테스트
const testKeyAll = {
  source: 'sample.json',
  exam: 'ALL',
  subject: 'ALL',
  type: 'ALL',
  difficulty: 'ALL'
};
const fileNameAll = buildHistoryFileName(testKeyAll);
assert.strictEqual(fileNameAll, 'sample.json__전체자격증__전체영역__전체유형__전체난이도.txt');

// 실제 파일 쓰기/읽기/삭제 검증
const appendRes = appendHistory(testKey1, [{ id: 'q-unit-01', title: 'DB단위테스트', question: '본문', answer: '답' }]);
assert.ok(appendRes.seenIds.includes('q-unit-01'));

const readRes = readHistory(testKey1);
assert.strictEqual(readRes.exists, true);
assert.ok(readRes.seenIds.includes('q-unit-01'));

// 삭제 검증
const delRes = deleteHistory(testKey1);
assert.strictEqual(delRes.existed, true);
assert.strictEqual(readHistory(testKey1).exists, false);

console.log('✓ 조건별 history 파일명 생성, 저장, 조회, 삭제 검증 통과');

console.log('--- 7. Google Drive 설정 엔드포인트 (/api/google-config) 단위 테스트 ---');
const { server } = require('../server.js');
const testServer = server.listen(0, async () => {
  const port = testServer.address().port;
  try {
    const res = await fetch(`http://localhost:${port}/api/google-config`);
    assert.strictEqual(res.status, 200, 'HTTP 200 반환');
    const data = await res.json();
    assert.ok(typeof data.clientId === 'string', 'clientId 문자열 필드 존재');
    assert.ok(typeof data.apiKey === 'string', 'apiKey 문자열 필드 존재');
    console.log('✓ /api/google-config 엔드포인트 테스트 통과');
  } finally {
    testServer.close();
    console.log('\n==================================');
    console.log('모든 자동화 단위 테스트가 성공했습니다!');
    console.log('==================================');
  }
});
