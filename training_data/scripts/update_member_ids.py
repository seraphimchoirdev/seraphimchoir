#!/usr/bin/env python3
"""
ML 학습 데이터의 member_id를 Supabase DB 데이터로 업데이트하는 스크립트
"""
import json
import os
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
    "서헌숙": "e09947c5-fb15-4b58-ab81-ca5ee44b3748",
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

# OCR 오타 -> 실제 이름 매핑 (이름 별칭)
NAME_ALIASES = {
    "서현숙": "서헌숙",  # OCR 오타
    "황봉석": "황봉식",  # OCR 오타
    "문 희": "문희",     # 공백 포함
    "오연부": "오연분",  # OCR 오타
    "강해선": "강혜선",  # OCR 오타
    "하 범": "하범",     # 공백 포함
}


def update_json_file(filepath: str) -> dict:
    """JSON 파일을 읽고 member_id를 업데이트합니다."""
    with open(filepath, 'r', encoding='utf-8') as f:
        data = json.load(f)

    unmatched = []
    corrected = []
    for seat in data.get('seats', []):
        name = seat.get('member_name')
        # 별칭이 있으면 실제 이름으로 변환
        if name in NAME_ALIASES:
            actual_name = NAME_ALIASES[name]
            seat['member_name'] = actual_name
            corrected.append(f"{name} -> {actual_name}")
            name = actual_name

        if name in MEMBERS:
            seat['member_id'] = MEMBERS[name]
        else:
            unmatched.append(name)

    with open(filepath, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    return {'file': filepath, 'unmatched': unmatched, 'corrected': corrected}


def main():
    ml_output_dir = Path(__file__).parent.parent / 'ml_output'

    results = []
    for json_file in ml_output_dir.glob('ml_*.json'):
        result = update_json_file(str(json_file))
        results.append(result)
        print(f"Updated: {json_file.name}")
        if result.get('corrected'):
            print(f"  Corrected names: {result['corrected']}")
        if result['unmatched']:
            print(f"  Unmatched names: {result['unmatched']}")

    print(f"\nTotal files updated: {len(results)}")


if __name__ == '__main__':
    main()
