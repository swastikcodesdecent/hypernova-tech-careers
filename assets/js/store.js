/**
 * HyperNova Technology - Unified Data Store (Firestore & Storage Integration)
 */

const LOCAL_STORAGE_KEY_PREFIX = 'hypernova_db_';

// Initial Seed Data for Instant Demonstration
const INITIAL_SEED_DEPARTMENTS = [
  { id: 'dept-101', name: 'AI Systems & Deep Learning', description: 'Core LLM, neural architecture and high-performance inference platforms.', status: 'active', createdAt: '2026-01-15T09:00:00Z', memberCount: 3 },
  { id: 'dept-102', name: 'Quantum & High-Performance Computing', description: 'Quantum circuit design, simulation and supercomputer optimization.', status: 'active', createdAt: '2026-01-20T10:30:00Z', memberCount: 2 },
  { id: 'dept-103', name: 'Cybersecurity & Zero Trust Architecture', description: 'Enterprise threat detection, encryption, and secure cloud infrastructure.', status: 'active', createdAt: '2026-02-01T14:00:00Z', memberCount: 4 },
  { id: 'dept-104', name: 'Autonomous Robotics & IoT', description: 'Edge AI processing, sensor fusion, and autonomous control software.', status: 'active', createdAt: '2026-02-10T11:15:00Z', memberCount: 1 },
  { id: 'dept-105', name: 'IT Systems & Infrastructure', description: 'Enterprise cloud infrastructure, security ciphers, network security, and IT systems.', status: 'active', headName: 'Swastik Paul', headEmail: 'admin@hypernovatech.in', headAssignedAt: '2026-01-01T00:00:00Z', createdAt: '2026-01-01T00:00:00Z', memberCount: 4 }
];

const INITIAL_SEED_USERS = [
  {
    id: 'user-ceo-01',
    email: 'ceo@hypernovatech.in',
    fullName: 'Ishan Pandit (CEO)',
    role: 'ceo',
    createdAt: '2026-01-01T00:00:00Z'
  },
  {
    id: 'user-admin-01',
    email: 'admin@hypernovatech.in',
    fullName: 'Swastik Paul (IT Head)',
    role: 'it_head',
    createdAt: '2026-01-01T00:00:00Z'
  }
];

class DataStore {
  constructor() {
    this.initLocalStore();
  }

  initLocalStore() {
    let depts = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY_PREFIX + 'departments') || '[]');
    if (depts.length === 0) {
      depts = INITIAL_SEED_DEPARTMENTS;
    }
    if (!depts.some(d => d.id === 'dept-105' || (d.name || '').toLowerCase().includes('it systems'))) {
      depts.push({
        id: 'dept-105',
        name: 'IT Systems & Infrastructure',
        description: 'Enterprise cloud infrastructure, security ciphers, network security, and IT systems.',
        status: 'active',
        headName: 'Swastik Paul',
        headEmail: 'admin@hypernovatech.in',
        headAssignedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        memberCount: 4
      });
    }
    localStorage.setItem(LOCAL_STORAGE_KEY_PREFIX + 'departments', JSON.stringify(depts));
    if (!localStorage.getItem(LOCAL_STORAGE_KEY_PREFIX + 'users')) {
      localStorage.setItem(LOCAL_STORAGE_KEY_PREFIX + 'users', JSON.stringify(INITIAL_SEED_USERS));
    }
    if (!localStorage.getItem(LOCAL_STORAGE_KEY_PREFIX + 'applications')) {
      localStorage.setItem(LOCAL_STORAGE_KEY_PREFIX + 'applications', JSON.stringify([]));
    }
    if (!localStorage.getItem(LOCAL_STORAGE_KEY_PREFIX + 'supportTickets')) {
      localStorage.setItem(LOCAL_STORAGE_KEY_PREFIX + 'supportTickets', JSON.stringify([]));
    }
    if (!localStorage.getItem(LOCAL_STORAGE_KEY_PREFIX + 'auditLogs')) {
      localStorage.setItem(LOCAL_STORAGE_KEY_PREFIX + 'auditLogs', JSON.stringify([]));
    }
    if (!localStorage.getItem(LOCAL_STORAGE_KEY_PREFIX + 'notifications')) {
      localStorage.setItem(LOCAL_STORAGE_KEY_PREFIX + 'notifications', JSON.stringify([]));
    }
    if (!localStorage.getItem(LOCAL_STORAGE_KEY_PREFIX + 'tasks')) {
      localStorage.setItem(LOCAL_STORAGE_KEY_PREFIX + 'tasks', JSON.stringify([]));
    }
    if (!localStorage.getItem(LOCAL_STORAGE_KEY_PREFIX + 'announcements')) {
      localStorage.setItem(LOCAL_STORAGE_KEY_PREFIX + 'announcements', JSON.stringify([
        {
          id: 'anc-101',
          title: 'Welcome to HyperNova Technology 2026 Collaboration Portal',
          author: 'CEO Ishan Pandit',
          authorEmail: 'ceo@hypernovatech.in',
          category: 'Executive Broadcast',
          priority: 'High',
          content: 'We are thrilled to welcome all newly onboarded collaborators and department heads! Check your assigned departments, project updates, and weekly innovation challenges.',
          createdAt: new Date().toISOString()
        }
      ]));
    }
    if (!localStorage.getItem(LOCAL_STORAGE_KEY_PREFIX + 'officialNotices')) {
      localStorage.setItem(LOCAL_STORAGE_KEY_PREFIX + 'officialNotices', JSON.stringify([
        {
          id: 'notice-101',
          title: 'Official Executive Directive — Q3 Technology Milestones & Policy Guidelines',
          author: 'CEO Ishan Pandit',
          authorEmail: 'ceo@hypernovatech.in',
          authorRole: 'ceo',
          category: 'Policy Directive',
          priority: 'High Priority',
          targetAudience: 'All Collaborators',
          content: 'All project teams must adhere to zero-trust architecture guidelines and complete weekly sprint reviews by Friday end-of-day.',
          createdAt: new Date().toISOString()
        }
      ]));
    }
    if (!localStorage.getItem(LOCAL_STORAGE_KEY_PREFIX + 'ideas')) {
      localStorage.setItem(LOCAL_STORAGE_KEY_PREFIX + 'ideas', JSON.stringify([
        {
          id: 'idea-101',
          title: 'Quantum-Resistant Zero-Trust Handshake Protocol',
          authorEmail: 'admin@hypernovatech.in',
          authorName: 'Swastik Paul',
          category: 'Cybersecurity & Encryption',
          description: 'Implementing post-quantum lattice cryptography for low-latency session handshakes in distributed microservices.',
          status: 'Approved for R&D',
          createdAt: new Date().toISOString()
        }
      ]));
    }
    if (!localStorage.getItem(LOCAL_STORAGE_KEY_PREFIX + 'projectUpdates')) {
      localStorage.setItem(LOCAL_STORAGE_KEY_PREFIX + 'projectUpdates', JSON.stringify([
        {
          id: 'pupdate-101',
          departmentId: 'dept-105',
          departmentName: 'IT Systems & Infrastructure',
          authorName: 'Swastik Paul',
          title: 'Live Firebase Auth & Firestore Hybrid Engine Deployed',
          content: 'Completed deployment of the unified authentication and real-time security rules engine for seamless candidate onboarding.',
          createdAt: new Date().toISOString()
        }
      ]));
    }
  }

  // Collection Helpers
  async getCollection(collectionName) {
    let firestoreDocs = null;
    if (window.HyperNovaFB.isLive && window.HyperNovaFB.db) {
      try {
        const snapshot = await window.HyperNovaFB.db.collection(collectionName).get();
        firestoreDocs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      } catch (e) {
        console.warn(`Firestore read failed for ${collectionName}, falling back to local store.`, e);
      }
    }
    
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY_PREFIX + collectionName);
    const localDocs = raw ? JSON.parse(raw) : [];

    if (firestoreDocs && Array.isArray(firestoreDocs)) {
      const mergedMap = new Map();
      localDocs.forEach(doc => mergedMap.set(doc.id, doc));
      firestoreDocs.forEach(doc => mergedMap.set(doc.id, doc));
      return Array.from(mergedMap.values());
    }

    return localDocs;
  }

  async getDoc(collectionName, docId) {
    if (window.HyperNovaFB.isLive && window.HyperNovaFB.db) {
      try {
        const doc = await window.HyperNovaFB.db.collection(collectionName).doc(docId).get();
        if (doc.exists) return { id: doc.id, ...doc.data() };
      } catch (e) {
        console.warn(`Firestore getDoc failed for ${docId}, falling back.`, e);
      }
    }
    const list = await this.getCollection(collectionName);
    return list.find(item => item.id === docId) || null;
  }

  async setDoc(collectionName, docId, data) {
    const record = { id: docId, ...data, updatedAt: new Date().toISOString() };
    if (window.HyperNovaFB.isLive && window.HyperNovaFB.db) {
      try {
        await window.HyperNovaFB.db.collection(collectionName).doc(docId).set(record, { merge: true });
      } catch (e) {
        console.warn(`Firestore setDoc failed for ${docId}, saving locally.`, e);
      }
    }
    const list = await this.getCollection(collectionName);
    const idx = list.findIndex(item => item.id === docId);
    if (idx >= 0) {
      list[idx] = { ...list[idx], ...record };
    } else {
      list.push(record);
    }
    localStorage.setItem(LOCAL_STORAGE_KEY_PREFIX + collectionName, JSON.stringify(list));
    return record;
  }

  async deleteDoc(collectionName, docId) {
    if (collectionName === 'users') {
      const users = await this.getCollection('users');
      const targetUser = users.find(u => u.id === docId || u.email === docId);
      if (targetUser && targetUser.email) {
        const userEmail = targetUser.email.toLowerCase();
        
        // Cascade delete applications
        const apps = await this.getCollection('applications');
        const matchingApps = apps.filter(a => (a.applicantEmail || '').toLowerCase() === userEmail);
        for (const app of matchingApps) {
          await this.deleteDoc('applications', app.id);
        }

        // Cascade delete tasks
        const tasks = await this.getCollection('tasks');
        const matchingTasks = tasks.filter(t => (t.assignedToEmail || '').toLowerCase() === userEmail);
        for (const task of matchingTasks) {
          await this.deleteDoc('tasks', task.id);
        }
      }
    }

    if (window.HyperNovaFB.isLive && window.HyperNovaFB.db) {
      try {
        await window.HyperNovaFB.db.collection(collectionName).doc(docId).delete();
      } catch (e) {
        console.warn(`Firestore deleteDoc failed for ${docId}`, e);
      }
    }
    let list = await this.getCollection(collectionName);
    list = list.filter(item => item.id !== docId);
    localStorage.setItem(LOCAL_STORAGE_KEY_PREFIX + collectionName, JSON.stringify(list));
  }

  generateApplicationId() {
    const year = new Date().getFullYear();
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    return `HN-${year}-${randomNum}`;
  }

  generateTaskId() {
    const year = new Date().getFullYear();
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    return `TASK-${year}-${randomNum}`;
  }
}

window.HyperNovaStore = new DataStore();
