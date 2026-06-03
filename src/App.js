    import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { LogOut } from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { getDatabase, ref, set, onValue, remove } from 'firebase/database';

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

const calculateAge = (startDate) => {
  const start = new Date(startDate);
  const now = new Date();
  let years = now.getFullYear() - start.getFullYear();
  let months = now.getMonth() - start.getMonth();
  if (months < 0) { years--; months += 12; }
  return { years, months };
};

const App = () => {
  const [user, setUser] = useState(null);
  const [authMode, setAuthMode] = useState('login');
  const [loginData, setLoginData] = useState({ email: '', password: '' });
  const [registerData, setRegisterData] = useState({ email: '', password: '', confirmPassword: '', name: '' });
  const [activeTab, setActiveTab] = useState('dashboard');
  const [animalTypes, setAnimalTypes] = useState(['sheep', 'goat']);
  const [selectedType, setSelectedType] = useState('sheep');
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [animals, setAnimals] = useState({});
  const [feeds, setFeeds] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [showAddType, setShowAddType] = useState(false);
  const [newTypeName, setNewTypeName] = useState('');

  const [animalForm, setAnimalForm] = useState({
    number: '', gender: 'female', birthDate: new Date().toISOString().split('T')[0],
    status: 'active', lastProduction: new Date().toISOString().split('T')[0],
    notes: '', offspringCount: 0, healthStatus: 'healthy', healthNotes: '',
    saleDate: '', salePrice: '', slaughterDate: '', slaughterType: 'regular',
    slaughterLocation: '', slaughterNotes: '', deathDate: '', ageAtDeath: '0'
  });

  const [feedForm, setFeedForm] = useState({ date: new Date().toISOString().split('T')[0], type: 'شعير', quantity: '', pricePerKg: '' });
  const [expenseForm, setExpenseForm] = useState({ date: new Date().toISOString().split('T')[0], category: 'رواتب', amount: '' });

  useEffect(() => {
    const saved = localStorage.getItem('sheepFarmUser');
    if (saved) setUser(JSON.parse(saved));
  }, []);

  // Firebase Sync
  useEffect(() => {
    if (user) {
      const animalsRef = ref(database, `users/${user.id}/animals`);
      onValue(animalsRef, (snapshot) => {
        const data = snapshot.val();
        if (data) setAnimals(data);
        else setAnimals({});
      });

      const feedsRef = ref(database, `users/${user.id}/feeds`);
      onValue(feedsRef, (snapshot) => {
        const data = snapshot.val();
        setFeeds(data ? Object.entries(data).map(([k, v]) => ({ id: k, ...v })) : []);
      });

      const expensesRef = ref(database, `users/${user.id}/expenses`);
      onValue(expensesRef, (snapshot) => {
        const data = snapshot.val();
        setExpenses(data ? Object.entries(data).map(([k, v]) => ({ id: k, ...v })) : []);
      });
    }
  }, [user]);

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

  const handleAnimalChange = useCallback((f, v) => setAnimalForm(p => ({ ...p, [f]: v })), []);
  const handleFeedChange = useCallback((f, v) => setFeedForm(p => ({ ...p, [f]: v })), []);
  const handleExpenseChange = useCallback((f, v) => setExpenseForm(p => ({ ...p, [f]: v })), []);

  const handleAddAnimal = async () => {
    if (!animalForm.number || !animalForm.birthDate) return alert('ملء البيانات');
    if (!user) return;
    
    const animalId = editingId || `${selectedType}-${Date.now()}`;
    const animalsPath = animals[selectedType] || {};
    
    try {
      await set(ref(database, `users/${user.id}/animals/${selectedType}/${animalId}`), animalForm);
      setAnimalForm({ number: '', gender: 'female', birthDate: new Date().toISOString().split('T')[0], status: 'active', lastProduction: new Date().toISOString().split('T')[0], notes: '', offspringCount: 0, healthStatus: 'healthy', healthNotes: '', saleDate: '', salePrice: '', slaughterDate: '', slaughterType: 'regular', slaughterLocation: '', slaughterNotes: '', deathDate: '', ageAtDeath: '0' });
      setShowModal(false);
      setEditingId(null);
    } catch (error) {
      alert('خطأ: ' + error.message);
    }
  };

  const handleAddType = async () => {
    if (!newTypeName) return alert('أدخل اسم النوع');
    if (animalTypes.includes(newTypeName)) return alert('النوع موجود بالفعل');
    const updated = [...animalTypes, newTypeName];
    setAnimalTypes(updated);
    localStorage.setItem('animalTypes', JSON.stringify(updated));
    setNewTypeName('');
    setShowAddType(false);
    setSelectedType(newTypeName);
  };

  const handleDeleteAnimal = async (id) => {
    if (!window.confirm('حذف؟')) return;
    if (!user) return;
    try {
      await remove(ref(database, `users/${user.id}/animals/${selectedType}/${id}`));
    } catch (error) {
      alert('خطأ: ' + error.message);
    }
  };

  const handleEditAnimal = (id) => {
    const item = animals[selectedType]?.[id];
    if (item) {
      setAnimalForm(item);
      setEditingId(id);
      setModalType('animal');
      setShowModal(true);
    }
  };

  const getTypeColor = (type) => {
    if (type === 'sheep') return '#f9f3f0';
    if (type === 'goat') return '#f0f9f3';
    return '#f5f5f5';
  };

  const getTypeTextColor = (type) => {
    if (type === 'sheep') return '#8B4513';
    if (type === 'goat') return '#228B22';
    return '#333';
  };

  const sortedAnimals = useMemo(() => {
    const typeAnimals = animals[selectedType] || {};
    return Object.entries(typeAnimals)
      .map(([id, data]) => ({ id, ...data }))
      .sort((a, b) => parseInt(a.number) - parseInt(b.number));
  }, [animals, selectedType]);

  const typeCount = useMemo(() => {
    const typeAnimals = animals[selectedType] || {};
    const active = Object.values(typeAnimals).filter(a => a.status === 'active').length;
    const productive = Object.values(typeAnimals).filter(a => a.status === 'productive').length;
    return { total: Object.keys(typeAnimals).length, active, productive };
  }, [animals, selectedType]);

  if (!user) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #5D4E37 0%, #3D2817 100%)' }}>
        <div style={{ background: 'white', padding: '40px', borderRadius: '12px', maxWidth: '500px', width: '90%' }}>
          <h1 style={{ color: '#3D2817', textAlign: 'center', marginBottom: '30px' }}>🐑 FarmHub Pro</h1>
          {authMode === 'login' ? (
            <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <h2 style={{ color: '#3D2817', marginBottom: '20px' }}>دخول</h2>
              <input type="email" placeholder="البريد" value={loginData.email} onChange={(e) => setLoginData(p => ({ ...p, email: e.target.value }))} style={{ padding: '10px', border: '1px solid #ddd', borderRadius: '6px' }} />
              <input type="password" placeholder="الباسورد" value={loginData.password} onChange={(e) => setLoginData(p => ({ ...p, password: e.target.value }))} style={{ padding: '10px', border: '1px solid #ddd', borderRadius: '6px' }} />
              <button type="submit" style={{ background: '#8B6F47', color: 'white', border: 'none', padding: '10px', borderRadius: '6px', cursor: 'pointer' }}>دخول</button>
              <button type="button" onClick={() => setAuthMode('register')} style={{ background: 'none', border: 'none', color: '#8B6F47', cursor: 'pointer' }}>تسجيل جديد</button>
            </form>
          ) : (
            <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <h2 style={{ color: '#3D2817', marginBottom: '20px' }}>تسجيل</h2>
              <input type="text" placeholder="الاسم" value={registerData.name} onChange={(e) => setRegisterData(p => ({ ...p, name: e.target.value }))} style={{ padding: '10px', border: '1px solid #ddd', borderRadius: '6px' }} />
              <input type="email" placeholder="البريد" value={registerData.email} onChange={(e) => setRegisterData(p => ({ ...p, email: e.target.value }))} style={{ padding: '10px', border: '1px solid #ddd', borderRadius: '6px' }} />
              <input type="password" placeholder="الباسورد" value={registerData.password} onChange={(e) => setRegisterData(p => ({ ...p, password: e.target.value }))} style={{ padding: '10px', border: '1px solid #ddd', borderRadius: '6px' }} />
              <input type="password" placeholder="تأكيد الباسورد" value={registerData.confirmPassword} onChange={(e) => setRegisterData(p => ({ ...p, confirmPassword: e.target.value }))} style={{ padding: '10px', border: '1px solid #ddd', borderRadius: '6px' }} />
              <button type="submit" style={{ background: '#8B6F47', color: 'white', border: 'none', padding: '10px', borderRadius: '6px', cursor: 'pointer' }}>تسجيل</button>
              <button type="button" onClick={() => setAuthMode('login')} style={{ background: 'none', border: 'none', color: '#8B6F47', cursor: 'pointer' }}>دخول</button>
            </form>
          )}
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', minHeight: '100vh', background: '#f9f7f4' }}>
      <style>{`* { margin: 0; padding: 0; box-sizing: border-box; } html, body { font-family: 'Segoe UI', Arial, sans-serif; direction: rtl; }`}</style>
      <div style={{ background: 'linear-gradient(180deg, #5D4E37 0%, #3D2817 100%)', padding: '25px 15px', height: '100vh', overflowY: 'auto' }}>
        <div style={{ color: '#F5D547', fontSize: '26px', fontWeight: 'bold', marginBottom: '30px', textAlign: 'center' }}>🐑 FarmHub</div>
        <p style={{ color: '#E8D5C4', fontSize: '12px', textAlign: 'center', marginBottom: '20px' }}>مرحباً {user.name}</p>
        <ul style={{ listStyle: 'none', marginBottom: '30px' }}>
          {[{ id: 'dashboard', label: '📊 لوحة التحكم' }, { id: 'animals', label: '🐑 الحيوانات' }, { id: 'feeds', label: '🌾 الأعلاف' }, { id: 'expenses', label: '💰 المصروفات' }].map(item => (
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
      <div style={{ overflowY: 'auto', maxHeight: '100vh', width: '100%', background: '#f9f7f4', padding: '30px' }}>
        {activeTab === 'animals' && (
          <div>
            <h1 style={{ marginBottom: '20px' }}>🐑 الحيوانات</h1>
            <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap' }}>
              {animalTypes.map(type => (
                <button
                  key={type}
                  onClick={() => setSelectedType(type)}
                  style={{
                    padding: '10px 20px',
                    background: selectedType === type ? '#8B6F47' : '#ddd',
                    color: selectedType === type ? 'white' : '#333',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontWeight: selectedType === type ? 'bold' : 'normal'
                  }}
                >
                  {type === 'sheep' ? '🐑 ضان' : type === 'goat' ? '🐐 ماعز' : type}
                </button>
              ))}
              <button
                onClick={() => setShowAddType(true)}
                style={{
                  padding: '10px 20px',
                  background: '#F5D547',
                  color: '#3D2817',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontWeight: 'bold'
                }}
              >
                + نوع جديد
              </button>
            </div>

            {showAddType && (
              <div style={{ background: 'white', padding: '20px', borderRadius: '8px', marginBottom: '20px' }}>
                <input
                  type="text"
                  placeholder="اسم النوع (مثل: غنم نجدية)"
                  value={newTypeName}
                  onChange={(e) => setNewTypeName(e.target.value)}
                  style={{ padding: '10px', border: '1px solid #ddd', borderRadius: '6px', width: '100%', marginBottom: '10px' }}
                />
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button onClick={handleAddType} style={{ background: '#8B6F47', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '6px', cursor: 'pointer' }}>إضافة</button>
                  <button onClick={() => setShowAddType(false)} style={{ background: '#ddd', border: 'none', padding: '10px 20px', borderRadius: '6px', cursor: 'pointer' }}>إلغاء</button>
                </div>
              </div>
            )}

            <div style={{ background: 'white', padding: '15px', borderRadius: '8px', marginBottom: '20px' }}>
              <p style={{ fontSize: '14px', fontWeight: 'bold', color: '#3D2817' }}>
                الإجمالي: {typeCount.total} | النشطة: {typeCount.active} | المنتجة: {typeCount.productive}
              </p>
            </div>

            <button
              onClick={() => { setAnimalForm({ number: '', gender: 'female', birthDate: new Date().toISOString().split('T')[0], status: 'active', lastProduction: new Date().toISOString().split('T')[0], notes: '', offspringCount: 0, healthStatus: 'healthy', healthNotes: '', saleDate: '', salePrice: '', slaughterDate: '', slaughterType: 'regular', slaughterLocation: '', slaughterNotes: '', deathDate: '', ageAtDeath: '0' }); setModalType('animal'); setShowModal(true); setEditingId(null); }}
              style={{ marginBottom: '20px', background: '#8B6F47', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '6px', cursor: 'pointer' }}
            >
              + إضافة
            </button>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#f0f0f0' }}>
                    <th style={{ padding: '10px', textAlign: 'right', fontSize: '12px' }}>الرقم</th>
                    <th style={{ padding: '10px', textAlign: 'right', fontSize: '12px' }}>الجنس</th>
                    <th style={{ padding: '10px', textAlign: 'right', fontSize: '12px' }}>العمر</th>
                    <th style={{ padding: '10px', textAlign: 'right', fontSize: '12px' }}>الحالة</th>
                    <th style={{ padding: '10px', textAlign: 'right', fontSize: '12px' }}>صحة</th>
                    <th style={{ padding: '10px', textAlign: 'right', fontSize: '12px' }}>الإجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedAnimals.map(animal => {
                    const age = calculateAge(animal.birthDate);
                    const statusColor = animal.status === 'active' ? getTypeColor(selectedType) : animal.status === 'sold' ? '#ffe8e8' : animal.status === 'slaughtered' ? '#e8e8e8' : '#ffe8e8';
                    return (
                      <tr key={animal.id} style={{ borderBottom: '1px solid #ddd', background: statusColor }}>
                        <td style={{ padding: '10px', fontWeight: 'bold', color: getTypeTextColor(selectedType) }}>{animal.number}</td>
                        <td style={{ padding: '10px', fontSize: '12px' }}>{animal.gender === 'male' ? '🐏 ذكر' : '🐑 أنثى'}</td>
                        <td style={{ padding: '10px', fontSize: '12px' }}>{age.years > 0 ? `${age.years} سنة` : ''} {age.months > 0 ? `${age.months} شهر` : ''}</td>
                        <td style={{ padding: '10px', fontSize: '12px', color: animal.status === 'active' ? '#27ae60' : animal.status === 'sold' ? '#f39c12' : '#e74c3c' }}>
                          {animal.status === 'active' ? '✓ نشط' : animal.status === 'sold' ? '💰 مباع' : animal.status === 'slaughtered' ? '🔪 مذبوح' : '☠️ متوفي'}
                        </td>
                        <td style={{ padding: '10px', fontSize: '12px', color: animal.healthStatus === 'healthy' ? '#27ae60' : '#e74c3c' }}>
                          {animal.healthStatus === 'healthy' ? '✓' : '⚠️'}
                        </td>
                        <td style={{ padding: '10px' }}>
                          <button onClick={() => handleEditAnimal(animal.id)} style={{ marginRight: '5px', background: 'none', border: 'none', cursor: 'pointer', color: '#8B6F47', fontSize: '16px' }}>✏️</button>
                          <button onClick={() => handleDeleteAnimal(animal.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'red', fontSize: '16px' }}>🗑️</button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'dashboard' && (
          <div>
            <h1>📊 لوحة التحكم</h1>
            <p style={{ marginTop: '20px', color: '#666' }}>مرحبا في FarmHub Pro - نظام إدارة الثروة الحيوانية</p>
          </div>
        )}

        {activeTab === 'feeds' && (
          <div>
            <h1>🌾 الأعلاف</h1>
            <button
              onClick={() => { setFeedForm({ date: new Date().toISOString().split('T')[0], type: 'شعير', quantity: '', pricePerKg: '' }); setModalType('feed'); setShowModal(true); setEditingId(null); }}
              style={{ marginBottom: '20px', marginTop: '20px', background: '#8B6F47', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '6px', cursor: 'pointer' }}
            >
              + إضافة
            </button>
            {feeds.length > 0 && (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#f0f0f0' }}>
                    <th style={{ padding: '10px', textAlign: 'right' }}>التاريخ</th>
                    <th style={{ padding: '10px', textAlign: 'right' }}>النوع</th>
                    <th style={{ padding: '10px', textAlign: 'right' }}>الكمية</th>
                    <th style={{ padding: '10px', textAlign: 'right' }}>السعر</th>
                  </tr>
                </thead>
                <tbody>
                  {feeds.map(f => (
                    <tr key={f.id} style={{ borderBottom: '1px solid #ddd' }}>
                      <td style={{ padding: '10px' }}>{f.date}</td>
                      <td style={{ padding: '10px' }}>{f.type}</td>
                      <td style={{ padding: '10px' }}>{f.quantity}</td>
                      <td style={{ padding: '10px' }}>{f.pricePerKg}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {activeTab === 'expenses' && (
          <div>
            <h1>💰 المصروفات</h1>
            <button
              onClick={() => { setExpenseForm({ date: new Date().toISOString().split('T')[0], category: 'رواتب', amount: '' }); setModalType('expense'); setShowModal(true); setEditingId(null); }}
              style={{ marginBottom: '20px', marginTop: '20px', background: '#8B6F47', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '6px', cursor: 'pointer' }}
            >
              + إضافة
            </button>
            {expenses.length > 0 && (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#f0f0f0' }}>
                    <th style={{ padding: '10px', textAlign: 'right' }}>التاريخ</th>
                    <th style={{ padding: '10px', textAlign: 'right' }}>الفئة</th>
                    <th style={{ padding: '10px', textAlign: 'right' }}>المبلغ</th>
                  </tr>
                </thead>
                <tbody>
                  {expenses.map(e => (
                    <tr key={e.id} style={{ borderBottom: '1px solid #ddd' }}>
                      <td style={{ padding: '10px' }}>{e.date}</td>
                      <td style={{ padding: '10px' }}>{e.category}</td>
                      <td style={{ padding: '10px' }}>{e.amount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>

      {showModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }} onClick={() => setShowModal(false)}>
          <div style={{ background: 'white', padding: '30px', borderRadius: '12px', maxWidth: '700px', width: '95%', maxHeight: '90vh', overflowY: 'auto', position: 'relative' }} onClick={e => e.stopPropagation()}>
            <button onClick={() => setShowModal(false)} style={{ position: 'absolute', top: '15px', right: '15px', background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer' }}>✕</button>
            
            {modalType === 'animal' && (
              <form onSubmit={(e) => { e.preventDefault(); handleAddAnimal(); }} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <h2 style={{ color: '#3D2817', marginBottom: '15px' }}>تسجيل الحيوان</h2>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div><label style={{ fontSize: '12px', fontWeight: 'bold' }}>الرقم</label><input type="text" value={animalForm.number} onChange={(e) => handleAnimalChange('number', e.target.value)} style={{ padding: '8px', border: '1px solid #ddd', borderRadius: '6px', width: '100%' }} /></div>
                  <div><label style={{ fontSize: '12px', fontWeight: 'bold' }}>الجنس</label><select value={animalForm.gender} onChange={(e) => handleAnimalChange('gender', e.target.value)} style={{ padding: '8px', border: '1px solid #ddd', borderRadius: '6px', width: '100%' }}><option value="female">أنثى</option><option value="male">ذكر</option></select></div>
                </div>

                <div><label style={{ fontSize: '12px', fontWeight: 'bold' }}>تاريخ الميلاد</label><input type="date" value={animalForm.birthDate} onChange={(e) => handleAnimalChange('birthDate', e.target.value)} style={{ padding: '8px', border: '1px solid #ddd', borderRadius: '6px', width: '100%' }} /></div>

                {animalForm.gender === 'female' && (
                  <div><label style={{ fontSize: '12px', fontWeight: 'bold' }}>عدد الأبناء</label><input type="number" value={animalForm.offspringCount} onChange={(e) => handleAnimalChange('offspringCount', e.target.value)} style={{ padding: '8px', border: '1px solid #ddd', borderRadius: '6px', width: '100%' }} /></div>
                )}

                <div><label style={{ fontSize: '12px', fontWeight: 'bold' }}>الحالة الصحية</label><select value={animalForm.healthStatus} onChange={(e) => handleAnimalChange('healthStatus', e.target.value)} style={{ padding: '8px', border: '1px solid #ddd', borderRadius: '6px', width: '100%' }}><option value="healthy">سليمة</option><option value="sick">مريضة</option></select></div>

                {animalForm.healthStatus === 'sick' && (
                  <div><label style={{ fontSize: '12px', fontWeight: 'bold' }}>وصف المشكلة</label><textarea value={animalForm.healthNotes} onChange={(e) => handleAnimalChange('healthNotes', e.target.value)} style={{ padding: '8px', border: '1px solid #ddd', borderRadius: '6px', width: '100%', minHeight: '60px' }} /></div>
                )}

                <div><label style={{ fontSize: '12px', fontWeight: 'bold' }}>الحالة</label><select value={animalForm.status} onChange={(e) => handleAnimalChange('status', e.target.value)} style={{ padding: '8px', border: '1px solid #ddd', borderRadius: '6px', width: '100%' }}><option value="active">نشط</option><option value="sold">مباع</option><option value="slaughtered">مذبوح</option><option value="dead">متوفي</option></select></div>

                {animalForm.status === 'sold' && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <div><label style={{ fontSize: '12px', fontWeight: 'bold' }}>تاريخ البيع</label><input type="date" value={animalForm.saleDate} onChange={(e) => handleAnimalChange('saleDate', e.target.value)} style={{ padding: '8px', border: '1px solid #ddd', borderRadius: '6px', width: '100%' }} /></div>
                    <div><label style={{ fontSize: '12px', fontWeight: 'bold' }}>السعر</label><input type="number" value={animalForm.salePrice} onChange={(e) => handleAnimalChange('salePrice', e.target.value)} style={{ padding: '8px', border: '1px solid #ddd', borderRadius: '6px', width: '100%' }} /></div>
                  </div>
                )}

                {animalForm.status === 'slaughtered' && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <div><label style={{ fontSize: '12px', fontWeight: 'bold' }}>تاريخ الذبح</label><input type="date" value={animalForm.slaughterDate} onChange={(e) => handleAnimalChange('slaughterDate', e.target.value)} style={{ padding: '8px', border: '1px solid #ddd', borderRadius: '6px', width: '100%' }} /></div>
                    <div><label style={{ fontSize: '12px', fontWeight: 'bold' }}>نوع الذبح</label><select value={animalForm.slaughterType} onChange={(e) => handleAnimalChange('slaughterType', e.target.value)} style={{ padding: '8px', border: '1px solid #ddd', borderRadius: '6px', width: '100%' }}><option value="regular">عادي</option><option value="charity">صدقة</option></select></div>
                  </div>
                )}

                {animalForm.status === 'slaughtered' && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <div><label style={{ fontSize: '12px', fontWeight: 'bold' }}>مكان الذبح</label><select value={animalForm.slaughterLocation} onChange={(e) => handleAnimalChange('slaughterLocation', e.target.value)} style={{ padding: '8px', border: '1px solid #ddd', borderRadius: '6px', width: '100%' }}><option value="freezer">ثلاجة</option><option value="guest">ضيف</option></select></div>
                    <div><label style={{ fontSize: '12px', fontWeight: 'bold' }}>ملاحظات</label><input type="text" value={animalForm.slaughterNotes} onChange={(e) => handleAnimalChange('slaughterNotes', e.target.value)} style={{ padding: '8px', border: '1px solid #ddd', borderRadius: '6px', width: '100%' }} /></div>
                  </div>
                )}

                {animalForm.status === 'dead' && (
                  <div><label style={{ fontSize: '12px', fontWeight: 'bold' }}>تاريخ الوفاة</label><input type="date" value={animalForm.deathDate} onChange={(e) => handleAnimalChange('deathDate', e.target.value)} style={{ padding: '8px', border: '1px solid #ddd', borderRadius: '6px', width: '100%' }} /></div>
                )}

                <div><label style={{ fontSize: '12px', fontWeight: 'bold' }}>ملاحظات</label><textarea value={animalForm.notes} onChange={(e) => handleAnimalChange('notes', e.target.value)} style={{ padding: '8px', border: '1px solid #ddd', borderRadius: '6px', width: '100%', minHeight: '60px' }} /></div>

                <button type="submit" style={{ background: '#8B6F47', color: 'white', border: 'none', padding: '12px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>حفظ</button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default App;

    
