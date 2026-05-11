// ============================================================
// NEO-SUSU - Module de gestion des tontines
// ============================================================
// Créer, lister, rejoindre des tontines
// ============================================================

// -------------------------------------------------------------
// CRÉER UNE NOUVELLE TONTINE
// -------------------------------------------------------------
async function createTontine(name, description, contributionAmount, currency, frequency, maxMembers) {
  try {
    const user = await requireAuth();
    if (!user) return;

    // Calculer le montant total cible
    const totalTarget = contributionAmount * maxMembers;

    // Créer la tontine
    const { data: tontine, error: tontineError } = await supabaseClient
      .from('tontines')
      .insert({
        name: name,
        description: description,
        created_by: user.id,
        contribution_amount: contributionAmount,
        currency: currency || 'XOF',
        total_target_amount: totalTarget,
        frequency: frequency, // 'daily', 'weekly', 'biweekly', 'monthly'
        max_members: maxMembers,
        status: 'pending',
        payout_order: 'manual'
      })
      .select()
      .single();

    if (tontineError) throw tontineError;

    // Ajouter le créateur comme premier membre (admin)
    const { error: memberError } = await supabaseClient
      .from('tontine_members')
      .insert({
        tontine_id: tontine.id,
        user_id: user.id,
        role: 'admin',
        status: 'active',
        payout_position: 1
      });

    if (memberError) throw memberError;

    showMessage('🎉 Tontine créée avec succès !', 'success');
    return { success: true, tontine: tontine };

  } catch (error) {
    console.error('Erreur création tontine:', error);
    showMessage('❌ ' + (error.message || 'Erreur de création'), 'error');
    return { success: false, error: error.message };
  }
}

// -------------------------------------------------------------
// LISTER LES TONTINES DE L'UTILISATEUR
// -------------------------------------------------------------
async function getMyTontines() {
  try {
    const user = await requireAuth();
    if (!user) return [];

    // Récupérer les tontines via la table de liaison tontine_members
    const { data, error } = await supabaseClient
      .from('tontine_members')
      .select(`
        role,
        status,
        payout_position,
        total_contributed,
        total_received,
        tontines (
          id,
          name,
          description,
          contribution_amount,
          currency,
          frequency,
          max_members,
          status,
          current_round
        )
      `)
      .eq('user_id', user.id)
      .neq('status', 'left');

    if (error) throw error;
    return data || [];

  } catch (error) {
    console.error('Erreur récupération tontines:', error);
    return [];
  }
}

// -------------------------------------------------------------
// RÉCUPÉRER LES DÉTAILS D'UNE TONTINE
// -------------------------------------------------------------
async function getTontineDetails(tontineId) {
  try {
    // Détails de la tontine
    const { data: tontine, error: tontineError } = await supabaseClient
      .from('tontines')
      .select('*')
      .eq('id', tontineId)
      .single();

    if (tontineError) throw tontineError;

    // Membres
    const { data: members, error: membersError } = await supabaseClient
      .from('tontine_members')
      .select(`
        *,
        users (first_name, last_name, phone_number, profile_picture_url)
      `)
      .eq('tontine_id', tontineId);

    if (membersError) throw membersError;

    return { success: true, tontine, members };

  } catch (error) {
    console.error('Erreur détails tontine:', error);
    return { success: false, error: error.message };
  }
}

// -------------------------------------------------------------
// REJOINDRE UNE TONTINE (via code d'invitation)
// -------------------------------------------------------------
async function joinTontine(tontineId) {
  try {
    const user = await requireAuth();
    if (!user) return;

    // Vérifier qu'il y a de la place
    const { data: tontine } = await supabaseClient
      .from('tontines')
      .select('max_members')
      .eq('id', tontineId)
      .single();

    const { count } = await supabaseClient
      .from('tontine_members')
      .select('*', { count: 'exact', head: true })
      .eq('tontine_id', tontineId)
      .eq('status', 'active');

    if (count >= tontine.max_members) {
      showMessage('❌ Cette tontine est complète', 'warning');
      return { success: false };
    }

    // Ajouter le membre
    const { error } = await supabaseClient
      .from('tontine_members')
      .insert({
        tontine_id: tontineId,
        user_id: user.id,
        role: 'member',
        status: 'active',
        payout_position: count + 1
      });

    if (error) throw error;

    showMessage('✅ Tu as rejoint la tontine !', 'success');
    return { success: true };

  } catch (error) {
    console.error('Erreur join tontine:', error);
    showMessage('❌ ' + (error.message || 'Erreur'), 'error');
    return { success: false, error: error.message };
  }
}
