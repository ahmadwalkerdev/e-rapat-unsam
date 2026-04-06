// 🔑 ISI DENGAN DATA DARI FIREBASE & SUPABASE NANTI
const firebaseConfig = {
  apiKey: "AIzaSyAIYm2ROELFer4JKfWqshJlp95UXNjAITc",
  authDomain: "erapatunsamv2.firebaseapp.com",
  projectId: "erapatunsamv2",
  storageBucket: "erapatunsamv2.firebasestorage.app",
  messagingSenderId: "269504770548",
  appId: "1:269504770548:web:32d09af80a04ce610989a1"
};

const SUPABASE_URL = "https://mggjnxmmorzxezdigoqh.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1nZ2pueG1tb3J6eGV6ZGlnb3FoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU0OTY4MDksImV4cCI6MjA5MTA3MjgwOX0.VTIhOYyL5tiFLGiZnTOVBryoMnLQLnQ3QLD23cyLZBM";

// Inisialisasi
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth();
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);