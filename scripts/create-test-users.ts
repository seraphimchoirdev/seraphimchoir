import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
    console.error('Error: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false,
    },
});

// 각 역할별 테스트 계정
// 역할 체계:
// - ADMIN: 시스템 관리자 (모든 권한)
// - CONDUCTOR: 지휘자 (자리배치 편집, 대원 관리, 출석 관리)
// - MANAGER: 총무/부총무 (대원 관리, 출석 관리, 문서 관리)
// - STAFF: 대장, 서기, 회계 등 (조회 위주)
// - PART_LEADER: 파트장 (자기 파트 출석 관리)
// - MEMBER: 일반 대원 (내 출석, 자리배치표 조회)
const users = [
    // ADMIN - 시스템 관리자
    {
        email: 'admin@test.com',
        password: 'admin3586',
        name: '관리자',
        role: 'ADMIN',
        title: '시스템관리자',
    },
    // CONDUCTOR - 지휘자
    {
        email: 'conductor@test.com',
        password: 'test1234',
        name: '지휘자',
        role: 'CONDUCTOR',
        title: '지휘자',
    },
    // MANAGER - 총무
    {
        email: 'manager@test.com',
        password: 'test1234',
        name: '총무',
        role: 'MANAGER',
        title: '총무',
    },
    // STAFF - 서기
    {
        email: 'staff@test.com',
        password: 'test1234',
        name: '서기',
        role: 'STAFF',
        title: '서기',
    },
    // PART_LEADER - 각 파트별 파트장
    {
        email: 'soprano@test.com',
        password: 'test1234',
        name: '소프라노 파트장',
        role: 'PART_LEADER',
        title: '소프라노 파트장',
    },
    {
        email: 'alto@test.com',
        password: 'test1234',
        name: '알토 파트장',
        role: 'PART_LEADER',
        title: '알토 파트장',
    },
    {
        email: 'tenor@test.com',
        password: 'test1234',
        name: '테너 파트장',
        role: 'PART_LEADER',
        title: '테너 파트장',
    },
    {
        email: 'bass@test.com',
        password: 'test1234',
        name: '베이스 파트장',
        role: 'PART_LEADER',
        title: '베이스 파트장',
    },
    // MEMBER - 일반 대원
    {
        email: 'member@test.com',
        password: 'test1234',
        name: '일반 대원',
        role: 'MEMBER',
        title: null,
    },
];

async function createTestUsers() {
    console.log('Creating test users...');

    for (const user of users) {
        try {
            // 1. Check if user exists
            const { data: existingUsers, error: searchError } = await supabase.auth.admin.listUsers();

            if (searchError) {
                console.error(`Error listing users: ${searchError.message}`);
                continue;
            }

            const existingUser = existingUsers.users.find(u => u.email === user.email);
            let userId = existingUser?.id;

            if (!userId) {
                // 2. Create user if not exists
                const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
                    email: user.email,
                    password: user.password,
                    email_confirm: true,
                    user_metadata: { name: user.name },
                });

                if (createError) {
                    console.error(`Error creating user ${user.email}: ${createError.message}`);
                    continue;
                }

                userId = newUser.user.id;
                console.log(`Created user: ${user.email}`);
            } else {
                console.log(`User already exists: ${user.email}`);
            }

            // 3. Update user profile role
            // Note: The trigger might have created the profile, but we need to set the role.
            // We can update the profile directly if we have RLS bypass or if we are admin.
            // Since we are using service_role key, we can bypass RLS.

            const { error: updateError } = await supabase
                .from('user_profiles')
                .update({ role: user.role, name: user.name, title: user.title })
                .eq('id', userId);

            if (updateError) {
                console.error(`Error updating profile for ${user.email}: ${updateError.message}`);
            } else {
                console.log(`Updated role for ${user.email} to ${user.role}`);
            }

        } catch (error) {
            console.error(`Unexpected error processing ${user.email}:`, error);
        }
    }

    console.log('Done!');
}

createTestUsers();
