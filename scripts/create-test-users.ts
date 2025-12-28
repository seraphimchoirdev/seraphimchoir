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

const users = [
    {
        email: 'conductor@example.com',
        password: 'password123',
        name: '지휘자',
        role: 'CONDUCTOR',
    },
    {
        email: 'soprano@example.com',
        password: 'password123',
        name: '소프라노 파트장',
        role: 'PART_LEADER',
    },
    {
        email: 'alto@example.com',
        password: 'password123',
        name: '알토 파트장',
        role: 'PART_LEADER',
    },
    {
        email: 'tenor@example.com',
        password: 'password123',
        name: '테너 파트장',
        role: 'PART_LEADER',
    },
    {
        email: 'bass@example.com',
        password: 'password123',
        name: '베이스 파트장',
        role: 'PART_LEADER',
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
                .update({ role: user.role, name: user.name })
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
