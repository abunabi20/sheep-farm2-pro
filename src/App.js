import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Bell, Plus, Trash2, LogOut, Edit2, Eye, EyeOff } from 'lucide-react';
import emailjs from '@emailjs/browser';
import { initializeApp } from 'firebase/app';
import { getDatabase, ref, set, onValue } from 'firebase/database';

const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  databaseURL: process.env.REACT_APP_FIREBASE_DATABASE_URL,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID
};

let app, database;
try {
  app = initializeApp(firebaseConfig);
  database = getDatabase(app);
} catch (error) {
  console.log('Firebase:', error.message);
}

try {
  emailjs.init(process.env.REACT_APP_EMAILJS_PUBLIC_KEY);
} catch (error) {
  console.log('EmailJS:', error.message);
}

const SheepFarmApp = () => {
  const [user, setUser] = useState(null);
  const [authMode, setAuthMode] = useState('login');
  const [showPassword, setShowPassword] = useState(false);
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
  const [sheepForm, setSheepForm] = useState({ id: '', number: '', type: 'sheep', age: '', status: 'productive', totalOffspring: 0, birthDate: '', notes: '' });
  const [feedForm, setFeedForm] = useState({ date: new Date().toISOString().split('T')[0], type: 'شعير', quantity: '', pricePerKg: '', quality: 'good', notes: '' });
  const [expenseForm, setExpenseForm] = useState({ date: new Date().toISOString().split('T')[0], category: 'رواتب', description: '', amount: '', notes: '' });

  useEffect(() => {
    const savedUser = localStorage.getItem('sheepFarmUser');
    if (savedUser) setUser(JSON.parse(savedUser));
  }, []);

  const handleLoginChange = useCallback((field, value) => {
    setLoginData(prev => ({ ...prev, [field]: value }));
  }, []);

  const handleRegisterChange = useCallback((field, value) => {
    setRegisterData(prev => ({ ...prev, [field]: value }));
  }, []);

  const handleLogin = (e) => {
    e.preventDefault();
    if (!loginData.email || !loginData.password) {
      alert('الرجاء إدخال البريد وكلمة المرور');
      return;
    }
    const userData = { id: loginData.email.replace(/[^a-z0-9]/g, ''), email: loginData.email, name: loginData.email.split('@')[0] };
    localStorage.setItem('sheepFarmUser', JSON.stringify(userData));
    setUser(userData);
    setLoginData({ email: '', password: '' });
  };

  const handleRegister = (e) => {
    e.preventDefault();
    if (!registerData.email || !registerData.password || !registerData.name) {
      alert('الرجاء ملء جميع الحقول');
      return;
    }
    if (registerData.password !== registerData.confirmPassword) {
      alert('كلمات المرور غير متطابقة');
      return;
    }
    const userData = { id: registerData.email.replace(/[^a-z0-9]/g, ''), email: registerData.email, name: registerData.name };
    localStorage.setItem('sheepFarmUser', JSON.stringify(userData));
    setUser(userData);
    setRegisterData({ email: '', password: '', confirmPassword: '', name: '' });
    setAuthMode('login');
  };

  const handleLogout = () => {
    localStorage.removeItem('sheepFarmUser');
    setUser(null);
  };

  useEffect(() => {
    if (!user || !database) return;
    const userId = user.id;
    onValue(ref(database, `${userId}/sheep`), (snapshot) => setSheep(snapshot.exists() ? Object.values(snapshot.val()) : []));
    onValue(ref(database, `${userId}/feeds`), (snapshot) => setFeeds(snapshot.exists() ? Object.values(snapshot.val()) : []));
    onValue(ref(database, `${userId}/expenses`), (snapshot) => setExpenses(snapshot.exists() ? Object.values(snapshot.val()) : []));
  }, [user]);

  const generateAlerts = useCallback(() => {
    const newAlerts = [];
    feeds.forEach(f => {
      const remaining = Math.ceil(parseFloat(f.quantity || 0));
      if (remaining < 10) {
        newAlerts.push({ id: `feed-${f.id}`, type: 'feed', severity: remaining < 5 ? 'high' : 'warning', message: `⚠️ علف ${f.type}: متبقي ${remaining} كيس` });
      }
    });
    sheep.forEach(s => {
      if (s.status === 'non-productive' && parseInt(s.age) > 3) {
        newAlerts.push({ id: `sheep-${s.id}`, type: 'sheep', severity: 'warning', message: `🔴 الحيوان #${s.number} عمره ${s.age} بدون إنتاج` });
      }
    });
    setAlerts(newAlerts);
  }, [feeds, sheep]);

  useEffect(() => {
    if (!user || !database) return;
    const userId = user.id;
    if (sheep.length > 0) set(ref(database, `${userId}/sheep`), sheep);
    if (feeds.length > 0) set(ref(database, `${userId}/feeds`), feeds);
    if (expenses.length > 0) set(ref(database, `${userId}/expenses`), expenses);
    generateAlerts();
  }, [user, sheep, feeds, expenses, generateAlerts]);

  const handleSheepFormChange = useCallback((field, value) => {
    setSheepForm(prev => ({ ...prev, [field]: value }));
  }, []);

  const handleFeedFormChange = useCallback((field, value) => {
    setFeedForm(prev => ({ ...prev, [field]: value }));
  }, []);

  const handleExpenseFormChange = useCallback((field, value) => {
    setExpenseForm(prev => ({ ...prev, [field]: value }));
  }, []);

  const handleAddSheep = () => {
    if (!sheepForm.number || !sheepForm.age) { alert('الرجاء ملء البيانات المطلوبة'); return; }
    if (editingId) {
      setSheep(sheep.map(s => s.id === editingId ? { ...sheepForm, id: editingId } : s));
      setEditingId(null);
    } else {
      setSheep([...sheep, { ...sheepForm, id: `sheep-${Date.now()}` }]);
    }
    setSheepForm({ id: '', number: '', type: 'sheep', age: '', status: 'productive', totalOffspring: 0, birthDate: '', notes: '' });
    setShowModal(false);
  };

  const handleAddFeed = () => {
    if (!feedForm.quantity || !feedForm.pricePerKg) { alert('الرجاء ملء البيانات'); return; }
    if (editingId) {
      setFeeds(feeds.map(f => f.id === editingId ? { ...feedForm, id: editingId } : f));
      setEditingId(null);
    } else {
      setFeeds([...feeds, { ...feedForm, id: `feed-${Date.now()}` }]);
    }
    setFeedForm({ date: new Date().toISOString().split('T')[0], type: 'شعير', quantity: '', pricePerKg: '', quality: 'good', notes: '' });
    setShowModal(false);
  };

  const handleAddExpense = () => {
    if (!expenseForm.amount) { alert('الرجاء إدخال المبلغ'); return; }
    if (editingId) {
      setExpenses(expenses.map(e => e.id === editingId ? { ...expenseForm, id: editingId } : e));
      setEditingId(null);
    } else {
      setExpenses([...expenses, { ...expenseForm, id: `expense-${Date.now()}` }]);
    }
    setExpenseForm({ date: new Date().toISOString().split('T')[0], category: 'رواتب', description: '', amount: '', notes: '' });
    setShowModal(false);
  };

  const handleDelete = (type, id) => {
    if (window.confirm('هل أنت متأكد من الحذف؟')) {
      if (type === 'sheep') setSheep(sheep.filter(s => s.id !== id));
      else if (type === 'feed') setFeeds(feeds.filter(f => f.id !== id));
      else if (type === 'expense') setExpenses(expenses.filter(e => e.id !== id));
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
    const totalSheep = sheep.length;
    const producingSheep = sheep.filter(s => s.status === 'productive').length;
    const totalOffspring = sheep.reduce((sum, s) => sum + parseInt(s.totalOffspring || 0), 0);
    const feedCosts = feeds.reduce((sum, f) => sum + (parseFloat(f.quantity || 0) * parseFloat(f.pricePerKg || 0)), 0);
    const expenseCosts = expenses.reduce((sum, e) => sum + parseFloat(e.amount || 0), 0);
    return {
      totalSheep, producingSheep, totalOffspring,
      productivity: totalSheep ? ((producingSheep / totalSheep) * 100).toFixed(1) : 0,
      feedCosts: feedCosts.toFixed(0), expenseCosts: expenseCosts.toFixed(0),
      totalCosts: (feedCosts + expenseCosts).toFixed(0),
      dailyConsumption: (totalSheep * 1).toFixed(1),
      monthlyConsumption: (totalSheep * 30).toFixed(0)
    };
  }, [sheep, feeds, expenses]);

  if (!user) return <LoginScreen authMode={authMode} setAuthMode={setAuthMode} showPassword={showPassword} setShowPassword={setShowPassword} loginData={loginData} registerData={registerData} handleLoginChange={handleLoginChange} handleRegisterChange={handleRegisterChange} handleLogin={handleLogin} handleRegister={handleRegister} />;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', minHeight: '100vh', background: '#f9f7f4' }}>
      <style>{`
        * { margin: 0; padding: 0; box-sizing: border-box; }
        html, body { font-family: 'Segoe UI', Arial, sans-serif; direction: rtl; height: 100%; }
        input:focus, select:focus { outline: none; border-color: #D4A574; box-shadow: 0 0 0 3px rgba(212, 165, 116, 0.1); }
        table { width: 100%; border-collapse: collapse; }
        th { background: #f0e8e0; color: #3D2817; padding: 12px; text-align: right; font-weight: 600; }
        td { padding: 12px; border-bottom: 1px solid #e8e2dc; }
        tr:hover { background: #f5f3f0; }
      `}</style>

      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} user={user} handleLogout={handleLogout} />

      <div style={{ overflowY: 'auto', maxHeight: '100vh', width: '100%', paddingLeft: '0px' }}>
        {activeTab === 'dashboard' && <Dashboard calculations={calculations} alerts={alerts} />}
        {activeTab === 'sheep' && <SheepManagement sheep={sheep} setShowModal={setShowModal} setModalType={setModalType} setSheepForm={setSheepForm} setEditingId={setEditingId} handleDelete={handleDelete} handleEdit={handleEdit} />}
        {activeTab === 'feeds' && <FeedsManagement feeds={feeds} setShowModal={setShowModal} setModalType={setModalType} setFeedForm={setFeedForm} setEditingId={setEditingId} handleDelete={handleDelete} handleEdit={handleEdit} />}
        {activeTab === 'expenses' && <ExpensesManagement expenses={expenses} setShowModal={setShowModal} setModalType={setModalType} setExpenseForm={setExpenseForm} setEditingId={setEditingId} handleDelete={handleDelete} handleEdit={handleEdit} />}
        {activeTab === 'alerts' && <AlertsScreen alerts={alerts} />}
      </div>

      {showModal && <Modal modalType={modalType} showModal={showModal} setShowModal={setShowModal} sheepForm={sheepForm} handleSheepFormChange={handleSheepFormChange} handleAddSheep={handleAddSheep} feedForm={feedForm} handleFeedFormChange={handleFeedFormChange} handleAddFeed={handleAddFeed} expenseForm={expenseForm} handleExpenseFormChange={handleExpenseFormChange} handleAddExpense={handleAddExpense} editingId={editingId} />}
    </div>
  );
};

const LoginScreen = ({ authMode, setAuthMode, showPassword, setShowPassword, loginData, registerData, handleLoginChange, handleRegisterChange, handleLogin, handleRegister }) => (
  <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #5D4E37 0%, #3D2817 100%)' }}>
    <div style={{ background: 'white', padding: '40px', borderRadius: '12px', maxWidth: '500px', width: '90%', boxShadow: '0 10px 40px rgba(0,0,0,0.3)' }}>
      <h1 style={{ color: '#3D2817', textAlign: 'center', marginBottom: '10px', fontSize: '32px' }}>🐑 FarmHub Pro</h1>
      <p style={{ color: '#666', textAlign: 'center', marginBottom: '30px' }}>نظام إدارة الأغنام والماعز</p>
      {authMode === 'login' ? (
        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <h2 style={{ color: '#3D2817', marginBottom: '20px', fontSize: '24px' }}>تسجيل الدخول</h2>
          <AuthInput label="البريد الإلكتروني" type="email" value={loginData.email} onChange={(e) => handleLoginChange('email', e.target.value)} />
          <PasswordInput label="كلمة المرور" value={loginData.password} onChange={(e) => handleLoginChange('password', e.target.value)} showPassword={showPassword} setShowPassword={setShowPassword} />
          <button type="submit" style={{ background: 'linear-gradient(90deg, #8B6F47, #D4A574)', color: 'white', border: 'none', padding: '12px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '16px' }}>دخول</button>
          <p style={{ textAlign: 'center', color: '#666', marginTop: '20px' }}>ليس لديك حساب؟ <button type="button" onClick={() => setAuthMode('register')} style={{ background: 'none', border: 'none', color: '#D4A574', cursor: 'pointer', fontWeight: 'bold' }}>سجل الآن</button></p>
        </form>
      ) : (
        <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <h2 style={{ color: '#3D2817', marginBottom: '20px', fontSize: '24px' }}>تسجيل جديد</h2>
          <AuthInput label="الاسم" type="text" value={registerData.name} onChange={(e) => handleRegisterChange('name', e.target.value)} />
          <AuthInput label="البريد الإلكتروني" type="email" value={registerData.email} onChange={(e) => handleRegisterChange('email', e.target.value)} />
          <PasswordInput label="كلمة المرور" value={registerData.password} onChange={(e) => handleRegisterChange('password', e.target.value)} showPassword={showPassword} setShowPassword={setShowPassword} />
          <PasswordInput label="تأكيد كلمة المرور" value={registerData.confirmPassword} onChange={(e) => handleRegisterChange('confirmPassword', e.target.value)} showPassword={showPassword} setShowPassword={setShowPassword} />
          <button type="submit" style={{ background: 'linear-gradient(90deg, #8B6F47, #D4A574)', color: 'white', border: 'none', padding: '12px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '16px' }}>إنشاء حساب</button>
          <p style={{ textAlign: 'center', color: '#666', marginTop: '20px' }}>لديك حساب؟ <button type="button" onClick={() => setAuthMode('login')} style={{ background: 'none', border: 'none', color: '#D4A574', cursor: 'pointer', fontWeight: 'bold' }}>دخول</button></p>
        </form>
      )}
    </div>
  </div>
);

const AuthInput = React.memo(({ label, type, value, onChange }) => (
  <label style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
    <span style={{ color: '#3D2817', fontWeight: '600', fontSize: '13px' }}>{label}</span>
    <input type={type} value={value} onChange={onChange} style={{ padding: '10px', border: '1px solid #ddd', borderRadius: '6px', fontFamily: 'inherit' }} />
  </label>
));

const PasswordInput = React.memo(({ label, value, onChange, showPassword, setShowPassword }) => (
  <label style={{ display: 'flex', flexDirection: 'column', gap: '6px', position: 'relative' }}>
    <span style={{ color: '#3D2817', fontWeight: '600', fontSize: '13px' }}>{label}</span>
    <div style={{ position: 'relative' }}>
      <input type={showPassword ? 'text' : 'password'} value={value} onChange={onChange} style={{ padding: '10px', border: '1px solid #ddd', borderRadius: '6px', fontFamily: 'inherit', width: '100%', paddingRight: '40px' }} />
      <button type="button" onClick={() => setShowPassword(!showPassword)} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer' }}>
        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
      </button>
    </div>
  </label>
));

const Sidebar = React.memo(({ activeTab, setActiveTab, user, handleLogout }) => (
  <div style={{ background: 'linear-gradient(180deg, #5D4E37 0%, #3D2817 100%)', padding: '25px 15px', boxShadow: '0 8px 32px rgba(0,0,0,0.15)', position: 'fixed', width: '260px', height: '100vh', overflowY: 'auto' }}>
    <div style={{ color: '#F5D547', fontSize: '26px', fontWeight: 'bold', marginBottom: '30px', textAlign: 'center', paddingBottom: '15px', borderBottom: '2px solid #D4A574' }}>🐑 FarmHub</div>
    <p style={{ color: '#E8D5C4', fontSize: '12px', textAlign: 'center', marginBottom: '20px' }}>مرحباً {user.name}</p>
    <ul style={{ listStyle: 'none', marginBottom: '30px' }}>
      {[{ id: 'dashboard', label: '📊 لوحة التحكم' }, { id: 'sheep', label: '🐑 الأغنام' }, { id: 'feeds', label: '🌾 الأعلاف' }, { id: 'expenses', label: '💰 المصروفات' }, { id: 'alerts', label: '🔔 التنبيهات' }].map(item => (
        <li key={item.id} style={{ marginBottom: '8px' }}>
          <button onClick={() => setActiveTab(item.id)} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 15px', color: activeTab === item.id ? '#3D2817' : '#E8D5C4', background: activeTab === item.id ? 'linear-gradient(90deg, #F5D547, #D4A574)' : 'transparent', border: 'none', cursor: 'pointer', width: '100%', borderRadius: '6px', fontSize: '13px', fontWeight: activeTab === item.id ? 'bold' : 'normal' }}>
            {item.label}
          </button>
        </li>
      ))}
    </ul>
    <button onClick={handleLogout} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 15px', color: '#e74c3c', background: 'transparent', border: '1px solid #e74c3c', cursor: 'pointer', width: '100%', borderRadius: '6px', fontSize: '13px', fontWeight: '600' }}>
      <LogOut size={16} /> تسجيل الخروج
    </button>
  </div>
));

const Dashboard = React.memo(({ calculations, alerts }) => (
  <div style={{ padding: '30px', background: 'linear-gradient(135deg, #f5f3f0 0%, #efe8e2 100%)', minHeight: '100vh', width: '100%' }}>
    <h1 style={{ color: '#3D2817', marginBottom: '30px', fontSize: '28px' }}>📊 لوحة التحكم</h1>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '30px' }}>
      <KPICard label="إجمالي الثروة" value={calculations.totalSheep} unit="رأس" color="#667eea" />
      <KPICard label="الأغنام المنتجة" value={calculations.producingSheep} unit="رأس" color="#27ae60" />
      <KPICard label="معدل الإنتاجية" value={calculations.productivity} unit="%" color="#f39c12" />
      <KPICard label="الاستهلاك اليومي" value={calculations.dailyConsumption} unit="كيلو" color="#e74c3c" />
      <KPICard label="المصروفات الشهرية" value={calculations.totalCosts} unit="ر.س" color="#9b59b6" />
      <KPICard label="المواليد الإجمالية" value={calculations.totalOffspring} unit="رأس" color="#1abc9c" />
    </div>
    <AlertsBox alerts={alerts} />
  </div>
));

const KPICard = React.memo(({ label, value, unit, color }) => (
  <div style={{ background: `${color}15`, borderLeft: `4px solid ${color}`, padding: '20px', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
    <p style={{ fontSize: '12px', color: '#666', margin: '0 0 10px 0' }}>{label}</p>
    <p style={{ fontSize: '32px', fontWeight: 'bold', color: color, margin: 0 }}>{value} <span style={{ fontSize: '16px' }}>{unit}</span></p>
  </div>
));

const AlertsBox = React.memo(({ alerts }) => (
  <div style={{ background: 'white', padding: '25px', borderRadius: '12px', boxShadow: '0 4px 15px rgba(0,0,0,0.08)' }}>
    <h3 style={{ color: '#3D2817', margin: '0 0 15px 0', display: 'flex', gap: '10px', alignItems: 'center' }}>
      <Bell size={20} /> التنبيهات ({alerts.length})
    </h3>
    {alerts.length === 0 ? (
      <p style={{ color: '#27ae60', textAlign: 'center', padding: '20px' }}>✓ الحالة جيدة!</p>
    ) : (
      alerts.slice(0, 5).map(alert => (
        <div key={alert.id} style={{ padding: '12px', marginBottom: '10px', borderLeft: `4px solid ${alert.severity === 'high' ? '#e74c3c' : '#f39c12'}`, background: alert.severity === 'high' ? '#ffe5e5' : '#fff3cd', borderRadius: '6px' }}>
          <p style={{ margin: 0, fontWeight: '500' }}>{alert.message}</p>
        </div>
      ))
    )}
  </div>
));

const SheepManagement = React.memo(({ sheep, setShowModal, setModalType, setSheepForm, setEditingId, handleDelete, handleEdit }) => {
  const sheepList = sheep.filter(s => s.type === 'sheep');
  const goatList = sheep.filter(s => s.type === 'goat');
  return (
    <div style={{ padding: '30px', background: 'linear-gradient(135deg, #f5f3f0 0%, #efe8e2 100%)', minHeight: '100vh', width: '100%' }}>
      <h1 style={{ color: '#3D2817', marginBottom: '30px' }}>🐑 الأغنام والماعز</h1>
      <SheepTable data={sheepList} title="الأغنام (Sheep)" onAdd={() => { setSheepForm({ id: '', number: '', type: 'sheep', age: '', status: 'productive', totalOffspring: 0, birthDate: '', notes: '' }); setModalType('sheep'); setShowModal(true); }} onEdit={(id) => handleEdit('sheep', id)} onDelete={(id) => handleDelete('sheep', id)} />
      <div style={{ marginBottom: '30px' }} />
      <SheepTable data={goatList} title="الماعز (Goat)" onAdd={() => { setSheepForm({ id: '', number: '', type: 'goat', age: '', status: 'productive', totalOffspring: 0, birthDate: '', notes: '' }); setModalType('sheep'); setShowModal(true); }} onEdit={(id) => handleEdit('sheep', id)} onDelete={(id) => handleDelete('sheep', id)} />
    </div>
  );
});

const SheepTable = React.memo(({ data, title, onAdd, onEdit, onDelete }) => (
  <div style={{ background: 'white', padding: '25px', borderRadius: '12px', boxShadow: '0 4px 15px rgba(0,0,0,0.08)' }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
      <h3 style={{ color: '#3D2817', margin: 0 }}>{title} ({data.length})</h3>
      <button onClick={onAdd} style={{ background: 'linear-gradient(90deg, #8B6F47, #D4A574)', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '6px', cursor: 'pointer', display: 'flex', gap: '8px', alignItems: 'center' }}>
        <Plus size={16} /> إضافة
      </button>
    </div>
    {data.length === 0 ? (
      <p style={{ textAlign: 'center', color: '#999', padding: '40px' }}>لا توجد بيانات</p>
    ) : (
      <div style={{ overflowX: 'auto' }}>
        <table>
          <thead>
            <tr>
              <th>الرقم</th>
              <th>السن</th>
              <th>الحالة</th>
              <th>المواليد</th>
              <th>الإجراءات</th>
            </tr>
          </thead>
          <tbody>
            {data.map(item => (
              <tr key={item.id}>
                <td>#{item.number}</td>
                <td>{item.age} سنة</td>
                <td><span style={{ padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: '600', background: item.status === 'productive' ? '#27ae6033' : '#f39c1233', color: item.status === 'productive' ? '#27ae60' : '#f39c12' }}>{item.status === 'productive' ? '✓ منتجة' : '⊘ غير منتجة'}</span></td>
                <td>{item.totalOffspring}</td>
                <td style={{ display: 'flex', gap: '8px' }}>
                  <button onClick={() => onEdit(item.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#3D2817' }}><Edit2 size={16} /></button>
                  <button onClick={() => onDelete(item.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#e74c3c' }}><Trash2 size={16} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )}
  </div>
));

const FeedsManagement = React.memo(({ feeds, setShowModal, setModalType, setFeedForm, setEditingId, handleDelete, handleEdit }) => (
  <div style={{ padding: '30px', background: 'linear-gradient(135deg, #f5f3f0 0%, #efe8e2 100%)', minHeight: '100vh', width: '100%' }}>
    <h1 style={{ color: '#3D2817', marginBottom: '30px' }}>🌾 الأعلاف</h1>
    <div style={{ background: 'white', padding: '25px', borderRadius: '12px', boxShadow: '0 4px 15px rgba(0,0,0,0.08)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h3 style={{ color: '#3D2817', margin: 0 }}>سجل الأعلاف ({feeds.length})</h3>
        <button onClick={() => { setFeedForm({ date: new Date().toISOString().split('T')[0], type: 'شعير', quantity: '', pricePerKg: '', quality: 'good', notes: '' }); setModalType('feed'); setShowModal(true); }} style={{ background: 'linear-gradient(90deg, #8B6F47, #D4A574)', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '6px', cursor: 'pointer', display: 'flex', gap: '8px', alignItems: 'center' }}>
          <Plus size={16} /> إضافة
        </button>
      </div>
      {feeds.length === 0 ? (
        <p style={{ textAlign: 'center', color: '#999', padding: '40px' }}>لا توجد بيانات</p>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table>
            <thead>
              <tr>
                <th>التاريخ</th>
                <th>النوع</th>
                <th>الكمية (كيلو)</th>
                <th>السعر/كيلو</th>
                <th>التكلفة</th>
                <th>الإجراءات</th>
              </tr>
            </thead>
            <tbody>
              {feeds.map(feed => {
                const cost = (parseFloat(feed.quantity || 0) * parseFloat(feed.pricePerKg || 0)).toFixed(0);
                return (
                  <tr key={feed.id}>
                    <td>{feed.date}</td>
                    <td>{feed.type}</td>
                    <td>{feed.quantity}</td>
                    <td>{feed.pricePerKg}</td>
                    <td>{cost} ر.س</td>
                    <td style={{ display: 'flex', gap: '8px' }}>
                      <button onClick={() => handleEdit('feed', feed.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#3D2817' }}><Edit2 size={16} /></button>
                      <button onClick={() => handleDelete('feed', feed.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#e74c3c' }}><Trash2 size={16} /></button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  </div>
));

const ExpensesManagement = React.memo(({ expenses, setShowModal, setModalType, setExpenseForm, setEditingId, handleDelete, handleEdit }) => (
  <div style={{ padding: '30px', background: 'linear-gradient(135deg, #f5f3f0 0%, #efe8e2 100%)', minHeight: '100vh', width: '100%' }}>
    <h1 style={{ color: '#3D2817', marginBottom: '30px' }}>💰 المصروفات</h1>
    <div style={{ background: 'white', padding: '25px', borderRadius: '12px', boxShadow: '0 4px 15px rgba(0,0,0,0.08)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h3 style={{ color: '#3D2817', margin: 0 }}>سجل المصروفات ({expenses.length})</h3>
        <button onClick={() => { setExpenseForm({ date: new Date().toISOString().split('T')[0], category: 'رواتب', description: '', amount: '', notes: '' }); setModalType('expense'); setShowModal(true); }} style={{ background: 'linear-gradient(90deg, #8B6F47, #D4A574)', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '6px', cursor: 'pointer', display: 'flex', gap: '8px', alignItems: 'center' }}>
          <Plus size={16} /> إضافة
        </button>
      </div>
      {expenses.length === 0 ? (
        <p style={{ textAlign: 'center', color: '#999', padding: '40px' }}>لا توجد بيانات</p>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table>
            <thead>
              <tr>
                <th>التاريخ</th>
                <th>الفئة</th>
                <th>الوصف</th>
                <th>المبلغ</th>
                <th>الإجراءات</th>
              </tr>
            </thead>
            <tbody>
              {expenses.map(expense => (
                <tr key={expense.id}>
                  <td>{expense.date}</td>
                  <td>{expense.category}</td>
                  <td>{expense.description}</td>
                  <td>{expense.amount} ر.س</td>
                  <td style={{ display: 'flex', gap: '8px' }}>
                    <button onClick={() => handleEdit('expense', expense.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#3D2817' }}><Edit2 size={16} /></button>
                    <button onClick={() => handleDelete('expense', expense.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#e74c3c' }}><Trash2 size={16} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  </div>
));

const AlertsScreen = React.memo(({ alerts }) => (
  <div style={{ padding: '30px', background: 'linear-gradient(135deg, #f5f3f0 0%, #efe8e2 100%)', minHeight: '100vh', width: '100%' }}>
    <h1 style={{ color: '#3D2817', marginBottom: '30px' }}>🔔 التنبيهات</h1>
    <div style={{ background: 'white', padding: '25px', borderRadius: '12px', boxShadow: '0 4px 15px rgba(0,0,0,0.08)' }}>
      {alerts.length === 0 ? (
        <p style={{ color: '#27ae60', textAlign: 'center', padding: '40px', fontSize: '18px' }}>✓ لا توجد تنبيهات! الحالة جيدة.</p>
      ) : (
        alerts.map(alert => (
          <div key={alert.id} style={{ padding: '15px', marginBottom: '12px', borderLeft: `4px solid ${alert.severity === 'high' ? '#e74c3c' : '#f39c12'}`, background: alert.severity === 'high' ? '#ffe5e5' : '#fff3cd', borderRadius: '6px' }}>
            <p style={{ margin: 0, fontWeight: '600', fontSize: '16px' }}>{alert.message}</p>
          </div>
        ))
      )}
    </div>
  </div>
));

const Modal = React.memo(({ modalType, showModal, setShowModal, sheepForm, handleSheepFormChange, handleAddSheep, feedForm, handleFeedFormChange, handleAddFeed, expenseForm, handleExpenseFormChange, handleAddExpense, editingId }) => {
  if (!showModal) return null;
  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }} onClick={() => setShowModal(false)}>
      <div style={{ background: 'white', padding: '30px', borderRadius: '12px', maxWidth: '600px', width: '90%', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 10px 40px rgba(0,0,0,0.3)', position: 'relative' }} onClick={e => e.stopPropagation()}>
        <button onClick={() => setShowModal(false)} style={{ position: 'absolute', top: '15px', right: '15px', background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer' }}>✕</button>
        {modalType === 'sheep' && (
          <form onSubmit={(e) => { e.preventDefault(); handleAddSheep(); }} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <h2 style={{ color: '#3D2817', marginBottom: '20px' }}>{editingId ? 'تعديل الحيوان' : 'إضافة حيوان جديد'}</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
              <FormInput label="النوع" type="select" value={sheepForm.type} onChange={(e) => handleSheepFormChange('type', e.target.value)} options={['sheep', 'goat']} />
              <FormInput label="الرقم" type="text" value={sheepForm.number} onChange={(e) => handleSheepFormChange('number', e.target.value)} required />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
              <FormInput label="السن (سنة)" type="number" value={sheepForm.age} onChange={(e) => handleSheepFormChange('age', e.target.value)} />
              <FormInput label="الحالة" type="select" value={sheepForm.status} onChange={(e) => handleSheepFormChange('status', e.target.value)} options={['productive', 'non-productive', 'excluded']} />
            </div>
            <FormInput label="إجمالي المواليد" type="number" value={sheepForm.totalOffspring} onChange={(e) => handleSheepFormChange('totalOffspring', e.target.value)} />
            <button type="submit" style={{ background: 'linear-gradient(90deg, #8B6F47, #D4A574)', color: 'white', border: 'none', padding: '12px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>{editingId ? 'تحديث' : 'إضافة'}</button>
          </form>
        )}
        {modalType === 'feed' && (
          <form onSubmit={(e) => { e.preventDefault(); handleAddFeed(); }} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <h2 style={{ color: '#3D2817', marginBottom: '20px' }}>{editingId ? 'تعديل العلف' : 'إضافة علف جديد'}</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
              <FormInput label="التاريخ" type="date" value={feedForm.date} onChange={(e) => handleFeedFormChange('date', e.target.value)} />
              <FormInput label="النوع" type="select" value={feedForm.type} onChange={(e) => handleFeedFormChange('type', e.target.value)} options={['شعير', 'برسيم', 'مكعب', 'رودس']} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
              <FormInput label="الكمية (كيلو)" type="number" value={feedForm.quantity} onChange={(e) => handleFeedFormChange('quantity', e.target.value)} />
              <FormInput label="السعر/كيلو" type="number" value={feedForm.pricePerKg} onChange={(e) => handleFeedFormChange('pricePerKg', e.target.value)} />
            </div>
            <button type="submit" style={{ background: 'linear-gradient(90deg, #8B6F47, #D4A574)', color: 'white', border: 'none', padding: '12px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>{editingId ? 'تحديث' : 'إضافة'}</button>
          </form>
        )}
        {modalType === 'expense' && (
          <form onSubmit={(e) => { e.preventDefault(); handleAddExpense(); }} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <h2 style={{ color: '#3D2817', marginBottom: '20px' }}>{editingId ? 'تعديل المصروف' : 'إضافة مصروف جديد'}</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
              <FormInput label="التاريخ" type="date" value={expenseForm.date} onChange={(e) => handleExpenseFormChange('date', e.target.value)} />
              <FormInput label="الفئة" type="select" value={expenseForm.category} onChange={(e) => handleExpenseFormChange('category', e.target.value)} options={['رواتب', 'طعام', 'بنزين', 'أخرى']} />
            </div>
            <FormInput label="الوصف" type="text" value={expenseForm.description} onChange={(e) => handleExpenseFormChange('description', e.target.value)} />
            <FormInput label="المبلغ (ر.س)" type="number" value={expenseForm.amount} onChange={(e) => handleExpenseFormChange('amount', e.target.value)} />
            <button type="submit" style={{ background: 'linear-gradient(90deg, #8B6F47, #D4A574)', color: 'white', border: 'none', padding: '12px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>{editingId ? 'تحديث' : 'إضافة'}</button>
          </form>
        )}
      </div>
    </div>
  );
});

const FormInput = React.memo(({ label, type, value, onChange, options, required }) => {
  if (type === 'select') {
    return (
      <label style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <span style={{ color: '#3D2817', fontWeight: '600', fontSize: '13px' }}>{label}</span>
        <select value={value} onChange={onChange} style={{ padding: '10px', border: '1px solid #ddd', borderRadius: '6px', fontFamily: 'inherit' }}>
          <option value="">اختر...</option>
          {options && options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
        </select>
      </label>
    );
  }
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      <span style={{ color: '#3D2817', fontWeight: '600', fontSize: '13px' }}>{label}</span>
      <input type={type} value={value} onChange={onChange} required={required} style={{ padding: '10px', border: '1px solid #ddd', borderRadius: '6px', fontFamily: 'inherit' }} />
    </label>
  );
});

export default SheepFarmApp;
