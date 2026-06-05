    import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import { getDatabase, ref, set, onValue } from 'firebase/database';

// CSS للموبايل
const mobileCSS = `
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body { font-family: 'Segoe UI', Arial, sans-serif; direction: rtl; }
`;

const useIsMobile = () => {
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);
  return isMobile;
};

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
  if (age.years === 0 && age.months === 0) return 'جديد (أقل من شهر)';
  if (age.years === 0) return `${age.months} شهر`;
  if (age.months === 0) return `${age.years} سنة`;
  return `${age.years} سنة و ${age.months} شهر`;
};

const EMPTY_FORM = {
  number: '', gender: 'female', birthDate: new Date().toISOString().split('T')[0],
  status: 'active', notes: '', offspringCount: 0, healthStatus: 'healthy', healthNotes: '',
  purchasePrice: '', purchaseDate: '',
  saleDate: '', salePrice: '', slaughterDate: '', slaughterType: 'regular',
  slaughterLocation: '', slaughterNotes: '', deathDate: ''
};

const App = () => {
  const isMobile = useIsMobile();
  const [sidebarOpen, setSidebarOpen] = useState(false);
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
  const [showAgeReport, setShowAgeReport] = useState(false);
  const [ageReportFilter, setAgeReportFilter] = useState({ type: 'all', minYears: 5, minMonths: 0 });
  const [showNumbersReport, setShowNumbersReport] = useState(false);
  const [numbersReportType, setNumbersReportType] = useState('all');
  const [numbersReportFilter, setNumbersReportFilter] = useState('all');
  const [showBirthModal, setShowBirthModal] = useState(false);
  const [birthAnimal, setBirthAnimal] = useState(null);
  const [birthForm, setBirthForm] = useState({ date: new Date().toISOString().split('T')[0], count: 1, gender: 'mixed', notes: '' });
  const [showProductionReport, setShowProductionReport] = useState(false);
  const [productionReportType, setProductionReportType] = useState('all');
  const [showSalesReport, setShowSalesReport] = useState(false);
  const [salesReportTab, setSalesReportTab] = useState('sales');
  const [salesReportType, setSalesReportType] = useState('all');
  const [salesDateFrom, setSalesDateFrom] = useState('');
  const [salesDateTo, setSalesDateTo] = useState(new Date().toISOString().split('T')[0]);

  // ===== المكتبة البيطرية =====
  const [showVetLibrary, setShowVetLibrary] = useState(false);
  const [vetTab, setVetTab] = useState('inventory'); // inventory | treatments | experiences
  // مخزون الأدوية
  const [medicines, setMedicines] = useState(() => {
    const saved = localStorage.getItem('vetMedicines');
    return saved ? JSON.parse(saved) : [
      { id: 'm1', name: 'تايلوزين', boxes: 0, expiry: '', cost: 0, unit: 'علبة' },
      { id: 'm2', name: 'بي كمبلكس', boxes: 0, expiry: '', cost: 0, unit: 'علبة' },
      { id: 'm3', name: 'أبو ثور (مضاد حيوي)', boxes: 0, expiry: '', cost: 0, unit: 'علبة' },
      { id: 'm4', name: 'علاج الإسهال', boxes: 0, expiry: '', cost: 0, unit: 'علبة' },
      { id: 'm5', name: 'فيتامينات', boxes: 0, expiry: '', cost: 0, unit: 'علبة' },
      { id: 'm6', name: 'ملح معدني', boxes: 0, expiry: '', cost: 0, unit: 'كيس' },
    ];
  });
  const [showAddMedicine, setShowAddMedicine] = useState(false);
  const [editMedicineId, setEditMedicineId] = useState(null);
  const [medicineForm, setMedicineForm] = useState({ name: '', boxes: '', expiry: '', cost: '', unit: 'علبة' });
  // سجل العلاجات
  const [treatmentRecords, setTreatmentRecords] = useState(() => {
    const saved = localStorage.getItem('vetTreatments');
    return saved ? JSON.parse(saved) : [];
  });
  const [showAddTreatment, setShowAddTreatment] = useState(false);
  const [treatmentForm, setTreatmentForm] = useState({ animalNumber: '', animalType: 'sheep', date: new Date().toISOString().split('T')[0], medicine: '', dose: '', notes: '', result: 'pending' });
  // التجارب الناجحة
  const [experiences, setExperiences] = useState(() => {
    const saved = localStorage.getItem('vetExperiences');
    return saved ? JSON.parse(saved) : [];
  });
  const [showAddExperience, setShowAddExperience] = useState(false);
  const [editExperienceId, setEditExperienceId] = useState(null);
  const [experienceForm, setExperienceForm] = useState({ disease: '', symptoms: '', treatment: '', medicine: '', successRate: 90, notes: '' });
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
  // ✅ حساب تقرير العجائز/العويد
  // ✅ تقرير الأرقام
  const numbersReportData = useMemo(() => {
    const typesToSearch = numbersReportType === 'all' ? Object.keys(animals) : [numbersReportType];
    let all = [];
    typesToSearch.forEach(type => {
      const typeAnimals = animals[type] || {};
      Object.entries(typeAnimals).forEach(([id, data]) => {
        all.push({ id, type, ...data });
      });
    });
    all.sort((a, b) => parseInt(a.number) - parseInt(b.number));
    return {
      all,
      active: all.filter(a => a.status === 'active' || a.status === 'productive'),
      sold: all.filter(a => a.status === 'sold'),
      dead: all.filter(a => a.status === 'slaughtered' || a.status === 'dead'),
      reuse: all.filter(a => a.status === 'sold' || a.status === 'slaughtered' || a.status === 'dead'),
    };
  }, [animals, numbersReportType]);

  // ✅ إعادة تفعيل حيوان
  const handleReactivate = (animal) => {
    if (!window.confirm(`إعادة تفعيل الرقم ${animal.number}؟\nسيتم تغيير حالته إلى نشط.`)) return;
    const updatedAnimal = { ...animal, status: 'active', saleDate: '', salePrice: '', slaughterDate: '', slaughterNotes: '' };
    delete updatedAnimal.id;
    delete updatedAnimal.type;
    delete updatedAnimal.totalMonths;
    delete updatedAnimal.ageYears;
    delete updatedAnimal.ageMonths;
    saveAnimalToFirebase(user.id, animal.type, animal.id, updatedAnimal);
  };

  // ✅ حفظ سجل ولادة
  const handleSaveBirth = () => {
    if (!birthForm.date || !birthForm.count) { alert('أدخل التاريخ وعدد المواليد'); return; }
    const animal = animals[birthAnimal.type]?.[birthAnimal.id];
    if (!animal) return;
    const births = animal.births || {};
    const birthId = `birth_${Date.now()}`;
    const updatedAnimal = {
      ...animal,
      births: { ...births, [birthId]: { ...birthForm, count: parseInt(birthForm.count) } },
      offspringCount: (parseInt(animal.offspringCount) || 0) + parseInt(birthForm.count)
    };
    saveAnimalToFirebase(user.id, birthAnimal.type, birthAnimal.id, updatedAnimal);
    setShowBirthModal(false);
    setBirthForm({ date: new Date().toISOString().split('T')[0], count: 1, gender: 'mixed', notes: '' });
    alert('✓ تم تسجيل الولادة بنجاح!');
  };

  // ✅ حساب تقرير الإنتاج
  const productionReportData = useMemo(() => {
    const typesToSearch = productionReportType === 'all' ? Object.keys(animals) : [productionReportType];
    let result = [];
    typesToSearch.forEach(type => {
      const typeAnimals = animals[type] || {};
      Object.entries(typeAnimals).forEach(([id, data]) => {
        if (data.gender !== 'female') return;
        const births = data.births || {};
        const birthsList = Object.entries(births).map(([bid, b]) => ({ id: bid, ...b })).sort((a, b) => new Date(a.date) - new Date(b.date));
        const totalBirths = birthsList.reduce((sum, b) => sum + (parseInt(b.count) || 0), 0);
        const age = calculateAge(data.birthDate);
        const totalAgeMonths = age.years * 12 + age.months;
        const entryDate = data.birthDate;
        const yearsActive = age.years || 1;

        // السنوات التي أنتجت فيها
        const yearsWithBirths = new Set(birthsList.map(b => new Date(b.date).getFullYear()));
        const currentYear = new Date().getFullYear();
        const firstYear = new Date(entryDate).getFullYear();
        const totalYears = currentYear - firstYear + 1;
        const emptyYears = [];
        for (let y = firstYear; y <= currentYear; y++) {
          if (!yearsWithBirths.has(y)) emptyYears.push(y);
        }

        const avgPerYear = yearsActive > 0 ? (birthsList.length / yearsActive).toFixed(1) : 0;
        const lastBirth = birthsList[birthsList.length - 1];
        const firstBirth = birthsList[0];

        // نقاط الإنتاج للترتيب
        const score = (birthsList.length * 10) + totalBirths - (emptyYears.length * 3) - (data.healthStatus === 'sick' ? 5 : 0);

        result.push({
          id, type, number: data.number, birthDate: data.birthDate,
          status: data.status, healthStatus: data.healthStatus, healthNotes: data.healthNotes,
          notes: data.notes, age, totalAgeMonths,
          birthsList, totalBirths, totalBirthEvents: birthsList.length,
          yearsWithBirths: [...yearsWithBirths].sort(),
          emptyYears, totalYears, avgPerYear,
          lastBirth, firstBirth, score,
          offspringCount: data.offspringCount || 0
        });
      });
    });
    return result.sort((a, b) => b.score - a.score);
  }, [animals, productionReportType]);

  // ✅ تقرير المبيعات والأرباح
  const salesReportData = useMemo(() => {
    const typesToSearch = salesReportType === 'all' ? Object.keys(animals) : [salesReportType];
    let soldAnimals = [];
    typesToSearch.forEach(type => {
      const typeAnimals = animals[type] || {};
      Object.entries(typeAnimals).forEach(([id, data]) => {
        if (data.status === 'sold' && data.saleDate) {
          // فلترة بالتاريخ
          if (salesDateFrom && data.saleDate < salesDateFrom) return;
          if (salesDateTo && data.saleDate > salesDateTo) return;
          soldAnimals.push({
            id, type, ...data,
            salePriceNum: parseFloat(data.salePrice) || 0,
            purchasePriceNum: parseFloat(data.purchasePrice) || 0,
            profit: (parseFloat(data.salePrice) || 0) - (parseFloat(data.purchasePrice) || 0),
          });
        }
      });
    });
    soldAnimals.sort((a, b) => new Date(b.saleDate) - new Date(a.saleDate));
    const totalSales = soldAnimals.reduce((s, a) => s + a.salePriceNum, 0);
    const totalCost = soldAnimals.reduce((s, a) => s + a.purchasePriceNum, 0);
    const totalProfit = totalSales - totalCost;
    const withProfit = soldAnimals.filter(a => a.purchasePriceNum > 0);
    return { list: soldAnimals, totalSales, totalCost, totalProfit, withProfit };
  }, [animals, salesReportType, salesDateFrom, salesDateTo]);

  // ===== دوال المكتبة البيطرية =====

  // حفظ الأدوية في localStorage + Firebase
  const saveMedicines = useCallback((updated) => {
    setMedicines(updated);
    localStorage.setItem('vetMedicines', JSON.stringify(updated));
    if (user) set(ref(database, `users/${user.id}/vetMedicines`), updated).catch(() => {});
  }, [user]);

  const saveTreatments = useCallback((updated) => {
    setTreatmentRecords(updated);
    localStorage.setItem('vetTreatments', JSON.stringify(updated));
    if (user) set(ref(database, `users/${user.id}/vetTreatments`), updated).catch(() => {});
  }, [user]);

  const saveExperiences = useCallback((updated) => {
    setExperiences(updated);
    localStorage.setItem('vetExperiences', JSON.stringify(updated));
    if (user) set(ref(database, `users/${user.id}/vetExperiences`), updated).catch(() => {});
  }, [user]);

  // تحميل بيانات المكتبة من Firebase
  useEffect(() => {
    if (!user) return;
    const vetRef = ref(database, `users/${user.id}/vetMedicines`);
    onValue(vetRef, (snap) => { if (snap.exists()) { setMedicines(snap.val()); } }, { onlyOnce: true });
    const treatRef = ref(database, `users/${user.id}/vetTreatments`);
    onValue(treatRef, (snap) => { if (snap.exists()) { setTreatmentRecords(snap.val()); } }, { onlyOnce: true });
    const expRef = ref(database, `users/${user.id}/vetExperiences`);
    onValue(expRef, (snap) => { if (snap.exists()) { setExperiences(snap.val()); } }, { onlyOnce: true });
  }, [user]);

  // حساب الأيام المتبقية على انتهاء الدواء
  const daysUntilExpiry = (expiryDate) => {
    if (!expiryDate) return null;
    const diff = new Date(expiryDate) - new Date();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  const handleSaveMedicine = () => {
    if (!medicineForm.name) { alert('أدخل اسم الدواء'); return; }
    let updated;
    if (editMedicineId) {
      updated = medicines.map(m => m.id === editMedicineId ? { ...m, ...medicineForm, boxes: parseFloat(medicineForm.boxes) || 0, cost: parseFloat(medicineForm.cost) || 0 } : m);
    } else {
      const newMed = { id: `m_${Date.now()}`, ...medicineForm, boxes: parseFloat(medicineForm.boxes) || 0, cost: parseFloat(medicineForm.cost) || 0 };
      updated = [...medicines, newMed];
    }
    saveMedicines(updated);
    setMedicineForm({ name: '', boxes: '', expiry: '', cost: '', unit: 'علبة' });
    setEditMedicineId(null);
    setShowAddMedicine(false);
  };

  const handleDeleteMedicine = (id) => {
    if (!window.confirm('حذف هذا الدواء؟')) return;
    saveMedicines(medicines.filter(m => m.id !== id));
  };

  const handleSaveTreatment = () => {
    if (!treatmentForm.animalNumber || !treatmentForm.medicine) { alert('أدخل رقم الحيوان والدواء'); return; }
    const updated = [...treatmentRecords, { id: `t_${Date.now()}`, ...treatmentForm }];
    saveTreatments(updated);
    setTreatmentForm({ animalNumber: '', animalType: 'sheep', date: new Date().toISOString().split('T')[0], medicine: '', dose: '', notes: '', result: 'pending' });
    setShowAddTreatment(false);
  };

  const handleSaveExperience = () => {
    if (!experienceForm.disease || !experienceForm.treatment) { alert('أدخل المرض وطريقة العلاج'); return; }
    let updated;
    if (editExperienceId) {
      updated = experiences.map(e => e.id === editExperienceId ? { ...e, ...experienceForm } : e);
    } else {
      updated = [...experiences, { id: `exp_${Date.now()}`, ...experienceForm }];
    }
    saveExperiences(updated);
    setExperienceForm({ disease: '', symptoms: '', treatment: '', medicine: '', successRate: 90, notes: '' });
    setEditExperienceId(null);
    setShowAddExperience(false);
  };

  // إجمالي تكلفة المخزون
  const totalInventoryCost = useMemo(() => medicines.reduce((s, m) => s + ((parseFloat(m.cost) || 0) * (parseFloat(m.boxes) || 0)), 0), [medicines]);
  const expiringMedicines = useMemo(() => medicines.filter(m => { const d = daysUntilExpiry(m.expiry); return d !== null && d <= 90; }), [medicines]);

  const ageReportAnimals = useMemo(() => {
    const minTotalMonths = (ageReportFilter.minYears * 12) + parseInt(ageReportFilter.minMonths || 0);
    let result = [];
    const typesToSearch = ageReportFilter.type === 'all' ? Object.keys(animals) : [ageReportFilter.type];
    typesToSearch.forEach(type => {
      const typeAnimals = animals[type] || {};
      Object.entries(typeAnimals).forEach(([id, data]) => {
        if (data.status === 'active' || data.status === 'productive') {
          const age = calculateAge(data.birthDate);
          const totalMonths = (age.years * 12) + age.months;
          if (totalMonths >= minTotalMonths) {
            result.push({ id, type, ...data, ageYears: age.years, ageMonths: age.months, totalMonths });
          }
        }
      });
    });
    return result.sort((a, b) => b.totalMonths - a.totalMonths);
  }, [animals, ageReportFilter]);

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
      <div style={{ minHeight: '100vh', background: '#f9f7f4' }}>
        <style>{mobileCSS}</style>

        {/* شريط علوي للموبايل */}
        {isMobile && (
          <div style={{ background: 'linear-gradient(90deg, #5D4E37, #3D2817)', padding: '12px 15px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 200 }}>
            <span style={{ color: '#F5D547', fontWeight: 'bold', fontSize: '18px' }}>🐑 FarmHub</span>
            <button onClick={() => setSidebarOpen(!sidebarOpen)} style={{ background: 'none', border: '2px solid #F5D547', color: '#F5D547', borderRadius: '6px', padding: '6px 12px', cursor: 'pointer', fontSize: '18px' }}>☰</button>
          </div>
        )}

        <div style={{ display: 'flex', minHeight: isMobile ? 'calc(100vh - 50px)' : '100vh' }}>
          {/* Sidebar */}
          {(!isMobile || sidebarOpen) && (
            <div style={{ background: 'linear-gradient(180deg, #5D4E37 0%, #3D2817 100%)', padding: '25px 15px', width: isMobile ? '100%' : '260px', minWidth: isMobile ? 'unset' : '260px', overflowY: 'auto', position: isMobile ? 'relative' : 'fixed', height: isMobile ? 'auto' : '100vh', top: 0, left: 0, zIndex: 100 }}>
              {!isMobile && <div style={{ color: '#F5D547', fontSize: '26px', fontWeight: 'bold', marginBottom: '30px', textAlign: 'center' }}>🐑 FarmHub</div>}
              <p style={{ color: '#E8D5C4', fontSize: '12px', textAlign: 'center', marginBottom: '5px' }}>مرحباً {user.name}</p>
              <button onClick={() => { setShowDashboard(false); setSidebarOpen(false); }} style={{ width: '100%', padding: '10px', background: '#27ae60', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold', marginBottom: '10px' }}>← رجوع</button>
              <div style={{ borderTop: '1px solid #8B6F47', paddingTop: '15px' }}>
                <button onClick={() => setShowChangePassword(true)} style={{ width: '100%', padding: '10px', background: '#F5D547', color: '#3D2817', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold', marginBottom: '10px' }}>🔐 تغيير المرور</button>
                <button onClick={handleLogout} style={{ width: '100%', padding: '10px', color: '#e74c3c', background: 'transparent', border: '1px solid #e74c3c', cursor: 'pointer', borderRadius: '6px', fontSize: '13px', fontWeight: '600' }}>تسجيل الخروج</button>
              </div>
            </div>
          )}

          {/* المحتوى */}
          <div style={{ flex: 1, padding: isMobile ? '15px' : '30px', overflowY: 'auto', marginLeft: isMobile ? 0 : '260px' }}>
            <h1 style={{ marginBottom: '20px', color: '#3D2817', fontSize: isMobile ? '18px' : '24px' }}>📊 ملخص الإحصائيات الشاملة</h1>
            <div style={{ background: 'white', padding: '15px', borderRadius: '8px', marginBottom: '20px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '10px' }}>
              {[
                { val: totalStats.total, label: '🐑 الإجمالي', color: '#3D2817' },
                { val: totalStats.active, label: '✓ النشطة', color: '#27ae60' },
                { val: totalStats.sick, label: '⚠️ المريضة', color: '#e74c3c' },
                { val: totalStats.sold, label: '💰 المباع', color: '#3498db' },
                { val: totalStats.freezer, label: '❄️ الثلاجة', color: '#2980b9' },
              ].map(s => (
                <div key={s.label} style={{ textAlign: 'center', padding: '12px', background: '#f9f7f4', borderRadius: '8px' }}>
                  <div style={{ fontSize: '22px', fontWeight: 'bold', color: s.color }}>{s.val}</div>
                  <div style={{ color: s.color, fontSize: '12px', marginTop: '4px' }}>{s.label}</div>
                </div>
              ))}
            </div>
            <h2 style={{ marginBottom: '15px', color: '#3D2817', fontSize: isMobile ? '15px' : '20px' }}>📈 توزيع الحيوانات حسب النوع</h2>
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(250px, 1fr))', gap: '15px' }}>
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
      </div>
    );
  }

  // الصفحة الرئيسية
  return (
    <div style={{ minHeight: '100vh', background: '#f9f7f4' }}>
      <style>{mobileCSS}</style>

      {/* شريط علوي للموبايل */}
      {isMobile && (
        <div style={{ background: 'linear-gradient(90deg, #5D4E37, #3D2817)', padding: '12px 15px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 200 }}>
          <span style={{ color: '#F5D547', fontWeight: 'bold', fontSize: '16px' }}>
            🐑 {selectedAnimalType === 'sheep' ? 'الضان' : selectedAnimalType === 'goat' ? 'الماعز' : selectedAnimalType}
          </span>
          <button onClick={() => setSidebarOpen(!sidebarOpen)} style={{ background: 'none', border: '2px solid #F5D547', color: '#F5D547', borderRadius: '6px', padding: '6px 12px', cursor: 'pointer', fontSize: '18px' }}>☰</button>
        </div>
      )}

      <div style={{ display: 'flex', minHeight: isMobile ? 'calc(100vh - 50px)' : '100vh' }}>

        {/* Sidebar */}
        {(!isMobile || sidebarOpen) && (
          <div style={{ background: 'linear-gradient(180deg, #5D4E37 0%, #3D2817 100%)', padding: '25px 15px', width: isMobile ? '100%' : '260px', minWidth: isMobile ? 'unset' : '260px', overflowY: 'auto', position: isMobile ? 'relative' : 'fixed', height: isMobile ? 'auto' : '100vh', top: 0, left: 0, zIndex: 100 }}>
            {!isMobile && <div style={{ color: '#F5D547', fontSize: '26px', fontWeight: 'bold', marginBottom: '30px', textAlign: 'center' }}>🐑 FarmHub</div>}
            <p style={{ color: '#E8D5C4', fontSize: '12px', textAlign: 'center', marginBottom: '5px' }}>مرحباً {user.name}</p>
            <p style={{ color: '#F5D547', fontSize: '11px', textAlign: 'center', marginBottom: '10px', background: user.role === 'admin' ? '#8B6F47' : 'transparent', padding: '5px', borderRadius: '4px' }}>
              {user.role === 'admin' ? '👑 مشرف' : '👤 مستخدم'}
            </p>
            <p style={{ color: '#E8D5C4', fontSize: '11px', textAlign: 'center', marginBottom: '20px', background: '#5D4E37', padding: '8px', borderRadius: '4px', fontWeight: 'bold' }}>
              {selectedAnimalType === 'sheep' ? '🐑 الضان' : selectedAnimalType === 'goat' ? '🐐 الماعز' : selectedAnimalType}
            </p>
            <button onClick={() => { setShowDashboard(true); setSidebarOpen(false); }} style={{ width: '100%', padding: '10px', background: '#27ae60', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold', marginBottom: '10px' }}>📊 ملخص الإحصائيات</button>
            <button onClick={() => { setShowAgeReport(true); setSidebarOpen(false); }} style={{ width: '100%', padding: '10px', background: '#8e44ad', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold', marginBottom: '10px' }}>👴 تقرير العويد</button>
            <button onClick={() => { setShowNumbersReport(true); setSidebarOpen(false); }} style={{ width: '100%', padding: '10px', background: '#2471a3', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold', marginBottom: '10px' }}>🔢 تقرير الأرقام</button>
            <button onClick={() => { setShowProductionReport(true); setSidebarOpen(false); }} style={{ width: '100%', padding: '10px', background: '#c0392b', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold', marginBottom: '10px' }}>📈 تقرير الإنتاج</button>
            <button onClick={() => { setShowSalesReport(true); setSidebarOpen(false); }} style={{ width: '100%', padding: '10px', background: '#d4ac0d', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold', marginBottom: '10px' }}>💰 المبيعات والأرباح</button>
            <button onClick={() => { setShowVetLibrary(true); setSidebarOpen(false); }} style={{ width: '100%', padding: '10px', background: '#117a65', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold', marginBottom: '10px' }}>🩺 المكتبة البيطرية</button>
            <button onClick={() => { setSelectedAnimalType(null); setSidebarOpen(false); }} style={{ width: '100%', padding: '10px', background: '#F5D547', color: '#3D2817', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold', marginBottom: '20px' }}>↩️ تغيير النوع</button>
            <div style={{ borderTop: '1px solid #8B6F47', paddingTop: '15px' }}>
              <button onClick={() => { setShowChangePassword(true); setSidebarOpen(false); }} style={{ width: '100%', padding: '10px', background: '#F5D547', color: '#3D2817', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold', marginBottom: '10px' }}>🔐 تغيير المرور</button>
              {user.role === 'admin' && (
                <button onClick={() => { setShowAdminPanel(true); setSidebarOpen(false); }} style={{ width: '100%', padding: '10px', background: '#27ae60', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold', marginBottom: '10px' }}>👑 إدارة المستخدمين</button>
              )}
              <button onClick={handleLogout} style={{ width: '100%', padding: '10px', color: '#e74c3c', background: 'transparent', border: '1px solid #e74c3c', cursor: 'pointer', borderRadius: '6px', fontSize: '12px', fontWeight: '600' }}>تسجيل الخروج</button>
            </div>
          </div>
        )}

        {/* المحتوى الرئيسي */}
        {(!isMobile || !sidebarOpen) && (
          <div style={{ flex: 1, overflowY: 'auto', background: '#f9f7f4', padding: isMobile ? '15px' : '30px', marginLeft: isMobile ? 0 : '260px' }}>
            <h1 style={{ marginBottom: '15px', color: '#3D2817', fontSize: isMobile ? '18px' : '24px' }}>
              {selectedAnimalType === 'sheep' ? '🐑 إدارة الضان' : selectedAnimalType === 'goat' ? '🐐 إدارة الماعز' : `🐄 إدارة ${selectedAnimalType}`}
            </h1>

            {/* الإحصائيات */}
            <div style={{ background: 'white', padding: '12px 15px', borderRadius: '8px', marginBottom: '15px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(90px, 1fr))', gap: '8px', textAlign: 'center' }}>
              {[
                { val: typeCount.total, label: 'الإجمالي', icon: '🐑', color: '#3D2817' },
                { val: typeCount.active, label: 'النشطة', icon: '✓', color: '#27ae60' },
                { val: typeCount.sick, label: 'المريضة', icon: '⚠️', color: '#e74c3c' },
                { val: typeCount.sold, label: 'المباع', icon: '💰', color: '#3498db' },
                { val: typeCount.freezer, label: 'الثلاجة', icon: '❄️', color: '#2980b9' },
              ].map(s => (
                <div key={s.label} style={{ padding: '8px', background: '#f9f7f4', borderRadius: '6px' }}>
                  <div style={{ fontSize: '18px', fontWeight: 'bold', color: s.color }}>{s.val}</div>
                  <div style={{ fontSize: '11px', color: s.color }}>{s.icon} {s.label}</div>
                </div>
              ))}
            </div>

            <button
              onClick={() => { setAnimalForm(EMPTY_FORM); setEditingId(null); setShowModal(true); }}
              style={{ marginBottom: '15px', background: '#8B6F47', color: 'white', border: 'none', padding: '12px 20px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px', width: isMobile ? '100%' : 'auto' }}
            >
              ➕ إضافة حيوان
            </button>

            {/* الجدول - موبايل يعرض كاردات، ديسكتوب يعرض جدول */}
            {isMobile ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {sortedAnimals.map(animal => {
                  const notes = animal.healthNotes || animal.notes || '-';
                  return (
                    <div key={animal.id} style={{ background: 'white', borderRadius: '10px', padding: '15px', border: `2px solid ${getTypeTextColor(selectedAnimalType)}20`, boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                        <span style={{ fontWeight: 'bold', fontSize: '16px', color: getTypeTextColor(selectedAnimalType) }}>#{animal.number}</span>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button onClick={() => { setSelectedAnimal(animal); setShowDetailModal(true); }} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '20px' }}>👁️</button>
                          <button onClick={() => handleEditAnimal(animal.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '20px' }}>✏️</button>
                          <button onClick={() => handleDeleteAnimal(animal.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '20px' }}>🗑️</button>
                          {animal.gender === 'female' && (
                            <button onClick={() => { setBirthAnimal({ id: animal.id, type: selectedAnimalType, number: animal.number }); setShowBirthModal(true); }} style={{ background: '#27ae60', border: 'none', cursor: 'pointer', fontSize: '14px', borderRadius: '6px', padding: '2px 6px', color: 'white', fontWeight: 'bold' }}>🐣+</button>
                          )}
                        </div>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', fontSize: '13px' }}>
                        <div><span style={{ color: '#999' }}>الجنس: </span>{animal.gender === 'male' ? '🐏 ذكر' : '🐑 أنثى'}</div>
                        <div><span style={{ color: '#999' }}>العمر: </span>{formatAge(animal.birthDate)}</div>
                        <div><span style={{ color: '#999' }}>الحالة: </span>
                          <span style={{ color: animal.status === 'active' ? '#27ae60' : '#e74c3c', fontWeight: 'bold' }}>
                            {animal.status === 'active' ? '✓ نشط' : animal.status === 'sold' ? '💰 مباع' : '🔪 مذبوح'}
                          </span>
                        </div>
                        <div><span style={{ color: '#999' }}>الصحة: </span>
                          <span style={{ color: animal.healthStatus === 'healthy' ? '#27ae60' : '#e74c3c', fontWeight: 'bold' }}>
                            {animal.healthStatus === 'healthy' ? '✓ سليمة' : '⚠️ مريضة'}
                          </span>
                        </div>
                      </div>
                      {notes !== '-' && <div style={{ marginTop: '8px', fontSize: '12px', color: '#666', background: '#f9f7f4', padding: '6px', borderRadius: '4px' }}>{notes.length > 50 ? notes.substring(0, 50) + '...' : notes}</div>}
                    </div>
                  );
                })}
                {sortedAnimals.length === 0 && <div style={{ padding: '40px', textAlign: 'center', color: '#999', background: 'white', borderRadius: '8px' }}>لا توجد حيوانات مسجلة</div>}
              </div>
            ) : (
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
                            <button onClick={() => handleDeleteAnimal(animal.id)} style={{ marginRight: '5px', background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px' }}>🗑️</button>
                            {animal.gender === 'female' && (
                              <button onClick={() => { setBirthAnimal({ id: animal.id, type: selectedAnimalType, number: animal.number }); setShowBirthModal(true); }} style={{ background: '#27ae60', border: 'none', cursor: 'pointer', fontSize: '11px', borderRadius: '5px', padding: '3px 6px', color: 'white', fontWeight: 'bold' }}>🐣+</button>
                            )}
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
            )}
          </div>
        )}
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
              {/* سعر الشراء وتاريخه */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', background: '#f0f9f3', padding: '12px', borderRadius: '8px', border: '1px solid #c8e6c9' }}>
                <div>
                  <label style={{ fontSize: '13px', fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>💰 سعر الشراء (ريال)</label>
                  <input type="number" min="0" placeholder="اختياري" value={animalForm.purchasePrice} onChange={(e) => handleAnimalChange('purchasePrice', e.target.value)} style={{ padding: '8px', border: '1px solid #ddd', borderRadius: '6px', width: '100%' }} />
                </div>
                <div>
                  <label style={{ fontSize: '13px', fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>📅 تاريخ الشراء</label>
                  <input type="date" value={animalForm.purchaseDate} onChange={(e) => handleAnimalChange('purchaseDate', e.target.value)} style={{ padding: '8px', border: '1px solid #ddd', borderRadius: '6px', width: '100%' }} />
                </div>
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
      {/* Modal تسجيل ولادة */}
      {showBirthModal && birthAnimal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1100, padding: '20px' }} onClick={() => setShowBirthModal(false)}>
          <div style={{ background: 'white', borderRadius: '12px', maxWidth: '420px', width: '100%', overflow: 'hidden' }} onClick={e => e.stopPropagation()}>
            <div style={{ background: 'linear-gradient(135deg, #27ae60, #1e8449)', padding: '18px 22px', color: 'white' }}>
              <h2 style={{ margin: 0, fontSize: '17px' }}>🐣 تسجيل ولادة — رقم {birthAnimal.number}</h2>
            </div>
            <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '13px', fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>📅 تاريخ الولادة *</label>
                <input type="date" value={birthForm.date} onChange={e => setBirthForm(p => ({ ...p, date: e.target.value }))} style={{ padding: '9px', border: '1px solid #ddd', borderRadius: '6px', width: '100%', fontSize: '14px' }} />
              </div>
              <div>
                <label style={{ fontSize: '13px', fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>🐑 عدد المواليد *</label>
                <input type="number" min="1" max="10" value={birthForm.count} onChange={e => setBirthForm(p => ({ ...p, count: e.target.value }))} style={{ padding: '9px', border: '1px solid #ddd', borderRadius: '6px', width: '100%', fontSize: '14px' }} />
              </div>
              <div>
                <label style={{ fontSize: '13px', fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>♂♀ جنس المواليد</label>
                <select value={birthForm.gender} onChange={e => setBirthForm(p => ({ ...p, gender: e.target.value }))} style={{ padding: '9px', border: '1px solid #ddd', borderRadius: '6px', width: '100%', fontSize: '14px' }}>
                  <option value="mixed">مختلط (ذكر وأنثى)</option>
                  <option value="male">ذكور فقط</option>
                  <option value="female">إناث فقط</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize: '13px', fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>📝 ملاحظات</label>
                <input type="text" placeholder="مثال: توأم، صعوبة ولادة، مولود ضعيف..." value={birthForm.notes} onChange={e => setBirthForm(p => ({ ...p, notes: e.target.value }))} style={{ padding: '9px', border: '1px solid #ddd', borderRadius: '6px', width: '100%', fontSize: '14px' }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '5px' }}>
                <button onClick={handleSaveBirth} style={{ background: '#27ae60', color: 'white', border: 'none', padding: '11px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px' }}>✓ حفظ</button>
                <button onClick={() => setShowBirthModal(false)} style={{ background: '#ddd', color: '#333', border: 'none', padding: '11px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px' }}>إلغاء</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal تقرير الإنتاج */}
      {showProductionReport && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'flex-start', zIndex: 1000, padding: '20px', overflowY: 'auto' }} onClick={() => setShowProductionReport(false)}>
          <div style={{ background: 'white', borderRadius: '12px', maxWidth: '720px', width: '100%', marginTop: '20px', overflow: 'hidden' }} onClick={e => e.stopPropagation()}>

            {/* Header */}
            <div style={{ background: 'linear-gradient(135deg, #c0392b, #922b21)', padding: '20px 25px', color: 'white' }}>
              <h2 style={{ margin: 0, fontSize: '18px' }}>📈 تقرير الإنتاج</h2>
              <p style={{ margin: '5px 0 0', fontSize: '12px', opacity: 0.85 }}>الإناث مرتبة من الأعلى إنتاجاً — بناءً على عدد الولادات والمواليد وانتظام الإنتاج</p>
            </div>

            {/* فلتر النوع */}
            <div style={{ padding: '15px 20px', background: '#fdf2f2', borderBottom: '1px solid #f5c6c6', display: 'flex', alignItems: 'center', gap: '15px', flexWrap: 'wrap' }}>
              <label style={{ fontSize: '13px', fontWeight: 'bold', color: '#555' }}>نوع الحيوان:</label>
              <select value={productionReportType} onChange={e => setProductionReportType(e.target.value)} style={{ padding: '7px 12px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '13px' }}>
                <option value="all">الكل</option>
                {animalTypes.map(t => <option key={t} value={t}>{t === 'sheep' ? '🐑 ضان' : t === 'goat' ? '🐐 ماعز' : `🐄 ${t}`}</option>)}
              </select>
              <span style={{ fontSize: '13px', color: '#c0392b', fontWeight: 'bold' }}>📊 إجمالي الإناث: {productionReportData.length}</span>
            </div>

            {/* القائمة */}
            <div style={{ padding: '15px 20px', maxHeight: '520px', overflowY: 'auto' }}>
              {productionReportData.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '50px', color: '#999' }}>
                  <div style={{ fontSize: '40px', marginBottom: '10px' }}>🐑</div>
                  <div>لا توجد إناث مسجلة بهذا النوع</div>
                </div>
              ) : productionReportData.map((animal, index) => (
                <div key={`${animal.type}-${animal.id}`} style={{ background: index === 0 ? '#fff5f5' : 'white', border: `2px solid ${index === 0 ? '#c0392b' : index < 3 ? '#f1948a' : '#eee'}`, borderRadius: '12px', padding: '16px', marginBottom: '12px' }}>

                  {/* رأس البطاقة */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{ background: index === 0 ? '#c0392b' : index < 3 ? '#e74c3c' : '#bbb', color: 'white', borderRadius: '50%', width: '30px', height: '30px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '13px', flexShrink: 0 }}>
                        {index + 1}
                      </div>
                      <div>
                        <div style={{ fontWeight: 'bold', fontSize: '16px', color: '#3D2817' }}>
                          رقم {animal.number}
                          {index === 0 && <span style={{ marginRight: '6px', background: '#c0392b', color: 'white', fontSize: '11px', padding: '2px 7px', borderRadius: '4px' }}>🏆 الأفضل</span>}
                          {index === 1 && <span style={{ marginRight: '6px', background: '#e67e22', color: 'white', fontSize: '11px', padding: '2px 7px', borderRadius: '4px' }}>🥈 ثاني</span>}
                          {index === 2 && <span style={{ marginRight: '6px', background: '#f39c12', color: 'white', fontSize: '11px', padding: '2px 7px', borderRadius: '4px' }}>🥉 ثالث</span>}
                        </div>
                        <div style={{ fontSize: '12px', color: '#888', marginTop: '2px' }}>
                          {animal.type === 'sheep' ? '🐑 ضان' : animal.type === 'goat' ? '🐐 ماعز' : `🐄 ${animal.type}`}
                          {' · '}عمرها: {animal.age.years > 0 ? `${animal.age.years} سنة` : ''}{animal.age.months > 0 ? ` و${animal.age.months} شهر` : ''}
                          {' · '}دخلت المشروع: {new Date(animal.birthDate).toLocaleDateString('ar-SA')}
                        </div>
                      </div>
                    </div>
                    {/* الشارات */}
                    <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                      {animal.healthStatus === 'sick' && <span style={{ background: '#fadbd8', color: '#c0392b', fontSize: '11px', padding: '3px 8px', borderRadius: '10px', fontWeight: 'bold' }}>⚠️ مريضة</span>}
                      {animal.status !== 'active' && animal.status !== 'productive' && <span style={{ background: '#fdebd0', color: '#e67e22', fontSize: '11px', padding: '3px 8px', borderRadius: '10px', fontWeight: 'bold' }}>غير نشطة</span>}
                      {animal.emptyYears.length > 0 && <span style={{ background: '#fef9e7', color: '#f39c12', fontSize: '11px', padding: '3px 8px', borderRadius: '10px', fontWeight: 'bold' }}>⚠️ سنوات فارغة</span>}
                      {animal.totalBirthEvents >= 3 && animal.emptyYears.length === 0 && <span style={{ background: '#d5f5e3', color: '#27ae60', fontSize: '11px', padding: '3px 8px', borderRadius: '10px', fontWeight: 'bold' }}>✅ منتظمة</span>}
                    </div>
                  </div>

                  {/* الإحصائيات */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: '8px', marginBottom: '12px' }}>
                    {[
                      { label: 'مرات الولادة', val: animal.totalBirthEvents, color: '#c0392b', icon: '🐣' },
                      { label: 'إجمالي المواليد', val: animal.totalBirths, color: '#8e44ad', icon: '🐑' },
                      { label: 'معدل/سنة', val: animal.avgPerYear, color: '#2471a3', icon: '📊' },
                      { label: 'سنوات فارغة', val: animal.emptyYears.length, color: animal.emptyYears.length > 0 ? '#e67e22' : '#27ae60', icon: '📅' },
                    ].map(s => (
                      <div key={s.label} style={{ background: '#f9f9f9', borderRadius: '8px', padding: '8px', textAlign: 'center' }}>
                        <div style={{ fontSize: '18px', fontWeight: 'bold', color: s.color }}>{s.val}</div>
                        <div style={{ fontSize: '11px', color: '#888' }}>{s.icon} {s.label}</div>
                      </div>
                    ))}
                  </div>

                  {/* سجل الولادات */}
                  {animal.birthsList.length > 0 ? (
                    <div style={{ background: '#f9f9f9', borderRadius: '8px', padding: '10px' }}>
                      <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#555', marginBottom: '6px' }}>📋 سجل الولادات:</div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        {animal.birthsList.map((b, i) => (
                          <div key={b.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', padding: '4px 8px', background: 'white', borderRadius: '5px', border: '1px solid #eee' }}>
                            <span style={{ color: '#555' }}>#{i + 1} — {new Date(b.date).toLocaleDateString('ar-SA')}</span>
                            <span style={{ color: '#27ae60', fontWeight: 'bold' }}>{b.count} {b.count === 1 ? 'مولود' : 'مواليد'} {b.gender === 'male' ? '(ذكور)' : b.gender === 'female' ? '(إناث)' : '(مختلط)'}</span>
                            {b.notes && <span style={{ color: '#888', maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.notes}</span>}
                          </div>
                        ))}
                      </div>
                      {animal.emptyYears.length > 0 && (
                        <div style={{ marginTop: '6px', fontSize: '11px', color: '#e67e22' }}>
                          ⚠️ سنوات لم تنتج فيها: {animal.emptyYears.join('، ')}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div style={{ background: '#fef9e7', borderRadius: '8px', padding: '10px', fontSize: '12px', color: '#f39c12', textAlign: 'center' }}>
                      لم يُسجَّل لها ولادات بعد — اضغط 🐣+ في الجدول لإضافة ولادة
                    </div>
                  )}

                  {/* ملاحظات خاصة */}
                  {(animal.healthNotes || animal.notes) && (
                    <div style={{ marginTop: '8px', background: '#fff3cd', borderRadius: '6px', padding: '8px', fontSize: '12px', color: '#856404' }}>
                      📝 {animal.healthNotes || animal.notes}
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div style={{ padding: '15px 20px', borderTop: '1px solid #eee' }}>
              <button onClick={() => setShowProductionReport(false)} style={{ width: '100%', background: '#c0392b', color: 'white', border: 'none', padding: '12px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px' }}>إغلاق</button>
            </div>
          </div>
        </div>
      )}

      {/* ===== Modal المكتبة البيطرية ===== */}
      {showVetLibrary && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.65)', display: 'flex', justifyContent: 'center', alignItems: 'flex-start', zIndex: 1000, padding: '15px', overflowY: 'auto' }} onClick={() => setShowVetLibrary(false)}>
          <div style={{ background: 'white', borderRadius: '14px', maxWidth: '750px', width: '100%', marginTop: '15px', overflow: 'hidden', boxShadow: '0 10px 40px rgba(0,0,0,0.3)' }} onClick={e => e.stopPropagation()}>

            {/* Header */}
            <div style={{ background: 'linear-gradient(135deg, #117a65, #0e6655)', padding: '18px 22px', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '18px' }}>🩺 المكتبة البيطرية</h2>
                <p style={{ margin: '4px 0 0', fontSize: '12px', opacity: 0.85 }}>مخزون الأدوية · سجل العلاجات · التجارب الناجحة</p>
              </div>
              {expiringMedicines.length > 0 && (
                <div style={{ background: '#e74c3c', borderRadius: '8px', padding: '6px 12px', fontSize: '12px', fontWeight: 'bold' }}>
                  ⚠️ {expiringMedicines.length} دواء ينتهي قريباً
                </div>
              )}
            </div>

            {/* التبويبات */}
            <div style={{ display: 'flex', borderBottom: '2px solid #eee', background: '#f9f9f9' }}>
              {[
                { key: 'inventory', label: '💊 المخزون' },
                { key: 'treatments', label: '📋 سجل العلاجات' },
                { key: 'experiences', label: '🏆 التجارب الناجحة' },
              ].map(tab => (
                <button key={tab.key} onClick={() => setVetTab(tab.key)} style={{ flex: 1, padding: '11px 5px', background: vetTab === tab.key ? 'white' : 'transparent', border: 'none', borderBottom: vetTab === tab.key ? '3px solid #117a65' : '3px solid transparent', cursor: 'pointer', fontWeight: vetTab === tab.key ? 'bold' : 'normal', color: vetTab === tab.key ? '#117a65' : '#888', fontSize: isMobile ? '11px' : '13px' }}>
                  {tab.label}
                </button>
              ))}
            </div>

            <div style={{ maxHeight: '540px', overflowY: 'auto' }}>

              {/* ===== تبويب المخزون ===== */}
              {vetTab === 'inventory' && (
                <div style={{ padding: '15px 20px' }}>
                  {/* ملخص */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '10px', marginBottom: '15px' }}>
                    {[
                      { label: 'عدد الأدوية', val: medicines.length, color: '#117a65', icon: '💊' },
                      { label: 'تنتهي قريباً', val: expiringMedicines.length, color: expiringMedicines.length > 0 ? '#e74c3c' : '#27ae60', icon: '⚠️' },
                      { label: 'إجمالي التكلفة', val: totalInventoryCost.toLocaleString() + ' ر', color: '#d4ac0d', icon: '💰' },
                    ].map(s => (
                      <div key={s.label} style={{ background: '#f9f9f9', borderRadius: '8px', padding: '10px', textAlign: 'center', border: '1px solid #eee' }}>
                        <div style={{ fontSize: '15px', fontWeight: 'bold', color: s.color }}>{s.icon} {s.val}</div>
                        <div style={{ fontSize: '11px', color: '#888', marginTop: '3px' }}>{s.label}</div>
                      </div>
                    ))}
                  </div>

                  {/* قائمة الأدوية */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '15px' }}>
                    {medicines.map(med => {
                      const days = daysUntilExpiry(med.expiry);
                      const isExpiring = days !== null && days <= 90;
                      const isExpired = days !== null && days <= 0;
                      const totalCost = (parseFloat(med.cost) || 0) * (parseFloat(med.boxes) || 0);
                      return (
                        <div key={med.id} style={{ background: isExpired ? '#fff0f0' : isExpiring ? '#fff8f0' : 'white', border: `1.5px solid ${isExpired ? '#e74c3c' : isExpiring ? '#e67e22' : '#eee'}`, borderRadius: '10px', padding: '12px 15px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '6px' }}>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontWeight: 'bold', fontSize: '14px', color: '#1a1a1a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                💊 {med.name}
                                {isExpired && <span style={{ background: '#e74c3c', color: 'white', fontSize: '10px', padding: '2px 6px', borderRadius: '4px' }}>منتهي!</span>}
                                {isExpiring && !isExpired && <span style={{ background: '#e67e22', color: 'white', fontSize: '10px', padding: '2px 6px', borderRadius: '4px' }}>ينتهي قريباً</span>}
                              </div>
                              <div style={{ display: 'flex', gap: '14px', marginTop: '6px', flexWrap: 'wrap', fontSize: '12px', color: '#666' }}>
                                <span>📦 الكمية: <strong>{med.boxes} {med.unit}</strong></span>
                                <span>💵 تكلفة الوحدة: <strong>{med.cost} ر</strong></span>
                                <span>🧾 الإجمالي: <strong style={{ color: '#117a65' }}>{totalCost.toLocaleString()} ر</strong></span>
                                {med.expiry && (
                                  <span style={{ color: isExpired ? '#e74c3c' : isExpiring ? '#e67e22' : '#27ae60', fontWeight: 'bold' }}>
                                    📅 الانتهاء: {new Date(med.expiry).toLocaleDateString('ar-SA')}
                                    {days !== null && ` (${isExpired ? 'منتهي منذ ' + Math.abs(days) + ' يوم' : 'باقي ' + days + ' يوم'})`}
                                  </span>
                                )}
                              </div>
                            </div>
                            <div style={{ display: 'flex', gap: '6px' }}>
                              <button onClick={() => { setMedicineForm({ name: med.name, boxes: med.boxes, expiry: med.expiry || '', cost: med.cost, unit: med.unit || 'علبة' }); setEditMedicineId(med.id); setShowAddMedicine(true); }} style={{ background: '#f0f9f6', border: '1px solid #117a65', color: '#117a65', borderRadius: '6px', padding: '5px 8px', cursor: 'pointer', fontSize: '13px' }}>✏️</button>
                              <button onClick={() => handleDeleteMedicine(med.id)} style={{ background: '#fff0f0', border: '1px solid #e74c3c', color: '#e74c3c', borderRadius: '6px', padding: '5px 8px', cursor: 'pointer', fontSize: '13px' }}>🗑️</button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* نموذج إضافة/تعديل دواء */}
                  {showAddMedicine ? (
                    <div style={{ background: '#f0f9f6', border: '2px solid #117a65', borderRadius: '10px', padding: '15px' }}>
                      <h4 style={{ color: '#117a65', margin: '0 0 12px' }}>{editMedicineId ? '✏️ تعديل دواء' : '➕ إضافة دواء جديد'}</h4>
                      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '10px' }}>
                        <div>
                          <label style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>اسم الدواء *</label>
                          <input value={medicineForm.name} onChange={e => setMedicineForm(p => ({ ...p, name: e.target.value }))} placeholder="مثال: تايلوزين" style={{ padding: '8px', border: '1px solid #ddd', borderRadius: '6px', width: '100%', fontSize: '13px' }} />
                        </div>
                        <div>
                          <label style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>وحدة القياس</label>
                          <select value={medicineForm.unit} onChange={e => setMedicineForm(p => ({ ...p, unit: e.target.value }))} style={{ padding: '8px', border: '1px solid #ddd', borderRadius: '6px', width: '100%', fontSize: '13px' }}>
                            <option>علبة</option><option>زجاجة</option><option>كيس</option><option>قارورة</option><option>حبة</option><option>لتر</option>
                          </select>
                        </div>
                        <div>
                          <label style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>الكمية المتوفرة</label>
                          <input type="number" min="0" value={medicineForm.boxes} onChange={e => setMedicineForm(p => ({ ...p, boxes: e.target.value }))} style={{ padding: '8px', border: '1px solid #ddd', borderRadius: '6px', width: '100%', fontSize: '13px' }} />
                        </div>
                        <div>
                          <label style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>تكلفة الوحدة (ريال)</label>
                          <input type="number" min="0" value={medicineForm.cost} onChange={e => setMedicineForm(p => ({ ...p, cost: e.target.value }))} style={{ padding: '8px', border: '1px solid #ddd', borderRadius: '6px', width: '100%', fontSize: '13px' }} />
                        </div>
                        <div style={{ gridColumn: isMobile ? '1' : '1 / -1' }}>
                          <label style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>تاريخ الانتهاء</label>
                          <input type="date" value={medicineForm.expiry} onChange={e => setMedicineForm(p => ({ ...p, expiry: e.target.value }))} style={{ padding: '8px', border: '1px solid #ddd', borderRadius: '6px', width: '100%', fontSize: '13px' }} />
                        </div>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '12px' }}>
                        <button onClick={handleSaveMedicine} style={{ background: '#117a65', color: 'white', border: 'none', padding: '10px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>✓ حفظ</button>
                        <button onClick={() => { setShowAddMedicine(false); setEditMedicineId(null); setMedicineForm({ name: '', boxes: '', expiry: '', cost: '', unit: 'علبة' }); }} style={{ background: '#ddd', border: 'none', padding: '10px', borderRadius: '6px', cursor: 'pointer' }}>إلغاء</button>
                      </div>
                    </div>
                  ) : (
                    <button onClick={() => setShowAddMedicine(true)} style={{ width: '100%', padding: '11px', background: '#117a65', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px' }}>➕ إضافة دواء جديد</button>
                  )}
                </div>
              )}

              {/* ===== تبويب سجل العلاجات ===== */}
              {vetTab === 'treatments' && (
                <div style={{ padding: '15px 20px' }}>
                  {/* نموذج إضافة علاج */}
                  {showAddTreatment ? (
                    <div style={{ background: '#f0f4ff', border: '2px solid #2471a3', borderRadius: '10px', padding: '15px', marginBottom: '15px' }}>
                      <h4 style={{ color: '#2471a3', margin: '0 0 12px' }}>➕ تسجيل علاج جديد</h4>
                      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '10px' }}>
                        <div>
                          <label style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>رقم الحيوان *</label>
                          <input value={treatmentForm.animalNumber} onChange={e => setTreatmentForm(p => ({ ...p, animalNumber: e.target.value }))} placeholder="مثال: 1234" style={{ padding: '8px', border: '1px solid #ddd', borderRadius: '6px', width: '100%', fontSize: '13px' }} />
                        </div>
                        <div>
                          <label style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>نوع الحيوان</label>
                          <select value={treatmentForm.animalType} onChange={e => setTreatmentForm(p => ({ ...p, animalType: e.target.value }))} style={{ padding: '8px', border: '1px solid #ddd', borderRadius: '6px', width: '100%', fontSize: '13px' }}>
                            {animalTypes.map(t => <option key={t} value={t}>{t === 'sheep' ? '🐑 ضان' : t === 'goat' ? '🐐 ماعز' : `🐄 ${t}`}</option>)}
                          </select>
                        </div>
                        <div>
                          <label style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>📅 تاريخ العلاج</label>
                          <input type="date" value={treatmentForm.date} onChange={e => setTreatmentForm(p => ({ ...p, date: e.target.value }))} style={{ padding: '8px', border: '1px solid #ddd', borderRadius: '6px', width: '100%', fontSize: '13px' }} />
                        </div>
                        <div>
                          <label style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>💊 الدواء المستخدم *</label>
                          <select value={treatmentForm.medicine} onChange={e => setTreatmentForm(p => ({ ...p, medicine: e.target.value }))} style={{ padding: '8px', border: '1px solid #ddd', borderRadius: '6px', width: '100%', fontSize: '13px' }}>
                            <option value="">اختر الدواء</option>
                            {medicines.map(m => <option key={m.id} value={m.name}>{m.name}</option>)}
                            <option value="أخرى">أخرى</option>
                          </select>
                        </div>
                        <div>
                          <label style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>الجرعة</label>
                          <input value={treatmentForm.dose} onChange={e => setTreatmentForm(p => ({ ...p, dose: e.target.value }))} placeholder="مثال: 5ml يومياً" style={{ padding: '8px', border: '1px solid #ddd', borderRadius: '6px', width: '100%', fontSize: '13px' }} />
                        </div>
                        <div>
                          <label style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>نتيجة العلاج</label>
                          <select value={treatmentForm.result} onChange={e => setTreatmentForm(p => ({ ...p, result: e.target.value }))} style={{ padding: '8px', border: '1px solid #ddd', borderRadius: '6px', width: '100%', fontSize: '13px' }}>
                            <option value="pending">⏳ جاري العلاج</option>
                            <option value="success">✅ تعافى</option>
                            <option value="failed">❌ لم يتعافَ</option>
                            <option value="died">💀 نفق</option>
                          </select>
                        </div>
                        <div style={{ gridColumn: isMobile ? '1' : '1 / -1' }}>
                          <label style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>📝 ملاحظات (وصف المرض، الأعراض)</label>
                          <textarea value={treatmentForm.notes} onChange={e => setTreatmentForm(p => ({ ...p, notes: e.target.value }))} placeholder="مثال: إسهال مائي، ضعف عام، رفض الأكل..." rows={2} style={{ padding: '8px', border: '1px solid #ddd', borderRadius: '6px', width: '100%', fontSize: '13px', fontFamily: 'inherit', resize: 'vertical' }} />
                        </div>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '12px' }}>
                        <button onClick={handleSaveTreatment} style={{ background: '#2471a3', color: 'white', border: 'none', padding: '10px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>✓ حفظ</button>
                        <button onClick={() => setShowAddTreatment(false)} style={{ background: '#ddd', border: 'none', padding: '10px', borderRadius: '6px', cursor: 'pointer' }}>إلغاء</button>
                      </div>
                    </div>
                  ) : (
                    <button onClick={() => setShowAddTreatment(true)} style={{ width: '100%', padding: '11px', background: '#2471a3', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px', marginBottom: '15px' }}>➕ تسجيل علاج جديد</button>
                  )}

                  {/* قائمة العلاجات */}
                  {treatmentRecords.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '30px', color: '#bbb' }}>لا توجد سجلات علاج بعد</div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {[...treatmentRecords].sort((a, b) => new Date(b.date) - new Date(a.date)).map(tr => {
                        const resultColors = { success: '#27ae60', failed: '#e74c3c', died: '#7f8c8d', pending: '#e67e22' };
                        const resultLabels = { success: '✅ تعافى', failed: '❌ لم يتعافَ', died: '💀 نفق', pending: '⏳ جاري' };
                        return (
                          <div key={tr.id} style={{ background: 'white', border: '1px solid #eee', borderRadius: '10px', padding: '12px 15px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px', flexWrap: 'wrap' }}>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontWeight: 'bold', fontSize: '14px', color: '#1a1a1a' }}>
                                رقم {tr.animalNumber}
                                <span style={{ marginRight: '8px', fontSize: '12px', color: '#888' }}>{tr.animalType === 'sheep' ? '🐑' : tr.animalType === 'goat' ? '🐐' : '🐄'}</span>
                              </div>
                              <div style={{ fontSize: '12px', color: '#666', marginTop: '4px', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                                <span>📅 {new Date(tr.date).toLocaleDateString('ar-SA')}</span>
                                <span>💊 {tr.medicine}</span>
                                {tr.dose && <span>💉 {tr.dose}</span>}
                              </div>
                              {tr.notes && <div style={{ fontSize: '12px', color: '#888', marginTop: '4px', background: '#f9f9f9', padding: '4px 8px', borderRadius: '5px' }}>{tr.notes}</div>}
                            </div>
                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                              <span style={{ background: resultColors[tr.result] + '20', color: resultColors[tr.result], fontSize: '11px', padding: '3px 8px', borderRadius: '8px', fontWeight: 'bold', whiteSpace: 'nowrap' }}>{resultLabels[tr.result]}</span>
                              <button onClick={() => { if (window.confirm('حذف هذا السجل؟')) saveTreatments(treatmentRecords.filter(t => t.id !== tr.id)); }} style={{ background: '#fff0f0', border: '1px solid #e74c3c', color: '#e74c3c', borderRadius: '5px', padding: '4px 7px', cursor: 'pointer', fontSize: '12px' }}>🗑️</button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* ===== تبويب التجارب الناجحة ===== */}
              {vetTab === 'experiences' && (
                <div style={{ padding: '15px 20px' }}>
                  {/* نموذج إضافة تجربة */}
                  {showAddExperience ? (
                    <div style={{ background: '#fffbf0', border: '2px solid #d4ac0d', borderRadius: '10px', padding: '15px', marginBottom: '15px' }}>
                      <h4 style={{ color: '#b7950b', margin: '0 0 12px' }}>{editExperienceId ? '✏️ تعديل تجربة' : '➕ إضافة تجربة ناجحة'}</h4>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        <div>
                          <label style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>🦠 المرض أو الحالة *</label>
                          <input value={experienceForm.disease} onChange={e => setExperienceForm(p => ({ ...p, disease: e.target.value }))} placeholder="مثال: إسهال مائي حاد، التهاب رئوي..." style={{ padding: '8px', border: '1px solid #ddd', borderRadius: '6px', width: '100%', fontSize: '13px' }} />
                        </div>
                        <div>
                          <label style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>🔍 الأعراض</label>
                          <textarea value={experienceForm.symptoms} onChange={e => setExperienceForm(p => ({ ...p, symptoms: e.target.value }))} placeholder="صف الأعراض التي لاحظتها..." rows={2} style={{ padding: '8px', border: '1px solid #ddd', borderRadius: '6px', width: '100%', fontSize: '13px', fontFamily: 'inherit', resize: 'vertical' }} />
                        </div>
                        <div>
                          <label style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>💊 الدواء/الأدوية المستخدمة</label>
                          <input value={experienceForm.medicine} onChange={e => setExperienceForm(p => ({ ...p, medicine: e.target.value }))} placeholder="مثال: تايلوزين + بي كمبلكس" style={{ padding: '8px', border: '1px solid #ddd', borderRadius: '6px', width: '100%', fontSize: '13px' }} />
                        </div>
                        <div>
                          <label style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>📋 طريقة العلاج *</label>
                          <textarea value={experienceForm.treatment} onChange={e => setExperienceForm(p => ({ ...p, treatment: e.target.value }))} placeholder="اشرح طريقة العلاج بالتفصيل — الجرعة، المدة، التكرار..." rows={3} style={{ padding: '8px', border: '1px solid #ddd', borderRadius: '6px', width: '100%', fontSize: '13px', fontFamily: 'inherit', resize: 'vertical' }} />
                        </div>
                        <div>
                          <label style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '6px' }}>
                            ⭐ نسبة النجاح: <span style={{ color: '#d4ac0d', fontSize: '14px' }}>{experienceForm.successRate}%</span>
                          </label>
                          <input type="range" min="10" max="100" step="5" value={experienceForm.successRate} onChange={e => setExperienceForm(p => ({ ...p, successRate: parseInt(e.target.value) }))} style={{ width: '100%', accentColor: '#d4ac0d' }} />
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#bbb' }}><span>10%</span><span>50%</span><span>100%</span></div>
                        </div>
                        <div>
                          <label style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>📝 ملاحظات إضافية</label>
                          <textarea value={experienceForm.notes} onChange={e => setExperienceForm(p => ({ ...p, notes: e.target.value }))} placeholder="أي تفاصيل إضافية مفيدة..." rows={2} style={{ padding: '8px', border: '1px solid #ddd', borderRadius: '6px', width: '100%', fontSize: '13px', fontFamily: 'inherit', resize: 'vertical' }} />
                        </div>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '12px' }}>
                        <button onClick={handleSaveExperience} style={{ background: '#d4ac0d', color: 'white', border: 'none', padding: '10px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>✓ حفظ</button>
                        <button onClick={() => { setShowAddExperience(false); setEditExperienceId(null); setExperienceForm({ disease: '', symptoms: '', treatment: '', medicine: '', successRate: 90, notes: '' }); }} style={{ background: '#ddd', border: 'none', padding: '10px', borderRadius: '6px', cursor: 'pointer' }}>إلغاء</button>
                      </div>
                    </div>
                  ) : (
                    <button onClick={() => setShowAddExperience(true)} style={{ width: '100%', padding: '11px', background: '#d4ac0d', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px', marginBottom: '15px' }}>➕ إضافة تجربة ناجحة</button>
                  )}

                  {experiences.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '30px', color: '#bbb' }}>
                      <div style={{ fontSize: '36px', marginBottom: '8px' }}>📖</div>
                      <div>ابدأ بتوثيق تجاربك الناجحة — ستكون مرجعاً قيّماً</div>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {[...experiences].sort((a, b) => b.successRate - a.successRate).map(exp => {
                        const rateColor = exp.successRate >= 80 ? '#27ae60' : exp.successRate >= 60 ? '#e67e22' : '#e74c3c';
                        return (
                          <div key={exp.id} style={{ background: 'white', border: '1.5px solid #f0e68c', borderRadius: '12px', overflow: 'hidden' }}>
                            {/* رأس التجربة */}
                            <div style={{ background: '#fffbf0', padding: '12px 15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f0e68c' }}>
                              <div>
                                <div style={{ fontWeight: 'bold', fontSize: '15px', color: '#3D2817' }}>🦠 {exp.disease}</div>
                                {exp.medicine && <div style={{ fontSize: '12px', color: '#888', marginTop: '2px' }}>💊 {exp.medicine}</div>}
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <div style={{ textAlign: 'center', background: rateColor + '20', border: `2px solid ${rateColor}`, borderRadius: '8px', padding: '4px 10px' }}>
                                  <div style={{ fontSize: '16px', fontWeight: 'bold', color: rateColor }}>{exp.successRate}%</div>
                                  <div style={{ fontSize: '10px', color: rateColor }}>نجاح</div>
                                </div>
                                <button onClick={() => { setExperienceForm({ disease: exp.disease, symptoms: exp.symptoms || '', treatment: exp.treatment, medicine: exp.medicine || '', successRate: exp.successRate, notes: exp.notes || '' }); setEditExperienceId(exp.id); setShowAddExperience(true); }} style={{ background: '#f0f9f6', border: '1px solid #117a65', color: '#117a65', borderRadius: '6px', padding: '5px 8px', cursor: 'pointer', fontSize: '12px' }}>✏️</button>
                                <button onClick={() => { if (window.confirm('حذف هذه التجربة؟')) saveExperiences(experiences.filter(e => e.id !== exp.id)); }} style={{ background: '#fff0f0', border: '1px solid #e74c3c', color: '#e74c3c', borderRadius: '6px', padding: '5px 8px', cursor: 'pointer', fontSize: '12px' }}>🗑️</button>
                              </div>
                            </div>
                            {/* تفاصيل */}
                            <div style={{ padding: '12px 15px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                              {exp.symptoms && (
                                <div style={{ background: '#fef9e7', borderRadius: '6px', padding: '8px 10px' }}>
                                  <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#b7950b' }}>🔍 الأعراض: </span>
                                  <span style={{ fontSize: '12px', color: '#555' }}>{exp.symptoms}</span>
                                </div>
                              )}
                              <div style={{ background: '#f0f9f6', borderRadius: '6px', padding: '8px 10px' }}>
                                <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#117a65' }}>📋 طريقة العلاج: </span>
                                <span style={{ fontSize: '12px', color: '#555', whiteSpace: 'pre-wrap' }}>{exp.treatment}</span>
                              </div>
                              {exp.notes && (
                                <div style={{ background: '#f4f6f7', borderRadius: '6px', padding: '8px 10px' }}>
                                  <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#666' }}>📝 ملاحظات: </span>
                                  <span style={{ fontSize: '12px', color: '#555' }}>{exp.notes}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div style={{ padding: '13px 20px', borderTop: '1px solid #eee' }}>
              <button onClick={() => setShowVetLibrary(false)} style={{ width: '100%', background: '#117a65', color: 'white', border: 'none', padding: '11px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px' }}>إغلاق</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal المبيعات والأرباح */}
      {showSalesReport && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'flex-start', zIndex: 1000, padding: '20px', overflowY: 'auto' }} onClick={() => setShowSalesReport(false)}>
          <div style={{ background: 'white', borderRadius: '12px', maxWidth: '720px', width: '100%', marginTop: '20px', overflow: 'hidden' }} onClick={e => e.stopPropagation()}>

            {/* Header */}
            <div style={{ background: 'linear-gradient(135deg, #d4ac0d, #b7950b)', padding: '20px 25px', color: 'white' }}>
              <h2 style={{ margin: 0, fontSize: '18px' }}>💰 المبيعات والأرباح</h2>
              <p style={{ margin: '5px 0 0', fontSize: '12px', opacity: 0.9 }}>تتبع مبيعاتك وأرباحك في أي فترة زمنية</p>
            </div>

            {/* التبويبان */}
            <div style={{ display: 'flex', borderBottom: '2px solid #eee' }}>
              {[
                { key: 'sales', label: '📋 تقرير المبيعات' },
                { key: 'profits', label: '📊 تقرير الأرباح' },
              ].map(tab => (
                <button key={tab.key} onClick={() => setSalesReportTab(tab.key)} style={{ flex: 1, padding: '13px', background: salesReportTab === tab.key ? '#fef9e7' : 'white', border: 'none', borderBottom: salesReportTab === tab.key ? '3px solid #d4ac0d' : '3px solid transparent', cursor: 'pointer', fontWeight: salesReportTab === tab.key ? 'bold' : 'normal', color: salesReportTab === tab.key ? '#b7950b' : '#666', fontSize: '13px', transition: 'all 0.2s' }}>
                  {tab.label}
                </button>
              ))}
            </div>

            {/* الفلاتر */}
            <div style={{ padding: '15px 20px', background: '#fef9e7', borderBottom: '1px solid #f9e79f' }}>
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr 1fr', gap: '10px', alignItems: 'end' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#555', display: 'block', marginBottom: '4px' }}>نوع الحيوان</label>
                  <select value={salesReportType} onChange={e => setSalesReportType(e.target.value)} style={{ padding: '8px', border: '1px solid #ddd', borderRadius: '6px', width: '100%', fontSize: '13px' }}>
                    <option value="all">الكل</option>
                    {animalTypes.map(t => <option key={t} value={t}>{t === 'sheep' ? '🐑 ضان' : t === 'goat' ? '🐐 ماعز' : `🐄 ${t}`}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#555', display: 'block', marginBottom: '4px' }}>📅 من تاريخ</label>
                  <input type="date" value={salesDateFrom} onChange={e => setSalesDateFrom(e.target.value)} style={{ padding: '8px', border: '1px solid #ddd', borderRadius: '6px', width: '100%', fontSize: '13px' }} />
                </div>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#555', display: 'block', marginBottom: '4px' }}>📅 إلى تاريخ</label>
                  <input type="date" value={salesDateTo} onChange={e => setSalesDateTo(e.target.value)} style={{ padding: '8px', border: '1px solid #ddd', borderRadius: '6px', width: '100%', fontSize: '13px' }} />
                </div>
              </div>
            </div>

            {/* ملخص أرقام */}
            <div style={{ padding: '15px 20px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '10px', background: '#fffbf0', borderBottom: '1px solid #eee' }}>
              {[
                { label: 'عدد المبيعات', val: salesReportData.list.length, color: '#2471a3', icon: '🐑' },
                { label: 'إجمالي البيع', val: salesReportData.totalSales.toLocaleString() + ' ر', color: '#27ae60', icon: '💵' },
                { label: 'إجمالي الشراء', val: salesReportData.totalCost.toLocaleString() + ' ر', color: '#e67e22', icon: '🛒' },
                { label: 'صافي الربح', val: salesReportData.totalProfit.toLocaleString() + ' ر', color: salesReportData.totalProfit >= 0 ? '#27ae60' : '#e74c3c', icon: salesReportData.totalProfit >= 0 ? '📈' : '📉' },
              ].map(s => (
                <div key={s.label} style={{ background: 'white', borderRadius: '8px', padding: '10px', textAlign: 'center', border: '1px solid #f0e68c' }}>
                  <div style={{ fontSize: '16px', fontWeight: 'bold', color: s.color }}>{s.icon} {s.val}</div>
                  <div style={{ fontSize: '11px', color: '#888', marginTop: '3px' }}>{s.label}</div>
                </div>
              ))}
            </div>

            {/* المحتوى حسب التبويب */}
            <div style={{ padding: '15px 20px', maxHeight: '420px', overflowY: 'auto' }}>
              {salesReportData.list.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '50px', color: '#999' }}>
                  <div style={{ fontSize: '40px', marginBottom: '10px' }}>📭</div>
                  <div>لا توجد مبيعات في هذه الفترة</div>
                  {!salesDateFrom && <div style={{ fontSize: '12px', marginTop: '8px', color: '#bbb' }}>حدد تاريخ البداية لتصفية النتائج</div>}
                </div>
              ) : salesReportTab === 'sales' ? (
                // ===== تبويب المبيعات =====
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {salesReportData.list.map((animal, i) => (
                    <div key={`${animal.type}-${animal.id}`} style={{ background: 'white', border: '1px solid #f0e68c', borderRadius: '10px', padding: '12px 15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                      <div>
                        <div style={{ fontWeight: 'bold', fontSize: '15px', color: '#3D2817' }}>
                          #{animal.number}
                          <span style={{ marginRight: '8px', fontSize: '12px', color: '#888' }}>{animal.type === 'sheep' ? '🐑 ضان' : animal.type === 'goat' ? '🐐 ماعز' : `🐄 ${animal.type}`}</span>
                        </div>
                        <div style={{ fontSize: '12px', color: '#888', marginTop: '3px' }}>
                          📅 تاريخ البيع: {new Date(animal.saleDate).toLocaleDateString('ar-SA')}
                          {animal.purchaseDate && <span style={{ marginRight: '10px' }}>🛒 تاريخ الشراء: {new Date(animal.purchaseDate).toLocaleDateString('ar-SA')}</span>}
                        </div>
                      </div>
                      <div style={{ textAlign: 'left', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                        {animal.purchasePriceNum > 0 && (
                          <div style={{ background: '#fdebd0', borderRadius: '6px', padding: '6px 10px', textAlign: 'center' }}>
                            <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#e67e22' }}>{animal.purchasePriceNum.toLocaleString()} ر</div>
                            <div style={{ fontSize: '10px', color: '#e67e22' }}>سعر الشراء</div>
                          </div>
                        )}
                        <div style={{ background: '#d5f5e3', borderRadius: '6px', padding: '6px 10px', textAlign: 'center' }}>
                          <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#27ae60' }}>{animal.salePriceNum.toLocaleString()} ر</div>
                          <div style={{ fontSize: '10px', color: '#27ae60' }}>سعر البيع</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                // ===== تبويب الأرباح =====
                <div>
                  {salesReportData.withProfit.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '30px', background: '#fef9e7', borderRadius: '10px', color: '#b7950b' }}>
                      <div style={{ fontSize: '30px', marginBottom: '8px' }}>⚠️</div>
                      <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>لا يوجد سعر شراء مسجل</div>
                      <div style={{ fontSize: '12px' }}>عند إضافة أو تعديل حيوان، أدخل "سعر الشراء" لحساب الربح الصافي</div>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {salesReportData.withProfit
                        .sort((a, b) => b.profit - a.profit)
                        .map(animal => {
                          const isProfit = animal.profit >= 0;
                          return (
                            <div key={`${animal.type}-${animal.id}`} style={{ background: isProfit ? '#f9fff9' : '#fff9f9', border: `1px solid ${isProfit ? '#a9dfbf' : '#f1948a'}`, borderRadius: '10px', padding: '12px 15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                              <div>
                                <div style={{ fontWeight: 'bold', fontSize: '15px', color: '#3D2817' }}>
                                  #{animal.number}
                                  <span style={{ marginRight: '8px', fontSize: '12px', color: '#888' }}>{animal.type === 'sheep' ? '🐑' : animal.type === 'goat' ? '🐐' : '🐄'}</span>
                                </div>
                                <div style={{ fontSize: '12px', color: '#888', marginTop: '3px', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                                  <span>🛒 شراء: {animal.purchasePriceNum.toLocaleString()} ر</span>
                                  <span>💵 بيع: {animal.salePriceNum.toLocaleString()} ر</span>
                                  <span>📅 {new Date(animal.saleDate).toLocaleDateString('ar-SA')}</span>
                                </div>
                              </div>
                              <div style={{ background: isProfit ? '#27ae60' : '#e74c3c', color: 'white', borderRadius: '8px', padding: '8px 14px', textAlign: 'center', minWidth: '90px' }}>
                                <div style={{ fontSize: '16px', fontWeight: 'bold' }}>{isProfit ? '+' : ''}{animal.profit.toLocaleString()}</div>
                                <div style={{ fontSize: '10px', opacity: 0.9 }}>ريال {isProfit ? 'ربح' : 'خسارة'}</div>
                              </div>
                            </div>
                          );
                        })}
                      {/* ملخص نهائي */}
                      <div style={{ background: salesReportData.totalProfit >= 0 ? '#d5f5e3' : '#fadbd8', borderRadius: '10px', padding: '15px', marginTop: '5px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: `2px solid ${salesReportData.totalProfit >= 0 ? '#27ae60' : '#e74c3c'}` }}>
                        <span style={{ fontWeight: 'bold', fontSize: '14px', color: '#333' }}>📊 إجمالي الأرباح ({salesReportData.withProfit.length} حيوان)</span>
                        <span style={{ fontWeight: 'bold', fontSize: '18px', color: salesReportData.totalProfit >= 0 ? '#27ae60' : '#e74c3c' }}>
                          {salesReportData.totalProfit >= 0 ? '+' : ''}{salesReportData.totalProfit.toLocaleString()} ريال
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div style={{ padding: '15px 20px', borderTop: '1px solid #eee' }}>
              <button onClick={() => setShowSalesReport(false)} style={{ width: '100%', background: '#d4ac0d', color: 'white', border: 'none', padding: '12px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px' }}>إغلاق</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal تقرير الأرقام */}
      {showNumbersReport && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'flex-start', zIndex: 1000, padding: '20px', overflowY: 'auto' }} onClick={() => setShowNumbersReport(false)}>
          <div style={{ background: 'white', borderRadius: '12px', maxWidth: '680px', width: '100%', marginTop: '20px', overflow: 'hidden' }} onClick={e => e.stopPropagation()}>

            {/* Header */}
            <div style={{ background: 'linear-gradient(135deg, #2471a3, #1a5276)', padding: '20px 25px', color: 'white' }}>
              <h2 style={{ margin: 0, fontSize: '18px' }}>🔢 تقرير الأرقام</h2>
              <p style={{ margin: '5px 0 0', fontSize: '12px', opacity: 0.85 }}>عرض كل الأرقام وإمكانية إعادة تفعيلها</p>
            </div>

            {/* فلاتر */}
            <div style={{ padding: '15px 20px', background: '#f0f4f8', borderBottom: '1px solid #ddd' }}>
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#555', display: 'block', marginBottom: '4px' }}>نوع الحيوان</label>
                  <select value={numbersReportType} onChange={e => setNumbersReportType(e.target.value)} style={{ padding: '8px', border: '1px solid #ddd', borderRadius: '6px', width: '100%', fontSize: '13px' }}>
                    <option value="all">الكل</option>
                    {animalTypes.map(t => <option key={t} value={t}>{t === 'sheep' ? '🐑 ضان' : t === 'goat' ? '🐐 ماعز' : `🐄 ${t}`}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#555', display: 'block', marginBottom: '4px' }}>تصفية حسب الحالة</label>
                  <select value={numbersReportFilter} onChange={e => setNumbersReportFilter(e.target.value)} style={{ padding: '8px', border: '1px solid #ddd', borderRadius: '6px', width: '100%', fontSize: '13px' }}>
                    <option value="all">الكل ({numbersReportData.all.length})</option>
                    <option value="active">✅ الموجودة ({numbersReportData.active.length})</option>
                    <option value="sold">💰 المباعة ({numbersReportData.sold.length})</option>
                    <option value="dead">🔪 المذبوحة/الميتة ({numbersReportData.dead.length})</option>
                    <option value="reuse">♻️ قابلة للإعادة ({numbersReportData.reuse.length})</option>
                  </select>
                </div>
              </div>

              {/* ملخص سريع */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
                {[
                  { label: 'الكل', val: numbersReportData.all.length, color: '#2471a3', bg: '#d6eaf8' },
                  { label: '✅ موجود', val: numbersReportData.active.length, color: '#27ae60', bg: '#d5f5e3' },
                  { label: '💰 مباع', val: numbersReportData.sold.length, color: '#e67e22', bg: '#fdebd0' },
                  { label: '🔪 ذُبح', val: numbersReportData.dead.length, color: '#e74c3c', bg: '#fadbd8' },
                ].map(s => (
                  <div key={s.label} style={{ background: s.bg, borderRadius: '8px', padding: '8px', textAlign: 'center' }}>
                    <div style={{ fontSize: '18px', fontWeight: 'bold', color: s.color }}>{s.val}</div>
                    <div style={{ fontSize: '11px', color: s.color }}>{s.label}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* القائمة */}
            <div style={{ padding: '15px 20px', maxHeight: '420px', overflowY: 'auto' }}>
              {(() => {
                const list = numbersReportFilter === 'all' ? numbersReportData.all
                  : numbersReportFilter === 'active' ? numbersReportData.active
                  : numbersReportFilter === 'sold' ? numbersReportData.sold
                  : numbersReportFilter === 'dead' ? numbersReportData.dead
                  : numbersReportData.reuse;
                if (list.length === 0) return (
                  <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
                    <div style={{ fontSize: '36px', marginBottom: '10px' }}>📭</div>
                    <div>لا توجد أرقام في هذه الفئة</div>
                  </div>
                );
                return (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {list.map(animal => {
                      const isActive = animal.status === 'active' || animal.status === 'productive';
                      const isSold = animal.status === 'sold';
                      const isDead = animal.status === 'slaughtered' || animal.status === 'dead';
                      const statusColor = isActive ? '#27ae60' : isSold ? '#e67e22' : '#e74c3c';
                      const statusBg = isActive ? '#d5f5e3' : isSold ? '#fdebd0' : '#fadbd8';
                      const statusLabel = isActive ? '✅ موجود' : isSold ? '💰 مباع' : '🔪 مذبوح/ميت';
                      const canReuse = !isActive;
                      return (
                        <div key={`${animal.type}-${animal.id}`} style={{ background: 'white', border: '1px solid #e8e8e8', borderRadius: '10px', padding: '12px 15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                              <span style={{ fontWeight: 'bold', fontSize: '16px', color: '#1a5276' }}>#{animal.number}</span>
                              <span style={{ fontSize: '11px', background: statusBg, color: statusColor, padding: '2px 8px', borderRadius: '10px', fontWeight: 'bold' }}>{statusLabel}</span>
                              <span style={{ fontSize: '11px', color: '#888' }}>{animal.type === 'sheep' ? '🐑 ضان' : animal.type === 'goat' ? '🐐 ماعز' : `🐄 ${animal.type}`}</span>
                            </div>
                            <div style={{ fontSize: '12px', color: '#888', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                              <span>{animal.gender === 'male' ? '🐏 ذكر' : '🐑 أنثى'}</span>
                              <span>📅 {formatAge(animal.birthDate)}</span>
                              {isSold && animal.saleDate && <span>💰 بيع: {animal.saleDate}</span>}
                              {isSold && animal.salePrice && <span>💵 {animal.salePrice} ريال</span>}
                              {isDead && animal.slaughterDate && <span>📅 ذُبح: {animal.slaughterDate}</span>}
                            </div>
                          </div>
                          {/* زر إعادة التفعيل */}
                          {canReuse && (
                            <button
                              onClick={() => handleReactivate(animal)}
                              style={{ background: '#27ae60', color: 'white', border: 'none', borderRadius: '8px', padding: '8px 12px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold', whiteSpace: 'nowrap', marginRight: '8px' }}
                            >
                              ♻️ إعادة تفعيل
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>

            {/* Footer */}
            <div style={{ padding: '15px 20px', borderTop: '1px solid #eee' }}>
              <button onClick={() => setShowNumbersReport(false)} style={{ width: '100%', background: '#2471a3', color: 'white', border: 'none', padding: '12px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px' }}>إغلاق</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal تقرير العويد */}
      {showAgeReport && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'flex-start', zIndex: 1000, padding: '20px', overflowY: 'auto' }} onClick={() => setShowAgeReport(false)}>
          <div style={{ background: 'white', borderRadius: '12px', maxWidth: '650px', width: '100%', marginTop: '20px', overflow: 'hidden' }} onClick={e => e.stopPropagation()}>
            
            {/* Header */}
            <div style={{ background: 'linear-gradient(135deg, #8e44ad, #6c3483)', padding: '20px 25px', color: 'white' }}>
              <h2 style={{ margin: 0, fontSize: '18px' }}>👴 تقرير العويد والكبار</h2>
              <p style={{ margin: '5px 0 0', fontSize: '12px', opacity: 0.85 }}>الحيوانات النشطة مرتبة من الأكبر للأصغر</p>
            </div>

            {/* فلاتر */}
            <div style={{ padding: '20px 25px', background: '#f9f7f4', borderBottom: '1px solid #eee' }}>
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr 1fr', gap: '12px', alignItems: 'end' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#555', display: 'block', marginBottom: '5px' }}>نوع الحيوان</label>
                  <select
                    value={ageReportFilter.type}
                    onChange={e => setAgeReportFilter(p => ({ ...p, type: e.target.value }))}
                    style={{ padding: '8px', border: '1px solid #ddd', borderRadius: '6px', width: '100%', fontSize: '13px' }}
                  >
                    <option value="all">الكل</option>
                    {animalTypes.map(t => (
                      <option key={t} value={t}>{t === 'sheep' ? '🐑 ضان' : t === 'goat' ? '🐐 ماعز' : `🐄 ${t}`}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#555', display: 'block', marginBottom: '5px' }}>الحد الأدنى للعمر (سنوات)</label>
                  <input
                    type="number" min="0" max="30"
                    value={ageReportFilter.minYears}
                    onChange={e => setAgeReportFilter(p => ({ ...p, minYears: parseInt(e.target.value) || 0 }))}
                    style={{ padding: '8px', border: '1px solid #ddd', borderRadius: '6px', width: '100%', fontSize: '13px' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#555', display: 'block', marginBottom: '5px' }}>الأشهر الإضافية</label>
                  <select
                    value={ageReportFilter.minMonths}
                    onChange={e => setAgeReportFilter(p => ({ ...p, minMonths: parseInt(e.target.value) }))}
                    style={{ padding: '8px', border: '1px solid #ddd', borderRadius: '6px', width: '100%', fontSize: '13px' }}
                  >
                    {[0,1,2,3,4,5,6,7,8,9,10,11].map(m => <option key={m} value={m}>{m} شهر</option>)}
                  </select>
                </div>
              </div>
              <div style={{ marginTop: '10px', fontSize: '13px', color: '#8e44ad', fontWeight: 'bold' }}>
                🔍 عرض الحيوانات التي عمرها أكثر من {ageReportFilter.minYears} سنة {ageReportFilter.minMonths > 0 ? `و ${ageReportFilter.minMonths} شهر` : ''} — النتائج: {ageReportAnimals.length}
              </div>
            </div>

            {/* النتائج */}
            <div style={{ padding: '15px 25px', maxHeight: '400px', overflowY: 'auto' }}>
              {ageReportAnimals.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
                  <div style={{ fontSize: '40px', marginBottom: '10px' }}>🔍</div>
                  <div>لا توجد حيوانات بهذا العمر</div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {ageReportAnimals.map((animal, index) => (
                    <div key={`${animal.type}-${animal.id}`} style={{ background: index === 0 ? '#fdf3ff' : '#f9f9f9', border: `2px solid ${index === 0 ? '#8e44ad' : '#eee'}`, borderRadius: '10px', padding: '12px 15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        {/* ترتيب */}
                        <div style={{ background: index === 0 ? '#8e44ad' : '#ddd', color: index === 0 ? 'white' : '#555', borderRadius: '50%', width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '13px', flexShrink: 0 }}>
                          {index + 1}
                        </div>
                        <div>
                          <div style={{ fontWeight: 'bold', fontSize: '15px', color: '#3D2817' }}>
                            رقم {animal.number}
                            {index === 0 && <span style={{ marginRight: '6px', fontSize: '12px', background: '#8e44ad', color: 'white', padding: '2px 6px', borderRadius: '4px' }}>الأكبر</span>}
                          </div>
                          <div style={{ fontSize: '12px', color: '#666', marginTop: '2px' }}>
                            {animal.type === 'sheep' ? '🐑 ضان' : animal.type === 'goat' ? '🐐 ماعز' : `🐄 ${animal.type}`}
                            {' · '}
                            {animal.gender === 'male' ? '🐏 ذكر' : '🐑 أنثى'}
                            {animal.healthStatus === 'sick' && <span style={{ color: '#e74c3c', marginRight: '6px' }}> · ⚠️ مريض</span>}
                          </div>
                        </div>
                      </div>
                      {/* العمر */}
                      <div style={{ textAlign: 'center', background: 'white', padding: '8px 12px', borderRadius: '8px', border: '1px solid #ddd', minWidth: '90px' }}>
                        <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#8e44ad' }}>{animal.ageYears > 0 ? `${animal.ageYears} سنة` : ''}</div>
                        <div style={{ fontSize: '13px', color: '#888' }}>{animal.ageMonths > 0 ? `${animal.ageMonths} شهر` : animal.ageYears > 0 ? 'كاملة' : ''}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            <div style={{ padding: '15px 25px', borderTop: '1px solid #eee' }}>
              <button onClick={() => setShowAgeReport(false)} style={{ width: '100%', background: '#8e44ad', color: 'white', border: 'none', padding: '12px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px' }}>إغلاق</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;

    
