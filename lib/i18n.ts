import i18next from "i18next"
import { initReactI18next } from "react-i18next"

i18next.use(initReactI18next).init({
  lng: "fr",
  fallbackLng: "en",
  interpolation: {
    escapeValue: false,
  },
  resources: {
    fr: {
      translation: {
        // Auth
        welcome: "Bienvenue",
        login: "Connexion",
        register: "Inscription",
        email: "Email",
        phone: "Téléphone",
        password: "Mot de passe",
        confirmPassword: "Confirmer le mot de passe",
        firstName: "Prénom",
        lastName: "Nom",
        loginButton: "Se connecter",
        registerButton: "S'inscrire",
        alreadyHaveAccount: "Vous avez déjà un compte ?",
        dontHaveAccount: "Vous n'avez pas de compte ?",

        // Dashboard
        hello: "Bonjour",
        deposit: "Dépôt",
        withdraw: "Retrait",
        recentTransactions: "Transactions récentes",
        viewAll: "Voir tout",
        amount: "Montant",
        status: "Statut",
        date: "Date",
        type: "Type",

        // Transaction Flow
        selectPlatform: "Choisir la plateforme",
        selectBetId: "Choisir l'identifiant de pari",
        selectNetwork: "Choisir le réseau",
        selectPhone: "Choisir le numéro de téléphone",
        enterAmount: "Saisir le montant",
        confirm: "Confirmer",
        cancel: "Annuler",
        next: "Suivant",
        previous: "Précédent",
        addBetId: "Ajouter un identifiant",
        addPhone: "Ajouter un numéro",
        withdrawalCode: "Code de retrait",

        // Status
        pending: "En attente",
        accept: "Accepté",
        reject: "Rejeté",

        // Common
        loading: "Chargement...",
        error: "Erreur",
        success: "Succès",
        noData: "Aucune donnée disponible",

        // Notifications
        notifications: "Notifications",
        markAsRead: "Marquer comme lu",

        // Bonus
        bonus: "Bonus",
        bonusAvailable: "Bonus disponible",

        // Transactions
        transactions: "Transactions",
        reference: "Référence",
        network: "Réseau",
        platform: "Plateforme",
      },
    },
    en: {
      translation: {
        // Auth
        welcome: "Welcome",
        login: "Login",
        register: "Register",
        email: "Email",
        phone: "Phone",
        password: "Password",
        confirmPassword: "Confirm Password",
        firstName: "First Name",
        lastName: "Last Name",
        loginButton: "Sign In",
        registerButton: "Sign Up",
        alreadyHaveAccount: "Already have an account?",
        dontHaveAccount: "Don't have an account?",

        // Dashboard
        hello: "Hello",
        deposit: "Deposit",
        withdraw: "Withdraw",
        recentTransactions: "Recent Transactions",
        viewAll: "View all",
        amount: "Amount",
        status: "Status",
        date: "Date",
        type: "Type",

        // Transaction Flow
        selectPlatform: "Select Platform",
        selectBetId: "Select Bet ID",
        selectNetwork: "Select Network",
        selectPhone: "Select Phone Number",
        enterAmount: "Enter Amount",
        confirm: "Confirm",
        cancel: "Cancel",
        next: "Next",
        previous: "Previous",
        addBetId: "Add Bet ID",
        addPhone: "Add Phone",
        withdrawalCode: "Withdrawal Code",

        // Status
        pending: "Pending",
        accept: "Accepted",
        reject: "Rejected",

        // Common
        loading: "Loading...",
        error: "Error",
        success: "Success",
        noData: "No data available",

        // Notifications
        notifications: "Notifications",
        markAsRead: "Mark as read",

        // Bonus
        bonus: "Bonus",
        bonusAvailable: "Bonus available",

        // Transactions
        transactions: "Transactions",
        reference: "Reference",
        network: "Network",
        platform: "Platform",
      },
    },
  },
})

export default i18next
