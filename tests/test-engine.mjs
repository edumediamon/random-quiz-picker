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


console.log('--- 자격증별 과목과 명시적 subject 우선순위 회귀 검증 ---');
const sourceArea='관련 영역: 1. 공공조달 입찰 참가 준비';
const canonicalSubject='명시적 과목';
for (const headers of [
  ['id','exam','subject','area_label','question','answer'],
  ['id','area_label','subject','exam','question','answer']
]) {
  const raw={id:'q1',exam:'공공조달관리사',subject:canonicalSubject,area_label:sourceArea,question:'원본 문제',answer:'원본 답안'};
  const parsed=parseRowsToQuestions([headers,headers.map(h=>raw[h])]);
  assert.strictEqual(parsed[0].subject,canonicalSubject,'명시적 subject는 열 순서와 무관하게 유지');
  assert.strictEqual(raw.area_label,sourceArea,'원본 area_label 불변');
}
const legacyArea=parseRowsToQuestions([['id','area_label','question'],['q1',sourceArea,'문제']]);
assert.strictEqual(legacyArea[0].subject,sourceArea,'기존 area_label 전용 파일 호환');
const subjectEngine=new QuizEngine([
  {id:'a',exam:'공공조달관리사',subject:sourceArea},
  {id:'b',exam:'정보처리기사',subject:'데이터베이스'},
  {id:'c',exam:'공공조달관리사',subject:'관련 영역: 2. 공공조달 입찰계획 수립'}
]);
assert.deepStrictEqual(subjectEngine.getFilterOptions('공공조달관리사').subjects,[sourceArea,'관련 영역: 2. 공공조달 입찰계획 수립']);
assert.deepStrictEqual(subjectEngine.getFilterOptions('정보처리기사').subjects,['데이터베이스']);
assert.strictEqual(subjectEngine.getFilterOptions().subjects.length,3,'전체 자격증에서는 전체 과목');
assert.deepStrictEqual(subjectEngine.getFilterOptions('공공조달관리사').exams,subjectEngine.getFilterOptions().exams,'자격증 선택지는 전체 유지');


// 실제 필터 함수를 최소 DOM 대역에서 실행하며 브라우저 화면 검증과 구분한다.
const { runInNewContext } = await import('node:vm');
function selectFixture() {
  return { value:'ALL', options:[], listeners:{},
    set innerHTML(html) { this.options=[...html.matchAll(/<option value="([^"]*)"/g)].map(m=>m[1]);this.value=this.options[0]??''; },
    addEventListener(type,fn) { this.listeners[type]=fn; }
  };
}
const filterSource=fs.readFileSync(path.join(__dirname,'../js/app.js'),'utf8');
const populateSource=filterSource.match(/  function populateFilters\(\) \{[\s\S]*?\n  \}/)[0];
const listenerSource=filterSource.slice(filterSource.indexOf('  const filterElements ='),filterSource.indexOf("  filterKeyword.addEventListener('input'"));
const resetSource=filterSource.match(/  btnResetFilters\.addEventListener\('click',[\s\S]*?\n  \}\);/)[0];
const filterContext={engine:subjectEngine,filterExam:selectFixture(),filterSubject:selectFixture(),filterArea:selectFixture(),filterYear:selectFixture(),filterType:selectFixture(),filterDifficulty:selectFixture(),filterKeyword:{value:''},btnResetFilters:selectFixture(),escapeHtml:x=>String(x),showToast:()=>{},updates:[],histories:[]};
filterContext.updateMatchedCount=()=>filterContext.updates.push({exam:filterContext.filterExam.value,subject:filterContext.filterSubject.value});
filterContext.switchHistoryContext=()=>filterContext.histories.push({exam:filterContext.filterExam.value,subject:filterContext.filterSubject.value});
runInNewContext(populateSource+'\n'+listenerSource+'\n'+resetSource,filterContext);
filterContext.populateFilters();assert.strictEqual(filterContext.filterSubject.options.length,4);
filterContext.filterSubject.value='데이터베이스';filterContext.filterExam.value='공공조달관리사';filterContext.filterExam.listeners.change();
assert.strictEqual(filterContext.filterSubject.value,'ALL');assert.strictEqual(filterContext.filterSubject.options.length,3);
assert.deepStrictEqual(filterContext.histories.at(-1),{exam:'공공조달관리사',subject:'ALL'},'무효 과목 초기화 후 이력 전환');
filterContext.filterSubject.value=sourceArea;filterContext.filterExam.value='정보처리기사';filterContext.filterExam.listeners.change();
assert.strictEqual(filterContext.filterSubject.value,'ALL');assert.deepStrictEqual(filterContext.filterSubject.options,['ALL','데이터베이스']);
filterContext.btnResetFilters.listeners.click();assert.strictEqual(filterContext.filterExam.value,'ALL');assert.strictEqual(filterContext.filterSubject.options.length,4);
filterContext.filterExam.value='존재하지 않는 이전 자격증';filterContext.populateFilters();assert.strictEqual(filterContext.filterExam.value,'ALL');assert.strictEqual(filterContext.filterSubject.options.length,4);
console.log('✓ 자격증 변경·무효 과목 초기화·전체 필터 복원 동작 통과');

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


console.log('--- 과목·영역·연도 및 연도별 이력 회귀 검증 ---');
const yearQuestions = parseRowsToQuestions([
  ['id','exam','year','subject','area_label','question','model_answer'],
  ['q1','공공조달관리사',2026,'실기',sourceArea,'문제26','답26'],
  ['q1','공공조달관리사',2025,'실기',sourceArea,'문제25','답25'],
  ['q1','공공조달관리사',2026,'필기','영역B','필기문제','답'],
  ['q2','정보처리기사','','필기','영역C','연도미지정','답']
]);
assert.strictEqual(yearQuestions[0].year,'2026');
assert.strictEqual(yearQuestions[0].subject,'실기');
assert.strictEqual(yearQuestions[0].area_label,sourceArea);
assert.strictEqual(yearQuestions[0].id,'q1','원본 문항 번호 유지');
assert.throws(()=>parseRowsToQuestions([['question','year'],['문제','2026-01-01']]),/year/);
assert.strictEqual(parseJSONQuestions([{question:'문제',년도:2024}])[0].year,'2024');
assert.strictEqual(parseRowsToQuestions([['subject','area_label','question'],['',sourceArea,'문제']])[0].subject,'','명시적 빈 과목 보존');
const yearEngine=new QuizEngine(yearQuestions);
assert.deepStrictEqual(yearEngine.getFilterOptions('공공조달관리사','실기').years,['2026','2025']);
assert.deepStrictEqual(yearEngine.getFilterOptions('공공조달관리사','실기').areas,[sourceArea]);
assert.strictEqual(yearEngine.filterQuestions({exam:'공공조달관리사',subject:'실기',year:'2026',area_label:sourceArea}).length,1);
assert.strictEqual(yearEngine.filterQuestions({year:'UNSPECIFIED'}).length,1);
assert.strictEqual(yearEngine.filterQuestions({keyword:sourceArea}).length,2);
assert.strictEqual(new Set(yearQuestions.map(q=>QuizEngine.questionKey(q))).size,4,'연도와 과목이 다른 같은 번호의 문제 구분');
assert.strictEqual(yearEngine.pickRandom({},10,{excludeSeen:true}).items.length,4);
assert.strictEqual(yearEngine.seenCount,4);
assert.strictEqual(QuizEngine.questionKey({id:'legacy'}),'legacy');
const yearKey={...testKey1,year:'2026'};
const previousYearKey={...testKey1,year:'2025'};
assert.notStrictEqual(buildHistoryFileName(yearKey),buildHistoryFileName(previousYearKey));
assert.notStrictEqual(buildHistoryFileName({...testKey1,area_label:'2026'}),buildHistoryFileName(yearKey),'영역과 연도 키 충돌 방지');
assert.strictEqual(buildHistoryFileName({...testKey1,year:'ALL',area_label:'ALL'}),fileName1,'전체 필터는 이전 파일명 유지');
try {
  appendHistory(yearKey,[yearQuestions[0]]);
  appendHistory(previousYearKey,[yearQuestions[1]]);
  assert.deepStrictEqual(readHistory(yearKey).seenIds,[QuizEngine.questionKey(yearQuestions[0])]);
  assert.deepStrictEqual(readHistory(previousYearKey).seenIds,[QuizEngine.questionKey(yearQuestions[1])]);
  assert.ok(readHistory(yearKey).content.includes('- 연도: 2026'));
} finally { deleteHistory(yearKey);deleteHistory(previousYearKey); }
const yearText=formatQuestionsAsText([yearQuestions[0]]);
assert.ok(yearText.includes('과목: 실기') && yearText.includes('연도: 2026') && yearText.includes(sourceArea));
filterContext.engine=yearEngine;
filterContext.populateFilters();
filterContext.filterExam.value='공공조달관리사';filterContext.filterExam.listeners.change();
filterContext.filterSubject.value='실기';filterContext.filterSubject.listeners.change();
assert.deepStrictEqual(filterContext.filterYear.options,['ALL','2026','2025']);
filterContext.filterYear.value='2026';filterContext.filterArea.value=sourceArea;
filterContext.filterExam.value='정보처리기사';filterContext.filterExam.listeners.change();
assert.strictEqual(filterContext.filterYear.value,'ALL');
assert.strictEqual(filterContext.filterArea.value,'ALL');
assert.deepStrictEqual(filterContext.filterYear.options,['ALL','UNSPECIFIED']);
filterContext.btnResetFilters.listeners.click();
assert.strictEqual(filterContext.filterYear.value,'ALL');
assert.strictEqual(filterContext.filterArea.value,'ALL');
const historyKeySource=filterSource.match(/  function getHistoryKey\(\) \{[\s\S]*?\n  \}/)[0];
const localKeySource=filterSource.match(/  function localStorageKeyFor\(key\) \{[\s\S]*?\n  \}/)[0];
const historyContext={currentSourceId:'old.csv',HISTORY_KEY_FIELDS:['exam','subject','type','difficulty','area_label','year'],LOCAL_STORAGE_HISTORY_PREFIX:'quiz_picker_seen::',getActiveFilters:()=>({exam:'ALL',subject:'ALL',type:'ALL',difficulty:'ALL',area_label:'ALL',year:'ALL'})};
runInNewContext(historyKeySource+'\n'+localKeySource,historyContext);
assert.strictEqual(historyContext.localStorageKeyFor(historyContext.getHistoryKey()),'quiz_picker_seen::'+JSON.stringify({source:'old.csv',exam:'ALL',subject:'ALL',type:'ALL',difficulty:'ALL'}),'브라우저 기존 전체 조건 저장 키 유지');
console.log('✓ 연도별 필터·저장·중복 방지·기존 키 호환 통과');

console.log('--- 7. Google Drive 설정 엔드포인트 (/api/google-config) 단위 테스트 ---');
const { server, loadGoogleConfigFile } = require('../server.js');

// 파일 기반 로드 테스트: 임시 google-config.json 생성 후 확인
const tempConfigPath = path.join(__dirname, '../google-config.json');
const originalConfig = fs.existsSync(tempConfigPath) ? fs.readFileSync(tempConfigPath) : null;
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
  if (originalConfig !== null) fs.writeFileSync(tempConfigPath, originalConfig);
  else if (fs.existsSync(tempConfigPath)) fs.unlinkSync(tempConfigPath);
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

    const apiKey = {...testKey1,source:`year-api-unit-${Date.now()}.json`,year:'2026',area_label:sourceArea};
    const apiOtherYear = {...apiKey,year:'2025'};
    try {
      for (const [key,q] of [[apiKey,yearQuestions[0]],[apiOtherYear,yearQuestions[1]]]) {
        const saved = await fetch(`http://localhost:${port}/api/history`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({key,questions:[q]})});
        assert.strictEqual(saved.status,200);
        assert.deepStrictEqual((await saved.json()).seenIds,[QuizEngine.questionKey(q)]);
      }
      const saved = await fetch(`http://localhost:${port}/api/history?${new URLSearchParams(apiKey)}`);
      const result = await saved.json();
      assert.strictEqual(result.key.year,'2026');
      assert.strictEqual(result.key.area_label,sourceArea);
      assert.deepStrictEqual(result.seenIds,[QuizEngine.questionKey(yearQuestions[0])]);
      const removed = await fetch(`http://localhost:${port}/api/history?${new URLSearchParams(apiKey)}`,{method:'DELETE'});
      assert.strictEqual(removed.status,200);
      assert.strictEqual(readHistory(apiKey).exists,false);
      assert.strictEqual(readHistory(apiOtherYear).exists,true,'다른 연도 이력 보존');
    } finally {deleteHistory(apiKey);deleteHistory(apiOtherYear);}
    console.log('✓ 연도별 이력 HTTP 저장·조회·삭제 검증 통과');

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

    const yearWb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(yearWb,XLSX.utils.aoa_to_sheet([['id','year','subject','area_label','question'],['q1',2026,'실기',sourceArea,'문제']]),'연도문제');
    const yearXlsx = parseExcelQuestions(XLSX.write(yearWb,{type:'buffer',bookType:'xlsx'}));
    assert.strictEqual(yearXlsx[0].year,'2026');
    assert.strictEqual(yearXlsx[0].area_label,sourceArea);
    yearWb.Sheets['연도문제'].B2={t:'s',v:'잘못된연도'};
    assert.throws(()=>parseExcelQuestions(XLSX.write(yearWb,{type:'buffer',bookType:'xlsx'})),/year/,'잘못된 연도를 가진 시트를 조용히 제외하지 않음');

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
