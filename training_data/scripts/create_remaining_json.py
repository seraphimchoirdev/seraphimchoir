#!/usr/bin/env python3
"""
나머지 5개 이미지의 ML 학습 데이터 JSON 파일 생성 스크립트
- Row 1은 지휘자에 가까운 쪽 (이미지 하단)
"""
import json
from pathlib import Path

# Supabase에서 조회한 회원 데이터 (name -> id 매핑)
MEMBERS = {
    "강재은": "4dcfbf88-a614-40b0-a28b-65e133872267",
    "강혜선": "24586c3f-b507-4891-8f23-c00fd6b3ab0f",
    "고연주": "6198380d-30ac-4f91-afb0-da8f71a933fe",
    "권인영": "91be141f-82e6-4d17-8209-7b7f5d42b079",
    "김대영": "bed5894d-5b4e-451a-a0d8-39c5682d3f40",
    "김문희": "9fcc9951-2158-47c5-a833-df1a5ef0627e",
    "김민식": "c909690e-6f93-449b-8676-e1587014cd95",
    "김상목": "27ddae26-185e-4e45-9a76-5896926a5d67",
    "김성휘": "1eab806e-64f7-4edd-8fc6-67b0048b8c39",
    "김소라": "8b20ec0d-d3c7-4da0-afda-9987a9eacd3b",
    "김소옥": "30e839a2-45f1-4680-ad56-43e1994e09ee",
    "김수영": "bae7f08a-8d49-4cb1-9e7e-5339b4aa351e",
    "김영정": "43d60188-705f-4b38-b00b-40b3a0ac65e4",
    "김윤희": "0a43f610-5fe2-48ce-9d4b-5f4153252d3a",
    "김은영": "ae961512-6b5a-4509-a01a-1cc5237279b7",
    "김은혜": "68b17764-0422-4c1e-913f-e7b694a1ddc4",
    "김이정": "96e9f64f-5701-48e6-8d1c-01383a1a7e82",
    "김재원": "11ea7452-c905-4aed-be61-827adca539c2",
    "김정숙": "23c3fc63-610a-427c-9add-6ed06b443bd2",
    "김정희": "3f50ca7f-6873-4d60-b77d-0e80166ea0e8",
    "김지영": "1bc52640-34d9-4f04-8924-35148be6a10c",
    "김지혜": "d64140cf-224e-4417-b0ac-4071f727c59a",
    "김진희": "bcbd596d-78d7-40e0-9522-cc65f2eaea1b",
    "김창동": "c59a63b5-dfe9-4973-80cc-bae13a02fe3d",
    "김철우": "b07f5e8d-e92f-48c6-98af-8e8c47e13c20",
    "김택훈": "6ff3eb37-475b-4f45-a67c-83dedef9766f",
    "김학영": "77af715f-ca5e-4309-be94-3d4e87ea3109",
    "김한빛": "20ca6ff9-0a3b-4a56-8830-37ae4ec2331b",
    "김향숙": "a82defbb-615d-4280-84fc-2793d7a81350",
    "김혜선": "23d9b1ea-729f-4890-b6a9-cb282ec12b67",
    "김희진": "5d06a005-b9bf-4351-b6dc-147d0121cdcd",
    "남승호": "2a34976e-b300-46f8-8b30-a2f28c8745c0",
    "노은숙": "3452f38e-35dc-4f05-9327-011c8e9edb7f",
    "문승현": "3b9a3c3c-9653-4374-a400-626187d06b05",
    "문희": "c023a373-54a2-42a5-a5c2-35a539bb019e",
    "민경실": "7fe9a6c5-b1fe-4c7d-b0ff-f7e048d05f6b",
    "민은홍": "a905189a-18ce-4b3c-aff0-c74f1926e52a",
    "박재용": "c95491d5-d146-4d3f-926d-a188949f560e",
    "방진경": "4cf7ff9d-9f77-4573-8463-91a2438965ad",
    "배사무엘": "a51f5c43-4a1a-4e35-9a99-62e0aa370dac",
    "백성원": "05a953d7-52dc-4838-9e55-f1e6360751d1",
    "백한나": "8cb110cd-c64d-453e-a798-970d2ffc53a4",
    "변성식": "2607cdd1-955f-4f03-938b-c23c9a4ec221",
    "변소정": "d4d66444-4e84-4a8a-a51b-2dc7c361a964",
    "서현숙": "e09947c5-fb15-4b58-ab81-ca5ee44b3748",
    "손기순": "1e5a9347-9cc1-4d67-9d08-10f2e851c3a7",
    "신나래": "46e6b790-ae99-4f2c-b271-af71aa81cdb3",
    "신수정": "c9a92c9f-4df2-416e-821b-ae9eaac301dd",
    "심희숙": "aafc7de7-11bd-4baa-ab60-6c3ad348de44",
    "안강현": "9abee5d5-86c7-4bc4-8379-e7e8b92c7439",
    "안상은": "f9000126-918e-4a84-b5bb-119031d619e5",
    "안은희": "355ab732-17c8-42ea-9d96-9ae4cbbace16",
    "안형준": "d147fff1-b04c-4f19-9714-3e25e19dea2a",
    "양승진": "762b8a0e-1c82-4342-86c0-1cf86e4040f0",
    "양아름": "ab152b8d-28ba-4586-b650-d564b09e75dd",
    "염용주": "902efc7c-4156-4cc7-a2b7-ac7980c87487",
    "오신영": "2dbd8064-5cf1-405e-b4d0-928ee6f1359a",
    "오연분": "ed555475-fa3d-4fac-ab61-4cd2aae9ddc4",
    "오흥철": "142c1173-784a-4c7a-92a8-7b8a2013f9c1",
    "이강봉": "115dd199-8cbc-4426-9729-dfeb66430b85",
    "이건자": "373deb7c-fb31-4475-a230-d2bb913aa8b2",
    "이경진": "d1de8297-09a2-4b3e-8b11-cbd8925dc12d",
    "이광숙": "e14ba908-f39d-4d3e-a57c-26244bd900c5",
    "이규락": "8eb5efae-4de1-41b3-bc94-dba54a4bbb7b",
    "이기형": "5c969616-846f-4627-bf28-163c35d9730c",
    "이문형": "913b9610-0c12-40bc-9f65-79d88cab7041",
    "이상미": "211a621d-aaeb-4019-b036-f4ed0681a698",
    "이상조": "c2b38a03-5853-4c22-93e8-4cda01083a41",
    "이선미": "21fe177f-7d18-4841-be60-cf71d49f7230",
    "이선아": "4976844a-319c-45f2-8701-d007b45ab337",
    "이수지": "c25cbbfa-8e4d-4cce-8225-3f72365dd289",
    "이승균": "b91dac44-55bc-48c5-b158-546c25c62dfc",
    "이승숙": "143c3ea1-e209-419b-8263-8de870014833",
    "이영란": "9352769c-1efa-42f7-9ad7-fcf7e3acb645",
    "이원섭": "d616cd1e-5361-43cd-8ed3-eb84624ace63",
    "이윤옥": "ca4eef10-84dd-474f-b846-82a37c3eac51",
    "이은주": "b428b5e2-96bc-43be-8057-5f563c1a6a4c",
    "이은혜": "0682bd16-ab1a-4fec-983a-ded1c3365365",
    "이지영": "338af00b-a855-4ab6-8eeb-bfd18a4e9363",
    "이철재": "0f6fe1fc-3818-4c3e-9d73-767bb1e638df",
    "이혜연": "ecd238b8-79dd-49a0-a8a0-e45a233c6c10",
    "임삼진": "7e628534-28aa-451d-b114-9fd00d1c34dc",
    "임서연": "00b9c276-0b3b-49bd-819f-4dbdbefc8c23",
    "임신애": "108cb6e4-756a-4842-8e01-9352942cd787",
    "임찬섭": "a2526bcd-c7e7-4540-9edb-5334c38d9fa4",
    "임희정": "03cd8319-62c3-4f1e-a056-6f3e8a17b2fa",
    "정진문": "814e33ee-eb0c-4f40-8dc3-abf0b21cb879",
    "정현석": "01dc2272-facb-4209-bd17-b259742b78a9",
    "최광열": "024c842b-0818-47eb-bdc6-c2dd4ddf5fcc",
    "최명희": "6ba6680a-fe5d-4e24-a7f0-a918c5fdca96",
    "최승운": "a435a908-ff75-4a48-a292-fc37063a6084",
    "최신규": "ec7b9d91-689d-4c8c-84b0-4b6b3f3753f5",
    "최연희": "c1195bdc-122f-42b9-8b79-15bdffe2c95b",
    "최유진": "f2295256-ece2-44e0-8101-f73d48e7f850",
    "최종현": "57a7a1d4-15be-442f-9e43-94cf3f4cf499",
    "최창운": "91051cd8-191e-4b44-a947-b42e73153129",
    "최해경": "cf592330-17aa-4dcf-b4bb-ec6486a2c803",
    "추민아": "5263d52a-6607-49de-a2fa-c8bb33877bed",
    "하범": "34c40bed-3457-4a6f-bd3a-b6b5ca284f19",
    "한만영": "aa2b788c-a38b-46b6-9945-8a97d021f2dd",
    "현성희": "8a9a8fc0-b27d-42d0-b4d9-cf92c7384611",
    "홍영은": "5c0aa7aa-54d8-4f21-89bf-757667abb155",
    "황봉식": "d91e69e1-96da-491f-86f2-903e34e15ac6",
}

# 파트 분류 (이름 기준)
PART_MAP = {
    # SOPRANO
    "김정숙": "SOPRANO", "오신영": "SOPRANO", "김진희": "SOPRANO", "신나래": "SOPRANO",
    "이승숙": "SOPRANO", "임신애": "SOPRANO", "김지영": "SOPRANO", "김한빛": "SOPRANO",
    "현성희": "SOPRANO", "이선아": "SOPRANO", "백한나": "SOPRANO", "김지혜": "SOPRANO",
    "이은혜": "SOPRANO", "추민아": "SOPRANO", "임서연": "SOPRANO", "고연주": "SOPRANO",
    "김소라": "SOPRANO", "김혜선": "SOPRANO", "노은숙": "SOPRANO", "이광숙": "SOPRANO",
    "손기순": "SOPRANO", "임희정": "SOPRANO", "최해경": "SOPRANO", "서현숙": "SOPRANO",
    "김문희": "SOPRANO", "이선미": "SOPRANO", "김정희": "SOPRANO", "김향숙": "SOPRANO",
    "강혜선": "SOPRANO", "심희숙": "SOPRANO", "민은홍": "SOPRANO", "김소옥": "SOPRANO",
    "안은희": "SOPRANO", "최명희": "SOPRANO", "이건자": "SOPRANO",
    # ALTO
    "이문형": "ALTO", "정진문": "ALTO", "홍영은": "ALTO", "이수지": "ALTO",
    "문희": "ALTO", "오연분": "ALTO", "신수정": "ALTO", "방진경": "ALTO",
    "권인영": "ALTO", "이영란": "ALTO", "김희진": "ALTO", "이혜연": "ALTO",
    "이윤옥": "ALTO", "최연희": "ALTO", "변소정": "ALTO", "김이정": "ALTO",
    "민경실": "ALTO", "염용주": "ALTO", "백성원": "ALTO", "김윤희": "ALTO",
    "김은영": "ALTO", "이지영": "ALTO", "김영정": "ALTO", "이상미": "ALTO",
    "최유진": "ALTO", "김은혜": "ALTO", "최승운": "ALTO",
    # TENOR
    "황봉식": "TENOR", "김학영": "TENOR", "최창운": "TENOR", "정현석": "TENOR",
    "김상목": "TENOR", "최광열": "TENOR", "안강현": "TENOR", "배사무엘": "TENOR",
    "이강봉": "TENOR", "변성식": "TENOR", "이승균": "TENOR", "김대영": "TENOR",
    "남승호": "TENOR", "안상은": "TENOR", "김창동": "TENOR",
    # BASS
    "임삼진": "BASS", "이경진": "BASS", "이규락": "BASS", "이철재": "BASS",
    "김철우": "BASS", "박재용": "BASS", "이원섭": "BASS", "문승현": "BASS",
    "하범": "BASS", "김택훈": "BASS", "안형준": "BASS", "김성휘": "BASS",
    "김수영": "BASS", "이은주": "BASS",
}


def get_member_id(name: str) -> str:
    """이름으로 member_id를 조회합니다."""
    # 공백 제거된 이름으로도 검색
    clean_name = name.replace(" ", "")
    if clean_name in MEMBERS:
        return MEMBERS[clean_name]
    if name in MEMBERS:
        return MEMBERS[name]
    return f"unknown_{name}"


def get_part(name: str) -> str:
    """이름으로 파트를 조회합니다."""
    clean_name = name.replace(" ", "")
    if clean_name in PART_MAP:
        return PART_MAP[clean_name]
    if name in PART_MAP:
        return PART_MAP[name]
    return "UNKNOWN"


def create_seat(name: str, row: int, col: int) -> dict:
    """좌석 데이터를 생성합니다."""
    clean_name = name.replace(" ", "")
    return {
        "member_id": get_member_id(clean_name),
        "member_name": clean_name,
        "part": get_part(clean_name),
        "height": None,
        "experience_years": 0,
        "is_part_leader": False,
        "row": row,
        "col": col
    }


def create_arrangement(date: str, service: str, anthem: str, offering_leader: str,
                      breakdown: dict, rows_data: list) -> dict:
    """배치 데이터를 생성합니다. rows_data는 row 1(지휘자에 가까운 쪽)부터 순서대로."""
    total = sum(breakdown.values())
    row_capacities = [len(row) for row in rows_data]

    seats = []
    for row_idx, row_names in enumerate(rows_data, start=1):
        for col_idx, name in enumerate(row_names, start=1):
            seats.append(create_seat(name, row_idx, col_idx))

    return {
        "arrangement_id": f"ocr_{date}_0",
        "date": date,
        "metadata": {
            "service": service,
            "anthem": anthem,
            "offering_hymn_leader": offering_leader,
            "total_members": total,
            "breakdown": breakdown
        },
        "grid_layout": {
            "rows": len(rows_data),
            "row_capacities": row_capacities,
            "zigzag_pattern": "even"
        },
        "seats": seats
    }


def save_json(data: dict, filename: str):
    """JSON 파일로 저장합니다."""
    output_dir = Path(__file__).parent.parent / 'ml_output'
    output_dir.mkdir(exist_ok=True)
    filepath = output_dir / filename
    with open(filepath, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    print(f"Created: {filename}")


def main():
    # 005: 2025-12-07 2부예배 (82명)
    # Row 1 (closest to conductor) -> Row 6 (furthest)
    data_005 = create_arrangement(
        date="2025-12-07",
        service="2부예배",
        anthem="문들아 머리들라",
        offering_leader="백한나",
        breakdown={"소프라노": 33, "알토": 22, "테너": 15, "베이스": 12},
        rows_data=[
            # Row 1 (bottom, closest to conductor) - 14명
            ["이은혜", "추민아", "김소라", "최해경", "이선미", "서현숙", "김정희", "김혜선", "강혜선", "심희숙", "민은홍", "안은희", "최명희", "최유진"],
            # Row 2 - 15명
            ["백한나", "김지혜", "김지영", "노은숙", "이광숙", "임희정", "신수정", "방진경", "이영란", "이혜연", "이윤옥", "최연희", "이지영", "김영정", "이상미"],
            # Row 3 - 16명
            ["현성희", "이선아", "신나래", "이문형", "이수지", "김은혜", "손기순", "문희", "오연분", "김희진", "변소정", "김이정", "민경실", "염용주", "김윤희", "김은영"],
            # Row 4 - 14명
            ["오신영", "임신애", "이승숙", "정진문", "이강봉", "안강현", "김상목", "권인영", "김대영", "이경진", "김성휘", "김수영", "이은주", "최승운"],
            # Row 5 - 12명
            ["김정숙", "김진희", "김한빛", "홍영은", "배사무엘", "변성식", "최광열", "김창동", "이규락", "이원섭", "박재용", "문승현"],
            # Row 6 (top, furthest from conductor) - 11명
            ["임서연", "고연주", "황봉식", "김학영", "정현석", "최창운", "이승균", "임삼진", "이철재", "김철우", "김택훈"],
        ]
    )
    save_json(data_005, "ml_2025-12-07_2부예배.json")

    # 006: 2025-11-30 2부주일예배 (85명)
    data_006 = create_arrangement(
        date="2025-11-30",
        service="2부주일예배",
        anthem="기뻐하며 찬양하라",
        offering_leader="권사중창단",
        breakdown={"소프라노": 35, "알토": 22, "테너": 15, "베이스": 13},
        rows_data=[
            # Row 1 (bottom, closest to conductor) - 15명
            ["이은혜", "김소라", "김문희", "서현숙", "김혜선", "이선미", "이영란", "김정희", "김향숙", "강혜선", "김소옥", "민은홍", "최명희", "심희숙", "이건자"],
            # Row 2 - 16명
            ["김지혜", "추민아", "노은숙", "임희정", "이광숙", "이선아", "김은혜", "손기순", "최해경", "이윤옥", "백성원", "김이정", "이상미", "최승운", "최연희", "김윤희"],
            # Row 3 - 16명
            ["현성희", "신나래", "임신애", "김지영", "이문형", "이수지", "신수정", "방진경", "문희", "오연분", "이혜연", "안은희", "변소정", "김희진", "최유진", "염용주"],
            # Row 4 - 15명
            ["백한나", "김진희", "이승숙", "정진문", "이강봉", "안강현", "김상목", "권인영", "김대영", "남승호", "김성휘", "이경진", "김수영", "이은주", "김은영"],
            # Row 5 - 12명
            ["김정숙", "오신영", "김한빛", "홍영은", "배사무엘", "변성식", "최광열", "김창동", "이규락", "이원섭", "김철우", "문승현"],
            # Row 6 (top, furthest from conductor) - 11명
            ["고연주", "임서연", "황봉식", "김학영", "정현석", "최창운", "이승균", "박재용", "이철재", "하범", "안형준"],
        ]
    )
    save_json(data_006, "ml_2025-11-30_2부주일예배.json")

    # 007: 2025-11-23 2부예배 (80명)
    data_007 = create_arrangement(
        date="2025-11-23",
        service="2부예배",
        anthem="예수가 거느리시니",
        offering_leader="김혜선",
        breakdown={"소프라노": 30, "알토": 22, "테너": 13, "베이스": 15},
        rows_data=[
            # Row 1 (bottom, closest to conductor) - 14명
            ["이은혜", "김혜선", "김소라", "이선미", "김문희", "서현숙", "김정희", "김향숙", "심희숙", "민은홍", "김소옥", "안은희", "최명희", "이건자"],
            # Row 2 - 15명
            ["김지혜", "추민아", "백한나", "이광숙", "임희정", "신수정", "방진경", "이영란", "이혜연", "이윤옥", "최연희", "이지영", "백성원", "김영정", "최유진"],
            # Row 3 - 15명
            ["현성희", "이선아", "김지영", "노은숙", "이수지", "손기순", "오연분", "최해경", "김희진", "김이정", "이상미", "염용주", "김윤희", "김은영", "최승운"],
            # Row 4 - 14명 (수정: 이미지에서 확인)
            ["임서연", "임신애", "정진문", "홍영은", "이강봉", "안강현", "권인영", "김대영", "남승호", "안상은", "이경진", "김수영", "이은주"],
            # Row 5 - 12명
            ["신나래", "이승숙", "김한빛", "배사무엘", "변성식", "최광열", "김창동", "이규락", "이원섭", "김철우", "박재용", "문승현"],
            # Row 6 (top, furthest from conductor) - 11명
            ["김정숙", "오신영", "김학영", "정현석", "최창운", "이승균", "임삼진", "이철재", "하범", "김택훈", "안형준"],
        ]
    )
    save_json(data_007, "ml_2025-11-23_2부예배.json")

    # 008: 2025-11-16 추수감사주일 찬양예배 (83명)
    data_008 = create_arrangement(
        date="2025-11-16",
        service="추수감사주일 찬양예배",
        anthem="멘델스존 시편 42편",
        offering_leader="",
        breakdown={"소프라노": 30, "알토": 24, "테너": 15, "베이스": 14},
        rows_data=[
            # Row 1 (bottom, closest to conductor) - 15명
            ["김혜선", "최해경", "임희정", "이선미", "김문희", "서현숙", "김정희", "김향숙", "강혜선", "심희숙", "민은홍", "김소옥", "안은희", "최명희", "이건자"],
            # Row 2 - 15명
            ["김소라", "추민아", "손기순", "문희", "오연분", "신수정", "방진경", "이영란", "이혜연", "이윤옥", "최연희", "이지영", "김영정", "이상미", "최유진"],
            # Row 3 - 16명
            ["김지혜", "이광숙", "오신영", "이승숙", "노은숙", "이문형", "이수지", "김은혜", "김희진", "변소정", "김이정", "민경실", "염용주", "김윤희", "김수영", "이은주"],
            # Row 4 - 15명
            ["현성희", "임신애", "김상목", "최광열", "안강현", "정진문", "배사무엘", "권인영", "김대영", "남승호", "김창동", "김철우", "이철재", "김은영", "최승운"],
            # Row 5 - 12명
            ["김지영", "신나래", "정현석", "최창운", "김한빛", "이강봉", "변성식", "안상은", "이원섭", "문승현", "하범", "김택훈"],
            # Row 6 (top, furthest from conductor) - 10명
            ["고연주", "임서연", "김학영", "황봉식", "홍영은", "이승균", "이경진", "이규락", "박재용", "안형준"],
        ]
    )
    save_json(data_008, "ml_2025-11-16_추수감사주일찬양예배.json")

    # 009: 2025-11-16 2부주일예배 (84명)
    data_009 = create_arrangement(
        date="2025-11-16",
        service="2부주일예배",
        anthem="내 영혼아 어찌하여",
        offering_leader="이시현2",
        breakdown={"소프라노": 31, "알토": 23, "테너": 15, "베이스": 15},
        rows_data=[
            # Row 1 (bottom, closest to conductor) - 15명
            ["김혜선", "최해경", "임희정", "이선미", "김문희", "서현숙", "김정희", "김향숙", "강혜선", "심희숙", "민은홍", "김소옥", "안은희", "최명희", "이건자"],
            # Row 2 - 15명
            ["김지혜", "김소라", "손기순", "문희", "오연분", "신수정", "방진경", "이영란", "이혜연", "이윤옥", "최연희", "이지영", "김영정", "이상미", "최유진"],
            # Row 3 - 16명
            ["이은혜", "백한나", "이광숙", "오신영", "이승숙", "노은숙", "이문형", "이수지", "김은혜", "김희진", "변소정", "김이정", "염용주", "김윤희", "김수영", "이은주"],
            # Row 4 - 15명
            ["현성희", "임신애", "김상목", "최광열", "안강현", "정진문", "배사무엘", "권인영", "김대영", "남승호", "김창동", "김철우", "이철재", "김은영", "최승운"],
            # Row 5 - 12명
            ["김정숙", "신나래", "정현석", "최창운", "김한빛", "이강봉", "변성식", "안상은", "이원섭", "문승현", "하범", "김택훈"],
            # Row 6 (top, furthest from conductor) - 11명
            ["임서연", "김지영", "김학영", "황봉식", "홍영은", "이승균", "임삼진", "이경진", "이규락", "박재용", "안형준"],
        ]
    )
    save_json(data_009, "ml_2025-11-16_2부주일예배.json")

    print("\nAll 5 JSON files created successfully!")


if __name__ == '__main__':
    main()
