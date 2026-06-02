import React, { useState, useEffect, useCallback } from 'react';
import { AlertCircle, Bell, Download, Plus, Trash2, LogOut } from 'lucide-react';
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

const SheepFarmProMax = () => {
  const [user, setUser] = useState(null);
  const [authMode, setAuthMode] = useState('login');
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [registerForm, setRegisterForm] = useState({ email: '', password: '', confirmPassword: '', name: '' });

  const [activeTab, setActiveTab] = useState('dashboard');
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const [sheep, setSheep] = useState([]);
  const [feeds, setFeeds] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [medicines, setMedicines] = useState([]);
  const [treatments, setTreatments] = useState([]);
  const [alerts, setAlerts] = useState([]);

  const [sheepForm, setSheepForm] = useState({
    id: '', type: 'sheep', number: '', age: '', motherId: '', birthDate: '',
    totalOffspring: '', currentSeasonOffspring: '', status: 'productive', notes: ''
  });

  // CHECK LOGIN STATUS
  useEffect(() => {
    const savedUser = localStorage.getItem('sheepFarmUser');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
  }, []);

  // LOAD DATA WHEN USER LOGGED IN
  useEffect(() => {
    if (!user || !database) return;
    
    const userId = user.id;

    onValue(ref(database, `${userId}/sheep`), (snapshot) => {
      setSheep(snapshot.exists() ? Object.values(snapshot.val()) : []);
    });
    onValue(ref(database, `${userId}/feeds`), (snapshot) => {
      setFeeds(snapshot.exists() ? Object.values(snapshot.val()) : []);
    });
    onValue(ref(database, `${userId}/expenses`), (snapshot) => {
      setExpenses(snapshot.exists() ? Object.values(snapshot.val()) : []);
    });
    onValue(ref(database, `${userId}/medicines`), (snapshot) => {
      setMedicines(snapshot.exists() ? Object.values(snapshot.val()) : []);
    });
    onValue(ref(database, `${userId}/treatments`), (snapshot) => {
      setTreatments(snapshot.exists() ? Object.values(snapshot.val()) : []);
    });
  }, [user]);

  const generateAlerts = useCallback(() => {
    const newAlerts = [];
    medicines.forEach(med => {
      const expireDate = new Date(med.expiryDate);
      const days = Math.ceil((expireDate - new Date()) / (1000 * 60 * 60 * 24));
      if (days < 90 && days > 0) {
        newAlerts.push({
          id: `med-${med.id}`,
          type: 'medicine',
          severity: days < 30 ? 'high' : 'warning',
          message: `⚠️ دواء "${med.name}" سينتهي خلال ${days} يوم`,
        });
      }
    });
    sheep.forEach(s => {
      if (s.type !== 'lamb' && s.type !== 'kid' && s.status === 'non-productive' && parseInt(s.age) > 3) {
        newAlerts.push({
          id: `sheep-unprod-${s.id}`,
          type: 'health',
          severity: 'warning',
          message: `🔴 الحيوان #${s.number} عمره ${s.age} سنة بدون إنتاج`,
        });
      }
    });
    setAlerts(newAlerts);
  }, [medicines, sheep]);

  // SYNC DATA TO FIREBASE ✅ FIXED: Added 'user' to dependencies
  useEffect(() => {
    if (!user || !database) return;
    const userId = user.id;
    const backup = { sheep, feeds, expenses, medicines, treatments, timestamp: new Date().toISOString() };
    localStorage.setItem('sheepFarmBackup', JSON.stringify(backup));
    
    if (sheep.length > 0) set(ref(database, `${userId}/sheep`), sheep);
    if (feeds.length > 0) set(ref(database, `${userId}/feeds`), feeds);
    if (expenses.length > 0) set(ref(database, `${userId}/expenses`), expenses);
    if (medicines.length > 0) set(ref(database, `${userId}/medicines`), medicines);
    if (treatments.length > 0) set(ref(database, `${userId}/treatments`), treatments);

    generateAlerts();
  }, [user, sheep, feeds, expenses, medicines, treatments, generateAlerts]);

  // LOGIN
  const handleLogin = (e) => {
    e.preventDefault();
    if (!loginForm.email || !loginForm.password) {
      alert('الرجاء إدخال البريد الإلكتروني وكلمة المرور');
      return;
    }
    const userData = {
      id: loginForm.email.replace(/[^a-z0-9]/g, ''),
      email: loginForm.email,
      name: loginForm.email.split('@')[0]
    };
    localStorage.setItem('sheepFarmUser', JSON.stringify(userData));
    setUser(userData);
    setLoginForm({ email: '', password: '' });
  };

  // REGISTER
  const handleRegister = (e) => {
    e.preventDefault();
    if (!registerForm.email || !registerForm.password || !registerForm.name) {
      alert('الرجاء ملء جميع الحقول');
      return;
    }
    if (registerForm.password !== registerForm.confirmPassword) {
      alert('كلمات المرور غير متطابقة');
      return;
    }
    const userData = {
      id: registerForm.email.replace(/[^a-z0-9]/g, ''),
      email: registerForm.email,
      name: registerForm.name
    };
    localStorage.setItem('sheepFarmUser', JSON.stringify(userData));
    setUser(userData);
    setRegisterForm({ email: '', password: '', confirmPassword: '', name: '' });
    setAuthMode('login');
  };

  // LOGOUT
  const handleLogout = () => {
    localStorage.removeItem('sheepFarmUser');
    setUser(null);
    setLoginForm({ email: '', password: '' });
  };

  // REST OF THE CODE... (يتابع أسفل)
};

export default SheepFarmProMax;
