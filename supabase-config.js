const SUPABASE_URL = "https://zjmbetytbwdllkuoqajp.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_MD6VTpJyuIX8qO6p_iB6Lg_FWyIFxHJ";

window.supabaseClient = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_PUBLISHABLE_KEY
);

async function initNeonPlayer() {
    // Prüfen, ob dieser Browser bereits angemeldet ist
    const {
        data: { session },
        error: sessionError
    } = await window.supabaseClient.auth.getSession();

    if (sessionError) {
        console.error("Neon Garage Session Error:", sessionError);
        return;
    }

    let user = session?.user || null;

    // Wenn noch kein User existiert -> anonym anmelden
    if (!user) {
        const { data, error } =
            await window.supabaseClient.auth.signInAnonymously();

        if (error) {
            console.error("Neon Garage Login Error:", error);
            return;
        }

        user = data.user;
    }

    console.log("Neon Garage User:", user.id);

    // Prüfen, ob der Spieler schon in players existiert
    const { data: existingPlayer, error: playerError } =
        await window.supabaseClient
            .from("players")
            .select("*")
            .eq("user_id", user.id)
            .maybeSingle();

    if (playerError) {
        console.error("Neon Garage Player Error:", playerError);
        return;
    }

    // Spieler existiert bereits
    if (existingPlayer) {
        window.neonPlayer = existingPlayer;
        console.log("Neon Garage Player geladen:", existingPlayer);
        return;
    }

    // Neuer Spieler
    const guestName =
        "Guest_" + user.id.replaceAll("-", "").slice(0, 8);

    const { data: newPlayer, error: insertError } =
        await window.supabaseClient
            .from("players")
            .insert({
                user_id: user.id,
                username: guestName
            })
            .select()
            .single();

    if (insertError) {
        console.error("Neon Garage Player Create Error:", insertError);
        return;
    }

    window.neonPlayer = newPlayer;

    console.log("Neon Garage Player erstellt:", newPlayer);
}

initNeonPlayer();
