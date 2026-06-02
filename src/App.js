import React, { useState, useEffect, useCallback } from 'react';
import { AlertCircle, Bell, Download, Plus, Trash2 } from 'lucide-react';
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

  useEffect(() => {
    if (!database) return;
    const userId = localStorage.getItem('userId') || 'user_' + Date.now();
    localStorage.setItem('userId', userId);

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
  }, []);

  useEffect(() => {
    if (!database) return;
    const userId = localStorage.getItem('userId');
    const backup = { sheep, feeds, expenses, medicines, treatments, timestamp: new Date().toISOString() };
    localStorage.setItem('sheepFarmBackup', JSON.stringify(backup));
    if (sheep.length > 0) set(ref(database, `${userId}/sheep`), sheep);
    if (feeds.length > 0) set(ref(database, `${userId}/feeds`), feeds);
    if (expenses.length > 0) set(ref(database, `${userId}/expenses`), expenses);
    if (medicines.length > 0) set(ref(database, `${userId}/medicines`), medicines);
    if (treatments.length > 0) set(ref(database, `${userId}/treatments`), treatments);
    generateAlerts();
  }, [sheep, feeds, expenses, medicines, treatments, generateAlerts]);

  const calculateConsumption = () => {
    let totalDaily = 0;
    sheep.forEach(s => {
      if (s.type === 'sheep' || s.type === 'ram' || s.type === 'buck') totalDaily += 1;
      else totalDaily += 0.75;
    });
    return { daily: totalDaily, weekly: totalDaily * 7, monthly: totalDaily * 30, yearly: totalDaily * 365, totalAnimals: sheep.length };
  };

  const handleAddSheep = () => {
    const newSheep = { ...sheepForm, id: `sheep-${Date.now()}` };
    setSheep([...sheep, newSheep]);
    setSheepForm({ id: '', type: 'sheep', number: '', age: '', motherId: '', birthDate: '', totalOffspring: '', currentSeasonOffspring: '', status: 'productive', notes: '' });
    setShowModal(false);
  };

  const handleDelete = (type, id) => {
    switch(type) {
      case 'sheep': setSheep(sheep.filter(s => s.id !== id)); break;
      case 'feed': setFeeds(feeds.filter(f => f.id !== id)); break;
      case 'expense': setExpenses(expenses.filter(e => e.id !== id)); break;
      case 'medicine': setMedicines(medicines.filter(m => m.id !== id)); break;
      case 'treatment': setTreatments(treatments.filter(t => t.id !== id)); break;
      default: break;
    }
    setDeleteConfirm(null);
  };

  const exportAllData = () => {
    const allData = { sheep, feeds, expenses, medicines, treatments, timestamp: new Date().toISOString() };
    const blob = new Blob([JSON.stringify(allData, null, 2)], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `نسخة-احتياطية-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
  };

  const calculateMetrics = () => {
    const consumption = calculateConsumption();
    const feedCosts = feeds.reduce((sum, f) => sum + (parseFloat(f.quantity || 0) * parseFloat(f.pricePerKg || 0)), 0);
    const expenseCosts = expenses.reduce((sum, e) => sum + parseFloat(e.amount || 0), 0);
    const productive = sheep.filter(s => s.status === 'productive').length;
    const totalOffspring = sheep.reduce((sum, s) => sum + parseInt(s.totalOffspring || 0), 0);
    return { 
      totalSheep: sheep.length, 
      productive, 
      totalOffspring, 
      avgAge: sheep.length ? (sheep.reduce((sum, s) => sum + parseInt(s.age || 0), 0) / sheep.length).toFixed(1) : 0, 
      consumption, 
      feedCosts: feedCosts.toFixed(0), 
      expenseCosts: expenseCosts.toFixed(0), 
      totalCosts: (feedCosts + expenseCosts).toFixed(0), 
      productivity: sheep.length ? ((productive / sheep.length) * 100).toFixed(1) : 0 
    };
  };

  const renderDashboard = () => {
    const metrics = calculateMetrics();
    return (
      <div style={{ padding: '30px', background: 'linear-gradient(135deg, #f5f3f0 0%, #efe8e2 100%)', minHeight: '100vh' }}>
        <h1 style={{ color: '#3D2817', marginBottom: '30px' }}>📊 لوحة التحكم</h1>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', marginBottom: '30px' }}>
          <KPICard label="إجمالي الثروة" value={metrics.totalSheep} unit="رأس" color="#667eea" />
          <KPICard label="الأغنام المنتجة" value={metrics.productive} unit="رأس" color="#27ae60" />
          <KPICard label="معدل الإنتاجية" value={metrics.productivity} unit="%" color="#f39c12" />
          <KPICard label="الاستهلاك اليومي" value={metrics.consumption.daily.toFixed(0)} unit="كيلو" color="#e74c3c" />
          <KPICard label="المصروفات الشهرية" value={metrics.totalCosts} unit="ر.س" color="#9b59b6" />
          <KPICard label="المواليد الإجمالية" value={metrics.totalOffspring} unit="رأس" color="#1abc9c" />
        </div>
        <AlertsSection alerts={alerts} />
      </div>
    );
  };

  const renderSheepManagement = () => {
    const sheepList = sheep.filter(s => ['sheep', 'ewe', 'ram', 'lamb'].includes(s.type));
    const goatList = sheep.filter(s => ['goat', 'doe', 'buck', 'kid'].includes(s.type));
    return (
      <div style={{ padding: '30px', background: 'linear-gradient(135deg, #f5f3f0 0%, #efe8e2 100%)', minHeight: '100vh' }}>
        <h1 style={{ color: '#3D2817', marginBottom: '30px' }}>🐑 الثروة الحيوانية</h1>
        <SheepTable data={sheepList} title="الأغنام" onAdd={() => { setSheepForm({ ...sheepForm, type: 'sheep' }); setModalType('sheep'); setShowModal(true); }} onDelete={(id) => setDeleteConfirm({ type: 'sheep', id })} />
        <div style={{ marginBottom: '30px' }} />
        <SheepTable data={goatList} title="الماعز" onAdd={() => { setSheepForm({ ...sheepForm, type: 'doe' }); setModalType('sheep'); setShowModal(true); }} onDelete={(id) => setDeleteConfirm({ type: 'sheep', id })} />
      </div>
    );
  };

  const SheepTable = ({ data, title, onAdd, onDelete }) => (
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
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f0e8e0', borderBottom: '2px solid #D4A574' }}>
                <th style={{ padding: '12px', textAlign: 'right', color: '#3D2817', fontWeight: '600' }}>الرقم</th>
                <th style={{ padding: '12px', textAlign: 'right', color: '#3D2817', fontWeight: '600' }}>السن</th>
                <th style={{ padding: '12px', textAlign: 'right', color: '#3D2817', fontWeight: '600' }}>الحالة</th>
                <th style={{ padding: '12px', textAlign: 'right', color: '#3D2817', fontWeight: '600' }}>المواليد</th>
                <th style={{ padding: '12px', textAlign: 'right', color: '#3D2817', fontWeight: '600' }}>الإجراءات</th>
              </tr>
            </thead>
            <tbody>
              {data.map(item => (
                <tr key={item.id} style={{ borderBottom: '1px solid #e8e2dc' }}>
                  <td style={{ padding: '12px' }}>#{item.number}</td>
                  <td style={{ padding: '12px' }}>{item.age} سنة</td>
                  <td style={{ padding: '12px' }}>
                    <span style={{ padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: '600', background: item.status === 'productive' ? '#27ae6033' : '#f39c1233', color: item.status === 'productive' ? '#27ae60' : '#f39c12' }}>
                      {item.status === 'productive' ? '✓ منتجة' : '⊘ غير منتجة'}
                    </span>
                  </td>
                  <td style={{ padding: '12px' }}>{item.totalOffspring}</td>
                  <td style={{ padding: '12px' }}>
                    <button onClick={() => onDelete(item.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#e74c3c' }}>
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );

  const KPICard = ({ label, value, unit, color }) => (
    <div style={{ background: `${color}15`, borderLeft: `4px solid ${color}`, padding: '20px', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
      <p style={{ fontSize: '12px', color: '#666', margin: '0 0 10px 0' }}>{label}</p>
      <p style={{ fontSize: '32px', fontWeight: 'bold', color: color, margin: '0 0 5px 0' }}>{value} <span style={{ fontSize: '16px' }}>{unit}</span></p>
    </div>
  );

  const AlertsSection = ({ alerts }) => (
    <div style={{ background: 'white', padding: '25px', borderRadius: '12px', boxShadow: '0 4px 15px rgba(0,0,0,0.08)' }}>
      <h3 style={{ color: '#3D2817', margin: '0 0 15px 0', display: 'flex', gap: '10px', alignItems: 'center' }}>
        <Bell size={20} /> التنبيهات ({alerts.length})
      </h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {alerts.length === 0 ? (
          <p style={{ color: '#27ae60', textAlign: 'center', padding: '20px' }}>✓ الحالة جيدة!</p>
        ) : (
          alerts.map(alert => (
            <div key={alert.id} style={{ padding: '12px', borderLeft: `4px solid ${alert.severity === 'high' ? '#e74c3c' : '#f39c12'}`, background: alert.severity === 'high' ? '#ffe5e5' : '#fff3cd', borderRadius: '6px' }}>
              <p style={{ margin: 0, fontWeight: '500' }}>{alert.message}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );

  const renderModal = () => {
    if (!showModal) return null;
    return (
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }} onClick={() => setShowModal(false)}>
        <div style={{ background: 'white', padding: '30px', borderRadius: '12px', maxWidth: '600px', width: '90%', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 10px 40px rgba(0,0,0,0.3)', position: 'relative' }} onClick={e => e.stopPropagation()}>
          <button onClick={() => setShowModal(false)} style={{ position: 'absolute', top: '15px', right: '15px', background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer' }}>✕</button>
          {modalType === 'sheep' && (
            <form style={{ display: 'flex', flexDirection: 'column', gap: '15px' }} onSubmit={e => { e.preventDefault(); handleAddSheep(); }}>
              <h2 style={{ color: '#3D2817', marginBottom: '20px' }}>إضافة حيوان</h2>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                <FormInput label="النوع" type="select" value={sheepForm.type} onChange={e => setSheepForm({...sheepForm, type: e.target.value})} options={['sheep', 'ewe', 'ram', 'lamb', 'doe', 'buck', 'kid']} />
                <FormInput label="الرقم" type="text" value={sheepForm.number} onChange={e => setSheepForm({...sheepForm, number: e.target.value})} required />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                <FormInput label="السن (سنة)" type="number" value={sheepForm.age} onChange={e => setSheepForm({...sheepForm, age: e.target.value})} />
                <FormInput label="تاريخ الولادة" type="date" value={sheepForm.birthDate} onChange={e => setSheepForm({...sheepForm, birthDate: e.target.value})} />
              </div>
              <FormInput label="إجمالي المواليد" type="number" value={sheepForm.totalOffspring} onChange={e => setSheepForm({...sheepForm, totalOffspring: e.target.value})} />
              <FormInput label="الحالة" type="select" value={sheepForm.status} onChange={e => setSheepForm({...sheepForm, status: e.target.value})} options={['productive', 'non-productive', 'excluded']} />
              <button type="submit" style={{ background: 'linear-gradient(90deg, #8B6F47, #D4A574)', color: 'white', border: 'none', padding: '12px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>
                إضافة الحيوان
              </button>
            </form>
          )}
        </div>
      </div>
    );
  };

  const FormInput = ({ label, type, value, onChange, placeholder, options, required, step }) => {
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
        <input type={type} value={value} onChange={onChange} placeholder={placeholder} required={required} step={step} style={{ padding: '10px', border: '1px solid #ddd', borderRadius: '6px', fontFamily: 'inherit' }} />
      </label>
    );
  };

  const DeleteConfirmation = () => {
    if (!deleteConfirm) return null;
    return (
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 2000 }}>
        <div style={{ background: 'white', padding: '30px', borderRadius: '12px', textAlign: 'center', maxWidth: '400px' }}>
          <AlertCircle size={48} color="#e74c3c" style={{ margin: '0 auto 20px' }} />
          <h2 style={{ color: '#3D2817', marginBottom: '10px' }}>تأكيد الحذف</h2>
          <p style={{ color: '#666', marginBottom: '30px' }}>هل أنت متأكد من حذف هذا العنصر؟</p>
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
            <button onClick={() => handleDelete(deleteConfirm.type, deleteConfirm.id)} style={{ background: '#e74c3c', color: 'white', border: 'none', padding: '10px 30px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>
              حذف
            </button>
            <button onClick={() => setDeleteConfirm(null)} style={{ background: '#ddd', border: 'none', padding: '10px 30px', borderRadius: '6px', cursor: 'pointer' }}>
              إلغاء
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', minHeight: '100vh', background: '#f9f7f4' }}>
      <style>{`* { margin: 0; padding: 0; box-sizing: border-box; } body { font-family: 'Segoe UI', Tahoma, Geneva, sans-serif; direction: rtl; }`}</style>
      <div style={{ background: 'linear-gradient(180deg, #5D4E37 0%, #3D2817 100%)', padding: '25px 15px', boxShadow: '0 8px 32px rgba(0,0,0,0.15)', position: 'fixed', width: '260px', height: '100vh', overflowY: 'auto' }}>
        <div style={{ color: '#F5D547', fontSize: '26px', fontWeight: 'bold', marginBottom: '30px', textAlign: 'center', paddingBottom: '15px', borderBottom: '2px solid #D4A574' }}>
          🐑 FarmHub Pro
        </div>
        <ul style={{ listStyle: 'none' }}>
          {[{ id: 'dashboard', label: '📊 لوحة التحكم' }, { id: 'sheep', label: '🐑 الثروة الحيوانية' }].map(item => (
            <li key={item.id} style={{ marginBottom: '8px' }}>
              <button onClick={() => setActiveTab(item.id)} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 15px', color: activeTab === item.id ? '#3D2817' : '#E8D5C4', background: activeTab === item.id ? 'linear-gradient(90deg, #F5D547, #D4A574)' : 'transparent', border: 'none', cursor: 'pointer', width: '100%', borderRadius: '6px', fontSize: '13px', fontWeight: activeTab === item.id ? 'bold' : 'normal' }}>
                {item.label}
              </button>
            </li>
          ))}
          <li style={{ marginTop: '30px', paddingTop: '15px', borderTop: '1px solid rgba(255,255,255,0.2)' }}>
            <button onClick={exportAllData} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 15px', color: '#F5D547', background: 'transparent', border: '1px solid #F5D547', cursor: 'pointer', width: '100%', borderRadius: '6px', fontSize: '13px', fontWeight: '600' }}>
              <Download size={16} /> احفظ البيانات
            </button>
          </li>
        </ul>
      </div>
      <div style={{ gridColumn: 2, overflowY: 'auto', maxHeight: '100vh' }}>
        {activeTab === 'dashboard' && renderDashboard()}
        {activeTab === 'sheep' && renderSheepManagement()}
      </div>
      {renderModal()}
      <DeleteConfirmation />
    </div>
  );
};

export default SheepFarmProMax;
