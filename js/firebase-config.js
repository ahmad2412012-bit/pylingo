// ============ Firebase Configuration ============
// مشروع: pylingo-3012a
// https://console.firebase.google.com/project/pylingo-3012a

const firebaseConfig = {
  apiKey: "AIzaSyCtSWFf7FitOOpLogARnQHPQqIEVJCJq-c",
  authDomain: "pylingo-3012a.firebaseapp.com",
  projectId: "pylingo-3012a",
  storageBucket: "pylingo-3012a.firebasestorage.app",
  messagingSenderId: "1036356871288",
  appId: "1:1036356871288:web:e5bb3be7b87e95d7bfb98d",
  measurementId: "G-XKKHYQP2SC"
};

// ✅ Expose globally عشان auth.js يستخدمه
window.FIREBASE_CONFIG = firebaseConfig;

console.log('✅ Firebase config loaded');