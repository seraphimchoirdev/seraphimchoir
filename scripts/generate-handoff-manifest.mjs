/**
 * 빌드 시점에 핸드오프 문서 목록을 생성하는 스크립트
 * Vercel 서버리스 환경에서 fs 모듈 사용 불가 문제 해결
 *
 * 이 산출물은 저장소에 커밋된다. 그래서 "입력이 같으면 출력도 같아야" 한다 —
 * 그렇지 않으면 빌드할 때마다 내용상 의미 없는 diff가 생겨 배포 diff를 흐린다.
 *
 * 과거에는 generatedAt(생성 시각)과 파일별 modifiedAt·size를 함께 담았다가
 * 두 가지 문제를 만들었다:
 *   - generatedAt은 빌드할 때마다 바뀌어 매번 한 줄짜리 가짜 변경이 생겼다
 *   - modifiedAt은 fs의 mtime인데 git은 mtime을 보존하지 않는다. 다른 머신이나
 *     CI가 clone 후 빌드하면 61개 항목의 mtime이 전부 체크아웃 시각으로 바뀌어
 *     매니페스트 전체가 갈아엎어졌다
 * 게다가 이 필드들은 아무도 읽지 않았다. 소비처(api/admin/handoff/route.ts)가
 * 쓰는 것은 filename뿐이다.
 *
 * 따라서 문서 내용에서 결정론적으로 유도되는 값만 남긴다.
 * 파일 크기·수정 시각이 필요해지면 그때 읽는 쪽에서 구하면 된다.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const handoffDir = path.join(__dirname, '..', 'docs', 'handoff');
const outputFile = path.join(__dirname, '..', 'public', 'handoff-manifest.json');

// docs/handoff 폴더가 없으면 빈 매니페스트 생성
if (!fs.existsSync(handoffDir)) {
  console.log('docs/handoff 폴더가 없습니다. 빈 매니페스트를 생성합니다.');
  fs.writeFileSync(outputFile, JSON.stringify({ files: [], totalCount: 0 }, null, 2));
  process.exit(0);
}

// .md 파일 목록 읽기
const files = fs
  .readdirSync(handoffDir)
  .filter((file) => file.endsWith('.md'))
  .sort((a, b) => b.localeCompare(a)); // 최신 날짜 순

// 각 파일의 메타데이터 수집
const manifest = {
  files: files.map((file) => {
    const filePath = path.join(handoffDir, file);
    const content = fs.readFileSync(filePath, 'utf-8');

    // 제목 추출 (첫 번째 # 라인)
    const titleMatch = content.match(/^#\s+(.+)$/m);
    const title = titleMatch ? titleMatch[1] : file.replace('.md', '');

    // 프로젝트명 추출
    const projectMatch = content.match(/\*\*Project\*\*:\s*(.+)/);
    const project = projectMatch ? projectMatch[1].trim() : '';

    return {
      filename: file,
      date: file.replace('.md', ''),
      title,
      project,
    };
  }),
  totalCount: files.length,
};

// public 폴더가 없으면 생성
const publicDir = path.dirname(outputFile);
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

// 매니페스트 파일 저장
// 끝에 개행을 붙인다. 없으면 diff마다 "\ No newline at end of file"이 따라붙는다.
fs.writeFileSync(outputFile, `${JSON.stringify(manifest, null, 2)}\n`);

console.log(`✅ 핸드오프 매니페스트 생성 완료: ${files.length}개 파일`);
console.log(`   경로: ${outputFile}`);
