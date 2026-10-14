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
  parseRowsToQuestions,
  parseExcelQuestions,
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
const { server, loadGoogleConfigFile } = require('../server.js');

// 파일 기반 로드 테스트: 임시 google-config.json 생성 후 확인
const tempConfigPath = path.join(__dirname, '../google-config.json');
fs.writeFileSync(tempConfigPath, JSON.stringify({
  clientId: 'mock-test-client-id.apps.googleusercontent.com',
  apiKey: 'mock-test-api-key'
}), 'utf8');

try {
  const loaded = loadGoogleConfigFile();
  assert.strictEqual(loaded.clientId, 'mock-test-client-id.apps.googleusercontent.com', 'google-config.json에서 clientId 정상 로드');
  assert.strictEqual(loaded.apiKey, 'mock-test-api-key', 'google-config.json에서 apiKey 정상 로드');
  console.log('✓ google-config.json 파일 로더 테스트 통과');
} finally {
  if (fs.existsSync(tempConfigPath)) {
    fs.unlinkSync(tempConfigPath);
  }
}

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

    console.log('--- 8. type_label_question 및 area_label 포함 복합 CSV 파싱 단위 테스트 ---');
    const complexCSV = `id,area_number,area_label,type,number_label,type_label_question,model_answer
q1,1,영역 1. 실무 기본 절차,약술형,Q1.,"[약술형]
업무 수행 절차와 규정을 확인하는 방법을 서술하시오.","★ 모범답안
적용되는 규정을 우선 확인하고 세부 절차에 따라 순서대로 진행한다."
q2,1,영역 1. 실무 기본 절차,절차·판단형,Q2.,"[절차·판단형]
다음 업무를 수행할 때 확인해야 할 기준과 처리 순서를 쓰시오: 자격 요건을 충족하는가","★ 모범답안
필요 요건을 점검한 뒤 증빙 자료와 일치하는지 확인한다."`;

    const parsedQuestions = parseCSVQuestions(complexCSV);
    assert.strictEqual(parsedQuestions.length, 2, '2문항 파싱 성공');
    assert.strictEqual(parsedQuestions[0].id, 'q1');
    assert.strictEqual(parsedQuestions[0].subject, '영역 1. 실무 기본 절차', 'area_label -> subject 매핑');
    assert.strictEqual(parsedQuestions[0].type, '약술형', 'type 매핑');
    assert.ok(parsedQuestions[0].question.includes('업무 수행 절차와 규정을 확인하는 방법'), 'type_label_question -> question 매핑');
    assert.ok(parsedQuestions[0].answer.includes('모범답안'), 'model_answer -> answer 매핑');
    console.log('✓ type_label_question & area_label 복합 CSV 파서 테스트 통과');

    console.log('--- 9. 엑셀(.xlsx, .xls) 파서 단위 테스트 ---');
    const XLSX = require('../js/xlsx.full.min.js');
    const wb = XLSX.utils.book_new();
    const wsData = [
      ['번호', '자격증', '과목', '유형', '난이도', '문제', '보기', '정답', '해설'],
      [101, '정보보안기사', '시스템보안', '단답형', '보통', '버퍼 오버플로우 공격을 방지하기 위한 컴파일러 기술은?', '스택가드|ASLR|DEP', '스택가드', 'Stack Canary를 삽입하여 변조를 탐지합니다.'],
      [102, '정보보안기사', '네트워크보안', '선다형', '심화', 'TCP SYN 플러딩 공격의 대응책으로 알맞은 것은?', 'SYN 쿠키|ICMP 차단', 'SYN 쿠키', '백로그 큐를 채우지 않고 암호화된 쿠키로 연결을 검증합니다.']
    ];
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    XLSX.utils.book_append_sheet(wb, ws, '문제시트');
    const excelBuffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    const questionsFromExcel = parseExcelQuestions(excelBuffer, 'sample.xlsx');
    assert.strictEqual(questionsFromExcel.length, 2, '엑셀에서 2문항 정상 추출');
    assert.strictEqual(questionsFromExcel[0].exam, '정보보안기사', '자격증 정상 매핑');
    assert.strictEqual(questionsFromExcel[0].subject, '시스템보안', '과목 정상 매핑');
    assert.strictEqual(questionsFromExcel[0].answer, '스택가드', '정답 정상 매핑');
    assert.strictEqual(questionsFromExcel[1].options.length, 2, '보기 2개 분리 확인');

    const wsData2 = [
      ['번호', '문제', '정답'],
      [201, '2시트의 첫 번째 문제입니다.', '정답2']
    ];
    const ws2 = XLSX.utils.aoa_to_sheet(wsData2);
    XLSX.utils.book_append_sheet(wb, ws2, '2영역_계약관리');
    const multiSheetBuffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    const multiQuestions = parseExcelQuestions(multiSheetBuffer, 'multi.xlsx');
    assert.strictEqual(multiQuestions.length, 3, '2개 시트에서 총 3문항 정상 합산 추출');
    assert.strictEqual(multiQuestions[2].subject, '2영역_계약관리', '시트명이 과목으로 자동 매핑됨');
    assert.ok(multiQuestions[2].id.includes('2영역_계약관리'), '시트별 ID 고유화 확인');

    const autoParsedExcel = parseAuto(multiSheetBuffer, 'test.xlsx');
    assert.strictEqual(autoParsedExcel.length, 3, 'parseAuto로 다중 시트 엑셀 자동 파싱 성공');
    console.log('✓ 엑셀(.xlsx) 다중 시트 파서 단위 테스트 통과');

    console.log('--- 10. 다중 파일(개수 무관) 병합 및 ID 고유화 시뮬레이션 단위 테스트 ---');
    const filesToMerge = [
      { name: '1과목.csv', questions: parseCSVQuestions(testCSV) }, // 2문제
      { name: '2과목.json', questions: userParsed }, // 3문제
      { name: '3과목.xlsx', questions: questionsFromExcel } // 2문제
    ];

    const merged = [];
    const isMultiple = filesToMerge.length > 1;
    assert.ok(isMultiple, '3개 파일 다중 병합 조건 성립');

    filesToMerge.forEach((fileItem) => {
      fileItem.questions.forEach((q, qIdx) => {
        const rawId = q.id !== undefined && q.id !== null && String(q.id).trim() ? String(q.id).trim() : `${qIdx + 1}`;
        const uniqueId = isMultiple ? `${fileItem.name}__${rawId}` : rawId;
        merged.push({
          ...q,
          id: uniqueId,
          _sourceFile: fileItem.name
        });
      });
    });

    assert.strictEqual(merged.length, 7, '총 7개 문항 누락 없이 단일 배열로 병합');
    const idSet = new Set(merged.map(q => q.id));
    assert.strictEqual(idSet.size, 7, '모든 문항의 합성 ID가 고유함을 보장(충돌 없음)');

    const engine = new QuizEngine();
    engine.setQuestions(merged);
    assert.strictEqual(engine.totalCount, 7, '엔진에 7문제 정상 적재');
    const filterOptions = engine.getFilterOptions();
    assert.ok(filterOptions.exams.includes('정보보안기사'), '엑셀에서 온 자격증 필터 반영');
    assert.ok(filterOptions.subjects.includes('스프레드시트 실무'), 'JSON에서 온 영역 필터 반영');
    assert.ok(filterOptions.subjects.includes('과목A'), 'CSV에서 온 과목 필터 반영');

    const picked = engine.pickRandom({}, 3, { excludeSeen: false });
    assert.strictEqual(picked.items.length, 3, '다중 파일 통합 문제 풀에서 3문제 무작위 추출 성공');
    console.log('✓ 다중 파일 병합 및 필터 엔진 무결성 검증 통과');

    console.log('\n==================================');
    console.log('모든 자동화 단위 테스트가 성공했습니다!');
    console.log('==================================');
  }
});
