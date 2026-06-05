    import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import { getDatabase, ref, set, onValue } from 'firebase/database';

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

const DEFAULT_ADMIN = {
  'abunabi_user': {
    emails: ['abunabi@gmail.com', 'abunabi20@gmail.com', 'abunabi22@gmail.com', 'abunabi4@gmail.com', 'abunabi2000@hotmail.com'],
    password: 'Abunabi@2024',
    role: 'admin'
  },
  'majiid_user': {
    emails: ['majiid1.q8@gmail.com', 'majiid.q8@gmail.com'],
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

const formatAge = (startDate) => {
  const age = calculateAge(startDate);
  if (age.years === 0 && age.months === 0) return 'جديد';
  let result = '';
  if (age.years > 0) result += `${age.years} سنة`;
  if (age.months > 0) result += (result ? ' و ' : '') + `${age.months} شهر`;
  return result;
};

const EMPTY_FORM = {
  number: '', gender: 'female', birthDate: new Date().toISOString().split('T')[0],
  status: 'active', notes: '', offspringCount: 0, healthStatus: 'healthy', healthNotes: '',
  saleDate: '', salePrice: '', slaughterDate: '', slaughterType: 'regular',
  slaughterLocation: '', slaughterNotes: '', deathDate: ''
};

const App = () => {
  const [user, setUser] = useState(null);
  const [selectedAnimalType, setSelectedAnimalType] = useState(null);
  const [showDashboard, setShowDashboard] = useState(false);
  const [loginData, setLoginData] = useState({ email: '', password: '' });
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [passwordData, setPasswordData] = useState({ old: '', new: '', confirm: '' });
  const [passwordError, setPasswordError] = useState('');
  const [animalTypes, setAnimalTypes] = useState(['sheep', 'goat']);
  const [showModal, setShowModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedAnimal, setSelectedAnimal] = useState(null);
  const [editingId, setEditingId] = useState(null);
  // ✅ مصدر واحد للبيانات - Firebase فقط
  const [animals, setAnimals] = useState({});
  const [firebaseReady, setFirebaseReady] = useState(false);
  const [showAddType, setShowAddType] = useState(false);
  const [newTypeName, setNewTypeName] = useState('');
  const [editingType, setEditingType] = useState(null);
  const [editTypeName, setEditTypeName] = useState('');
  const [loginError, setLoginError] = useState('');
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [adminPanelError, setAdminPanelError] = useState('');
  const [animalForm, setAnimalForm] = useState(EMPTY_FORM);
  const [allUsers, setAllUsers] = useState(() => {
    const saved = localStorage.getItem('allUsers');
    return saved ? JSON.parse(saved) : DEFAULT_ADMIN;
  });

  useEffect(() => {
    localStorage.setItem('allUsers', JSON.stringify(allUsers));
  }, [allUsers]);

  // ✅ تحميل المستخدم من localStorage عند البداية فقط
  useEffect(() => {
    const saved = localStorage.getItem('sheepFarmUser');
    if (saved) {
      const userData = JSON.parse(saved);
      setUser(userData);
      const savedType = localStorage.getItem(`selectedType_${userData.id}`);
      if (savedType) setSelectedAnimalType(savedType);
    }
  }, []);

  // ✅ Firebase listener الرئيسي - يستمع لكل بيانات المستخدم
  useEffect(() => {
    if (!user) return;

    setFirebaseReady(false);
    const userRef = ref(database, `users/${user.id}`);

    const unsubscribe = onValue(userRef, (snapshot) => {
      const data = snapshot.val() || {};

      // تحميل أنواع الحيوانات
      if (data.animalTypes && Array.isArray(data.animalTypes)) {
        setAnimalTypes(data.animalTypes);
      }

      // تحميل البيانات مباشرة من Firebase - المصدر الوحيد
      const animalsData = data.animals || {};
      setAnimals(animalsData);
      setFirebaseReady(true);
    }, (error) => {
      console.error('Firebase error:', error);
      setFirebaseReady(true);
    });

    return () => unsubscribe();
  }, [user]);

  // ✅ حفظ أنواع الحيوانات في Firebase
  const saveAnimalTypes = useCallback((types, userId) => {
    set(ref(database, `users/${userId}/animalTypes`), types)
      .catch(err => console.error('Error saving types:', err));
  }, []);

  // ✅ حفظ حيوان في Firebase مباشرة
  const saveAnimalToFirebase = useCallback((userId, animalType, animalId, animalData) => {
    set(ref(database, `users/${userId}/animals/${animalType}/${animalId}`), animalData)
      .catch(err => console.error('Firebase save error:', err));
  }, []);

  // ✅ حذف حيوان من Firebase
  const deleteAnimalFromFirebase = useCallback((userId, animalType, animalId) => {
    set(ref(database, `users/${userId}/animals/${animalType}/${animalId}`), null)
      .catch(err => console.error('Firebase delete error:', err));
  }, []);

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
      const newUserId = `user_${Date.now()}`;
      const updatedUsers = {
        ...allUsers,
        [newUserId]: {
          emails: [loginData.email.toLowerCase().trim()],
          password: loginData.password,
          role: 'user'
        }
      };
      setAllUsers(updatedUsers);
      const newUser = {
        id: newUserId,
        email: loginData.email.toLowerCase().trim(),
        name: loginData.email.split('@')[0],
        role: 'user'
      };
      localStorage.setItem('sheepFarmUser', JSON.stringify(newUser));
      setUser(newUser);
      setLoginData({ email: '', password: '' });
      return;
    }

    const userData = allUsers[userFound.userId];
    if (loginData.password !== userData.password) {
      setLoginError('الباسورد غير صحيح!');
      return;
    }

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

  const handleSelectAnimalType = (type) => {
    setSelectedAnimalType(type);
    if (user) localStorage.setItem(`selectedType_${user.id}`, type);
  };

  const handleChangePassword = (e) => {
    e.preventDefault();
    setPasswordError('');
    if (!passwordData.old || !passwordData.new || !passwordData.confirm) {
      setPasswordError('ملء جميع الحقول'); return;
    }
    const userData = allUsers[user.id];
    if (passwordData.old !== userData.password) {
      setPasswordError('الباسورد القديم غير صحيح!'); return;
    }
    if (passwordData.new !== passwordData.confirm) {
      setPasswordError('كلمات المرور الجديدة غير متطابقة!'); return;
    }
    if (passwordData.new.length < 6) {
      setPasswordError('الباسورد الجديد قصير جداً (6 أحرف على الأقل)'); return;
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
    if (!newAdminEmail) { setAdminPanelError('أدخل البريد الإلكتروني'); return; }
    const emailLower = newAdminEmail.toLowerCase().trim();
    for (const userData of Object.values(allUsers)) {
      if (userData.emails.includes(emailLower)) {
        setAdminPanelError('هذا البريد مسجل بالفعل!'); return;
      }
    }
    const newAdminId = `admin_${Date.now()}`;
    const defaultPassword = 'Admin@2024';
    const updatedUsers = { ...allUsers };
    updatedUsers[newAdminId] = {
      emails: [emailLower], password: defaultPassword, role: 'admin', name: emailLower.split('@')[0]
    };
    setAllUsers(updatedUsers);
    setAdminPanelError(`✓ تم إضافة المشرف بنجاح!\nالبريد: ${emailLower}\nالباسورد المؤقت: ${defaultPassword}`);
    setNewAdminEmail('');
  };

  const handleLogout = () => {
    localStorage.removeItem('sheepFarmUser');
    setUser(null);
    setSelectedAnimalType(null);
    setAnimals({});
    setFirebaseReady(false);
    setShowChangePassword(false);
    setShowAdminPanel(false);
  };

  const handleAnimalChange = useCallback((f, v) => {
    setAnimalForm(p => ({ ...p, [f]: v }));
  }, []);

  const handleAddType = () => {
    if (!newTypeName) return alert('أدخل اسم النوع');
    if (animalTypes.includes(newTypeName)) return alert('النوع موجود بالفعل');
    const updated = [...animalTypes, newTypeName];
    setAnimalTypes(updated);
    if (user) saveAnimalTypes(updated, user.id);
    setNewTypeName('');
    setShowAddType(false);
    setTimeout(() => handleSelectAnimalType(newTypeName), 100);
  };

  // حذف نوع حيوان
  const handleDeleteType = (type) => {
    const protectedTypes = ['sheep', 'goat'];
    if (protectedTypes.includes(type)) return alert('لا يمكن حذف الضان أو الماعز');
    if (!window.confirm(`هل تريد حذف نوع "${type}" وكل بياناته؟`)) return;
    const updated = animalTypes.filter(t => t !== type);
    setAnimalTypes(updated);
    if (user) {
      saveAnimalTypes(updated, user.id);
      set(ref(database, `users/${user.id}/animals/${type}`), null)
        .catch(err => console.error('Error deleting type:', err));
    }
  };

  // تعديل اسم نوع حيوان
  const handleRenameType = () => {
    if (!editTypeName.trim()) return alert('أدخل الاسم الجديد');
    if (animalTypes.includes(editTypeName.trim()) && editTypeName.trim() !== editingType) return alert('هذا الاسم موجود بالفعل');
    const updated = animalTypes.map(t => t === editingType ? editTypeName.trim() : t);
    setAnimalTypes(updated);
    if (user) {
      saveAnimalTypes(updated, user.id);
      // نسخ البيانات للاسم الجديد وحذف القديم
      const oldData = animals[editingType] || {};
      set(ref(database, `users/${user.id}/animals/${editTypeName.trim()}`), oldData)
        .then(() => set(ref(database, `users/${user.id}/animals/${editingType}`), null))
        .catch(err => console.error('Error renaming type:', err));
    }
    setEditingType(null);
    setEditTypeName('');
  };

  // ✅ حذف مباشرة من Firebase
  const handleDeleteAnimal = (id) => {
    if (!window.confirm('هل تريد حذف هذا الحيوان؟')) return;
    if (user && selectedAnimalType) {
      deleteAnimalFromFirebase(user.id, selectedAnimalType, id);
    }
  };

  const handleEditAnimal = (id) => {
    const item = animals[selectedAnimalType]?.[id];
    if (item) {
      setAnimalForm(item);
      setEditingId(id);
      setShowModal(true);
    }
  };

  // ✅ حفظ مباشرة في Firebase
  const handleSaveAnimal = (e) => {
    e.preventDefault();
    if (!animalForm.number) { alert('أدخل رقم الحيوان'); return; }
    const animalId = editingId || `${selectedAnimalType}-${Date.now()}`;
    if (user && selectedAnimalType) {
      saveAnimalToFirebase(user.id, selectedAnimalType, animalId, animalForm);
    }
    setShowModal(false);
    setAnimalForm(EMPTY_FORM);
    setEditingId(null);
    alert('✓ تم الحفظ بنجاح!');
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
    if (!selectedAnimalType || !animals[selectedAnimalType]) return [];
    return Object.entries(animals[selectedAnimalType])
      .map(([id, data]) => ({ id, ...data }))
      .sort((a, b) => parseInt(a.number) - parseInt(b.number));
  }, [animals, selectedAnimalType]);

  const typeCount = useMemo(() => {
    if (!selectedAnimalType || !animals[selectedAnimalType]) {
      return { total: 0, active: 0, sick: 0, sold: 0, freezer: 0 };
    }
    const typeAnimals = animals[selectedAnimalType] || {};
    return {
      total: Object.keys(typeAnimals).length,
      active: Object.values(typeAnimals).filter(a => a.status === 'active').length,
      sick: Object.values(typeAnimals).filter(a => a.healthStatus === 'sick').length,
      sold: Object.values(typeAnimals).filter(a => a.status === 'sold').length,
      freezer: Object.values(typeAnimals).filter(a => a.slaughterLocation === 'freezer').length,
    };
  }, [animals, selectedAnimalType]);

  // شاشة الدخول
  if (!user) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #5D4E37 0%, #3D2817 100%)' }}>
        <div style={{ background: 'white', padding: '40px', borderRadius: '12px', maxWidth: '500px', width: '90%' }}>
          <h1 style={{ color: '#3D2817', textAlign: 'center', marginBottom: '30px' }}>🐑 FarmHub Pro</h1>
          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <h2 style={{ color: '#3D2817', marginBottom: '20px' }}>دخول</h2>
            {loginError && <div style={{ color: '#e74c3c', background: '#ffe8e8', padding: '10px', borderRadius: '6px', fontSize: '13px' }}>{loginError}</div>}
            <input type="email" placeholder="البريد الإلكتروني" value={loginData.email} onChange={(e) => setLoginData(p => ({ ...p, email: e.target.value }))} style={{ padding: '10px', border: '1px solid #ddd', borderRadius: '6px' }} />
            <input type="password" placeholder="الباسورد" value={loginData.password} onChange={(e) => setLoginData(p => ({ ...p, password: e.target.value }))} style={{ padding: '10px', border: '1px solid #ddd', borderRadius: '6px' }} />
            <button type="submit" style={{ background: '#8B6F47', color: 'white', border: 'none', padding: '10px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>دخول</button>
            <p style={{ color: '#666', fontSize: '12px', textAlign: 'center' }}>لا تملك حساب؟ ادخل بريدك الجديد للتسجيل التلقائي</p>
          </form>
        </div>
      </div>
    );
  }

  // شاشة تحميل Firebase
  if (!firebaseReady) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #5D4E37 0%, #3D2817 100%)' }}>
        <div style={{ color: 'white', textAlign: 'center', fontSize: '18px' }}>
          <div style={{ fontSize: '40px', marginBottom: '20px' }}>🐑</div>
          <div>جاري تحميل البيانات...</div>
        </div>
      </div>
    );
  }

  // شاشة اختيار النوع
  if (!selectedAnimalType) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #5D4E37 0%, #3D2817 100%)' }}>
        <div style={{ background: 'white', padding: '40px', borderRadius: '12px', maxWidth: '600px', width: '90%', textAlign: 'center' }}>
          <h1 style={{ color: '#3D2817', marginBottom: '30px' }}>🐑 اختر نوع الحيوان</h1>
          <div style={{ display: 'grid', gridTemplateColumns: animalTypes.length > 2 ? '1fr 1fr' : '1fr', gap: '15px', marginBottom: '30px' }}>
            {animalTypes.map(type => (
              <div key={type} style={{ position: 'relative' }}>
                {/* زر التعديل والحذف - يظهر فقط للأنواع غير الأساسية */}
                {type !== 'sheep' && type !== 'goat' && (
                  <div style={{ position: 'absolute', top: '5px', left: '5px', display: 'flex', gap: '4px', zIndex: 10 }}>
                    <button
                      onClick={(e) => { e.stopPropagation(); setEditingType(type); setEditTypeName(type); }}
                      style={{ background: '#F5D547', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', padding: '3px 6px', fontWeight: 'bold' }}
                      title="تعديل الاسم"
                    >✏️</button>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDeleteType(type); }}
                      style={{ background: '#e74c3c', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', padding: '3px 6px', color: 'white', fontWeight: 'bold' }}
                      title="حذف النوع"
                    >🗑️</button>
                  </div>
                )}
                <button onClick={() => handleSelectAnimalType(type)} style={{ width: '100%', padding: '30px 20px', background: getTypeColor(type), border: `3px solid ${getTypeTextColor(type)}`, borderRadius: '8px', cursor: 'pointer', fontSize: '16px', fontWeight: 'bold', color: getTypeTextColor(type) }}>
                  {type === 'sheep' ? '🐑 ضان' : type === 'goat' ? '🐐 ماعز' : `🐄 ${type}`}
                </button>
              </div>
            ))}
          </div>

          {/* Modal تعديل اسم النوع */}
          {editingType && (
            <div style={{ background: '#fff3cd', padding: '20px', borderRadius: '8px', marginBottom: '15px', border: '2px solid #F5D547' }}>
              <p style={{ fontWeight: 'bold', marginBottom: '10px', color: '#3D2817' }}>✏️ تعديل اسم "{editingType}"</p>
              <input
                type="text"
                value={editTypeName}
                onChange={(e) => setEditTypeName(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleRenameType()}
                style={{ padding: '10px', border: '1px solid #ddd', borderRadius: '6px', width: '100%', marginBottom: '10px', fontSize: '14px' }}
              />
              <div style={{ display: 'flex', gap: '10px' }}>
                <button onClick={handleRenameType} style={{ flex: 1, background: '#8B6F47', color: 'white', border: 'none', padding: '10px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>حفظ</button>
                <button onClick={() => { setEditingType(null); setEditTypeName(''); }} style={{ flex: 1, background: '#ddd', border: 'none', padding: '10px', borderRadius: '6px', cursor: 'pointer' }}>إلغاء</button>
              </div>
            </div>
          )}
          <button onClick={() => setShowAddType(true)} style={{ width: '100%', padding: '15px', background: '#F5D547', color: '#3D2817', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', marginBottom: '10px', fontSize: '14px' }}>
            ➕ إضافة نوع جديد
          </button>
          {showAddType && (
            <div style={{ background: '#f9f7f4', padding: '20px', borderRadius: '8px', marginBottom: '15px' }}>
              <input type="text" placeholder="مثال: بقر، طيور، إبل، خيل..." value={newTypeName} onChange={(e) => setNewTypeName(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && handleAddType()} style={{ padding: '10px', border: '1px solid #ddd', borderRadius: '6px', width: '100%', marginBottom: '10px', fontSize: '14px' }} />
              <div style={{ display: 'flex', gap: '10px' }}>
                <button onClick={handleAddType} style={{ flex: 1, background: '#8B6F47', color: 'white', border: 'none', padding: '10px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>إضافة</button>
                <button onClick={() => { setShowAddType(false); setNewTypeName(''); }} style={{ flex: 1, background: '#ddd', border: 'none', padding: '10px', borderRadius: '6px', cursor: 'pointer' }}>إلغاء</button>
              </div>
            </div>
          )}
          <button onClick={handleLogout} style={{ width: '100%', padding: '10px', color: '#e74c3c', background: 'transparent', border: '1px solid #e74c3c', cursor: 'pointer', borderRadius: '6px', fontSize: '13px', fontWeight: '600' }}>
            تسجيل الخروج
          </button>
        </div>
      </div>
    );
  }

  // صفحة Dashboard
  if (showDashboard) {
    let allAnimals = [];
    Object.entries(animals).forEach(([type, typeAnimals]) => {
      if (typeAnimals && typeof typeAnimals === 'object') {
        Object.entries(typeAnimals).forEach(([id, data]) => allAnimals.push({ id, type, ...data }));
      }
    });
    const totalStats = {
      total: allAnimals.length,
      active: allAnimals.filter(a => a.status === 'active').length,
      sick: allAnimals.filter(a => a.healthStatus === 'sick').length,
      sold: allAnimals.filter(a => a.status === 'sold').length,
      freezer: allAnimals.filter(a => a.slaughterLocation === 'freezer').length,
    };
    return (
      <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', minHeight: '100vh', background: '#f9f7f4' }}>
        <style>{`* { margin: 0; padding: 0; box-sizing: border-box; } html, body { font-family: 'Segoe UI', Arial, sans-serif; direction: rtl; }`}</style>
        <div style={{ background: 'linear-gradient(180deg, #5D4E37 0%, #3D2817 100%)', padding: '25px 15px', height: '100vh', overflowY: 'auto', position: 'fixed', width: '260px', left: 0, top: 0, zIndex: 100 }}>
          <div style={{ color: '#F5D547', fontSize: '26px', fontWeight: 'bold', marginBottom: '30px', textAlign: 'center' }}>🐑 FarmHub</div>
          <p style={{ color: '#E8D5C4', fontSize: '12px', textAlign: 'center', marginBottom: '5px' }}>مرحباً {user.name}</p>
          <button onClick={() => setShowDashboard(false)} style={{ width: '100%', padding: '10px', background: '#27ae60', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold', marginBottom: '10px' }}>← رجوع</button>
          <div style={{ borderTop: '1px solid #8B6F47', paddingTop: '15px' }}>
            <button onClick={() => setShowChangePassword(true)} style={{ width: '100%', padding: '10px', background: '#F5D547', color: '#3D2817', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold', marginBottom: '10px' }}>🔐 تغيير المرور</button>
            <button onClick={handleLogout} style={{ width: '100%', padding: '10px', color: '#e74c3c', background: 'transparent', border: '1px solid #e74c3c', cursor: 'pointer', borderRadius: '6px', fontSize: '13px', fontWeight: '600' }}>تسجيل الخروج</button>
          </div>
        </div>
        <div style={{ marginLeft: '260px', padding: '30px', overflowY: 'auto', height: '100vh' }}>
          <h1 style={{ marginBottom: '20px', color: '#3D2817' }}>📊 ملخص الإحصائيات الشاملة</h1>
          <div style={{ background: 'white', padding: '20px', borderRadius: '8px', marginBottom: '30px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '15px' }}>
            {[
              { val: totalStats.total, label: '🐑 الإجمالي', color: '#3D2817' },
              { val: totalStats.active, label: '✓ النشطة', color: '#27ae60' },
              { val: totalStats.sick, label: '⚠️ المريضة', color: '#e74c3c' },
              { val: totalStats.sold, label: '💰 المباع', color: '#3498db' },
              { val: totalStats.freezer, label: '❄️ الثلاجة', color: '#2980b9' },
            ].map(s => (
              <div key={s.label} style={{ textAlign: 'center', padding: '15px', background: '#f9f7f4', borderRadius: '8px' }}>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: s.color }}>{s.val}</div>
                <div style={{ color: s.color, fontSize: '13px', marginTop: '5px' }}>{s.label}</div>
              </div>
            ))}
          </div>
          <h2 style={{ marginBottom: '15px', color: '#3D2817' }}>📈 توزيع الحيوانات حسب النوع</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '15px' }}>
            {Object.keys(animals).map(type => {
              const ta = animals[type] || {};
              return (
                <div key={type} style={{ background: 'white', padding: '15px', borderRadius: '8px', border: '2px solid #ddd' }}>
                  <h3 style={{ color: '#3D2817', marginBottom: '10px' }}>{type === 'sheep' ? '🐑 الضان' : type === 'goat' ? '🐐 الماعز' : `🐄 ${type}`}</h3>
                  <div style={{ fontSize: '13px', lineHeight: '1.8', color: '#555' }}>
                    <div>📊 الإجمالي: <strong>{Object.keys(ta).length}</strong></div>
                    <div>✓ النشطة: <strong style={{ color: '#27ae60' }}>{Object.values(ta).filter(a => a.status === 'active').length}</strong></div>
                    <div>⚠️ المريضة: <strong style={{ color: '#e74c3c' }}>{Object.values(ta).filter(a => a.healthStatus === 'sick').length}</strong></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // الصفحة الرئيسية
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', minHeight: '100vh', background: '#f9f7f4' }}>
      <style>{`* { margin: 0; padding: 0; box-sizing: border-box; } html, body { font-family: 'Segoe UI', Arial, sans-serif; direction: rtl; }`}</style>

      {/* Sidebar */}
      <div style={{ background: 'linear-gradient(180deg, #5D4E37 0%, #3D2817 100%)', padding: '25px 15px', height: '100vh', overflowY: 'auto', position: 'fixed', width: '260px', left: 0, top: 0, zIndex: 100 }}>
        <div style={{ color: '#F5D547', fontSize: '26px', fontWeight: 'bold', marginBottom: '30px', textAlign: 'center' }}>🐑 FarmHub</div>
        <p style={{ color: '#E8D5C4', fontSize: '12px', textAlign: 'center', marginBottom: '5px' }}>مرحباً {user.name}</p>
        <p style={{ color: '#F5D547', fontSize: '11px', textAlign: 'center', marginBottom: '10px', background: user.role === 'admin' ? '#8B6F47' : 'transparent', padding: '5px', borderRadius: '4px' }}>
          {user.role === 'admin' ? '👑 مشرف' : '👤 مستخدم'}
        </p>
        <p style={{ color: '#E8D5C4', fontSize: '11px', textAlign: 'center', marginBottom: '20px', background: '#5D4E37', padding: '8px', borderRadius: '4px', fontWeight: 'bold' }}>
          {selectedAnimalType === 'sheep' ? '🐑 الضان' : selectedAnimalType === 'goat' ? '🐐 الماعز' : selectedAnimalType}
        </p>
        <button onClick={() => setShowDashboard(true)} style={{ width: '100%', padding: '10px', background: '#27ae60', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold', marginBottom: '10px' }}>📊 ملخص الإحصائيات</button>
        <button onClick={() => setSelectedAnimalType(null)} style={{ width: '100%', padding: '10px', background: '#F5D547', color: '#3D2817', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold', marginBottom: '20px' }}>↩️ تغيير النوع</button>
        <div style={{ borderTop: '1px solid #8B6F47', paddingTop: '15px' }}>
          <button onClick={() => setShowChangePassword(true)} style={{ width: '100%', padding: '10px', background: '#F5D547', color: '#3D2817', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold', marginBottom: '10px' }}>🔐 تغيير المرور</button>
          {user.role === 'admin' && (
            <button onClick={() => setShowAdminPanel(true)} style={{ width: '100%', padding: '10px', background: '#27ae60', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold', marginBottom: '10px' }}>👑 إدارة المستخدمين</button>
          )}
          <button onClick={handleLogout} style={{ width: '100%', padding: '10px', color: '#e74c3c', background: 'transparent', border: '1px solid #e74c3c', cursor: 'pointer', borderRadius: '6px', fontSize: '12px', fontWeight: '600' }}>تسجيل الخروج</button>
        </div>
      </div>

      {/* المحتوى الرئيسي */}
      <div style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, marginLeft: '260px', overflowY: 'auto', background: '#f9f7f4', padding: '30px' }}>
        <h1 style={{ marginBottom: '20px', color: '#3D2817' }}>
          {selectedAnimalType === 'sheep' ? '🐑 إدارة الضان' : selectedAnimalType === 'goat' ? '🐐 إدارة الماعز' : `🐄 إدارة ${selectedAnimalType}`}
        </h1>

        {/* الإحصائيات */}
        <div style={{ background: 'white', padding: '20px', borderRadius: '8px', marginBottom: '20px', fontWeight: 'bold', color: '#3D2817', fontSize: '14px', lineHeight: '2', display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
          <span>🐑 الإجمالي: {typeCount.total}</span>
          <span style={{ color: '#27ae60' }}>✓ النشطة: {typeCount.active}</span>
          <span style={{ color: '#e74c3c' }}>⚠️ المريضة: {typeCount.sick}</span>
          <span style={{ color: '#3498db' }}>💰 المباع: {typeCount.sold}</span>
          <span style={{ color: '#2980b9' }}>❄️ الثلاجة: {typeCount.freezer}</span>
        </div>

        <button
          onClick={() => { setAnimalForm(EMPTY_FORM); setEditingId(null); setShowModal(true); }}
          style={{ marginBottom: '20px', background: '#8B6F47', color: 'white', border: 'none', padding: '12px 20px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px' }}
        >
          ➕ إضافة حيوان
        </button>

        {/* الجدول */}
        <div style={{ overflowX: 'auto', background: 'white', borderRadius: '8px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
            <thead>
              <tr style={{ background: '#f0f0f0', borderBottom: '2px solid #ddd' }}>
                {['الرقم', 'الجنس', 'العمر', 'الحالة', 'الصحة', 'ملاحظات', 'الإجراءات'].map(h => (
                  <th key={h} style={{ padding: '12px', textAlign: 'right', fontWeight: 'bold' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sortedAnimals.map(animal => {
                const notes = animal.healthNotes || animal.notes || '-';
                return (
                  <tr key={animal.id} style={{ borderBottom: '1px solid #eee', background: getTypeColor(selectedAnimalType) }}>
                    <td style={{ padding: '10px', fontWeight: 'bold', color: getTypeTextColor(selectedAnimalType) }}>{animal.number}</td>
                    <td style={{ padding: '10px' }}>{animal.gender === 'male' ? '🐏 ذكر' : '🐑 أنثى'}</td>
                    <td style={{ padding: '10px' }}>{formatAge(animal.birthDate)}</td>
                    <td style={{ padding: '10px', color: animal.status === 'active' ? '#27ae60' : '#e74c3c', fontWeight: 'bold' }}>
                      {animal.status === 'active' ? '✓ نشط' : animal.status === 'sold' ? '💰 مباع' : '🔪 مذبوح'}
                    </td>
                    <td style={{ padding: '10px', color: animal.healthStatus === 'healthy' ? '#27ae60' : '#e74c3c', fontWeight: 'bold' }}>
                      {animal.healthStatus === 'healthy' ? '✓ سليمة' : '⚠️ مريضة'}
                    </td>
                    <td style={{ padding: '10px', fontSize: '11px', maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis' }} title={notes}>
                      {notes.length > 20 ? notes.substring(0, 20) + '...' : notes}
                    </td>
                    <td style={{ padding: '10px', whiteSpace: 'nowrap' }}>
                      <button onClick={() => { setSelectedAnimal(animal); setShowDetailModal(true); }} style={{ marginRight: '5px', background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px' }}>👁️</button>
                      <button onClick={() => handleEditAnimal(animal.id)} style={{ marginRight: '5px', background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px' }}>✏️</button>
                      <button onClick={() => handleDeleteAnimal(animal.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px' }}>🗑️</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {sortedAnimals.length === 0 && (
            <div style={{ padding: '40px', textAlign: 'center', color: '#999' }}>لا توجد حيوانات مسجلة</div>
          )}
        </div>
      </div>

      {/* Modal التسجيل */}
      {showModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '20px' }} onClick={() => setShowModal(false)}>
          <div style={{ background: 'white', padding: '30px', borderRadius: '12px', maxWidth: '700px', width: '100%', maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
            <h2 style={{ color: '#3D2817', marginBottom: '20px' }}>{editingId ? 'تعديل حيوان' : 'تسجيل حيوان جديد'}</h2>
            <form onSubmit={handleSaveAnimal} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                <div>
                  <label style={{ fontSize: '13px', fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>الرقم *</label>
                  <input type="text" value={animalForm.number} onChange={(e) => handleAnimalChange('number', e.target.value)} style={{ padding: '8px', border: '1px solid #ddd', borderRadius: '6px', width: '100%' }} required />
                </div>
                <div>
                  <label style={{ fontSize: '13px', fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>الجنس</label>
                  <select value={animalForm.gender} onChange={(e) => handleAnimalChange('gender', e.target.value)} style={{ padding: '8px', border: '1px solid #ddd', borderRadius: '6px', width: '100%' }}>
                    <option value="female">أنثى</option>
                    <option value="male">ذكر</option>
                  </select>
                </div>
              </div>
              <div>
                <label style={{ fontSize: '13px', fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>تاريخ الميلاد *</label>
                <input type="date" value={animalForm.birthDate} onChange={(e) => handleAnimalChange('birthDate', e.target.value)} style={{ padding: '8px', border: '1px solid #ddd', borderRadius: '6px', width: '100%' }} required />
              </div>
              {animalForm.gender === 'female' && (
                <div>
                  <label style={{ fontSize: '13px', fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>عدد الأبناء</label>
                  <input type="number" min="0" value={animalForm.offspringCount} onChange={(e) => handleAnimalChange('offspringCount', parseInt(e.target.value) || 0)} style={{ padding: '8px', border: '1px solid #ddd', borderRadius: '6px', width: '100%' }} />
                </div>
              )}
              <div>
                <label style={{ fontSize: '13px', fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>الحالة الصحية</label>
                <select value={animalForm.healthStatus} onChange={(e) => handleAnimalChange('healthStatus', e.target.value)} style={{ padding: '8px', border: '1px solid #ddd', borderRadius: '6px', width: '100%' }}>
                  <option value="healthy">سليمة</option>
                  <option value="sick">مريضة</option>
                </select>
              </div>
              {animalForm.healthStatus === 'sick' && (
                <div>
                  <label style={{ fontSize: '13px', fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>وصف المشكلة الصحية</label>
                  <textarea value={animalForm.healthNotes} onChange={(e) => handleAnimalChange('healthNotes', e.target.value)} placeholder="مثال: إسهال، عرج، حمى..." style={{ padding: '8px', border: '1px solid #ddd', borderRadius: '6px', width: '100%', minHeight: '80px', resize: 'vertical', fontFamily: 'inherit' }} />
                </div>
              )}
              <div>
                <label style={{ fontSize: '13px', fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>حالة الحيوان</label>
                <select value={animalForm.status} onChange={(e) => handleAnimalChange('status', e.target.value)} style={{ padding: '8px', border: '1px solid #ddd', borderRadius: '6px', width: '100%' }}>
                  <option value="active">نشط</option>
                  <option value="sold">مباع</option>
                  <option value="slaughtered">مذبوح</option>
                </select>
              </div>
              {animalForm.status === 'sold' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                  <div>
                    <label style={{ fontSize: '13px', fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>تاريخ البيع</label>
                    <input type="date" value={animalForm.saleDate} onChange={(e) => handleAnimalChange('saleDate', e.target.value)} style={{ padding: '8px', border: '1px solid #ddd', borderRadius: '6px', width: '100%' }} />
                  </div>
                  <div>
                    <label style={{ fontSize: '13px', fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>السعر (ريال)</label>
                    <input type="number" value={animalForm.salePrice} onChange={(e) => handleAnimalChange('salePrice', e.target.value)} style={{ padding: '8px', border: '1px solid #ddd', borderRadius: '6px', width: '100%' }} />
                  </div>
                </div>
              )}
              {animalForm.status === 'slaughtered' && (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                    <div>
                      <label style={{ fontSize: '13px', fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>تاريخ الذبح</label>
                      <input type="date" value={animalForm.slaughterDate} onChange={(e) => handleAnimalChange('slaughterDate', e.target.value)} style={{ padding: '8px', border: '1px solid #ddd', borderRadius: '6px', width: '100%' }} />
                    </div>
                    <div>
                      <label style={{ fontSize: '13px', fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>نوع الذبح</label>
                      <select value={animalForm.slaughterType} onChange={(e) => handleAnimalChange('slaughterType', e.target.value)} style={{ padding: '8px', border: '1px solid #ddd', borderRadius: '6px', width: '100%' }}>
                        <option value="regular">عادي</option>
                        <option value="charity">صدقة</option>
                      </select>
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                    <div>
                      <label style={{ fontSize: '13px', fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>مكان الذبح</label>
                      <select value={animalForm.slaughterLocation} onChange={(e) => handleAnimalChange('slaughterLocation', e.target.value)} style={{ padding: '8px', border: '1px solid #ddd', borderRadius: '6px', width: '100%' }}>
                        <option value="">اختر</option>
                        <option value="freezer">ثلاجة</option>
                        <option value="guest">ضيف</option>
                      </select>
                    </div>
                    <div>
                      <label style={{ fontSize: '13px', fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>ملاحظات الذبح</label>
                      <input type="text" value={animalForm.slaughterNotes} onChange={(e) => handleAnimalChange('slaughterNotes', e.target.value)} style={{ padding: '8px', border: '1px solid #ddd', borderRadius: '6px', width: '100%' }} />
                    </div>
                  </div>
                </>
              )}
              <div>
                <label style={{ fontSize: '13px', fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>ملاحظات عامة</label>
                <textarea value={animalForm.notes} onChange={(e) => handleAnimalChange('notes', e.target.value)} placeholder="أي ملاحظات إضافية..." style={{ padding: '8px', border: '1px solid #ddd', borderRadius: '6px', width: '100%', minHeight: '80px', resize: 'vertical', fontFamily: 'inherit' }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginTop: '20px' }}>
                <button type="submit" style={{ background: '#8B6F47', color: 'white', border: 'none', padding: '12px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px' }}>✓ حفظ</button>
                <button type="button" onClick={() => setShowModal(false)} style={{ background: '#ddd', color: '#333', border: 'none', padding: '12px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px' }}>إلغاء</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal التفاصيل */}
      {showDetailModal && selectedAnimal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '20px' }} onClick={() => setShowDetailModal(false)}>
          <div style={{ background: 'white', padding: '30px', borderRadius: '12px', maxWidth: '500px', width: '100%', maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
            <h2 style={{ color: '#3D2817', marginBottom: '20px' }}>📋 تفاصيل الحيوان #{selectedAnimal.number}</h2>
            {selectedAnimal.healthNotes && (
              <div style={{ background: '#ffe8e8', padding: '15px', borderRadius: '8px', marginBottom: '15px' }}>
                <h3 style={{ color: '#e74c3c', marginBottom: '10px', fontSize: '14px' }}>⚠️ المشاكل الصحية:</h3>
                <p style={{ whiteSpace: 'pre-wrap', color: '#333', fontSize: '13px', lineHeight: '1.6' }}>{selectedAnimal.healthNotes}</p>
              </div>
            )}
            {selectedAnimal.notes && (
              <div style={{ background: '#f0f9f3', padding: '15px', borderRadius: '8px', marginBottom: '15px' }}>
                <h3 style={{ color: '#228B22', marginBottom: '10px', fontSize: '14px' }}>📝 الملاحظات:</h3>
                <p style={{ whiteSpace: 'pre-wrap', color: '#333', fontSize: '13px', lineHeight: '1.6' }}>{selectedAnimal.notes}</p>
              </div>
            )}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', padding: '15px 0', borderTop: '1px solid #ddd', marginBottom: '15px' }}>
              <div><span style={{ fontSize: '12px', color: '#999' }}>الجنس:</span><div style={{ fontSize: '14px', fontWeight: 'bold' }}>{selectedAnimal.gender === 'male' ? '🐏 ذكر' : '🐑 أنثى'}</div></div>
              <div><span style={{ fontSize: '12px', color: '#999' }}>العمر:</span><div style={{ fontSize: '14px', fontWeight: 'bold' }}>{formatAge(selectedAnimal.birthDate)}</div></div>
              <div><span style={{ fontSize: '12px', color: '#999' }}>الحالة:</span><div style={{ fontSize: '14px', fontWeight: 'bold', color: selectedAnimal.status === 'active' ? '#27ae60' : '#e74c3c' }}>{selectedAnimal.status === 'active' ? '✓ نشط' : selectedAnimal.status === 'sold' ? '💰 مباع' : '🔪 مذبوح'}</div></div>
              <div><span style={{ fontSize: '12px', color: '#999' }}>الصحة:</span><div style={{ fontSize: '14px', fontWeight: 'bold', color: selectedAnimal.healthStatus === 'healthy' ? '#27ae60' : '#e74c3c' }}>{selectedAnimal.healthStatus === 'healthy' ? '✓ سليمة' : '⚠️ مريضة'}</div></div>
            </div>
            <button onClick={() => setShowDetailModal(false)} style={{ width: '100%', background: '#8B6F47', color: 'white', border: 'none', padding: '12px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>إغلاق</button>
          </div>
        </div>
      )}

      {/* Modal تغيير كلمة المرور */}
      {showChangePassword && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }} onClick={() => setShowChangePassword(false)}>
          <div style={{ background: 'white', padding: '30px', borderRadius: '12px', maxWidth: '400px', width: '90%' }} onClick={e => e.stopPropagation()}>
            <h2 style={{ color: '#3D2817', marginBottom: '20px' }}>🔐 تغيير كلمة المرور</h2>
            {passwordError && <div style={{ color: '#e74c3c', background: '#ffe8e8', padding: '12px', borderRadius: '6px', fontSize: '13px', marginBottom: '15px' }}>{passwordError}</div>}
            <form onSubmit={handleChangePassword} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <div><label style={{ fontSize: '13px', fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>كلمة المرور القديمة</label><input type="password" value={passwordData.old} onChange={(e) => setPasswordData(p => ({ ...p, old: e.target.value }))} style={{ padding: '8px', border: '1px solid #ddd', borderRadius: '6px', width: '100%' }} required /></div>
              <div><label style={{ fontSize: '13px', fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>كلمة المرور الجديدة</label><input type="password" value={passwordData.new} onChange={(e) => setPasswordData(p => ({ ...p, new: e.target.value }))} style={{ padding: '8px', border: '1px solid #ddd', borderRadius: '6px', width: '100%' }} required /></div>
              <div><label style={{ fontSize: '13px', fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>تأكيد كلمة المرور</label><input type="password" value={passwordData.confirm} onChange={(e) => setPasswordData(p => ({ ...p, confirm: e.target.value }))} style={{ padding: '8px', border: '1px solid #ddd', borderRadius: '6px', width: '100%' }} required /></div>
              <button type="submit" style={{ background: '#8B6F47', color: 'white', border: 'none', padding: '10px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>تحديث المرور</button>
            </form>
          </div>
        </div>
      )}

      {/* Modal إدارة المستخدمين */}
      {showAdminPanel && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '20px' }} onClick={() => setShowAdminPanel(false)}>
          <div style={{ background: 'white', padding: '30px', borderRadius: '12px', maxWidth: '500px', width: '100%' }} onClick={e => e.stopPropagation()}>
            <h2 style={{ color: '#3D2817', marginBottom: '20px' }}>👑 إدارة المستخدمين</h2>
            {adminPanelError && <div style={{ color: adminPanelError.includes('✓') ? '#27ae60' : '#e74c3c', background: adminPanelError.includes('✓') ? '#e8f8f5' : '#ffe8e8', padding: '12px', borderRadius: '6px', fontSize: '13px', marginBottom: '15px', whiteSpace: 'pre-line' }}>{adminPanelError}</div>}
            <form onSubmit={handleAddAdmin} style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px', padding: '15px', background: '#f9f7f4', borderRadius: '8px' }}>
              <h3 style={{ color: '#3D2817', fontSize: '14px' }}>➕ إضافة مشرف جديد</h3>
              <input type="email" placeholder="البريد الإلكتروني" value={newAdminEmail} onChange={(e) => setNewAdminEmail(e.target.value)} style={{ padding: '8px', border: '1px solid #ddd', borderRadius: '6px' }} required />
              <button type="submit" style={{ background: '#27ae60', color: 'white', border: 'none', padding: '10px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>إضافة مشرف</button>
            </form>
            <button onClick={() => setShowAdminPanel(false)} style={{ width: '100%', background: '#8B6F47', color: 'white', border: 'none', padding: '10px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>إغلاق</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;

    
