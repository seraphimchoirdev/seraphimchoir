"""
metadata.total_members를 실제 seats 수로 수정
"""

import json

def fix_metadata_totals(input_file: str, output_file: str):
    print(f"🔧 metadata.total_members 수정 시작: {input_file}")

    with open(input_file, 'r', encoding='utf-8') as f:
        data = json.load(f)

    print(f"📊 총 {len(data)}개의 arrangement 처리")

    fixed_count = 0
    for idx, arrangement in enumerate(data):
        seats = arrangement.get('seats', [])
        metadata = arrangement.get('metadata', {})

        actual_total = len(seats)
        old_total = metadata.get('total_members', 0)

        if actual_total != old_total:
            print(f"  ⚠️  {arrangement['arrangement_id']}: {old_total}명 → {actual_total}명")
            metadata['total_members'] = actual_total
            fixed_count += 1

        # breakdown도 실제 파트별 count로 수정
        part_counts = {}
        for seat in seats:
            part = seat['part']
            # Part를 한글로 변환
            part_kr = {
                'SOPRANO': '소프라노',
                'ALTO': '알토',
                'TENOR': '테너',
                'BASS': '베이스',
                'SPECIAL': '특송'
            }.get(part, part)
            part_counts[part_kr] = part_counts.get(part_kr, 0) + 1

        metadata['breakdown'] = part_counts

    # 저장
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    print(f"\n✅ 수정 완료! {fixed_count}개 arrangement의 total_members 수정됨")
    print(f"📝 결과 저장: {output_file}")

    # 검증
    print("\n🔍 검증 (첫 5개 arrangement):")
    for i, arrangement in enumerate(data[:5]):
        arr_id = arrangement['arrangement_id']
        total = arrangement['metadata']['total_members']
        seats_count = len(arrangement['seats'])
        breakdown = arrangement['metadata']['breakdown']

        status = "✅" if seats_count == total else "❌"
        print(f"  {i+1}. {arr_id}: metadata={total}명, seats={seats_count}석 {status}")
        print(f"      Breakdown: {breakdown}")

if __name__ == '__main__':
    input_path = 'training_data/ml_training_data.json'
    output_path = 'training_data/ml_training_data.json'

    fix_metadata_totals(input_path, output_path)
