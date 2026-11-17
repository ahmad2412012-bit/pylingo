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
      console.error('❌ Firebase SDK مش محمّل');
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

      if (typeof firestoreModule !== 'undefined') {
        setTimeout(() => firestoreModule.init(), 200);
      }
    } catch (error) {
      console.error('❌ Firebase init error:', error);
    }
  },

  setupUI() {
    const googleBtn = document.getElementById('google-login-btn');
    const logoutBtn = document.getElementById('logout-btn');
    const emailLoginBtn = document.getElementById('email-login-btn');
    const signupBtn = document.getElementById('signup-btn');

    if (googleBtn) googleBtn.addEventListener('click', () => this.loginWithGoogle());
    if (logoutBtn) logoutBtn.addEventListener('click', () => this.logout());

    if (emailLoginBtn) {
      emailLoginBtn.addEventListener('click', () => {
        const email = (document.getElementById('email-input') || {}).value || '';
        const password = (document.getElementById('password-input') || {}).value || '';
        this.loginWithEmail(email.trim(), password);
      });
    }

    if (signupBtn) {
      signupBtn.addEventListener('click', () => {
        const email = (document.getElementById('email-input') || {}).value || '';
        const password = (document.getElementById('password-input') || {}).value || '';
        this.signupWithEmail(email.trim(), password);
      });
    }
    // ✅ زرار نسيت كلمة المرور
    const forgotBtn = document.getElementById('forgot-password-btn');
    if (forgotBtn) {
      forgotBtn.addEventListener('click', (e) => {
        e.preventDefault();
        const email = (document.getElementById('email-input') || {}).value || '';
        this.resetPassword(email.trim());
      });
    }

    // Enter key داخل الحقول
    const passwordInput = document.getElementById('password-input');
    if (passwordInput) {
      passwordInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          const emailLoginBtn = document.getElementById('email-login-btn');
          if (emailLoginBtn) emailLoginBtn.click();
        }
      });
    }
  },

  // ============ تسجيل الدخول بجوجل ============
  async loginWithGoogle() {
    try {
      const result = await this.auth.signInWithPopup(this.provider);
      const user = result.user;
      storage.updateUser({
        uid: user.uid,
        displayName: user.displayName || '',
        email: user.email || '',
        photoURL: user.photoURL || ''
      });
      this.afterLogin();
    } catch (error) {
      this.showError(error);
    }
  },

  // ============ تسجيل الدخول بالإيميل والباسورد ============
  async loginWithEmail(email, password) {
    this.clearMessage();
    if (!email || !password) {
      this.showMessage('❌ اكتب الإيميل وكلمة المرور', 'error');
      return;
    }
    try {
      const result = await this.auth.signInWithEmailAndPassword(email, password);
      const user = result.user;
      storage.updateUser({
        uid: user.uid,
        displayName: user.displayName || email.split('@')[0],
        email: user.email || email,
        photoURL: user.photoURL || ''
      });
      this.showMessage('✅ تم تسجيل الدخول!', 'success');
      this.afterLogin();
    } catch (error) {
      this.showError(error);
    }
  },
  // ✅ إرسال رابط استعادة كلمة المرور
  async resetPassword(email) {
    this.clearMessage();
    if (!email) {
      this.showMessage('❌ اكتب إيميلك في الخانة فوق الأول عشان نبعتلك الرابط', 'error');
      return;
    }
    try {
      await this.auth.sendPasswordResetEmail(email);
      this.showMessage('✅ تم إرسال رابط استعادة كلمة المرور لإيميلك. (تأكد من صندوق الوارد أو الـ Spam)', 'success');
    } catch (error) {
      this.showError(error);
    }
  },
  // ============ إنشاء حساب جديد ============
  async signupWithEmail(email, password) {
    this.clearMessage();
    if (!email || !password) {
      this.showMessage('❌ اكتب الإيميل وكلمة المرور', 'error');
      return;
    }
    if (password.length < 6) {
      this.showMessage('❌ كلمة المرور لازم 6 أحرف على الأقل', 'error');
      return;
    }
    try {
      const result = await this.auth.createUserWithEmailAndPassword(email, password);
      const user = result.user;

      // اختياري: نحدّث اسم العرض
      try {
        await user.updateProfile({ displayName: email.split('@')[0] });
      } catch (e) {
        console.warn('⚠️ updateProfile failed:', e);
      }

      storage.updateUser({
        uid: user.uid,
        displayName: email.split('@')[0],
        email: user.email || email,
        photoURL: ''
      });
      this.showMessage('✅ تم إنشاء الحساب!', 'success');
      this.afterLogin();
    } catch (error) {
      this.showError(error);
    }
  },

  // ============ بعد تسجيل الدخول ============
  afterLogin() {
    // مزامنة من Firestore لو موجود
    if (typeof firestoreModule !== 'undefined' && firestoreModule.db) {
      try {
        firestoreModule.syncFromFirestore();
      } catch (e) {
        console.warn('⚠️ syncFromFirestore failed:', e);
      }
    }

    // إذا كنا في صفحة login.html → انتقل للرئيسية
    if (window.location.pathname.includes('login')) {
      setTimeout(() => {
        window.location.href = 'index.html';
      }, 600);
    } else {
      // نحن في index.html → أعد الرسم
      if (typeof app !== 'undefined' && app.renderHome) {
        app.renderHome();
        app.updateHeaderStats();
      }
    }
  },

  // ============ تسجيل الخروج ============
  async logout() {
    if (!confirm('متأكد بدك تسجل خروج؟')) return;
    try {
      await this.auth.signOut();
      const user = storage.getUser();
      delete user.uid;
      delete user.displayName;
      delete user.email;
      delete user.photoURL;
      storage.setUser(user);
      window.location.href = 'login.html';
    } catch (error) {
      console.error('❌ Logout error:', error);
    }
  },

  // ============ مراقبة حالة المصادقة ============
  handleAuthState(user) {
    const isLoginPage = window.location.pathname.includes('login');

    // ✅ نحن في login.html
    if (isLoginPage) {
      if (user) {
        // مسجل دخول أصلاً → انتقال للرئيسية
        window.location.href = 'index.html';
      }
      // غير مسجل → خليه بالصفحة
      return;
    }

    // ✅ نحن في index.html أو أي صفحة محمية
    if (!user) {
      // غير مسجل → انتقال لصفحة الدخول
      window.location.href = 'login.html';
      return;
    }

    // مسجل → حدّث واجهة المستخدم
    const loginSection = document.getElementById('login-section');
    const userInfo = document.getElementById('user-info');
    if (loginSection) loginSection.style.display = 'none';
    if (userInfo) userInfo.style.display = 'block';

    const userAvatar = document.getElementById('user-avatar');
    const userName = document.getElementById('user-name');
    const userEmail = document.getElementById('user-email');

    if (userAvatar && user.photoURL) userAvatar.src = user.photoURL;
    if (userName) userName.textContent = user.displayName || 'مستخدم';
    if (userEmail) userEmail.textContent = user.email || '';
  },

  // ============ مساعدات عرض الرسائل ============
  showMessage(text, type) {
    const el = document.getElementById('auth-message');
    if (el) {
      el.textContent = text;
      el.className = type || '';
    } else {
      console.log(text);
    }
  },

  clearMessage() {
    const el = document.getElementById('auth-message');
    if (el) el.textContent = '';
  },

  showError(error) {
    let message = '❌ فشل العملية';
    const code = error.code || '';
    if (code === 'auth/wrong-password') message = '❌ كلمة المرور غلط';
    else if (code === 'auth/user-not-found') message = '❌ الإيميل مش مسجل';
    else if (code === 'auth/email-already-in-use') message = '❌ الإيميل مستخدم بالفعل';
    else if (code === 'auth/invalid-email') message = '❌ الإيميل غير صالح';
    else if (code === 'auth/weak-password') message = '❌ كلمة المرور ضعيفة (6 أحرف على الأقل)';
    else if (code === 'auth/popup-closed-by-user') message = '❌ قفلت نافذة Google';
    else if (code === 'auth/unauthorized-domain') message = '❌ الدومين مش مصرح به في Firebase';
    else if (code === 'auth/network-request-failed') message = '❌ تحقق من اتصال الإنترنت';
    else if (code === 'auth/too-many-requests') message = '❌ محاولات كثيرة، حاول لاحقاً';
    else message += ': ' + (error.message || code);

    console.error('❌ Auth error:', error);
    this.showMessage(message, 'error');
  }
};