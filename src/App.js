    import React, { useState, useEffect, useCallback, useMemo } from 'react';

// Firebase fallback with localStorage sync
const getStorageKey = (userId, type) => `farm_${userId}_${type}`;

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

const App = () => {
  const [user, setUser] = useState(null);
  const [selectedAnimalType, setSelectedAnimalType] = useState(null);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [passwordData, setPasswordData] = useState({ old: '', new: '', confirm: '' });
  const [passwordError, setPasswordError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedAnimal, setSelectedAnimal] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [animals, setAnimals] = useState({});
  const [showSaveConfirm, setShowSaveConfirm] = useState(false);
  const [filterType, setFilterType] = useState('all'); // Filter for viewing
  
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [adminPanelError, setAdminPanelError] = useState('');

  const [animalForm, setAnimalForm] = useState({
    number: '', gender: 'female', birthDate: new Date().toISOString().split('T')[0],
    status: 'active', notes: '', offspringCount: 0, healthStatus: 'healthy', healthNotes: '',
    saleDate: '', salePrice: '', slaughterDate: '', slaughterType: 'regular',
    slaughterLocation: '', slaughterNotes: '', deathDate: ''
  });

  const [allUsers, setAllUsers] = useState(() => {
    const saved = localStorage.getItem('allUsers');
    return saved ? JSON.parse(saved) : DEFAULT_ADMIN;
  });

  useEffect(() => {
    localStorage.setItem('allUsers', JSON.stringify(allUsers));
  }, [allUsers]);

  // التحميل الأولي
  useEffect(() => {
    const saved = localStorage.getItem('sheepFarmUser');
    if (saved) {
      const userData = JSON.parse(saved);
      setUser(userData);
      
      const savedType = localStorage.getItem(`selectedType_${userData.id}`);
      const typeToUse = savedType || 'sheep';
      setSelectedAnimalType(typeToUse);
      
      const savedAnimals = localStorage.getItem(getStorageKey(userData.id, typeToUse));
      if (savedAnimals) {
        try {
          setAnimals(JSON.parse(savedAnimals));
        } catch (e) {
          console.log('Error loading animals:', e);
        }
      }
    }
  }, []);

  // حفظ البيانات في localStorage عند التغيير
  useEffect(() => {
    if (user && selectedAnimalType && animals[selectedAnimalType]) {
      localStorage.setItem(getStorageKey(user.id, selectedAnimalType), JSON.stringify(animals[selectedAnimalType]));
    }
  }, [animals, user, selectedAnimalType]);

  // تحميل البيانات عند تغيير النوع المختار
  useEffect(() => {
    if (user && selectedAnimalType) {
      const savedAnimals = localStorage.getItem(getStorageKey(user.id, selectedAnimalType));
      if (savedAnimals) {
        try {
          const parsed = JSON.parse(savedAnimals);
          setAnimals(prev => ({ ...prev, [selectedAnimalType]: parsed }));
        } catch (e) {
          console.error('Error parsing animals:', e);
          setAnimals(prev => ({ ...prev, [selectedAnimalType]: {} }));
        }
      } else {
        setAnimals(prev => ({ ...prev, [selectedAnimalType]: {} }));
      }
    }
  }, [user, selectedAnimalType]);




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
    
    for (const userData of Object.values(allUsers)) {
      if (userData.emails.includes(emailLower)) {
        setAdminPanelError('هذا البريد مسجل بالفعل!');
        return;
      }
    }

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
  };

  const handleLogout = () => {
    localStorage.removeItem('sheepFarmUser');
    setUser(null);
    setSelectedAnimalType(null);
    setShowChangePassword(false);
    setShowAdminPanel(false);
  };

  const handleAnimalChange = useCallback((f, v) => {
    setAnimalForm(p => ({ ...p, [f]: v }));
  }, []);

  const handleAddAnimal = () => {
    if (!animalForm.number || !animalForm.birthDate) return alert('ملء البيانات');
    
    const animalId = editingId || `${selectedAnimalType}-${Date.now()}`;
    const updated = { ...animals };
    if (!updated[selectedAnimalType]) updated[selectedAnimalType] = {};
    updated[selectedAnimalType][animalId] = animalForm;
    
    setAnimals(updated);
    setShowModal(false);
    setShowSaveConfirm(false);
    setAnimalForm({ number: '', gender: 'female', birthDate: new Date().toISOString().split('T')[0], status: 'active', notes: '', offspringCount: 0, healthStatus: 'healthy', healthNotes: '', saleDate: '', salePrice: '', slaughterDate: '', slaughterType: 'regular', slaughterLocation: '', slaughterNotes: '', deathDate: '' });
    setEditingId(null);
    alert('✓ تم الحفظ بنجاح!');
  };


  const handleDeleteAnimal = (id) => {
    if (!window.confirm('هل تريد حذف هذا الحيوان؟')) return;
    const updated = { ...animals };
    delete updated[selectedAnimalType][id];
    setAnimals(updated);
  };

  const handleEditAnimal = (id) => {
    const item = animals[selectedAnimalType]?.[id];
    if (item) {
      setAnimalForm(item);
      setEditingId(id);
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
    let allAnimals = [];
    
    // جمع جميع الحيوانات من جميع الأنواع
    Object.entries(animals).forEach(([type, typeAnimals]) => {
      if (typeAnimals && typeof typeAnimals === 'object') {
        Object.entries(typeAnimals).forEach(([id, data]) => {
          allAnimals.push({ id, type, ...data });
        });
      }
    });
    
    // تصفية حسب النوع المختار
    if (filterType !== 'all') {
      allAnimals = allAnimals.filter(a => a.type === filterType);
    }
    
    // ترتيب حسب الرقم
    return allAnimals.sort((a, b) => parseInt(a.number) - parseInt(b.number));
  }, [animals, filterType]);

  const typeCount = useMemo(() => {
    let allAnimals = [];
    
    // جمع جميع الحيوانات
    Object.entries(animals).forEach(([type, typeAnimals]) => {
      if (typeAnimals && typeof typeAnimals === 'object') {
        Object.entries(typeAnimals).forEach(([id, data]) => {
          allAnimals.push({ ...data });
        });
      }
    });
    
    const total = allAnimals.length;
    const active = allAnimals.filter(a => a.status === 'active').length;
    const sick = allAnimals.filter(a => a.healthStatus === 'sick').length;
    const sold = allAnimals.filter(a => a.status === 'sold').length;
    const freezer = allAnimals.filter(a => a.status === 'freezer').length;
    
    return {
      total,
      active,
      productive: 0,
      sick,
      dead: 0,
      sold,
      charity: 0,
      freezer,
    };
  }, [animals]);

  // شاشة اختيار النوع
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
          جميع الحيوانات 🐄
        </p>

        <div style={{ borderTop: '1px solid #8B6F47', paddingTop: '15px' }}>
          <button onClick={() => setShowChangePassword(true)} style={{ width: '100%', padding: '10px', background: '#F5D547', color: '#3D2817', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold', marginBottom: '10px' }}>
            🔐 تغيير المرور
          </button>
          
          {user.role === 'admin' && (
            <button onClick={() => setShowAdminPanel(true)} style={{ width: '100%', padding: '10px', background: '#27ae60', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold', marginBottom: '10px' }}>
              👑 إدارة المستخدمين
            </button>
          )}
          
          <button onClick={handleLogout} style={{ width: '100%', padding: '10px', color: '#e74c3c', background: 'transparent', border: '1px solid #e74c3c', cursor: 'pointer', borderRadius: '6px', fontSize: '12px', fontWeight: '600' }}>
            تسجيل الخروج
          </button>
        </div>
      </div>

      {/* المحتوى الرئيسي */}
      <div style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, marginLeft: '260px', overflowY: 'auto', background: '#f9f7f4', padding: '30px', display: 'flex', flexDirection: 'column' }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h1 style={{ color: '#3D2817', margin: 0 }}>🐄 إدارة جميع الحيوانات</h1>
            <select 
              value={filterType} 
              onChange={(e) => setFilterType(e.target.value)}
              style={{ padding: '8px 12px', border: '1px solid #ddd', borderRadius: '6px', background: 'white', cursor: 'pointer', fontSize: '13px', fontWeight: 'bold', color: '#3D2817' }}
            >
              <option value="all">📊 الكل</option>
              {Object.keys(animals).map(type => (
                <option key={type} value={type}>
                  {type === 'sheep' ? '🐑 الضان' : type === 'goat' ? '🐐 الماعز' : `🐄 ${type}`}
                </option>
              ))}
            </select>
          </div>

          {/* الإحصائيات */}
          <div style={{ background: 'white', padding: '20px', borderRadius: '8px', marginBottom: '20px', fontWeight: 'bold', color: '#3D2817', fontSize: '14px', lineHeight: '2' }}>
            <div>🐑 <span style={{ color: '#3D2817' }}>الإجمالي: {typeCount.total}</span></div>
            <div>✓ <span style={{ color: '#27ae60' }}>النشطة: {typeCount.active}</span></div>
            <div>⚠️ <span style={{ color: '#e74c3c' }}>المريضة: {typeCount.sick}</span></div>
            <div>💰 <span style={{ color: '#3498db' }}>المباع: {typeCount.sold}</span></div>
            <div>❄️ <span style={{ color: '#2980b9' }}>الثلاجة: {typeCount.freezer}</span></div>
          </div>

          <button
            onClick={() => { setAnimalForm({ number: '', gender: 'female', birthDate: new Date().toISOString().split('T')[0], status: 'active', notes: '', offspringCount: 0, healthStatus: 'healthy', healthNotes: '', saleDate: '', salePrice: '', slaughterDate: '', slaughterType: 'regular', slaughterLocation: '', slaughterNotes: '', deathDate: '' }); setEditingId(null); setShowModal(true); }}
            style={{ marginBottom: '20px', background: '#8B6F47', color: 'white', border: 'none', padding: '12px 20px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px' }}
          >
            ➕ إضافة حيوان
          </button>

          {/* الجدول */}
          <div style={{ overflowX: 'auto', background: 'white', borderRadius: '8px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
              <thead>
                <tr style={{ background: '#f0f0f0', borderBottom: '2px solid #ddd' }}>
                  <th style={{ padding: '12px', textAlign: 'right', fontWeight: 'bold' }}>النوع</th>
                  <th style={{ padding: '12px', textAlign: 'right', fontWeight: 'bold' }}>الرقم</th>
                  <th style={{ padding: '12px', textAlign: 'right', fontWeight: 'bold' }}>الجنس</th>
                  <th style={{ padding: '12px', textAlign: 'right', fontWeight: 'bold' }}>العمر</th>
                  <th style={{ padding: '12px', textAlign: 'right', fontWeight: 'bold' }}>الحالة</th>
                  <th style={{ padding: '12px', textAlign: 'right', fontWeight: 'bold' }}>الصحة</th>
                  <th style={{ padding: '12px', textAlign: 'right', fontWeight: 'bold' }}>ملاحظات</th>
                  <th style={{ padding: '12px', textAlign: 'right', fontWeight: 'bold' }}>الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {sortedAnimals.map(animal => {
                  const statusColor = getTypeColor(animal.type);
                  const notes = animal.healthNotes || animal.notes || '-';
                  const notesShort = notes.length > 20 ? notes.substring(0, 20) + '...' : notes;
                  
                  return (
                    <tr key={animal.id} style={{ borderBottom: '1px solid #eee', background: statusColor }}>
                      <td style={{ padding: '10px', fontWeight: 'bold', color: getTypeTextColor(animal.type) }}>
                        {animal.type === 'sheep' ? '🐑 الضان' : animal.type === 'goat' ? '🐐 الماعز' : `🐄 ${animal.type}`}
                      </td>
                      <td style={{ padding: '10px', fontWeight: 'bold', color: getTypeTextColor(animal.type) }}>{animal.number}</td>
                      <td style={{ padding: '10px' }}>{animal.gender === 'male' ? '🐏 ذكر' : '🐑 أنثى'}</td>
                      <td style={{ padding: '10px' }}>{formatAge(animal.birthDate)}</td>
                      <td style={{ padding: '10px', color: animal.status === 'active' ? '#27ae60' : '#e74c3c', fontWeight: 'bold' }}>
                        {animal.status === 'active' ? '✓ نشط' : animal.status === 'sold' ? '💰 مباع' : '🔪 مذبوح'}
                      </td>
                      <td style={{ padding: '10px', color: animal.healthStatus === 'healthy' ? '#27ae60' : '#e74c3c', fontWeight: 'bold' }}>
                        {animal.healthStatus === 'healthy' ? '✓ سليمة' : '⚠️ مريضة'}
                      </td>
                      <td style={{ padding: '10px', fontSize: '11px', maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', cursor: 'pointer' }} title={notes}>
                        {notesShort}
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
      </div>

      {/* Modal التسجيل */}
      {showModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '20px' }} onClick={() => setShowModal(false)}>
          <div style={{ background: 'white', padding: '30px', borderRadius: '12px', maxWidth: '700px', width: '100%', maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
            <h2 style={{ color: '#3D2817', marginBottom: '20px' }}>تسجيل حيوان جديد</h2>
            
            <form onSubmit={(e) => { e.preventDefault(); setShowSaveConfirm(true); }} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
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
                <button type="submit" style={{ background: '#8B6F47', color: 'white', border: 'none', padding: '12px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px' }}>
                  ✓ حفظ
                </button>
                <button type="button" onClick={() => setShowModal(false)} style={{ background: '#ddd', color: '#333', border: 'none', padding: '12px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px' }}>
                  إلغاء
                </button>
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

            {selectedAnimal.slaughterNotes && (
              <div style={{ background: '#e8e8e8', padding: '15px', borderRadius: '8px', marginBottom: '15px' }}>
                <h3 style={{ color: '#333', marginBottom: '10px', fontSize: '14px' }}>🔪 ملاحظات الذبح:</h3>
                <p style={{ color: '#333', fontSize: '13px' }}>{selectedAnimal.slaughterNotes}</p>
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', padding: '15px 0', borderTop: '1px solid #ddd', marginBottom: '15px' }}>
              <div>
                <span style={{ fontSize: '12px', color: '#999' }}>الجنس:</span>
                <div style={{ fontSize: '14px', fontWeight: 'bold' }}>{selectedAnimal.gender === 'male' ? '🐏 ذكر' : '🐑 أنثى'}</div>
              </div>
              <div>
                <span style={{ fontSize: '12px', color: '#999' }}>العمر:</span>
                <div style={{ fontSize: '14px', fontWeight: 'bold' }}>{formatAge(selectedAnimal.birthDate)}</div>
              </div>
              <div>
                <span style={{ fontSize: '12px', color: '#999' }}>الحالة:</span>
                <div style={{ fontSize: '14px', fontWeight: 'bold', color: selectedAnimal.status === 'active' ? '#27ae60' : '#e74c3c' }}>
                  {selectedAnimal.status === 'active' ? '✓ نشط' : selectedAnimal.status === 'sold' ? '💰 مباع' : '🔪 مذبوح'}
                </div>
              </div>
              <div>
                <span style={{ fontSize: '12px', color: '#999' }}>الصحة:</span>
                <div style={{ fontSize: '14px', fontWeight: 'bold', color: selectedAnimal.healthStatus === 'healthy' ? '#27ae60' : '#e74c3c' }}>
                  {selectedAnimal.healthStatus === 'healthy' ? '✓ سليمة' : '⚠️ مريضة'}
                </div>
              </div>
            </div>

            <button onClick={() => setShowDetailModal(false)} style={{ width: '100%', background: '#8B6F47', color: 'white', border: 'none', padding: '12px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>
              إغلاق
            </button>
          </div>
        </div>
      )}

      {/* Modal تأكيد الحفظ */}
      {showSaveConfirm && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 2000 }} onClick={() => setShowSaveConfirm(false)}>
          <div style={{ background: 'white', padding: '30px', borderRadius: '12px', maxWidth: '400px', width: '90%' }} onClick={e => e.stopPropagation()}>
            <h2 style={{ color: '#3D2817', marginBottom: '20px', fontSize: '16px' }}>✓ تأكيد الحفظ</h2>
            <p style={{ color: '#666', marginBottom: '25px', fontSize: '14px' }}>هل تريد حفظ التغييرات على الحيوان رقم {animalForm.number}؟</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
              <button onClick={handleAddAnimal} style={{ background: '#27ae60', color: 'white', border: 'none', padding: '12px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px' }}>
                نعم، احفظ
              </button>
              <button onClick={() => setShowSaveConfirm(false)} style={{ background: '#e74c3c', color: 'white', border: 'none', padding: '12px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px' }}>
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal تغيير كلمة المرور */}
      {showChangePassword && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }} onClick={() => setShowChangePassword(false)}>
          <div style={{ background: 'white', padding: '30px', borderRadius: '12px', maxWidth: '400px', width: '90%' }} onClick={e => e.stopPropagation()}>
            <h2 style={{ color: '#3D2817', marginBottom: '20px' }}>🔐 تغيير كلمة المرور</h2>
            
            {passwordError && <div style={{ color: passwordError.includes('✓') ? '#27ae60' : '#e74c3c', background: passwordError.includes('✓') ? '#e8f8f5' : '#ffe8e8', padding: '12px', borderRadius: '6px', fontSize: '13px', marginBottom: '15px' }}>{passwordError}</div>}
            
            <form onSubmit={handleChangePassword} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <div>
                <label style={{ fontSize: '13px', fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>كلمة المرور القديمة</label>
                <input type="password" value={passwordData.old} onChange={(e) => setPasswordData(p => ({ ...p, old: e.target.value }))} style={{ padding: '8px', border: '1px solid #ddd', borderRadius: '6px', width: '100%' }} required />
              </div>
              <div>
                <label style={{ fontSize: '13px', fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>كلمة المرور الجديدة</label>
                <input type="password" value={passwordData.new} onChange={(e) => setPasswordData(p => ({ ...p, new: e.target.value }))} style={{ padding: '8px', border: '1px solid #ddd', borderRadius: '6px', width: '100%' }} required />
              </div>
              <div>
                <label style={{ fontSize: '13px', fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>تأكيد كلمة المرور</label>
                <input type="password" value={passwordData.confirm} onChange={(e) => setPasswordData(p => ({ ...p, confirm: e.target.value }))} style={{ padding: '8px', border: '1px solid #ddd', borderRadius: '6px', width: '100%' }} required />
              </div>
              <button type="submit" style={{ background: '#8B6F47', color: 'white', border: 'none', padding: '10px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>تحديث المرور</button>
            </form>
          </div>
        </div>
      )}

      {/* Modal إدارة المستخدمين */}
      {showAdminPanel && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '20px' }} onClick={() => setShowAdminPanel(false)}>
          <div style={{ background: 'white', padding: '30px', borderRadius: '12px', maxWidth: '500px', width: '100%', maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
            <h2 style={{ color: '#3D2817', marginBottom: '20px' }}>👑 إدارة المستخدمين</h2>
            
            {adminPanelError && <div style={{ color: adminPanelError.includes('✓') ? '#27ae60' : '#e74c3c', background: adminPanelError.includes('✓') ? '#e8f8f5' : '#ffe8e8', padding: '12px', borderRadius: '6px', fontSize: '13px', marginBottom: '15px', whiteSpace: 'pre-line' }}>{adminPanelError}</div>}
            
            <form onSubmit={handleAddAdmin} style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px', padding: '15px', background: '#f9f7f4', borderRadius: '8px' }}>
              <h3 style={{ color: '#3D2817', fontSize: '14px' }}>➕ إضافة مشرف جديد</h3>
              <input type="email" placeholder="البريد الإلكتروني" value={newAdminEmail} onChange={(e) => setNewAdminEmail(e.target.value)} style={{ padding: '8px', border: '1px solid #ddd', borderRadius: '6px' }} required />
              <button type="submit" style={{ background: '#27ae60', color: 'white', border: 'none', padding: '10px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>إضافة مشرف</button>
            </form>

            <button onClick={() => setShowAdminPanel(false)} style={{ width: '100%', background: '#8B6F47', color: 'white', border: 'none', padding: '10px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>
              إغلاق
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;

    
