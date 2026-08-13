/**
 * HyperNova Technology - Firebase Configuration & Hybrid Storage Engine
 */

// Default Firebase Configuration (replace with your Firebase project credentials in production)
const firebaseConfig = {
  apiKey: "AIzaSyBdFbSsrjvZc3GVn3FaICrYP0lr9Pibl4A",
  authDomain: "hypernova-careers.firebaseapp.com",
  projectId: "hypernova-careers",
  storageBucket: "hypernova-careers.firebasestorage.app",
  messagingSenderId: "238608604107",
  appId: "1:238608604107:web:fc18968ca9c7300f5c744e"
};

// Check if live Firebase SDK compat is loaded from CDN
let isFirebaseLive = false;
let auth = null;
let db = null;
let storage = null;

try {
  if (typeof firebase !== 'undefined' && firebase.initializeApp) {
    if (!firebase.apps.length) {
      firebase.initializeApp(firebaseConfig);
    }
    auth = firebase.auth();
    db = firebase.firestore();
    storage = firebase.storage();
    isFirebaseLive = true;
    console.log("HyperNova Portal: Firebase SDK initialized successfully.");
  }
} catch (e) {
  console.warn("HyperNova Portal: Running in local interactive demo mode (Fallback Persistence active).", e);
}

window.HyperNovaFB = {
  config: firebaseConfig,
  isLive: isFirebaseLive,
  auth: auth,
  db: db,
  storage: storage
};
