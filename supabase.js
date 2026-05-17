/* ═══════════════════════════════════════════════════════════════
   NEO-SUSU — Supabase Connection Module
   Site : https://lolaronke.github.io/neo-susu/
   Version : 1.0
   
   INSTRUCTIONS DE CONFIGURATION :
   1. Va sur https://supabase.com → New Project
   2. Remplace SUPABASE_URL et SUPABASE_ANON_KEY ci-dessous
   3. Exécute le SQL de création de tables (voir bas du fichier)
═══════════════════════════════════════════════════════════════ */

// ── CONFIGURATION ──────────────────────────────────────────────
const SUPABASE_URL = 'https://TON-PROJECT-ID.supabase.co';      // ← Remplace
const SUPABASE_ANON_KEY = 'TON-ANON-PUBLIC-KEY';                // ← Remplace

// URL de base de l'application
const APP_URL = 'https://lolaronke.github.io/neo-susu';

// ── INITIALISATION CLIENT SUPABASE ─────────────────────────────
const { createClient } = supabase;
const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/* ═══════════════════════════════════════════════════════════════
   AUTH — AUTHENTIFICATION
═══════════════════════════════════════════════════════════════ */

// Créer un compte
async function signUp(email, password, firstName, lastName, phone, country) {
  const { data, error } = await sb.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${APP_URL}/dashboard.html`,
      data: {
        first_name: firstName,
        last_name: lastName,
        phone: phone,
        country: country
      }
    }
  });
  if (error) throw error;

  // Créer le profil utilisateur dans la table profiles
  if (data.user) {
    await sb.from('profiles').insert({
      id: data.user.id,
      first_name: firstName,
      last_name: lastName,
      phone: phone,
      country: country,
      wallet: 0,
      score: 50,
      kyc_status: 'pending'
    });
  }
  return data;
}

// Connexion
async function signIn(email, password) {
  const { data, error } = await sb.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

// Connexion avec Google
async function signInWithGoogle() {
  const { data, error } = await sb.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: `${APP_URL}/dashboard.html` }
  });
  if (error) throw error;
  return data;
}

// Connexion avec téléphone (OTP SMS)
async function signInWithPhone(phone) {
  const { data, error } = await sb.auth.signInWithOtp({ phone });
  if (error) throw error;
  return data;
}

// Vérifier OTP téléphone
async function verifyOtp(phone, token) {
  const { data, error } = await sb.auth.verifyOtp({
    phone, token, type: 'sms'
  });
  if (error) throw error;
  return data;
}

// Déconnexion
async function signOut() {
  const { error } = await sb.auth.signOut();
  if (error) throw error;
  window.location.href = './index.html';
}

// Mot de passe oublié
async function resetPassword(email) {
  const { data, error } = await sb.auth.resetPasswordForEmail(email, {
    redirectTo: `${APP_URL}/reset-password.html`
  });
  if (error) throw error;
  return data;
}

// Obtenir l'utilisateur connecté
async function getCurrentUser() {
  const { data: { user } } = await sb.auth.getUser();
  return user;
}

// Obtenir le profil complet
async function getUserProfile(userId) {
  const { data, error } = await sb.from('profiles')
    .select('*')
    .eq('id', userId)
    .single();
  if (error) throw error;
  return data;
}

// Mettre à jour le profil
async function updateProfile(userId, updates) {
  const { data, error } = await sb.from('profiles')
    .update(updates)
    .eq('id', userId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

// Vérifier si connecté (redirige si non)
async function requireAuth(redirectTo = './login.html') {
  const user = await getCurrentUser();
  if (!user) {
    window.location.href = redirectTo;
    return null;
  }
  return user;
}

/* ═══════════════════════════════════════════════════════════════
   TONTINES — GESTION DES GROUPES
═══════════════════════════════════════════════════════════════ */

// Créer une tontine
async function createTontine(data) {
  const user = await getCurrentUser();
  if (!user) throw new Error('Non connecté');

  // Générer un code d'invitation unique
  const code = generateInviteCode();

  const { data: tontine, error } = await sb.from('tontines').insert({
    name: data.name,
    description: data.description,
    amount: data.amount,
    currency: data.currency,
    frequency: data.frequency,
    max_members: data.maxMembers,
    start_date: data.startDate,
    creator_id: user.id,
    invite_code: code,
    status: 'active'
  }).select().single();

  if (error) throw error;

  // Ajouter le créateur comme premier membre
  await sb.from('tontine_members').insert({
    tontine_id: tontine.id,
    user_id: user.id,
    position: 1,
    status: 'active',
    joined_at: new Date().toISOString()
  });

  return tontine;
}

// Rejoindre une tontine par code
async function joinTontine(inviteCode) {
  const user = await getCurrentUser();
  if (!user) throw new Error('Non connecté');

  // Trouver la tontine
  const { data: tontine, error: tErr } = await sb.from('tontines')
    .select('*')
    .eq('invite_code', inviteCode.toUpperCase())
    .eq('status', 'active')
    .single();

  if (tErr) throw new Error('Code invalide ou tontine introuvable');

  // Vérifier qu'il reste de la place
  const { count } = await sb.from('tontine_members')
    .select('*', { count: 'exact' })
    .eq('tontine_id', tontine.id);

  if (count >= tontine.max_members) throw new Error('Tontine complète');

  // Vérifier que l'user n'est pas déjà membre
  const { data: existing } = await sb.from('tontine_members')
    .select('id')
    .eq('tontine_id', tontine.id)
    .eq('user_id', user.id)
    .single();

  if (existing) throw new Error('Vous êtes déjà membre de cette tontine');

  // Ajouter le membre
  const { data: member, error: mErr } = await sb.from('tontine_members').insert({
    tontine_id: tontine.id,
    user_id: user.id,
    position: count + 1,
    status: 'active',
    joined_at: new Date().toISOString()
  }).select().single();

  if (mErr) throw mErr;
  return { tontine, member };
}

// Récupérer mes tontines
async function getMyTontines() {
  const user = await getCurrentUser();
  if (!user) throw new Error('Non connecté');

  const { data, error } = await sb.from('tontine_members')
    .select(`
      *,
      tontines (
        id, name, description, amount, currency,
        frequency, max_members, start_date, status,
        invite_code, creator_id,
        tontine_members (count)
      )
    `)
    .eq('user_id', user.id)
    .eq('status', 'active');

  if (error) throw error;
  return data;
}

// Récupérer le détail d'une tontine
async function getTontineDetail(tontineId) {
  const { data, error } = await sb.from('tontines')
    .select(`
      *,
      tontine_members (
        *,
        profiles (id, first_name, last_name, score, kyc_status)
      ),
      payments (*)
    `)
    .eq('id', tontineId)
    .single();

  if (error) throw error;
  return data;
}

/* ═══════════════════════════════════════════════════════════════
   PAIEMENTS — COTISATIONS & TRANSACTIONS
═══════════════════════════════════════════════════════════════ */

// Enregistrer un paiement de cotisation
async function recordPayment(tontineId, amount, method) {
  const user = await getCurrentUser();
  if (!user) throw new Error('Non connecté');

  const { data, error } = await sb.from('payments').insert({
    tontine_id: tontineId,
    payer_id: user.id,
    amount: amount,
    method: method,
    status: 'completed',
    paid_at: new Date().toISOString()
  }).select().single();

  if (error) throw error;

  // Mettre à jour le score de l'utilisateur
  await updateScore(user.id, 5); // +5 points pour paiement à temps

  return data;
}

// Historique des transactions
async function getTransactions(userId) {
  const { data, error } = await sb.from('payments')
    .select(`*, tontines (name)`)
    .eq('payer_id', userId)
    .order('paid_at', { ascending: false })
    .limit(50);

  if (error) throw error;
  return data;
}

/* ═══════════════════════════════════════════════════════════════
   SCORE DE FIABILITÉ
═══════════════════════════════════════════════════════════════ */

async function updateScore(userId, points) {
  const { data: profile } = await sb.from('profiles')
    .select('score')
    .eq('id', userId)
    .single();

  const newScore = Math.min(100, Math.max(0, (profile?.score || 50) + points));

  await sb.from('profiles')
    .update({ score: newScore })
    .eq('id', userId);

  return newScore;
}

/* ═══════════════════════════════════════════════════════════════
   PORTEFEUILLE (WALLET)
═══════════════════════════════════════════════════════════════ */

async function getWallet(userId) {
  const { data, error } = await sb.from('profiles')
    .select('wallet')
    .eq('id', userId)
    .single();
  if (error) throw error;
  return data.wallet;
}

async function updateWallet(userId, amount, type, details = {}) {
  const current = await getWallet(userId);
  const newBalance = current + amount;

  if (newBalance < 0) throw new Error('Solde insuffisant');

  await sb.from('profiles')
    .update({ wallet: newBalance })
    .eq('id', userId);

  // Enregistrer la transaction
  await sb.from('wallet_transactions').insert({
    user_id: userId,
    amount: amount,
    type: type,
    balance_after: newBalance,
    details: details,
    created_at: new Date().toISOString()
  });

  return newBalance;
}

/* ═══════════════════════════════════════════════════════════════
   TOKENS QR — RETRAIT CASH
═══════════════════════════════════════════════════════════════ */

async function createWithdrawToken(userId, amount) {
  const wallet = await getWallet(userId);
  if (amount > wallet) throw new Error('Solde insuffisant');

  const token = 'NS-' + Math.random().toString(36).substring(2, 8).toUpperCase();
  const expiration = new Date(Date.now() + 48 * 3600 * 1000).toISOString();

  const { data, error } = await sb.from('withdraw_tokens').insert({
    user_id: userId,
    token: token,
    amount: amount,
    expiration: expiration,
    used: false,
    created_at: new Date().toISOString()
  }).select().single();

  if (error) throw error;
  return data;
}

async function consumeWithdrawToken(token) {
  const { data: tokenData, error } = await sb.from('withdraw_tokens')
    .select('*')
    .eq('token', token)
    .eq('used', false)
    .single();

  if (error || !tokenData) throw new Error('Code invalide');
  if (new Date(tokenData.expiration) < new Date()) throw new Error('Code expiré (48h)');

  // Marquer comme utilisé
  await sb.from('withdraw_tokens')
    .update({ used: true, used_at: new Date().toISOString() })
    .eq('token', token);

  // Débiter le wallet
  await updateWallet(tokenData.user_id, -tokenData.amount, 'retrait_cash', { token });

  return tokenData;
}

/* ═══════════════════════════════════════════════════════════════
   NOTIFICATIONS TEMPS RÉEL
═══════════════════════════════════════════════════════════════ */

function subscribeToTontine(tontineId, onPayment) {
  return sb.channel(`tontine-${tontineId}`)
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'payments',
      filter: `tontine_id=eq.${tontineId}`
    }, onPayment)
    .subscribe();
}

function subscribeToNotifications(userId, onNotif) {
  return sb.channel(`notifs-${userId}`)
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'notifications',
      filter: `user_id=eq.${userId}`
    }, onNotif)
    .subscribe();
}

/* ═══════════════════════════════════════════════════════════════
   UTILITAIRES
═══════════════════════════════════════════════════════════════ */

function generateInviteCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

function formatCurrency(amount, currency = 'FCFA') {
  return amount.toLocaleString('fr-FR') + ' ' + currency;
}

function formatDate(dateStr, lang = 'fr') {
  return new Date(dateStr).toLocaleDateString(
    lang === 'en' ? 'en-US' : 'fr-FR',
    { day: 'numeric', month: 'long', year: 'numeric' }
  );
}

/* ═══════════════════════════════════════════════════════════════
   OBSERVER L'ÉTAT DE CONNEXION
═══════════════════════════════════════════════════════════════ */

sb.auth.onAuthStateChange((event, session) => {
  console.log('[NEO-SUSU] Auth event:', event);
  if (event === 'SIGNED_OUT') {
    window.location.href = './index.html';
  }
  if (event === 'SIGNED_IN' && window.location.pathname.includes('login')) {
    window.location.href = './dashboard.html';
  }
});

/* ═══════════════════════════════════════════════════════════════
   SQL — TABLES SUPABASE À CRÉER
   (Copie et exécute dans Supabase → SQL Editor)
═══════════════════════════════════════════════════════════════

-- Profils utilisateurs
CREATE TABLE profiles (
  id UUID REFERENCES auth.users PRIMARY KEY,
  first_name TEXT,
  last_name TEXT,
  phone TEXT,
  country TEXT,
  wallet DECIMAL(15,2) DEFAULT 0,
  score INTEGER DEFAULT 50,
  kyc_status TEXT DEFAULT 'pending' CHECK (kyc_status IN ('pending','verified','rejected')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tontines
CREATE TABLE tontines (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  amount DECIMAL(15,2) NOT NULL,
  currency TEXT DEFAULT 'XOF',
  frequency TEXT CHECK (frequency IN ('weekly','biweekly','monthly')),
  max_members INTEGER DEFAULT 10,
  start_date DATE,
  status TEXT DEFAULT 'active' CHECK (status IN ('active','completed','paused')),
  creator_id UUID REFERENCES profiles(id),
  invite_code TEXT UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Membres des tontines
CREATE TABLE tontine_members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tontine_id UUID REFERENCES tontines(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id),
  position INTEGER,
  status TEXT DEFAULT 'active',
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tontine_id, user_id)
);

-- Paiements / Cotisations
CREATE TABLE payments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tontine_id UUID REFERENCES tontines(id),
  payer_id UUID REFERENCES profiles(id),
  amount DECIMAL(15,2),
  method TEXT CHECK (method IN ('card','sepa','mobile_money','cash')),
  status TEXT DEFAULT 'completed',
  paid_at TIMESTAMPTZ DEFAULT NOW()
);

-- Transactions du portefeuille
CREATE TABLE wallet_transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id),
  amount DECIMAL(15,2),
  type TEXT,
  balance_after DECIMAL(15,2),
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tokens de retrait cash
CREATE TABLE withdraw_tokens (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id),
  token TEXT UNIQUE,
  amount DECIMAL(15,2),
  expiration TIMESTAMPTZ,
  used BOOLEAN DEFAULT FALSE,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Notifications
CREATE TABLE notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id),
  title TEXT,
  body TEXT,
  type TEXT,
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS (Row Level Security) — Chaque user ne voit que ses données
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE tontines ENABLE ROW LEVEL SECURITY;
ALTER TABLE tontine_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallet_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE withdraw_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own profile" ON profiles FOR ALL USING (auth.uid() = id);
CREATE POLICY "Members see their tontines" ON tontine_members FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Members see tontine details" ON tontines FOR SELECT USING (id IN (SELECT tontine_id FROM tontine_members WHERE user_id = auth.uid()));
CREATE POLICY "Users manage own payments" ON payments FOR ALL USING (auth.uid() = payer_id);
CREATE POLICY "Users manage own wallet" ON wallet_transactions FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users manage own tokens" ON withdraw_tokens FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users see own notifs" ON notifications FOR ALL USING (auth.uid() = user_id);

═══════════════════════════════════════════════════════════════ */

console.log('[NEO-SUSU] Supabase module chargé ✓');
console.log('[NEO-SUSU] Site:', APP_URL);
