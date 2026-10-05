// v_Q shared order store — used by both v_Q Store and v_Q Admin.
// Live: Firestore via window.VQFire (vq-firebase.js) when a Firebase user is signed in.
// Demo: localStorage (demo accounts / Firebase Auth not yet enabled).
(function () {
  var KEY = 'vq_orders_v2';
  var SEED = [
    { no: 'VQ-260930-0206', date: '2026年9月30日', memberId: 'VQ-0002931', customer: '中村 拓海', pay: 'bank', payStatus: 'unpaid', shipStatus: 'pending', total: 8800, lines: [{ id: 'vq-focus', qty: 1 }] },
    { no: 'VQ-260929-0205', date: '2026年9月29日', memberId: 'VQ-0002044', customer: '石田 美咲', pay: 'bank', payStatus: 'unpaid', shipStatus: 'pending', total: 25300, lines: [{ id: 'vq-chill', qty: 2 }, { id: 'vq-day', qty: 1 }] },
    { no: 'VQ-260928-0202', date: '2026年9月28日', memberId: 'VQ-0001842', customer: '佐藤 慶', pay: 'bank', payStatus: 'unpaid', shipStatus: 'pending', total: 8300, lines: [{ id: 'vq-focus', qty: 1 }] },
    { no: 'VQ-260927-0201', date: '2026年9月27日', memberId: 'VQ-0001120', customer: '青山 恵', pay: 'paypay', payStatus: 'paid', paidAt: '2026年9月27日', shipStatus: 'preparing', total: 7700, lines: [{ id: 'vq-day', qty: 1 }] },
    { no: 'VQ-260925-0196', date: '2026年9月25日', memberId: 'VQ-0003310', customer: '大西 亮', pay: 'bank', payStatus: 'paid', paidAt: '2026年9月26日', shipStatus: 'shipped', shippedAt: '2026年9月27日', carrier: 'ヤマト運輸', trackNo: '4821-9102-3345', total: 15400, lines: [{ id: 'vq-night', qty: 2 }] },
    { no: 'VQ-260912-0187', date: '2026年9月12日', memberId: 'VQ-0001842', customer: '佐藤 慶', pay: 'bank', payStatus: 'paid', paidAt: '2026年9月13日', shipStatus: 'shipped', shippedAt: '2026年9月14日', carrier: 'ヤマト運輸', trackNo: '4821-9930-1174', total: 9960, lines: [{ id: 'vq-night', qty: 1 }, { id: 'vq-day', qty: 1 }] },
    { no: 'VQ-260910-0184', date: '2026年9月10日', memberId: 'VQ-0000875', customer: '森本 涼', pay: 'bank', payStatus: 'cancelled', shipStatus: 'pending', total: 33000, lines: [{ id: 'vq-set', qty: 2 }] },
    { no: 'VQ-260821-0143', date: '2026年8月21日', memberId: 'VQ-0001842', customer: '佐藤 慶', pay: 'paypay', payStatus: 'paid', paidAt: '2026年8月21日', shipStatus: 'delivered', shippedAt: '2026年8月22日', deliveredAt: '2026年8月23日', carrier: 'ヤマト運輸', trackNo: '4821-8812-0021', total: 17800, lines: [{ id: 'vq-set', qty: 1 }] },
    { no: 'VQ-260705-0098', date: '2026年7月5日', memberId: 'VQ-0001842', customer: '佐藤 慶', pay: 'bank', payStatus: 'paid', paidAt: '2026年7月5日', shipStatus: 'delivered', shippedAt: '2026年7月6日', deliveredAt: '2026年7月7日', carrier: 'ヤマト運輸', trackNo: '4821-7310-5540', total: 9960, lines: [{ id: 'vq-chill', qty: 2 }] }
  ];
  var PAY_NEXT = { unpaid: ['paid', 'expired', 'cancelled'], paid: ['refunded', 'cancelled'] };
  var SHIP_NEXT = { pending: ['preparing'], preparing: ['shipped', 'returned'], shipped: ['delivered', 'returned'], delivered: ['returned'] };

  var fsList = [], fsUnsub = null, subs = [], lastError = null;
  function F() { return window.VQFire; }
  function prod() { return !!window.VQ_PROD || /github\.io$/.test(location.hostname); }
  function live() { return !!(F() && F().user); }
  function emit() { var l = load(); subs.forEach(function (cb) { cb(l); }); }

  function localLoad() {
    try { var v = JSON.parse(localStorage.getItem(KEY)); if (Array.isArray(v)) return v; } catch (e) {}
    save(SEED); return SEED.slice();
  }
  function save(list) { try { localStorage.setItem(KEY, JSON.stringify(list)); } catch (e) {} }
  function load() { return live() || prod() ? fsList : localLoad(); }
  function today() { var d = new Date(); return d.getFullYear() + '年' + (d.getMonth() + 1) + '月' + d.getDate() + '日'; }
  function ok(map, from, to) { return from === to || (map[from] || []).indexOf(to) >= 0; }

  function update(no, patch) {
    var list = load(), err = null, next = null;
    var o = list.filter(function (x) { return x.no === no; })[0];
    if (!o) return { list: list, error: 'notfound' };
    if (patch.payStatus && !ok(PAY_NEXT, o.payStatus, patch.payStatus)) err = 'payStatus';
    else if (patch.shipStatus && !ok(SHIP_NEXT, o.shipStatus, patch.shipStatus)) err = 'shipStatus';
    else if (patch.shipStatus === 'preparing' && (patch.payStatus || o.payStatus) !== 'paid') err = 'unpaid';
    if (err) return { list: list, error: err };
    next = list.map(function (x) { return x.no === no ? Object.assign({}, x, patch, { updatedAt: Date.now() }) : x; });
    if (live()) { fsList = next; F().updateOrder(no, patch).catch(function (e) { lastError = e; console.error('[VQOrders]', (e && (e.code || e.message)) || e); }); }
    else save(next);
    return { list: next, error: null };
  }
  function add(rec) {
    if (live()) { fsList = [rec].concat(fsList); F().createOrder(rec).catch(function (e) { lastError = e; console.error('[VQOrders]', (e && (e.code || e.message)) || e); }); return fsList; }
    var list = [rec].concat(localLoad()); save(list); return list;
  }
  function attach() {
    if (fsUnsub) { fsUnsub(); fsUnsub = null; }
    fsList = [];
    if (live()) fsUnsub = F().subscribeOrders(function (l) { fsList = l; emit(); }, function (e) { lastError = e; console.error('[VQOrders]', (e && (e.code || e.message)) || e); });
    emit();
  }
  window.addEventListener('vqfire-auth', attach);

  function subscribe(cb) {
    subs.push(cb);
    var h = function (e) { if (e.key === KEY && !live()) cb(load()); };
    window.addEventListener('storage', h);
    var t = setInterval(function () { if (!live()) cb(load()); }, 5000);
    return function () { subs = subs.filter(function (x) { return x !== cb; }); window.removeEventListener('storage', h); clearInterval(t); };
  }
  function reset() { if (live()) return fsList; save(SEED); return SEED.slice(); }
  window.VQOrders = { KEY: KEY, load: load, save: save, update: update, add: add, subscribe: subscribe, today: today, reset: reset,
    isLive: live, lastError: function () { return lastError; } };
})();
