import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Bell, Plus, Trash2, LogOut, Edit2, Eye, EyeOff } from 'lucide-react';

const App = () => {
  const [user, setUser] = useState(null);
  const [authMode, setAuthMode] = useState('login');
  const [showPassword, setShowPassword] = useState(false);
  const [loginData, setLoginData] = useState({ email: '', password: '' });
  const [registerData, setRegisterData] = useState({ email: '', password: '', confirmPassword: '', name: '' });
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [sheep, setSheep] = useState([{ id: '1', number: '101', type: 'sheep', age: '2', status: 'productive', totalOffspring: 3 }]);
  const [feeds, setFeeds] = useState([{ id: '1', date: '2024-06-04', type: 'شعير', quantity: '100', pricePerKg: '2' }]);
  const [expenses, setExpenses] = useState([{ id: '1', date: '2024-06-04', category: 'رواتب', amount: '2000' }]);
  const [alerts, setAlerts] = useState([]);
  const [sheepForm, setSheepForm] = useState({ number: '', type: 'sheep', age: '', status: 'productive', totalOffspring: 0 });
  const [feedForm, setFeedForm] = useState({ date: new Date().toISOString().split('T')[0], type: 'شعير', quantity: '', pricePerKg: '' });
  const [expenseForm, setExpenseForm] = useState({ date: new Date().toISOString().split('T')[0], category: 'رواتب', amount: '' });

  useEffect(() => {
    const saved = localStorage.getItem('sheepFarmUser');
    if (saved) setUser(JSON.parse(saved));
  }, []);

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

  const handleAddSheep = () => {
    if (!sheepForm.number || !sheepForm.age) return alert('ملء البيانات');
    if (editingId) {
      setSheep(sheep.map(s => s.id === editingId ? { ...sheepForm, id: editingId } : s));
      setEditingId(null);
    } else {
      setSheep([...sheep, { ...sheepForm, id: `sheep-${Date.now()}` }]);
    }
    setSheepForm({ number: '', type: 'sheep', age: '', status: 'productive', totalOffspring: 0 });
    setShowModal(false);
  };

  const handleAddFeed = () => {
    if (!feedForm.quantity || !feedForm.pricePerKg) return alert('ملء البيانات');
    if (editingId) {
      setFeeds(feeds.map(f => f.id === editingId ? { ...feedForm, id: editingId } : f));
      setEditingId(null);
    } else {
      setFeeds([...feeds, { ...feedForm, id: `feed-${Date.now()}` }]);
    }
    setFeedForm({ date: new Date().toISOString().split('T')[0], type: 'شعير', quantity: '', pricePerKg: '' });
    setShowModal(false);
  };

  const handleAddExpense = () => {
    if (!expenseForm.amount) return alert('ملء المبلغ');
    if (editingId) {
      setExpenses(expenses.map(e => e.id === editingId ? { ...expenseForm, id: editingId } : e));
      setEditingId(null);
    } else {
      setExpenses([...expenses, { ...expenseForm, id: `expense-${Date.now()}` }]);
    }
    setExpenseForm({ date: new Date().toISOString().split('T')[0], category: 'رواتب', amount: '' });
    setShowModal(false);
  };

  const handleDelete = (type, id) => {
    if (!window.confirm('حذف؟')) return;
    if (type === 'sheep') setSheep(sheep.filter(s => s.id !== id));
    else if (type === 'feed') setFeeds(feeds.filter(f => f.id !== id));
    else if (type === 'expense') setExpenses(expenses.filter(e => e.id !== id));
  };

  const handleEdit = (type, id) => {
    if (type === 'sheep') { const item = sheep.find(s => s.id === id); if (item) { setSheepForm(item); setEditingId(id); setModalType('sheep'); setShowModal(true); } }
    else if (type === 'feed') { const item = feeds.find(f => f.id === id); if (item) { setFeedForm(item); setEditingId(id); setModalType('feed'); setShowModal(true); } }
    else if (type === 'expense') { const item = expenses.find(e => e.id === id); if (item) { setExpenseForm(item); setEditingId(id); setModalType('expense'); setShowModal(true); } }
  };

  const calculations = useMemo(() => {
    const totalSheep = sheep.length;
    const producingSheep = sheep.filter(s => s.status === 'productive').length;
    const feedCosts = feeds.reduce((sum, f) => sum + (parseFloat(f.quantity || 0) * parseFloat(f.pricePerKg || 0)), 0);
    const expenseCosts = expenses.reduce((sum, e) => sum + parseFloat(e.amount || 0), 0);
    return {
      totalSheep,
      producingSheep,
      productivity: totalSheep ? ((producingSheep / totalSheep) * 100).toFixed(1) : 0,
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
            <button onClick={() => { setSheepForm({ number: '', type: 'sheep', age: '', status: 'productive', totalOffspring: 0 }); setModalType('sheep'); setShowModal(true); }} style={{ marginBottom: '20px', background: '#8B6F47', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '6px', cursor: 'pointer' }}>+ إضافة</button>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f0f0f0' }}>
                  <th style={{ padding: '10px', textAlign: 'right' }}>الرقم</th>
                  <th style={{ padding: '10px', textAlign: 'right' }}>السن</th>
                  <th style={{ padding: '10px', textAlign: 'right' }}>الحالة</th>
                  <th style={{ padding: '10px', textAlign: 'right' }}>الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {sheep.map(s => <tr key={s.id} style={{ borderBottom: '1px solid #ddd' }}>
                  <td style={{ padding: '10px' }}>{s.number}</td>
                  <td style={{ padding: '10px' }}>{s.age}</td>
                  <td style={{ padding: '10px' }}>{s.status === 'productive' ? '✓' : '✗'}</td>
                  <td style={{ padding: '10px' }}><button onClick={() => handleEdit('sheep', s.id)} style={{ marginRight: '5px', background: 'none', border: 'none', cursor: 'pointer', color: '#8B6F47' }}>تعديل</button><button onClick={() => handleDelete('sheep', s.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'red' }}>حذف</button></td>
                </tr>)}
              </tbody>
            </table>
          </div>
        );
      case 'feeds':
        return (
          <div style={{ padding: '30px' }}>
            <h1>🌾 الأعلاف</h1>
            <button onClick={() => { setFeedForm({ date: new Date().toISOString().split('T')[0], type: 'شعير', quantity: '', pricePerKg: '' }); setModalType('feed'); setShowModal(true); }} style={{ marginBottom: '20px', background: '#8B6F47', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '6px', cursor: 'pointer' }}>+ إضافة</button>
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
                  <td style={{ padding: '10px' }}><button onClick={() => handleEdit('feed', f.id)} style={{ marginRight: '5px', background: 'none', border: 'none', cursor: 'pointer', color: '#8B6F47' }}>تعديل</button><button onClick={() => handleDelete('feed', f.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'red' }}>حذف</button></td>
                </tr>)}
              </tbody>
            </table>
          </div>
        );
      case 'expenses':
        return (
          <div style={{ padding: '30px' }}>
            <h1>💰 المصروفات</h1>
            <button onClick={() => { setExpenseForm({ date: new Date().toISOString().split('T')[0], category: 'رواتب', amount: '' }); setModalType('expense'); setShowModal(true); }} style={{ marginBottom: '20px', background: '#8B6F47', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '6px', cursor: 'pointer' }}>+ إضافة</button>
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
                  <td style={{ padding: '10px' }}><button onClick={() => handleEdit('expense', e.id)} style={{ marginRight: '5px', background: 'none', border: 'none', cursor: 'pointer', color: '#8B6F47' }}>تعديل</button><button onClick={() => handleDelete('expense', e.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'red' }}>حذف</button></td>
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
        <button onClick={handleLogout} style={{ width: '100%', padding: '12px 15px', color: '#e74c3c', background: 'transparent', border: '1px solid #e74c3c', cursor: 'pointer', borderRadius: '6px', fontSize: '13px', fontWeight: '600' }}>
          <LogOut size={16} style={{ marginRight: '5px' }} /> تسجيل الخروج
        </button>
      </div>
      <div style={{ overflowY: 'auto', maxHeight: '100vh', width: '100%', background: '#f9f7f4' }}>
        {renderContent()}
      </div>
      {showModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }} onClick={() => setShowModal(false)}>
          <div style={{ background: 'white', padding: '30px', borderRadius: '12px', maxWidth: '600px', width: '90%', position: 'relative' }} onClick={e => e.stopPropagation()}>
            <button onClick={() => setShowModal(false)} style={{ position: 'absolute', top: '15px', right: '15px', background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer' }}>✕</button>
            {modalType === 'sheep' && (
              <form onSubmit={(e) => { e.preventDefault(); handleAddSheep(); }} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                <h2 style={{ color: '#3D2817', marginBottom: '20px' }}>الأغنام</h2>
                <input type="text" placeholder="الرقم" value={sheepForm.number} onChange={(e) => handleSheepChange('number', e.target.value)} style={{ padding: '10px', border: '1px solid #ddd', borderRadius: '6px' }} />
                <select value={sheepForm.type} onChange={(e) => handleSheepChange('type', e.target.value)} style={{ padding: '10px', border: '1px solid #ddd', borderRadius: '6px' }}>
                  <option value="sheep">ضان</option>
                  <option value="goat">ماعز</option>
                </select>
                <input type="number" placeholder="السن" value={sheepForm.age} onChange={(e) => handleSheepChange('age', e.target.value)} style={{ padding: '10px', border: '1px solid #ddd', borderRadius: '6px' }} />
                <select value={sheepForm.status} onChange={(e) => handleSheepChange('status', e.target.value)} style={{ padding: '10px', border: '1px solid #ddd', borderRadius: '6px' }}>
                  <option value="productive">منتجة</option>
                  <option value="non-productive">غير منتجة</option>
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
                </select>
                <input type="number" placeholder="الكمية" value={feedForm.quantity} onChange={(e) => handleFeedChange('quantity', e.target.value)} style={{ padding: '10px', border: '1px solid #ddd', borderRadius: '6px' }} />
                <input type="number" placeholder="السعر" value={feedForm.pricePerKg} onChange={(e) => handleFeedChange('pricePerKg', e.target.value)} style={{ padding: '10px', border: '1px solid #ddd', borderRadius: '6px' }} />
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
