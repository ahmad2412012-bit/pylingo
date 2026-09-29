// ============ Firestore Module ============
// حفظ ومزامنة بيانات المستخدم مع Firestore

const firestoreModule = {
  db: null,
  currentUser: null,

  // ============ Init ============
  init() {
    if (typeof firebase === 'undefined') {
      console.warn('⚠️ Firebase SDK مش محمّل');
      return;
    }

    if (typeof firebase.firestore !== 'function') {
      console.warn('⚠️ Firestore SDK مش محمّل');
      return;
    }

    try {
      if (!firebase.apps.length) {
        firebase.initializeApp(window.FIREBASE_CONFIG);
      }
      
      this.db = firebase.firestore();
      
      // راقب تسجيل الدخول
      firebase.auth().onAuthStateChanged(async (user) => {
        this.currentUser = user;
        
        if (user) {
          console.log('🔥 Firestore: User logged in:', user.displayName);
          await this.syncFromFirestore();
        } else {
          console.log('🔥 Firestore: No user');
        }
      });
      
      console.log('✅ Firestore initialized');
    } catch (error) {
      console.error('❌ Firestore init error:', error);
    }
  },

  // ============ Sync from Firestore ============
  async syncFromFirestore() {
    if (!this.db || !this.currentUser) return;

    try {
      const docRef = this.db.collection('users').doc(this.currentUser.uid);
      const doc = await docRef.get();

      if (doc.exists) {
        const remoteData = doc.data();
        console.log('📥 Remote data:', remoteData);

        const localUser = storage.getUser();

        // اختار الأعلى XP (في حالة تغيير من جهاز تاني)
        const mergedUser = {
          ...localUser,
          xp: Math.max(localUser.xp || 0, remoteData.xp || 0),
          gems: Math.max(localUser.gems || 0, remoteData.gems || 0),
          completedLessons: [
            ...new Set([...(localUser.completedLessons || []), ...(remoteData.completedLessons || [])])
          ],
          completedProjects: [
            ...new Set([...(localUser.completedProjects || []), ...(remoteData.completedProjects || [])])
          ]
        };

        storage.setUser(mergedUser);
        await this.saveToFirestore();

        console.log('✅ Data synced from Firestore');
      } else {
        console.log('🆕 New user - uploading local data');
        await this.saveToFirestore();
      }

      // ✅ رندر تاني
      if (window.app && document.getElementById('units-container')) {
        window.app.updateHeaderStats();
        window.app.renderHome();
      }

    } catch (error) {
      console.error('❌ Sync error:', error);
    }
  },

  // ============ Save to Firestore ============
  async saveToFirestore() {
    if (!this.db || !this.currentUser) return;

    try {
      const user = storage.getUser();
      
      const dataToSave = {
        displayName: this.currentUser.displayName || 'مستخدم',
        email: this.currentUser.email || '',
        photoURL: this.currentUser.photoURL || '',
        xp: user.xp || 0,
        gems: user.gems || 0,
        hearts: user.hearts || 5,
        streak: user.streak || 0,
        completedLessons: user.completedLessons || [],
        completedProjects: user.completedProjects || [],
        lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
      };

      await this.db.collection('users').doc(this.currentUser.uid).set(dataToSave, { merge: true });
      console.log('💾 Saved to Firestore:', dataToSave.xp, 'XP');

    } catch (error) {
      console.error('❌ Save error:', error);
    }
  },

  // ============ Get Leaderboard ============
  async getLeaderboard(limit = 20) {
    if (!this.db) return [];

    try {
      const snapshot = await this.db
        .collection('users')
        .orderBy('xp', 'desc')
        .limit(limit)
        .get();

      const users = [];
      snapshot.forEach(doc => {
        users.push({
          uid: doc.id,
          ...doc.data()
        });
      });

      console.log('🏆 Leaderboard:', users.length, 'users');
      return users;

    } catch (error) {
      console.error('❌ Leaderboard error:', error);
      return [];
    }
  },

  // ============ Get My Rank ============
  async getMyRank() {
    if (!this.db || !this.currentUser) return null;

    try {
      const user = storage.getUser();
      
      const snapshot = await this.db
        .collection('users')
        .where('xp', '>', user.xp || 0)
        .get();

      return snapshot.size + 1;

    } catch (error) {
      console.error('❌ Rank error:', error);
      return null;
    }
  }
};