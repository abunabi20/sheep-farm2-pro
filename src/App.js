import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { LogOut, Settings } from 'lucide-react';

// Default admin user
const DEFAULT_ADMIN = {
  'abunabi_user': {
    emails: [
      'abunabi@gmail.com',
      'abunabi20@gmail.com',
      'abunabi22@gmail.com',
      'abunabi4@gmail.com',
      'abunabi2000@hotmail.com'
    ],
    password: 'Abunabi@2024',
    role: 'admin'
  },
  'majiid_user': {
    emails: [
      'majiid1.q8@gmail.com',
      'majiid.q8@gmail.com'
    ],
    password: 'Majiid@2024',
    role: 'admin'
  }
};

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
  const [activeTab, setActiveTab] = useState('animals');
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [passwordData, setPasswordData] = useState({ old: '', new: '', confirm: '' });
  const [passwordError, setPasswordError] = useState('');
  const [animalTypes, setAnimalTypes] = useState(['sheep', 'goat']);
  const [selectedType, setSelectedType] = useState('sheep');
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [animals, setAnimals] = useState({});
  const [showAddType, setShowAddType] = useState(false);
  const [newTypeName, setNewTypeName] = useState('');
  const [loginError, setLoginError] = useState('');
  
  // Admin panel states
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [adminPanelError, setAdminPanelError] = useState('');

  const [animalForm, setAnimalForm] = useState({
    number: '', gender: 'female', birthDate: new Date().toISOString().split('T')[0],
    status: 'active', notes: '', offspringCount: 0, healthStatus: 'healthy', healthNotes: '',
    saleDate: '', salePrice: '', slaughterDate: '', slaughterType: 'regular',
    slaughterLocation: '', slaughterNotes: '', deathDate: ''
  });

  // Load users from localStorage
  const [allUsers, setAllUsers] = useState(() => {
    const saved = localStorage.getItem('allUsers');
    return saved ? JSON.parse(saved) : DEFAULT_ADMIN;
  });

  useEffect(() => {
    localStorage.setItem('allUsers', JSON.stringify(allUsers));
  }, [allUsers]);

  useEffect(() => {
    const saved = localStorage.getItem('sheepFarmUser');
    if (saved) {
      const userData = JSON.parse(saved);
      setUser(userData);
      
      const savedTypes = localStorage.getItem(`animalTypes_${userData.id}`);
      if (savedTypes) setAnimalTypes(JSON.parse(savedTypes));
      
      const savedAnimals = localStorage.getItem(`animals_${userData.id}`);
      if (savedAnimals) setAnimals(JSON.parse(savedAnimals));
    }
  }, []);

  useEffect(() => {
    if (user) {
      localStorage.setItem(`animals_${user.id}`, JSON.stringify(animals));
    }
  }, [animals, user]);

  // Find user ID by email
  const findUserByEmail = (email) => {
    const lowerEmail = email.toLowerCase().trim();
    for (const [userId, userData] of Object.entries(allUsers)) {
      if (userData.emails.includes(lowerEmail)) {
        return { userId, role: userData.role };
      }
    }
    return null;
  };

  const handleLogin = (e) => {
    e.preventDefault();
    setLoginError('');
    
    const userFound = findUserByEmail(loginData.email);
    
    if (!userFound) {
      // New user
      const newUserId = `user_${Date.now()}`;
      const newUser = {
        id: newUserId,
        email: loginData.email.toLowerCase().trim(),
        name: loginData.email.split('@')[0],
        role: 'user',
        password: loginData.password
      };
      
      const updatedUsers = { ...allUsers, [newUserId]: { emails: [loginData.email.toLowerCase().trim()], password: loginData.password, role: 'user' } };
      setAllUsers(updatedUsers);
      localStorage.setItem('sheepFarmUser', JSON.stringify(newUser));
      setUser(newUser);
      setLoginData({ email: '', password: '' });
      return;
    }

    // Check password
    const userData = allUsers[userFound.userId];
    if (loginData.password !== userData.password) {
      setLoginError('الباسورد غير صحيح!');
      return;
    }

    // Successful login
    const u = {
      id: userFound.userId,
      email: loginData.email.toLowerCase().trim(),
      name: userData.name || loginData.email.split('@')[0],
      role: userFound.role
    };
    localStorage.setItem('sheepFarmUser', JSON.stringify(u));
    setUser(u);
    setLoginData({ email: '', password: '' });
  };

  const handleChangePassword = (e) => {
    e.preventDefault();
    setPasswordError('');
    
    if (!passwordData.old || !passwordData.new || !passwordData.confirm) {
      setPasswordError('ملء جميع الحقول');
      return;
    }

    const userData = allUsers[user.id];
    if (passwordData.old !== userData.password) {
      setPasswordError('الباسورد القديم غير صحيح!');
      return;
    }

    if (passwordData.new !== passwordData.confirm) {
      setPasswordError('كلمات المرور الجديدة غير متطابقة!');
      return;
    }

    if (passwordData.new.length < 6) {
      setPasswordError('الباسورد الجديد قصير جداً (6 أحرف على الأقل)');
      return;
    }

    const updatedUsers = { ...allUsers };
    updatedUsers[user.id].password = passwordData.new;
    setAllUsers(updatedUsers);
    
    setPasswordData({ old: '', new: '', confirm: '' });
    setShowChangePassword(false);
    alert('تم تغيير كلمة المرور بنجاح!');
  };

  const handleAddAdmin = (e) => {
    e.preventDefault();
    setAdminPanelError('');

    if (!newAdminEmail) {
      setAdminPanelError('أدخل البريد الإلكتروني');
      return;
    }

    const emailLower = newAdminEmail.toLowerCase().trim();
    
    // Check if email already exists
    for (const userData of Object.values(allUsers)) {
      if (userData.emails.includes(emailLower)) {
        setAdminPanelError('هذا البريد مسجل بالفعل!');
        return;
      }
    }

    // Add new admin
    const newAdminId = `admin_${Date.now()}`;
    const defaultPassword = 'Admin@2024';
    
    const updatedUsers = { ...allUsers };
    updatedUsers[newAdminId] = {
      emails: [emailLower],
      password: defaultPassword,
      role: 'admin',
      name: emailLower.split('@')[0]
    };
    
    setAllUsers(updatedUsers);
    setAdminPanelError(`✓ تم إضافة المشرف بنجاح!\nالبريد: ${emailLower}\nالباسورد المؤقت: ${defaultPassword}`);
    setNewAdminEmail('');
    
    setTimeout(() => setAdminPanelError(''), 3000);
  };

  const handleLogout = () => {
    localStorage.removeItem('sheepFarmUser');
    setUser(null);
    setAuthMode('login');
    setShowChangePassword(false);
    setShowAdminPanel(false);
  };

  const handleAnimalChange = useCallback((f, v) => setAnimalForm(p => ({ ...p, [f]: v })), []);

  const handleAddAnimal = () => {
    if (!animalForm.number || !animalForm.birthDate) return alert('ملء البيانات');
    
    const animalId = editingId || `${selectedType}-${Date.now()}`;
    const updated = { ...animals };
    if (!updated[selectedType]) updated[selectedType] = {};
    updated[selectedType][animalId] = animalForm;
    
    setAnimals(updated);
    setAnimalForm({ number: '', gender: 'female', birthDate: new Date().toISOString().split('T')[0], status: 'active', notes: '', offspringCount: 0, healthStatus: 'healthy', healthNotes: '', saleDate: '', salePrice: '', slaughterDate: '', slaughterType: 'regular', slaughterLocation: '', slaughterNotes: '', deathDate: '' });
    setShowModal(false);
    setEditingId(null);
  };

  const handleAddType = () => {
    if (!newTypeName) return alert('أدخل اسم النوع');
    if (animalTypes.includes(newTypeName)) return alert('النوع موجود بالفعل');
    const updated = [...animalTypes, newTypeName];
    setAnimalTypes(updated);
    if (user) localStorage.setItem(`animalTypes_${user.id}`, JSON.stringify(updated));
    setNewTypeName('');
    setShowAddType(false);
    setSelectedType(newTypeName);
  };

  const handleDeleteAnimal = (id) => {
    if (!window.confirm('حذف؟')) return;
    const updated = { ...animals };
    delete updated[selectedType][id];
    setAnimals(updated);
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
    const total = Object.keys(typeAnimals).length;
    
    const counts = {
      total: total,
      active: Object.values(typeAnimals).filter(a => a.status === 'active').length,
      productive: Object.values(typeAnimals).filter(a => a.status === 'productive').length,
      sick: Object.values(typeAnimals).filter(a => a.healthStatus === 'sick').length,
      dead: Object.values(typeAnimals).filter(a => a.status === 'dead').length,
      sold: Object.values(typeAnimals).filter(a => a.status === 'sold').length,
      charity: Object.values(typeAnimals).filter(a => a.slaughterType === 'charity').length,
      freezer: Object.values(typeAnimals).filter(a => a.slaughterLocation === 'freezer').length,
    };
    
    return counts;
  }, [animals, selectedType]);

  if (!user) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #5D4E37 0%, #3D2817 100%)' }}>
        <div style={{ background: 'white', padding: '40px', borderRadius: '12px', maxWidth: '500px', width: '90%' }}>
          <h1 style={{ color: '#3D2817', textAlign: 'center', marginBottom: '30px' }}>🐑 FarmHub Pro</h1>
          {authMode === 'login' ? (
            <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <h2 style={{ color: '#3D2817', marginBottom: '20px' }}>دخول</h2>
              {loginError && <div style={{ color: '#e74c3c', background: '#ffe8e8', padding: '10px', borderRadius: '6px', fontSize: '12px' }}>{loginError}</div>}
              <input type="email" placeholder="البريد الإلكتروني" value={loginData.email} onChange={(e) => setLoginData(p => ({ ...p, email: e.target.value }))} style={{ padding: '10px', border: '1px solid #ddd', borderRadius: '6px' }} />
              <input type="password" placeholder="الباسورد" value={loginData.password} onChange={(e) => setLoginData(p => ({ ...p, password: e.target.value }))} style={{ padding: '10px', border: '1px solid #ddd', borderRadius: '6px' }} />
              <button type="submit" style={{ background: '#8B6F47', color: 'white', border: 'none', padding: '10px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>دخول</button>
              <p style={{ color: '#666', fontSize: '12px', textAlign: 'center' }}>لا تملك حساب؟ ادخل بريدك الجديد للتسجيل التلقائي</p>
            </form>
          ) : (
            <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <h2 style={{ color: '#3D2817', marginBottom: '20px' }}>دخول جديد</h2>
              {loginError && <div style={{ color: '#e74c3c', background: '#ffe8e8', padding: '10px', borderRadius: '6px', fontSize: '12px' }}>{loginError}</div>}
              <input type="email" placeholder="البريد الإلكتروني" value={loginData.email} onChange={(e) => setLoginData(p => ({ ...p, email: e.target.value }))} style={{ padding: '10px', border: '1px solid #ddd', borderRadius: '6px' }} />
              <input type="password" placeholder="الباسورد" value={loginData.password} onChange={(e) => setLoginData(p => ({ ...p, password: e.target.value }))} style={{ padding: '10px', border: '1px solid #ddd', borderRadius: '6px' }} />
              <button type="submit" style={{ background: '#8B6F47', color: 'white', border: 'none', padding: '10px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>دخول</button>
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
        <p style={{ color: '#E8D5C4', fontSize: '12px', textAlign: 'center', marginBottom: '5px' }}>مرحباً {user.name}</p>
        <p style={{ color: '#F5D547', fontSize: '11px', textAlign: 'center', marginBottom: '20px', background: user.role === 'admin' ? '#8B6F47' : 'transparent', padding: '5px', borderRadius: '4px' }}>
          {user.role === 'admin' ? '👑 مشرف' : '👤 مستخدم'}
        </p>
        <ul style={{ listStyle: 'none', marginBottom: '20px' }}>
          {[{ id: 'animals', label: '🐑 الحيوانات' }].map(item => (
            <li key={item.id} style={{ marginBottom: '8px' }}>
              <button onClick={() => setActiveTab(item.id)} style={{ width: '100%', padding: '12px 15px', color: activeTab === item.id ? '#3D2817' : '#E8D5C4', background: activeTab === item.id ? 'linear-gradient(90deg, #F5D547, #D4A574)' : 'transparent', border: 'none', cursor: 'pointer', borderRadius: '6px', fontSize: '13px', fontWeight: activeTab === item.id ? 'bold' : 'normal' }}>
                {item.label}
              </button>
            </li>
          ))}
        </ul>
        
        <div style={{ borderTop: '1px solid #8B6F47', paddingTop: '15px' }}>
          <button onClick={() => setShowChangePassword(true)} style={{ width: '100%', padding: '10px', background: '#F5D547', color: '#3D2817', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold', marginBottom: '10px' }}>
            🔐 تغيير كلمة المرور
          </button>
          
          {user.role === 'admin' && (
            <button onClick={() => setShowAdminPanel(true)} style={{ width: '100%', padding: '10px', background: '#27ae60', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold', marginBottom: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px' }}>
              <Settings size={14} /> إدارة المستخدمين
            </button>
          )}
          
          <button onClick={handleLogout} style={{ width: '100%', padding: '10px', color: '#e74c3c', background: 'transparent', border: '1px solid #e74c3c', cursor: 'pointer', borderRadius: '6px', fontSize: '12px', fontWeight: '600', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px' }}>
            <LogOut size={14} /> تسجيل الخروج
          </button>
        </div>
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

            <div style={{ background: 'white', padding: '15px', borderRadius: '8px', marginBottom: '20px', fontWeight: 'bold', color: '#3D2817', fontSize: '13px', lineHeight: '1.8' }}>
              <div>🐑 الإجمالي: {typeCount.total}</div>
              <div style={{ color: '#27ae60' }}>✓ النشطة: {typeCount.active}</div>
              <div style={{ color: '#f39c12' }}>⭐ المنتجة: {typeCount.productive}</div>
              <div style={{ color: '#e74c3c' }}>⚠️ المريضة: {typeCount.sick}</div>
              <div style={{ color: '#7f8c8d' }}>☠️ المتوفاة: {typeCount.dead}</div>
              <div style={{ color: '#3498db' }}>💰 المباع: {typeCount.sold}</div>
              <div style={{ color: '#e67e22' }}>🤲 الصدقة: {typeCount.charity}</div>
              <div style={{ color: '#2980b9' }}>❄️ الثلاجة: {typeCount.freezer}</div>
            </div>

            <button
              onClick={() => { setAnimalForm({ number: '', gender: 'female', birthDate: new Date().toISOString().split('T')[0], status: 'active', notes: '', offspringCount: 0, healthStatus: 'healthy', healthNotes: '', saleDate: '', salePrice: '', slaughterDate: '', slaughterType: 'regular', slaughterLocation: '', slaughterNotes: '', deathDate: '' }); setModalType('animal'); setShowModal(true); setEditingId(null); }}
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
                    <div><label style={{ fontSize: '12px', fontWeight: 'bold' }}>مكان الذبح</label><select value={animalForm.slaughterLocation} onChange={(e) => handleAnimalChange('slaughterLocation', e.target.value)} style={{ padding: '8px', border: '1px solid #ddd', borderRadius: '6px', width: '100%' }}><option value="">اختر</option><option value="freezer">ثلاجة</option><option value="guest">ضيف</option></select></div>
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

      {showChangePassword && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }} onClick={() => setShowChangePassword(false)}>
          <div style={{ background: 'white', padding: '30px', borderRadius: '12px', maxWidth: '400px', width: '90%', position: 'relative' }} onClick={e => e.stopPropagation()}>
            <button onClick={() => setShowChangePassword(false)} style={{ position: 'absolute', top: '15px', right: '15px', background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer' }}>✕</button>
            
            <h2 style={{ color: '#3D2817', marginBottom: '20px' }}>🔐 تغيير كلمة المرور</h2>
            
            {passwordError && <div style={{ color: passwordError.includes('✓') ? '#27ae60' : '#e74c3c', background: passwordError.includes('✓') ? '#e8f8f5' : '#ffe8e8', padding: '10px', borderRadius: '6px', fontSize: '12px', marginBottom: '15px', whiteSpace: 'pre-line' }}>{passwordError}</div>}
            
            <form onSubmit={handleChangePassword} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>كلمة المرور القديمة</label>
                <input type="password" value={passwordData.old} onChange={(e) => setPasswordData(p => ({ ...p, old: e.target.value }))} style={{ padding: '8px', border: '1px solid #ddd', borderRadius: '6px', width: '100%' }} />
              </div>
              
              <div>
                <label style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>كلمة المرور الجديدة</label>
                <input type="password" value={passwordData.new} onChange={(e) => setPasswordData(p => ({ ...p, new: e.target.value }))} style={{ padding: '8px', border: '1px solid #ddd', borderRadius: '6px', width: '100%' }} />
              </div>
              
              <div>
                <label style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>تأكيد كلمة المرور</label>
                <input type="password" value={passwordData.confirm} onChange={(e) => setPasswordData(p => ({ ...p, confirm: e.target.value }))} style={{ padding: '8px', border: '1px solid #ddd', borderRadius: '6px', width: '100%' }} />
              </div>
              
              <button type="submit" style={{ background: '#8B6F47', color: 'white', border: 'none', padding: '10px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>تحديث كلمة المرور</button>
            </form>
          </div>
        </div>
      )}

      {showAdminPanel && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }} onClick={() => setShowAdminPanel(false)}>
          <div style={{ background: 'white', padding: '30px', borderRadius: '12px', maxWidth: '500px', width: '90%', position: 'relative', maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
            <button onClick={() => setShowAdminPanel(false)} style={{ position: 'absolute', top: '15px', right: '15px', background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer' }}>✕</button>
            
            <h2 style={{ color: '#3D2817', marginBottom: '20px' }}>👑 إدارة المستخدمين والمشرفين</h2>
            
            {adminPanelError && <div style={{ color: adminPanelError.includes('✓') ? '#27ae60' : '#e74c3c', background: adminPanelError.includes('✓') ? '#e8f8f5' : '#ffe8e8', padding: '10px', borderRadius: '6px', fontSize: '12px', marginBottom: '15px', whiteSpace: 'pre-line' }}>{adminPanelError}</div>}
            
            <form onSubmit={handleAddAdmin} style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
              <h3 style={{ color: '#3D2817', fontSize: '14px' }}>➕ إضافة مشرف جديد</h3>
              <input type="email" placeholder="البريد الإلكتروني" value={newAdminEmail} onChange={(e) => setNewAdminEmail(e.target.value)} style={{ padding: '8px', border: '1px solid #ddd', borderRadius: '6px', width: '100%' }} />
              <button type="submit" style={{ background: '#27ae60', color: 'white', border: 'none', padding: '10px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>إضافة</button>
            </form>

            <div style={{ borderTop: '1px solid #ddd', paddingTop: '20px' }}>
              <h3 style={{ color: '#3D2817', fontSize: '14px', marginBottom: '15px' }}>📋 قائمة المشرفين والمستخدمين</h3>
              <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                {Object.entries(allUsers).map(([userId, userData]) => (
                  <div key={userId} style={{ background: '#f9f7f4', padding: '10px', borderRadius: '6px', marginBottom: '10px', fontSize: '12px' }}>
                    <div style={{ fontWeight: 'bold', color: userData.role === 'admin' ? '#27ae60' : '#8B6F47' }}>
                      {userData.role === 'admin' ? '👑' : '👤'} {userData.name || userData.emails[0].split('@')[0]}
                    </div>
                    <div style={{ color: '#666', fontSize: '11px' }}>
                      {userData.emails.map((email, idx) => (
                        <div key={idx}>{email}</div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
