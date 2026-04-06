// 🔑 ISI DENGAN DATA DARI FIREBASE & SUPABASE NANTI
const firebaseConfig = {
  apiKey: "GANTI_DENGAN_API_KEY_FIREBASE",
  authDomain: "GANTI_DENGAN_PROJECT.firebaseapp.com",
  projectId: "GANTI_DENGAN_PROJECT_ID",
  storageBucket: "GANTI_DENGAN_PROJECT.appspot.com",
  messagingSenderId: "GANTI_DENGAN_SENDER_ID",
  appId: "GANTI_DENGAN_APP_ID"
};

const SUPABASE_URL = "https://GANTI_DENGAN_PROJECT.supabase.co";
const SUPABASE_ANON_KEY = "GANTI_DENGAN_SUPABASE_ANON_KEY";

// Inisialisasi
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth();
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);