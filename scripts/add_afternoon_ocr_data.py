#!/usr/bin/env python3
"""
오후찬양예배 5개 OCR 데이터를 추가하는 스크립트
"""

import json
from pathlib import Path

def add_afternoon_ocr_data():
    """오후찬양예배 5개 OCR 데이터 추가"""

    afternoon_data = [
        # 1. 2025-10-05 오후찬양예배 (45명)
        {
            "filename": "afternoon/KakaoTalk_Photo_2025-12-01-10-00-16 001.jpeg",
            "date": "2025-10-05",
            "service": "오후찬양예배",
            "anthem": "할렐루야",
            "offering_hymn_leader": "XXX",
            "total": 45,
            "breakdown": {"소프라노": 16, "알토": 14, "테너": 6, "베이스": 9},
            "rows": [
                {"row": 1, "count": 8, "members": ["최창운", "배사무엘", "이승균", "안강현", "임삼진", "김철우", "이철재", "문승현"]},
                {"row": 2, "count": 9, "members": ["오신영", "이승숙", "오홍철", "권인영", "김창동", "안상은", "이규락", "박재용", "하범"]},
                {"row": 3, "count": 10, "members": ["현성희", "이선미", "손기순", "문희", "오연분", "김희진", "이상미", "민경실", "염동주", "최유진"]},
                {"row": 4, "count": 9, "members": ["김지영", "신나래", "이광숙", "김민식", "임희정", "이윤옥", "최연희", "이지영", "백성원"]},
                {"row": 5, "count": 9, "members": ["이영란", "김정희", "김향숙", "김혜선", "강혜선", "심희숙", "민은옥", "김소옥", "최명희"]}
            ]
        },
        # 2. 2025-08-15 국극기도회 (59명)
        {
            "filename": "afternoon/KakaoTalk_Photo_2025-12-01-10-00-16 002.jpeg",
            "date": "2025-08-15",
            "service": "국극기도회",
            "anthem": "이 땅의 통과 서 남과 북",
            "offering_hymn_leader": "",
            "total": 59,
            "breakdown": {"소프라노": 23, "알토": 15, "테너": 9, "베이스": 12},
            "rows": [
                {"row": 1, "count": 8, "members": ["김학영", "최창운", "홍영은", "이승균", "박재용", "이철재", "김택훈", "안형준"]},
                {"row": 2, "count": 9, "members": ["오신영", "이승숙", "이강봉", "김상목", "배사무엘", "김창동", "이규락", "하범", "문승현"]},
                {"row": 3, "count": 11, "members": ["임신애", "신나래", "김지영", "오홍철", "안강현", "김대영", "남승호", "김성휘", "이경진", "이은주", "최승운"]},
                {"row": 4, "count": 10, "members": ["현성희", "이선미", "노은숙", "김은혜", "이수지", "이영란", "김희진", "김이정", "이상미", "염동주"]},
                {"row": 5, "count": 11, "members": ["이광숙", "임희정", "손기순", "문희", "오연분", "신수정", "이윤옥", "이지영", "백성원", "김영정", "최유진"]},
                {"row": 6, "count": 10, "members": ["김지혜", "김문희", "이선미", "김정희", "김향숙", "김혜선", "강혜선", "심희숙", "민은옥", "김소옥"]}
            ]
        },
        # 3. 2025-07-27 오후찬양예배 (57명)
        {
            "filename": "afternoon/KakaoTalk_Photo_2025-12-01-10-00-16 003.jpeg",
            "date": "2025-07-27",
            "service": "오후찬양예배",
            "anthem": "오직 주만이",
            "offering_hymn_leader": "",
            "total": 57,
            "breakdown": {"소프라노": 22, "알토": 14, "테너": 9, "베이스": 12},
            "rows": [
                {"row": 1, "count": 10, "members": ["황봉식", "김학영", "(정현석)", "최창운", "이승균", "임삼진", "박재용", "이규락", "하범", "김택훈"]},
                {"row": 2, "count": 11, "members": ["안강현", "이강봉", "배사무엘", "권인영", "김대영", "남승호", "안상은", "김창동", "김성휘", "이경진", "문승현"]},
                {"row": 3, "count": 12, "members": ["현성희", "이선미", "이승숙", "신나래", "손기순", "김은혜", "임신애", "최해경", "김이정", "김수영", "김은영", "염동주"]},
                {"row": 4, "count": 12, "members": ["김진희", "김지영", "이광숙", "임희정", "김민식", "문희", "오연분", "변소정", "안은희", "김희진", "백성원", "김영정"]},
                {"row": 5, "count": 12, "members": ["오신영", "김지혜", "이영란", "김문희", "서현숙", "김정희", "김향숙", "강혜선", "심희숙", "이상미", "최명희", "최유진"]}
            ]
        },
        # 4. 2025-03-02 오후찬양예배 (52명)
        {
            "filename": "afternoon/KakaoTalk_Photo_2025-12-01-10-00-17 004.jpeg",
            "date": "2025-03-02",
            "service": "오후찬양예배",
            "anthem": "내 영혼아 여호와를 송축하라",
            "offering_hymn_leader": "",
            "total": 52,
            "breakdown": {"소프라노": 19, "알토": 15, "테너": 8, "베이스": 11},
            "rows": [
                {"row": 1, "count": 10, "members": ["정현석", "김학영", "최창운", "배사무엘", "이승균", "이경진", "박재용", "하범", "문승현", "안형준"]},
                {"row": 2, "count": 11, "members": ["김지영", "신나래", "김은혜", "안강현", "오홍철", "권인영", "김대영", "남승호", "이기형", "안상은", "김창동"]},
                {"row": 3, "count": 10, "members": ["현성희", "이선미", "이광숙", "김민식", "최해경", "김희진", "이상미", "김이정", "염동주", "김은영"]},
                {"row": 4, "count": 11, "members": ["이승숙", "손기순", "문희", "오연분", "서현숙", "이영란", "이혜연", "이윤옥", "민은옥", "이지영", "최유진"]},
                {"row": 5, "count": 10, "members": ["김지혜", "김소라", "김문희", "김정희", "김혜선", "강혜선", "심희숙", "김소옥", "최명희", "이건자"]}
            ]
        },
        # 5. 2025-01-12 오후찬양예배 (53명) - 이미 처리된 데이터와 중복
        {
            "filename": "afternoon/KakaoTalk_Photo_2025-12-01-10-00-17 005.jpeg",
            "date": "2025-01-12",
            "service": "오후찬양예배",
            "anthem": "새 노래로 여호와께 노래하라",
            "offering_hymn_leader": "",
            "total": 53,
            "breakdown": {"소프라노": 20, "알토": 15, "테너": 10, "베이스": 9},
            "rows": [
                {"row": 1, "count": 9, "members": ["황봉식", "김학영", "정현석", "최창운", "이승균", "김창동", "박재용", "하범", "안형준"]},
                {"row": 2, "count": 10, "members": ["신나래", "최광영", "이상조", "안강현", "권인영", "김대영", "남승호", "이기형", "안상은", "이경진"]},
                {"row": 3, "count": 11, "members": ["현성희", "임신애", "이승숙", "이선미", "김지혜", "최해경", "김이정", "김혜경", "김수영", "이은주", "김은영"]},
                {"row": 4, "count": 12, "members": ["김지영", "이광숙", "이선미", "손기순", "문희", "오연분", "이영란", "이윤옥", "김영정", "백성원", "이상미", "최유진"]},
                {"row": 5, "count": 11, "members": ["김소라", "서현숙", "김문희", "김정희", "김향숙", "김혜선", "강혜선", "심희숙", "김소옥", "이지영", "최명희"]}
            ]
        }
    ]

    # 기존 OCR 데이터 로드
    ocr_file = Path(__file__).parent.parent / "training_data" / "seat_arrangements_ocr.json"
    with open(ocr_file, 'r', encoding='utf-8') as f:
        existing_data = json.load(f)

    print(f"📂 기존 데이터: {len(existing_data)}개")

    # 새 데이터 추가
    existing_data.extend(afternoon_data)

    # 저장
    with open(ocr_file, 'w', encoding='utf-8') as f:
        json.dump(existing_data, f, ensure_ascii=False, indent=2)

    print(f"✅ {len(afternoon_data)}개의 오후찬양예배 데이터 추가 완료")
    print(f"📊 총 데이터: {len(existing_data)}개")

    # 서비스별 분석
    service_counts = {}
    for data in existing_data:
        service = data.get('service', '2부예배')
        service_counts[service] = service_counts.get(service, 0) + 1

    print(f"\n서비스별 분포:")
    for service, count in sorted(service_counts.items()):
        print(f"  {service}: {count}회")

    # 인원 범위
    totals = [d['total'] for d in existing_data]
    print(f"\n총 인원 범위: {min(totals)}명 ~ {max(totals)}명")
    print(f"평균 인원: {sum(totals) / len(totals):.1f}명")

if __name__ == "__main__":
    add_afternoon_ocr_data()
