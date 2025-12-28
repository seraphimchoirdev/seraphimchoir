#!/usr/bin/env npx tsx

/**
 * OCR JSON 파일을 ML 학습용 포맷으로 변환하는 스크립트
 *
 * 사용법: npx tsx scripts/convert_ocr_to_ml.ts
 */

import * as fs from 'fs';
import * as path from 'path';

// Supabase에서 가져온 멤버 데이터
const MEMBERS_DATA: { id: string; name: string; part: string }[] = [
  { "id": "9fcc9951-2158-47c5-a833-df1a5ef0627e", "name": "김문희", "part": "SOPRANO" },
  { "id": "c909690e-6f93-449b-8676-e1587014cd95", "name": "김민식", "part": "SOPRANO" },
  { "id": "68b17764-0422-4c1e-913f-e7b694a1ddc4", "name": "김은혜", "part": "SOPRANO" },
  { "id": "23c3fc63-610a-427c-9add-6ed06b443bd2", "name": "김정숙", "part": "SOPRANO" },
  { "id": "3f50ca7f-6873-4d60-b77d-0e80166ea0e8", "name": "김정희", "part": "SOPRANO" },
  { "id": "1bc52640-34d9-4f04-8924-35148be6a10c", "name": "김지영", "part": "SOPRANO" },
  { "id": "d64140cf-224e-4417-b0ac-4071f727c59a", "name": "김지혜", "part": "SOPRANO" },
  { "id": "bcbd596d-78d7-40e0-9522-cc65f2eaea1b", "name": "김진희", "part": "SOPRANO" },
  { "id": "a82defbb-615d-4280-84fc-2793d7a81350", "name": "김향숙", "part": "SOPRANO" },
  { "id": "23d9b1ea-729f-4890-b6a9-cb282ec12b67", "name": "김혜선", "part": "SOPRANO" },
  { "id": "3452f38e-35dc-4f05-9327-011c8e9edb7f", "name": "노은숙", "part": "SOPRANO" },
  { "id": "c023a373-54a2-42a5-a5c2-35a539bb019e", "name": "문희", "part": "SOPRANO" },
  { "id": "4cf7ff9d-9f77-4573-8463-91a2438965ad", "name": "방진경", "part": "SOPRANO" },
  { "id": "8cb110cd-c64d-453e-a798-970d2ffc53a4", "name": "백한나", "part": "SOPRANO" },
  { "id": "e09947c5-fb15-4b58-ab81-ca5ee44b3748", "name": "서헌숙", "part": "SOPRANO" },
  { "id": "1e5a9347-9cc1-4d67-9d08-10f2e851c3a7", "name": "손기순", "part": "SOPRANO" },
  { "id": "46e6b790-ae99-4f2c-b271-af71aa81cdb3", "name": "신나래", "part": "SOPRANO" },
  { "id": "c9a92c9f-4df2-416e-821b-ae9eaac301dd", "name": "신수정", "part": "SOPRANO" },
  { "id": "2dbd8064-5cf1-405e-b4d0-928ee6f1359a", "name": "오신영", "part": "SOPRANO" },
  { "id": "ed555475-fa3d-4fac-ab61-4cd2aae9ddc4", "name": "오연분", "part": "SOPRANO" },
  { "id": "e14ba908-f39d-4d3e-a57c-26244bd900c5", "name": "이광숙", "part": "SOPRANO" },
  { "id": "913b9610-0c12-40bc-9f65-79d88cab7041", "name": "이문형", "part": "SOPRANO" },
  { "id": "21fe177f-7d18-4841-be60-cf71d49f7230", "name": "이선미", "part": "SOPRANO" },
  { "id": "4976844a-319c-45f2-8701-d007b45ab337", "name": "이선아", "part": "SOPRANO" },
  { "id": "c25cbbfa-8e4d-4cce-8225-3f72365dd289", "name": "이수지", "part": "SOPRANO" },
  { "id": "143c3ea1-e209-419b-8263-8de870014833", "name": "이승숙", "part": "SOPRANO" },
  { "id": "9352769c-1efa-42f7-9ad7-fcf7e3acb645", "name": "이영란", "part": "SOPRANO" },
  { "id": "00b9c276-0b3b-49bd-819f-4dbdbefc8c23", "name": "임서연", "part": "SOPRANO" },
  { "id": "108cb6e4-756a-4842-8e01-9352942cd787", "name": "임신애", "part": "SOPRANO" },
  { "id": "cf592330-17aa-4dcf-b4bb-ec6486a2c803", "name": "최해경", "part": "SOPRANO" },
  { "id": "5263d52a-6607-49de-a2fa-c8bb33877bed", "name": "추민아", "part": "SOPRANO" },
  { "id": "8a9a8fc0-b27d-42d0-b4d9-cf92c7384611", "name": "현성희", "part": "SOPRANO" },
  { "id": "30e839a2-45f1-4680-ad56-43e1994e09ee", "name": "김소옥", "part": "ALTO" },
  { "id": "bae7f08a-8d49-4cb1-9e7e-5339b4aa351e", "name": "김수영", "part": "ALTO" },
  { "id": "43d60188-705f-4b38-b00b-40b3a0ac65e4", "name": "김영정", "part": "ALTO" },
  { "id": "ae961512-6b5a-4509-a01a-1cc5237279b7", "name": "김은영", "part": "ALTO" },
  { "id": "96e9f64f-5701-48e6-8d1c-01383a1a7e82", "name": "김이정", "part": "ALTO" },
  { "id": "5d06a005-b9bf-4351-b6dc-147d0121cdcd", "name": "김희진", "part": "ALTO" },
  { "id": "7fe9a6c5-b1fe-4c7d-b0ff-f7e048d05f6b", "name": "민경실", "part": "ALTO" },
  { "id": "a905189a-18ce-4b3c-aff0-c74f1926e52a", "name": "민은홍", "part": "ALTO" },
  { "id": "05a953d7-52dc-4838-9e55-f1e6360751d1", "name": "백성원", "part": "ALTO" },
  { "id": "d4d66444-4e84-4a8a-a51b-2dc7c361a964", "name": "변소정", "part": "ALTO" },
  { "id": "aafc7de7-11bd-4baa-ab60-6c3ad348de44", "name": "심희숙", "part": "ALTO" },
  { "id": "355ab732-17c8-42ea-9d96-9ae4cbbace16", "name": "안은희", "part": "ALTO" },
  { "id": "ab152b8d-28ba-4586-b650-d564b09e75dd", "name": "양아름", "part": "ALTO" },
  { "id": "902efc7c-4156-4cc7-a2b7-ac7980c87487", "name": "염용주", "part": "ALTO" },
  { "id": "373deb7c-fb31-4475-a230-d2bb913aa8b2", "name": "이건자", "part": "ALTO" },
  { "id": "211a621d-aaeb-4019-b036-f4ed0681a698", "name": "이상미", "part": "ALTO" },
  { "id": "ca4eef10-84dd-474f-b846-82a37c3eac51", "name": "이윤옥", "part": "ALTO" },
  { "id": "b428b5e2-96bc-43be-8057-5f563c1a6a4c", "name": "이은주", "part": "ALTO" },
  { "id": "338af00b-a855-4ab6-8eeb-bfd18a4e9363", "name": "이지영", "part": "ALTO" },
  { "id": "ecd238b8-79dd-49a0-a8a0-e45a233c6c10", "name": "이혜연", "part": "ALTO" },
  { "id": "6ba6680a-fe5d-4e24-a7f0-a918c5fdca96", "name": "최명희", "part": "ALTO" },
  { "id": "a435a908-ff75-4a48-a292-fc37063a6084", "name": "최승운", "part": "ALTO" },
  { "id": "c1195bdc-122f-42b9-8b79-15bdffe2c95b", "name": "최연희", "part": "ALTO" },
  { "id": "f2295256-ece2-44e0-8101-f73d48e7f850", "name": "최유진", "part": "ALTO" },
  { "id": "27ddae26-185e-4e45-9a76-5896926a5d67", "name": "김상목", "part": "TENOR" },
  { "id": "77af715f-ca5e-4309-be94-3d4e87ea3109", "name": "김학영", "part": "TENOR" },
  { "id": "20ca6ff9-0a3b-4a56-8830-37ae4ec2331b", "name": "김한빛", "part": "TENOR" },
  { "id": "a51f5c43-4a1a-4e35-9a99-62e0aa370dac", "name": "배사무엘", "part": "TENOR" },
  { "id": "2607cdd1-955f-4f03-938b-c23c9a4ec221", "name": "변성식", "part": "TENOR" },
  { "id": "9abee5d5-86c7-4bc4-8379-e7e8b92c7439", "name": "안강현", "part": "TENOR" },
  { "id": "115dd199-8cbc-4426-9729-dfeb66430b85", "name": "이강봉", "part": "TENOR" },
  { "id": "c2b38a03-5853-4c22-93e8-4cda01083a41", "name": "이상조", "part": "TENOR" },
  { "id": "b91dac44-55bc-48c5-b158-546c25c62dfc", "name": "이승균", "part": "TENOR" },
  { "id": "814e33ee-eb0c-4f40-8dc3-abf0b21cb879", "name": "정진문", "part": "TENOR" },
  { "id": "01dc2272-facb-4209-bd17-b259742b78a9", "name": "정현석", "part": "TENOR" },
  { "id": "024c842b-0818-47eb-bdc6-c2dd4ddf5fcc", "name": "최광열", "part": "TENOR" },
  { "id": "91051cd8-191e-4b44-a947-b42e73153129", "name": "최창운", "part": "TENOR" },
  { "id": "5c0aa7aa-54d8-4f21-89bf-757667abb155", "name": "홍영은", "part": "TENOR" },
  { "id": "d91e69e1-96da-491f-86f2-903e34e15ac6", "name": "황봉식", "part": "TENOR" },
  { "id": "1eab806e-64f7-4edd-8fc6-67b0048b8c39", "name": "김성휘", "part": "BASS" },
  { "id": "c59a63b5-dfe9-4973-80cc-bae13a02fe3d", "name": "김창동", "part": "BASS" },
  { "id": "6198380d-30ac-4f91-afb0-da8f71a933fe", "name": "고연주", "part": "SOPRANO" },
  { "id": "24586c3f-b507-4891-8f23-c00fd6b3ab0f", "name": "강혜선", "part": "ALTO" },
  { "id": "91be141f-82e6-4d17-8209-7b7f5d42b079", "name": "권인영", "part": "TENOR" },
  { "id": "bed5894d-5b4e-451a-a0d8-39c5682d3f40", "name": "김대영", "part": "BASS" },
  { "id": "03cd8319-62c3-4f1e-a056-6f3e8a17b2fa", "name": "임희정", "part": "SOPRANO" },
  { "id": "b07f5e8d-e92f-48c6-98af-8e8c47e13c20", "name": "김철우", "part": "BASS" },
  { "id": "6ff3eb37-475b-4f45-a67c-83dedef9766f", "name": "김택훈", "part": "BASS" },
  { "id": "2a34976e-b300-46f8-8b30-a2f28c8745c0", "name": "남승호", "part": "BASS" },
  { "id": "3b9a3c3c-9653-4374-a400-626187d06b05", "name": "문승현", "part": "BASS" },
  { "id": "c95491d5-d146-4d3f-926d-a188949f560e", "name": "박재용", "part": "BASS" },
  { "id": "f9000126-918e-4a84-b5bb-119031d619e5", "name": "안상은", "part": "BASS" },
  { "id": "d147fff1-b04c-4f19-9714-3e25e19dea2a", "name": "안형준", "part": "BASS" },
  { "id": "d1de8297-09a2-4b3e-8b11-cbd8925dc12d", "name": "이경진", "part": "BASS" },
  { "id": "8eb5efae-4de1-41b3-bc94-dba54a4bbb7b", "name": "이규락", "part": "BASS" },
  { "id": "d616cd1e-5361-43cd-8ed3-eb84624ace63", "name": "이원섭", "part": "BASS" },
  { "id": "0f6fe1fc-3818-4c3e-9d73-767bb1e638df", "name": "이철재", "part": "BASS" },
  { "id": "7e628534-28aa-451d-b114-9fd00d1c34dc", "name": "임삼진", "part": "BASS" },
  { "id": "a2526bcd-c7e7-4540-9edb-5334c38d9fa4", "name": "임찬섭", "part": "BASS" },
  { "id": "34c40bed-3457-4a6f-bd3a-b6b5ca284f19", "name": "하범", "part": "BASS" },
  { "id": "aa2b788c-a38b-46b6-9945-8a97d021f2dd", "name": "한만영", "part": "BASS" },
  { "id": "0682bd16-ab1a-4fec-983a-ded1c3365365", "name": "이은혜", "part": "SOPRANO" },
  { "id": "8b20ec0d-d3c7-4da0-afda-9987a9eacd3b", "name": "김소라", "part": "SOPRANO" },
  { "id": "4dcfbf88-a614-40b0-a28b-65e133872267", "name": "강재은", "part": "SOPRANO" },
  { "id": "11ea7452-c905-4aed-be61-827adca539c2", "name": "김재원", "part": "SOPRANO" },
  { "id": "762b8a0e-1c82-4342-86c0-1cf86e4040f0", "name": "양승진", "part": "SOPRANO" },
  { "id": "5c969616-846f-4627-bf28-163c35d9730c", "name": "이기형", "part": "BASS" },
  { "id": "57a7a1d4-15be-442f-9e43-94cf3f4cf499", "name": "최종현", "part": "BASS" },
  { "id": "0a43f610-5fe2-48ce-9d4b-5f4153252d3a", "name": "김윤희", "part": "ALTO" },
  { "id": "142c1173-784a-4c7a-92a8-7b8a2013f9c1", "name": "오흥철", "part": "TENOR" },
  { "id": "ec7b9d91-689d-4c8c-84b0-4b6b3f3753f5", "name": "최신규", "part": "BASS" },
];

// 이름 -> {id, part} 매핑
const memberMap = new Map<string, { id: string; part: string }>();
MEMBERS_DATA.forEach(m => {
  memberMap.set(m.name, { id: m.id, part: m.part });
});

// OCR 오인식 이름 -> 실제 등록된 이름 매핑
const OCR_NAME_CORRECTIONS: Record<string, string> = {
  // ㄱ
  '강해선': '강혜선',
  '강성희': '강혜선',
  '김경숙': '김정숙',
  '김경희': '김정희',
  '김단빛': '김한빛',
  '김대명': '김대영',
  '김명경': '김영정',
  '김상무': '김상목',
  '김상복': '김상목',
  '김상우': '김상목',
  '김선희': '김진희',
  '김성옥': '김상목',
  '김성희': '김진희',
  '김소욱': '김소옥',
  '김영경': '김영정',
  '김영성': '김영정',
  '김영숙': '김향숙',
  '김재관': '김재원',
  '김정우': '김철우',
  '김지연': '김지영',
  '김창규': '김창동',
  '김평숙': '김향숙',
  '김해선': '김혜선',
  '김현범': '김한빛',
  '김혜경': '최해경',
  '김훈희': '김윤희',
  '김희원': '김희진',
  '김항숙': '김향숙',
  '김황숙': '김향숙',
  '김택준': '김택훈',
  '김택호': '김택훈',
  '김태훈': '김택훈',
  // ㅁ
  '문성희': '현성희',
  '민경심': '민경실',
  // ㅂ
  '백사무엘': '배사무엘',
  '백 사무엘': '배사무엘',
  '백하나': '백한나',
  '박재웅': '박재용',
  '박성길': '박재용',
  // ㅅ
  '사도자': '신나래',
  '서성숙': '서헌숙',
  '서원숙': '서헌숙',
  '서현숙': '서헌숙',
  '송기순': '손기순',
  '신혜리': '신나래',
  // ㅇ
  '안철준': '안형준',
  '안현준': '안형준',
  '양강현': '안강현',
  '양아들': '양아름',
  '엄성리': '임희정',
  '엄용주': '염용주',
  '오산영': '오신영',
  '오연부': '오연분',
  '오종철': '오흥철',
  '오홍철': '오흥철',
  '아건자': '이건자',
  '아지영': '이지영',
  '어상미': '이상미',
  '어선미': '이선미',
  '어광숙': '이광숙',
  '어지영': '이지영',
  // ㅇ (이)
  '이강현': '이강봉',
  '이강복': '이강봉',
  '이광남': '이원섭',
  '이규라': '이규락',
  '이문령': '이문형',
  '이상봉': '이강봉',
  '이상아': '이선아',
  '이송숙': '이승숙',
  '이승교': '이승숙',
  '이원선': '이원섭',
  '이윤욱': '이윤옥',
  '이은영': '이문형',
  '이종숙': '이광숙',
  '이창재': '이철재',
  '이혜면': '이혜연',
  // ㅇ (임)
  '임서언': '임서연',
  '임상진': '임삼진',
  '임찬성': '임찬섭',
  // ㅈ
  '정진선': '정진문',
  // ㅊ
  '최승은': '최승운',
  '최승훈': '최승운',
  '최창윤': '최창운',
  '최창은': '최창운',
  '최장은': '최창운',
  '최혜경': '최해경',
  '추석예': '추민아',
  // ㅎ
  '한민영': '한만영',
  '황복식': '황봉식',
  '황동식': '황봉식',
  '황봉석': '황봉식',
  // 공백 처리
  '하 범': '하범',
  '문 희': '문희',
  // 빈 좌석 (무시)
  '공 석': '',
  '공석': '',
};

// 이름 정규화 (공백 제거, 특수문자 처리)
function normalizeName(name: string): string {
  return name.replace(/\s+/g, '').trim();
}

// OCR 오인식 보정
function correctOcrName(name: string): string {
  // 먼저 원본 이름으로 체크 (빈 문자열도 유효한 값으로 처리)
  if (name in OCR_NAME_CORRECTIONS) {
    return OCR_NAME_CORRECTIONS[name];
  }
  // 공백 제거 후 체크
  const noSpaceName = name.replace(/\s+/g, '');
  if (noSpaceName in OCR_NAME_CORRECTIONS) {
    return OCR_NAME_CORRECTIONS[noSpaceName];
  }
  return name;
}

// 멤버 찾기 (정확한 매칭 또는 유사 매칭)
function findMember(name: string): { id: string; part: string; correctedName?: string } | null {
  // 1. OCR 오인식 보정 적용
  const correctedName = correctOcrName(name);
  const wasCorrected = correctedName !== name;

  // 2. 정규화
  const normalizedName = normalizeName(correctedName);

  // 3. 정확한 매칭
  if (memberMap.has(normalizedName)) {
    const result = memberMap.get(normalizedName)!;
    return wasCorrected ? { ...result, correctedName } : result;
  }

  // 4. 공백 있는 이름 처리 (예: "하 범" -> "하범")
  const noSpaceName = correctedName.replace(/\s+/g, '');
  if (memberMap.has(noSpaceName)) {
    const result = memberMap.get(noSpaceName)!;
    return wasCorrected ? { ...result, correctedName: noSpaceName } : result;
  }

  // 5. "문 희" -> "문희" 처리
  for (const [key, value] of memberMap.entries()) {
    if (key.replace(/\s+/g, '') === noSpaceName) {
      return wasCorrected ? { ...value, correctedName: key } : value;
    }
  }

  return null;
}

// breakdown 키 변환 (한글 -> 영어)
function convertBreakdown(breakdown: Record<string, number>): Record<string, number> {
  const converted: Record<string, number> = {};
  const keyMap: Record<string, string> = {
    '소프라노': '소프라노',
    '알토': '알토',
    '테너': '테너',
    '베이스': '베이스',
    'soprano': '소프라노',
    'alto': '알토',
    'tenor': '테너',
    'bass': '베이스',
  };

  for (const [key, value] of Object.entries(breakdown)) {
    const mappedKey = keyMap[key.toLowerCase()] || key;
    converted[mappedKey] = value;
  }

  return converted;
}

// OCR 데이터를 ML 포맷으로 변환
interface OcrRowObject {
  row: number;
  members: string[];
}

type OcrRows = OcrRowObject[] | string[][];

interface OcrData {
  filename: string;
  date: string;
  service: string;
  anthem: string;
  offering_hymn_leader: string;
  total: number;
  breakdown: Record<string, number>;
  rows: OcrRows;
}

interface MlSeat {
  member_id: string | null;
  member_name: string;
  part: string;
  height: null;
  experience_years: number;
  is_part_leader: boolean;
  row: number;
  col: number;
}

interface MlData {
  arrangement_id: string;
  date: string;
  metadata: {
    service: string;
    anthem: string;
    offering_hymn_leader: string;
    total_members: number;
    breakdown: Record<string, number>;
  };
  grid_layout: {
    rows: number;
    row_capacities: number[];
    zigzag_pattern: string;
  };
  seats: MlSeat[];
}

function convertToMlFormat(ocrData: OcrData, index: number): MlData {
  const seats: MlSeat[] = [];
  const rowCapacities: number[] = [];

  // rows 데이터 형식 확인 및 정규화
  let normalizedRows: OcrRowObject[];

  if (Array.isArray(ocrData.rows) && ocrData.rows.length > 0) {
    // 첫 번째 요소가 배열인지 객체인지 확인
    if (Array.isArray(ocrData.rows[0])) {
      // 형식: [[...], [...]] -> [{row: 1, members: [...]}, ...]
      normalizedRows = (ocrData.rows as string[][]).map((members, idx) => ({
        row: idx + 1,
        members: members.filter(m => m && m.trim() !== ''), // 빈 문자열 제거
      }));
    } else {
      // 형식: [{row: 1, members: [...]}, ...]
      normalizedRows = ocrData.rows as OcrRowObject[];
    }
  } else {
    normalizedRows = [];
  }

  // rows 데이터 정렬 (row 번호 기준)
  const sortedRows = [...normalizedRows].sort((a, b) => a.row - b.row);

  // 각 행별로 좌석 생성
  for (const rowData of sortedRows) {
    const validMembers = rowData.members.filter(m => m && m.trim() !== '');
    let colIndex = 0;

    for (const memberName of validMembers) {
      // OCR 보정 적용
      const correctedName = correctOcrName(memberName);

      // 빈 좌석(공 석)은 건너뛰기
      if (!correctedName || correctedName.trim() === '') {
        continue;
      }

      const member = findMember(memberName);

      seats.push({
        member_id: member?.id || null,
        member_name: correctedName, // 보정된 이름 사용
        part: member?.part || 'UNKNOWN',
        height: null,
        experience_years: 0,
        is_part_leader: false,
        row: rowData.row,
        col: colIndex + 1,
      });
      colIndex++;
    }

    rowCapacities.push(colIndex);
  }

  // service 이름 정리
  let serviceName = ocrData.service;
  if (serviceName.includes('부예배')) {
    serviceName = serviceName.replace(/(\d)부예배/, '$1부예배');
  }

  return {
    arrangement_id: `ocr_${ocrData.date}_${index}`,
    date: ocrData.date,
    metadata: {
      service: serviceName,
      anthem: ocrData.anthem,
      offering_hymn_leader: ocrData.offering_hymn_leader,
      total_members: ocrData.total,
      breakdown: convertBreakdown(ocrData.breakdown),
    },
    grid_layout: {
      rows: sortedRows.length,
      row_capacities: rowCapacities,
      zigzag_pattern: 'even',
    },
    seats,
  };
}

// 메인 함수
async function main() {
  const inputDir = path.join(__dirname, '..', 'training_data', 'ocr_output');
  const outputDir = path.join(__dirname, '..', 'training_data', 'ml_output');

  // 출력 디렉토리 생성
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // OCR JSON 파일 목록 가져오기
  const files = fs.readdirSync(inputDir).filter(f => f.endsWith('.json'));

  console.log(`Found ${files.length} OCR files to convert`);

  let successCount = 0;
  let errorCount = 0;
  const unmatchedMembers = new Set<string>();

  for (const file of files) {
    try {
      const inputPath = path.join(inputDir, file);
      const ocrData: OcrData = JSON.parse(fs.readFileSync(inputPath, 'utf-8'));

      // ML 포맷으로 변환
      const mlData = convertToMlFormat(ocrData, 0);

      // 매칭되지 않은 멤버 추적
      for (const seat of mlData.seats) {
        if (!seat.member_id) {
          unmatchedMembers.add(seat.member_name);
        }
      }

      // 출력 파일명 생성: ml_date_service.json
      const outputFileName = `ml_${ocrData.date}_${ocrData.service.replace(/\s+/g, '')}.json`;
      const outputPath = path.join(outputDir, outputFileName);

      // JSON 파일 저장
      fs.writeFileSync(outputPath, JSON.stringify(mlData, null, 2), 'utf-8');

      console.log(`✓ Converted: ${file} -> ${outputFileName}`);
      successCount++;
    } catch (error) {
      console.error(`✗ Error converting ${file}:`, error);
      errorCount++;
    }
  }

  console.log('\n=== Conversion Summary ===');
  console.log(`Success: ${successCount}`);
  console.log(`Errors: ${errorCount}`);

  if (unmatchedMembers.size > 0) {
    console.log(`\nUnmatched members (${unmatchedMembers.size}):`);
    [...unmatchedMembers].sort().forEach(name => console.log(`  - ${name}`));
  }
}

main().catch(console.error);
