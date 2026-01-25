/**
 * 빌드 시점에 핸드오프 문서 목록을 생성하는 스크립트
 * Vercel 서버리스 환경에서 fs 모듈 사용 불가 문제 해결
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
  fs.writeFileSync(outputFile, JSON.stringify({ files: [], generatedAt: new Date().toISOString() }, null, 2));
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
    const stats = fs.statSync(filePath);

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
      size: stats.size,
      modifiedAt: stats.mtime.toISOString(),
    };
  }),
  generatedAt: new Date().toISOString(),
  totalCount: files.length,
};

// public 폴더가 없으면 생성
const publicDir = path.dirname(outputFile);
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

// 매니페스트 파일 저장
fs.writeFileSync(outputFile, JSON.stringify(manifest, null, 2));

console.log(`✅ 핸드오프 매니페스트 생성 완료: ${files.length}개 파일`);
console.log(`   경로: ${outputFile}`);
