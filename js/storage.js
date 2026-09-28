// ============ LocalStorage Wrapper ============
// مسؤول عن حفظ واسترجاع بيانات المستخدم من المتصفح

const storage = {
  KEYS: {
    USER: 'pylingo_user',
    PROGRESS: 'pylingo_progress',
    SETTINGS: 'pylingo_settings'
  },

  // ============ User Data ============
  getUser() {
    const data = localStorage.getItem(this.KEYS.USER);
    if (!data) {
      const defaultUser = {
        xp: 0,
        gems: 0,
        hearts: 5,
        streak: 0,
        lastActive: null,
        completedLessons: [],
        completedProjects: []
      };
      this.setUser(defaultUser);
      return defaultUser;
    }
    return JSON.parse(data);
  },

  setUser(user) {
    localStorage.setItem(this.KEYS.USER, JSON.stringify(user));
  },

  updateUser(updates) {
    const user = this.getUser();
    const updated = { ...user, ...updates };
    this.setUser(updated);
    return updated;
  },

  // ============ Progress ============
  getProgress() {
    const data = localStorage.getItem(this.KEYS.PROGRESS);
    return data ? JSON.parse(data) : {};
  },

  setProgress(progress) {
    localStorage.setItem(this.KEYS.PROGRESS, JSON.stringify(progress));
  },

  markLessonComplete(lessonId) {
    const user = this.getUser();
    if (!user.completedLessons.includes(lessonId)) {
      user.completedLessons.push(lessonId);
      this.setUser(user);
    }
  },

  markProjectComplete(projectId) {
    const user = this.getUser();
    if (!user.completedProjects.includes(projectId)) {
      user.completedProjects.push(projectId);
      this.setUser(user);
    }
  },

  isLessonComplete(lessonId) {
    return this.getUser().completedLessons.includes(lessonId);
  },

  isProjectComplete(projectId) {
    return this.getUser().completedProjects.includes(projectId);
  },

  // ============ XP & Rewards ============
  addXP(amount) {
    const user = this.getUser();
    user.xp += amount;
    this.setUser(user);
    return user.xp;
  },

  loseHeart() {
    const user = this.getUser();
    user.hearts = Math.max(0, user.hearts - 1);
    this.setUser(user);
    return user.hearts;
  },

  addGems(amount) {
    const user = this.getUser();
    user.gems += amount;
    this.setUser(user);
    return user.gems;
  },

  // ============ Reset ============
  reset() {
    localStorage.removeItem(this.KEYS.USER);
    localStorage.removeItem(this.KEYS.PROGRESS);
  }
};