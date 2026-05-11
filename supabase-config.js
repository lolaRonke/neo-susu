// ============================================================
// NEO-SUSU - Configuration Supabase
// ============================================================
// Ce fichier initialise la connexion à votre base de données.
// Il est chargé en premier sur toutes les pages.
// ============================================================

// Vos identifiants Supabase (clé PUBLIQUE - peut être visible)
const SUPABASE_URL = 'https://sonxsmidrxeetptwsgpl.supabase.co';
const SUPABASE_KEY = 'sb_publishable_rNwFIDJ7BvSr6SOadEeJrQ_usp5pOEk';

// Initialisation du client Supabase (variable globale accessible partout)
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// Helper pour vérifier si un utilisateur est connecté
async function getCurrentUser() {
  const { data: { user } } = await supabaseClient.auth.getUser();
  return user;
}

// Helper pour rediriger si non connecté
async function requireAuth() {
  const user = await getCurrentUser();
  if (!user) {
    window.location.href = 'login.html';
    return null;
  }
  return user;
}

// Helper pour afficher des messages à l'utilisateur
function showMessage(message, type = 'info') {
  // type: 'success', 'error', 'info', 'warning'
  const colors = {
    success: '#10b981',
    error: '#ef4444',
    info: '#3b82f6',
    warning: '#f59e0b'
  };

  const toast = document.createElement('div');
  toast.style.cssText = `
    position: fixed;
    top: 20px;
    left: 50%;
    transform: translateX(-50%);
    background: ${colors[type] || colors.info};
    color: white;
    padding: 14px 22px;
    border-radius: 12px;
    z-index: 10000;
    font-family: 'Inter', sans-serif;
    font-size: 14px;
    font-weight: 600;
    box-shadow: 0 10px 30px rgba(0,0,0,0.3);
    animation: slideDown 0.3s ease-out;
    max-width: 90%;
    text-align: center;
  `;
  toast.textContent = message;
  document.body.appendChild(toast);

  setTimeout(() => {
    toast.style.transition = 'opacity 0.3s';
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

console.log('✅ Supabase initialisé pour NEO-SUSU');
