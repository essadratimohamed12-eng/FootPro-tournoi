import React, { useState, useEffect } from 'react';
import { 
  collection, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc 
} from 'firebase/firestore';
import { db } from './firebase';

export default function App() {
  const [role, setRole] = useState(null);
  
  // كلمات المرور والصلاحيات
  const [adminPassword, setAdminPassword] = useState(() => localStorage.getItem('admin_pass') || 'admin123');
  const [viewerPassword, setViewerPassword] = useState(() => localStorage.getItem('viewer_pass') || 'viewer123');
  const [adminInput, setAdminInput] = useState('');
  const [viewerInput, setViewerInput] = useState('');
  const [newAdminPass, setNewAdminPass] = useState('');
  const [newViewerPass, setNewViewerPass] = useState('');

  // إعدادات البطولة
  const [tournamentName, setTournamentName] = useState(() => localStorage.getItem('tourney_name') || 'PES AND ALSTOM');
  const [tournamentSystem, setTournamentSystem] = useState(() => localStorage.getItem('tourney_sys') || 'groups_knockout'); 
  const [matchLegs, setMatchLegs] = useState(() => localStorage.getItem('match_legs') || 'single'); 

  const [currentView, setCurrentView] = useState('menu'); 
  const [phase1Tab, setPhase1Tab] = useState('Journée 1');
  const [phase2Tab, setPhase2Tab] = useState('Quarts de finale');

  const [teams, setTeams] = useState([]);
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);

  // إدخال فريق جديد مع الشعار
  const [newTeamName, setNewTeamName] = useState('');
  const [newTeamGroup, setNewTeamGroup] = useState('GROUPE A');
  const [newTeamLogo, setNewTeamLogo] = useState('');

  const fetchData = async () => {
    try {
      const teamsSnapshot = await getDocs(collection(db, "teams"));
      const teamsList = teamsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setTeams(teamsList);

      const matchesSnapshot = await getDocs(collection(db, "matches"));
      const matchesList = matchesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setMatches(matchesList);
      
      setLoading(false);
    } catch (error) {
      console.error("خطأ في جلب البيانات:", error);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAdminLogin = (e) => {
    e.preventDefault();
    if (adminInput === adminPassword) {
      setRole('admin');
    } else {
      alert('كلمة مرور المشرف غير صحيحة!');
    }
    setAdminInput('');
  };

  const handleViewerLogin = (e) => {
    e.preventDefault();
    if (viewerInput === viewerPassword) {
      setRole('viewer');
    } else {
      alert('كلمة مرور المشاهد غير صحيحة!');
    }
    setViewerInput('');
  };

  if (loading) {
    return <div style={{ color: '#0284c7', textAlign: 'center', marginTop: '100px', fontSize: '18px', fontFamily: 'Cairo' }}>جاري تحميل البطولة... ⚽</div>;
  }

  // شاشة تسجيل الدخول
  if (!role) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#f8fafc', color: '#1e293b', fontFamily: 'Cairo, sans-serif' }}>
        <div style={{ background: '#ffffff', padding: '30px', borderRadius: '16px', width: '380px', textAlign: 'center', boxShadow: '0 4px 20px rgba(0,0,0,0.08)', border: '1px solid #e2e8f0' }}>
          <div style={{ background: '#0284c7', color: '#fff', padding: '15px', borderRadius: '12px', marginBottom: '20px', fontSize: '20px', fontWeight: 'bold' }}>
            {tournamentName} 🏆
          </div>
          
          <div style={{ marginBottom: '20px', textAlign: 'right' }}>
            <label style={{ fontSize: '13px', fontWeight: 'bold', color: '#0284c7', display: 'block', marginBottom: '5px' }}>🔐 دخول المشرف (Admin)</label>
            <form onSubmit={handleAdminLogin} style={{ display: 'flex', gap: '8px' }}>
              <input 
                type="password" 
                placeholder="كلمة مرور المشرف..." 
                value={adminInput}
                onChange={(e) => setAdminInput(e.target.value)}
                style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px' }}
              />
              <button type="submit" style={{ background: '#0284c7', border: 'none', padding: '10px 15px', borderRadius: '8px', color: '#fff', fontWeight: 'bold', cursor: 'pointer' }}>دخول</button>
            </form>
          </div>

          <div style={{ textAlign: 'right' }}>
            <label style={{ fontSize: '13px', fontWeight: 'bold', color: '#64748b', display: 'block', marginBottom: '5px' }}>👁️ دخول المشاهد (Viewer)</label>
            <form onSubmit={handleViewerLogin} style={{ display: 'flex', gap: '8px' }}>
              <input 
                type="password" 
                placeholder="كلمة مرور المشاهد..." 
                value={viewerInput}
                onChange={(e) => setViewerInput(e.target.value)}
                style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px' }}
              />
              <button type="submit" style={{ background: '#64748b', border: 'none', padding: '10px 15px', borderRadius: '8px', color: '#fff', fontWeight: 'bold', cursor: 'pointer' }}>دخول</button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f8fafc', color: '#1e293b', fontFamily: 'Cairo, sans-serif', paddingBottom: '40px' }}>
      
      {/* الهيدر العلوي */}
      <div style={{ backgroundColor: '#0284c7', color: '#fff', padding: '15px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          {currentView !== 'menu' && (
            <button 
              onClick={() => setCurrentView('menu')}
              style={{ background: 'transparent', border: 'none', color: '#fff', fontSize: '22px', cursor: 'pointer', fontWeight: 'bold' }}
            >
              ❮
            </button>
          )}
          <h1 style={{ fontSize: '18px', fontWeight: 'bold', margin: 0 }}>{tournamentName}</h1>
        </div>
        <button 
          onClick={() => setRole(null)}
          style={{ background: 'rgba(255,255,255,0.2)', border: 'none', padding: '5px 12px', borderRadius: '6px', color: '#fff', fontSize: '12px', cursor: 'pointer' }}
        >
          خروج
        </button>
      </div>

      {/* القائمة الرئيسية */}
      {currentView === 'menu' && (
        <div style={{ maxWidth: '600px', margin: '20px auto', padding: '0 15px' }}>
          
          <div style={{ fontSize: '15px', fontWeight: 'bold', color: '#334155', margin: '15px 0 10px 0', borderBottom: '2px solid #e2e8f0', paddingBottom: '5px' }}>
            Phase 1
          </div>

          <div 
            onClick={() => setCurrentView('infos')}
            style={{ background: '#fff', padding: '15px 20px', borderRadius: '10px', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '15px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', cursor: 'pointer', border: '1px solid #f1f5f9' }}
          >
            <div style={{ background: '#e0f2fe', color: '#0284c7', width: '40px', height: '40px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>🏆</div>
            <div>
              <div style={{ fontWeight: 'bold', fontSize: '14px' }}>INFOS SUR LE TOURNOI</div>
              <div style={{ fontSize: '12px', color: '#64748b' }}>إعدادات البطولة وأنظمة اللعب وكلمات المرور</div>
            </div>
          </div>

          <div 
            onClick={() => setCurrentView('participants')}
            style={{ background: '#fff', padding: '15px 20px', borderRadius: '10px', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '15px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', cursor: 'pointer', border: '1px solid #f1f5f9' }}
          >
            <div style={{ background: '#e0f2fe', color: '#0284c7', width: '40px', height: '40px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>👥</div>
            <div>
              <div style={{ fontWeight: 'bold', fontSize: '14px' }}>PARTICIPANTS</div>
              <div style={{ fontSize: '12px', color: '#64748b' }}>إضافة وتعديل الفرق وشعاراتها والمجموعات</div>
            </div>
          </div>

          {tournamentSystem !== 'knockout_only' && (
            <>
              <div 
                onClick={() => setCurrentView('phase1_points')}
                style={{ background: '#fff', padding: '15px 20px', borderRadius: '10px', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '15px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', cursor: 'pointer', border: '1px solid #f1f5f9' }}
              >
                <div style={{ background: '#e0f2fe', color: '#0284c7', width: '40px', height: '40px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: 'bold' }}>03</div>
                <div>
                  <div style={{ fontWeight: 'bold', fontSize: '14px' }}>POINTS</div>
                  <div style={{ fontSize: '12px', color: '#64748b' }}>نتائج المباريات (Journées)</div>
                </div>
              </div>

              <div 
                onClick={() => setCurrentView('phase1_classement')}
                style={{ background: '#fff', padding: '15px 20px', borderRadius: '10px', marginBottom: '25px', display: 'flex', alignItems: 'center', gap: '15px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', cursor: 'pointer', border: '1px solid #f1f5f9' }}
              >
                <div style={{ background: '#e0f2fe', color: '#0284c7', width: '40px', height: '40px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px' }}>📊</div>
                <div>
                  <div style={{ fontWeight: 'bold', fontSize: '14px' }}>CLASSEMENT</div>
                  <div style={{ fontSize: '12px', color: '#64748b' }}>ترتيب الفرق مع شعاراتها</div>
                </div>
              </div>
            </>
          )}

          {(tournamentSystem === 'groups_knockout' || tournamentSystem === 'league_knockout' || tournamentSystem === 'knockout_only') && (
            <>
              <div style={{ fontSize: '15px', fontWeight: 'bold', color: '#334155', margin: '20px 0 10px 0', borderBottom: '2px solid #e2e8f0', paddingBottom: '5px' }}>
                Phase 2 (الأدوار الإقصائية)
              </div>

              <div 
                onClick={() => setCurrentView('phase2')}
                style={{ background: '#fff', padding: '15px 20px', borderRadius: '10px', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '15px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', cursor: 'pointer', border: '1px solid #f1f5f9' }}
              >
                <div style={{ background: '#e0f2fe', color: '#0284c7', width: '40px', height: '40px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: 'bold' }}>03</div>
                <div>
                  <div style={{ fontWeight: 'bold', fontSize: '14px' }}>POINTS (النهائيات)</div>
                  <div style={{ fontSize: '12px', color: '#64748b' }}>ربع النصف والنهائي (Quarts, Demis, Finale)</div>
                </div>
              </div>
            </>
          )}

        </div>
      )}

      {/* شاشة الإعدادات وكلمات السر */}
      {currentView === 'infos' && (
        <div style={{ maxWidth: '600px', margin: '20px auto', padding: '0 15px' }}>
          <div style={{ background: '#fff', padding: '20px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <h2 style={{ fontSize: '16px', color: '#0284c7', marginBottom: '15px' }}>إعدادات ونظام البطولة</h2>
            
            <div style={{ marginBottom: '15px' }}>
              <label style={{ fontSize: '13px', display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>اسم البطولة:</label>
              <input 
                type="text" 
                value={tournamentName} 
                onChange={(e) => setTournamentName(e.target.value)}
                disabled={role !== 'admin'}
                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
              />
            </div>

            <div style={{ marginBottom: '15px' }}>
              <label style={{ fontSize: '13px', display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>نظام البطولة:</label>
              <select 
                value={tournamentSystem}
                onChange={(e) => {
                  setTournamentSystem(e.target.value);
                  localStorage.setItem('tourney_sys', e.target.value);
                }}
                disabled={role !== 'admin'}
                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#fff' }}
              >
                <option value="groups_knockout">دور المجموعات ثم أدوار إقصائية</option>
                <option value="league">دوري عادي (مجموعات فقط)</option>
                <option value="league_knockout">دوري ثم أدوار إقصائية</option>
                <option value="knockout_only">أدوار إقصائية فقط</option>
              </select>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ fontSize: '13px', display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>نوع المباريات (الذهاب والإياب):</label>
              <select 
                value={matchLegs}
                onChange={(e) => {
                  setMatchLegs(e.target.value);
                  localStorage.setItem('match_legs', e.target.value);
                }}
                disabled={role !== 'admin'}
                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#fff' }}
              >
                <option value="single">مباراة واحدة (Match unique)</option>
                <option value="aller_retour">ذهاب وإياب (Aller-Retour)</option>
              </select>
            </div>

            {role === 'admin' && (
              <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '15px' }}>
                <h3 style={{ fontSize: '14px', marginBottom: '12px', color: '#0284c7' }}>تغيير كلمات السر (تحكم المشرف)</h3>
                <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
                  <input type="password" placeholder="كلمة سر المشرف الجديدة" value={newAdminPass} onChange={(e) => setNewAdminPass(e.target.value)} style={{ flex: 1, padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
                  <button onClick={() => { localStorage.setItem('admin_pass', newAdminPass); setAdminPassword(newAdminPass); alert('تم تحديث كلمة سر المشرف بنجاح'); }} style={{ background: '#0284c7', color: '#fff', border: 'none', padding: '8px 12px', borderRadius: '6px', fontWeight: 'bold' }}>حفظ</button>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <input type="password" placeholder="كلمة سر المشاهد الجديدة" value={newViewerPass} onChange={(e) => setNewViewerPass(e.target.value)} style={{ flex: 1, padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
                  <button onClick={() => { localStorage.setItem('viewer_pass', newViewerPass); setViewerPassword(newViewerPass); alert('تم تحديث كلمة سر المشاهد بنجاح'); }} style={{ background: '#64748b', color: '#fff', border: 'none', padding: '8px 12px', borderRadius: '6px', fontWeight: 'bold' }}>حفظ</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* شاشة المشاركين مع خاصية الشعار (Logo) */}
      {currentView === 'participants' && (
        <div style={{ maxWidth: '600px', margin: '20px auto', padding: '0 15px' }}>
          <div style={{ background: '#fff', padding: '20px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <h2 style={{ fontSize: '16px', color: '#0284c7', marginBottom: '15px' }}>إدارة المشاركين والشعارات</h2>
            {role === 'admin' && (
              <form onSubmit={async (e) => {
                e.preventDefault();
                if (!newTeamName.trim()) return;
                await addDoc(collection(db, "teams"), { 
                  name: newTeamName, 
                  group: newTeamGroup, 
                  logo: newTeamLogo || 'https://via.placeholder.com/40', 
                  p:0, w:0, d:0, l:0, gf:0, ga:0, pts:0 
                });
                setNewTeamName('');
                setNewTeamLogo('');
                fetchData();
              }} style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <input type="text" placeholder="اسم الفريق..." value={newTeamName} onChange={(e) => setNewTeamName(e.target.value)} style={{ flex: 2, padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
                  <select value={newTeamGroup} onChange={(e) => setNewTeamGroup(e.target.value)} style={{ flex: 1, padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
                    <option value="GROUPE A">GROUPE A</option>
                    <option value="GROUPE B">GROUPE B</option>
                    <option value="GROUPE C">GROUPE C</option>
                    <option value="GROUPE D">GROUPE D</option>
                  </select>
                </div>
                <input type="text" placeholder="رابط صورة شعار الفريق (Logo URL)..." value={newTeamLogo} onChange={(e) => setNewTeamLogo(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
                <button type="submit" style={{ background: '#0284c7', color: '#fff', border: 'none', padding: '10px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>إضافة الفريق مع الشعار</button>
              </form>
            )}
            <div>
              {teams.map(t => (
                <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px', borderBottom: '1px solid #f1f5f9', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <img src={t.logo || 'https://via.placeholder.com/40'} alt="" style={{ width: '30px', height: '30px', borderRadius: '50%', objectFit: 'cover', border: '1px solid #cbd5e1' }} />
                    <span style={{ fontWeight: 'bold' }}>{t.name} <span style={{ fontSize: '11px', color: '#64748b' }}>({t.group})</span></span>
                  </div>
                  {role === 'admin' && (
                    <button onClick={async () => { await deleteDoc(doc(db, "teams", t.id)); fetchData(); }} style={{ background: '#ef4444', color: '#fff', border: 'none', padding: '4px 8px', borderRadius: '4px', fontSize: '12px' }}>حذف</button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* شاشة نقاط المجموعات */}
      {currentView === 'phase1_points' && (
        <div style={{ maxWidth: '600px', margin: '0 auto' }}>
          <div style={{ display: 'flex', background: '#0284c7', color: '#fff' }}>
            {['Journée 1', 'Journée 2', 'Journée 3'].map((j) => (
              <button 
                key={j}
                onClick={() => setPhase1Tab(j)}
                style={{ flex: 1, background: phase1Tab === j ? 'rgba(255,255,255,0.25)' : 'transparent', border: 'none', padding: '12px', color: '#fff', fontWeight: 'bold', borderBottom: phase1Tab === j ? '3px solid #fff' : 'none', cursor: 'pointer' }}
              >
                {j}
              </button>
            ))}
          </div>

          <div style={{ padding: '15px' }}>
            <div style={{ fontWeight: 'bold', fontSize: '15px', margin: '10px 0', color: '#334155' }}>GROUPE A ({matchLegs === 'aller_retour' ? 'ذهاب وإياب' : 'مباراة واحدة'})</div>
            
            <div style={{ background: '#fff', borderRadius: '10px', padding: '15px', marginBottom: '15px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', textAlign: 'center' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <span style={{ flex: 1, fontWeight: 'bold' }}>إيطاليا</span>
                <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
                  <input type="number" defaultValue="4" style={{ width: '35px', textAlign: 'center', padding: '5px', border: '1px solid #cbd5e1', borderRadius: '4px' }} disabled={role !== 'admin'} />
                  <span>-</span>
                  <input type="number" defaultValue="0" style={{ width: '35px', textAlign: 'center', padding: '5px', border: '1px solid #cbd5e1', borderRadius: '4px' }} disabled={role !== 'admin'} />
                </div>
                <span style={{ flex: 1, fontWeight: 'bold' }}>ألمانيا</span>
              </div>
              <div style={{ fontSize: '11px', color: '#94a3b8' }}>⏱️ Oct 18, 2026 10:00 PM</div>
            </div>
          </div>
        </div>
      )}

      {/* شاشة الترتيب مع شعارات الفرق */}
      {currentView === 'phase1_classement' && (
        <div style={{ maxWidth: '600px', margin: '20px auto', padding: '0 15px' }}>
          <div style={{ background: '#fff', padding: '15px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <h2 style={{ fontSize: '16px', color: '#0284c7', marginBottom: '15px' }}>ترتيب المجموعات</h2>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ background: '#f1f5f9', textAlign: 'center' }}>
                  <th style={{ padding: '8px', textAlign: 'right' }}>الفريق</th>
                  <th>لعب</th>
                  <th>نقاط</th>
                </tr>
              </thead>
              <tbody>
                {teams.map(t => (
                  <tr key={t.id} style={{ textAlign: 'center', borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '8px', textAlign: 'right', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <img src={t.logo || 'https://via.placeholder.com/40'} alt="" style={{ width: '22px', height: '22px', borderRadius: '50%', objectFit: 'cover' }} />
                      {t.name}
                    </td>
                    <td>{t.p || 0}</td>
                    <td style={{ fontWeight: 'bold', color: '#0284c7' }}>{t.pts || 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* شاشة الأدوار الإقصائية */}
      {currentView === 'phase2' && (
        <div style={{ maxWidth: '600px', margin: '0 auto' }}>
          <div style={{ display: 'flex', background: '#0284c7', color: '#fff' }}>
            {['Quarts de finale', 'Demi-finales', 'Finale'].map((tab) => (
              <button 
                key={tab}
                onClick={() => setPhase2Tab(tab)}
                style={{ flex: 1, background: phase2Tab === tab ? 'rgba(255,255,255,0.25)' : 'transparent', border: 'none', padding: '12px 5px', color: '#fff', fontSize: '12px', fontWeight: 'bold', borderBottom: phase2Tab === tab ? '3px solid #fff' : 'none', cursor: 'pointer' }}
              >
                {tab}
              </button>
            ))}
          </div>

          <div style={{ padding: '15px' }}>
            {phase2Tab === 'Quarts de finale' && (
              <>
                {[
                  { home: 'البرازيل', away: 'بلجيكا' },
                  { home: 'المغرب', away: 'النرويج' },
                  { home: 'الأوروغواي', away: 'البرتغال' },
                  { home: 'الأرجنتين', away: 'اسبانيا' }
                ].map((m, idx) => (
                  <div key={idx} style={{ background: '#fff', borderRadius: '10px', padding: '15px', marginBottom: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', textAlign: 'center' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <span style={{ flex: 1, fontWeight: 'bold' }}>{m.home}</span>
                      <div style={{ padding: '5px 15px', background: '#f1f5f9', borderRadius: '6px', fontWeight: 'bold', color: '#0284c7' }}>- : -</div>
                      <span style={{ flex: 1, fontWeight: 'bold' }}>{m.away}</span>
                    </div>
                    <div style={{ fontSize: '11px', color: '#94a3b8' }}>{matchLegs === 'aller_retour' ? ' نظام ذهاب وإياب' : 'مباراة واحدة حاسمة'}</div>
                  </div>
                ))}
              </>
            )}

            {phase2Tab === 'Demi-finales' && (
              <>
                {[
                  { homeMatch: 'البرازيل - بلجيكا', awayMatch: 'المغرب - النرويج' },
                  { homeMatch: 'الأوروغواي - البرتغال', awayMatch: 'الأرجنتين - اسبانيا' }
                ].map((m, idx) => (
                  <div key={idx} style={{ background: '#fff', borderRadius: '10px', padding: '15px', marginBottom: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', textAlign: 'center' }}>
                    <div style={{ fontSize: '11px', color: '#0284c7', marginBottom: '5px', fontWeight: 'bold' }}>Vainqueur de / Vainqueur de</div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <span style={{ flex: 1, fontSize: '13px', fontWeight: 'bold' }}>{m.homeMatch}</span>
                      <div style={{ padding: '5px 15px', background: '#f1f5f9', borderRadius: '6px', fontWeight: 'bold', color: '#0284c7' }}>- : -</div>
                      <span style={{ flex: 1, fontSize: '13px', fontWeight: 'bold' }}>{m.awayMatch}</span>
                    </div>
                  </div>
                ))}
              </>
            )}

            {phase2Tab === 'Finale' && (
              <div style={{ background: '#fff', borderRadius: '10px', padding: '20px', textAlign: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                <div style={{ fontSize: '12px', color: '#0284c7', marginBottom: '10px', fontWeight: 'bold' }}>المباراة النهائية الكبرى</div>
                <div style={{ fontSize: '15px', fontWeight: 'bold', marginBottom: '15px' }}>متأهل النصف 1 VS متأهل النصف 2</div>
                <div style={{ padding: '10px 20px', background: '#f1f5f9', borderRadius: '6px', display: 'inline-block', fontWeight: 'bold', color: '#0284c7' }}>- : -</div>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}