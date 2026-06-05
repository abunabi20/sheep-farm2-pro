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

  // ===== نظام مراقبة المواطير =====
  const [showPumpSystem, setShowPumpSystem] = useState(false);
  const [pumpTab, setPumpTab] = useState('pumps'); // pumps | oil | spark | brands
  const [pumps, setPumps] = useState(() => {
    const s = localStorage.getItem('pumpData');
    return s ? JSON.parse(s) : [];
  });
  const [selectedPumpId, setSelectedPumpId] = useState(null);
  const [showAddPump, setShowAddPump] = useState(false);
  const [editPumpId, setEditPumpId] = useState(null);
  const [pumpForm, setPumpForm] = useState({
    name: '', brand: '', purchaseDate: '', lifespan: 730,
    purchaseValue: '',
    status: 'active', notes: '',
    oilType: '', oilCapacity: '', oilInterval: 14, oilChangeHistory: [],
    sparkHistory: [],
  });
  const [showAddOilChange, setShowAddOilChange] = useState(false);
  const [oilChangeForm, setOilChangeForm] = useState({ date: new Date().toISOString().split('T')[0], boxes: 1, cost: '', notes: '' });
  const [showAddSpark, setShowAddSpark] = useState(false);
  const [sparkForm, setSparkForm] = useState({ date: new Date().toISOString().split('T')[0], brand: '', cost: '', notes: '' });
  const [pumpBrands, setPumpBrands] = useState(() => {
    const s = localStorage.getItem('pumpBrands');
    return s ? JSON.parse(s) : [];
  });
  const [showAddBrand, setShowAddBrand] = useState(false);
  const [brandForm, setBrandForm] = useState({ name: '', rating: 'good', review: '', price: '' });

  // ===== تتبع البنزين =====
  const [petrolRecords, setPetrolRecords] = useState(() => {
    const s = localStorage.getItem('petrolRecords');
    return s ? JSON.parse(s) : [];
  });
  const [showAddPetrol, setShowAddPetrol] = useState(false);
  const [petrolForm, setPetrolForm] = useState({
    pumpId: '', date: new Date().toISOString().split('T')[0],
    price: '', notes: ''
  });

  // ===== نظام الأعلاف =====
  const DEFAULT_FEEDS = [
    { id: 'f1', name: 'شعير', unit: 'كيس', unitWeight: 50, stock: 0, minAlert: 5 },
    { id: 'f2', name: 'برسيم', unit: 'كيس', unitWeight: 30, stock: 0, minAlert: 3 },
    { id: 'f3', name: 'رودس', unit: 'كيس', unitWeight: 30, stock: 0, minAlert: 3 },
    { id: 'f4', name: 'تبن', unit: 'ربطة', unitWeight: 10, stock: 0, minAlert: 5 },
    { id: 'f5', name: 'مكعب وافي', unit: 'كيس', unitWeight: 40, stock: 0, minAlert: 3 },
    { id: 'f6', name: 'مكعب فيدكو', unit: 'كيس', unitWeight: 40, stock: 0, minAlert: 3 },
  ];
  // استهلاك يومي افتراضي لكل نوع حيوان (كجم/حيوان/يوم)
  const DEFAULT_CONSUMPTION = {
    sheep: { شعير: 0.5, برسيم: 0.5, رودس: 0.5, تبن: 0, 'مكعب وافي': 0.5, 'مكعب فيدكو': 0 },
    goat:  { شعير: 0.5, برسيم: 0.5, رودس: 0.5, تبن: 0, 'مكعب وافي': 0.5, 'مكعب فيدكو': 0 },
  };
  const [showFeedSystem, setShowFeedSystem] = useState(false);
  const [feedTab, setFeedTab] = useState('stock'); // stock | purchases | consumption | forecast
  const [feeds, setFeeds] = useState(() => { const s = localStorage.getItem('feedData'); return s ? JSON.parse(s) : DEFAULT_FEEDS; });
  const [feedPurchases, setFeedPurchases] = useState(() => { const s = localStorage.getItem('feedPurchases'); return s ? JSON.parse(s) : []; });
  const [feedConsumption, setFeedConsumption] = useState(() => { const s = localStorage.getItem('feedConsumption'); return s ? JSON.parse(s) : DEFAULT_CONSUMPTION; });
  const [showAddFeed, setShowAddFeed] = useState(false);
  const [editFeedId, setEditFeedId] = useState(null);
  const [feedForm, setFeedForm] = useState({ name: '', unit: 'كيس', unitWeight: 50, stock: 0, minAlert: 3 });
  const [showAddPurchase, setShowAddPurchase] = useState(false);
  const [purchaseForm, setPurchaseForm] = useState({ feedId: '', date: new Date().toISOString().split('T')[0], qty: '', pricePerUnit: '', notes: '' });

  // ===== نظام الطاقة الشمسية =====
  const [showSolarSystem, setShowSolarSystem] = useState(false);
  const [solarTab, setSolarTab] = useState('batteries'); // batteries | panels | inverter | costs
  const [batteries, setBatteries] = useState(() => {
    const s = localStorage.getItem('solarBatteries');
    return s ? JSON.parse(s) : [];
  });
  const [showAddBattery, setShowAddBattery] = useState(false);
  const [editBatteryId, setEditBatteryId] = useState(null);
  const [batteryForm, setBatteryForm] = useState({
    name: '', location: '', brand: '', country: '',
    capacity: '', voltage: '', purchaseDate: '',
    warrantyYears: 1, lifespanYears: 2, purchasePrice: '', notes: ''
  });
  const [panels, setPanels] = useState(() => {
    const s = localStorage.getItem('solarPanels');
    return s ? JSON.parse(s) : [];
  });
  const [showAddPanel, setShowAddPanel] = useState(false);
  const [editPanelId, setEditPanelId] = useState(null);
  const [panelForm, setPanelForm] = useState({
    name: '', location: '', description: '',
    lastWash: '', washIntervalDays: 60, notes: ''
  });
  const [inverters, setInverters] = useState(() => {
    const s = localStorage.getItem('solarInverters');
    return s ? JSON.parse(s) : [];
  });
  const [showAddInverter, setShowAddInverter] = useState(false);
  const [editInverterId, setEditInverterId] = useState(null);
  const [inverterForm, setInverterForm] = useState({
    name: '', brand: '', capacity: '', purchaseDate: '',
    warrantyYears: 2, purchasePrice: '', notes: ''
  });

  // ===== نظام مراقبة الغاز =====
  const [showGasSystem, setShowGasSystem] = useState(false);
  const [gasTab, setGasTab] = useState('cylinders'); // cylinders | refills | stats
  const [gasCylinders, setGasCylinders] = useState(() => {
    const s = localStorage.getItem('gasCylinders');
    return s ? JSON.parse(s) : [];
  });
  const [showAddCylinder, setShowAddCylinder] = useState(false);
  const [editCylinderId, setEditCylinderId] = useState(null);
  const [cylinderForm, setCylinderForm] = useState({
    name: '', description: '', location: '', sizeKg: 25, notes: ''
  });
  const [showAddRefill, setShowAddRefill] = useState(false);
  const [refillCylinderId, setRefillCylinderId] = useState(null);
  const [refillForm, setRefillForm] = useState({
    date: new Date().toISOString().split('T')[0], price: '', notes: ''
  });

  // ===== نظام إدارة العمال =====
  const [showWorkersSystem, setShowWorkersSystem] = useState(false);
  const [workersTab, setWorkersTab] = useState('list'); // list | costs | summary
  const [workers, setWorkers] = useState(() => {
    const s = localStorage.getItem('workersData');
    return s ? JSON.parse(s) : [];
  });
  const [showAddWorker, setShowAddWorker] = useState(false);
  const [editWorkerId, setEditWorkerId] = useState(null);
  const [workerForm, setWorkerForm] = useState({
    name: '', description: '', nationality: '', salary: '',
    startDate: '', status: 'active', // active | travel | sick | vacation | terminated
    notes: ''
  });
  const [showAddWorkerCost, setShowAddWorkerCost] = useState(false);
  const [workerCostWorkerId, setWorkerCostWorkerId] = useState(null);
  const [workerCostForm, setWorkerCostForm] = useState({
    date: new Date().toISOString().split('T')[0],
    type: 'residence', // residence | ticket | medical | other
    amount: '', description: '', notes: ''
  });
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

  // ===== دوال المواطير =====
  const savePumps = useCallback((updated) => {
    setPumps(updated);
    localStorage.setItem('pumpData', JSON.stringify(updated));
    if (user) set(ref(database, `users/${user.id}/pumps`), updated).catch(() => {});
  }, [user]);

  const savePumpBrands = useCallback((updated) => {
    setPumpBrands(updated);
    localStorage.setItem('pumpBrands', JSON.stringify(updated));
    if (user) set(ref(database, `users/${user.id}/pumpBrands`), updated).catch(() => {});
  }, [user]);

  // تحميل بيانات المواطير من Firebase
  useEffect(() => {
    if (!user) return;
    onValue(ref(database, `users/${user.id}/pumps`), (snap) => { if (snap.exists()) setPumps(snap.val()); }, { onlyOnce: true });
    onValue(ref(database, `users/${user.id}/pumpBrands`), (snap) => { if (snap.exists()) setPumpBrands(snap.val()); }, { onlyOnce: true });
  }, [user]);

  // ===== دوال البنزين =====
  const savePetrolRecords = useCallback((updated) => {
    setPetrolRecords(updated);
    localStorage.setItem('petrolRecords', JSON.stringify(updated));
    if (user) set(ref(database, `users/${user.id}/petrolRecords`), updated).catch(() => {});
  }, [user]);

  useEffect(() => {
    if (!user) return;
    onValue(ref(database, `users/${user.id}/petrolRecords`), (snap) => { if (snap.exists()) setPetrolRecords(snap.val()); }, { onlyOnce: true });
  }, [user]);

  const petrolStats = useMemo(() => {
    // احسب لكل ماطور
    return pumps.map(pump => {
      const records = [...petrolRecords.filter(r => r.pumpId === pump.id)]
        .sort((a, b) => new Date(a.date) - new Date(b.date));
      if (records.length === 0) return { ...pump, records: [], avgDays: null, lastFill: null, daysLeft: null, totalSpent: 0, needsAlert: false };
      const totalSpent = records.reduce((s, r) => s + (parseFloat(r.price) || 0), 0);
      const lastFill = records[records.length - 1];
      const daysSinceLast = Math.floor((new Date() - new Date(lastFill.date)) / 86400000);
      let avgDays = null;
      if (records.length >= 2) {
        const gaps = [];
        for (let i = 1; i < records.length; i++) {
          const gap = Math.floor((new Date(records[i].date) - new Date(records[i-1].date)) / 86400000);
          if (gap > 0) gaps.push(gap);
        }
        if (gaps.length > 0) avgDays = Math.round(gaps.reduce((a, b) => a + b, 0) / gaps.length);
      }
      const daysLeft = avgDays ? Math.max(0, avgDays - daysSinceLast) : null;
      const alertDays = avgDays ? Math.round(avgDays * 0.25) : 3;
      const needsAlert = daysLeft !== null && daysLeft <= alertDays;
      const avgPrice = records.length > 0 ? totalSpent / records.length : 0;
      const monthlyCost = avgDays ? (avgPrice / avgDays) * 30 : null;
      const yearlyCost = avgDays ? (avgPrice / avgDays) * 365 : null;
      const nextEstimate = avgDays ? new Date(new Date(lastFill.date).getTime() + avgDays * 86400000).toISOString().split('T')[0] : null;
      const pct = avgDays && daysLeft !== null ? Math.round((daysLeft / avgDays) * 100) : null;
      return { ...pump, records, avgDays, lastFill, daysSinceLast, daysLeft, totalSpent, needsAlert, alertDays, avgPrice, monthlyCost, yearlyCost, nextEstimate, pct };
    });
  }, [pumps, petrolRecords]);

  const petrolTotalStats = useMemo(() => {
    const total = petrolStats.reduce((s, p) => s + p.totalSpent, 0);
    const monthly = petrolStats.reduce((s, p) => s + (p.monthlyCost || 0), 0);
    const yearly = petrolStats.reduce((s, p) => s + (p.yearlyCost || 0), 0);
    return { total, monthly, yearly };
  }, [petrolStats]);

  const handleSavePetrol = () => {
    if (!petrolForm.pumpId || !petrolForm.date) { alert('اختر الماطور وأدخل التاريخ'); return; }
    const newRecord = { id: `pet_${Date.now()}`, ...petrolForm, price: parseFloat(petrolForm.price) || 0 };
    savePetrolRecords([...petrolRecords, newRecord]);
    setPetrolForm({ pumpId: '', date: new Date().toISOString().split('T')[0], price: '', notes: '' });
    setShowAddPetrol(false);
  };

  // حساب الأيام المتبقية من العمر الافتراضي
  const pumpRemainingDays = (purchaseDate, lifespan) => {
    if (!purchaseDate) return null;
    const elapsed = Math.floor((new Date() - new Date(purchaseDate)) / (1000 * 60 * 60 * 24));
    return Math.max(0, lifespan - elapsed);
  };

  // حساب متى آخر تغيير زيت وكم باقي
  const oilStatus = (pump) => {
    const history = pump.oilChangeHistory || [];
    if (history.length === 0) return { lastDate: null, daysAgo: null, daysLeft: null, due: false };
    const sorted = [...history].sort((a, b) => new Date(b.date) - new Date(a.date));
    const lastDate = sorted[0].date;
    const daysAgo = Math.floor((new Date() - new Date(lastDate)) / (1000 * 60 * 60 * 24));
    const interval = parseInt(pump.oilInterval) || 14;
    const daysLeft = interval - daysAgo;
    return { lastDate, daysAgo, daysLeft, due: daysLeft <= 3 };
  };

  // حساب كمية الزيت المطلوبة
  const oilRequired = (pump) => {
    const capacity = parseFloat(pump.oilCapacity) || 0;
    if (!capacity) return null;
    const interval = parseInt(pump.oilInterval) || 14;
    return { capacity, perChange: capacity, weeksInterval: (interval / 7).toFixed(1) };
  };

  const handleSavePump = () => {
    if (!pumpForm.name) { alert('أدخل اسم الماطور'); return; }
    let updated;
    const pumpData = {
      ...pumpForm,
      lifespan: parseInt(pumpForm.lifespan) || 730,
      oilInterval: parseInt(pumpForm.oilInterval) || 14,
    };
    if (editPumpId) {
      updated = pumps.map(p => p.id === editPumpId ? { ...p, ...pumpData } : p);
    } else {
      updated = [...pumps, { id: `pump_${Date.now()}`, ...pumpData, oilChangeHistory: [], sparkHistory: [] }];
    }
    savePumps(updated);
    setPumpForm({ name: '', brand: '', purchaseDate: '', lifespan: 730, purchaseValue: '', status: 'active', notes: '', oilType: '', oilCapacity: '', oilInterval: 14, oilChangeHistory: [], sparkHistory: [] });
    setEditPumpId(null);
    setShowAddPump(false);
  };

  const handleSaveOilChange = () => {
    if (!oilChangeForm.date) { alert('أدخل التاريخ'); return; }
    const pump = pumps.find(p => p.id === selectedPumpId);
    if (!pump) return;
    const history = pump.oilChangeHistory || [];
    const newRecord = { id: `oil_${Date.now()}`, ...oilChangeForm, boxes: parseFloat(oilChangeForm.boxes) || 1, cost: parseFloat(oilChangeForm.cost) || 0 };
    const updated = pumps.map(p => p.id === selectedPumpId ? { ...p, oilChangeHistory: [...history, newRecord] } : p);
    savePumps(updated);
    setOilChangeForm({ date: new Date().toISOString().split('T')[0], boxes: 1, cost: '', notes: '' });
    setShowAddOilChange(false);
  };

  const handleSaveSpark = () => {
    if (!sparkForm.date) { alert('أدخل التاريخ'); return; }
    const pump = pumps.find(p => p.id === selectedPumpId);
    if (!pump) return;
    const history = pump.sparkHistory || [];
    const newRecord = { id: `spark_${Date.now()}`, ...sparkForm, cost: parseFloat(sparkForm.cost) || 0 };
    const updated = pumps.map(p => p.id === selectedPumpId ? { ...p, sparkHistory: [...history, newRecord] } : p);
    savePumps(updated);
    setSparkForm({ date: new Date().toISOString().split('T')[0], brand: '', cost: '', notes: '' });
    setShowAddSpark(false);
  };

  // ===== دوال الأعلاف =====
  const saveFeeds = useCallback((updated) => {
    setFeeds(updated);
    localStorage.setItem('feedData', JSON.stringify(updated));
    if (user) set(ref(database, `users/${user.id}/feeds`), updated).catch(() => {});
  }, [user]);

  const saveFeedPurchases = useCallback((updated) => {
    setFeedPurchases(updated);
    localStorage.setItem('feedPurchases', JSON.stringify(updated));
    if (user) set(ref(database, `users/${user.id}/feedPurchases`), updated).catch(() => {});
  }, [user]);

  const saveFeedConsumption = useCallback((updated) => {
    setFeedConsumption(updated);
    localStorage.setItem('feedConsumption', JSON.stringify(updated));
    if (user) set(ref(database, `users/${user.id}/feedConsumption`), updated).catch(() => {});
  }, [user]);

  // تحميل بيانات الأعلاف من Firebase
  useEffect(() => {
    if (!user) return;
    onValue(ref(database, `users/${user.id}/feeds`), (snap) => { if (snap.exists()) setFeeds(snap.val()); }, { onlyOnce: true });
    onValue(ref(database, `users/${user.id}/feedPurchases`), (snap) => { if (snap.exists()) setFeedPurchases(snap.val()); }, { onlyOnce: true });
    onValue(ref(database, `users/${user.id}/feedConsumption`), (snap) => { if (snap.exists()) setFeedConsumption(snap.val()); }, { onlyOnce: true });
  }, [user]);

  // حساب الاستهلاك اليومي الكلي لكل علف بناءً على عدد الحيوانات
  const dailyConsumptionPerFeed = useMemo(() => {
    const result = {};
    feeds.forEach(feed => { result[feed.name] = 0; });
    Object.entries(animals).forEach(([type, typeAnimals]) => {
      if (!typeAnimals) return;
      const activeCount = Object.values(typeAnimals).filter(a => a.status === 'active' || a.status === 'productive').length;
      if (activeCount === 0) return;
      const typeConsumption = feedConsumption[type] || {};
      feeds.forEach(feed => {
        const kgPerDay = parseFloat(typeConsumption[feed.name]) || 0;
        result[feed.name] = (result[feed.name] || 0) + (kgPerDay * activeCount);
      });
    });
    return result;
  }, [animals, feeds, feedConsumption]);

  // حساب عدد الحيوانات النشطة لكل نوع
  const activeCountByType = useMemo(() => {
    const result = {};
    Object.entries(animals).forEach(([type, typeAnimals]) => {
      if (!typeAnimals) return;
      result[type] = Object.values(typeAnimals).filter(a => a.status === 'active' || a.status === 'productive').length;
    });
    return result;
  }, [animals]);

  // حساب آخر سعر شراء لكل علف
  const lastPricePerFeed = useMemo(() => {
    const result = {};
    feedPurchases.forEach(p => {
      const existing = result[p.feedId];
      if (!existing || new Date(p.date) > new Date(existing.date)) {
        result[p.feedId] = { price: parseFloat(p.pricePerUnit) || 0, date: p.date };
      }
    });
    return result;
  }, [feedPurchases]);

  // التوقعات: كم يوم يكفي المخزون + تكاليف
  const feedForecast = useMemo(() => {
    return feeds.map(feed => {
      const dailyKg = dailyConsumptionPerFeed[feed.name] || 0;
      const stockKg = (parseFloat(feed.stock) || 0) * (parseFloat(feed.unitWeight) || 1);
      const daysLeft = dailyKg > 0 ? Math.floor(stockKg / dailyKg) : null;
      const lastPrice = lastPricePerFeed[feed.id];
      const pricePerKg = lastPrice && feed.unitWeight ? lastPrice.price / feed.unitWeight : 0;
      const dailyCost = dailyKg * pricePerKg;
      const weeklyCost = dailyCost * 7;
      const monthlyCost = dailyCost * 30;
      const yearlyCost = dailyCost * 365;
      const alert = daysLeft !== null && daysLeft <= (feed.minAlert * 7 || 21);
      return { ...feed, dailyKg, stockKg, daysLeft, pricePerKg, dailyCost, weeklyCost, monthlyCost, yearlyCost, alert, lastPrice };
    });
  }, [feeds, dailyConsumptionPerFeed, lastPricePerFeed]);

  const handleSaveFeed = () => {
    if (!feedForm.name) { alert('أدخل اسم العلف'); return; }
    let updated;
    const feedData = { ...feedForm, unitWeight: parseFloat(feedForm.unitWeight) || 1, stock: parseFloat(feedForm.stock) || 0, minAlert: parseFloat(feedForm.minAlert) || 3 };
    if (editFeedId) {
      updated = feeds.map(f => f.id === editFeedId ? { ...f, ...feedData } : f);
    } else {
      updated = [...feeds, { id: `feed_${Date.now()}`, ...feedData }];
    }
    saveFeeds(updated);
    setFeedForm({ name: '', unit: 'كيس', unitWeight: 50, stock: 0, minAlert: 3 });
    setEditFeedId(null);
    setShowAddFeed(false);
  };

  const handleSavePurchase = () => {
    if (!purchaseForm.feedId || !purchaseForm.qty) { alert('اختر العلف وأدخل الكمية'); return; }
    const feed = feeds.find(f => f.id === purchaseForm.feedId);
    if (!feed) return;
    const qty = parseFloat(purchaseForm.qty) || 0;
    // تحديث المخزون
    const updatedFeeds = feeds.map(f => f.id === purchaseForm.feedId ? { ...f, stock: (parseFloat(f.stock) || 0) + qty } : f);
    saveFeeds(updatedFeeds);
    // حفظ الشراء
    const newPurchase = { id: `fp_${Date.now()}`, ...purchaseForm, qty, pricePerUnit: parseFloat(purchaseForm.pricePerUnit) || 0, totalCost: qty * (parseFloat(purchaseForm.pricePerUnit) || 0), feedName: feed.name };
    saveFeedPurchases([...feedPurchases, newPurchase]);
    setPurchaseForm({ feedId: '', date: new Date().toISOString().split('T')[0], qty: '', pricePerUnit: '', notes: '' });
    setShowAddPurchase(false);
    alert(`✓ تم تسجيل شراء ${qty} ${feed.unit} من ${feed.name}`);
  };

  // ===== دوال الطاقة الشمسية =====
  const saveBatteries = useCallback((updated) => {
    setBatteries(updated);
    localStorage.setItem('solarBatteries', JSON.stringify(updated));
    if (user) set(ref(database, `users/${user.id}/solarBatteries`), updated).catch(() => {});
  }, [user]);

  const savePanels = useCallback((updated) => {
    setPanels(updated);
    localStorage.setItem('solarPanels', JSON.stringify(updated));
    if (user) set(ref(database, `users/${user.id}/solarPanels`), updated).catch(() => {});
  }, [user]);

  const saveInverters = useCallback((updated) => {
    setInverters(updated);
    localStorage.setItem('solarInverters', JSON.stringify(updated));
    if (user) set(ref(database, `users/${user.id}/solarInverters`), updated).catch(() => {});
  }, [user]);

  // تحميل بيانات الطاقة من Firebase
  useEffect(() => {
    if (!user) return;
    onValue(ref(database, `users/${user.id}/solarBatteries`), (snap) => { if (snap.exists()) setBatteries(snap.val()); }, { onlyOnce: true });
    onValue(ref(database, `users/${user.id}/solarPanels`), (snap) => { if (snap.exists()) setPanels(snap.val()); }, { onlyOnce: true });
    onValue(ref(database, `users/${user.id}/solarInverters`), (snap) => { if (snap.exists()) setInverters(snap.val()); }, { onlyOnce: true });
  }, [user]);

  // حساب الأيام المتبقية من تاريخ بداية
  const daysRemaining = (startDate, totalDays) => {
    if (!startDate) return null;
    const elapsed = Math.floor((new Date() - new Date(startDate)) / 86400000);
    return Math.max(0, totalDays - elapsed);
  };

  // نسبة مئوية للعمر المتبقي
  const lifePct = (remaining, total) => remaining !== null ? Math.round((remaining / total) * 100) : null;

  // لون العداد
  const counterColor = (days, totalDays) => {
    if (days === null) return '#bbb';
    if (days === 0) return '#e74c3c';
    const pct = days / totalDays;
    if (pct <= 0.15) return '#e74c3c';
    if (pct <= 0.30) return '#e67e22';
    return '#27ae60';
  };

  const handleSaveBattery = () => {
    if (!batteryForm.name) { alert('أدخل اسم البطارية'); return; }
    const data = {
      ...batteryForm,
      capacity: parseFloat(batteryForm.capacity) || 0,
      voltage: parseFloat(batteryForm.voltage) || 0,
      purchasePrice: parseFloat(batteryForm.purchasePrice) || 0,
      warrantyYears: parseFloat(batteryForm.warrantyYears) || 1,
      lifespanYears: parseFloat(batteryForm.lifespanYears) || 2,
    };
    let updated;
    if (editBatteryId) {
      updated = batteries.map(b => b.id === editBatteryId ? { ...b, ...data } : b);
    } else {
      updated = [...batteries, { id: `bat_${Date.now()}`, ...data }];
    }
    saveBatteries(updated);
    setBatteryForm({ name: '', location: '', brand: '', country: '', capacity: '', voltage: '', purchaseDate: '', warrantyYears: 1, lifespanYears: 2, purchasePrice: '', notes: '' });
    setEditBatteryId(null);
    setShowAddBattery(false);
  };

  const handleSavePanel = () => {
    if (!panelForm.name) { alert('أدخل اسم/رقم اللوح'); return; }
    const data = { ...panelForm, washIntervalDays: parseInt(panelForm.washIntervalDays) || 60 };
    let updated;
    if (editPanelId) {
      updated = panels.map(p => p.id === editPanelId ? { ...p, ...data } : p);
    } else {
      updated = [...panels, { id: `panel_${Date.now()}`, ...data }];
    }
    savePanels(updated);
    setPanelForm({ name: '', location: '', description: '', lastWash: '', washIntervalDays: 60, notes: '' });
    setEditPanelId(null);
    setShowAddPanel(false);
  };

  const handleSaveInverter = () => {
    if (!inverterForm.name) { alert('أدخل اسم الإنفرتر'); return; }
    const data = {
      ...inverterForm,
      capacity: parseFloat(inverterForm.capacity) || 0,
      purchasePrice: parseFloat(inverterForm.purchasePrice) || 0,
      warrantyYears: parseFloat(inverterForm.warrantyYears) || 2,
    };
    let updated;
    if (editInverterId) {
      updated = inverters.map(i => i.id === editInverterId ? { ...i, ...data } : i);
    } else {
      updated = [...inverters, { id: `inv_${Date.now()}`, ...data }];
    }
    saveInverters(updated);
    setInverterForm({ name: '', brand: '', capacity: '', purchaseDate: '', warrantyYears: 2, purchasePrice: '', notes: '' });
    setEditInverterId(null);
    setShowAddInverter(false);
  };

  // إجماليات تكاليف الطاقة
  const solarCosts = useMemo(() => {
    const totalBatteryCost = batteries.reduce((s, b) => s + (parseFloat(b.purchasePrice) || 0), 0);
    const totalInverterCost = inverters.reduce((s, i) => s + (parseFloat(i.purchasePrice) || 0), 0);
    return { totalBatteryCost, totalInverterCost, grandTotal: totalBatteryCost + totalInverterCost };
  }, [batteries, inverters]);

  // ===== دوال الغاز =====
  const saveGasCylinders = useCallback((updated) => {
    setGasCylinders(updated);
    localStorage.setItem('gasCylinders', JSON.stringify(updated));
    if (user) set(ref(database, `users/${user.id}/gasCylinders`), updated).catch(() => {});
  }, [user]);

  useEffect(() => {
    if (!user) return;
    onValue(ref(database, `users/${user.id}/gasCylinders`), (snap) => { if (snap.exists()) setGasCylinders(snap.val()); }, { onlyOnce: true });
  }, [user]);

  // حساب معدل الاستهلاك (أيام بين التعبئات)
  const gasStats = useMemo(() => {
    return gasCylinders.map(cyl => {
      const refills = [...(cyl.refills || [])].sort((a, b) => new Date(a.date) - new Date(b.date));
      if (refills.length === 0) return { ...cyl, avgDays: null, lastRefill: null, nextEstimate: null, totalSpent: 0, daysLeft: null };
      const lastRefill = refills[refills.length - 1];
      const totalSpent = refills.reduce((s, r) => s + (parseFloat(r.price) || 0), 0);

      // حساب المتوسط من الفجوات بين التعبئات
      let avgDays = null;
      if (refills.length >= 2) {
        const gaps = [];
        for (let i = 1; i < refills.length; i++) {
          const gap = Math.floor((new Date(refills[i].date) - new Date(refills[i-1].date)) / 86400000);
          if (gap > 0) gaps.push(gap);
        }
        if (gaps.length > 0) avgDays = Math.round(gaps.reduce((a, b) => a + b, 0) / gaps.length);
      }

      const daysSinceLast = Math.floor((new Date() - new Date(lastRefill.date)) / 86400000);
      const daysLeft = avgDays ? Math.max(0, avgDays - daysSinceLast) : null;
      const nextEstimate = avgDays ? new Date(new Date(lastRefill.date).getTime() + avgDays * 86400000).toISOString().split('T')[0] : null;
      const avgPrice = refills.length > 0 ? totalSpent / refills.length : 0;
      const monthlyEstimate = avgDays ? (avgPrice / avgDays) * 30 : null;
      const yearlyEstimate = avgDays ? (avgPrice / avgDays) * 365 : null;
      const alertDays = Math.round((avgDays || 30) * 0.2); // تنبيه عند 20% متبقي
      const needsAlert = daysLeft !== null && daysLeft <= alertDays;

      return { ...cyl, refills, avgDays, lastRefill, nextEstimate, totalSpent, daysLeft, daysSinceLast, avgPrice, monthlyEstimate, yearlyEstimate, needsAlert, alertDays };
    });
  }, [gasCylinders]);

  const gasTotalStats = useMemo(() => {
    const total = gasStats.reduce((s, c) => s + c.totalSpent, 0);
    const avgMonthly = gasStats.reduce((s, c) => s + (c.monthlyEstimate || 0), 0);
    const avgYearly = gasStats.reduce((s, c) => s + (c.yearlyEstimate || 0), 0);
    return { total, avgMonthly, avgYearly };
  }, [gasStats]);

  const handleSaveCylinder = () => {
    if (!cylinderForm.name) { alert('أدخل اسم الأسطوانة'); return; }
    const data = { ...cylinderForm, sizeKg: parseFloat(cylinderForm.sizeKg) || 25 };
    let updated;
    if (editCylinderId) {
      updated = gasCylinders.map(c => c.id === editCylinderId ? { ...c, ...data } : c);
    } else {
      updated = [...gasCylinders, { id: `gas_${Date.now()}`, ...data, refills: [] }];
    }
    saveGasCylinders(updated);
    setCylinderForm({ name: '', description: '', location: '', sizeKg: 25, notes: '' });
    setEditCylinderId(null);
    setShowAddCylinder(false);
  };

  const handleSaveRefill = () => {
    if (!refillForm.date) { alert('أدخل تاريخ التعبئة'); return; }
    const cyl = gasCylinders.find(c => c.id === refillCylinderId);
    if (!cyl) return;
    const refills = cyl.refills || [];
    const newRefill = { id: `ref_${Date.now()}`, ...refillForm, price: parseFloat(refillForm.price) || 0 };
    const updated = gasCylinders.map(c => c.id === refillCylinderId ? { ...c, refills: [...refills, newRefill] } : c);
    saveGasCylinders(updated);
    setRefillForm({ date: new Date().toISOString().split('T')[0], price: '', notes: '' });
    setShowAddRefill(false);
    setRefillCylinderId(null);
  };

  // ===== دوال العمال =====
  const saveWorkers = useCallback((updated) => {
    setWorkers(updated);
    localStorage.setItem('workersData', JSON.stringify(updated));
    if (user) set(ref(database, `users/${user.id}/workers`), updated).catch(() => {});
  }, [user]);

  useEffect(() => {
    if (!user) return;
    onValue(ref(database, `users/${user.id}/workers`), (snap) => { if (snap.exists()) setWorkers(snap.val()); }, { onlyOnce: true });
  }, [user]);

  const handleSaveWorker = () => {
    if (!workerForm.name) { alert('أدخل اسم العامل'); return; }
    const data = { ...workerForm, salary: parseFloat(workerForm.salary) || 0 };
    let updated;
    if (editWorkerId) {
      updated = workers.map(w => w.id === editWorkerId ? { ...w, ...data } : w);
    } else {
      updated = [...workers, { id: `w_${Date.now()}`, ...data, costs: [] }];
    }
    saveWorkers(updated);
    setWorkerForm({ name: '', description: '', nationality: '', salary: '', startDate: '', status: 'active', notes: '' });
    setEditWorkerId(null);
    setShowAddWorker(false);
  };

  const handleSaveWorkerCost = () => {
    if (!workerCostForm.amount || !workerCostForm.date) { alert('أدخل المبلغ والتاريخ'); return; }
    const worker = workers.find(w => w.id === workerCostWorkerId);
    if (!worker) return;
    const costs = worker.costs || [];
    const newCost = { id: `wc_${Date.now()}`, ...workerCostForm, amount: parseFloat(workerCostForm.amount) || 0 };
    const updated = workers.map(w => w.id === workerCostWorkerId ? { ...w, costs: [...costs, newCost] } : w);
    saveWorkers(updated);
    setWorkerCostForm({ date: new Date().toISOString().split('T')[0], type: 'residence', amount: '', description: '', notes: '' });
    setShowAddWorkerCost(false);
    setWorkerCostWorkerId(null);
  };

  // إحصائيات العمال
  const workersStats = useMemo(() => {
    const activeWorkers = workers.filter(w => w.status === 'active' || w.status === 'sick' || w.status === 'vacation');
    const totalMonthlySalary = activeWorkers.reduce((s, w) => s + (parseFloat(w.salary) || 0), 0);
    const totalAllCosts = workers.reduce((s, w) => s + (w.costs || []).reduce((x, c) => x + (parseFloat(c.amount) || 0), 0), 0);
    const byStatus = {
      active: workers.filter(w => w.status === 'active').length,
      travel: workers.filter(w => w.status === 'travel').length,
      sick: workers.filter(w => w.status === 'sick').length,
      vacation: workers.filter(w => w.status === 'vacation').length,
      terminated: workers.filter(w => w.status === 'terminated').length,
    };
    return { activeWorkers, totalMonthlySalary, totalYearlySalary: totalMonthlySalary * 12, totalAllCosts, grandTotal: totalMonthlySalary + totalAllCosts, byStatus };
  }, [workers]);

  const costTypeLabel = (type) => {
    const labels = { residence: '🪪 تجديد إقامة', ticket: '✈️ تذاكر سفر', medical: '🏥 علاج طبي', other: '📌 أخرى' };
    return labels[type] || type;
  };

  const statusLabel = (status) => {
    const labels = { active: { text: '✅ نشط', color: '#27ae60', bg: '#d5f5e3' }, travel: { text: '✈️ مسافر', color: '#2471a3', bg: '#d6eaf8' }, sick: { text: '🤒 مريض', color: '#e67e22', bg: '#fdebd0' }, vacation: { text: '🌴 إجازة', color: '#8e44ad', bg: '#f5eef8' }, terminated: { text: '❌ منتهي', color: '#e74c3c', bg: '#fadbd8' } };
    return labels[status] || { text: status, color: '#888', bg: '#eee' };
  };

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
            <button onClick={() => { setShowPumpSystem(true); setSidebarOpen(false); }} style={{ width: '100%', padding: '10px', background: '#1c2833', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold', marginBottom: '10px' }}>⚙️ مراقبة المواطير</button>
            <button onClick={() => { setShowFeedSystem(true); setSidebarOpen(false); }} style={{ width: '100%', padding: '10px', background: '#6e4b1f', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold', marginBottom: '10px' }}>🌾 إدارة الأعلاف</button>
            <button onClick={() => { setShowSolarSystem(true); setSidebarOpen(false); }} style={{ width: '100%', padding: '10px', background: '#1a6b3c', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold', marginBottom: '10px' }}>☀️ الطاقة الشمسية</button>
            <button onClick={() => { setShowGasSystem(true); setSidebarOpen(false); }} style={{ width: '100%', padding: '10px', background: '#2e4057', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold', marginBottom: '10px' }}>🔵 مراقبة الغاز</button>
            <button onClick={() => { setShowWorkersSystem(true); setSidebarOpen(false); }} style={{ width: '100%', padding: '10px', background: '#784212', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold', marginBottom: '10px' }}>👷 إدارة العمال</button>
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

      {/* ===== Modal إدارة العمال ===== */}
      {showWorkersSystem && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', justifyContent: 'center', alignItems: 'flex-start', zIndex: 1000, padding: '15px', overflowY: 'auto' }} onClick={() => setShowWorkersSystem(false)}>
          <div style={{ background: 'white', borderRadius: '14px', maxWidth: '780px', width: '100%', marginTop: '15px', overflow: 'hidden', boxShadow: '0 10px 40px rgba(0,0,0,0.4)' }} onClick={e => e.stopPropagation()}>

            {/* Header */}
            <div style={{ background: 'linear-gradient(135deg, #784212, #5d3310)', padding: '18px 22px', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '18px' }}>👷 إدارة العمال والرواتب</h2>
                <p style={{ margin: '4px 0 0', fontSize: '12px', opacity: 0.85 }}>الرواتب · التكاليف الإضافية · ملخص المصروفات</p>
              </div>
              <div style={{ textAlign: 'center', background: 'rgba(255,255,255,0.15)', borderRadius: '8px', padding: '8px 14px' }}>
                <div style={{ fontWeight: 'bold', fontSize: '16px' }}>{workers.filter(w => w.status === 'active').length} / {workers.length}</div>
                <div style={{ fontSize: '10px', opacity: 0.85 }}>نشط / الكل</div>
              </div>
            </div>

            {/* التبويبات */}
            <div style={{ display: 'flex', borderBottom: '2px solid #eee', background: '#fdf8f3' }}>
              {[
                { key: 'list', label: '👷 العمال' },
                { key: 'costs', label: '💸 التكاليف الإضافية' },
                { key: 'summary', label: '📊 ملخص المصروفات' },
              ].map(tab => (
                <button key={tab.key} onClick={() => setWorkersTab(tab.key)} style={{ flex: 1, padding: '11px 8px', background: workersTab === tab.key ? 'white' : 'transparent', border: 'none', borderBottom: workersTab === tab.key ? '3px solid #784212' : '3px solid transparent', cursor: 'pointer', fontWeight: workersTab === tab.key ? 'bold' : 'normal', color: workersTab === tab.key ? '#784212' : '#888', fontSize: isMobile ? '11px' : '13px' }}>
                  {tab.label}
                </button>
              ))}
            </div>

            <div style={{ maxHeight: '580px', overflowY: 'auto', padding: '15px 20px' }}>

              {/* ===== تبويب العمال ===== */}
              {workersTab === 'list' && (
                <div>
                  {/* ملخص سريع */}
                  {workers.length > 0 && (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(110px,1fr))', gap: '8px', marginBottom: '15px' }}>
                      {[
                        { label: '✅ نشط', val: workersStats.byStatus.active, color: '#27ae60', bg: '#d5f5e3' },
                        { label: '✈️ مسافر', val: workersStats.byStatus.travel, color: '#2471a3', bg: '#d6eaf8' },
                        { label: '🤒 مريض', val: workersStats.byStatus.sick, color: '#e67e22', bg: '#fdebd0' },
                        { label: '🌴 إجازة', val: workersStats.byStatus.vacation, color: '#8e44ad', bg: '#f5eef8' },
                        { label: '❌ منتهي', val: workersStats.byStatus.terminated, color: '#e74c3c', bg: '#fadbd8' },
                      ].map(s => (
                        <div key={s.label} style={{ background: s.bg, borderRadius: '8px', padding: '8px', textAlign: 'center', border: `1px solid ${s.color}30` }}>
                          <div style={{ fontSize: '18px', fontWeight: 'bold', color: s.color }}>{s.val}</div>
                          <div style={{ fontSize: '11px', color: s.color }}>{s.label}</div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* قائمة العمال */}
                  {workers.map(worker => {
                    const st = statusLabel(worker.status);
                    const workerCosts = (worker.costs || []).reduce((s, c) => s + (parseFloat(c.amount) || 0), 0);
                    const monthsWorked = worker.startDate ? Math.floor((new Date() - new Date(worker.startDate)) / (1000*60*60*24*30)) : null;
                    const isActive = worker.status !== 'travel' && worker.status !== 'terminated';
                    return (
                      <div key={worker.id} style={{ background: worker.status === 'terminated' ? '#fdf2f2' : worker.status === 'travel' ? '#f0f6ff' : '#fdfaf6', border: `1.5px solid ${st.color}40`, borderRadius: '12px', padding: '14px', marginBottom: '10px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px', marginBottom: '8px' }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 'bold', fontSize: '15px', color: '#3d2000', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                              👷 {worker.name}
                              <span style={{ background: st.bg, color: st.color, fontSize: '11px', padding: '2px 8px', borderRadius: '8px', fontWeight: 'bold' }}>{st.text}</span>
                              {worker.status === 'travel' && <span style={{ fontSize: '11px', color: '#2471a3' }}>⏸ الراتب موقوف</span>}
                            </div>
                            {worker.description && <div style={{ fontSize: '12px', color: '#666', marginTop: '3px' }}>💼 {worker.description}</div>}
                            <div style={{ fontSize: '12px', color: '#888', marginTop: '3px', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                              {worker.nationality && <span>🌍 {worker.nationality}</span>}
                              {worker.startDate && <span>📅 منذ: {new Date(worker.startDate).toLocaleDateString('ar-SA')}</span>}
                              {monthsWorked !== null && <span>⏱️ {monthsWorked} شهر</span>}
                            </div>
                          </div>
                          <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                            <button onClick={() => { setWorkerCostWorkerId(worker.id); setShowAddWorkerCost(true); }} style={{ background: '#fdebd0', border: '1px solid #e67e22', color: '#e67e22', borderRadius: '5px', padding: '4px 7px', cursor: 'pointer', fontSize: '11px', fontWeight: 'bold' }}>💸 تكلفة</button>
                            <button onClick={() => { setWorkerForm({ name: worker.name, description: worker.description||'', nationality: worker.nationality||'', salary: worker.salary, startDate: worker.startDate||'', status: worker.status, notes: worker.notes||'' }); setEditWorkerId(worker.id); setShowAddWorker(true); }} style={{ background: '#f0f9f6', border: '1px solid #784212', color: '#784212', borderRadius: '5px', padding: '4px 7px', cursor: 'pointer', fontSize: '13px' }}>✏️</button>
                            <button onClick={() => { if (window.confirm(`حذف "${worker.name}"؟`)) saveWorkers(workers.filter(w => w.id !== worker.id)); }} style={{ background: '#fff0f0', border: '1px solid #e74c3c', color: '#e74c3c', borderRadius: '5px', padding: '4px 7px', cursor: 'pointer', fontSize: '13px' }}>🗑️</button>
                          </div>
                        </div>

                        {/* الراتب والتكاليف */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(110px,1fr))', gap: '7px' }}>
                          <div style={{ background: isActive ? '#d5f5e3' : '#eee', borderRadius: '7px', padding: '8px', textAlign: 'center' }}>
                            <div style={{ fontWeight: 'bold', color: isActive ? '#27ae60' : '#999', fontSize: '15px' }}>{isActive ? parseFloat(worker.salary||0).toLocaleString() : '—'} ر</div>
                            <div style={{ fontSize: '10px', color: '#888' }}>الراتب الشهري</div>
                          </div>
                          <div style={{ background: '#fef9e7', borderRadius: '7px', padding: '8px', textAlign: 'center' }}>
                            <div style={{ fontWeight: 'bold', color: '#b7950b', fontSize: '15px' }}>{isActive ? (parseFloat(worker.salary||0)*12).toLocaleString() : '—'} ر</div>
                            <div style={{ fontSize: '10px', color: '#888' }}>الراتب السنوي</div>
                          </div>
                          <div style={{ background: '#fdebd0', borderRadius: '7px', padding: '8px', textAlign: 'center' }}>
                            <div style={{ fontWeight: 'bold', color: '#e67e22', fontSize: '15px' }}>{workerCosts.toLocaleString()} ر</div>
                            <div style={{ fontSize: '10px', color: '#888' }}>تكاليف إضافية</div>
                          </div>
                          <div style={{ background: '#fadbd8', borderRadius: '7px', padding: '8px', textAlign: 'center' }}>
                            <div style={{ fontWeight: 'bold', color: '#c0392b', fontSize: '15px' }}>{(isActive ? parseFloat(worker.salary||0)*12 + workerCosts : workerCosts).toLocaleString()} ر</div>
                            <div style={{ fontSize: '10px', color: '#888' }}>الإجمالي سنوياً</div>
                          </div>
                        </div>

                        {/* ملاحظات */}
                        {worker.notes && <div style={{ marginTop: '8px', fontSize: '12px', color: '#888', background: '#f9f9f9', padding: '6px 10px', borderRadius: '6px' }}>📝 {worker.notes}</div>}
                      </div>
                    );
                  })}

                  {workers.length === 0 && !showAddWorker && (
                    <div style={{ textAlign: 'center', padding: '30px', color: '#bbb' }}>
                      <div style={{ fontSize: '40px', marginBottom: '10px' }}>👷</div>
                      <div>أضف العمال لبدء متابعة الرواتب والتكاليف</div>
                    </div>
                  )}

                  {/* نموذج إضافة/تعديل عامل */}
                  {showAddWorker ? (
                    <div style={{ background: '#fdf5ec', border: '2px solid #784212', borderRadius: '10px', padding: '15px', marginTop: '10px' }}>
                      <h4 style={{ color: '#784212', margin: '0 0 12px' }}>{editWorkerId ? '✏️ تعديل عامل' : '➕ إضافة عامل'}</h4>
                      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '10px' }}>
                        <div><label style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>اسم العامل *</label><input value={workerForm.name} onChange={e => setWorkerForm(p => ({ ...p, name: e.target.value }))} placeholder="الاسم الكامل" style={{ padding: '8px', border: '1px solid #ddd', borderRadius: '6px', width: '100%', fontSize: '13px' }} /></div>
                        <div><label style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>💼 وصف العمل</label><input value={workerForm.description} onChange={e => setWorkerForm(p => ({ ...p, description: e.target.value }))} placeholder="مثال: راعي الغنم، سائق، عامل نظافة" style={{ padding: '8px', border: '1px solid #ddd', borderRadius: '6px', width: '100%', fontSize: '13px' }} /></div>
                        <div><label style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>🌍 الجنسية</label><input value={workerForm.nationality} onChange={e => setWorkerForm(p => ({ ...p, nationality: e.target.value }))} placeholder="مثال: باكستاني، يمني، سوداني" style={{ padding: '8px', border: '1px solid #ddd', borderRadius: '6px', width: '100%', fontSize: '13px' }} /></div>
                        <div><label style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>💰 الراتب الشهري (ريال)</label><input type="number" min="0" value={workerForm.salary} onChange={e => setWorkerForm(p => ({ ...p, salary: e.target.value }))} placeholder="مثال: 1200" style={{ padding: '8px', border: '1px solid #ddd', borderRadius: '6px', width: '100%', fontSize: '13px' }} /></div>
                        <div><label style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>📅 تاريخ الالتحاق</label><input type="date" value={workerForm.startDate} onChange={e => setWorkerForm(p => ({ ...p, startDate: e.target.value }))} style={{ padding: '8px', border: '1px solid #ddd', borderRadius: '6px', width: '100%', fontSize: '13px' }} /></div>
                        <div><label style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>الحالة</label>
                          <select value={workerForm.status} onChange={e => setWorkerForm(p => ({ ...p, status: e.target.value }))} style={{ padding: '8px', border: '1px solid #ddd', borderRadius: '6px', width: '100%', fontSize: '13px' }}>
                            <option value="active">✅ نشط</option>
                            <option value="travel">✈️ مسافر (الراتب موقوف)</option>
                            <option value="sick">🤒 مريض</option>
                            <option value="vacation">🌴 إجازة</option>
                            <option value="terminated">❌ منتهي الخدمة</option>
                          </select>
                        </div>
                        <div style={{ gridColumn: isMobile ? '1' : '1 / -1' }}><label style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>📝 ملاحظات</label><input value={workerForm.notes} onChange={e => setWorkerForm(p => ({ ...p, notes: e.target.value }))} placeholder="أي معلومات إضافية" style={{ padding: '8px', border: '1px solid #ddd', borderRadius: '6px', width: '100%', fontSize: '13px' }} /></div>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '12px' }}>
                        <button onClick={handleSaveWorker} style={{ background: '#784212', color: 'white', border: 'none', padding: '10px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>✓ حفظ</button>
                        <button onClick={() => { setShowAddWorker(false); setEditWorkerId(null); setWorkerForm({ name: '', description: '', nationality: '', salary: '', startDate: '', status: 'active', notes: '' }); }} style={{ background: '#ddd', border: 'none', padding: '10px', borderRadius: '6px', cursor: 'pointer' }}>إلغاء</button>
                      </div>
                    </div>
                  ) : (
                    <button onClick={() => setShowAddWorker(true)} style={{ width: '100%', padding: '11px', background: '#784212', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px', marginTop: '5px' }}>➕ إضافة عامل</button>
                  )}
                </div>
              )}

              {/* ===== تبويب التكاليف الإضافية ===== */}
              {workersTab === 'costs' && (
                <div>
                  {workers.map(worker => {
                    const costs = [...(worker.costs || [])].sort((a, b) => new Date(b.date) - new Date(a.date));
                    const total = costs.reduce((s, c) => s + (parseFloat(c.amount) || 0), 0);
                    return (
                      <div key={worker.id} style={{ marginBottom: '16px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap', gap: '6px' }}>
                          <div style={{ fontWeight: 'bold', color: '#784212', fontSize: '13px' }}>
                            👷 {worker.name}
                            <span style={{ marginRight: '6px', fontSize: '11px', color: '#888', fontWeight: 'normal' }}>{worker.description}</span>
                          </div>
                          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            {total > 0 && <span style={{ fontWeight: 'bold', color: '#e67e22', fontSize: '12px' }}>إجمالي: {total.toLocaleString()} ر</span>}
                            <button onClick={() => { setWorkerCostWorkerId(worker.id); setShowAddWorkerCost(true); }} style={{ background: '#fdebd0', border: '1px solid #e67e22', color: '#e67e22', borderRadius: '6px', padding: '4px 8px', cursor: 'pointer', fontSize: '11px', fontWeight: 'bold' }}>💸 إضافة تكلفة</button>
                          </div>
                        </div>
                        {costs.length === 0 ? (
                          <div style={{ background: '#f9f9f9', borderRadius: '8px', padding: '10px', color: '#bbb', fontSize: '12px', textAlign: 'center' }}>لا توجد تكاليف إضافية</div>
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                            {costs.map(cost => (
                              <div key={cost.id} style={{ background: 'white', border: '1px solid #eee', borderRadius: '8px', padding: '9px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '6px' }}>
                                <div>
                                  <div style={{ fontWeight: 'bold', fontSize: '13px', color: '#333' }}>{costTypeLabel(cost.type)}</div>
                                  <div style={{ fontSize: '11px', color: '#888', marginTop: '2px', display: 'flex', gap: '10px' }}>
                                    <span>📅 {new Date(cost.date).toLocaleDateString('ar-SA')}</span>
                                    {cost.description && <span>📝 {cost.description}</span>}
                                  </div>
                                </div>
                                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                  <span style={{ fontWeight: 'bold', color: '#e74c3c', fontSize: '14px' }}>{parseFloat(cost.amount).toLocaleString()} ر</span>
                                  <button onClick={() => { if (window.confirm('حذف هذه التكلفة؟')) { const updated = workers.map(w => w.id === worker.id ? { ...w, costs: w.costs.filter(c => c.id !== cost.id) } : w); saveWorkers(updated); } }} style={{ background: '#fff0f0', border: '1px solid #e74c3c', color: '#e74c3c', borderRadius: '5px', padding: '3px 6px', cursor: 'pointer', fontSize: '11px' }}>🗑️</button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {workers.length === 0 && <div style={{ textAlign: 'center', padding: '30px', color: '#bbb' }}>أضف عمالاً أولاً من تبويب العمال</div>}

                  {/* Modal إضافة تكلفة */}
                  {showAddWorkerCost && workerCostWorkerId && (
                    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1200, padding: '20px' }} onClick={() => setShowAddWorkerCost(false)}>
                      <div style={{ background: 'white', borderRadius: '12px', maxWidth: '420px', width: '100%', overflow: 'hidden' }} onClick={e => e.stopPropagation()}>
                        <div style={{ background: 'linear-gradient(135deg, #784212, #5d3310)', padding: '14px 18px', color: 'white' }}>
                          <h3 style={{ margin: 0, fontSize: '15px' }}>💸 إضافة تكلفة — {workers.find(w => w.id === workerCostWorkerId)?.name}</h3>
                        </div>
                        <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '11px' }}>
                          <div><label style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>نوع التكلفة</label>
                            <select value={workerCostForm.type} onChange={e => setWorkerCostForm(p => ({ ...p, type: e.target.value }))} style={{ padding: '8px', border: '1px solid #ddd', borderRadius: '6px', width: '100%', fontSize: '13px' }}>
                              <option value="residence">🪪 تجديد إقامة</option>
                              <option value="ticket">✈️ تذاكر سفر</option>
                              <option value="medical">🏥 علاج طبي</option>
                              <option value="other">📌 أخرى</option>
                            </select>
                          </div>
                          <div><label style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>📅 التاريخ</label><input type="date" value={workerCostForm.date} onChange={e => setWorkerCostForm(p => ({ ...p, date: e.target.value }))} style={{ padding: '8px', border: '1px solid #ddd', borderRadius: '6px', width: '100%', fontSize: '13px' }} /></div>
                          <div><label style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>💰 المبلغ (ريال) *</label><input type="number" min="0" value={workerCostForm.amount} onChange={e => setWorkerCostForm(p => ({ ...p, amount: e.target.value }))} placeholder="مثال: 500" style={{ padding: '8px', border: '1px solid #ddd', borderRadius: '6px', width: '100%', fontSize: '13px' }} /></div>
                          <div><label style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>وصف التكلفة</label><input value={workerCostForm.description} onChange={e => setWorkerCostForm(p => ({ ...p, description: e.target.value }))} placeholder="مثال: تجديد إقامة سنوية، تذكرة إجازة" style={{ padding: '8px', border: '1px solid #ddd', borderRadius: '6px', width: '100%', fontSize: '13px' }} /></div>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '4px' }}>
                            <button onClick={handleSaveWorkerCost} style={{ background: '#784212', color: 'white', border: 'none', padding: '10px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>✓ حفظ</button>
                            <button onClick={() => setShowAddWorkerCost(false)} style={{ background: '#ddd', border: 'none', padding: '10px', borderRadius: '6px', cursor: 'pointer' }}>إلغاء</button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ===== تبويب ملخص المصروفات ===== */}
              {workersTab === 'summary' && (
                <div>
                  {/* البطاقة الرئيسية */}
                  <div style={{ background: 'linear-gradient(135deg, #784212, #5d3310)', borderRadius: '12px', padding: '18px', marginBottom: '15px', color: 'white' }}>
                    <div style={{ fontSize: '13px', opacity: 0.85, marginBottom: '10px' }}>💰 إجمالي تكاليف العمالة</div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(130px,1fr))', gap: '10px' }}>
                      {[
                        { label: 'رواتب شهرية', val: workersStats.totalMonthlySalary.toLocaleString() + ' ر' },
                        { label: 'رواتب سنوية', val: workersStats.totalYearlySalary.toLocaleString() + ' ر' },
                        { label: 'تكاليف إضافية', val: workersStats.totalAllCosts.toLocaleString() + ' ر' },
                        { label: 'الإجمالي الكلي', val: (workersStats.totalYearlySalary + workersStats.totalAllCosts).toLocaleString() + ' ر' },
                      ].map(s => (
                        <div key={s.label} style={{ background: 'rgba(255,255,255,0.15)', borderRadius: '8px', padding: '10px', textAlign: 'center' }}>
                          <div style={{ fontWeight: 'bold', fontSize: '15px' }}>{s.val}</div>
                          <div style={{ fontSize: '10px', opacity: 0.8, marginTop: '2px' }}>{s.label}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* تفصيل حسب كل عامل */}
                  {workers.map(worker => {
                    const isActive = worker.status !== 'travel' && worker.status !== 'terminated';
                    const monthlySalary = isActive ? parseFloat(worker.salary || 0) : 0;
                    const yearlySalary = monthlySalary * 12;
                    const extraCosts = (worker.costs || []).reduce((s, c) => s + (parseFloat(c.amount) || 0), 0);
                    const total = yearlySalary + extraCosts;
                    const st = statusLabel(worker.status);
                    const costsByType = {};
                    (worker.costs || []).forEach(c => { costsByType[c.type] = (costsByType[c.type] || 0) + parseFloat(c.amount || 0); });
                    return (
                      <div key={worker.id} style={{ background: 'white', border: '1px solid #e8d5b0', borderRadius: '10px', padding: '14px', marginBottom: '10px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px', flexWrap: 'wrap', gap: '6px' }}>
                          <div>
                            <div style={{ fontWeight: 'bold', fontSize: '14px', color: '#784212' }}>👷 {worker.name}</div>
                            <div style={{ fontSize: '12px', color: '#888', marginTop: '2px', display: 'flex', gap: '10px' }}>
                              {worker.description && <span>{worker.description}</span>}
                              <span style={{ background: st.bg, color: st.color, padding: '1px 6px', borderRadius: '5px', fontSize: '11px' }}>{st.text}</span>
                            </div>
                          </div>
                          <div style={{ textAlign: 'center', background: '#fdf5ec', borderRadius: '8px', padding: '6px 12px', border: '1px solid #e8d5b0' }}>
                            <div style={{ fontWeight: 'bold', color: '#784212', fontSize: '15px' }}>{total.toLocaleString()} ر</div>
                            <div style={{ fontSize: '10px', color: '#888' }}>إجمالي سنوي</div>
                          </div>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(100px,1fr))', gap: '6px', fontSize: '12px' }}>
                          <div style={{ background: '#d5f5e3', borderRadius: '6px', padding: '7px', textAlign: 'center' }}>
                            <div style={{ fontWeight: 'bold', color: '#27ae60' }}>{monthlySalary.toLocaleString()} ر</div>
                            <div style={{ color: '#555', fontSize: '10px' }}>شهري</div>
                          </div>
                          <div style={{ background: '#fef9e7', borderRadius: '6px', padding: '7px', textAlign: 'center' }}>
                            <div style={{ fontWeight: 'bold', color: '#b7950b' }}>{yearlySalary.toLocaleString()} ر</div>
                            <div style={{ color: '#555', fontSize: '10px' }}>سنوي (راتب)</div>
                          </div>
                          {Object.entries(costsByType).map(([type, amount]) => (
                            <div key={type} style={{ background: '#fdebd0', borderRadius: '6px', padding: '7px', textAlign: 'center' }}>
                              <div style={{ fontWeight: 'bold', color: '#e67e22' }}>{amount.toLocaleString()} ر</div>
                              <div style={{ color: '#555', fontSize: '10px' }}>{costTypeLabel(type)}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}

                  {/* اقتراحات */}
                  <div style={{ background: '#f0f4ff', borderRadius: '10px', padding: '14px', border: '1px solid #c5cae9', marginTop: '5px' }}>
                    <div style={{ fontWeight: 'bold', color: '#2471a3', marginBottom: '8px', fontSize: '13px' }}>💡 اقتراحات لتحسين إدارة العمال:</div>
                    <div style={{ fontSize: '12px', color: '#555', lineHeight: '2' }}>
                      ✅ <strong>جدول الإجازات:</strong> خطط للإجازات مسبقاً لتجنب تعطل العمل<br/>
                      ✅ <strong>تجديد الإقامة:</strong> راقب تواريخ انتهاء الإقامات وجددها مبكراً لتجنب الغرامات<br/>
                      ✅ <strong>التأمين الصحي:</strong> يُقلل تكاليف العلاج على المدى البعيد<br/>
                      ✅ <strong>تقييم الأداء:</strong> ربط الزيادة بالإنتاجية يحفز العمال ويضبط التكلفة<br/>
                      ✅ <strong>العمال المسافرون:</strong> سجّل تواريخ السفر والعودة لحساب الراتب بدقة
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div style={{ padding: '13px 20px', borderTop: '1px solid #eee' }}>
              <button onClick={() => setShowWorkersSystem(false)} style={{ width: '100%', background: '#784212', color: 'white', border: 'none', padding: '11px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px' }}>إغلاق</button>
            </div>
          </div>
        </div>
      )}

      {/* ===== Modal مراقبة الغاز ===== */}
      {showGasSystem && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', justifyContent: 'center', alignItems: 'flex-start', zIndex: 1000, padding: '15px', overflowY: 'auto' }} onClick={() => setShowGasSystem(false)}>
          <div style={{ background: 'white', borderRadius: '14px', maxWidth: '760px', width: '100%', marginTop: '15px', overflow: 'hidden', boxShadow: '0 10px 40px rgba(0,0,0,0.4)' }} onClick={e => e.stopPropagation()}>

            {/* Header */}
            <div style={{ background: 'linear-gradient(135deg, #2e4057, #1a2a3a)', padding: '18px 22px', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '18px' }}>🔵 مراقبة غاز الطبخ</h2>
                <p style={{ margin: '4px 0 0', fontSize: '12px', opacity: 0.85 }}>الأسطوانات · سجل التعبئة · معدل الاستهلاك والتكاليف</p>
              </div>
              {gasStats.some(c => c.needsAlert) && (
                <div style={{ background: '#e74c3c', borderRadius: '8px', padding: '6px 12px', fontSize: '12px', fontWeight: 'bold' }}>
                  ⚠️ {gasStats.filter(c => c.needsAlert).length} أسطوانة تحتاج تعبئة قريباً
                </div>
              )}
            </div>

            {/* التبويبات */}
            <div style={{ display: 'flex', borderBottom: '2px solid #eee', background: '#f5f7fa' }}>
              {[
                { key: 'cylinders', label: '🔵 الأسطوانات' },
                { key: 'refills', label: '📋 سجل التعبئة' },
                { key: 'stats', label: '📊 الإحصائيات والتكاليف' },
              ].map(tab => (
                <button key={tab.key} onClick={() => setGasTab(tab.key)} style={{ flex: 1, padding: '11px 8px', background: gasTab === tab.key ? 'white' : 'transparent', border: 'none', borderBottom: gasTab === tab.key ? '3px solid #2e4057' : '3px solid transparent', cursor: 'pointer', fontWeight: gasTab === tab.key ? 'bold' : 'normal', color: gasTab === tab.key ? '#2e4057' : '#888', fontSize: isMobile ? '11px' : '13px' }}>
                  {tab.label}
                </button>
              ))}
            </div>

            <div style={{ maxHeight: '580px', overflowY: 'auto', padding: '15px 20px' }}>

              {/* ===== تبويب الأسطوانات ===== */}
              {gasTab === 'cylinders' && (
                <div>
                  {/* ملخص سريع */}
                  {gasCylinders.length > 0 && (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(130px,1fr))', gap: '8px', marginBottom: '15px' }}>
                      {[
                        { label: 'عدد الأسطوانات', val: gasCylinders.length, color: '#2e4057', icon: '🔵' },
                        { label: 'تحتاج تعبئة', val: gasStats.filter(c => c.needsAlert).length, color: gasStats.some(c => c.needsAlert) ? '#e74c3c' : '#27ae60', icon: '⚠️' },
                        { label: 'إجمالي الإنفاق', val: gasTotalStats.total.toLocaleString() + ' ر', color: '#27ae60', icon: '💰' },
                        { label: 'تكلفة شهرية متوقعة', val: gasTotalStats.avgMonthly.toFixed(0) + ' ر', color: '#e67e22', icon: '📅' },
                      ].map(s => (
                        <div key={s.label} style={{ background: '#f5f7fa', borderRadius: '8px', padding: '10px', textAlign: 'center', border: '1px solid #dde' }}>
                          <div style={{ fontSize: '15px', fontWeight: 'bold', color: s.color }}>{s.icon} {s.val}</div>
                          <div style={{ fontSize: '11px', color: '#888', marginTop: '2px' }}>{s.label}</div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* بطاقات الأسطوانات */}
                  {gasStats.map(cyl => {
                    const pct = cyl.avgDays && cyl.daysLeft !== null ? Math.round((cyl.daysLeft / cyl.avgDays) * 100) : null;
                    const barColor = pct === null ? '#bbb' : pct > 40 ? '#27ae60' : pct > 20 ? '#e67e22' : '#e74c3c';
                    return (
                      <div key={cyl.id} style={{ background: cyl.needsAlert ? '#fff3f3' : '#f9fbff', border: `2px solid ${cyl.needsAlert ? '#e74c3c' : '#c5cae9'}`, borderRadius: '12px', padding: '14px', marginBottom: '12px' }}>
                        {/* رأس */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px', marginBottom: '10px' }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 'bold', fontSize: '15px', color: '#1a2a3a', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                              🔵 {cyl.name}
                              <span style={{ fontSize: '11px', background: '#e8eaf6', color: '#2e4057', padding: '2px 7px', borderRadius: '6px' }}>{cyl.sizeKg} كجم</span>
                              {cyl.needsAlert && <span style={{ fontSize: '11px', background: '#e74c3c', color: 'white', padding: '2px 7px', borderRadius: '6px', fontWeight: 'bold' }}>🔴 تعبئة قريباً!</span>}
                            </div>
                            {cyl.location && <div style={{ fontSize: '12px', color: '#888', marginTop: '3px' }}>📍 {cyl.location}</div>}
                            {cyl.description && <div style={{ fontSize: '12px', color: '#666', marginTop: '2px' }}>📝 {cyl.description}</div>}
                          </div>
                          <div style={{ display: 'flex', gap: '6px' }}>
                            <button onClick={() => { setRefillCylinderId(cyl.id); setShowAddRefill(true); }} style={{ background: '#e8f5e9', border: '1px solid #27ae60', color: '#27ae60', borderRadius: '6px', padding: '5px 8px', cursor: 'pointer', fontSize: '11px', fontWeight: 'bold' }}>⛽ تعبئة</button>
                            <button onClick={() => { setCylinderForm({ name: cyl.name, description: cyl.description||'', location: cyl.location||'', sizeKg: cyl.sizeKg, notes: cyl.notes||'' }); setEditCylinderId(cyl.id); setShowAddCylinder(true); }} style={{ background: '#f0f9f6', border: '1px solid #2e4057', color: '#2e4057', borderRadius: '6px', padding: '5px 8px', cursor: 'pointer', fontSize: '13px' }}>✏️</button>
                            <button onClick={() => { if (window.confirm(`حذف "${cyl.name}"؟`)) saveGasCylinders(gasCylinders.filter(c => c.id !== cyl.id)); }} style={{ background: '#fff0f0', border: '1px solid #e74c3c', color: '#e74c3c', borderRadius: '6px', padding: '5px 8px', cursor: 'pointer', fontSize: '13px' }}>🗑️</button>
                          </div>
                        </div>

                        {/* إحصائيات الاستهلاك */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(110px,1fr))', gap: '8px', marginBottom: '10px' }}>
                          <div style={{ background: 'white', borderRadius: '8px', padding: '8px', textAlign: 'center', border: '1px solid #eee' }}>
                            <div style={{ fontWeight: 'bold', color: '#2e4057', fontSize: '15px' }}>{cyl.refills?.length || 0}</div>
                            <div style={{ fontSize: '10px', color: '#888' }}>عدد التعبئات</div>
                          </div>
                          <div style={{ background: 'white', borderRadius: '8px', padding: '8px', textAlign: 'center', border: '1px solid #eee' }}>
                            <div style={{ fontWeight: 'bold', color: '#e67e22', fontSize: '15px' }}>{cyl.avgDays ? `${cyl.avgDays} يوم` : '—'}</div>
                            <div style={{ fontSize: '10px', color: '#888' }}>متوسط الاستهلاك</div>
                          </div>
                          <div style={{ background: 'white', borderRadius: '8px', padding: '8px', textAlign: 'center', border: '1px solid #eee' }}>
                            <div style={{ fontWeight: 'bold', color: '#27ae60', fontSize: '15px' }}>{cyl.avgPrice ? `${cyl.avgPrice.toFixed(0)} ر` : '—'}</div>
                            <div style={{ fontSize: '10px', color: '#888' }}>متوسط التعبئة</div>
                          </div>
                          <div style={{ background: cyl.needsAlert ? '#fff3f3' : 'white', borderRadius: '8px', padding: '8px', textAlign: 'center', border: `1px solid ${barColor}` }}>
                            <div style={{ fontWeight: 'bold', color: barColor, fontSize: '15px' }}>{cyl.daysLeft !== null ? `${cyl.daysLeft} يوم` : '—'}</div>
                            <div style={{ fontSize: '10px', color: '#888' }}>متبقي تقريباً</div>
                          </div>
                        </div>

                        {/* شريط المتبقي */}
                        {pct !== null && (
                          <div style={{ marginBottom: '8px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#888', marginBottom: '3px' }}>
                              <span>المتبقي التقريبي</span>
                              <span style={{ color: barColor, fontWeight: 'bold' }}>{pct}%</span>
                            </div>
                            <div style={{ height: '8px', background: '#eee', borderRadius: '4px' }}>
                              <div style={{ height: '100%', width: `${pct}%`, background: barColor, borderRadius: '4px', transition: 'width 0.3s' }} />
                            </div>
                          </div>
                        )}

                        {/* آخر تعبئة والقادمة */}
                        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', fontSize: '12px', color: '#666' }}>
                          {cyl.lastRefill && <span>⛽ آخر تعبئة: <strong>{new Date(cyl.lastRefill.date).toLocaleDateString('ar-SA')}</strong> ({cyl.daysSinceLast} يوم)</span>}
                          {cyl.nextEstimate && <span style={{ color: cyl.needsAlert ? '#e74c3c' : '#2e4057' }}>📅 المتوقع القادم: <strong>{new Date(cyl.nextEstimate).toLocaleDateString('ar-SA')}</strong></span>}
                          {cyl.lastRefill?.price > 0 && <span>💰 آخر سعر: <strong>{cyl.lastRefill.price} ر</strong></span>}
                        </div>
                      </div>
                    );
                  })}

                  {gasCylinders.length === 0 && !showAddCylinder && (
                    <div style={{ textAlign: 'center', padding: '30px', color: '#bbb' }}>
                      <div style={{ fontSize: '40px', marginBottom: '10px' }}>🔵</div>
                      <div>أضف أسطوانات الغاز لبدء المراقبة</div>
                    </div>
                  )}

                  {/* نموذج إضافة أسطوانة */}
                  {showAddCylinder ? (
                    <div style={{ background: '#f0f4ff', border: '2px solid #2e4057', borderRadius: '10px', padding: '15px', marginTop: '10px' }}>
                      <h4 style={{ color: '#2e4057', margin: '0 0 12px' }}>{editCylinderId ? '✏️ تعديل أسطوانة' : '➕ إضافة أسطوانة'}</h4>
                      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '10px' }}>
                        <div><label style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>اسم الأسطوانة *</label><input value={cylinderForm.name} onChange={e => setCylinderForm(p => ({ ...p, name: e.target.value }))} placeholder="مثال: غاز المطبخ الرئيسي" style={{ padding: '8px', border: '1px solid #ddd', borderRadius: '6px', width: '100%', fontSize: '13px' }} /></div>
                        <div><label style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>📍 الموقع</label><input value={cylinderForm.location} onChange={e => setCylinderForm(p => ({ ...p, location: e.target.value }))} placeholder="مثال: المطبخ الرئيسي" style={{ padding: '8px', border: '1px solid #ddd', borderRadius: '6px', width: '100%', fontSize: '13px' }} /></div>
                        <div><label style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>الوزن (كجم)</label>
                          <select value={cylinderForm.sizeKg} onChange={e => setCylinderForm(p => ({ ...p, sizeKg: parseFloat(e.target.value) }))} style={{ padding: '8px', border: '1px solid #ddd', borderRadius: '6px', width: '100%', fontSize: '13px' }}>
                            {[5, 10, 12.5, 15, 25, 50].map(s => <option key={s} value={s}>{s} كجم</option>)}
                          </select>
                        </div>
                        <div><label style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>وصف / مميزات</label><input value={cylinderForm.description} onChange={e => setCylinderForm(p => ({ ...p, description: e.target.value }))} placeholder="مثال: للأفران، للمدفأة..." style={{ padding: '8px', border: '1px solid #ddd', borderRadius: '6px', width: '100%', fontSize: '13px' }} /></div>
                        <div style={{ gridColumn: isMobile ? '1' : '1 / -1' }}><label style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>📝 ملاحظات</label><input value={cylinderForm.notes} onChange={e => setCylinderForm(p => ({ ...p, notes: e.target.value }))} placeholder="اختياري" style={{ padding: '8px', border: '1px solid #ddd', borderRadius: '6px', width: '100%', fontSize: '13px' }} /></div>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '12px' }}>
                        <button onClick={handleSaveCylinder} style={{ background: '#2e4057', color: 'white', border: 'none', padding: '10px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>✓ حفظ</button>
                        <button onClick={() => { setShowAddCylinder(false); setEditCylinderId(null); setCylinderForm({ name: '', description: '', location: '', sizeKg: 25, notes: '' }); }} style={{ background: '#ddd', border: 'none', padding: '10px', borderRadius: '6px', cursor: 'pointer' }}>إلغاء</button>
                      </div>
                    </div>
                  ) : (
                    <button onClick={() => setShowAddCylinder(true)} style={{ width: '100%', padding: '11px', background: '#2e4057', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px', marginTop: '5px' }}>➕ إضافة أسطوانة</button>
                  )}

                  {/* Modal تعبئة */}
                  {showAddRefill && refillCylinderId && (
                    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1200, padding: '20px' }} onClick={() => setShowAddRefill(false)}>
                      <div style={{ background: 'white', borderRadius: '12px', maxWidth: '400px', width: '100%', padding: '20px' }} onClick={e => e.stopPropagation()}>
                        <h3 style={{ color: '#2e4057', margin: '0 0 15px' }}>⛽ تسجيل تعبئة — {gasCylinders.find(c => c.id === refillCylinderId)?.name}</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                          <div><label style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>📅 تاريخ التعبئة *</label><input type="date" value={refillForm.date} onChange={e => setRefillForm(p => ({ ...p, date: e.target.value }))} style={{ padding: '8px', border: '1px solid #ddd', borderRadius: '6px', width: '100%', fontSize: '13px' }} /></div>
                          <div><label style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>💰 سعر التعبئة (ريال)</label><input type="number" min="0" step="0.5" value={refillForm.price} onChange={e => setRefillForm(p => ({ ...p, price: e.target.value }))} placeholder="مثال: 85" style={{ padding: '8px', border: '1px solid #ddd', borderRadius: '6px', width: '100%', fontSize: '13px' }} /></div>
                          <div><label style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>📝 ملاحظات</label><input value={refillForm.notes} onChange={e => setRefillForm(p => ({ ...p, notes: e.target.value }))} placeholder="اختياري" style={{ padding: '8px', border: '1px solid #ddd', borderRadius: '6px', width: '100%', fontSize: '13px' }} /></div>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '15px' }}>
                          <button onClick={handleSaveRefill} style={{ background: '#27ae60', color: 'white', border: 'none', padding: '10px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>✓ حفظ</button>
                          <button onClick={() => setShowAddRefill(false)} style={{ background: '#ddd', border: 'none', padding: '10px', borderRadius: '6px', cursor: 'pointer' }}>إلغاء</button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ===== تبويب سجل التعبئة ===== */}
              {gasTab === 'refills' && (
                <div>
                  {gasCylinders.map(cyl => {
                    const refills = [...(cyl.refills || [])].sort((a, b) => new Date(b.date) - new Date(a.date));
                    if (refills.length === 0) return (
                      <div key={cyl.id} style={{ background: '#f9f9f9', borderRadius: '10px', padding: '12px', marginBottom: '10px', color: '#bbb', textAlign: 'center', fontSize: '12px' }}>
                        🔵 {cyl.name} — لا توجد تعبئات مسجلة
                      </div>
                    );
                    return (
                      <div key={cyl.id} style={{ marginBottom: '15px' }}>
                        <div style={{ fontWeight: 'bold', color: '#2e4057', fontSize: '13px', marginBottom: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span>🔵 {cyl.name} ({cyl.sizeKg} كجم)</span>
                          <button onClick={() => { setRefillCylinderId(cyl.id); setShowAddRefill(true); }} style={{ background: '#e8f5e9', border: '1px solid #27ae60', color: '#27ae60', borderRadius: '6px', padding: '4px 8px', cursor: 'pointer', fontSize: '11px', fontWeight: 'bold' }}>⛽ تعبئة جديدة</button>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          {refills.map((r, i) => (
                            <div key={r.id} style={{ background: i === 0 ? '#f0f4ff' : 'white', border: `1px solid ${i === 0 ? '#c5cae9' : '#eee'}`, borderRadius: '8px', padding: '10px 13px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '6px' }}>
                              <div style={{ fontSize: '13px' }}>
                                <span style={{ fontWeight: 'bold' }}>{new Date(r.date).toLocaleDateString('ar-SA')}</span>
                                {i === 0 && <span style={{ marginRight: '6px', fontSize: '10px', background: '#2e4057', color: 'white', padding: '1px 5px', borderRadius: '4px' }}>آخر تعبئة</span>}
                                {r.notes && <span style={{ fontSize: '11px', color: '#888', marginRight: '8px' }}>— {r.notes}</span>}
                              </div>
                              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                {r.price > 0 && <span style={{ fontWeight: 'bold', color: '#27ae60', fontSize: '13px' }}>💰 {r.price} ر</span>}
                                <button onClick={() => {
                                  if (!window.confirm('حذف هذه التعبئة؟')) return;
                                  const updated = gasCylinders.map(c => c.id === cyl.id ? { ...c, refills: c.refills.filter(x => x.id !== r.id) } : c);
                                  saveGasCylinders(updated);
                                }} style={{ background: '#fff0f0', border: '1px solid #e74c3c', color: '#e74c3c', borderRadius: '5px', padding: '3px 7px', cursor: 'pointer', fontSize: '11px' }}>🗑️</button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                  {gasCylinders.length === 0 && <div style={{ textAlign: 'center', padding: '40px', color: '#bbb' }}>أضف أسطوانات أولاً من تبويب الأسطوانات</div>}
                </div>
              )}

              {/* ===== تبويب الإحصائيات والتكاليف ===== */}
              {gasTab === 'stats' && (
                <div>
                  {/* الإجمالي الكلي */}
                  <div style={{ background: 'linear-gradient(135deg, #2e4057, #4a6fa5)', borderRadius: '12px', padding: '18px', marginBottom: '15px', color: 'white' }}>
                    <div style={{ fontSize: '13px', opacity: 0.85, marginBottom: '8px' }}>💰 إجمالي إنفاق الغاز</div>
                    <div style={{ fontSize: '28px', fontWeight: 'bold', marginBottom: '12px' }}>{gasTotalStats.total.toLocaleString()} ريال</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                      <div style={{ background: 'rgba(255,255,255,0.15)', borderRadius: '8px', padding: '8px', textAlign: 'center' }}>
                        <div style={{ fontWeight: 'bold', fontSize: '16px' }}>{gasTotalStats.avgMonthly.toFixed(0)} ر</div>
                        <div style={{ fontSize: '11px', opacity: 0.8 }}>شهري متوقع</div>
                      </div>
                      <div style={{ background: 'rgba(255,255,255,0.15)', borderRadius: '8px', padding: '8px', textAlign: 'center' }}>
                        <div style={{ fontWeight: 'bold', fontSize: '16px' }}>{gasTotalStats.avgYearly.toFixed(0)} ر</div>
                        <div style={{ fontSize: '11px', opacity: 0.8 }}>سنوي متوقع</div>
                      </div>
                    </div>
                  </div>

                  {/* تفصيل لكل أسطوانة */}
                  {gasStats.map(cyl => {
                    if (!cyl.refills || cyl.refills.length === 0) return null;
                    const prices = cyl.refills.map(r => parseFloat(r.price) || 0).filter(p => p > 0);
                    const minPrice = prices.length > 0 ? Math.min(...prices) : 0;
                    const maxPrice = prices.length > 0 ? Math.max(...prices) : 0;
                    return (
                      <div key={cyl.id} style={{ background: 'white', border: '1px solid #e0e4ef', borderRadius: '10px', padding: '14px', marginBottom: '10px' }}>
                        <div style={{ fontWeight: 'bold', fontSize: '14px', color: '#2e4057', marginBottom: '10px' }}>🔵 {cyl.name} <span style={{ fontSize: '12px', color: '#888', fontWeight: 'normal' }}>({cyl.sizeKg} كجم)</span></div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(100px,1fr))', gap: '7px', fontSize: '12px' }}>
                          <div style={{ background: '#f0f4ff', borderRadius: '7px', padding: '8px', textAlign: 'center' }}><div style={{ fontWeight: 'bold', color: '#2e4057' }}>{cyl.refills.length}</div><div style={{ color: '#888', fontSize: '10px' }}>تعبئة</div></div>
                          <div style={{ background: '#f0f4ff', borderRadius: '7px', padding: '8px', textAlign: 'center' }}><div style={{ fontWeight: 'bold', color: '#e67e22' }}>{cyl.avgDays || '—'} يوم</div><div style={{ color: '#888', fontSize: '10px' }}>متوسط دورة</div></div>
                          <div style={{ background: '#f0f4ff', borderRadius: '7px', padding: '8px', textAlign: 'center' }}><div style={{ fontWeight: 'bold', color: '#27ae60' }}>{cyl.avgPrice?.toFixed(0) || '—'} ر</div><div style={{ color: '#888', fontSize: '10px' }}>متوسط سعر</div></div>
                          {minPrice > 0 && <div style={{ background: '#e8f5e9', borderRadius: '7px', padding: '8px', textAlign: 'center' }}><div style={{ fontWeight: 'bold', color: '#27ae60' }}>{minPrice} ر</div><div style={{ color: '#888', fontSize: '10px' }}>أدنى سعر</div></div>}
                          {maxPrice > 0 && <div style={{ background: '#fff3e0', borderRadius: '7px', padding: '8px', textAlign: 'center' }}><div style={{ fontWeight: 'bold', color: '#e67e22' }}>{maxPrice} ر</div><div style={{ color: '#888', fontSize: '10px' }}>أعلى سعر</div></div>}
                          {cyl.monthlyEstimate && <div style={{ background: '#fce4ec', borderRadius: '7px', padding: '8px', textAlign: 'center' }}><div style={{ fontWeight: 'bold', color: '#c62828' }}>{cyl.monthlyEstimate.toFixed(0)} ر</div><div style={{ color: '#888', fontSize: '10px' }}>شهري</div></div>}
                          {cyl.yearlyEstimate && <div style={{ background: '#fce4ec', borderRadius: '7px', padding: '8px', textAlign: 'center' }}><div style={{ fontWeight: 'bold', color: '#c62828' }}>{cyl.yearlyEstimate.toFixed(0)} ر</div><div style={{ color: '#888', fontSize: '10px' }}>سنوي</div></div>}
                          <div style={{ background: '#f3e5f5', borderRadius: '7px', padding: '8px', textAlign: 'center' }}><div style={{ fontWeight: 'bold', color: '#7b1fa2' }}>{cyl.totalSpent.toLocaleString()} ر</div><div style={{ color: '#888', fontSize: '10px' }}>إجمالي الإنفاق</div></div>
                        </div>

                        {/* رسم بياني بسيط للأسعار */}
                        {prices.length >= 2 && (
                          <div style={{ marginTop: '10px' }}>
                            <div style={{ fontSize: '11px', color: '#888', marginBottom: '5px' }}>📈 تطور الأسعار:</div>
                            <div style={{ display: 'flex', gap: '3px', alignItems: 'flex-end', height: '40px' }}>
                              {[...cyl.refills].sort((a,b) => new Date(a.date)-new Date(b.date)).filter(r => r.price > 0).slice(-10).map((r, i, arr) => {
                                const barH = Math.round((r.price / maxPrice) * 100);
                                const isLast = i === arr.length - 1;
                                return (
                                  <div key={r.id} title={`${new Date(r.date).toLocaleDateString('ar-SA')}: ${r.price} ر`} style={{ flex: 1, height: `${barH}%`, background: isLast ? '#2e4057' : '#c5cae9', borderRadius: '3px 3px 0 0', minHeight: '4px', cursor: 'pointer' }} />
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {/* اقتراحات */}
                  <div style={{ background: '#f0f4ff', borderRadius: '10px', padding: '14px', border: '1px solid #c5cae9', fontSize: '12px', color: '#2e4057', marginTop: '5px' }}>
                    <div style={{ fontWeight: 'bold', marginBottom: '6px', fontSize: '13px' }}>💡 نصائح لتوفير الغاز:</div>
                    <div style={{ lineHeight: '2', color: '#555' }}>
                      ✅ اشتر في أوقات انخفاض الأسعار وخزّن أسطوانة احتياطية<br/>
                      ✅ تحقق من التسريبات بالماء والصابون دورياً<br/>
                      ✅ أغلق الأسطوانة عند عدم الاستخدام الطويل<br/>
                      ✅ قارن أسعار الموردين قبل التعبئة<br/>
                      ✅ سجّل كل تعبئة فور حدوثها للحصول على معدل دقيق
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div style={{ padding: '13px 20px', borderTop: '1px solid #eee' }}>
              <button onClick={() => setShowGasSystem(false)} style={{ width: '100%', background: '#2e4057', color: 'white', border: 'none', padding: '11px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px' }}>إغلاق</button>
            </div>
          </div>
        </div>
      )}

      {/* ===== Modal الطاقة الشمسية ===== */}
      {showSolarSystem && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', justifyContent: 'center', alignItems: 'flex-start', zIndex: 1000, padding: '15px', overflowY: 'auto' }} onClick={() => setShowSolarSystem(false)}>
          <div style={{ background: 'white', borderRadius: '14px', maxWidth: '780px', width: '100%', marginTop: '15px', overflow: 'hidden', boxShadow: '0 10px 40px rgba(0,0,0,0.4)' }} onClick={e => e.stopPropagation()}>

            {/* Header */}
            <div style={{ background: 'linear-gradient(135deg, #1a6b3c, #f39c12)', padding: '18px 22px', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '18px' }}>☀️ نظام الطاقة الشمسية</h2>
                <p style={{ margin: '4px 0 0', fontSize: '12px', opacity: 0.9 }}>البطاريات · الألواح · الإنفرتر · التكاليف</p>
              </div>
              {/* تنبيه عام */}
              {(() => {
                const alerts = [
                  ...batteries.filter(b => { const d = daysRemaining(b.purchaseDate, b.warrantyYears * 365); return d !== null && d === 0; }),
                  ...panels.filter(p => { const d = daysRemaining(p.lastWash, p.washIntervalDays); return d !== null && d === 0; }),
                ].length;
                return alerts > 0 ? <div style={{ background: '#e74c3c', borderRadius: '8px', padding: '6px 12px', fontSize: '12px', fontWeight: 'bold' }}>⚠️ {alerts} تنبيه عاجل</div> : null;
              })()}
            </div>

            {/* التبويبات */}
            <div style={{ display: 'flex', borderBottom: '2px solid #eee', background: '#f9fdf5', overflowX: 'auto' }}>
              {[
                { key: 'batteries', label: '🔋 البطاريات' },
                { key: 'panels', label: '☀️ الألواح' },
                { key: 'inverter', label: '⚡ الإنفرتر' },
                { key: 'costs', label: '💰 التكاليف' },
              ].map(tab => (
                <button key={tab.key} onClick={() => setSolarTab(tab.key)} style={{ flex: '0 0 auto', padding: '11px 16px', background: solarTab === tab.key ? 'white' : 'transparent', border: 'none', borderBottom: solarTab === tab.key ? '3px solid #1a6b3c' : '3px solid transparent', cursor: 'pointer', fontWeight: solarTab === tab.key ? 'bold' : 'normal', color: solarTab === tab.key ? '#1a6b3c' : '#888', fontSize: isMobile ? '11px' : '13px', whiteSpace: 'nowrap' }}>
                  {tab.label}
                </button>
              ))}
            </div>

            <div style={{ maxHeight: '580px', overflowY: 'auto', padding: '15px 20px' }}>

              {/* ===== تبويب البطاريات ===== */}
              {solarTab === 'batteries' && (
                <div>
                  {/* ملخص */}
                  {batteries.length > 0 && (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(130px,1fr))', gap: '8px', marginBottom: '15px' }}>
                      {[
                        { label: 'عدد البطاريات', val: batteries.length, color: '#1a6b3c', icon: '🔋' },
                        { label: 'إجمالي الطاقة', val: batteries.reduce((s, b) => s + (parseFloat(b.capacity) || 0), 0) + ' Ah', color: '#f39c12', icon: '⚡' },
                        { label: 'إجمالي التكلفة', val: solarCosts.totalBatteryCost.toLocaleString() + ' ر', color: '#27ae60', icon: '💰' },
                        { label: 'ضمان منتهي', val: batteries.filter(b => daysRemaining(b.purchaseDate, b.warrantyYears * 365) === 0).length, color: '#e74c3c', icon: '⚠️' },
                      ].map(s => (
                        <div key={s.label} style={{ background: '#f9fdf5', borderRadius: '8px', padding: '10px', textAlign: 'center', border: '1px solid #d5f5e3' }}>
                          <div style={{ fontSize: '16px', fontWeight: 'bold', color: s.color }}>{s.icon} {s.val}</div>
                          <div style={{ fontSize: '11px', color: '#888', marginTop: '2px' }}>{s.label}</div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* بطاقات البطاريات */}
                  {batteries.map(bat => {
                    const warrantyDays = Math.round(bat.warrantyYears * 365);
                    const lifespanDays = Math.round(bat.lifespanYears * 365);
                    const warrantyLeft = daysRemaining(bat.purchaseDate, warrantyDays);
                    const lifespanLeft = daysRemaining(bat.purchaseDate, lifespanDays);
                    const wPct = lifePct(warrantyLeft, warrantyDays);
                    const lPct = lifePct(lifespanLeft, lifespanDays);
                    const wColor = counterColor(warrantyLeft, warrantyDays);
                    const lColor = counterColor(lifespanLeft, lifespanDays);
                    const isWarrantyExpired = warrantyLeft === 0;
                    const isLifeExpired = lifespanLeft === 0;

                    return (
                      <div key={bat.id} style={{ background: isLifeExpired ? '#fff0f0' : isWarrantyExpired ? '#fff8f0' : '#f9fdf5', border: `2px solid ${isLifeExpired ? '#e74c3c' : isWarrantyExpired ? '#e67e22' : '#a9dfbf'}`, borderRadius: '12px', padding: '15px', marginBottom: '12px' }}>
                        {/* رأس البطارية */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
                          <div>
                            <div style={{ fontWeight: 'bold', fontSize: '15px', color: '#1a3a2a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                              🔋 {bat.name}
                              {isLifeExpired && <span style={{ background: '#e74c3c', color: 'white', fontSize: '10px', padding: '2px 7px', borderRadius: '4px', animation: 'pulse 1s infinite' }}>انتهى العمر!</span>}
                              {isWarrantyExpired && !isLifeExpired && <span style={{ background: '#e67e22', color: 'white', fontSize: '10px', padding: '2px 7px', borderRadius: '4px' }}>انتهى الضمان</span>}
                            </div>
                            <div style={{ fontSize: '12px', color: '#666', marginTop: '3px', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                              {bat.location && <span>📍 {bat.location}</span>}
                              {bat.brand && <span>🏷️ {bat.brand}</span>}
                              {bat.country && <span>🌍 {bat.country}</span>}
                              {bat.capacity && <span>⚡ {bat.capacity} Ah</span>}
                              {bat.voltage && <span>🔌 {bat.voltage}V</span>}
                            </div>
                            {bat.purchaseDate && <div style={{ fontSize: '12px', color: '#888', marginTop: '2px' }}>📅 تاريخ الشراء: {new Date(bat.purchaseDate).toLocaleDateString('ar-SA')}</div>}
                          </div>
                          <div style={{ display: 'flex', gap: '6px' }}>
                            <button onClick={() => { setBatteryForm({ name: bat.name, location: bat.location||'', brand: bat.brand||'', country: bat.country||'', capacity: bat.capacity||'', voltage: bat.voltage||'', purchaseDate: bat.purchaseDate||'', warrantyYears: bat.warrantyYears, lifespanYears: bat.lifespanYears, purchasePrice: bat.purchasePrice||'', notes: bat.notes||'' }); setEditBatteryId(bat.id); setShowAddBattery(true); }} style={{ background: '#f0f9f6', border: '1px solid #1a6b3c', color: '#1a6b3c', borderRadius: '6px', padding: '5px 8px', cursor: 'pointer', fontSize: '13px' }}>✏️</button>
                            <button onClick={() => { if (window.confirm(`حذف "${bat.name}"؟`)) saveBatteries(batteries.filter(b => b.id !== bat.id)); }} style={{ background: '#fff0f0', border: '1px solid #e74c3c', color: '#e74c3c', borderRadius: '6px', padding: '5px 8px', cursor: 'pointer', fontSize: '13px' }}>🗑️</button>
                          </div>
                        </div>

                        {/* العدادات التنازلية */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                          {/* عداد الضمان */}
                          <div style={{ background: isWarrantyExpired ? '#fff0f0' : 'white', borderRadius: '10px', padding: '10px', border: `1.5px solid ${wColor}` }}>
                            <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#555', marginBottom: '5px' }}>🛡️ الضمان ({bat.warrantyYears} سنة)</div>
                            <div style={{ fontSize: '20px', fontWeight: 'bold', color: wColor, textAlign: 'center', padding: '5px 0' }}>
                              {warrantyLeft === 0 ? '⚠️ منتهي' : warrantyLeft === null ? '—' : `${warrantyLeft} يوم`}
                            </div>
                            {wPct !== null && warrantyLeft > 0 && (
                              <div style={{ height: '6px', background: '#eee', borderRadius: '3px', marginTop: '5px' }}>
                                <div style={{ height: '100%', width: `${wPct}%`, background: wColor, borderRadius: '3px' }} />
                              </div>
                            )}
                            {warrantyLeft !== null && warrantyLeft > 0 && <div style={{ fontSize: '10px', color: '#aaa', marginTop: '3px', textAlign: 'center' }}>{wPct}% متبقي</div>}
                          </div>
                          {/* عداد العمر الافتراضي */}
                          <div style={{ background: isLifeExpired ? '#fff0f0' : 'white', borderRadius: '10px', padding: '10px', border: `1.5px solid ${lColor}` }}>
                            <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#555', marginBottom: '5px' }}>⏳ العمر الافتراضي ({bat.lifespanYears} سنة)</div>
                            <div style={{ fontSize: '20px', fontWeight: 'bold', color: lColor, textAlign: 'center', padding: '5px 0' }}>
                              {lifespanLeft === 0 ? '🔴 استبدل!' : lifespanLeft === null ? '—' : `${lifespanLeft} يوم`}
                            </div>
                            {lPct !== null && lifespanLeft > 0 && (
                              <div style={{ height: '6px', background: '#eee', borderRadius: '3px', marginTop: '5px' }}>
                                <div style={{ height: '100%', width: `${lPct}%`, background: lColor, borderRadius: '3px' }} />
                              </div>
                            )}
                            {lifespanLeft !== null && lifespanLeft > 0 && <div style={{ fontSize: '10px', color: '#aaa', marginTop: '3px', textAlign: 'center' }}>{lPct}% متبقي</div>}
                          </div>
                        </div>

                        {/* السعر والملاحظات */}
                        <div style={{ marginTop: '8px', display: 'flex', gap: '10px', flexWrap: 'wrap', fontSize: '12px' }}>
                          {bat.purchasePrice > 0 && <span style={{ background: '#d5f5e3', color: '#1a6b3c', padding: '3px 8px', borderRadius: '6px', fontWeight: 'bold' }}>💰 {parseFloat(bat.purchasePrice).toLocaleString()} ريال</span>}
                          {bat.notes && <span style={{ color: '#888' }}>📝 {bat.notes}</span>}
                        </div>
                      </div>
                    );
                  })}

                  {batteries.length === 0 && !showAddBattery && (
                    <div style={{ textAlign: 'center', padding: '30px', color: '#bbb' }}>
                      <div style={{ fontSize: '40px', marginBottom: '10px' }}>🔋</div>
                      <div>أضف بطاريات المشروع</div>
                    </div>
                  )}

                  {/* نموذج إضافة بطارية */}
                  {showAddBattery ? (
                    <div style={{ background: '#f0fdf5', border: '2px solid #1a6b3c', borderRadius: '10px', padding: '15px', marginTop: '10px' }}>
                      <h4 style={{ color: '#1a6b3c', margin: '0 0 12px' }}>{editBatteryId ? '✏️ تعديل بطارية' : '➕ إضافة بطارية'}</h4>
                      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '10px' }}>
                        <div><label style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>اسم/رقم البطارية *</label><input value={batteryForm.name} onChange={e => setBatteryForm(p => ({ ...p, name: e.target.value }))} placeholder="مثال: بطارية 1 - موقع أ" style={{ padding: '8px', border: '1px solid #ddd', borderRadius: '6px', width: '100%', fontSize: '13px' }} /></div>
                        <div><label style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>📍 الموقع</label><input value={batteryForm.location} onChange={e => setBatteryForm(p => ({ ...p, location: e.target.value }))} placeholder="مثال: غرفة الكهرباء - شمال" style={{ padding: '8px', border: '1px solid #ddd', borderRadius: '6px', width: '100%', fontSize: '13px' }} /></div>
                        <div><label style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>🏷️ الماركة</label><input value={batteryForm.brand} onChange={e => setBatteryForm(p => ({ ...p, brand: e.target.value }))} placeholder="مثال: Trojan, Narada" style={{ padding: '8px', border: '1px solid #ddd', borderRadius: '6px', width: '100%', fontSize: '13px' }} /></div>
                        <div><label style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>🌍 دولة الصنع</label><input value={batteryForm.country} onChange={e => setBatteryForm(p => ({ ...p, country: e.target.value }))} placeholder="مثال: الصين، أمريكا" style={{ padding: '8px', border: '1px solid #ddd', borderRadius: '6px', width: '100%', fontSize: '13px' }} /></div>
                        <div><label style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>⚡ السعة (Ah)</label><input type="number" min="0" value={batteryForm.capacity} onChange={e => setBatteryForm(p => ({ ...p, capacity: e.target.value }))} placeholder="مثال: 200" style={{ padding: '8px', border: '1px solid #ddd', borderRadius: '6px', width: '100%', fontSize: '13px' }} /></div>
                        <div><label style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>🔌 الجهد (V)</label><input type="number" min="0" value={batteryForm.voltage} onChange={e => setBatteryForm(p => ({ ...p, voltage: e.target.value }))} placeholder="مثال: 12" style={{ padding: '8px', border: '1px solid #ddd', borderRadius: '6px', width: '100%', fontSize: '13px' }} /></div>
                        <div><label style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>📅 تاريخ الشراء</label><input type="date" value={batteryForm.purchaseDate} onChange={e => setBatteryForm(p => ({ ...p, purchaseDate: e.target.value }))} style={{ padding: '8px', border: '1px solid #ddd', borderRadius: '6px', width: '100%', fontSize: '13px' }} /></div>
                        <div><label style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>💰 سعر الشراء (ريال)</label><input type="number" min="0" value={batteryForm.purchasePrice} onChange={e => setBatteryForm(p => ({ ...p, purchasePrice: e.target.value }))} placeholder="مثال: 800" style={{ padding: '8px', border: '1px solid #ddd', borderRadius: '6px', width: '100%', fontSize: '13px' }} /></div>
                        <div><label style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>🛡️ مدة الضمان (سنوات)</label>
                          <select value={batteryForm.warrantyYears} onChange={e => setBatteryForm(p => ({ ...p, warrantyYears: parseFloat(e.target.value) }))} style={{ padding: '8px', border: '1px solid #ddd', borderRadius: '6px', width: '100%', fontSize: '13px' }}>
                            {[0.5,1,1.5,2,3,5].map(y => <option key={y} value={y}>{y} سنة</option>)}
                          </select>
                        </div>
                        <div><label style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>⏳ العمر الافتراضي (سنوات)</label>
                          <select value={batteryForm.lifespanYears} onChange={e => setBatteryForm(p => ({ ...p, lifespanYears: parseFloat(e.target.value) }))} style={{ padding: '8px', border: '1px solid #ddd', borderRadius: '6px', width: '100%', fontSize: '13px' }}>
                            {[1,1.5,2,3,4,5,7,10].map(y => <option key={y} value={y}>{y} سنة</option>)}
                          </select>
                        </div>
                        <div style={{ gridColumn: isMobile ? '1' : '1 / -1' }}><label style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>📝 ملاحظات</label><input value={batteryForm.notes} onChange={e => setBatteryForm(p => ({ ...p, notes: e.target.value }))} placeholder="اختياري" style={{ padding: '8px', border: '1px solid #ddd', borderRadius: '6px', width: '100%', fontSize: '13px' }} /></div>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '12px' }}>
                        <button onClick={handleSaveBattery} style={{ background: '#1a6b3c', color: 'white', border: 'none', padding: '10px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>✓ حفظ</button>
                        <button onClick={() => { setShowAddBattery(false); setEditBatteryId(null); setBatteryForm({ name: '', location: '', brand: '', country: '', capacity: '', voltage: '', purchaseDate: '', warrantyYears: 1, lifespanYears: 2, purchasePrice: '', notes: '' }); }} style={{ background: '#ddd', border: 'none', padding: '10px', borderRadius: '6px', cursor: 'pointer' }}>إلغاء</button>
                      </div>
                    </div>
                  ) : (
                    <button onClick={() => setShowAddBattery(true)} style={{ width: '100%', padding: '11px', background: '#1a6b3c', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px', marginTop: '5px' }}>➕ إضافة بطارية</button>
                  )}
                </div>
              )}

              {/* ===== تبويب الألواح الشمسية ===== */}
              {solarTab === 'panels' && (
                <div>
                  {panels.map(panel => {
                    const washLeft = daysRemaining(panel.lastWash, panel.washIntervalDays);
                    const wColor = counterColor(washLeft, panel.washIntervalDays);
                    const isDue = washLeft === 0;
                    const wPct = lifePct(washLeft, panel.washIntervalDays);
                    return (
                      <div key={panel.id} style={{ background: isDue ? '#fff0f0' : '#f9fdf5', border: `2px solid ${isDue ? '#e74c3c' : '#a9dfbf'}`, borderRadius: '12px', padding: '14px', marginBottom: '10px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px' }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 'bold', fontSize: '14px', color: '#1a3a2a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                              ☀️ {panel.name}
                              {isDue && <span style={{ background: '#e74c3c', color: 'white', fontSize: '10px', padding: '2px 7px', borderRadius: '4px', fontWeight: 'bold' }}>🧼 يحتاج غسيل!</span>}
                            </div>
                            {panel.location && <div style={{ fontSize: '12px', color: '#888', marginTop: '2px' }}>📍 {panel.location}</div>}
                            {panel.description && <div style={{ fontSize: '12px', color: '#888', marginTop: '2px' }}>📝 {panel.description}</div>}
                          </div>
                          <div style={{ display: 'flex', gap: '6px' }}>
                            <button onClick={() => {
                              // تسجيل غسيل الآن
                              const today = new Date().toISOString().split('T')[0];
                              savePanels(panels.map(p => p.id === panel.id ? { ...p, lastWash: today } : p));
                            }} style={{ background: '#d6eaf8', border: '1px solid #2471a3', color: '#2471a3', borderRadius: '6px', padding: '5px 8px', cursor: 'pointer', fontSize: '11px', fontWeight: 'bold' }}>🧼 تم الغسيل</button>
                            <button onClick={() => { setPanelForm({ name: panel.name, location: panel.location||'', description: panel.description||'', lastWash: panel.lastWash||'', washIntervalDays: panel.washIntervalDays, notes: panel.notes||'' }); setEditPanelId(panel.id); setShowAddPanel(true); }} style={{ background: '#f0f9f6', border: '1px solid #1a6b3c', color: '#1a6b3c', borderRadius: '6px', padding: '5px 8px', cursor: 'pointer', fontSize: '13px' }}>✏️</button>
                            <button onClick={() => { if (window.confirm(`حذف "${panel.name}"؟`)) savePanels(panels.filter(p => p.id !== panel.id)); }} style={{ background: '#fff0f0', border: '1px solid #e74c3c', color: '#e74c3c', borderRadius: '6px', padding: '5px 8px', cursor: 'pointer', fontSize: '13px' }}>🗑️</button>
                          </div>
                        </div>

                        {/* عداد الغسيل */}
                        <div style={{ marginTop: '10px', background: isDue ? '#fff0f0' : 'white', borderRadius: '8px', padding: '10px', border: `1px solid ${wColor}` }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px' }}>
                            <span style={{ fontSize: '12px', color: '#555' }}>🧼 الغسيل القادم (كل {panel.washIntervalDays} يوم)</span>
                            <span style={{ fontWeight: 'bold', color: wColor, fontSize: '14px' }}>
                              {washLeft === null ? 'لم يُسجَّل غسيل بعد' : washLeft === 0 ? '⚠️ حان وقت الغسيل!' : `${washLeft} يوم`}
                            </span>
                          </div>
                          {wPct !== null && washLeft > 0 && (
                            <div style={{ height: '6px', background: '#eee', borderRadius: '3px' }}>
                              <div style={{ height: '100%', width: `${wPct}%`, background: wColor, borderRadius: '3px' }} />
                            </div>
                          )}
                          {panel.lastWash && <div style={{ fontSize: '11px', color: '#aaa', marginTop: '3px' }}>آخر غسيل: {new Date(panel.lastWash).toLocaleDateString('ar-SA')}</div>}
                        </div>
                      </div>
                    );
                  })}

                  {panels.length === 0 && !showAddPanel && (
                    <div style={{ textAlign: 'center', padding: '30px', color: '#bbb' }}>
                      <div style={{ fontSize: '40px', marginBottom: '10px' }}>☀️</div>
                      <div>أضف الألواح الشمسية لمتابعة جدول الغسيل</div>
                    </div>
                  )}

                  {showAddPanel ? (
                    <div style={{ background: '#f0fdf5', border: '2px solid #1a6b3c', borderRadius: '10px', padding: '15px', marginTop: '10px' }}>
                      <h4 style={{ color: '#1a6b3c', margin: '0 0 12px' }}>{editPanelId ? '✏️ تعديل لوح' : '➕ إضافة لوح شمسي'}</h4>
                      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '10px' }}>
                        <div><label style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>اسم/رقم اللوح *</label><input value={panelForm.name} onChange={e => setPanelForm(p => ({ ...p, name: e.target.value }))} placeholder="مثال: لوح 1 - السطح الشمالي" style={{ padding: '8px', border: '1px solid #ddd', borderRadius: '6px', width: '100%', fontSize: '13px' }} /></div>
                        <div><label style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>📍 الموقع</label><input value={panelForm.location} onChange={e => setPanelForm(p => ({ ...p, location: e.target.value }))} placeholder="مثال: سطح المبنى الشرقي" style={{ padding: '8px', border: '1px solid #ddd', borderRadius: '6px', width: '100%', fontSize: '13px' }} /></div>
                        <div><label style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>وصف اللوح</label><input value={panelForm.description} onChange={e => setPanelForm(p => ({ ...p, description: e.target.value }))} placeholder="مثال: 400W - ماركة كانادا" style={{ padding: '8px', border: '1px solid #ddd', borderRadius: '6px', width: '100%', fontSize: '13px' }} /></div>
                        <div><label style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>📅 تاريخ آخر غسيل</label><input type="date" value={panelForm.lastWash} onChange={e => setPanelForm(p => ({ ...p, lastWash: e.target.value }))} style={{ padding: '8px', border: '1px solid #ddd', borderRadius: '6px', width: '100%', fontSize: '13px' }} /></div>
                        <div><label style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>🔄 فترة الغسيل (يوم)</label>
                          <select value={panelForm.washIntervalDays} onChange={e => setPanelForm(p => ({ ...p, washIntervalDays: parseInt(e.target.value) }))} style={{ padding: '8px', border: '1px solid #ddd', borderRadius: '6px', width: '100%', fontSize: '13px' }}>
                            <option value={15}>كل 15 يوم</option>
                            <option value={30}>كل شهر</option>
                            <option value={45}>كل 45 يوم</option>
                            <option value={60}>كل شهرين</option>
                            <option value={90}>كل 3 أشهر</option>
                          </select>
                        </div>
                        <div><label style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>📝 ملاحظات</label><input value={panelForm.notes} onChange={e => setPanelForm(p => ({ ...p, notes: e.target.value }))} placeholder="اختياري" style={{ padding: '8px', border: '1px solid #ddd', borderRadius: '6px', width: '100%', fontSize: '13px' }} /></div>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '12px' }}>
                        <button onClick={handleSavePanel} style={{ background: '#1a6b3c', color: 'white', border: 'none', padding: '10px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>✓ حفظ</button>
                        <button onClick={() => { setShowAddPanel(false); setEditPanelId(null); setPanelForm({ name: '', location: '', description: '', lastWash: '', washIntervalDays: 60, notes: '' }); }} style={{ background: '#ddd', border: 'none', padding: '10px', borderRadius: '6px', cursor: 'pointer' }}>إلغاء</button>
                      </div>
                    </div>
                  ) : (
                    <button onClick={() => setShowAddPanel(true)} style={{ width: '100%', padding: '11px', background: '#1a6b3c', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px', marginTop: '5px' }}>➕ إضافة لوح شمسي</button>
                  )}
                </div>
              )}

              {/* ===== تبويب الإنفرتر ===== */}
              {solarTab === 'inverter' && (
                <div>
                  {inverters.map(inv => {
                    const warrantyDays = Math.round(inv.warrantyYears * 365);
                    const wLeft = daysRemaining(inv.purchaseDate, warrantyDays);
                    const wColor = counterColor(wLeft, warrantyDays);
                    const wPct = lifePct(wLeft, warrantyDays);
                    return (
                      <div key={inv.id} style={{ background: wLeft === 0 ? '#fff8f0' : '#f9fdf5', border: `2px solid ${wColor}`, borderRadius: '12px', padding: '14px', marginBottom: '10px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px', marginBottom: '10px' }}>
                          <div>
                            <div style={{ fontWeight: 'bold', fontSize: '15px', color: '#1a3a2a' }}>⚡ {inv.name}</div>
                            <div style={{ fontSize: '12px', color: '#666', marginTop: '3px', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                              {inv.brand && <span>🏷️ {inv.brand}</span>}
                              {inv.capacity && <span>⚡ {inv.capacity} KW</span>}
                              {inv.purchaseDate && <span>📅 {new Date(inv.purchaseDate).toLocaleDateString('ar-SA')}</span>}
                            </div>
                          </div>
                          <div style={{ display: 'flex', gap: '6px' }}>
                            <button onClick={() => { setInverterForm({ name: inv.name, brand: inv.brand||'', capacity: inv.capacity||'', purchaseDate: inv.purchaseDate||'', warrantyYears: inv.warrantyYears, purchasePrice: inv.purchasePrice||'', notes: inv.notes||'' }); setEditInverterId(inv.id); setShowAddInverter(true); }} style={{ background: '#f0f9f6', border: '1px solid #1a6b3c', color: '#1a6b3c', borderRadius: '6px', padding: '5px 8px', cursor: 'pointer', fontSize: '13px' }}>✏️</button>
                            <button onClick={() => { if (window.confirm(`حذف "${inv.name}"؟`)) saveInverters(inverters.filter(i => i.id !== inv.id)); }} style={{ background: '#fff0f0', border: '1px solid #e74c3c', color: '#e74c3c', borderRadius: '6px', padding: '5px 8px', cursor: 'pointer', fontSize: '13px' }}>🗑️</button>
                          </div>
                        </div>
                        {/* عداد الضمان */}
                        <div style={{ background: wLeft === 0 ? '#fff0f0' : 'white', borderRadius: '8px', padding: '10px', border: `1px solid ${wColor}` }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                            <span style={{ fontSize: '12px', color: '#555' }}>🛡️ الضمان ({inv.warrantyYears} سنة)</span>
                            <span style={{ fontWeight: 'bold', color: wColor }}>{wLeft === null ? '—' : wLeft === 0 ? '⚠️ منتهي' : `${wLeft} يوم`}</span>
                          </div>
                          {wPct !== null && wLeft > 0 && <div style={{ height: '6px', background: '#eee', borderRadius: '3px' }}><div style={{ height: '100%', width: `${wPct}%`, background: wColor, borderRadius: '3px' }} /></div>}
                        </div>
                        {inv.purchasePrice > 0 && <div style={{ marginTop: '8px', fontSize: '12px' }}><span style={{ background: '#d5f5e3', color: '#1a6b3c', padding: '3px 8px', borderRadius: '6px', fontWeight: 'bold' }}>💰 {parseFloat(inv.purchasePrice).toLocaleString()} ريال</span></div>}
                        {inv.notes && <div style={{ marginTop: '6px', fontSize: '12px', color: '#888' }}>📝 {inv.notes}</div>}
                      </div>
                    );
                  })}

                  {inverters.length === 0 && !showAddInverter && (
                    <div style={{ textAlign: 'center', padding: '30px', color: '#bbb' }}>
                      <div style={{ fontSize: '40px', marginBottom: '10px' }}>⚡</div>
                      <div>أضف الإنفرتر لمتابعة ضمانه</div>
                    </div>
                  )}

                  {showAddInverter ? (
                    <div style={{ background: '#f0fdf5', border: '2px solid #1a6b3c', borderRadius: '10px', padding: '15px', marginTop: '10px' }}>
                      <h4 style={{ color: '#1a6b3c', margin: '0 0 12px' }}>{editInverterId ? '✏️ تعديل إنفرتر' : '➕ إضافة إنفرتر'}</h4>
                      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '10px' }}>
                        <div><label style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>اسم الإنفرتر *</label><input value={inverterForm.name} onChange={e => setInverterForm(p => ({ ...p, name: e.target.value }))} placeholder="مثال: إنفرتر رئيسي" style={{ padding: '8px', border: '1px solid #ddd', borderRadius: '6px', width: '100%', fontSize: '13px' }} /></div>
                        <div><label style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>الماركة</label><input value={inverterForm.brand} onChange={e => setInverterForm(p => ({ ...p, brand: e.target.value }))} placeholder="مثال: Growatt, Huawei" style={{ padding: '8px', border: '1px solid #ddd', borderRadius: '6px', width: '100%', fontSize: '13px' }} /></div>
                        <div><label style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>⚡ الطاقة (KW)</label><input type="number" min="0" step="0.1" value={inverterForm.capacity} onChange={e => setInverterForm(p => ({ ...p, capacity: e.target.value }))} placeholder="مثال: 5" style={{ padding: '8px', border: '1px solid #ddd', borderRadius: '6px', width: '100%', fontSize: '13px' }} /></div>
                        <div><label style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>📅 تاريخ الشراء</label><input type="date" value={inverterForm.purchaseDate} onChange={e => setInverterForm(p => ({ ...p, purchaseDate: e.target.value }))} style={{ padding: '8px', border: '1px solid #ddd', borderRadius: '6px', width: '100%', fontSize: '13px' }} /></div>
                        <div><label style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>🛡️ الضمان (سنوات)</label>
                          <select value={inverterForm.warrantyYears} onChange={e => setInverterForm(p => ({ ...p, warrantyYears: parseFloat(e.target.value) }))} style={{ padding: '8px', border: '1px solid #ddd', borderRadius: '6px', width: '100%', fontSize: '13px' }}>
                            {[1,2,3,5,7,10].map(y => <option key={y} value={y}>{y} سنة</option>)}
                          </select>
                        </div>
                        <div><label style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>💰 سعر الشراء (ريال)</label><input type="number" min="0" value={inverterForm.purchasePrice} onChange={e => setInverterForm(p => ({ ...p, purchasePrice: e.target.value }))} placeholder="مثال: 3000" style={{ padding: '8px', border: '1px solid #ddd', borderRadius: '6px', width: '100%', fontSize: '13px' }} /></div>
                        <div style={{ gridColumn: isMobile ? '1' : '1 / -1' }}><label style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>📝 ملاحظات</label><input value={inverterForm.notes} onChange={e => setInverterForm(p => ({ ...p, notes: e.target.value }))} placeholder="اختياري" style={{ padding: '8px', border: '1px solid #ddd', borderRadius: '6px', width: '100%', fontSize: '13px' }} /></div>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '12px' }}>
                        <button onClick={handleSaveInverter} style={{ background: '#1a6b3c', color: 'white', border: 'none', padding: '10px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>✓ حفظ</button>
                        <button onClick={() => { setShowAddInverter(false); setEditInverterId(null); setInverterForm({ name: '', brand: '', capacity: '', purchaseDate: '', warrantyYears: 2, purchasePrice: '', notes: '' }); }} style={{ background: '#ddd', border: 'none', padding: '10px', borderRadius: '6px', cursor: 'pointer' }}>إلغاء</button>
                      </div>
                    </div>
                  ) : (
                    <button onClick={() => setShowAddInverter(true)} style={{ width: '100%', padding: '11px', background: '#1a6b3c', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px', marginTop: '5px' }}>➕ إضافة إنفرتر</button>
                  )}
                </div>
              )}

              {/* ===== تبويب التكاليف ===== */}
              {solarTab === 'costs' && (
                <div>
                  {/* الإجمالي الكلي */}
                  <div style={{ background: 'linear-gradient(135deg, #1a6b3c, #f39c12)', borderRadius: '12px', padding: '18px', marginBottom: '20px', color: 'white', textAlign: 'center' }}>
                    <div style={{ fontSize: '13px', opacity: 0.9, marginBottom: '6px' }}>💰 إجمالي تكاليف الطاقة الشمسية</div>
                    <div style={{ fontSize: '32px', fontWeight: 'bold' }}>{solarCosts.grandTotal.toLocaleString()} ريال</div>
                  </div>

                  {/* تفصيل حسب الفئة */}
                  <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
                    <div style={{ background: '#f0fdf5', borderRadius: '10px', padding: '14px', border: '1px solid #a9dfbf' }}>
                      <div style={{ fontWeight: 'bold', color: '#1a6b3c', marginBottom: '10px', fontSize: '13px' }}>🔋 البطاريات ({batteries.length})</div>
                      {batteries.length === 0 ? <div style={{ color: '#bbb', fontSize: '12px' }}>لا توجد بطاريات</div> : batteries.map(b => (
                        <div key={b.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', padding: '4px 0', borderBottom: '1px solid #eee' }}>
                          <span>{b.name}</span>
                          <span style={{ fontWeight: 'bold', color: '#1a6b3c' }}>{parseFloat(b.purchasePrice || 0).toLocaleString()} ر</span>
                        </div>
                      ))}
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', fontWeight: 'bold', marginTop: '8px', color: '#1a6b3c' }}>
                        <span>الإجمالي</span><span>{solarCosts.totalBatteryCost.toLocaleString()} ريال</span>
                      </div>
                    </div>

                    <div style={{ background: '#fef9e7', borderRadius: '10px', padding: '14px', border: '1px solid #f0e68c' }}>
                      <div style={{ fontWeight: 'bold', color: '#b7950b', marginBottom: '10px', fontSize: '13px' }}>⚡ الإنفرتر ({inverters.length})</div>
                      {inverters.length === 0 ? <div style={{ color: '#bbb', fontSize: '12px' }}>لا يوجد إنفرتر</div> : inverters.map(i => (
                        <div key={i.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', padding: '4px 0', borderBottom: '1px solid #eee' }}>
                          <span>{i.name}</span>
                          <span style={{ fontWeight: 'bold', color: '#b7950b' }}>{parseFloat(i.purchasePrice || 0).toLocaleString()} ر</span>
                        </div>
                      ))}
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', fontWeight: 'bold', marginTop: '8px', color: '#b7950b' }}>
                        <span>الإجمالي</span><span>{solarCosts.totalInverterCost.toLocaleString()} ريال</span>
                      </div>
                    </div>
                  </div>

                  {/* ملاحظة اقتراح */}
                  <div style={{ background: '#f0f4ff', borderRadius: '10px', padding: '14px', border: '1px solid #d6eaf8', fontSize: '13px', color: '#2471a3' }}>
                    <div style={{ fontWeight: 'bold', marginBottom: '6px' }}>💡 اقتراح لتحسين إدارة الطاقة:</div>
                    <div style={{ lineHeight: '1.8', color: '#555', fontSize: '12px' }}>
                      ✅ تحقق من مستوى الشحن للبطاريات أسبوعياً<br/>
                      ✅ نظّف الألواح الشمسية في الصباح الباكر أو بعد الغروب<br/>
                      ✅ تجنب الشحن الزائد والتفريغ الكامل للإطالة عمر البطاريات<br/>
                      ✅ راقب درجة حرارة البطاريات في الصيف — الحرارة تسرّع التلف<br/>
                      ✅ سجّل قراءة الفولت دورياً كمؤشر على صحة البطاريات
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div style={{ padding: '13px 20px', borderTop: '1px solid #eee' }}>
              <button onClick={() => setShowSolarSystem(false)} style={{ width: '100%', background: '#1a6b3c', color: 'white', border: 'none', padding: '11px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px' }}>إغلاق</button>
            </div>
          </div>
        </div>
      )}

      {/* ===== Modal إدارة الأعلاف ===== */}
      {showFeedSystem && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', justifyContent: 'center', alignItems: 'flex-start', zIndex: 1000, padding: '15px', overflowY: 'auto' }} onClick={() => setShowFeedSystem(false)}>
          <div style={{ background: 'white', borderRadius: '14px', maxWidth: '780px', width: '100%', marginTop: '15px', overflow: 'hidden', boxShadow: '0 10px 40px rgba(0,0,0,0.4)' }} onClick={e => e.stopPropagation()}>

            {/* Header */}
            <div style={{ background: 'linear-gradient(135deg, #6e4b1f, #4a3010)', padding: '18px 22px', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '18px' }}>🌾 إدارة الأعلاف</h2>
                <p style={{ margin: '4px 0 0', fontSize: '12px', opacity: 0.85 }}>المخزون · المشتريات · الاستهلاك · التوقعات والتنبيهات</p>
              </div>
              {feedForecast.some(f => f.alert) && (
                <div style={{ background: '#e74c3c', borderRadius: '8px', padding: '6px 12px', fontSize: '12px', fontWeight: 'bold' }}>
                  ⚠️ {feedForecast.filter(f => f.alert).length} علف ينفد قريباً
                </div>
              )}
            </div>

            {/* التبويبات */}
            <div style={{ display: 'flex', borderBottom: '2px solid #eee', background: '#faf8f5', overflowX: 'auto' }}>
              {[
                { key: 'stock', label: '📦 المخزون' },
                { key: 'purchases', label: '🛒 المشتريات' },
                { key: 'consumption', label: '⚙️ معدلات الاستهلاك' },
                { key: 'forecast', label: '📊 التوقعات والتكاليف' },
              ].map(tab => (
                <button key={tab.key} onClick={() => setFeedTab(tab.key)} style={{ flex: '0 0 auto', padding: '11px 14px', background: feedTab === tab.key ? 'white' : 'transparent', border: 'none', borderBottom: feedTab === tab.key ? '3px solid #6e4b1f' : '3px solid transparent', cursor: 'pointer', fontWeight: feedTab === tab.key ? 'bold' : 'normal', color: feedTab === tab.key ? '#6e4b1f' : '#888', fontSize: isMobile ? '11px' : '12px', whiteSpace: 'nowrap' }}>
                  {tab.label}
                </button>
              ))}
            </div>

            <div style={{ maxHeight: '580px', overflowY: 'auto', padding: '15px 20px' }}>

              {/* ===== تبويب المخزون ===== */}
              {feedTab === 'stock' && (
                <div>
                  {/* ملخص سريع */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(130px,1fr))', gap: '8px', marginBottom: '15px' }}>
                    <div style={{ background: '#faf3e8', borderRadius: '8px', padding: '10px', textAlign: 'center', border: '1px solid #e8d5b0' }}>
                      <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#6e4b1f' }}>{feeds.length}</div>
                      <div style={{ fontSize: '11px', color: '#888' }}>🌾 أنواع الأعلاف</div>
                    </div>
                    <div style={{ background: '#fef9e7', borderRadius: '8px', padding: '10px', textAlign: 'center', border: '1px solid #f0e68c' }}>
                      <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#d4ac0d' }}>{feedForecast.filter(f => f.alert).length}</div>
                      <div style={{ fontSize: '11px', color: '#888' }}>⚠️ تنبيهات المخزون</div>
                    </div>
                    <div style={{ background: '#f0f9f6', borderRadius: '8px', padding: '10px', textAlign: 'center', border: '1px solid #a9dfbf' }}>
                      <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#27ae60' }}>{feedPurchases.reduce((s, p) => s + p.totalCost, 0).toLocaleString()} ر</div>
                      <div style={{ fontSize: '11px', color: '#888' }}>💰 إجمالي المشتريات</div>
                    </div>
                  </div>

                  {/* قائمة الأعلاف */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '15px' }}>
                    {feeds.map(feed => {
                      const fc = feedForecast.find(f => f.id === feed.id);
                      const isAlert = fc?.alert;
                      const lastP = lastPricePerFeed[feed.id];
                      return (
                        <div key={feed.id} style={{ background: isAlert ? '#fff8f0' : 'white', border: `1.5px solid ${isAlert ? '#e67e22' : '#eee'}`, borderRadius: '10px', padding: '12px 15px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px' }}>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontWeight: 'bold', fontSize: '14px', color: '#4a3010', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                🌾 {feed.name}
                                {isAlert && <span style={{ background: '#e67e22', color: 'white', fontSize: '10px', padding: '2px 6px', borderRadius: '4px' }}>⚠️ ينفد قريباً</span>}
                              </div>
                              <div style={{ display: 'flex', gap: '14px', marginTop: '6px', flexWrap: 'wrap', fontSize: '12px', color: '#666' }}>
                                <span>📦 المخزون: <strong>{feed.stock} {feed.unit}</strong> ({(parseFloat(feed.stock) * parseFloat(feed.unitWeight)).toFixed(0)} كجم)</span>
                                <span>⚖️ وزن الوحدة: <strong>{feed.unitWeight} كجم</strong></span>
                                {fc?.dailyKg > 0 && <span>🔥 استهلاك يومي: <strong>{fc.dailyKg.toFixed(1)} كجم</strong></span>}
                                {fc?.daysLeft !== null && <span style={{ color: fc.daysLeft <= 7 ? '#e74c3c' : fc.daysLeft <= 21 ? '#e67e22' : '#27ae60', fontWeight: 'bold' }}>⏳ يكفي: <strong>{fc.daysLeft} يوم</strong></span>}
                                {lastP && <span>💰 آخر سعر: <strong>{lastP.price} ر/{feed.unit}</strong></span>}
                              </div>
                            </div>
                            <div style={{ display: 'flex', gap: '6px' }}>
                              <button onClick={() => { setFeedForm({ name: feed.name, unit: feed.unit, unitWeight: feed.unitWeight, stock: feed.stock, minAlert: feed.minAlert }); setEditFeedId(feed.id); setShowAddFeed(true); }} style={{ background: '#f0f9f6', border: '1px solid #117a65', color: '#117a65', borderRadius: '6px', padding: '5px 8px', cursor: 'pointer', fontSize: '13px' }}>✏️</button>
                              <button onClick={() => { if (window.confirm(`حذف "${feed.name}"؟`)) saveFeeds(feeds.filter(f => f.id !== feed.id)); }} style={{ background: '#fff0f0', border: '1px solid #e74c3c', color: '#e74c3c', borderRadius: '6px', padding: '5px 8px', cursor: 'pointer', fontSize: '13px' }}>🗑️</button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* نموذج إضافة/تعديل علف */}
                  {showAddFeed ? (
                    <div style={{ background: '#faf3e8', border: '2px solid #6e4b1f', borderRadius: '10px', padding: '15px' }}>
                      <h4 style={{ color: '#6e4b1f', margin: '0 0 12px' }}>{editFeedId ? '✏️ تعديل علف' : '➕ إضافة علف جديد'}</h4>
                      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '10px' }}>
                        <div><label style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>اسم العلف *</label><input value={feedForm.name} onChange={e => setFeedForm(p => ({ ...p, name: e.target.value }))} placeholder="مثال: ذرة صفراء" style={{ padding: '8px', border: '1px solid #ddd', borderRadius: '6px', width: '100%', fontSize: '13px' }} /></div>
                        <div><label style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>وحدة القياس</label>
                          <select value={feedForm.unit} onChange={e => setFeedForm(p => ({ ...p, unit: e.target.value }))} style={{ padding: '8px', border: '1px solid #ddd', borderRadius: '6px', width: '100%', fontSize: '13px' }}>
                            <option>كيس</option><option>ربطة</option><option>طن</option><option>كرتون</option><option>بالة</option>
                          </select>
                        </div>
                        <div><label style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>وزن الوحدة (كجم)</label><input type="number" min="0.1" step="0.1" value={feedForm.unitWeight} onChange={e => setFeedForm(p => ({ ...p, unitWeight: e.target.value }))} style={{ padding: '8px', border: '1px solid #ddd', borderRadius: '6px', width: '100%', fontSize: '13px' }} /></div>
                        <div><label style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>المخزون الحالي ({feedForm.unit})</label><input type="number" min="0" value={feedForm.stock} onChange={e => setFeedForm(p => ({ ...p, stock: e.target.value }))} style={{ padding: '8px', border: '1px solid #ddd', borderRadius: '6px', width: '100%', fontSize: '13px' }} /></div>
                        <div><label style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>حد التنبيه المبكر ({feedForm.unit})</label><input type="number" min="1" value={feedForm.minAlert} onChange={e => setFeedForm(p => ({ ...p, minAlert: e.target.value }))} style={{ padding: '8px', border: '1px solid #ddd', borderRadius: '6px', width: '100%', fontSize: '13px' }} /></div>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '12px' }}>
                        <button onClick={handleSaveFeed} style={{ background: '#6e4b1f', color: 'white', border: 'none', padding: '10px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>✓ حفظ</button>
                        <button onClick={() => { setShowAddFeed(false); setEditFeedId(null); setFeedForm({ name: '', unit: 'كيس', unitWeight: 50, stock: 0, minAlert: 3 }); }} style={{ background: '#ddd', border: 'none', padding: '10px', borderRadius: '6px', cursor: 'pointer' }}>إلغاء</button>
                      </div>
                    </div>
                  ) : (
                    <button onClick={() => setShowAddFeed(true)} style={{ width: '100%', padding: '11px', background: '#6e4b1f', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px' }}>➕ إضافة علف جديد</button>
                  )}
                </div>
              )}

              {/* ===== تبويب المشتريات ===== */}
              {feedTab === 'purchases' && (
                <div>
                  {showAddPurchase ? (
                    <div style={{ background: '#f0f9f6', border: '2px solid #27ae60', borderRadius: '10px', padding: '15px', marginBottom: '15px' }}>
                      <h4 style={{ color: '#27ae60', margin: '0 0 12px' }}>🛒 تسجيل شراء علف</h4>
                      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '10px' }}>
                        <div><label style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>نوع العلف *</label>
                          <select value={purchaseForm.feedId} onChange={e => setPurchaseForm(p => ({ ...p, feedId: e.target.value }))} style={{ padding: '8px', border: '1px solid #ddd', borderRadius: '6px', width: '100%', fontSize: '13px' }}>
                            <option value="">— اختر —</option>
                            {feeds.map(f => <option key={f.id} value={f.id}>{f.name} ({f.unit})</option>)}
                          </select>
                        </div>
                        <div><label style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>📅 تاريخ الشراء</label><input type="date" value={purchaseForm.date} onChange={e => setPurchaseForm(p => ({ ...p, date: e.target.value }))} style={{ padding: '8px', border: '1px solid #ddd', borderRadius: '6px', width: '100%', fontSize: '13px' }} /></div>
                        <div><label style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>الكمية المشتراة ({purchaseForm.feedId ? feeds.find(f => f.id === purchaseForm.feedId)?.unit : 'وحدة'})</label><input type="number" min="0" step="0.5" value={purchaseForm.qty} onChange={e => setPurchaseForm(p => ({ ...p, qty: e.target.value }))} placeholder="مثال: 10" style={{ padding: '8px', border: '1px solid #ddd', borderRadius: '6px', width: '100%', fontSize: '13px' }} /></div>
                        <div><label style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>💰 سعر الوحدة (ريال)</label><input type="number" min="0" step="0.5" value={purchaseForm.pricePerUnit} onChange={e => setPurchaseForm(p => ({ ...p, pricePerUnit: e.target.value }))} placeholder="مثال: 45" style={{ padding: '8px', border: '1px solid #ddd', borderRadius: '6px', width: '100%', fontSize: '13px' }} /></div>
                        {purchaseForm.qty && purchaseForm.pricePerUnit && (
                          <div style={{ gridColumn: isMobile ? '1' : '1 / -1', background: '#d5f5e3', borderRadius: '6px', padding: '8px', textAlign: 'center', fontSize: '13px', fontWeight: 'bold', color: '#27ae60' }}>
                            💵 الإجمالي: {(parseFloat(purchaseForm.qty) * parseFloat(purchaseForm.pricePerUnit)).toLocaleString()} ريال
                          </div>
                        )}
                        <div style={{ gridColumn: isMobile ? '1' : '1 / -1' }}><label style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>ملاحظات</label><input value={purchaseForm.notes} onChange={e => setPurchaseForm(p => ({ ...p, notes: e.target.value }))} placeholder="اختياري" style={{ padding: '8px', border: '1px solid #ddd', borderRadius: '6px', width: '100%', fontSize: '13px' }} /></div>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '12px' }}>
                        <button onClick={handleSavePurchase} style={{ background: '#27ae60', color: 'white', border: 'none', padding: '10px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>✓ حفظ وتحديث المخزون</button>
                        <button onClick={() => setShowAddPurchase(false)} style={{ background: '#ddd', border: 'none', padding: '10px', borderRadius: '6px', cursor: 'pointer' }}>إلغاء</button>
                      </div>
                    </div>
                  ) : (
                    <button onClick={() => setShowAddPurchase(true)} style={{ width: '100%', padding: '11px', background: '#27ae60', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px', marginBottom: '15px' }}>🛒 تسجيل شراء جديد</button>
                  )}

                  {/* سجل المشتريات */}
                  {feedPurchases.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '30px', color: '#bbb' }}>لا توجد مشتريات مسجلة بعد</div>
                  ) : (
                    <>
                      {/* ملخص حسب كل علف */}
                      <div style={{ background: '#faf3e8', borderRadius: '10px', padding: '12px', marginBottom: '15px', border: '1px solid #e8d5b0' }}>
                        <div style={{ fontWeight: 'bold', fontSize: '13px', color: '#6e4b1f', marginBottom: '8px' }}>📊 إجمالي المشتريات حسب النوع</div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                          {feeds.map(feed => {
                            const feedBuys = feedPurchases.filter(p => p.feedId === feed.id);
                            const totalQty = feedBuys.reduce((s, p) => s + p.qty, 0);
                            const totalCost = feedBuys.reduce((s, p) => s + p.totalCost, 0);
                            if (feedBuys.length === 0) return null;
                            return (
                              <div key={feed.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', padding: '4px 8px', background: 'white', borderRadius: '6px' }}>
                                <span style={{ fontWeight: 'bold', color: '#4a3010' }}>🌾 {feed.name}</span>
                                <span style={{ color: '#666' }}>{totalQty} {feed.unit} ({feedBuys.length} مرة)</span>
                                <span style={{ fontWeight: 'bold', color: '#27ae60' }}>{totalCost.toLocaleString()} ريال</span>
                              </div>
                            );
                          })}
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', padding: '6px 8px', background: '#6e4b1f', borderRadius: '6px', color: 'white', fontWeight: 'bold', marginTop: '4px' }}>
                            <span>الإجمالي الكلي</span>
                            <span>{feedPurchases.reduce((s, p) => s + p.totalCost, 0).toLocaleString()} ريال</span>
                          </div>
                        </div>
                      </div>

                      {/* قائمة المشتريات */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {[...feedPurchases].sort((a, b) => new Date(b.date) - new Date(a.date)).map(p => (
                          <div key={p.id} style={{ background: 'white', border: '1px solid #eee', borderRadius: '8px', padding: '10px 13px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '6px' }}>
                            <div>
                              <div style={{ fontWeight: 'bold', fontSize: '13px', color: '#4a3010' }}>🌾 {p.feedName}</div>
                              <div style={{ fontSize: '12px', color: '#888', marginTop: '3px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                                <span>📅 {new Date(p.date).toLocaleDateString('ar-SA')}</span>
                                <span>📦 {p.qty} {feeds.find(f => f.id === p.feedId)?.unit || ''}</span>
                                <span>💰 {p.pricePerUnit} ر/وحدة</span>
                                {p.notes && <span>📝 {p.notes}</span>}
                              </div>
                            </div>
                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                              <span style={{ fontWeight: 'bold', color: '#27ae60', fontSize: '14px' }}>{p.totalCost.toLocaleString()} ر</span>
                              <button onClick={() => { if (window.confirm('حذف هذا الشراء؟ سيتم خصم الكمية من المخزون')) { const feed = feeds.find(f => f.id === p.feedId); if (feed) saveFeeds(feeds.map(f => f.id === p.feedId ? { ...f, stock: Math.max(0, (parseFloat(f.stock) || 0) - p.qty) } : f)); saveFeedPurchases(feedPurchases.filter(x => x.id !== p.id)); } }} style={{ background: '#fff0f0', border: '1px solid #e74c3c', color: '#e74c3c', borderRadius: '5px', padding: '3px 7px', cursor: 'pointer', fontSize: '12px' }}>🗑️</button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* ===== تبويب معدلات الاستهلاك ===== */}
              {feedTab === 'consumption' && (
                <div>
                  <div style={{ background: '#fef9e7', borderRadius: '10px', padding: '12px', marginBottom: '15px', border: '1px solid #f0e68c', fontSize: '13px', color: '#856404' }}>
                    💡 حدد كم كجم يأكل الحيوان الواحد يومياً من كل نوع علف. الكمية صفر تعني أن هذا الحيوان لا يأكل هذا العلف.
                  </div>

                  {/* إجمالي الحيوانات النشطة */}
                  <div style={{ background: '#f0f4ff', borderRadius: '8px', padding: '10px 14px', marginBottom: '15px', fontSize: '12px', color: '#2471a3', display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
                    <strong>🐑 الحيوانات النشطة:</strong>
                    {Object.entries(activeCountByType).map(([type, count]) => count > 0 && (
                      <span key={type}>{type === 'sheep' ? '🐑 ضان' : type === 'goat' ? '🐐 ماعز' : `🐄 ${type}`}: <strong>{count}</strong></span>
                    ))}
                  </div>

                  {Object.keys(animals).map(type => {
                    const typeName = type === 'sheep' ? '🐑 ضان' : type === 'goat' ? '🐐 ماعز' : `🐄 ${type}`;
                    const typeConsumption = feedConsumption[type] || {};
                    return (
                      <div key={type} style={{ background: 'white', border: '1px solid #eee', borderRadius: '10px', padding: '14px', marginBottom: '12px' }}>
                        <div style={{ fontWeight: 'bold', fontSize: '14px', color: '#4a3010', marginBottom: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          {typeName}
                          <span style={{ fontSize: '12px', color: '#888', fontWeight: 'normal' }}>الحيوانات النشطة: {activeCountByType[type] || 0}</span>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(3,1fr)', gap: '8px' }}>
                          {feeds.map(feed => {
                            const val = typeConsumption[feed.name] !== undefined ? typeConsumption[feed.name] : 0;
                            const dailyTotal = val * (activeCountByType[type] || 0);
                            return (
                              <div key={feed.id} style={{ background: '#faf3e8', borderRadius: '8px', padding: '8px' }}>
                                <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#6e4b1f', marginBottom: '5px' }}>🌾 {feed.name}</div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '4px' }}>
                                  <input type="number" min="0" step="0.1" value={val} onChange={e => {
                                    const newVal = parseFloat(e.target.value) || 0;
                                    const updated = { ...feedConsumption, [type]: { ...(feedConsumption[type] || {}), [feed.name]: newVal } };
                                    saveFeedConsumption(updated);
                                  }} style={{ width: '70px', padding: '5px', border: '1px solid #ddd', borderRadius: '5px', fontSize: '13px', fontWeight: 'bold' }} />
                                  <span style={{ fontSize: '11px', color: '#888' }}>كجم/يوم</span>
                                </div>
                                {dailyTotal > 0 && <div style={{ fontSize: '10px', color: '#e67e22' }}>الإجمالي: {dailyTotal.toFixed(1)} كجم/يوم</div>}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* ===== تبويب التوقعات والتكاليف ===== */}
              {feedTab === 'forecast' && (
                <div>
                  {/* الاستهلاك الكلي اليومي */}
                  <div style={{ background: 'linear-gradient(135deg, #6e4b1f, #4a3010)', borderRadius: '10px', padding: '14px', marginBottom: '15px', color: 'white' }}>
                    <div style={{ fontWeight: 'bold', fontSize: '13px', marginBottom: '10px', opacity: 0.9 }}>📊 الاستهلاك اليومي الكلي للمشروع</div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(100px,1fr))', gap: '8px' }}>
                      {feedForecast.filter(f => f.dailyKg > 0).map(f => (
                        <div key={f.id} style={{ background: 'rgba(255,255,255,0.15)', borderRadius: '8px', padding: '8px', textAlign: 'center' }}>
                          <div style={{ fontWeight: 'bold', fontSize: '14px' }}>{f.dailyKg.toFixed(1)} كجم</div>
                          <div style={{ fontSize: '11px', opacity: 0.8 }}>🌾 {f.name}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* تنبيهات الأعلاف التي ستنفد */}
                  {feedForecast.some(f => f.alert) && (
                    <div style={{ background: '#fff3f3', border: '2px solid #e74c3c', borderRadius: '10px', padding: '12px', marginBottom: '15px' }}>
                      <div style={{ fontWeight: 'bold', color: '#e74c3c', marginBottom: '8px', fontSize: '13px' }}>⚠️ تنبيه — أعلاف ستنفد قريباً</div>
                      {feedForecast.filter(f => f.alert).map(f => (
                        <div key={f.id} style={{ background: 'white', borderRadius: '6px', padding: '7px 10px', marginBottom: '5px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px' }}>
                          <span style={{ fontWeight: 'bold', color: '#4a3010' }}>🌾 {f.name}</span>
                          <span style={{ color: f.daysLeft <= 7 ? '#e74c3c' : '#e67e22', fontWeight: 'bold' }}>
                            {f.daysLeft !== null ? `باقي ${f.daysLeft} يوم` : 'لا يوجد مخزون'}
                          </span>
                          <span style={{ color: '#888' }}>المخزون: {f.stock} {f.unit}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* تكاليف كل علف */}
                  <div style={{ fontWeight: 'bold', fontSize: '13px', color: '#4a3010', marginBottom: '10px' }}>💰 تحليل تكاليف الأعلاف</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '15px' }}>
                    {feedForecast.map(f => {
                      if (!f.dailyCost && !f.lastPrice) return null;
                      return (
                        <div key={f.id} style={{ background: 'white', border: '1px solid #eee', borderRadius: '10px', padding: '12px 15px' }}>
                          <div style={{ fontWeight: 'bold', fontSize: '14px', color: '#4a3010', marginBottom: '8px' }}>🌾 {f.name}</div>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(100px,1fr))', gap: '6px', fontSize: '12px' }}>
                            {f.dailyCost > 0 && <>
                              <div style={{ background: '#faf3e8', borderRadius: '6px', padding: '7px', textAlign: 'center' }}><div style={{ fontWeight: 'bold', color: '#6e4b1f' }}>{f.dailyCost.toFixed(1)} ر</div><div style={{ color: '#888', fontSize: '10px' }}>يومي</div></div>
                              <div style={{ background: '#faf3e8', borderRadius: '6px', padding: '7px', textAlign: 'center' }}><div style={{ fontWeight: 'bold', color: '#e67e22' }}>{f.weeklyCost.toFixed(0)} ر</div><div style={{ color: '#888', fontSize: '10px' }}>أسبوعي</div></div>
                              <div style={{ background: '#faf3e8', borderRadius: '6px', padding: '7px', textAlign: 'center' }}><div style={{ fontWeight: 'bold', color: '#e74c3c' }}>{f.monthlyCost.toFixed(0)} ر</div><div style={{ color: '#888', fontSize: '10px' }}>شهري</div></div>
                              <div style={{ background: '#faf3e8', borderRadius: '6px', padding: '7px', textAlign: 'center' }}><div style={{ fontWeight: 'bold', color: '#922b21' }}>{f.yearlyCost.toFixed(0)} ر</div><div style={{ color: '#888', fontSize: '10px' }}>سنوي</div></div>
                            </>}
                            {f.daysLeft !== null && <div style={{ background: f.daysLeft <= 7 ? '#fadbd8' : f.daysLeft <= 21 ? '#fdebd0' : '#d5f5e3', borderRadius: '6px', padding: '7px', textAlign: 'center' }}><div style={{ fontWeight: 'bold', color: f.daysLeft <= 7 ? '#e74c3c' : f.daysLeft <= 21 ? '#e67e22' : '#27ae60' }}>{f.daysLeft} يوم</div><div style={{ color: '#888', fontSize: '10px' }}>يكفي المخزون</div></div>}
                          </div>
                          {f.lastPrice && <div style={{ fontSize: '11px', color: '#888', marginTop: '6px' }}>آخر سعر: {f.lastPrice.price} ر/{f.unit} بتاريخ {new Date(f.lastPrice.date).toLocaleDateString('ar-SA')}</div>}
                        </div>
                      );
                    })}
                  </div>

                  {/* إجمالي تكاليف الأعلاف */}
                  {feedForecast.some(f => f.dailyCost > 0) && (
                    <div style={{ background: 'linear-gradient(135deg, #27ae60, #1e8449)', borderRadius: '10px', padding: '14px', color: 'white' }}>
                      <div style={{ fontWeight: 'bold', fontSize: '13px', marginBottom: '10px', opacity: 0.9 }}>💵 إجمالي تكاليف الأعلاف الكلية</div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '8px' }}>
                        {[
                          { label: 'يومي', val: feedForecast.reduce((s, f) => s + f.dailyCost, 0).toFixed(1) },
                          { label: 'أسبوعي', val: feedForecast.reduce((s, f) => s + f.weeklyCost, 0).toFixed(0) },
                          { label: 'شهري', val: feedForecast.reduce((s, f) => s + f.monthlyCost, 0).toFixed(0) },
                          { label: 'سنوي', val: feedForecast.reduce((s, f) => s + f.yearlyCost, 0).toFixed(0) },
                        ].map(s => (
                          <div key={s.label} style={{ background: 'rgba(255,255,255,0.2)', borderRadius: '8px', padding: '10px', textAlign: 'center' }}>
                            <div style={{ fontWeight: 'bold', fontSize: '15px' }}>{parseFloat(s.val).toLocaleString()} ر</div>
                            <div style={{ fontSize: '11px', opacity: 0.8 }}>{s.label}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div style={{ padding: '13px 20px', borderTop: '1px solid #eee' }}>
              <button onClick={() => setShowFeedSystem(false)} style={{ width: '100%', background: '#6e4b1f', color: 'white', border: 'none', padding: '11px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px' }}>إغلاق</button>
            </div>
          </div>
        </div>
      )}

      {/* ===== Modal مراقبة المواطير ===== */}
      {showPumpSystem && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', justifyContent: 'center', alignItems: 'flex-start', zIndex: 1000, padding: '15px', overflowY: 'auto' }} onClick={() => setShowPumpSystem(false)}>
          <div style={{ background: 'white', borderRadius: '14px', maxWidth: '760px', width: '100%', marginTop: '15px', overflow: 'hidden', boxShadow: '0 10px 40px rgba(0,0,0,0.4)' }} onClick={e => e.stopPropagation()}>

            {/* Header */}
            <div style={{ background: 'linear-gradient(135deg, #1c2833, #2c3e50)', padding: '18px 22px', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '18px' }}>⚙️ مراقبة المواطير المائية</h2>
                <p style={{ margin: '4px 0 0', fontSize: '12px', opacity: 0.8 }}>صيانة الزيت · البواجي · العمر الافتراضي · تقييم الماركات</p>
              </div>
              {pumps.some(p => { const r = pumpRemainingDays(p.purchaseDate, p.lifespan); return r !== null && r <= 180; }) && (
                <div style={{ background: '#e74c3c', borderRadius: '8px', padding: '6px 12px', fontSize: '12px', fontWeight: 'bold' }}>⚠️ ماطور يقترب من نهايته</div>
              )}
            </div>

            {/* التبويبات */}
            <div style={{ display: 'flex', borderBottom: '2px solid #eee', background: '#f5f6fa' }}>
              {[
                { key: 'pumps', label: '⚙️ المواطير' },
                { key: 'oil', label: '🛢️ الزيت والصيانة' },
                { key: 'spark', label: '⚡ البواجي' },
                { key: 'brands', label: '⭐ تقييم الماركات' },
                { key: 'petrol', label: '⛽ البنزين' },
              ].map(tab => (
                <button key={tab.key} onClick={() => setPumpTab(tab.key)} style={{ flex: 1, padding: '10px 4px', background: pumpTab === tab.key ? 'white' : 'transparent', border: 'none', borderBottom: pumpTab === tab.key ? '3px solid #2c3e50' : '3px solid transparent', cursor: 'pointer', fontWeight: pumpTab === tab.key ? 'bold' : 'normal', color: pumpTab === tab.key ? '#1c2833' : '#888', fontSize: isMobile ? '10px' : '12px' }}>
                  {tab.label}
                </button>
              ))}
            </div>

            <div style={{ maxHeight: '560px', overflowY: 'auto', padding: '15px 20px' }}>

              {/* ===== تبويب المواطير ===== */}
              {pumpTab === 'pumps' && (
                <div>
                  {/* إجمالي تكاليف كل المواطير */}
                  {pumps.length > 0 && (() => {
                    const totalPumpValue = pumps.reduce((s, p) => s + (parseFloat(p.purchaseValue) || 0), 0);
                    const totalOil = pumps.reduce((s, p) => s + (p.oilChangeHistory || []).reduce((x, h) => x + (parseFloat(h.cost) || 0), 0), 0);
                    const totalSpark = pumps.reduce((s, p) => s + (p.sparkHistory || []).reduce((x, h) => x + (parseFloat(h.cost) || 0), 0), 0);
                    const grandTotal = totalPumpValue + totalOil + totalSpark;
                    if (grandTotal === 0) return null;
                    return (
                      <div style={{ background: 'linear-gradient(135deg, #1c2833, #2c3e50)', borderRadius: '10px', padding: '14px', marginBottom: '15px', color: 'white' }}>
                        <div style={{ fontWeight: 'bold', fontSize: '13px', marginBottom: '10px', opacity: 0.9 }}>💵 إجمالي تكاليف المواطير</div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px,1fr))', gap: '8px' }}>
                          {totalPumpValue > 0 && <div style={{ background: 'rgba(255,255,255,0.1)', borderRadius: '8px', padding: '8px', textAlign: 'center' }}><div style={{ fontWeight: 'bold', fontSize: '15px' }}>{totalPumpValue.toLocaleString()}</div><div style={{ fontSize: '11px', opacity: 0.7 }}>ريال — قيمة الشراء</div></div>}
                          {totalOil > 0 && <div style={{ background: 'rgba(255,255,255,0.1)', borderRadius: '8px', padding: '8px', textAlign: 'center' }}><div style={{ fontWeight: 'bold', fontSize: '15px', color: '#f39c12' }}>{totalOil.toLocaleString()}</div><div style={{ fontSize: '11px', opacity: 0.7 }}>ريال — الزيت</div></div>}
                          {totalSpark > 0 && <div style={{ background: 'rgba(255,255,255,0.1)', borderRadius: '8px', padding: '8px', textAlign: 'center' }}><div style={{ fontWeight: 'bold', fontSize: '15px', color: '#f1c40f' }}>{totalSpark.toLocaleString()}</div><div style={{ fontSize: '11px', opacity: 0.7 }}>ريال — البواجي</div></div>}
                          <div style={{ background: 'rgba(255,255,255,0.2)', borderRadius: '8px', padding: '8px', textAlign: 'center', border: '1px solid rgba(255,255,255,0.3)' }}><div style={{ fontWeight: 'bold', fontSize: '16px', color: '#2ecc71' }}>{grandTotal.toLocaleString()}</div><div style={{ fontSize: '11px', opacity: 0.8 }}>ريال — الإجمالي الكلي</div></div>
                        </div>
                      </div>
                    );
                  })()}
                  {pumps.length === 0 && !showAddPump && (
                    <div style={{ textAlign: 'center', padding: '30px', color: '#bbb' }}>
                      <div style={{ fontSize: '40px', marginBottom: '10px' }}>⚙️</div>
                      <div>لا يوجد مواطير مسجلة — أضف ماطورك الأول</div>
                    </div>
                  )}

                  {/* بطاقة كل ماطور */}
                  {pumps.map(pump => {
                    const remaining = pumpRemainingDays(pump.purchaseDate, pump.lifespan);
                    const oil = oilStatus(pump);
                    const pct = remaining !== null ? Math.round((remaining / pump.lifespan) * 100) : null;
                    const lifeColor = pct === null ? '#bbb' : pct > 50 ? '#27ae60' : pct > 25 ? '#e67e22' : '#e74c3c';
                    const elapsed = pump.purchaseDate ? Math.floor((new Date() - new Date(pump.purchaseDate)) / (1000 * 60 * 60 * 24)) : 0;
                    const years = Math.floor(elapsed / 365);
                    const months = Math.floor((elapsed % 365) / 30);
                    const oilReq = oilRequired(pump);

                    return (
                      <div key={pump.id} style={{ background: pump.status === 'backup' ? '#f0f4ff' : '#f9fff9', border: `2px solid ${pump.status === 'active' ? '#27ae60' : pump.status === 'backup' ? '#2471a3' : '#e74c3c'}`, borderRadius: '12px', padding: '15px', marginBottom: '15px' }}>
                        {/* رأس البطاقة */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
                          <div>
                            <div style={{ fontWeight: 'bold', fontSize: '16px', color: '#1c2833', display: 'flex', alignItems: 'center', gap: '8px' }}>
                              ⚙️ {pump.name}
                              <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '8px', fontWeight: 'bold', background: pump.status === 'active' ? '#d5f5e3' : pump.status === 'backup' ? '#d6eaf8' : '#fadbd8', color: pump.status === 'active' ? '#27ae60' : pump.status === 'backup' ? '#2471a3' : '#e74c3c' }}>
                                {pump.status === 'active' ? '✅ رئيسي' : pump.status === 'backup' ? '🔵 احتياطي' : '🔴 متوقف'}
                              </span>
                            </div>
                            {pump.brand && <div style={{ fontSize: '12px', color: '#888', marginTop: '3px' }}>الماركة: {pump.brand}</div>}
                          </div>
                          <div style={{ display: 'flex', gap: '6px' }}>
                            <button onClick={() => { setSelectedPumpId(pump.id); setPumpTab('oil'); }} style={{ background: '#fff3e0', border: '1px solid #e67e22', color: '#e67e22', borderRadius: '6px', padding: '5px 8px', cursor: 'pointer', fontSize: '11px', fontWeight: 'bold' }}>🛢️ زيت</button>
                            <button onClick={() => { setSelectedPumpId(pump.id); setPumpTab('spark'); }} style={{ background: '#fff9e6', border: '1px solid #d4ac0d', color: '#b7950b', borderRadius: '6px', padding: '5px 8px', cursor: 'pointer', fontSize: '11px', fontWeight: 'bold' }}>⚡ بوجي</button>
                            <button onClick={() => { setPumpForm({ name: pump.name, brand: pump.brand || '', purchaseDate: pump.purchaseDate || '', lifespan: pump.lifespan, purchaseValue: pump.purchaseValue || '', status: pump.status, notes: pump.notes || '', oilType: pump.oilType || '', oilCapacity: pump.oilCapacity || '', oilInterval: pump.oilInterval || 14 }); setEditPumpId(pump.id); setShowAddPump(true); }} style={{ background: '#f0f9f6', border: '1px solid #117a65', color: '#117a65', borderRadius: '6px', padding: '5px 8px', cursor: 'pointer', fontSize: '13px' }}>✏️</button>
                            <button onClick={() => { if (window.confirm(`حذف ماطور "${pump.name}"؟`)) savePumps(pumps.filter(p => p.id !== pump.id)); }} style={{ background: '#fff0f0', border: '1px solid #e74c3c', color: '#e74c3c', borderRadius: '6px', padding: '5px 8px', cursor: 'pointer', fontSize: '13px' }}>🗑️</button>
                          </div>
                        </div>

                        {/* العمر الافتراضي */}
                        {pump.purchaseDate && (
                          <div style={{ marginBottom: '12px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '5px' }}>
                              <span style={{ color: '#666' }}>⏳ العمر الافتراضي ({(pump.lifespan / 365).toFixed(1)} سنة)</span>
                              <span style={{ fontWeight: 'bold', color: lifeColor }}>
                                {remaining === 0 ? '⚠️ انتهى العمر الافتراضي!' : `باقي ${remaining} يوم (${Math.floor(remaining/30)} شهر)`}
                              </span>
                            </div>
                            <div style={{ height: '10px', background: '#eee', borderRadius: '5px', overflow: 'hidden' }}>
                              <div style={{ height: '100%', width: `${pct}%`, background: lifeColor, borderRadius: '5px', transition: 'width 0.3s' }} />
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#aaa', marginTop: '3px' }}>
                              <span>اشتري: {new Date(pump.purchaseDate).toLocaleDateString('ar-SA')}</span>
                              <span>عمره الحالي: {years > 0 ? `${years} سنة ` : ''}{months > 0 ? `${months} شهر` : ''}</span>
                              <span>ينتهي: {new Date(new Date(pump.purchaseDate).getTime() + pump.lifespan * 86400000).toLocaleDateString('ar-SA')}</span>
                            </div>
                          </div>
                        )}

                        {/* حالة الزيت */}
                        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '8px', fontSize: '12px' }}>
                          <div style={{ background: oil.due ? '#fff3e0' : '#f9f9f9', borderRadius: '8px', padding: '8px 10px', border: oil.due ? '1px solid #e67e22' : '1px solid #eee' }}>
                            <div style={{ fontWeight: 'bold', color: '#555', marginBottom: '4px' }}>🛢️ حالة الزيت</div>
                            {oil.lastDate ? (
                              <>
                                <div>آخر تغيير: {new Date(oil.lastDate).toLocaleDateString('ar-SA')} ({oil.daysAgo} يوم)</div>
                                <div style={{ color: oil.daysLeft <= 0 ? '#e74c3c' : oil.daysLeft <= 3 ? '#e67e22' : '#27ae60', fontWeight: 'bold' }}>
                                  {oil.daysLeft <= 0 ? `⚠️ متأخر ${Math.abs(oil.daysLeft)} يوم!` : `باقي ${oil.daysLeft} يوم للتغيير`}
                                </div>
                              </>
                            ) : <div style={{ color: '#bbb' }}>لم يُسجَّل تغيير زيت بعد</div>}
                            {pump.oilType && <div style={{ color: '#888', marginTop: '3px' }}>النوع: {pump.oilType}</div>}
                          </div>
                          {oilReq && (
                            <div style={{ background: '#f0f4ff', borderRadius: '8px', padding: '8px 10px', border: '1px solid #d6eaf8' }}>
                              <div style={{ fontWeight: 'bold', color: '#2471a3', marginBottom: '4px' }}>🧮 احتساب الزيت</div>
                              <div>السعة: {oilReq.capacity} لتر</div>
                              <div>كل تغيير: {oilReq.capacity} لتر ({oilReq.weeksInterval} أسبوع)</div>
                              <div style={{ color: '#2471a3' }}>علبة 2L → تكفي {(2 / oilReq.capacity).toFixed(1)} مرة</div>
                            </div>
                          )}
                        </div>

                        {/* آخر بوجي */}
                        {(pump.sparkHistory || []).length > 0 && (
                          <div style={{ marginTop: '8px', background: '#fffbf0', borderRadius: '8px', padding: '8px 10px', fontSize: '12px', border: '1px solid #f0e68c' }}>
                            ⚡ آخر تغيير بوجي: {new Date([...pump.sparkHistory].sort((a, b) => new Date(b.date) - new Date(a.date))[0].date).toLocaleDateString('ar-SA')}
                            {' · '}الماركة: {[...pump.sparkHistory].sort((a, b) => new Date(b.date) - new Date(a.date))[0].brand || 'غير محدد'}
                          </div>
                        )}

                        {pump.notes && <div style={{ marginTop: '8px', fontSize: '12px', color: '#888', background: '#f9f9f9', padding: '6px 10px', borderRadius: '6px' }}>📝 {pump.notes}</div>}

                        {/* ملخص التكاليف */}
                        {(() => {
                          const oilCost = (pump.oilChangeHistory || []).reduce((s, h) => s + (parseFloat(h.cost) || 0), 0);
                          const sparkCost = (pump.sparkHistory || []).reduce((s, h) => s + (parseFloat(h.cost) || 0), 0);
                          const pumpValue = parseFloat(pump.purchaseValue) || 0;
                          const total = pumpValue + oilCost + sparkCost;
                          if (total === 0) return null;
                          return (
                            <div style={{ marginTop: '10px', background: '#f0f4ff', borderRadius: '8px', padding: '10px 13px', border: '1px solid #d6eaf8' }}>
                              <div style={{ fontWeight: 'bold', fontSize: '12px', color: '#2471a3', marginBottom: '7px' }}>💵 ملخص تكاليف {pump.name}</div>
                              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px,1fr))', gap: '6px', fontSize: '12px' }}>
                                {pumpValue > 0 && <div style={{ background: 'white', borderRadius: '6px', padding: '6px', textAlign: 'center' }}><div style={{ fontWeight: 'bold', color: '#1c2833' }}>{pumpValue.toLocaleString()} ر</div><div style={{ color: '#888', fontSize: '11px' }}>قيمة الشراء</div></div>}
                                {oilCost > 0 && <div style={{ background: 'white', borderRadius: '6px', padding: '6px', textAlign: 'center' }}><div style={{ fontWeight: 'bold', color: '#e67e22' }}>{oilCost.toLocaleString()} ر</div><div style={{ color: '#888', fontSize: '11px' }}>تكلفة الزيت</div></div>}
                                {sparkCost > 0 && <div style={{ background: 'white', borderRadius: '6px', padding: '6px', textAlign: 'center' }}><div style={{ fontWeight: 'bold', color: '#d4ac0d' }}>{sparkCost.toLocaleString()} ر</div><div style={{ color: '#888', fontSize: '11px' }}>تكلفة البواجي</div></div>}
                                <div style={{ background: '#2471a3', borderRadius: '6px', padding: '6px', textAlign: 'center' }}><div style={{ fontWeight: 'bold', color: 'white' }}>{total.toLocaleString()} ر</div><div style={{ color: '#d6eaf8', fontSize: '11px' }}>الإجمالي</div></div>
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    );
                  })}

                  {/* نموذج إضافة ماطور */}
                  {showAddPump ? (
                    <div style={{ background: '#f5f6fa', border: '2px solid #2c3e50', borderRadius: '10px', padding: '15px' }}>
                      <h4 style={{ color: '#1c2833', margin: '0 0 12px' }}>{editPumpId ? '✏️ تعديل ماطور' : '➕ إضافة ماطور'}</h4>
                      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '10px' }}>
                        <div><label style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>اسم/رقم الماطور *</label><input value={pumpForm.name} onChange={e => setPumpForm(p => ({ ...p, name: e.target.value }))} placeholder="مثال: الماطور الرئيسي" style={{ padding: '8px', border: '1px solid #ddd', borderRadius: '6px', width: '100%', fontSize: '13px' }} /></div>
                        <div><label style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>الماركة</label><input value={pumpForm.brand} onChange={e => setPumpForm(p => ({ ...p, brand: e.target.value }))} placeholder="مثال: Honda, Yamaha" style={{ padding: '8px', border: '1px solid #ddd', borderRadius: '6px', width: '100%', fontSize: '13px' }} /></div>
                        <div><label style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>📅 تاريخ الشراء</label><input type="date" value={pumpForm.purchaseDate} onChange={e => setPumpForm(p => ({ ...p, purchaseDate: e.target.value }))} style={{ padding: '8px', border: '1px solid #ddd', borderRadius: '6px', width: '100%', fontSize: '13px' }} /></div>
                        <div><label style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>💰 قيمة شراء الماطور (ريال)</label><input type="number" min="0" value={pumpForm.purchaseValue} onChange={e => setPumpForm(p => ({ ...p, purchaseValue: e.target.value }))} placeholder="مثال: 1500" style={{ padding: '8px', border: '1px solid #ddd', borderRadius: '6px', width: '100%', fontSize: '13px' }} /></div>
                        <div><label style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>العمر الافتراضي (يوم)</label>
                          <select value={pumpForm.lifespan} onChange={e => setPumpForm(p => ({ ...p, lifespan: parseInt(e.target.value) }))} style={{ padding: '8px', border: '1px solid #ddd', borderRadius: '6px', width: '100%', fontSize: '13px' }}>
                            <option value={365}>سنة (365 يوم)</option>
                            <option value={730}>سنتان (730 يوم)</option>
                            <option value={1095}>3 سنوات</option>
                            <option value={1460}>4 سنوات</option>
                            <option value={1825}>5 سنوات</option>
                          </select>
                        </div>
                        <div><label style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>الحالة</label>
                          <select value={pumpForm.status} onChange={e => setPumpForm(p => ({ ...p, status: e.target.value }))} style={{ padding: '8px', border: '1px solid #ddd', borderRadius: '6px', width: '100%', fontSize: '13px' }}>
                            <option value="active">✅ رئيسي (يعمل)</option>
                            <option value="backup">🔵 احتياطي</option>
                            <option value="stopped">🔴 متوقف</option>
                          </select>
                        </div>
                        <div><label style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>نوع الزيت</label><input value={pumpForm.oilType} onChange={e => setPumpForm(p => ({ ...p, oilType: e.target.value }))} placeholder="مثال: 10W-40, SAE 30" style={{ padding: '8px', border: '1px solid #ddd', borderRadius: '6px', width: '100%', fontSize: '13px' }} /></div>
                        <div><label style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>سعة الزيت (لتر)</label><input type="number" min="0" step="0.1" value={pumpForm.oilCapacity} onChange={e => setPumpForm(p => ({ ...p, oilCapacity: e.target.value }))} placeholder="مثال: 0.3" style={{ padding: '8px', border: '1px solid #ddd', borderRadius: '6px', width: '100%', fontSize: '13px' }} /></div>
                        <div><label style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>فترة تغيير الزيت (يوم)</label>
                          <select value={pumpForm.oilInterval} onChange={e => setPumpForm(p => ({ ...p, oilInterval: parseInt(e.target.value) }))} style={{ padding: '8px', border: '1px solid #ddd', borderRadius: '6px', width: '100%', fontSize: '13px' }}>
                            <option value={7}>كل أسبوع</option>
                            <option value={14}>كل أسبوعين</option>
                            <option value={21}>كل 3 أسابيع</option>
                            <option value={30}>كل شهر</option>
                            <option value={60}>كل شهرين</option>
                          </select>
                        </div>
                        <div style={{ gridColumn: isMobile ? '1' : '1 / -1' }}><label style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>📝 ملاحظات</label><input value={pumpForm.notes} onChange={e => setPumpForm(p => ({ ...p, notes: e.target.value }))} placeholder="أي ملاحظات..." style={{ padding: '8px', border: '1px solid #ddd', borderRadius: '6px', width: '100%', fontSize: '13px' }} /></div>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '12px' }}>
                        <button onClick={handleSavePump} style={{ background: '#1c2833', color: 'white', border: 'none', padding: '10px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>✓ حفظ</button>
                        <button onClick={() => { setShowAddPump(false); setEditPumpId(null); }} style={{ background: '#ddd', border: 'none', padding: '10px', borderRadius: '6px', cursor: 'pointer' }}>إلغاء</button>
                      </div>
                    </div>
                  ) : (
                    <button onClick={() => setShowAddPump(true)} style={{ width: '100%', padding: '11px', background: '#2c3e50', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px', marginTop: '10px' }}>➕ إضافة ماطور</button>
                  )}
                </div>
              )}

              {/* ===== تبويب الزيت والصيانة ===== */}
              {pumpTab === 'oil' && (
                <div>
                  {/* اختيار الماطور */}
                  <div style={{ marginBottom: '15px' }}>
                    <label style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>اختر الماطور:</label>
                    <select value={selectedPumpId || ''} onChange={e => setSelectedPumpId(e.target.value)} style={{ padding: '9px', border: '1px solid #ddd', borderRadius: '6px', width: '100%', fontSize: '13px' }}>
                      <option value="">— اختر —</option>
                      {pumps.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </div>

                  {selectedPumpId && (() => {
                    const pump = pumps.find(p => p.id === selectedPumpId);
                    if (!pump) return null;
                    const history = [...(pump.oilChangeHistory || [])].sort((a, b) => new Date(b.date) - new Date(a.date));
                    const oil = oilStatus(pump);
                    const oilReq = oilRequired(pump);
                    return (
                      <div>
                        {/* معلومات الزيت */}
                        {oilReq && (
                          <div style={{ background: '#fff8e1', border: '1px solid #f0e68c', borderRadius: '10px', padding: '12px', marginBottom: '15px' }}>
                            <div style={{ fontWeight: 'bold', color: '#b7950b', marginBottom: '8px' }}>🧮 حسابات الزيت — {pump.name}</div>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px,1fr))', gap: '8px', fontSize: '12px' }}>
                              <div style={{ background: 'white', borderRadius: '6px', padding: '8px', textAlign: 'center' }}><div style={{ fontWeight: 'bold', color: '#e67e22' }}>{oilReq.capacity} L</div><div style={{ color: '#888' }}>سعة الزيت</div></div>
                              <div style={{ background: 'white', borderRadius: '6px', padding: '8px', textAlign: 'center' }}><div style={{ fontWeight: 'bold', color: '#2471a3' }}>كل {pump.oilInterval} يوم</div><div style={{ color: '#888' }}>فترة التغيير</div></div>
                              <div style={{ background: 'white', borderRadius: '6px', padding: '8px', textAlign: 'center' }}><div style={{ fontWeight: 'bold', color: '#117a65' }}>{(2 / oilReq.capacity).toFixed(1)}x</div><div style={{ color: '#888' }}>علبة 2L تكفي</div></div>
                              <div style={{ background: oil.due ? '#ffe8e8' : '#e8f8f0', borderRadius: '6px', padding: '8px', textAlign: 'center' }}><div style={{ fontWeight: 'bold', color: oil.due ? '#e74c3c' : '#27ae60' }}>{oil.daysLeft !== null ? (oil.daysLeft <= 0 ? 'متأخر!' : `${oil.daysLeft} يوم`) : '—'}</div><div style={{ color: '#888' }}>باقي للتغيير</div></div>
                            </div>
                          </div>
                        )}

                        {/* إضافة تغيير زيت */}
                        {showAddOilChange ? (
                          <div style={{ background: '#fff3e0', border: '2px solid #e67e22', borderRadius: '10px', padding: '14px', marginBottom: '15px' }}>
                            <h4 style={{ color: '#e67e22', margin: '0 0 10px' }}>🛢️ تسجيل تغيير زيت</h4>
                            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '10px' }}>
                              <div><label style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>📅 التاريخ</label><input type="date" value={oilChangeForm.date} onChange={e => setOilChangeForm(p => ({ ...p, date: e.target.value }))} style={{ padding: '8px', border: '1px solid #ddd', borderRadius: '6px', width: '100%', fontSize: '13px' }} /></div>
                              <div><label style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>عدد العلب/اللترات</label><input type="number" min="0" step="0.1" value={oilChangeForm.boxes} onChange={e => setOilChangeForm(p => ({ ...p, boxes: e.target.value }))} style={{ padding: '8px', border: '1px solid #ddd', borderRadius: '6px', width: '100%', fontSize: '13px' }} /></div>
                              <div><label style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>التكلفة (ريال)</label><input type="number" min="0" value={oilChangeForm.cost} onChange={e => setOilChangeForm(p => ({ ...p, cost: e.target.value }))} style={{ padding: '8px', border: '1px solid #ddd', borderRadius: '6px', width: '100%', fontSize: '13px' }} /></div>
                              <div><label style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>ملاحظات</label><input value={oilChangeForm.notes} onChange={e => setOilChangeForm(p => ({ ...p, notes: e.target.value }))} placeholder="اختياري" style={{ padding: '8px', border: '1px solid #ddd', borderRadius: '6px', width: '100%', fontSize: '13px' }} /></div>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '10px' }}>
                              <button onClick={handleSaveOilChange} style={{ background: '#e67e22', color: 'white', border: 'none', padding: '10px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>✓ حفظ</button>
                              <button onClick={() => setShowAddOilChange(false)} style={{ background: '#ddd', border: 'none', padding: '10px', borderRadius: '6px', cursor: 'pointer' }}>إلغاء</button>
                            </div>
                          </div>
                        ) : (
                          <button onClick={() => setShowAddOilChange(true)} style={{ width: '100%', padding: '10px', background: '#e67e22', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px', marginBottom: '15px' }}>🛢️ تسجيل تغيير زيت</button>
                        )}

                        {/* سجل تغييرات الزيت */}
                        <div style={{ fontWeight: 'bold', fontSize: '13px', color: '#555', marginBottom: '8px' }}>📋 سجل تغييرات الزيت ({history.length})</div>
                        {history.length === 0 ? <div style={{ color: '#bbb', textAlign: 'center', padding: '20px' }}>لا يوجد سجلات بعد</div> : history.map((h, i) => (
                          <div key={h.id} style={{ background: i === 0 ? '#fff8e1' : 'white', border: '1px solid #eee', borderRadius: '8px', padding: '10px 13px', marginBottom: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '6px' }}>
                            <div style={{ fontSize: '13px' }}>
                              <span style={{ fontWeight: 'bold' }}>{new Date(h.date).toLocaleDateString('ar-SA')}</span>
                              {i === 0 && <span style={{ marginRight: '6px', fontSize: '11px', background: '#e67e22', color: 'white', padding: '1px 5px', borderRadius: '4px' }}>آخر تغيير</span>}
                              <span style={{ color: '#888', fontSize: '12px', marginRight: '8px' }}>{h.boxes} {pump.oilCapacity ? 'لتر' : 'علبة'}</span>
                              {h.cost > 0 && <span style={{ color: '#27ae60', fontSize: '12px' }}>💰 {h.cost} ر</span>}
                              {h.notes && <div style={{ fontSize: '11px', color: '#aaa', marginTop: '2px' }}>{h.notes}</div>}
                            </div>
                            <button onClick={() => { if (window.confirm('حذف هذا السجل؟')) { const updated = pumps.map(p => p.id === selectedPumpId ? { ...p, oilChangeHistory: p.oilChangeHistory.filter(x => x.id !== h.id) } : p); savePumps(updated); } }} style={{ background: '#fff0f0', border: '1px solid #e74c3c', color: '#e74c3c', borderRadius: '5px', padding: '3px 7px', cursor: 'pointer', fontSize: '12px' }}>🗑️</button>
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* ===== تبويب البواجي ===== */}
              {pumpTab === 'spark' && (
                <div>
                  <div style={{ marginBottom: '15px' }}>
                    <label style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>اختر الماطور:</label>
                    <select value={selectedPumpId || ''} onChange={e => setSelectedPumpId(e.target.value)} style={{ padding: '9px', border: '1px solid #ddd', borderRadius: '6px', width: '100%', fontSize: '13px' }}>
                      <option value="">— اختر —</option>
                      {pumps.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </div>

                  {selectedPumpId && (() => {
                    const pump = pumps.find(p => p.id === selectedPumpId);
                    if (!pump) return null;
                    const history = [...(pump.sparkHistory || [])].sort((a, b) => new Date(b.date) - new Date(a.date));
                    const last = history[0];
                    const daysSince = last ? Math.floor((new Date() - new Date(last.date)) / (1000 * 60 * 60 * 24)) : null;
                    return (
                      <div>
                        {last && (
                          <div style={{ background: '#fffbf0', border: '1px solid #f0e68c', borderRadius: '10px', padding: '12px', marginBottom: '15px' }}>
                            <div style={{ fontWeight: 'bold', color: '#b7950b', marginBottom: '6px' }}>⚡ حالة البوجي — {pump.name}</div>
                            <div style={{ fontSize: '13px', color: '#555' }}>
                              آخر تغيير: <strong>{new Date(last.date).toLocaleDateString('ar-SA')}</strong> ({daysSince} يوم)
                              {last.brand && <> · الماركة: <strong>{last.brand}</strong></>}
                              {last.cost > 0 && <> · التكلفة: <strong style={{ color: '#27ae60' }}>{last.cost} ر</strong></>}
                            </div>
                          </div>
                        )}

                        {showAddSpark ? (
                          <div style={{ background: '#fffbf0', border: '2px solid #d4ac0d', borderRadius: '10px', padding: '14px', marginBottom: '15px' }}>
                            <h4 style={{ color: '#b7950b', margin: '0 0 10px' }}>⚡ تسجيل تغيير بوجي</h4>
                            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '10px' }}>
                              <div><label style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>📅 التاريخ</label><input type="date" value={sparkForm.date} onChange={e => setSparkForm(p => ({ ...p, date: e.target.value }))} style={{ padding: '8px', border: '1px solid #ddd', borderRadius: '6px', width: '100%', fontSize: '13px' }} /></div>
                              <div><label style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>ماركة البوجي</label><input value={sparkForm.brand} onChange={e => setSparkForm(p => ({ ...p, brand: e.target.value }))} placeholder="مثال: NGK, Bosch" style={{ padding: '8px', border: '1px solid #ddd', borderRadius: '6px', width: '100%', fontSize: '13px' }} /></div>
                              <div><label style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>التكلفة (ريال)</label><input type="number" min="0" value={sparkForm.cost} onChange={e => setSparkForm(p => ({ ...p, cost: e.target.value }))} style={{ padding: '8px', border: '1px solid #ddd', borderRadius: '6px', width: '100%', fontSize: '13px' }} /></div>
                              <div><label style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>ملاحظات</label><input value={sparkForm.notes} onChange={e => setSparkForm(p => ({ ...p, notes: e.target.value }))} placeholder="اختياري" style={{ padding: '8px', border: '1px solid #ddd', borderRadius: '6px', width: '100%', fontSize: '13px' }} /></div>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '10px' }}>
                              <button onClick={handleSaveSpark} style={{ background: '#d4ac0d', color: 'white', border: 'none', padding: '10px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>✓ حفظ</button>
                              <button onClick={() => setShowAddSpark(false)} style={{ background: '#ddd', border: 'none', padding: '10px', borderRadius: '6px', cursor: 'pointer' }}>إلغاء</button>
                            </div>
                          </div>
                        ) : (
                          <button onClick={() => setShowAddSpark(true)} style={{ width: '100%', padding: '10px', background: '#d4ac0d', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px', marginBottom: '15px' }}>⚡ تسجيل تغيير بوجي</button>
                        )}

                        <div style={{ fontWeight: 'bold', fontSize: '13px', color: '#555', marginBottom: '8px' }}>📋 سجل البواجي ({history.length})</div>
                        {history.length === 0 ? <div style={{ color: '#bbb', textAlign: 'center', padding: '20px' }}>لا يوجد سجلات بعد</div> : history.map((h, i) => (
                          <div key={h.id} style={{ background: i === 0 ? '#fffbf0' : 'white', border: '1px solid #eee', borderRadius: '8px', padding: '10px 13px', marginBottom: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '6px' }}>
                            <div style={{ fontSize: '13px' }}>
                              <span style={{ fontWeight: 'bold' }}>{new Date(h.date).toLocaleDateString('ar-SA')}</span>
                              {i === 0 && <span style={{ marginRight: '6px', fontSize: '11px', background: '#d4ac0d', color: 'white', padding: '1px 5px', borderRadius: '4px' }}>آخر تغيير</span>}
                              {h.brand && <span style={{ color: '#888', fontSize: '12px', marginRight: '8px' }}>⚡ {h.brand}</span>}
                              {h.cost > 0 && <span style={{ color: '#27ae60', fontSize: '12px' }}>💰 {h.cost} ر</span>}
                              {h.notes && <div style={{ fontSize: '11px', color: '#aaa', marginTop: '2px' }}>{h.notes}</div>}
                            </div>
                            <button onClick={() => { if (window.confirm('حذف؟')) { const updated = pumps.map(p => p.id === selectedPumpId ? { ...p, sparkHistory: p.sparkHistory.filter(x => x.id !== h.id) } : p); savePumps(updated); } }} style={{ background: '#fff0f0', border: '1px solid #e74c3c', color: '#e74c3c', borderRadius: '5px', padding: '3px 7px', cursor: 'pointer', fontSize: '12px' }}>🗑️</button>
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* ===== تبويب تقييم الماركات ===== */}
              {pumpTab === 'brands' && (
                <div>
                  {showAddBrand ? (
                    <div style={{ background: '#f5f6fa', border: '2px solid #2c3e50', borderRadius: '10px', padding: '15px', marginBottom: '15px' }}>
                      <h4 style={{ color: '#1c2833', margin: '0 0 12px' }}>➕ إضافة ماركة ماطور</h4>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        <div><label style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>اسم الماركة *</label><input value={brandForm.name} onChange={e => setBrandForm(p => ({ ...p, name: e.target.value }))} placeholder="مثال: Honda, Yamaha, ريد, كرياتور" style={{ padding: '8px', border: '1px solid #ddd', borderRadius: '6px', width: '100%', fontSize: '13px' }} /></div>
                        <div><label style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>التقييم</label>
                          <select value={brandForm.rating} onChange={e => setBrandForm(p => ({ ...p, rating: e.target.value }))} style={{ padding: '8px', border: '1px solid #ddd', borderRadius: '6px', width: '100%', fontSize: '13px' }}>
                            <option value="excellent">⭐⭐⭐⭐⭐ ممتاز</option>
                            <option value="good">⭐⭐⭐⭐ جيد</option>
                            <option value="average">⭐⭐⭐ متوسط</option>
                            <option value="poor">⭐⭐ ضعيف</option>
                            <option value="bad">⭐ سيء</option>
                          </select>
                        </div>
                        <div><label style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>السعر التقريبي (ريال)</label><input type="number" value={brandForm.price} onChange={e => setBrandForm(p => ({ ...p, price: e.target.value }))} placeholder="اختياري" style={{ padding: '8px', border: '1px solid #ddd', borderRadius: '6px', width: '100%', fontSize: '13px' }} /></div>
                        <div><label style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>📝 رأيك من التجربة</label><textarea value={brandForm.review} onChange={e => setBrandForm(p => ({ ...p, review: e.target.value }))} placeholder="اكتب تجربتك مع هذه الماركة — إيجابيات وسلبيات..." rows={3} style={{ padding: '8px', border: '1px solid #ddd', borderRadius: '6px', width: '100%', fontSize: '13px', fontFamily: 'inherit', resize: 'vertical' }} /></div>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '12px' }}>
                        <button onClick={() => { if (!brandForm.name) { alert('أدخل اسم الماركة'); return; } savePumpBrands([...pumpBrands, { id: `br_${Date.now()}`, ...brandForm, price: parseFloat(brandForm.price) || 0 }]); setBrandForm({ name: '', rating: 'good', review: '', price: '' }); setShowAddBrand(false); }} style={{ background: '#2c3e50', color: 'white', border: 'none', padding: '10px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>✓ حفظ</button>
                        <button onClick={() => setShowAddBrand(false)} style={{ background: '#ddd', border: 'none', padding: '10px', borderRadius: '6px', cursor: 'pointer' }}>إلغاء</button>
                      </div>
                    </div>
                  ) : (
                    <button onClick={() => setShowAddBrand(true)} style={{ width: '100%', padding: '11px', background: '#2c3e50', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px', marginBottom: '15px' }}>➕ إضافة ماركة وتقييمها</button>
                  )}

                  {pumpBrands.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '30px', color: '#bbb' }}>
                      <div style={{ fontSize: '36px', marginBottom: '8px' }}>⭐</div>
                      <div>أضف تقييماتك للماركات من تجربتك الشخصية</div>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {[...pumpBrands].sort((a, b) => { const order = { excellent: 0, good: 1, average: 2, poor: 3, bad: 4 }; return order[a.rating] - order[b.rating]; }).map(brand => {
                        const stars = { excellent: '⭐⭐⭐⭐⭐', good: '⭐⭐⭐⭐', average: '⭐⭐⭐', poor: '⭐⭐', bad: '⭐' };
                        const ratingColors = { excellent: '#27ae60', good: '#2471a3', average: '#e67e22', poor: '#e74c3c', bad: '#922b21' };
                        const ratingBg = { excellent: '#d5f5e3', good: '#d6eaf8', average: '#fdebd0', poor: '#fadbd8', bad: '#f5b7b1' };
                        return (
                          <div key={brand.id} style={{ background: 'white', border: `1.5px solid ${ratingColors[brand.rating]}40`, borderRadius: '10px', padding: '14px', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                              <div>
                                <div style={{ fontWeight: 'bold', fontSize: '15px', color: '#1c2833' }}>⚙️ {brand.name}</div>
                                {brand.price > 0 && <div style={{ fontSize: '12px', color: '#888', marginTop: '2px' }}>السعر: ~{brand.price} ريال</div>}
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <span style={{ background: ratingBg[brand.rating], color: ratingColors[brand.rating], fontSize: '12px', padding: '3px 8px', borderRadius: '8px', fontWeight: 'bold' }}>{stars[brand.rating]}</span>
                                <button onClick={() => { if (window.confirm('حذف؟')) savePumpBrands(pumpBrands.filter(b => b.id !== brand.id)); }} style={{ background: '#fff0f0', border: '1px solid #e74c3c', color: '#e74c3c', borderRadius: '5px', padding: '3px 7px', cursor: 'pointer', fontSize: '12px' }}>🗑️</button>
                              </div>
                            </div>
                            {brand.review && <div style={{ fontSize: '13px', color: '#555', background: '#f9f9f9', borderRadius: '6px', padding: '8px 10px', lineHeight: '1.6' }}>{brand.review}</div>}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* ===== تبويب البنزين ===== */}
              {pumpTab === 'petrol' && (
                <div>
                  {/* تنبيهات */}
                  {petrolStats.some(p => p.needsAlert) && (
                    <div style={{ background: '#fff3f3', border: '2px solid #e74c3c', borderRadius: '10px', padding: '10px 14px', marginBottom: '12px' }}>
                      <div style={{ fontWeight: 'bold', color: '#e74c3c', fontSize: '13px', marginBottom: '5px' }}>⚠️ مواطير تحتاج تعبئة بنزين قريباً</div>
                      {petrolStats.filter(p => p.needsAlert).map(p => (
                        <div key={p.id} style={{ fontSize: '12px', color: '#555', marginBottom: '3px' }}>
                          ⚙️ {p.name} — باقي تقريباً <strong style={{ color: '#e74c3c' }}>{p.daysLeft} يوم</strong>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* ملخص كلي */}
                  {petrolRecords.length > 0 && (
                    <div style={{ background: 'linear-gradient(135deg, #f39c12, #e67e22)', borderRadius: '10px', padding: '14px', marginBottom: '14px', color: 'white' }}>
                      <div style={{ fontSize: '12px', opacity: 0.9, marginBottom: '8px' }}>⛽ إجمالي تكلفة البنزين — بنزين 95</div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '8px' }}>
                        {[
                          { label: 'إجمالي الإنفاق', val: petrolTotalStats.total.toLocaleString() + ' ر' },
                          { label: 'شهري متوقع', val: petrolTotalStats.monthly.toFixed(0) + ' ر' },
                          { label: 'سنوي متوقع', val: petrolTotalStats.yearly.toFixed(0) + ' ر' },
                        ].map(s => (
                          <div key={s.label} style={{ background: 'rgba(255,255,255,0.2)', borderRadius: '8px', padding: '8px', textAlign: 'center' }}>
                            <div style={{ fontWeight: 'bold', fontSize: '15px' }}>{s.val}</div>
                            <div style={{ fontSize: '10px', opacity: 0.85 }}>{s.label}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* بطاقة لكل ماطور */}
                  {petrolStats.map(pump => {
                    const barColor = pump.pct === null ? '#bbb' : pump.pct > 40 ? '#27ae60' : pump.pct > 20 ? '#e67e22' : '#e74c3c';
                    const recentRecords = [...pump.records].sort((a,b) => new Date(b.date)-new Date(a.date)).slice(0,5);
                    const prices = pump.records.map(r => parseFloat(r.price)||0).filter(p=>p>0);
                    return (
                      <div key={pump.id} style={{ background: pump.needsAlert ? '#fff8f0' : 'white', border: `1.5px solid ${pump.needsAlert ? '#e67e22' : '#eee'}`, borderRadius: '12px', padding: '14px', marginBottom: '12px' }}>
                        {/* رأس */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px', flexWrap: 'wrap', gap: '8px' }}>
                          <div>
                            <div style={{ fontWeight: 'bold', fontSize: '14px', color: '#1c2833', display: 'flex', alignItems: 'center', gap: '8px' }}>
                              ⚙️ {pump.name}
                              <span style={{ fontSize: '11px', background: '#fdebd0', color: '#e67e22', padding: '2px 6px', borderRadius: '5px' }}>⛽ بنزين 95</span>
                              {pump.needsAlert && <span style={{ fontSize: '11px', background: '#e74c3c', color: 'white', padding: '2px 6px', borderRadius: '5px', fontWeight: 'bold' }}>تعبئة قريباً!</span>}
                            </div>
                            {pump.lastFill && (
                              <div style={{ fontSize: '12px', color: '#888', marginTop: '3px', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                                <span>⛽ آخر تعبئة: {new Date(pump.lastFill.date).toLocaleDateString('ar-SA')} ({pump.daysSinceLast} يوم)</span>
                                {pump.nextEstimate && <span style={{ color: pump.needsAlert ? '#e74c3c' : '#2c3e50', fontWeight: 'bold' }}>📅 القادمة: {new Date(pump.nextEstimate).toLocaleDateString('ar-SA')}</span>}
                              </div>
                            )}
                          </div>
                          <button onClick={() => { setPetrolForm({ pumpId: pump.id, date: new Date().toISOString().split('T')[0], price: '', notes: '' }); setShowAddPetrol(true); }} style={{ background: '#fdebd0', border: '1px solid #e67e22', color: '#e67e22', borderRadius: '6px', padding: '6px 10px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}>⛽ تعبئة</button>
                        </div>

                        {/* إحصائيات */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(90px,1fr))', gap: '7px', marginBottom: '10px' }}>
                          <div style={{ background: '#f9f9f9', borderRadius: '7px', padding: '7px', textAlign: 'center' }}><div style={{ fontWeight: 'bold', color: '#2c3e50', fontSize: '14px' }}>{pump.records.length}</div><div style={{ fontSize: '10px', color: '#888' }}>تعبئة</div></div>
                          <div style={{ background: '#f9f9f9', borderRadius: '7px', padding: '7px', textAlign: 'center' }}><div style={{ fontWeight: 'bold', color: '#e67e22', fontSize: '14px' }}>{pump.avgDays ? `${pump.avgDays} ي` : '—'}</div><div style={{ fontSize: '10px', color: '#888' }}>متوسط الدورة</div></div>
                          <div style={{ background: '#f9f9f9', borderRadius: '7px', padding: '7px', textAlign: 'center' }}><div style={{ fontWeight: 'bold', color: '#27ae60', fontSize: '14px' }}>{pump.avgPrice ? `${pump.avgPrice.toFixed(0)} ر` : '—'}</div><div style={{ fontSize: '10px', color: '#888' }}>متوسط التعبئة</div></div>
                          <div style={{ background: pump.needsAlert ? '#fff3e0' : '#f9f9f9', borderRadius: '7px', padding: '7px', textAlign: 'center', border: `1px solid ${barColor}` }}><div style={{ fontWeight: 'bold', color: barColor, fontSize: '14px' }}>{pump.daysLeft !== null ? `${pump.daysLeft} ي` : '—'}</div><div style={{ fontSize: '10px', color: '#888' }}>متبقي</div></div>
                          {pump.monthlyCost && <div style={{ background: '#f9f9f9', borderRadius: '7px', padding: '7px', textAlign: 'center' }}><div style={{ fontWeight: 'bold', color: '#c0392b', fontSize: '14px' }}>{pump.monthlyCost.toFixed(0)} ر</div><div style={{ fontSize: '10px', color: '#888' }}>شهري</div></div>}
                          <div style={{ background: '#f9f9f9', borderRadius: '7px', padding: '7px', textAlign: 'center' }}><div style={{ fontWeight: 'bold', color: '#8e44ad', fontSize: '14px' }}>{pump.totalSpent.toLocaleString()} ر</div><div style={{ fontSize: '10px', color: '#888' }}>الإجمالي</div></div>
                        </div>

                        {/* شريط المتبقي */}
                        {pump.pct !== null && (
                          <div style={{ marginBottom: '10px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#888', marginBottom: '3px' }}>
                              <span>المتبقي التقريبي من الدورة</span>
                              <span style={{ color: barColor, fontWeight: 'bold' }}>{pump.pct}%</span>
                            </div>
                            <div style={{ height: '8px', background: '#eee', borderRadius: '4px' }}>
                              <div style={{ height: '100%', width: `${pump.pct}%`, background: barColor, borderRadius: '4px', transition: 'width 0.3s' }} />
                            </div>
                          </div>
                        )}

                        {/* آخر 5 تعبئات */}
                        {recentRecords.length > 0 && (
                          <div>
                            <div style={{ fontSize: '11px', color: '#888', marginBottom: '5px', fontWeight: 'bold' }}>📋 آخر التعبئات:</div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                              {recentRecords.map((r, i) => (
                                <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: i === 0 ? '#fdebd0' : '#f9f9f9', borderRadius: '6px', padding: '5px 10px', fontSize: '12px' }}>
                                  <span>{new Date(r.date).toLocaleDateString('ar-SA')}{r.notes ? ` — ${r.notes}` : ''}</span>
                                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                    {r.price > 0 && <span style={{ fontWeight: 'bold', color: '#e67e22' }}>{r.price} ر</span>}
                                    <button onClick={() => { if (window.confirm('حذف؟')) savePetrolRecords(petrolRecords.filter(x => x.id !== r.id)); }} style={{ background: 'none', border: 'none', color: '#e74c3c', cursor: 'pointer', fontSize: '12px' }}>🗑️</button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* رسم بياني للأسعار */}
                        {prices.length >= 3 && (
                          <div style={{ marginTop: '8px' }}>
                            <div style={{ fontSize: '11px', color: '#888', marginBottom: '4px' }}>📈 تطور أسعار التعبئة:</div>
                            <div style={{ display: 'flex', gap: '2px', alignItems: 'flex-end', height: '35px' }}>
                              {[...pump.records].sort((a,b)=>new Date(a.date)-new Date(b.date)).filter(r=>r.price>0).slice(-12).map((r,i,arr)=>{
                                const maxP = Math.max(...arr.map(x=>x.price));
                                const h = Math.round((r.price/maxP)*100);
                                return <div key={r.id} title={`${new Date(r.date).toLocaleDateString('ar-SA')}: ${r.price} ر`} style={{ flex:1, height:`${h}%`, background: i===arr.length-1?'#e67e22':'#f0d0a0', borderRadius:'2px 2px 0 0', minHeight:'3px', cursor:'pointer' }} />;
                              })}
                            </div>
                          </div>
                        )}

                        {pump.records.length === 0 && <div style={{ textAlign: 'center', color: '#bbb', fontSize: '13px', padding: '10px' }}>لا توجد تعبئات مسجلة — اضغط "⛽ تعبئة" لإضافة أول تعبئة</div>}
                      </div>
                    );
                  })}

                  {pumps.length === 0 && <div style={{ textAlign: 'center', padding: '30px', color: '#bbb' }}>أضف مواطير أولاً من تبويب المواطير</div>}

                  {/* Modal إضافة تعبئة بنزين */}
                  {showAddPetrol && (
                    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1200, padding: '20px' }} onClick={() => setShowAddPetrol(false)}>
                      <div style={{ background: 'white', borderRadius: '12px', maxWidth: '400px', width: '100%', overflow: 'hidden' }} onClick={e => e.stopPropagation()}>
                        <div style={{ background: 'linear-gradient(135deg, #f39c12, #e67e22)', padding: '15px 20px', color: 'white' }}>
                          <h3 style={{ margin: 0, fontSize: '16px' }}>⛽ تسجيل تعبئة بنزين 95</h3>
                          <p style={{ margin: '4px 0 0', fontSize: '12px', opacity: 0.9 }}>{pumps.find(p => p.id === petrolForm.pumpId)?.name}</p>
                        </div>
                        <div style={{ padding: '18px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                          <div>
                            <label style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>الماطور</label>
                            <select value={petrolForm.pumpId} onChange={e => setPetrolForm(p => ({ ...p, pumpId: e.target.value }))} style={{ padding: '8px', border: '1px solid #ddd', borderRadius: '6px', width: '100%', fontSize: '13px' }}>
                              <option value="">— اختر —</option>
                              {pumps.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                            </select>
                          </div>
                          <div>
                            <label style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>📅 تاريخ التعبئة</label>
                            <input type="date" value={petrolForm.date} onChange={e => setPetrolForm(p => ({ ...p, date: e.target.value }))} style={{ padding: '8px', border: '1px solid #ddd', borderRadius: '6px', width: '100%', fontSize: '13px' }} />
                          </div>
                          <div>
                            <label style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>💰 تكلفة التعبئة (ريال)</label>
                            <input type="number" min="0" step="0.5" value={petrolForm.price} onChange={e => setPetrolForm(p => ({ ...p, price: e.target.value }))} placeholder="مثال: 150" style={{ padding: '8px', border: '1px solid #ddd', borderRadius: '6px', width: '100%', fontSize: '13px' }} />
                          </div>
                          <div>
                            <label style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>📝 ملاحظات</label>
                            <input value={petrolForm.notes} onChange={e => setPetrolForm(p => ({ ...p, notes: e.target.value }))} placeholder="اختياري" style={{ padding: '8px', border: '1px solid #ddd', borderRadius: '6px', width: '100%', fontSize: '13px' }} />
                          </div>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '5px' }}>
                            <button onClick={handleSavePetrol} style={{ background: '#e67e22', color: 'white', border: 'none', padding: '11px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px' }}>✓ حفظ</button>
                            <button onClick={() => setShowAddPetrol(false)} style={{ background: '#ddd', border: 'none', padding: '11px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>إلغاء</button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div style={{ padding: '13px 20px', borderTop: '1px solid #eee' }}>
              <button onClick={() => setShowPumpSystem(false)} style={{ width: '100%', background: '#2c3e50', color: 'white', border: 'none', padding: '11px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px' }}>إغلاق</button>
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

    
