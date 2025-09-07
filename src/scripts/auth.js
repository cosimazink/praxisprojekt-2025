import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config.js';
import { createClient } from 'https://esm.sh/@supabase/supabase-js';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Liefert gültige Session oder wirft, wenn nicht eingeloggt
export async function requireSession() {
  const { data: { session } } = await supabase.auth.getSession();
  if (session) return session;

  // einfache Login-UI per prompt (magischer Link)
  const email = window.prompt("Bitte gib deine E-Mail ein, um dich anzumelden (Magic Link).");
  if (!email) throw new Error("Login abgebrochen.");

  const { error } = await supabase.auth.signInWithOtp({ email });
  if (error) throw error;

  alert("Checke deine E-Mails – Magic Link anklicken. Danach die Seite neu laden.");
  throw new Error("Warte auf Magic Link Bestätigung.");
}

// Gibt immer (wenn vorhanden) Access Token & User-ID zurück
export async function getAuth() {
  const { data: { session } } = await supabase.auth.getSession();
  return {
    token: session?.access_token || null,
    userId: session?.user?.id || null
  };
}
