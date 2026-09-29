// ============ Firebase Auth Module ============

const authModule = {
  auth: null,
  provider: null,

  init() {
    if (!window.FIREBASE_CONFIG) {
      console.error('❌ Firebase config مش موجود');
      return;
    }

    if (typeof firebase === 'undefined') {
      console.error('❌ Firebase SDK مش محمّل. تأكد من index.html');
      return;
    }

    try {
      if (!firebase.apps.length) {
        firebase.initializeApp(window.FIREBASE_CONFIG);
      }
      
      this.auth = firebase.auth();
      this.provider = new firebase.auth.GoogleAuthProvider();

      this.setupUI();
      this.auth.onAuthStateChanged((user) => this.handleAuthState(user));

      console.log('✅ Firebase Auth initialized');

      // ✅ شغل Firestore بعد Firebase مباشرة
      if (typeof firestoreModule !== 'undefined') {
        setTimeout(() => firestoreModule.init(), 200);
      }
    } catch (error) {
      console.error('❌ Firebase init error:', error);
    }
  },

  setupUI() {
    const loginBtn = document.getElementById('google-login-btn');
    const logoutBtn = document.getElementById('logout-btn');

    if (loginBtn) {
      loginBtn.addEventListener('click', () => this.login());
    }
    if (logoutBtn) {
      logoutBtn.addEventListener('click', () => this.logout());
    }
  },

  async login() {
    try {
      console.log('🔐 Logging in...');
      
      const result = await this.auth.signInWithPopup(this.provider);
      const user = result.user;
      
      console.log('✅ Logged in:', user.displayName);
      
      storage.updateUser({
        uid: user.uid,
        displayName: user.displayName,
        email: user.email,
        photoURL: user.photoURL
      });

      // ✅ مزامنة مع Firestore
      setTimeout(() => {
        if (typeof firestoreModule !== 'undefined' && firestoreModule.db) {
          firestoreModule.syncFromFirestore();
        }
      }, 500);

    } catch (error) {
      console.error('❌ Login error:', error);
      
      let message = 'فشل تسجيل الدخول';
      if (error.code === 'auth/popup-closed-by-user') {
        message = 'قفلت نافذة تسجيل الدخول';
      } else if (error.code === 'auth/popup-blocked') {
        message = 'المتصفح منع النافذة. افتح الـ popups وجرب تاني';
      } else if (error.code === 'auth/unauthorized-domain') {
        message = 'الدومين مش مصرح به في Firebase. ضيفه في Authorized Domains';
      } else {
        message += ': ' + error.message;
      }
      
      alert(message);
    }
  },

  async logout() {
    try {
      await this.auth.signOut();
      console.log('👋 Logged out');
      
      const user = storage.getUser();
      delete user.uid;
      delete user.displayName;
      delete user.email;
      delete user.photoURL;
      storage.setUser(user);
      
    } catch (error) {
      console.error('❌ Logout error:', error);
    }
  },

  handleAuthState(user) {
    const loginSection = document.getElementById('login-section');
    const userInfo = document.getElementById('user-info');
    const userAvatar = document.getElementById('user-avatar');
    const userName = document.getElementById('user-name');
    const userEmail = document.getElementById('user-email');

    if (user) {
      if (loginSection) loginSection.style.display = 'none';
      if (userInfo) userInfo.style.display = 'block';
      if (userAvatar) userAvatar.src = user.photoURL || '';
      if (userName) userName.textContent = user.displayName || 'مستخدم';
      if (userEmail) userEmail.textContent = user.email || '';
      
      console.log('👤 User logged in:', user.displayName);
    } else {
      if (loginSection) loginSection.style.display = 'block';
      if (userInfo) userInfo.style.display = 'none';
      
      console.log('👤 No user logged in');
    }
  }
};