    import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { LogOut } from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { getDatabase, ref, set, onValue, remove } from 'firebase/database';

// Firebase Config
const firebaseConfig = {
  apiKey: "AIzaSyDKVch1VTErpbv6RckVKpZC_ACWXld7ajM",
  authDomain: "sheep-farm2-pro.firebaseapp.com",
  databaseURL: "https://sheep-farm2-pro-default-rtdb.firebaseio.com",
  projectId: "sheep-farm2-pro",
  storageBucket: "sheep-farm2-pro.appspot.com",
  messagingSenderId: "610995382085",
  appId: "1:610995382085:web:ede6bf321d4947e9f2002c"
};

const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

const App = () => {
  const [user, setUser] = useState(null);
  const [authMode, setAuthMode] = useState('login');
  const [loginData, setLoginData] = useState({ email: '', password: '' });
  const [registerData, setRegisterData] = useState({ email: '', password: '', confirmPassword: '', name: '' });
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [sheep, setSheep] = useState([]);
  const [feeds, setFeeds] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [sheepForm, setSheepForm] = useState({
    number: '', type: 'sheep', ageValue: '', ageType: 'years', status: 'productive',
    lastProduction: new Date().toISOString().split('T')[0], notes: '', exitType: 'active'
  });
  const [feedForm, setFeedForm] = useState({ date: new Date().toISOString().split('T')[0], type: 'شعير', quantity: '', pricePerKg: '' });
  const [expenseForm, setExpenseForm] = useState({ date: new Date().toISOString().split('T')[0], category: 'رواتب', amount: '' });

  // Load User
  useEffect(() => {
    const saved = localStorage.getItem('sheepFarmUser');
    if (saved) setUser(JSON.parse(saved));
  }, []);

  // Firebase Sync - Sheep
  useEffect(() => {
    if (user) {
      const sheepRef = ref(database, `users/${user.id}/sheep`);
      onValue(sheepRef, (snapshot) => {
        const data = snapshot.val();
        if (data) {
          setSheep(Object.entries(data).map(([key, value]) => ({ id: key, ...value })));
        }
      });
    }
  }, [user]);

  // Firebase Sync - Feeds
  useEffect(() => {
    if (user) {
      const feedsRef = ref(database, `users/${user.id}/feeds`);
      onValue(feedsRef, (snapshot) => {
        const data = snapshot.val();
        if (data) {
          setFeeds(Object.entries(data).map(([key, value]) => ({ id: key, ...value })));
        }
      });
    }
  }, [user]);

  // Firebase Sync - Expenses
  useEffect(() => {
    if (user) {
      const expensesRef = ref(database, `users/${user.id}/expenses`);
      onValue(expensesRef, (snapshot) => {
        const data = snapshot.val();
        if (data) {
          setExpenses(Object.entries(data).map(([key, value]) => ({ id: key, ...value })));
        }
      });
    }
  }, [user]);

  const handleLoginChange = useCallback((f, v) => setLoginData(p => ({ ...p, [f]: v })), []);
  const handleRegisterChange = useCallback((f, v) => setRegisterData(p => ({ ...p, [f]: v })), []);

  const handleLogin = (e) => {
    e.preventDefault();
    if (!loginData.email || !loginData.password) return alert('ادخل البريد والباسورد');
    const u = { id: loginData.email.replace(/[^a-z0-9]/g, ''), email: loginData.email, name: loginData.email.split('@')[0] };
    localStorage.setItem('sheepFarmUser', JSON.stringify(u));
    setUser(u);
    setLoginData({ email: '', password: '' });
  };

  const handleRegister = (e) => {
    e.preventDefault();
    if (!registerData.email || !registerData.password || !registerData.name) return alert('ملء كل الحقول');
    if (registerData.password !== registerData.confirmPassword) return alert('الباسورد مختلف');
    const u = { id: registerData.email.replace(/[^a-z0-9]/g, ''), email: registerData.email, name: registerData.name };
    localStorage.setItem('sheepFarmUser', JSON.stringify(u));
    setUser(u);
    setRegisterData({ email: '', password: '', confirmPassword: '', name: '' });
    setAuthMode('login');
  };

  const handleLogout = () => {
    localStorage.removeItem('sheepFarmUser');
    setUser(null);
  };

  const generateAlerts = useCallback(() => {
    const newAlerts = [];
    feeds.forEach(f => {
      if (Math.ceil(parseFloat(f.quantity || 0)) < 10) {
        newAlerts.push({ id: `feed-${f.id}`, message: `علف ${f.type}: ${Math.ceil(parseFloat(f.quantity))} كيس` });
      }
    });
    setAlerts(newAlerts);
  }, [feeds]);

  useEffect(() => {
    generateAlerts();
  }, [feeds, generateAlerts]);

  const handleSheepChange = useCallback((f, v) => setSheepForm(p => ({ ...p, [f]: v })), []);
  const handleFeedChange = useCallback((f, v) => setFeedForm(p => ({ ...p, [f]: v })), []);
  const handleExpenseChange = useCallback((f, v) => setExpenseForm(p => ({ ...p, [f]: v })), []);

  const handleAddSheep = async () => {
    if (!sheepForm.number || !sheepForm.ageValue) return alert('ملء البيانات');
    if (!user) return;
    
    const newSheep = { ...sheepForm, id: editingId || `sheep-${Date.now()}` };
    const sheepId = editingId || `sheep-${Date.now()}`;
    
    try {
      await set(ref(database, `users/${user.id}/sheep/${sheepId}`), { ...sheepForm });
      setSheepForm({ number: '', type: 'sheep', ageValue: '', ageType: 'years', status: 'productive', lastProduction: new Date().toISOString().split('T')[0], notes: '', exitType: 'active' });
      setShowModal(false);
      setEditingId(null);
    } catch (error) {
      alert('خطأ: ' + error.message);
    }
  };

  const handleAddFeed = async () => {
    if (!feedForm.quantity || !feedForm.pricePerKg) return alert('ملء البيانات');
    if (!user) return;
    
    const feedId = editingId || `feed-${Date.now()}`;
    
    try {
      await set(ref(database, `users/${user.id}/feeds/${feedId}`), feedForm);
      setFeedForm({ date: new Date().toISOString().split('T')[0], type: 'شعير', quantity: '', pricePerKg: '' });
      setShowModal(false);
      setEditingId(null);
    } catch (error) {
      alert('خطأ: ' + error.message);
    }
  };

  const handleAddExpense = async () => {
    if (!expenseForm.amount) return alert('ملء المبلغ');
    if (!user) return;
    
    const expenseId = editingId || `expense-${Date.now()}`;
    
    try {
      await set(ref(database, `users/${user.id}/expenses/${expenseId}`), expenseForm);
      setExpenseForm({ date: new Date().toISOString().split('T')[0], category: 'رواتب', amount: '' });
      setShowModal(false);
      setEditingId(null);
    } catch (error) {
      alert('خطأ: ' + error.message);
    }
  };

  const handleDelete = async (type, id) => {
    if (!window.confirm('حذف؟')) return;
    if (!user) return;
    
    try {
      if (type === 'sheep') await remove(ref(database, `users/${user.id}/sheep/${id}`));
      else if (type === 'feed') await remove(ref(database, `users/${user.id}/feeds/${id}`));
      else if (type === 'expense') await remove(ref(database, `users/${user.id}/expenses/${id}`));
    } catch (error) {
      alert('خطأ: ' + error.message);
    }
  };

  const handleEdit = (type, id) => {
    if (type === 'sheep') {
      const item = sheep.find(s => s.id === id);
      if (item) { setSheepForm(item); setEditingId(id); setModalType('sheep'); setShowModal(true); }
    } else if (type === 'feed') {
      const item = feeds.find(f => f.id === id);
      if (item) { setFeedForm(item); setEditingId(id); setModalType('feed'); setShowModal(true); }
    } else if (type === 'expense') {
      const item = expenses.find(e => e.id === id);
      if (item) { setExpenseForm(item); setEditingId(id); setModalType('expense'); setShowModal(true); }
    }
  };

  const calculations = useMemo(() => {
    const activeSheep = sheep.filter(s => s.exitType === 'active');
    const producingSheep = activeSheep.filter(s => s.status === 'productive').length;
    const feedCosts = feeds.reduce((sum, f) => sum + (parseFloat(f.quantity || 0) * parseFloat(f.pricePerKg || 0)), 0);
    const expenseCosts = expenses.reduce((sum, e) => sum + parseFloat(e.amount || 0), 0);
    return {
      totalSheep: activeSheep.length,
      producingSheep,
      productivity: activeSheep.length ? ((producingSheep / activeSheep.length) * 100).toFixed(1) : 0,
      totalCosts: (feedCosts + expenseCosts).toFixed(0),
    };
  }, [sheep, feeds, expenses]);

  if (!user) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #5D4E37 0%, #3D2817 100%)' }}>
        <div style={{ background: 'white', padding: '40px', borderRadius: '12px', maxWidth: '500px', width: '90%' }}>
          <h1 style={{ color: '#3D2817', textAlign: 'center', marginBottom: '30px' }}>🐑 FarmHub Pro</h1>
          {authMode === 'login' ? (
            <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <h2 style={{ color: '#3D2817', marginBottom: '20px' }}>دخول</h2>
              <input type="email" placeholder="البريد" value={loginData.email} onChange={(e) => handleLoginChange('email', e.target.value)} style={{ padding: '10px', border: '1px solid #ddd', borderRadius: '6px' }} />
              <input type="password" placeholder="الباسورد" value={loginData.password} onChange={(e) => handleLoginChange('password', e.target.value)} style={{ padding: '10px', border: '1px solid #ddd', borderRadius: '6px' }} />
              <button type="submit" style={{ background: '#8B6F47', color: 'white', border: 'none', padding: '10px', borderRadius: '6px', cursor: 'pointer' }}>دخول</button>
              <button type="button" onClick={() => setAuthMode('register')} style={{ background: 'none', border: 'none', color: '#8B6F47', cursor: 'pointer' }}>تسجيل جديد</button>
            </form>
          ) : (
            <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <h2 style={{ color: '#3D2817', marginBottom: '20px' }}>تسجيل</h2>
              <input type="text" placeholder="الاسم" value={registerData.name} onChange={(e) => handleRegisterChange('name', e.target.value)} style={{ padding: '10px', border: '1px solid #ddd', borderRadius: '6px' }} />
              <input type="email" placeholder="البريد" value={registerData.email} onChange={(e) => handleRegisterChange('email', e.target.value)} style={{ padding: '10px', border: '1px solid #ddd', borderRadius: '6px' }} />
              <input type="password" placeholder="الباسورد" value={registerData.password} onChange={(e) => handleRegisterChange('password', e.target.value)} style={{ padding: '10px', border: '1px solid #ddd', borderRadius: '6px' }} />
              <input type="password" placeholder="تأكيد الباسورد" value={registerData.confirmPassword} onChange={(e) => handleRegisterChange('confirmPassword', e.target.value)} style={{ padding: '10px', border: '1px solid #ddd', borderRadius: '6px' }} />
              <button type="submit" style={{ background: '#8B6F47', color: 'white', border: 'none', padding: '10px', borderRadius: '6px', cursor: 'pointer' }}>تسجيل</button>
              <button type="button" onClick={() => setAuthMode('login')} style={{ background: 'none', border: 'none', color: '#8B6F47', cursor: 'pointer' }}>دخول</button>
            </form>
          )}
        </div>
      </div>
    );
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <div style={{ padding: '30px' }}>
            <h1>📊 لوحة التحكم</h1>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
              <div style={{ background: '#f0f0f0', padding: '20px', borderRadius: '8px' }}>
                <p>إجمالي الثروة</p>
                <p style={{ fontSize: '32px', fontWeight: 'bold' }}>{calculations.totalSheep}</p>
              </div>
              <div style={{ background: '#f0f0f0', padding: '20px', borderRadius: '8px' }}>
                <p>المنتجة</p>
                <p style={{ fontSize: '32px', fontWeight: 'bold' }}>{calculations.producingSheep}</p>
              </div>
              <div style={{ background: '#f0f0f0', padding: '20px', borderRadius: '8px' }}>
                <p>الإنتاجية</p>
                <p style={{ fontSize: '32px', fontWeight: 'bold' }}>{calculations.productivity}%</p>
              </div>
              <div style={{ background: '#f0f0f0', padding: '20px', borderRadius: '8px' }}>
                <p>التكاليف</p>
                <p style={{ fontSize: '32px', fontWeight: 'bold' }}>{calculations.totalCosts}</p>
              </div>
            </div>
            <div style={{ marginTop: '30px', background: 'white', padding: '20px', borderRadius: '8px' }}>
              <h3>التنبيهات ({alerts.length})</h3>
              {alerts.length === 0 ? <p>✓ الحالة جيدة</p> : alerts.map(a => <p key={a.id}>{a.message}</p>)}
            </div>
          </div>
        );
      case 'sheep':
        return (
          <div style={{ padding: '30px' }}>
            <h1>🐑 الأغنام</h1>
            <button onClick={() => { setSheepForm({ number: '', type: 'sheep', ageValue: '', ageType: 'years', status: 'productive', lastProduction: new Date().toISOString().split('T')[0], notes: '', exitType: 'active' }); setModalType('sheep'); setShowModal(true); setEditingId(null); }} style={{ marginBottom: '20px', background: '#8B6F47', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '6px', cursor: 'pointer' }}>+ إضافة</button>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
              <thead>
                <tr style={{ background: '#f0f0f0' }}>
                  <th style={{ padding: '8px', textAlign: 'right' }}>النوع</th>
                  <th style={{ padding: '8px', textAlign: 'right' }}>الرقم</th>
                  <th style={{ padding: '8px', textAlign: 'right' }}>السن</th>
                  <th style={{ padding: '8px', textAlign: 'right' }}>الحالة</th>
                  <th style={{ padding: '8px', textAlign: 'right' }}>آخر إنتاج</th>
                  <th style={{ padding: '8px', textAlign: 'right' }}>ملاحظات</th>
                  <th style={{ padding: '8px', textAlign: 'right' }}>الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {sheep.map(s => (
                  <tr key={s.id} style={{ borderBottom: '1px solid #ddd', background: s.type === 'sheep' ? '#f9f3f0' : '#f0f9f3' }}>
                    <td style={{ padding: '8px', fontWeight: 'bold', color: s.type === 'sheep' ? '#8B4513' : '#228B22' }}>
                      {s.type === 'sheep' ? '🐑 ضان' : '🐐 ماعز'}
                    </td>
                    <td style={{ padding: '8px' }}>{s.number}</td>
                    <td style={{ padding: '8px' }}>{s.ageValue} {s.ageType === 'months' ? 'شهر' : 'سنة'}</td>
                    <td style={{ padding: '8px', color: s.status === 'productive' ? '#27ae60' : '#e74c3c' }}>
                      {s.status === 'productive' ? '✓ منتجة' : '⊘ غير منتجة'}
                    </td>
                    <td style={{ padding: '8px' }}>{s.lastProduction}</td>
                    <td style={{ padding: '8px', fontSize: '11px' }}>{s.notes ? s.notes.substring(0, 20) + '...' : '-'}</td>
                    <td style={{ padding: '8px' }}>
                      <button onClick={() => handleEdit('sheep', s.id)} style={{ marginRight: '5px', background: 'none', border: 'none', cursor: 'pointer', color: '#8B6F47' }}>✏️</button>
                      <button onClick={() => handleDelete('sheep', s.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'red' }}>🗑️</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      case 'feeds':
        return (
          <div style={{ padding: '30px' }}>
            <h1>🌾 الأعلاف</h1>
            <button onClick={() => { setFeedForm({ date: new Date().toISOString().split('T')[0], type: 'شعير', quantity: '', pricePerKg: '' }); setModalType('feed'); setShowModal(true); setEditingId(null); }} style={{ marginBottom: '20px', background: '#8B6F47', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '6px', cursor: 'pointer' }}>+ إضافة</button>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f0f0f0' }}>
                  <th style={{ padding: '10px', textAlign: 'right' }}>التاريخ</th>
                  <th style={{ padding: '10px', textAlign: 'right' }}>النوع</th>
                  <th style={{ padding: '10px', textAlign: 'right' }}>الكمية</th>
                  <th style={{ padding: '10px', textAlign: 'right' }}>السعر</th>
                  <th style={{ padding: '10px', textAlign: 'right' }}>الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {feeds.map(f => <tr key={f.id} style={{ borderBottom: '1px solid #ddd' }}>
                  <td style={{ padding: '10px' }}>{f.date}</td>
                  <td style={{ padding: '10px' }}>{f.type}</td>
                  <td style={{ padding: '10px' }}>{f.quantity}</td>
                  <td style={{ padding: '10px' }}>{f.pricePerKg}</td>
                  <td style={{ padding: '10px' }}><button onClick={() => handleEdit('feed', f.id)} style={{ marginRight: '5px', background: 'none', border: 'none', cursor: 'pointer', color: '#8B6F47' }}>✏️</button><button onClick={() => handleDelete('feed', f.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'red' }}>🗑️</button></td>
                </tr>)}
              </tbody>
            </table>
          </div>
        );
      case 'expenses':
        return (
          <div style={{ padding: '30px' }}>
            <h1>💰 المصروفات</h1>
            <button onClick={() => { setExpenseForm({ date: new Date().toISOString().split('T')[0], category: 'رواتب', amount: '' }); setModalType('expense'); setShowModal(true); setEditingId(null); }} style={{ marginBottom: '20px', background: '#8B6F47', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '6px', cursor: 'pointer' }}>+ إضافة</button>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f0f0f0' }}>
                  <th style={{ padding: '10px', textAlign: 'right' }}>التاريخ</th>
                  <th style={{ padding: '10px', textAlign: 'right' }}>الفئة</th>
                  <th style={{ padding: '10px', textAlign: 'right' }}>المبلغ</th>
                  <th style={{ padding: '10px', textAlign: 'right' }}>الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {expenses.map(e => <tr key={e.id} style={{ borderBottom: '1px solid #ddd' }}>
                  <td style={{ padding: '10px' }}>{e.date}</td>
                  <td style={{ padding: '10px' }}>{e.category}</td>
                  <td style={{ padding: '10px' }}>{e.amount}</td>
                  <td style={{ padding: '10px' }}><button onClick={() => handleEdit('expense', e.id)} style={{ marginRight: '5px', background: 'none', border: 'none', cursor: 'pointer', color: '#8B6F47' }}>✏️</button><button onClick={() => handleDelete('expense', e.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'red' }}>🗑️</button></td>
                </tr>)}
              </tbody>
            </table>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', minHeight: '100vh', background: '#f9f7f4' }}>
      <style>{`* { margin: 0; padding: 0; box-sizing: border-box; } html, body { font-family: 'Segoe UI', Arial, sans-serif; direction: rtl; }`}</style>
      <div style={{ background: 'linear-gradient(180deg, #5D4E37 0%, #3D2817 100%)', padding: '25px 15px', height: '100vh', overflowY: 'auto' }}>
        <div style={{ color: '#F5D547', fontSize: '26px', fontWeight: 'bold', marginBottom: '30px', textAlign: 'center' }}>🐑 FarmHub</div>
        <p style={{ color: '#E8D5C4', fontSize: '12px', textAlign: 'center', marginBottom: '20px' }}>مرحباً {user.name}</p>
        <ul style={{ listStyle: 'none', marginBottom: '30px' }}>
          {[{ id: 'dashboard', label: '📊 لوحة التحكم' }, { id: 'sheep', label: '🐑 الأغنام' }, { id: 'feeds', label: '🌾 الأعلاف' }, { id: 'expenses', label: '💰 المصروفات' }].map(item => (
            <li key={item.id} style={{ marginBottom: '8px' }}>
              <button onClick={() => setActiveTab(item.id)} style={{ width: '100%', padding: '12px 15px', color: activeTab === item.id ? '#3D2817' : '#E8D5C4', background: activeTab === item.id ? 'linear-gradient(90deg, #F5D547, #D4A574)' : 'transparent', border: 'none', cursor: 'pointer', borderRadius: '6px', fontSize: '13px', fontWeight: activeTab === item.id ? 'bold' : 'normal' }}>
                {item.label}
              </button>
            </li>
          ))}
        </ul>
        <button onClick={handleLogout} style={{ width: '100%', padding: '12px 15px', color: '#e74c3c', background: 'transparent', border: '1px solid #e74c3c', cursor: 'pointer', borderRadius: '6px', fontSize: '13px', fontWeight: '600', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
          <LogOut size={16} /> تسجيل الخروج
        </button>
      </div>
      <div style={{ overflowY: 'auto', maxHeight: '100vh', width: '100%', background: '#f9f7f4' }}>
        {renderContent()}
      </div>
      {showModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }} onClick={() => setShowModal(false)}>
          <div style={{ background: 'white', padding: '30px', borderRadius: '12px', maxWidth: '600px', width: '90%', maxHeight: '90vh', overflowY: 'auto', position: 'relative' }} onClick={e => e.stopPropagation()}>
            <button onClick={() => setShowModal(false)} style={{ position: 'absolute', top: '15px', right: '15px', background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer' }}>✕</button>
            {modalType === 'sheep' && (
              <form onSubmit={(e) => { e.preventDefault(); handleAddSheep(); }} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                <h2 style={{ color: '#3D2817', marginBottom: '20px' }}>تسجيل الأغنام</h2>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <input type="text" placeholder="الرقم" value={sheepForm.number} onChange={(e) => handleSheepChange('number', e.target.value)} style={{ padding: '10px', border: '1px solid #ddd', borderRadius: '6px' }} />
                  <select value={sheepForm.type} onChange={(e) => handleSheepChange('type', e.target.value)} style={{ padding: '10px', border: '1px solid #ddd', borderRadius: '6px' }}>
                    <option value="sheep">ضان</option>
                    <option value="goat">ماعز</option>
                  </select>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <input type="number" placeholder="قيمة السن" value={sheepForm.ageValue} onChange={(e) => handleSheepChange('ageValue', e.target.value)} style={{ padding: '10px', border: '1px solid #ddd', borderRadius: '6px' }} />
                  <select value={sheepForm.ageType} onChange={(e) => handleSheepChange('ageType', e.target.value)} style={{ padding: '10px', border: '1px solid #ddd', borderRadius: '6px' }}>
                    <option value="months">شهور</option>
                    <option value="years">سنوات</option>
                  </select>
                </div>
                <select value={sheepForm.status} onChange={(e) => handleSheepChange('status', e.target.value)} style={{ padding: '10px', border: '1px solid #ddd', borderRadius: '6px' }}>
                  <option value="productive">منتجة</option>
                  <option value="non-productive">غير منتجة</option>
                </select>
                <input type="date" value={sheepForm.lastProduction} onChange={(e) => handleSheepChange('lastProduction', e.target.value)} placeholder="آخر إنتاج" style={{ padding: '10px', border: '1px solid #ddd', borderRadius: '6px' }} />
                <textarea placeholder="ملاحظات (اختياري)" value={sheepForm.notes} onChange={(e) => handleSheepChange('notes', e.target.value)} style={{ padding: '10px', border: '1px solid #ddd', borderRadius: '6px', minHeight: '60px' }} />
                <select value={sheepForm.exitType} onChange={(e) => handleSheepChange('exitType', e.target.value)} style={{ padding: '10px', border: '1px solid #ddd', borderRadius: '6px' }}>
                  <option value="active">نشط</option>
                  <option value="sold">مباع</option>
                  <option value="slaughtered">مذبوح</option>
                  <option value="dead">متوفي</option>
                </select>
                <button type="submit" style={{ background: '#8B6F47', color: 'white', border: 'none', padding: '10px', borderRadius: '6px', cursor: 'pointer' }}>حفظ</button>
              </form>
            )}
            {modalType === 'feed' && (
              <form onSubmit={(e) => { e.preventDefault(); handleAddFeed(); }} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                <h2 style={{ color: '#3D2817', marginBottom: '20px' }}>الأعلاف</h2>
                <input type="date" value={feedForm.date} onChange={(e) => handleFeedChange('date', e.target.value)} style={{ padding: '10px', border: '1px solid #ddd', borderRadius: '6px' }} />
                <select value={feedForm.type} onChange={(e) => handleFeedChange('type', e.target.value)} style={{ padding: '10px', border: '1px solid #ddd', borderRadius: '6px' }}>
                  <option value="شعير">شعير</option>
                  <option value="برسيم">برسيم</option>
                  <option value="مكعب">مكعب</option>
                </select>
                <input type="number" placeholder="الكمية (كيلو)" value={feedForm.quantity} onChange={(e) => handleFeedChange('quantity', e.target.value)} style={{ padding: '10px', border: '1px solid #ddd', borderRadius: '6px' }} />
                <input type="number" placeholder="السعر/كيلو" value={feedForm.pricePerKg} onChange={(e) => handleFeedChange('pricePerKg', e.target.value)} style={{ padding: '10px', border: '1px solid #ddd', borderRadius: '6px' }} />
                <button type="submit" style={{ background: '#8B6F47', color: 'white', border: 'none', padding: '10px', borderRadius: '6px', cursor: 'pointer' }}>حفظ</button>
              </form>
            )}
            {modalType === 'expense' && (
              <form onSubmit={(e) => { e.preventDefault(); handleAddExpense(); }} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                <h2 style={{ color: '#3D2817', marginBottom: '20px' }}>المصروفات</h2>
                <input type="date" value={expenseForm.date} onChange={(e) => handleExpenseChange('date', e.target.value)} style={{ padding: '10px', border: '1px solid #ddd', borderRadius: '6px' }} />
                <select value={expenseForm.category} onChange={(e) => handleExpenseChange('category', e.target.value)} style={{ padding: '10px', border: '1px solid #ddd', borderRadius: '6px' }}>
                  <option value="رواتب">رواتب</option>
                  <option value="أعلاف">أعلاف</option>
                  <option value="طبيب">طبيب بيطري</option>
                  <option value="أخرى">أخرى</option>
                </select>
                <input type="number" placeholder="المبلغ" value={expenseForm.amount} onChange={(e) => handleExpenseChange('amount', e.target.value)} style={{ padding: '10px', border: '1px solid #ddd', borderRadius: '6px' }} />
                <button type="submit" style={{ background: '#8B6F47', color: 'white', border: 'none', padding: '10px', borderRadius: '6px', cursor: 'pointer' }}>حفظ</button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default App;

    
