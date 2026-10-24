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
  const [passwordInput, setPasswordInput] = useState('');
  
  const [adminPassword, setAdminPassword] = useState(() => localStorage.getItem('admin_pass') || 'admin123');
  const [newAdminPass, setNewAdminPass] = useState('');

  const [teams, setTeams] = useState([]);
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);

  const [newTeamName, setNewTeamName] = useState('');
  const [newTeamGroup, setNewTeamGroup] = useState('المجموعة أ');

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

  const handleLogin = (selectedRole) => {
    if (selectedRole === 'admin') {
      if (passwordInput === adminPassword) {
        setRole('admin');
      } else {
        alert('كلمة مرور المشرف غير صحيحة!');
      }
    } else if (selectedRole === 'viewer') {
      setRole('viewer');
    }
    setPasswordInput('');
  };

  const handleChangePassword = (e) => {
    e.preventDefault();
    if (!newAdminPass.trim()) {
      alert('المرجو إدخال كلمة المرور الجديدة!');
      return;
    }
    localStorage.setItem('admin_pass', newAdminPass);
    setAdminPassword(newAdminPass);
    setNewAdminPass('');
    alert('تم تحديث كلمة المرور بنجاح! 🔑');
  };

  const handleAddTeam = async (e) => {
    e.preventDefault();
    if (!newTeamName.trim()) return;

    try {
      await addDoc(collection(db, "teams"), {
        name: newTeamName,
        group: newTeamGroup,
        p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, pts: 0
      });
      setNewTeamName('');
      fetchData();
    } catch (error) {
      console.error("خطأ في إضافة الفريق:", error);
    }
  };

  const handleDeleteTeam = async (id) => {
    if (window.confirm("هل أنت متأكد من حذف هذا الفريق؟")) {
      try {
        await deleteDoc(doc(db, "teams", id));
        fetchData();
      } catch (error) {
        console.error("خطأ في الحذف:", error);
      }
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

      const homeTeamObj = teams.find(t => t.id === match.homeId || t.name?.trim() === match.home?.trim());
      const awayTeamObj = teams.find(t => t.id === match.awayId || t.name?.trim() === match.away?.trim());

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
      alert("تم تسجيل النتيجة وتحديث الترتيب أوتوماتيكياً! 🏆");
    } catch (error) {
      console.error("خطأ في تحديث النتيجة:", error);
    }
  };

  if (loading) {
    return <div style={{ color: '#fff', textAlign: 'center', marginTop: '50px' }}>جاري تحميل البيانات...</div>;
  }

  if (!role) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#0b0f19', color: '#fff', fontFamily: 'Cairo, sans-serif' }}>
        <div style={{ background: '#1e293b', padding: '30px', borderRadius: '12px', width: '350px', textAlign: 'center', border: '1px solid #334155' }}>
          <h1 style={{ marginBottom: '20px', color: '#38bdf8' }}>FootPro ⚽</h1>
          <input 
            type="password" 
            placeholder="أدخل كلمة المرور..." 
            value={passwordInput}
            onChange={(e) => setPasswordInput(e.target.value)}
            style={{ width: '100%', padding: '10px', marginBottom: '15px', borderRadius: '6px', background: '#0f172a', border: '1px solid #334155', color: '#fff', textAlign: 'center' }}
          />
          <div style={{ display: 'flex', gap: '10px' }}>
            <button 
              onClick={() => handleLogin('admin')}
              style={{ flex: 1, background: '#0284c7', border: 'none', padding: '10px', borderRadius: '6px', color: '#fff', fontWeight: 'bold', cursor: 'pointer' }}
            >
              دخول مشرف (Admin)
            </button>
            <button 
              onClick={() => handleLogin('viewer')}
              style={{ flex: 1, background: '#334155', border: 'none', padding: '10px', borderRadius: '6px', color: '#fff', fontWeight: 'bold', cursor: 'pointer' }}
            >
              دخول مشاهد (Viewer)
            </button>
          </div>
        </div>
      </div>
    );
  }

  const groupNames = ['المجموعة أ', 'المجموعة ب', 'المجموعة ج', 'المجموعة د'];
  const knockoutMatches = matches.filter(m => m.stage && m.stage !== 'مجموعات');

  return (
    <div style={{ padding: '20px', color: '#fff', backgroundColor: '#0b0f19', minHeight: '100vh', fontFamily: 'Cairo, sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <h1 style={{ fontSize: '24px' }}>إدارة بطولات كرة القدم - FootPro ⚽ ({role === 'admin' ? 'مشرف' : 'مشاهد'})</h1>
        <button 
          onClick={() => setRole(null)}
          style={{ background: '#ef4444', border: 'none', padding: '8px 15px', borderRadius: '6px', color: '#fff', cursor: 'pointer' }}
        >
          تسجيل الخروج
        </button>
      </div>

      <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
        
        {/* لوحة تحكم المشرف: زر تغيير كلمة المرور أولاً بوضوح تام */}
        {role === 'admin' && (
          <>
            <div style={{ background: '#1e293b', padding: '20px', borderRadius: '12px', marginBottom: '20px', border: '2px solid #10b981' }}>
              <h2 style={{ fontSize: '16px', marginBottom: '15px', color: '#34d399' }}>🔑 تغيير كلمة مرور المشرف</h2>
              <form onSubmit={handleChangePassword} style={{ display: 'flex', gap: '10px' }}>
                <input 
                  type="password" 
                  placeholder="أدخل كلمة المرور الجديدة..." 
                  value={newAdminPass}
                  onChange={(e) => setNewAdminPass(e.target.value)}
                  style={{ flex: 2, padding: '10px', borderRadius: '6px', background: '#0f172a', border: '1px solid #334155', color: '#fff' }}
                />
                <button type="submit" style={{ background: '#10b981', border: 'none', padding: '10px 20px', borderRadius: '6px', color: '#fff', fontWeight: 'bold', cursor: 'pointer' }}>تحديث كلمة المرور</button>
              </form>
            </div>

            <div style={{ background: '#1e293b', padding: '20px', borderRadius: '12px', marginBottom: '30px', border: '1px solid #334155' }}>
              <h2 style={{ fontSize: '16px', marginBottom: '15px', color: '#38bdf8' }}>➕ إضافة فريق جديد للمجموعات</h2>
              <form onSubmit={handleAddTeam} style={{ display: 'flex', gap: '10px' }}>
                <input 
                  type="text" 
                  placeholder="اسم الفريق..." 
                  value={newTeamName}
                  onChange={(e) => setNewTeamName(e.target.value)}
                  style={{ flex: 2, padding: '10px', borderRadius: '6px', background: '#0f172a', border: '1px solid #334155', color: '#fff' }}
                />
                <select 
                  value={newTeamGroup}
                  onChange={(e) => setNewTeamGroup(e.target.value)}
                  style={{ flex: 1, padding: '10px', borderRadius: '6px', background: '#0f172a', border: '1px solid #334155', color: '#fff' }}
                >
                  {groupNames.map(g => <option key={g} value={g}>{g}</option>)}
                </select>
                <button type="submit" style={{ background: '#06b6d4', border: 'none', padding: '10px 20px', borderRadius: '6px', color: '#fff', fontWeight: 'bold', cursor: 'pointer' }}>إضافة</button>
              </form>
            </div>
          </>
        )}

        {/* مسار الأدوار الإقصائية المرئية */}
        <div style={{ background: '#1e293b', padding: '20px', borderRadius: '12px', marginBottom: '40px', border: '1px solid #334155' }}>
          <h2 style={{ textAlign: 'center', color: '#38bdf8', marginBottom: '20px' }}>🌟 مسار الأدوار الإقصائية (Path to Final)</h2>
          {knockoutMatches.length === 0 ? (
            <p style={{ textAlign: 'center', color: '#94a3b8' }}>لا توجد مباريات إقصائية مبرمجة حالياً.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              {knockoutMatches.map((km) => (
                <div key={km.id} style={{ background: '#0f172a', padding: '15px', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid #334155' }}>
                  <span style={{ fontSize: '12px', background: '#0284c7', padding: '3px 8px', borderRadius: '4px' }}>{km.stage}</span>
                  <span style={{ width: '25%', textAlign: 'right', fontWeight: 'bold' }}>{km.home}</span>
                  <div style={{ background: '#1e293b', padding: '5px 15px', borderRadius: '6px', fontWeight: 'bold', color: '#38bdf8' }}>
                    {km.homeScore ?? '-'} : {km.awayScore ?? '-'}
                  </div>
                  <span style={{ width: '25%', textAlign: 'left', fontWeight: 'bold' }}>{km.away}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* جداول دور المجموعات منفصلة */}
        <h2 style={{ marginBottom: '20px' }}>🏆 جداول ترتيب دور المجموعات</h2>
        {groupNames.map((group) => {
          const groupTeams = teams.filter(t => t.group === group);
          if (groupTeams.length === 0) return null;

          return (
            <div key={group} style={{ marginBottom: '30px', background: '#1e293b', borderRadius: '12px', padding: '15px', border: '1px solid #334155' }}>
              <h3 style={{ color: '#38bdf8', marginBottom: '10px' }}>{group}</h3>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#334155', textAlign: 'center', fontSize: '14px' }}>
                    <th style={{ padding: '8px', textAlign: 'right' }}>الفريق</th>
                    <th>لعب</th>
                    <th>فاز</th>
                    <th>تعادل</th>
                    <th>خسر</th>
                    <th>له</th>
                    <th>عليه</th>
                    <th>الفرق</th>
                    <th>النقاط</th>
                    {role === 'admin' && <th>إجراءات</th>}
                  </tr>
                </thead>
                <tbody>
                  {groupTeams.sort((a, b) => {
                    const ptsA = Number(a.pts) || 0;
                    const ptsB = Number(b.pts) || 0;
                    if (ptsB !== ptsA) return ptsB - ptsA;

                    const gdA = (Number(a.gf) || 0) - (Number(a.ga) || 0);
                    const gdB = (Number(b.gf) || 0) - (Number(b.ga) || 0);
                    if (gdB !== gdA) return gdB - gdA;

                    return (Number(b.gf) || 0) - (Number(a.gf) || 0);
                  }).map((team) => {
                    const goalDiff = (Number(team.gf) || 0) - (Number(team.ga) || 0);
                    return (
                      <tr key={team.id} style={{ textAlign: 'center', borderBottom: '1px solid #334155' }}>
                        <td style={{ padding: '8px', textAlign: 'right', fontWeight: 'bold' }}>{team.name}</td>
                        <td>{team.p || 0}</td>
                        <td>{team.w || 0}</td>
                        <td>{team.d || 0}</td>
                        <td>{team.l || 0}</td>
                        <td>{team.gf || 0}</td>
                        <td>{team.ga || 0}</td>
                        <td style={{ color: goalDiff > 0 ? '#4ade80' : goalDiff < 0 ? '#f87171' : '#fff' }}>
                          {goalDiff > 0 ? `+${goalDiff}` : goalDiff}
                        </td>
                        <td style={{ fontWeight: 'bold', color: '#38bdf8' }}>{team.pts || 0}</td>
                        {role === 'admin' && (
                          <td>
                            <button onClick={() => handleDeleteTeam(team.id)} style={{ background: '#ef4444', border: 'none', padding: '3px 8px', borderRadius: '4px', color: '#fff', cursor: 'pointer', fontSize: '11px' }}>حذف</button>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          );
        })}

        {/* قسم المباريات */}
        <h2 style={{ marginTop: '40px', marginBottom: '15px' }}>⚽ المباريات والنتائج</h2>
        {matches.map((match) => (
          <div key={match.id} style={{ background: '#1e293b', padding: '15px', marginBottom: '10px', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid #334155' }}>
            <span style={{ width: '30%', textAlign: 'right', fontWeight: 'bold' }}>{match.home}</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <input 
                type="number" 
                defaultValue={match.homeScore ?? ''} 
                id={`h-${match.id}`} 
                disabled={role !== 'admin'}
                style={{ width: '45px', textAlign: 'center', padding: '5px', background: '#0f172a', color: '#fff', border: '1px solid #334155', borderRadius: '4px' }} 
              />
              <span>-</span>
              <input 
                type="number" 
                defaultValue={match.awayScore ?? ''} 
                id={`a-${match.id}`} 
                disabled={role !== 'admin'}
                style={{ width: '45px', textAlign: 'center', padding: '5px', background: '#0f172a', color: '#fff', border: '1px solid #334155', borderRadius: '4px' }} 
              />
              {role === 'admin' && (
                <button 
                  onClick={() => {
                    const h = document.getElementById(`h-${match.id}`).value;
                    const a = document.getElementById(`a-${match.id}`).value;
                    handleUpdateScore(match, h, a);
                  }}
                  style={{ background: '#06b6d4', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', color: '#fff', fontWeight: 'bold' }}
                >
                  حفظ
                </button>
              )}
            </div>
            <span style={{ width: '30%', textAlign: 'left', fontWeight: 'bold' }}>{match.away}</span>
          </div>
        ))}
      </div>
    </div>
  );
}