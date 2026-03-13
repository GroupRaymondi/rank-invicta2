import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
    const { data, error } = await supabase
        .from('sales_processes')
        .select(`
            id, 
            contract_value, 
            paid_amount, 
            approval_status,
            client_name,
            payments (id, amount, installment_number, status)
        `)
        .eq('approval_status', 'PENDENTE_APROVACAO')
        .order('created_at', { ascending: false })
        .limit(3);
    
    console.log("Error:", error);
    console.log("Data:", JSON.stringify(data, null, 2));
}
test();
