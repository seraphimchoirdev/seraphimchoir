#!/usr/bin/env npx tsx

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('환경 변수가 설정되지 않았습니다.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  const names = ['김진희', '최해경', '오연분', '김혜선', '김향숙'];

  const { data, error } = await supabase
    .from('members')
    .select('id, name, part')
    .in('name', names);

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log('\nDB 멤버 파트 확인:');
  console.log('| 멤버명 | DB 파트 | ID |');
  console.log('|--------|---------|-----|');
  for (const m of data || []) {
    console.log(`| ${m.name} | ${m.part} | ${m.id.substring(0, 8)}... |`);
  }
}

main();
