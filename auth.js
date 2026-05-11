// ============================================================
// NEO-SUSU - Module d'authentification
// ============================================================
// Gère l'inscription, la connexion et la déconnexion
// ============================================================

// -------------------------------------------------------------
// INSCRIPTION (par email + mot de passe)
// -------------------------------------------------------------
async function signUp(email, password, firstName, lastName, phoneNumber, country) {
  try {
    // 1. Créer le compte dans Supabase Auth
    const { data: authData, error: authError } = await supabaseClient.auth.signUp({
      email: email,
      password: password,
      options: {
        data: {
          first_name: firstName,
          last_name: lastName,
          phone_number: phoneNumber,
          country_code: country
        }
      }
    });

    if (authError) throw authError;

    // 2. Créer le profil dans la table 'users' personnalisée
    if (authData.user) {
      const { error: profileError } = await supabaseClient
        .from('users')
        .insert({
          id: authData.user.id,
          first_name: firstName,
          last_name: lastName,
          email: email,
          phone_number: phoneNumber,
          country_code: country,
          password_hash: 'managed_by_supabase_auth',
          kyc_status: 'pending'
        });

      if (profileError) {
        console.warn('Profil non créé (table users) :', profileError);
        // On continue, le compte auth est créé
      }
    }

    showMessage('🎉 Compte créé ! Vérifie ton email pour confirmer.', 'success');
    return { success: true, user: authData.user };

  } catch (error) {
    console.error('Erreur inscription:', error);
    showMessage('❌ ' + (error.message || 'Erreur lors de l\'inscription'), 'error');
    return { success: false, error: error.message };
  }
}

// -------------------------------------------------------------
// CONNEXION
// -------------------------------------------------------------
async function signIn(email, password) {
  try {
    const { data, error } = await supabaseClient.auth.signInWithPassword({
      email: email,
      password: password
    });

    if (error) throw error;

    showMessage('✅ Bienvenue !', 'success');
    setTimeout(() => {
      window.location.href = 'dashboard.html';
    }, 1000);

    return { success: true, user: data.user };

  } catch (error) {
    console.error('Erreur connexion:', error);
    showMessage('❌ Email ou mot de passe incorrect', 'error');
    return { success: false, error: error.message };
  }
}

// -------------------------------------------------------------
// DÉCONNEXION
// -------------------------------------------------------------
async function signOut() {
  try {
    const { error } = await supabaseClient.auth.signOut();
    if (error) throw error;

    showMessage('👋 À bientôt !', 'info');
    setTimeout(() => {
      window.location.href = 'index.html';
    }, 800);

  } catch (error) {
    console.error('Erreur déconnexion:', error);
    showMessage('❌ Erreur lors de la déconnexion', 'error');
  }
}

// -------------------------------------------------------------
// RÉCUPÉRER LE PROFIL UTILISATEUR
// -------------------------------------------------------------
async function getUserProfile() {
  const user = await getCurrentUser();
  if (!user) return null;

  const { data, error } = await supabaseClient
    .from('users')
    .select('*')
    .eq('id', user.id)
    .single();

  if (error) {
    console.warn('Profil non trouvé:', error);
    return { id: user.id, email: user.email, ...user.user_metadata };
  }

  return data;
}
