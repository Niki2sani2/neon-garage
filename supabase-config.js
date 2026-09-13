const SUPABASE_URL = "https://zjmbetytbwdllkuoqajp.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_MD6VTpJyuIX8qO6p_iB6Lg_FWyIFxHJ";

window.supabaseClient = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_PUBLISHABLE_KEY
);
