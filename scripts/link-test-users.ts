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

const links = [
    { email: 'soprano@test.com', name: '고연주' }, // Soprano
    { email: 'alto@test.com', name: '강혜선' },   // Alto
    { email: 'tenor@test.com', name: '권인영' },  // Tenor
    { email: 'bass@test.com', name: '김대영' },   // Bass
];

async function linkTestUsers() {
    console.log('Linking test users to members...');

    for (const link of links) {
        try {
            const { data, error } = await supabase
                .from('members')
                .update({ email: link.email })
                .eq('name', link.name)
                .select();

            if (error) {
                console.error(`Error linking ${link.email} to ${link.name}: ${error.message}`);
            } else if (data.length === 0) {
                console.warn(`Member not found: ${link.name}`);
            } else {
                console.log(`Linked ${link.email} to ${link.name} (${data[0].part})`);
            }
        } catch (error) {
            console.error(`Unexpected error processing ${link.email}:`, error);
        }
    }

    console.log('Done!');
}

linkTestUsers();
