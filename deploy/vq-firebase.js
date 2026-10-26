// v_Q × Firebase (project: vqcbd-8ecd5) — Auth + Firestore. Loaded as <script type="module">.
// Exposes window.VQFire and fires window events 'vqfire-ready' / 'vqfire-auth'.
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, sendPasswordResetEmail, reauthenticateWithCredential, EmailAuthProvider, updatePassword } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
import { getFirestore, doc, getDoc, setDoc, updateDoc, collection, query, where, orderBy, onSnapshot, serverTimestamp, increment, writeBatch, addDoc, deleteDoc, getDocs } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

const firebaseConfig = {
  apiKey: 'AIzaSyAPmEalBu5ib5jq109BaHcZ1-CaIciDXcQ',
  authDomain: 'vqcbd-8ecd5.firebaseapp.com',
  projectId: 'vqcbd-8ecd5',
  storageBucket: 'vqcbd-8ecd5.firebasestorage.app',
  messagingSenderId: '427927684923',
  appId: '1:427927684923:web:190ee785ec08987934591e',
  measurementId: 'G-92CZMSQ437'
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const SEED_PRODUCTS = [
  { id: 'vq-day', name: 'v_Q DAY — CITRUS 1.0 mL', sku: 'VQ-DAY-CT10', price: 4980, category: 'cbg', requiresCode: false, img: 'assets/vq/box-day.png' },
  { id: 'vq-chill', name: 'v_Q CHILL — OG KUSH 1.0 mL', sku: 'VQ-CHL-OG10', price: 4980, category: 'cbd', requiresCode: false, img: 'assets/vq/box-chill.png' },
  { id: 'vq-focus', name: 'v_Q FOCUS — LEMON HAZE 1.0 mL', sku: 'VQ-FCS-LH10', price: 4980, category: 'cbd', requiresCode: false, img: 'assets/vq/box-focus.png' },
  { id: 'vq-night', name: 'v_Q NIGHT — CBX 1.0 mL', sku: 'VQ-NGT-GL10', price: 4980, category: 'cbx', requiresCode: true, img: 'assets/vq/box-night.png' },
  { id: 'vq-tron', name: 'v_Q CBX — TRON Pro 1.0 mL', sku: 'VQ-CBX-TRN10', price: 6980, category: 'cbx', requiresCode: true, img: '' },
  { id: 'vq-glo', name: 'v_Q CBX — GLO Pro 1.0 mL', sku: 'VQ-CBX-GLO10', price: 7480, category: 'cbx', requiresCode: true, img: '' },
  { id: 'vq-set', name: 'v_Q VIBE SET — 4本セット', sku: 'VQ-SET-4', price: 17800, category: 'referral', requiresCode: true, img: '' }
];
const SEED_SETTINGS = {
  shippingFee: 550, freeShippingThreshold: 8000,
  bankAccount: { bank: 'PayPay銀行', branch: 'うぐいす支店（ウグイス）', branchNo: '008', type: '普通', number: '5245559', holder: 'タカキナオキ' },
  bankPayDays: 7, paypayLinkHours: 24, paypayEnabled: false
};
const SEED_CODES = ['VQ-8F2K-QN41', 'VQ-1A9C-TT02', 'VQ-6D3M-LZ88'];

const MSG = {
  'auth/invalid-credential': 'メールアドレスまたはパスワードが正しくありません。',
  'auth/wrong-password': 'メールアドレスまたはパスワードが正しくありません。',
  'auth/user-not-found': 'メールアドレスまたはパスワードが正しくありません。',
  'auth/invalid-email': 'メールアドレスの形式が正しくありません。',
  'auth/email-already-in-use': 'このメールアドレスはすでに登録されています。',
  'auth/weak-password': 'パスワードは8文字以上で設定してください。',
  'auth/too-many-requests': '試行回数が多すぎます。しばらくしてから再度お試しください。',
  'auth/network-request-failed': '通信に失敗しました。接続を確認してください。',
  'auth/configuration-not-found': 'ログイン機能が未設定です（Firebase Authentication を有効にしてください）。',
  'auth/operation-not-allowed': 'メール/パスワードでのログインが無効です（Firebase コンソールで有効にしてください）。',
  'vq/not-allowed': '紹介コードを発行できるのは、管理者発行のコードでご登録いただいた会員の方のみです。',
  'auth/requires-recent-login': 'セキュリティのため、再度ログインしてからお試しください。',
  'permission-denied': '権限がありません。'
};
const msg = e => MSG[e && e.code] || ('エラーが発生しました（' + ((e && e.code) || 'unknown') + '）');
const AUTH_UNAVAILABLE = ['auth/configuration-not-found', 'auth/operation-not-allowed'];

let current = null;
async function resolveUser(u) {
  if (!u) return null;
  const [m, a] = await Promise.all([
    getDoc(doc(db, 'members', u.uid)).catch(() => null),
    getDoc(doc(db, 'admins', u.uid)).catch(() => null)
  ]);
  return { uid: u.uid, email: u.email, role: a && a.exists() ? 'admin' : 'member', profile: m && m.exists() ? m.data() : null };
}
const emit = () => window.dispatchEvent(new CustomEvent('vqfire-auth', { detail: current }));
onAuthStateChanged(auth, async u => { current = await resolveUser(u); emit(); });

const mapSnap = snap => snap.docs.map(d => Object.assign({ id: d.id }, d.data()));

const VQFire = {
  project: firebaseConfig.projectId,
  get user() { return current; },
  msg, AUTH_UNAVAILABLE,

  async signIn(email, pw) {
    const cred = await signInWithEmailAndPassword(auth, email, pw);
    current = await resolveUser(cred.user); emit(); return current;
  },
  async getCode(code) {
    const d = await getDoc(doc(db, 'referralCodes', code)).catch(() => null);
    return d && d.exists() ? Object.assign({ id: d.id }, d.data()) : null;
  },
  async signUp(f) {
    const c = f.code ? await VQFire.getCode(f.code) : null;
    const type = c ? (c.issuerType || 'admin') : null;
    const referredBy = c ? { type: type, id: c.issuerId || c.createdBy || '', name: type === 'member' ? (c.issuerName || '会員') : '管理者' } : null;
    const cred = await createUserWithEmailAndPassword(auth, f.email, f.pw);
    const profile = { name: f.name, email: f.email, tel: '', birthDate: f.birthDate, referralCode: f.code || null, codeAccess: !!f.code,
      referredBy: referredBy, canIssue: type === 'admin', ownCode: null,
      status: 'active', favorites: [], mailOptIn: true, createdAt: serverTimestamp(), updatedAt: serverTimestamp() };
    await setDoc(doc(db, 'members', cred.user.uid), profile);
    if (f.code) await updateDoc(doc(db, 'referralCodes', f.code), { usedCount: increment(1) }).catch(() => {});
    current = await resolveUser(cred.user); emit(); return current;
  },
  async signOut() { await signOut(auth); current = null; emit(); },
  resetPassword: email => sendPasswordResetEmail(auth, email),
  async updateProfile(p) { if (!current) return; await updateDoc(doc(db, 'members', current.uid), Object.assign({}, p, { updatedAt: serverTimestamp() })); },

  async changePassword(cur, next) {
    const u = auth.currentUser; if (!u) throw { code: 'auth/requires-recent-login' };
    await reauthenticateWithCredential(u, EmailAuthProvider.credential(u.email, cur));
    await updatePassword(u, next);
  },
  async withdraw() {
    if (!current) return;
    await updateDoc(doc(db, 'members', current.uid), { status: 'withdrawn', updatedAt: serverTimestamp() });
    await signOut(auth); current = null; emit();
  },
  subscribeAddresses(cb, onErr) {
    if (!current) return () => {};
    return onSnapshot(collection(db, 'members', current.uid, 'addresses'), s => cb(mapSnap(s)), e => onErr && onErr(e));
  },
  addAddress: a => addDoc(collection(db, 'members', current.uid, 'addresses'), Object.assign({}, a, { createdAt: serverTimestamp() })),
  removeAddress: id => deleteDoc(doc(db, 'members', current.uid, 'addresses', id)),
  subscribeMembers: (cb, onErr) => onSnapshot(collection(db, 'members'), s => cb(mapSnap(s)), e => onErr && onErr(e)),
  setMemberStatus: (uid, status) => updateDoc(doc(db, 'members', uid), { status: status, updatedAt: serverTimestamp() }),

  async checkCode(code) {
    const d = await getDoc(doc(db, 'referralCodes', code)).catch(() => null);
    if (!d || !d.exists()) return false;
    const c = d.data();
    if (!c.active) return false;
    if (c.expiresAt && c.expiresAt.toMillis && c.expiresAt.toMillis() < Date.now()) return false;
    if (c.maxUses != null && (c.usedCount || 0) >= c.maxUses) return false;
    return true;
  },
  async grantCodeAccess(code) {
    if (!current) return;
    await updateDoc(doc(db, 'members', current.uid), { codeAccess: true, referralCode: code, updatedAt: serverTimestamp() });
    if (current.profile) { current.profile.codeAccess = true; current.profile.referralCode = code; }
  },

  subscribeOrders(cb, onErr) {
    if (!current) return () => {};
    const q = current.role === 'admin'
      ? query(collection(db, 'orders'), orderBy('createdAt', 'desc'))
      : query(collection(db, 'orders'), where('memberId', '==', current.uid));
    return onSnapshot(q, snap => {
      const list = mapSnap(snap).map(o => Object.assign({}, o, { no: o.no || o.id }));
      list.sort((a, b) => ((b.createdAt && b.createdAt.toMillis ? b.createdAt.toMillis() : 0) - (a.createdAt && a.createdAt.toMillis ? a.createdAt.toMillis() : 0)));
      cb(list);
    }, e => onErr && onErr(e));
  },
  async createOrder(rec) {
    const data = Object.assign({}, rec, { memberId: current.uid, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
    await setDoc(doc(db, 'orders', rec.no), data);
    for (const l of rec.lines || []) {
      const ref = doc(db, 'products', l.id);
      const p = await getDoc(ref).catch(() => null);
      if (p && p.exists() && typeof p.data().stock === 'number') await updateDoc(ref, { stock: Math.max(0, p.data().stock - l.qty) }).catch(() => {});
    }
  },
  updateOrder: (no, patch) => updateDoc(doc(db, 'orders', no), Object.assign({}, patch, { updatedAt: serverTimestamp() })),

  subscribeProducts: (cb, onErr) => onSnapshot(collection(db, 'products'), s => cb(mapSnap(s)), e => onErr && onErr(e)),
  saveProduct: (id, data) => updateDoc(doc(db, 'products', id), Object.assign({}, data, { updatedAt: serverTimestamp() })),
  createProduct: (id, data) => setDoc(doc(db, 'products', id), Object.assign({}, data, { updatedAt: serverTimestamp() })),
  deleteProduct: id => deleteDoc(doc(db, 'products', id)),

  // COA PDF — stored as base64 chunks in Firestore (works on the free Spark plan)
  subscribeCoa: (cb, onErr) => onSnapshot(collection(db, 'coa'), s => cb(mapSnap(s)), e => onErr && onErr(e)),
  async uploadCoa(meta, file) {
    const b64 = await new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result).split(',')[1] || ''); r.onerror = rej; r.readAsDataURL(file); });
    const SIZE = 700000, n = Math.ceil(b64.length / SIZE);
    const ref = doc(collection(db, 'coa'));
    const b = writeBatch(db);
    b.set(ref, Object.assign({}, meta, { fileName: file.name, fileSize: file.size, chunks: n, createdAt: serverTimestamp() }));
    for (let i = 0; i < n; i++) b.set(doc(db, 'coa', ref.id, 'chunks', String(i).padStart(3, '0')), { i: i, d: b64.slice(i * SIZE, (i + 1) * SIZE) });
    await b.commit();
    return ref.id;
  },
  async getCoaBlob(id) {
    const snap = await getDocs(collection(db, 'coa', id, 'chunks'));
    const parts = snap.docs.map(d => d.data()).sort((a, b) => a.i - b.i).map(x => x.d).join('');
    const bin = atob(parts), u8 = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
    return new Blob([u8], { type: 'application/pdf' });
  },
  async deleteCoa(id) {
    const snap = await getDocs(collection(db, 'coa', id, 'chunks'));
    const b = writeBatch(db);
    snap.docs.forEach(d => b.delete(d.ref)); b.delete(doc(db, 'coa', id));
    await b.commit();
  },

  saveSettings: data => setDoc(doc(db, 'settings', 'store'), data, { merge: true }),
  subscribeSettings: (cb, onErr) => onSnapshot(doc(db, 'settings', 'store'), d => cb(d.exists() ? d.data() : null), e => onErr && onErr(e)),

  subscribeCodes: (cb, onErr) => onSnapshot(collection(db, 'referralCodes'), s => cb(mapSnap(s)), e => onErr && onErr(e)),
  issueCode: (code, label) => setDoc(doc(db, 'referralCodes', code), { active: true, label: label, maxUses: null, usedCount: 0, expiresAt: null,
    issuerType: 'admin', issuerId: current ? current.uid : '', issuerName: '管理者', createdBy: current ? current.uid : '', createdAt: serverTimestamp() }),
  async issueMyCode() {
    if (!current || !current.profile) throw { code: 'permission-denied' };
    if (!current.profile.canIssue) throw { code: 'vq/not-allowed' };
    if (current.profile.ownCode) return current.profile.ownCode;
    const abc = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    const seg = n => Array.from({ length: n }, () => abc[Math.floor(Math.random() * abc.length)]).join('');
    const code = 'VQ-' + seg(4) + '-' + seg(4);
    await setDoc(doc(db, 'referralCodes', code), { active: true, label: current.profile.name || '', maxUses: null, usedCount: 0, expiresAt: null,
      issuerType: 'member', issuerId: current.uid, issuerName: current.profile.name || '', createdBy: current.uid, createdAt: serverTimestamp() });
    await updateDoc(doc(db, 'members', current.uid), { ownCode: code, updatedAt: serverTimestamp() });
    current.profile.ownCode = code;
    return code;
  },
  setMemberCanIssue: (uid, v) => updateDoc(doc(db, 'members', uid), { canIssue: !!v, updatedAt: serverTimestamp() }),
  setCodeActive: (code, active) => updateDoc(doc(db, 'referralCodes', code), { active: active }),

  async seed() {
    const b = writeBatch(db);
    SEED_PRODUCTS.forEach((p, i) => b.set(doc(db, 'products', p.id), Object.assign({}, p, { stock: 50, published: true, sort: i, updatedAt: serverTimestamp() }), { merge: true }));
    b.set(doc(db, 'settings', 'store'), SEED_SETTINGS, { merge: true });
    SEED_CODES.forEach(c => b.set(doc(db, 'referralCodes', c), { active: true, label: '初期コード', maxUses: null, usedCount: 0, expiresAt: null, issuerType: 'admin', issuerName: '管理者', issuerId: current ? current.uid : '', createdBy: current ? current.uid : '', createdAt: serverTimestamp() }, { merge: true }));
    await b.commit();
  }
};

window.VQFire = VQFire;
window.dispatchEvent(new CustomEvent('vqfire-ready'));
