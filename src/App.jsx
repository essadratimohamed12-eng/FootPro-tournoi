import React, { useState, useEffect } from 'react';
import { 
  collection, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc,
  writeBatch
} from 'firebase/firestore';
import { db } from './firebase';

export default function App() {
  const [role, setRole] = useState(null);
  
  const [adminPassword, setAdminPassword] = useState(() => localStorage.getItem('admin_pass') || 'admin123');
  const [viewerPassword, setViewerPassword] = useState(() => localStorage.getItem('viewer_pass') || 'viewer123');
  const [adminInput, setAdminInput] = useState('');
  const [viewerInput, setViewerInput] = useState('');
  const [newAdminPass, setNewAdminPass] = useState('');
  const [newViewerPass, setNewViewerPass] = useState('');

  const [tournamentName, setTournamentName] = useState(() => localStorage.getItem('tourney_name') || 'PES AND ALSTOM');
  const [tournamentSystem, setTournamentSystem] = useState(() => localStorage.getItem('tourney_sys') || 'groups_knockout'); 
  const [matchLegs, setMatchLegs] = useState(() => localStorage.getItem('match_legs') || 'single'); 

  const [currentView, setCurrentView] = useState('menu'); 
  const [phase1Tab, setPhase1Tab] = useState('Journée 1');
  const [phase2Tab, setPhase2Tab] = useState('Quarts de finale');

  const [teams, setTeams] = useState([]);
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);

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

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewTeamLogo(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUpdateScore = async (match, hScore, aScore) => {
    const hs = parseInt(hScore);
    const as = parseInt(aScore);

    if (isNaN(hs) || isNaN(as)) {
      alert("المرجو إدخال أرقام صحيحة في نتيجة الفريقين!");
      return;
    }

    try {
      const matchRef = doc(db, "matches", match.id);
      await updateDoc(matchRef, {
        homeScore: hs,
        awayScore: as,
        status: 'انتهت'
      });

      const homeTeamObj = teams.find(t => t.name?.trim() === match.home?.trim());
      const awayTeamObj = teams.find(t => t.name?.trim() === match.away?.trim());

      if (homeTeamObj && awayTeamObj) {
        let homeWin = hs > as ? 1 : 0;
        let homeDraw = hs === as ? 1 : 0;
        let homeLoss = hs < as ? 1 : 0;
        let homePts = homeWin * 3 + homeDraw * 1;

        let awayWin = as > hs ? 1 : 0;
        let awayDraw = as === hs ? 1 : 0;
        let awayLoss = as < hs ? 1 : 0;
        let awayPts = awayWin * 3 + awayDraw * 1;

        await updateDoc(doc(db, "teams", homeTeamObj.id), {
          p: (Number(homeTeamObj.p) || 0) + 1,
          w: (Number(homeTeamObj.w) || 0) + homeWin,
          d: (Number(homeTeamObj.d) || 0) + homeDraw,
          l: (Number(homeTeamObj.l) || 0) + homeLoss,
          gf: (Number(homeTeamObj.gf) || 0) + hs,
          ga: (Number(homeTeamObj.ga) || 0) + as,
          pts: (Number(homeTeamObj.pts) || 0) + homePts
        });

        await updateDoc(doc(db, "teams", awayTeamObj.id), {
          p: (Number(awayTeamObj.p) || 0) + 1,
          w: (Number(awayTeamObj.w) || 0) + awayWin,
          d: (Number(awayTeamObj.d) || 0) + awayDraw,
          l: (Number(awayTeamObj.l) || 0) + awayLoss,
          gf: (Number(awayTeamObj.gf) || 0) + as,
          ga: (Number(awayTeamObj.ga) || 0) + hs,
          pts: (Number(awayTeamObj.pts) || 0) + awayPts
        });
      }

      await fetchData();
      alert("تم تحديث النتيجة وترتيب الفرق أوتوماتيكياً بنجاح! 🏆");
    } catch (error) {
      console.error("خطأ في تحديث النتيجة:", error);
    }
  };

  const handleResetTournament = async () => {
    if (window.confirm("⚠️ هل أنت متأكد من مسح جميع بيانات هذه البطولة نهائياً؟")) {
      try {
        const batch = writeBatch(db);
        teams.forEach(t => batch.delete(doc(db, "teams", t.id)));
        matches.forEach(m => batch.delete(doc(db, "matches", m.id)));
        await batch.commit();
        localStorage.clear();
        setTeams([]);
        setMatches([]);
        alert("تم مسح البطولة بنجاح!");
        window.location.reload();
      } catch (err) {
        console.error("خطأ:", err);
      }
    }
  };

  const sortGroupTeams = (groupTeams) => {
    return groupTeams.sort((a, b) => {
      const ptsA = Number(a.pts) || 0;
      const ptsB = Number(b.pts) || 0;
      if (ptsB !== ptsA) return ptsB - ptsA;

      const directMatch = matches.find(m => 
        (m.home === a.name && m.away === b.name) || 
        (m.home === b.name && m.away === a.name)
      );
      if (directMatch && directMatch.homeScore !== null && directMatch.awayScore !== null) {
        const aIsHome = directMatch.home === a.name;
        const scoreA = aIsHome ? directMatch.homeScore : directMatch.awayScore;
        const scoreB = aIsHome ? directMatch.awayScore : directMatch.homeScore;
        if (scoreA !== scoreB) return scoreB - scoreA;
      }

      const gdA = (Number(a.gf) || 0) - (Number(a.ga) || 0);
      const gdB = (Number(b.gf) || 0) - (Number(b.ga) || 0);
      if (gdB !== gdA) return gdB - gdA;

      return (Number(b.gf) || 0) - (Number(a.gf) || 0);
    });
  };

  if (loading) {
    return <div style={{ color: '#38bdf8', textAlign: 'center', marginTop: '100px', fontSize: '18px', fontFamily: 'Cairo' }}>جاري تحميل البطولة... ⚽</div>;
  }

  if (!role) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#0b0f19', color: '#fff', fontFamily: 'Cairo, sans-serif' }}>
        <div style={{ background: '#1e293b', padding: '30px', borderRadius: '16px', width: '380px', textAlign: 'center', boxShadow: '0 10px 25px rgba(0,0,0,0.5)', border: '1px solid #334155' }}>
          <h1 style={{ marginBottom: '15px', color: '#38bdf8', fontSize: '22px' }}>{tournamentName} 🏆</h1>
          
          <div style={{ marginBottom: '20px', textAlign: 'right' }}>
            <label style={{ fontSize: '13px', fontWeight: 'bold', color: '#34d399', display: 'block', marginBottom: '5px' }}>🔐 دخول المشرف (Admin)</label>
            <form onSubmit={handleAdminLogin} style={{ display: 'flex', gap: '8px' }}>
              <input 
                type="password" 
                placeholder="كلمة مرور المشرف..." 
                value={adminInput}
                onChange={(e) => setAdminInput(e.target.value)}
                style={{ flex: 1, padding: '10px', borderRadius: '8px', background: '#0f172a', border: '1px solid #334155', color: '#fff', fontSize: '14px' }}
              />
              <button type="submit" style={{ background: '#0284c7', border: 'none', padding: '10px 15px', borderRadius: '8px', color: '#fff', fontWeight: 'bold', cursor: 'pointer' }}>دخول</button>
            </form>
          </div>

          <div style={{ textAlign: 'right' }}>
            <label style={{ fontSize: '13px', fontWeight: 'bold', color: '#38bdf8', display: 'block', marginBottom: '5px' }}>👁️ دخول المشاهد (Viewer)</label>
            <form onSubmit={handleViewerLogin} style={{ display: 'flex', gap: '8px' }}>
              <input 
                type="password" 
                placeholder="كلمة مرور المشاهد..." 
                value={viewerInput}
                onChange={(e) => setViewerInput(e.target.value)}
                style={{ flex: 1, padding: '10px', borderRadius: '8px', background: '#0f172a', border: '1px solid #334155', color: '#fff', fontSize: '14px' }}
              />
              <button type="submit" style={{ background: '#334155', border: 'none', padding: '10px 15px', borderRadius: '8px', color: '#fff', fontWeight: 'bold', cursor: 'pointer' }}>دخول</button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  const groupNames = ['GROUPE A', 'GROUPE B', 'GROUPE C', 'GROUPE D'];

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#0b0f19', color: '#fff', fontFamily: 'Cairo, sans-serif', paddingBottom: '40px' }}>
      
      <div style={{ backgroundColor: '#1e293b', color: '#fff', padding: '15px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #334155' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          {currentView !== 'menu' && (
            <button 
              onClick={() => setCurrentView('menu')}
              style={{ background: 'transparent', border: 'none', color: '#38bdf8', fontSize: '22px', cursor: 'pointer', fontWeight: 'bold' }}
            >
              ❮
            </button>
          )}
          <h1 style={{ fontSize: '18px', fontWeight: 'bold', margin: 0, color: '#38bdf8' }}>{tournamentName}</h1>
        </div>
        <button 
          onClick={() => setRole(null)}
          style={{ background: '#ef4444', border: 'none', padding: '6px 12px', borderRadius: '6px', color: '#fff', fontSize: '12px', cursor: 'pointer', fontWeight: 'bold' }}
        >
          خروج
        </button>
      </div>

      {currentView === 'menu' && (
        <div style={{ maxWidth: '600px', margin: '20px auto', padding: '0 15px' }}>
          
          <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#94a3b8', margin: '15px 0 10px 0', borderBottom: '1px solid #334155', paddingBottom: '5px' }}>
            Phase 1
          </div>

          <div 
            onClick={() => setCurrentView('infos')}
            style={{ background: '#1e293b', padding: '15px 20px', borderRadius: '10px', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '15px', cursor: 'pointer', border: '1px solid #334155' }}
          >
            <div style={{ background: '#0f172a', color: '#38bdf8', width: '40px', height: '40px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>🏆</div>
            <div>
              <div style={{ fontWeight: 'bold', fontSize: '14px' }}>INFOS SUR LE TOURNOI</div>
              <div style={{ fontSize: '12px', color: '#94a3b8' }}>إعدادات ونظام البطولة وكلمات المرور</div>
            </div>
          </div>

          {role === 'admin' && (
            <div 
              onClick={() => setCurrentView('participants')}
              style={{ background: '#1e293b', padding: '15px 20px', borderRadius: '10px', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '15px', cursor: 'pointer', border: '1px solid #334155' }}
            >
              <div style={{ background: '#0f172a', color: '#38bdf8', width: '40px', height: '40px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>👥</div>
              <div>
                <div style={{ fontWeight: 'bold', fontSize: '14px' }}>PARTICIPANTS</div>
                <div style={{ fontSize: '12px', color: '#94a3b8' }}>إضافة وتعديل الفرق وشعاراتها من الهاتف</div>
              </div>
            </div>
          )}

          {tournamentSystem !== 'knockout_only' && (
            <>
              <div 
                onClick={() => setCurrentView('phase1_points')}
                style={{ background: '#1e293b', padding: '15px 20px', borderRadius: '10px', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '15px', cursor: 'pointer', border: '1px solid #334155' }}
              >
                <div style={{ background: '#0f172a', color: '#38bdf8', width: '40px', height: '40px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: 'bold' }}>03</div>
                <div>
                  <div style={{ fontWeight: 'bold', fontSize: '14px' }}>POINTS (المباريات حسب الجولات)</div>
                  <div style={{ fontSize: '12px', color: '#94a3b8' }}>Journée 1, 2, 3 وتحديث النتائج أوتوماتيكياً</div>
                </div>
              </div>

              <div 
                onClick={() => setCurrentView('phase1_classement')}
                style={{ background: '#1e293b', padding: '15px 20px', borderRadius: '10px', marginBottom: '25px', display: 'flex', alignItems: 'center', gap: '15px', cursor: 'pointer', border: '1px solid #334155' }}
              >
                <div style={{ background: '#0f172a', color: '#38bdf8', width: '40px', height: '40px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px' }}>📊</div>
                <div>
                  <div style={{ fontWeight: 'bold', fontSize: '14px' }}>CLASSEMENT</div>
                  <div style={{ fontSize: '12px', color: '#94a3b8' }}>ترتيب المجموعات منفصلة بمعايير دقيقة</div>
                </div>
              </div>
            </>
          )}

          <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#94a3b8', margin: '20px 0 10px 0', borderBottom: '1px solid #334155', paddingBottom: '5px' }}>
            Phase 2 (الأدوار الإقصائية المنظمة)
          </div>

          <div 
            onClick={() => setCurrentView('phase2')}
            style={{ background: '#1e293b', padding: '15px 20px', borderRadius: '10px', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '15px', cursor: 'pointer', border: '1px solid #334155' }}
          >
            <div style={{ background: '#0f172a', color: '#38bdf8', width: '40px', height: '40px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: 'bold' }}>03</div>
            <div>
              <div style={{ fontWeight: 'bold', fontSize: '14px' }}>مسار البطولة (Quarts, Demis, Finale)</div>
              <div style={{ fontSize: '12px', color: '#94a3b8' }}>مباريات خروج المغلوب منظمة بعيدة عن المجموعات</div>
            </div>
          </div>

        </div>
      )}

      {currentView === 'infos' && (
        <div style={{ maxWidth: '600px', margin: '20px auto', padding: '0 15px' }}>
          <div style={{ background: '#1e293b', padding: '20px', borderRadius: '12px', border: '1px solid #334155' }}>
            <h2 style={{ fontSize: '16px', color: '#38bdf8', marginBottom: '15px' }}>إعدادات ونظام البطولة</h2>
            
            <div style={{ marginBottom: '15px' }}>
              <label style={{ fontSize: '13px', display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>اسم البطولة:</label>
              <input 
                type="text" 
                value={tournamentName} 
                onChange={(e) => setTournamentName(e.target.value)}
                disabled={role !== 'admin'}
                style={{ width: '100%', padding: '10px', borderRadius: '8px', background: '#0f172a', border: '1px solid #334155', color: '#fff' }}
              />
            </div>

            <div style={{ marginBottom: '15px' }}>
              <label style={{ fontSize: '13px', display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>اختر نظام البطولة:</label>
              <select 
                value={tournamentSystem}
                onChange={(e) => {
                  setTournamentSystem(e.target.value);
                  localStorage.setItem('tourney_sys', e.target.value);
                }}
                disabled={role !== 'admin'}
                style={{ width: '100%', padding: '10px', borderRadius: '8px', background: '#0f172a', border: '1px solid #334155', color: '#fff' }}
              >
                <option value="groups_knockout">دور المجموعات ثم أدوار إقصائية</option>
                <option value="league">دوري عادي (مجموعات فقط)</option>
                <option value="league_knockout">دوري ثم أدوار إقصائية</option>
                <option value="knockout_only">أدوار إقصائية فقط</option>
              </select>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ fontSize: '13px', display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>نظام المباريات:</label>
              <select 
                value={matchLegs}
                onChange={(e) => {
                  setMatchLegs(e.target.value);
                  localStorage.setItem('match_legs', e.target.value);
                }}
                disabled={role !== 'admin'}
                style={{ width: '100%', padding: '10px', borderRadius: '8px', background: '#0f172a', border: '1px solid #334155', color: '#fff' }}
              >
                <option value="single">مباراة واحدة (Match unique)</option>
                <option value="aller_retour">ذهاب وإياب (Aller-Retour)</option>
              </select>
            </div>

            {role === 'admin' && (
              <>
                <div style={{ borderTop: '1px solid #334155', paddingTop: '15px', marginTop: '15px' }}>
                  <h3 style={{ fontSize: '14px', marginBottom: '12px', color: '#34d399' }}>تغيير كلمات السر</h3>
                  <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
                    <input type="password" placeholder="مرور المشرف الجديد" value={newAdminPass} onChange={(e) => setNewAdminPass(e.target.value)} style={{ flex: 1, padding: '8px', borderRadius: '6px', background: '#0f172a', border: '1px solid #334155', color: '#fff' }} />
                    <button onClick={() => { localStorage.setItem('admin_pass', newAdminPass); setAdminPassword(newAdminPass); alert('تم تحديث كلمة سر المشرف'); }} style={{ background: '#0284c7', color: '#fff', border: 'none', padding: '8px 12px', borderRadius: '6px', fontWeight: 'bold' }}>حفظ</button>
                  </div>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <input type="password" placeholder="مرور المشاهد الجديد" value={newViewerPass} onChange={(e) => setNewViewerPass(e.target.value)} style={{ flex: 1, padding: '8px', borderRadius: '6px', background: '#0f172a', border: '1px solid #334155', color: '#fff' }} />
                    <button onClick={() => { localStorage.setItem('viewer_pass', newViewerPass); setViewerPassword(newViewerPass); alert('تم تحديث كلمة سر المشاهد'); }} style={{ background: '#64748b', color: '#fff', border: 'none', padding: '8px 12px', borderRadius: '6px', fontWeight: 'bold' }}>حفظ</button>
                  </div>
                </div>

                <div style={{ borderTop: '1px solid #334155', paddingTop: '20px', marginTop: '20px' }}>
                  <button onClick={handleResetTournament} style={{ width: '100%', background: '#ef4444', color: '#fff', border: 'none', padding: '12px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>
                    🗑️ مسح وإعادة تعيين البطولة بالكامل
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {currentView === 'participants' && role === 'admin' && (
        <div style={{ maxWidth: '600px', margin: '20px auto', padding: '0 15px' }}>
          <div style={{ background: '#1e293b', padding: '20px', borderRadius: '12px', border: '1px solid #334155' }}>
            <h2 style={{ fontSize: '16px', color: '#38bdf8', marginBottom: '15px' }}>إدارة المشاركين والشعارات</h2>
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
                <input type="text" placeholder="اسم الفريق..." value={newTeamName} onChange={(e) => setNewTeamName(e.target.value)} style={{ flex: 2, padding: '8px', borderRadius: '6px', background: '#0f172a', border: '1px solid #334155', color: '#fff' }} />
                <select value={newTeamGroup} onChange={(e) => setNewTeamGroup(e.target.value)} style={{ flex: 1, padding: '8px', borderRadius: '6px', background: '#0f172a', border: '1px solid #334155', color: '#fff' }}>
                  {groupNames.map(g => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: '12px', color: '#94a3b8', display: 'block', marginBottom: '5px' }}>اختر شعار الفريق من الهاتف:</label>
                <input type="file" accept="image/*" onChange={handleImageUpload} style={{ width: '100%', padding: '6px', borderRadius: '6px', background: '#0f172a', border: '1px solid #334155', color: '#fff' }} />
              </div>
              <button type="submit" style={{ background: '#0284c7', color: '#fff', border: 'none', padding: '10px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>إضافة الفريق</button>
            </form>
            <div>
              {teams.map(t => (
                <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px', borderBottom: '1px solid #334155', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <img src={t.logo || 'https://via.placeholder.com/40'} alt="" style={{ width: '30px', height: '30px', borderRadius: '50%', objectFit: 'cover', border: '1px solid #334155' }} />
                    <span style={{ fontWeight: 'bold' }}>{t.name} <span style={{ fontSize: '11px', color: '#94a3b8' }}>({t.group})</span></span>
                  </div>
                  <button onClick={async () => { await deleteDoc(doc(db, "teams", t.id)); fetchData(); }} style={{ background: '#ef4444', color: '#fff', border: 'none', padding: '4px 8px', borderRadius: '4px', fontSize: '12px', cursor: 'pointer' }}>حذف</button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {currentView === 'phase1_points' && (
        <div style={{ maxWidth: '600px', margin: '0 auto' }}>
          <div style={{ display: 'flex', background: '#1e293b', borderBottom: '1px solid #334155' }}>
            {['Journée 1', 'Journée 2', 'Journée 3'].map((j) => (
              <button 
                key={j}
                onClick={() => setPhase1Tab(j)}
                style={{ flex: 1, background: phase1Tab === j ? '#0284c7' : 'transparent', border: 'none', padding: '12px', color: '#fff', fontWeight: 'bold', cursor: 'pointer' }}
              >
                {j}
              </button>
            ))}
          </div>

          <div style={{ padding: '15px' }}>
            <div style={{ fontWeight: 'bold', fontSize: '15px', margin: '10px 0', color: '#38bdf8' }}>مباريات {phase1Tab}</div>
            
            {matches.length === 0 ? (
              <div style={{ background: '#1e293b', padding: '20px', borderRadius: '10px', textAlign: 'center', color: '#94a3b8' }}>
                لا توجد مباريات مضافة حالياً.
              </div>
            ) : (
              matches.map((match) => (
                <div key={match.id} style={{ background: '#1e293b', borderRadius: '10px', padding: '15px', marginBottom: '15px', border: '1px solid #334155', textAlign: 'center' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <span style={{ flex: 1, fontWeight: 'bold' }}>{match.home}</span>
                    <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
                      <input 
                        type="number" 
                        defaultValue={match.homeScore ?? ''} 
                        id={`h-${match.id}`} 
                        disabled={role !== 'admin'}
                        style={{ width: '40px', textAlign: 'center', padding: '5px', background: '#0f172a', color: '#fff', border: '1px solid #334155', borderRadius: '4px' }} 
                      />
                      <span>-</span>
                      <input 
                        type="number" 
                        defaultValue={match.awayScore ?? ''} 
                        id={`a-${match.id}`} 
                        disabled={role !== 'admin'}
                        style={{ width: '40px', textAlign: 'center', padding: '5px', background: '#0f172a', color: '#fff', border: '1px solid #334155', borderRadius: '4px' }} 
                      />
                      {role === 'admin' && (
                        <button 
                          onClick={() => {
                            const h = document.getElementById(`h-${match.id}`).value;
                            const a = document.getElementById(`a-${match.id}`).value;
                            handleUpdateScore(match, h, a);
                          }}
                          style={{ background: '#10b981', border: 'none', padding: '6px 10px', borderRadius: '4px', cursor: 'pointer', color: '#fff', fontWeight: 'bold', fontSize: '12px' }}
                        >
                          حفظ
                        </button>
                      )}
                    </div>
                    <span style={{ flex: 1, fontWeight: 'bold' }}>{match.away}</span>
                  </div>
                  <div style={{ fontSize: '11px', color: '#94a3b8' }}>{match.status || 'قيد الانتظار'}</div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {currentView === 'phase1_classement' && (
        <div style={{ maxWidth: '600px', margin: '20px auto', padding: '0 15px' }}>
          {groupNames.map(group => {
            const groupTeams = teams.filter(t => t.group === group);
            if (groupTeams.length === 0) return null;

            const sortedTeams = sortGroupTeams([...groupTeams]);

            return (
              <div key={group} style={{ background: '#1e293b', padding: '15px', borderRadius: '12px', marginBottom: '20px', border: '1px solid #334155' }}>
                <h3 style={{ fontSize: '15px', color: '#38bdf8', marginBottom: '10px', borderBottom: '1px solid #334155', paddingBottom: '5px' }}>{group}</h3>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ background: '#0f172a', textAlign: 'center' }}>
                      <th style={{ padding: '8px', textAlign: 'right' }}>الفريق</th>
                      <th>لعب</th>
                      <th>الفرق</th>
                      <th>نقاط</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedTeams.map(t => {
                      const goalDiff = (Number(t.gf) || 0) - (Number(t.ga) || 0);
                      const diffColor = goalDiff > 0 ? '#4ade80' : goalDiff < 0 ? '#f87171' : '#fff';
                      return (
                        <tr key={t.id} style={{ textAlign: 'center', borderBottom: '1px solid #334155' }}>
                          <td style={{ padding: '8px', textAlign: 'right', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <img src={t.logo || 'https://via.placeholder.com/40'} alt="" style={{ width: '22px', height: '22px', borderRadius: '50%', objectFit: 'cover' }} />
                            {t.name}
                          </td>
                          <td>{t.p || 0}</td>
                          <td style={{ color: diffColor }}>
                            {goalDiff > 0 ? '+' + goalDiff : goalDiff}
                          </td>
                          <td style={{ fontWeight: 'bold', color: '#38bdf8' }}>{t.pts || 0}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            );
          })}
        </div>
      )}

      {currentView === 'phase2' && (
        <div style={{ maxWidth: '600px', margin: '0 auto' }}>
          <div style={{ display: 'flex', background: '#1e293b', borderBottom: '1px solid #334155' }}>
            {['Quarts de finale', 'Demi-finales', 'Finale'].map((tab) => (
              <button 
                key={tab}
                onClick={() => setPhase2Tab(tab)}
                style={{ flex: 1, background: phase2Tab === tab ? '#0284c7' : 'transparent', border: 'none', padding: '12px 5px', color: '#fff', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' }}
              >
                {tab}
              </button>
            ))}
          </div>

          <div style={{ padding: '15px' }}>
            {phase2Tab === 'Quarts de finale' && (
              <>
                {[
                  { home: 'البرازيل (متصدر أ)', away: 'بلجيكا (وصيف ب)' },
                  { home: 'المغرب (متصدر ب)', away: 'النرويج (ثالث أفضل)' },
                  { home: 'الأوروغواي (متصدر ج)', away: 'البرتغال (وصيف أ)' },
                  { home: 'الأرجنتين (متصدر د)', away: 'اسبانيا (وصيف ج)' }
                ].map((m, idx) => (
                  <div key={idx} style={{ background: '#1e293b', borderRadius: '10px', padding: '15px', marginBottom: '12px', border: '1px solid #334155', textAlign: 'center' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <span style={{ flex: 1, fontWeight: 'bold' }}>{m.home}</span>
                      <div style={{ padding: '5px 15px', background: '#0f172a', borderRadius: '6px', fontWeight: 'bold', color: '#38bdf8' }}>- : -</div>
                      <span style={{ flex: 1, fontWeight: 'bold' }}>{m.away}</span>
                    </div>
                    <div style={{ fontSize: '11px', color: '#34d399' }}>✨ دور ربع النهائي منظم ومنفصل عن المجموعات</div>
                  </div>
                ))}
              </>
            )}

            {phase2Tab === 'Demi-finales' && (
              <>
                {[
                  { homeMatch: 'الفائز من ربع 1', awayMatch: 'الفائز من ربع 2' },
                  { homeMatch: 'الفائز من ربع 3', awayMatch: 'الفائز من ربع 4' }
                ].map((m, idx) => (
                  <div key={idx} style={{ background: '#1e293b', borderRadius: '10px', padding: '15px', marginBottom: '12px', border: '1px solid #334155', textAlign: 'center' }}>
                    <div style={{ fontSize: '11px', color: '#38bdf8', marginBottom: '5px', fontWeight: 'bold' }}>Vainqueur de / Vainqueur de</div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <span style={{ flex: 1, fontSize: '13px', fontWeight: 'bold' }}>{m.homeMatch}</span>
                      <div style={{ padding: '5px 15px', background: '#0f172a', borderRadius: '6px', fontWeight: 'bold', color: '#38bdf8' }}>- : -</div>
                      <span style={{ flex: 1, fontSize: '13px', fontWeight: 'bold' }}>{m.awayMatch}</span>
                    </div>
                  </div>
                ))}
              </>
            )}

            {phase2Tab === 'Finale' && (
              <div style={{ background: '#1e293b', borderRadius: '10px', padding: '20px', textAlign: 'center', border: '1px solid #334155' }}>
                <div style={{ fontSize: '12px', color: '#38bdf8', marginBottom: '10px', fontWeight: 'bold' }}>المباراة النهائية الكبرى</div>
                <div style={{ fontSize: '15px', fontWeight: 'bold', marginBottom: '15px' }}>متأهل النصف 1 VS متأهل النصف 2</div>
                <div style={{ padding: '10px 20px', background: '#0f172a', borderRadius: '6px', display: 'inline-block', fontWeight: 'bold', color: '#38bdf8' }}>- : -</div>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}