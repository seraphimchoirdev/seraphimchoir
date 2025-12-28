import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
    process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function verify() {
    console.log('Verifying data...');

    // 1. Check Member
    const { data: member } = await supabase
        .from('members')
        .select('*')
        .eq('name', '김대영')
        .single();

    console.log('Member 김대영:', member?.email, member?.part);

    // 2. Check User Profile
    const { data: users } = await supabase.auth.admin.listUsers();
    const user = users.users.find(u => u.email === 'bass@example.com');

    if (user) {
        const { data: profile } = await supabase
            .from('user_profiles')
            .select('*')
            .eq('id', user.id)
            .single();
        console.log('Profile bass@example.com:', profile?.role);
    } else {
        console.log('User bass@example.com not found');
    }
}

verify();
