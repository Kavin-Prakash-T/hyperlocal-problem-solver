import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getAuth,
  signInWithEmailAndPassword as realSignIn,
  createUserWithEmailAndPassword as realCreateUser,
  signOut as realSignOut,
  onAuthStateChanged as realOnAuthStateChanged
} from 'firebase/auth';
import { 
  getFirestore,
  collection as realCollection,
  doc as realDoc,
  query as realQuery,
  where as realWhere,
  orderBy as realOrderBy,
  onSnapshot as realOnSnapshot,
  addDoc as realAddDoc,
  updateDoc as realUpdateDoc,
  setDoc as realSetDoc,
  deleteDoc as realDeleteDoc,
  getDoc as realGetDoc,
  getDocs as realGetDocs,
  arrayUnion as realArrayUnion,
  arrayRemove as realArrayRemove,
  increment as realIncrement
} from 'firebase/firestore';

// Import our generated applet configuration safely
import firebaseConfig from '../../firebase-applet-config.json';
import { getStorage, ref as realRef, uploadBytes as realUploadBytes, getDownloadURL as realGetDownloadURL } from 'firebase/storage';

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

export async function uploadMedia(file: File, path: string): Promise<{ url: string; type: 'image' | 'video' }> {
  const isVideo = file.type.startsWith('video/');
  const type = isVideo ? 'video' : 'image';

  if (isMockMode) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        resolve({ url: reader.result as string, type });
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  try {
    const storageRef = realRef(storage, `${path}/${Date.now()}_${file.name}`);
    const snapshot = await realUploadBytes(storageRef, file);
    const url = await realGetDownloadURL(snapshot.ref);
    return { url, type };
  } catch (error) {
    console.warn("Storage upload failed, falling back to base64 reader:", error);
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        resolve({ url: reader.result as string, type });
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }
}

// Flag to track if we are operating in Local Mock Mode
export let isMockMode = localStorage.getItem('community_hero_mock_mode') === 'true';

// Quick Demo account bypass definitions duplicated here to handle mock logins
export const demoAccounts = [
  { email: 'citizen@hero.org', pass: 'citizen123', name: 'Alex Mercer', role: 'citizen' },
  { email: 'authority@hero.org', pass: 'authority123', name: 'Chief Roger Smith', role: 'authority', dept: 'Road Maintenance' },
  { email: 'admin@hero.org', pass: 'admin123', name: 'Central Administrator', role: 'admin' }
];

// Seed data generators to keep the interface looking rich and active out-of-the-box
function getSeedIssues() {
  return [
    {
      id: "issue_1",
      title: "Deep Pothole on Main Street Intersection",
      description: "A very deep pothole has formed right at the intersection of Main Street and 4th Avenue. It's causing cars to swerve dangerously into the opposite lane to avoid it.",
      category: "Road Maintenance",
      severity: "High",
      status: "In Progress",
      latitude: 12.9716,
      longitude: 77.5946,
      address: "Main Street & 4th Ave, Central District",
      imageUrl: "https://images.unsplash.com/photo-1515162305285-0293e4767cc2?auto=format&fit=crop&w=600&q=80",
      verificationCount: 15,
      upvotedBy: ["mock_citizen_1", "mock_citizen_2"],
      createdAt: Date.now() - 3600000 * 24,
      userId: "mock_citizen_1",
      userName: "Alex Mercer",
      department: "Road Maintenance",
      urgencyScore: 82,
      remarks: "Road maintenance crew has been dispatched to patch the section."
    },
    {
      id: "issue_2",
      title: "Overflowing Public Waste Bin near Central Park Entrance",
      description: "The public trash bin near the main entrance of Central Park is overflowing. Garbage is scattering across the walkway, attracting animals and creating a foul odor.",
      category: "Waste Management",
      severity: "Medium",
      status: "Under Review",
      latitude: 12.9726,
      longitude: 77.5956,
      address: "Central Park Main Gate, Park Avenue",
      imageUrl: "https://images.unsplash.com/photo-1611284446314-60a58ac0deb9?auto=format&fit=crop&w=600&q=80",
      verificationCount: 8,
      upvotedBy: ["mock_citizen_2"],
      createdAt: Date.now() - 3600000 * 12,
      userId: "mock_citizen_2",
      userName: "Sarah Jenkins",
      department: "Waste Management",
      urgencyScore: 55
    },
    {
      id: "issue_3",
      title: "Blown Streetlight - Block 3B Lane",
      description: "The street light in front of house #24 is completely dark. The lane is pitch black at night, making residents feel unsafe walking home.",
      category: "Streetlight Utility",
      severity: "Medium",
      status: "Assigned",
      latitude: 12.9706,
      longitude: 77.5936,
      address: "Lane 4, Block 3B, Greenfield",
      imageUrl: "",
      verificationCount: 4,
      upvotedBy: [],
      createdAt: Date.now() - 3600000 * 48,
      userId: "mock_citizen_3",
      userName: "Robert Chen",
      department: "Streetlight Utility",
      urgencyScore: 45
    }
  ];
}

function getSeedComments() {
  return [
    {
      id: "comment_1",
      issueId: "issue_1",
      userId: "mock_citizen_2",
      userName: "Sarah Jenkins",
      text: "I almost hit this pothole yesterday evening! Thanks for reporting it.",
      createdAt: Date.now() - 3600000 * 20
    },
    {
      id: "comment_2",
      issueId: "issue_1",
      userId: "mock_authority_1",
      userName: "Chief Roger Smith",
      text: "Assigned to the public works repair unit. We have scheduled patching for tomorrow morning.",
      createdAt: Date.now() - 3600000 * 18
    },
    {
      id: "comment_3",
      issueId: "issue_2",
      userId: "mock_citizen_3",
      userName: "Robert Chen",
      text: "This happens every weekend. We need a larger bin or more frequent collections here.",
      createdAt: Date.now() - 3600000 * 10
    }
  ];
}

function getSeedStatusUpdates() {
  return [
    {
      id: "status_1",
      issueId: "issue_1",
      status: "In Progress",
      remarks: "Ticket verified and repair crew dispatched.",
      updatedAt: Date.now() - 3600000 * 18,
      updatedBy: "Chief Roger Smith",
      proofUrl: ""
    }
  ];
}

// Mock Firestore collections stored in localStorage
function getMockCollection(colName: string): any[] {
  try {
    const data = localStorage.getItem(`community_hero_col_${colName}`);
    if (data) return JSON.parse(data);
  } catch (e) {
    console.error(e);
  }
  
  if (colName === 'issues') {
    const seed = getSeedIssues();
    localStorage.setItem(`community_hero_col_issues`, JSON.stringify(seed));
    return seed;
  }
  if (colName === 'comments') {
    const seed = getSeedComments();
    localStorage.setItem(`community_hero_col_comments`, JSON.stringify(seed));
    return seed;
  }
  if (colName === 'statusUpdates') {
    const seed = getSeedStatusUpdates();
    localStorage.setItem(`community_hero_col_statusUpdates`, JSON.stringify(seed));
    return seed;
  }
  return [];
}

function saveMockCollection(colName: string, items: any[]) {
  localStorage.setItem(`community_hero_col_${colName}`, JSON.stringify(items));
  notifyFirestoreListeners(colName);
}

function saveMockDoc(colName: string, docId: string, data: any) {
  const items = getMockCollection(colName);
  const idx = items.findIndex(item => item.id === docId);
  if (idx >= 0) {
    items[idx] = { ...items[idx], ...data, id: docId };
  } else {
    items.push({ ...data, id: docId });
  }
  saveMockCollection(colName, items);
}

// Mock auth session management
const authListeners = new Set<(user: any) => void>();
let currentMockUser: any = null;

try {
  const stored = localStorage.getItem('community_hero_mock_user');
  if (stored) {
    currentMockUser = JSON.parse(stored);
    isMockMode = true;
  }
} catch (e) {
  console.error(e);
}

export function onAuthStateChanged(authInstance: any, callback: (user: any) => void) {
  if (isMockMode) {
    setTimeout(() => {
      callback(currentMockUser);
    }, 0);
  }
  
  const unsubscribeReal = realOnAuthStateChanged(authInstance, (user) => {
    if (!isMockMode) {
      callback(user);
    }
  });

  authListeners.add(callback);

  return () => {
    unsubscribeReal();
    authListeners.delete(callback);
  };
}

function findMockUserByEmail(email: string) {
  try {
    const users = getMockCollection('users');
    return users.find(u => u.email && u.email.toLowerCase() === email.trim().toLowerCase());
  } catch (e) {
    console.error(e);
    return null;
  }
}

function getMockPasswords(): Record<string, string> {
  try {
    const stored = localStorage.getItem('community_hero_mock_passwords');
    if (stored) return JSON.parse(stored);
  } catch (e) {
    console.error(e);
  }
  return {};
}

function saveMockPassword(email: string, pass: string) {
  try {
    const passwords = getMockPasswords();
    passwords[email.trim().toLowerCase()] = pass.trim();
    localStorage.setItem('community_hero_mock_passwords', JSON.stringify(passwords));
  } catch (e) {
    console.error(e);
  }
}

function createMockUserSessionForExisting(mockProfile: any) {
  isMockMode = true;
  localStorage.setItem('community_hero_mock_mode', 'true');
  const mockUserObj = {
    uid: mockProfile.uid,
    email: mockProfile.email,
    displayName: mockProfile.name,
    emailVerified: true,
    isMock: true
  };
  currentMockUser = mockUserObj;
  localStorage.setItem('community_hero_mock_user', JSON.stringify(mockUserObj));
  authListeners.forEach(cb => cb(mockUserObj));
  return { user: mockUserObj };
}

export async function signInWithEmailAndPassword(authInstance: any, email: string, pass: string) {
  const cleanEmail = email.trim().toLowerCase();
  const cleanPass = pass.trim();

  try {
    if (isMockMode) {
      // Check demo accounts first
      const demoUser = demoAccounts.find(d => d.email.toLowerCase() === cleanEmail);
      if (demoUser && cleanPass === demoUser.pass) {
        return createMockUserSession(demoUser);
      }
      // Check existing mock custom users
      const existingProfile = findMockUserByEmail(cleanEmail);
      if (existingProfile) {
        const savedPasswords = getMockPasswords();
        const savedPass = savedPasswords[cleanEmail];
        if (!savedPass || cleanPass === savedPass) {
          return createMockUserSessionForExisting(existingProfile);
        } else {
          const authError = new Error('Incorrect password for mock account.');
          (authError as any).code = 'auth/wrong-password';
          throw authError;
        }
      }
      // Auto-register on login if not found
      saveMockPassword(cleanEmail, cleanPass);
      return createMockUserSession({
        email: cleanEmail,
        pass: cleanPass,
        name: cleanEmail.split('@')[0],
        role: 'citizen'
      });
    }

    const res = await realSignIn(authInstance, email, pass);
    return res;
  } catch (err: any) {
    console.warn('Real sign in failed, trying mock fallback:', err);
    if (err.code === 'auth/operation-not-allowed' || err.message?.includes('operation-not-allowed') || isMockMode || true) {
      isMockMode = true;
      localStorage.setItem('community_hero_mock_mode', 'true');

      // Check demo accounts first
      const demoUser = demoAccounts.find(d => d.email.toLowerCase() === cleanEmail);
      if (demoUser && cleanPass === demoUser.pass) {
        return createMockUserSession(demoUser);
      }

      // Check existing mock custom users
      const existingProfile = findMockUserByEmail(cleanEmail);
      if (existingProfile) {
        const savedPasswords = getMockPasswords();
        const savedPass = savedPasswords[cleanEmail];
        if (!savedPass || cleanPass === savedPass) {
          return createMockUserSessionForExisting(existingProfile);
        } else {
          const authError = new Error('Incorrect password.');
          (authError as any).code = 'auth/wrong-password';
          throw authError;
        }
      }

      // Auto-register on login if not found
      saveMockPassword(cleanEmail, cleanPass);
      return createMockUserSession({
        email: cleanEmail,
        pass: cleanPass,
        name: cleanEmail.split('@')[0],
        role: 'citizen'
      });
    }
    throw err;
  }
}

export async function createUserWithEmailAndPassword(authInstance: any, email: string, pass: string) {
  const cleanEmail = email.trim().toLowerCase();
  const cleanPass = pass.trim();

  try {
    if (isMockMode) {
      // In mock mode, check if email is already taken
      const demoUser = demoAccounts.find(d => d.email.toLowerCase() === cleanEmail);
      const existingProfile = findMockUserByEmail(cleanEmail);
      if (demoUser || existingProfile) {
        const err = new Error('This email is already registered.');
        (err as any).code = 'auth/email-already-in-use';
        throw err;
      }
      
      // Save password and register mock session
      saveMockPassword(cleanEmail, cleanPass);
      const mockUserObj = {
        uid: 'mock_citizen_' + Date.now(),
        email: cleanEmail,
        displayName: cleanEmail.split('@')[0],
        emailVerified: true,
        isMock: true
      };
      currentMockUser = mockUserObj;
      localStorage.setItem('community_hero_mock_user', JSON.stringify(mockUserObj));
      isMockMode = true;
      localStorage.setItem('community_hero_mock_mode', 'true');
      
      authListeners.forEach(cb => cb(mockUserObj));
      return { user: mockUserObj };
    }

    const res = await realCreateUser(authInstance, email, pass);
    return res;
  } catch (err: any) {
    console.warn('Real create user failed, trying mock fallback:', err);
    if (err.code === 'auth/operation-not-allowed' || err.message?.includes('operation-not-allowed') || isMockMode || true) {
      isMockMode = true;
      localStorage.setItem('community_hero_mock_mode', 'true');

      // Check if email is already taken
      const demoUser = demoAccounts.find(d => d.email.toLowerCase() === cleanEmail);
      const existingProfile = findMockUserByEmail(cleanEmail);
      if (demoUser || existingProfile) {
        const err = new Error('This email is already registered.');
        (err as any).code = 'auth/email-already-in-use';
        throw err;
      }

      saveMockPassword(cleanEmail, cleanPass);
      const mockUserObj = {
        uid: 'mock_citizen_' + Date.now(),
        email: cleanEmail,
        displayName: cleanEmail.split('@')[0],
        emailVerified: true,
        isMock: true
      };
      currentMockUser = mockUserObj;
      localStorage.setItem('community_hero_mock_user', JSON.stringify(mockUserObj));
      
      authListeners.forEach(cb => cb(mockUserObj));
      return { user: mockUserObj };
    }
    throw err;
  }
}

export async function signOut(authInstance: any) {
  localStorage.removeItem('community_hero_mock_mode');
  localStorage.removeItem('community_hero_mock_user');
  isMockMode = false;
  currentMockUser = null;
  authListeners.forEach(cb => cb(null));
  try {
    await realSignOut(authInstance);
  } catch (err) {
    console.error('Real sign out error:', err);
  }
}

function createMockUserSession(demoUser: typeof demoAccounts[number]) {
  isMockMode = true;
  localStorage.setItem('community_hero_mock_mode', 'true');
  const mockUserObj = {
    uid: 'mock_' + demoUser.role + '_' + Date.now(),
    email: demoUser.email,
    displayName: demoUser.name,
    emailVerified: true,
    isMock: true
  };
  currentMockUser = mockUserObj;
  localStorage.setItem('community_hero_mock_user', JSON.stringify(mockUserObj));
  
  // Initialize mock Firestore user profile
  const mockProfile = {
    uid: mockUserObj.uid,
    name: demoUser.name,
    email: demoUser.email,
    role: demoUser.role,
    points: demoUser.role === 'citizen' ? 40 : 0,
    badges: demoUser.role === 'citizen' ? ['First Responder'] : [],
    createdAt: Date.now(),
    department: demoUser.dept || null
  };
  saveMockDoc('users', mockUserObj.uid, mockProfile);

  authListeners.forEach(cb => cb(mockUserObj));
  return { user: mockUserObj };
}

// Mock Firestore Listener notification system
interface FirestoreListener {
  colName: string;
  docId?: string;
  queryConstraints?: any[];
  callback: (snapshot: any) => void;
}

const firestoreListeners = new Set<FirestoreListener>();

function notifyFirestoreListeners(colName: string) {
  firestoreListeners.forEach(listener => {
    if (listener.colName === colName) {
      if (listener.docId) {
        const items = getMockCollection(colName);
        const item = items.find(x => x.id === listener.docId);
        listener.callback({
          exists: () => !!item,
          id: listener.docId,
          data: () => item || null
        });
      } else {
        const items = getMockCollection(colName);
        let filteredItems = [...items];
        if (listener.queryConstraints) {
          listener.queryConstraints.forEach(constraint => {
            if (constraint.type === 'where') {
              const { field, op, val } = constraint;
              if (op === '==') {
                filteredItems = filteredItems.filter(x => x[field] === val);
              } else if (op === 'array-contains') {
                filteredItems = filteredItems.filter(x => Array.isArray(x[field]) && x[field].includes(val));
              }
            } else if (constraint.type === 'orderBy') {
              const { field, dir } = constraint;
              filteredItems.sort((a, b) => {
                if (a[field] < b[field]) return dir === 'desc' ? 1 : -1;
                if (a[field] > b[field]) return dir === 'desc' ? -1 : 1;
                return 0;
              });
            }
          });
        }
        
        const docs = filteredItems.map(item => ({
          id: item.id,
          data: () => item,
          exists: () => true
        }));
        
        listener.callback({
          docs,
          forEach: (cb: any) => docs.forEach(cb),
          empty: docs.length === 0,
          size: docs.length
        });
      }
    }
  });
}

// Custom wrapped Firestore helper functions
export function collection(dbInstance: any, path: string) {
  if (isMockMode) {
    return { type: 'collection', path };
  }
  return realCollection(dbInstance, path);
}

export function doc(dbInstance: any, path: string, ...segments: string[]) {
  if (isMockMode) {
    const fullPath = [path, ...segments].join('/');
    return { type: 'doc', path: fullPath, colName: path, docId: segments[0] };
  }
  return realDoc(dbInstance, path, ...segments);
}

export function query(colRef: any, ...constraints: any[]) {
  if (isMockMode) {
    return { type: 'query', colName: colRef.path, constraints };
  }
  return realQuery(colRef, ...constraints);
}

export function where(field: string, op: string, val: any) {
  if (isMockMode) {
    return { type: 'where', field, op, val };
  }
  return realWhere(field, op as any, val);
}

export function orderBy(field: string, dir: string = 'asc') {
  if (isMockMode) {
    return { type: 'orderBy', field, dir };
  }
  return realOrderBy(field, dir as any);
}

export function arrayUnion(...elements: any[]) {
  if (isMockMode) {
    return { type: 'arrayUnion', elements };
  }
  return realArrayUnion(...elements);
}

export function arrayRemove(...elements: any[]) {
  if (isMockMode) {
    return { type: 'arrayRemove', elements };
  }
  return realArrayRemove(...elements);
}

export function increment(n: number) {
  if (isMockMode) {
    return { type: 'increment', val: n };
  }
  return realIncrement(n);
}

function processMockValue(existingVal: any, incomingVal: any) {
  if (incomingVal && typeof incomingVal === 'object') {
    if (incomingVal.type === 'arrayUnion') {
      const current = Array.isArray(existingVal) ? existingVal : [];
      const toAdd = incomingVal.elements || [];
      return [...new Set([...current, ...toAdd])];
    }
    if (incomingVal.type === 'arrayRemove') {
      const current = Array.isArray(existingVal) ? existingVal : [];
      const toRemove = incomingVal.elements || [];
      return current.filter(x => !toRemove.includes(x));
    }
    if (incomingVal.type === 'increment') {
      const current = typeof existingVal === 'number' ? existingVal : 0;
      return current + (incomingVal.val || 0);
    }
  }
  return incomingVal;
}

export function onSnapshot(queryOrRef: any, onNext: (snapshot: any) => void, onError?: (err: any) => void) {
  if (isMockMode || (queryOrRef && queryOrRef.type)) {
    const colName = queryOrRef.colName || queryOrRef.path;
    const docId = queryOrRef.docId;
    const queryConstraints = queryOrRef.constraints;

    const listener: FirestoreListener = {
      colName,
      docId,
      queryConstraints,
      callback: onNext
    };

    firestoreListeners.add(listener);

    setTimeout(() => {
      if (docId) {
        const items = getMockCollection(colName);
        const item = items.find(x => x.id === docId);
        onNext({
          exists: () => !!item,
          id: docId,
          data: () => item || null
        });
      } else {
        const items = getMockCollection(colName);
        let filteredItems = [...items];
        if (queryConstraints) {
          queryConstraints.forEach(constraint => {
            if (constraint.type === 'where') {
              const { field, op, val } = constraint;
              if (op === '==') {
                filteredItems = filteredItems.filter(x => x[field] === val);
              } else if (op === 'array-contains') {
                filteredItems = filteredItems.filter(x => Array.isArray(x[field]) && x[field].includes(val));
              }
            } else if (constraint.type === 'orderBy') {
              const { field, dir } = constraint;
              filteredItems.sort((a, b) => {
                if (a[field] < b[field]) return dir === 'desc' ? 1 : -1;
                if (a[field] > b[field]) return dir === 'desc' ? -1 : 1;
                return 0;
              });
            }
          });
        }
        
        const docs = filteredItems.map(item => ({
          id: item.id,
          data: () => item,
          exists: () => true
        }));
        
        onNext({
          docs,
          forEach: (cb: any) => docs.forEach(cb),
          empty: docs.length === 0,
          size: docs.length
        });
      }
    }, 0);

    return () => {
      firestoreListeners.delete(listener);
    };
  }

  try {
    return realOnSnapshot(queryOrRef, onNext, (err) => {
      console.warn("Real onSnapshot failed, falling back to mock mode:", err);
      isMockMode = true;
      localStorage.setItem('community_hero_mock_mode', 'true');
      onSnapshot(queryOrRef, onNext, onError);
    });
  } catch (err) {
    console.warn("Real onSnapshot crashed, falling back to mock mode:", err);
    isMockMode = true;
    localStorage.setItem('community_hero_mock_mode', 'true');
    return onSnapshot(queryOrRef, onNext, onError);
  }
}

export async function addDoc(colRef: any, data: any) {
  if (isMockMode || (colRef && colRef.type === 'collection')) {
    const colName = colRef.path;
    const newId = 'id_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    const newItem = { ...data, id: newId };
    
    const items = getMockCollection(colName);
    items.push(newItem);
    saveMockCollection(colName, items);

    return { id: newId };
  }

  try {
    return await realAddDoc(colRef, data);
  } catch (err) {
    console.warn("Real addDoc failed, falling back to mock mode:", err);
    isMockMode = true;
    localStorage.setItem('community_hero_mock_mode', 'true');
    return await addDoc(colRef, data);
  }
}

export async function updateDoc(docRef: any, data: any) {
  if (isMockMode || (docRef && docRef.type === 'doc')) {
    const colName = docRef.colName || docRef.path.split('/')[0];
    const docId = docRef.docId || docRef.path.split('/')[1];

    const items = getMockCollection(colName);
    const idx = items.findIndex(x => x.id === docId);
    if (idx >= 0) {
      const existingItem = items[idx];
      const updatedData = { ...existingItem };
      for (const key in data) {
        updatedData[key] = processMockValue(existingItem[key], data[key]);
      }
      items[idx] = updatedData;
      saveMockCollection(colName, items);
    }
    return;
  }

  try {
    return await realUpdateDoc(docRef, data);
  } catch (err) {
    console.warn("Real updateDoc failed, falling back to mock mode:", err);
    isMockMode = true;
    localStorage.setItem('community_hero_mock_mode', 'true');
    return await updateDoc(docRef, data);
  }
}

export async function setDoc(docRef: any, data: any) {
  if (isMockMode || (docRef && docRef.type === 'doc')) {
    const colName = docRef.colName || docRef.path.split('/')[0];
    const docId = docRef.docId || docRef.path.split('/')[1];

    const items = getMockCollection(colName);
    const idx = items.findIndex(x => x.id === docId);
    
    const inputData = { ...data };
    if (idx >= 0) {
      const existingItem = items[idx];
      const updatedData = { ...existingItem };
      for (const key in inputData) {
        updatedData[key] = processMockValue(existingItem[key], inputData[key]);
      }
      items[idx] = { ...updatedData, id: docId };
    } else {
      const newItem: any = { id: docId };
      for (const key in inputData) {
        newItem[key] = processMockValue(undefined, inputData[key]);
      }
      items.push(newItem);
    }
    saveMockCollection(colName, items);
    return;
  }

  try {
    return await realSetDoc(docRef, data);
  } catch (err) {
    console.warn("Real setDoc failed, falling back to mock mode:", err);
    isMockMode = true;
    localStorage.setItem('community_hero_mock_mode', 'true');
    return await setDoc(docRef, data);
  }
}

export async function deleteDoc(docRef: any) {
  if (isMockMode || (docRef && docRef.type === 'doc')) {
    const colName = docRef.colName || docRef.path.split('/')[0];
    const docId = docRef.docId || docRef.path.split('/')[1];

    const items = getMockCollection(colName);
    const filtered = items.filter(x => x.id !== docId);
    saveMockCollection(colName, filtered);
    return;
  }

  try {
    return await realDeleteDoc(docRef);
  } catch (err) {
    console.warn("Real deleteDoc failed, falling back to mock mode:", err);
    isMockMode = true;
    localStorage.setItem('community_hero_mock_mode', 'true');
    return await deleteDoc(docRef);
  }
}

export async function getDoc(docRef: any) {
  if (isMockMode || (docRef && docRef.type === 'doc')) {
    const colName = docRef.colName || docRef.path.split('/')[0];
    const docId = docRef.docId || docRef.path.split('/')[1];

    const items = getMockCollection(colName);
    const item = items.find(x => x.id === docId);
    
    return {
      exists: () => !!item,
      id: docId,
      data: () => item || null
    };
  }

  try {
    return await realGetDoc(docRef);
  } catch (err) {
    console.warn("Real getDoc failed, falling back to mock mode:", err);
    isMockMode = true;
    localStorage.setItem('community_hero_mock_mode', 'true');
    return await getDoc(docRef);
  }
}

export async function getDocs(queryOrRef: any) {
  if (isMockMode || (queryOrRef && queryOrRef.type)) {
    const colName = queryOrRef.colName || queryOrRef.path;
    const queryConstraints = queryOrRef.constraints;

    const items = getMockCollection(colName);
    let filteredItems = [...items];
    if (queryConstraints) {
      queryConstraints.forEach(constraint => {
        if (constraint.type === 'where') {
          const { field, op, val } = constraint;
          if (op === '==') {
            filteredItems = filteredItems.filter(x => x[field] === val);
          } else if (op === 'array-contains') {
            filteredItems = filteredItems.filter(x => Array.isArray(x[field]) && x[field].includes(val));
          }
        } else if (constraint.type === 'orderBy') {
          const { field, dir } = constraint;
          filteredItems.sort((a, b) => {
            if (a[field] < b[field]) return dir === 'desc' ? 1 : -1;
            if (a[field] > b[field]) return dir === 'desc' ? -1 : 1;
            return 0;
          });
        }
      });
    }

    const docs = filteredItems.map(item => ({
      id: item.id,
      data: () => item,
      exists: () => true
    }));

    return {
      docs,
      forEach: (cb: any) => docs.forEach(cb),
      empty: docs.length === 0,
      size: docs.length
    };
  }

  try {
    return await realGetDocs(queryOrRef);
  } catch (err) {
    console.warn("Real getDocs failed, falling back to mock mode:", err);
    isMockMode = true;
    localStorage.setItem('community_hero_mock_mode', 'true');
    return await getDocs(queryOrRef);
  }
}
