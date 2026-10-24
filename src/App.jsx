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
  const [knockoutMatches, setKnockoutMatches] = useState([]);
  const [loading, setLoading] = useState(true);

  const [newTeamName, setNewTeamName] = useState('');
  const [newTeamGroup, setNewTeamGroup] = useState('المجموعة أ');
  const [newTeamLogo, setNewTeamLogo] = useState('');

  const [homeTeam, setHomeTeam] = useState('');
  const [awayTeam, setAwayTeam] = useState('');

  const [editingTeamId, setEditingTeamId] = useState(null);
  const [editName, setEditName] = useState('');
  const [editGroup, setEditGroup] = useState('');
  const [editPts, setEditPts] = useState(0);
  const [editP, setEditP] = useState(0);
  const [editGf, setEditGf] = useState(0);
  const [editGa, setEditGa] = useState(0);

  const fetchData = async () => {
    try {
      const teamsSnapshot = await getDocs(collection(db, "teams"));
      const teamsList = teamsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setTeams(teamsList);

      const matchesSnapshot = await getDocs(collection(db, "matches"));
      const matchesList = matchesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setMatches(matchesList);

      const koSnapshot = await getDocs(collection(db, "knockout_matches"));
      const koList = koSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setKnockoutMatches(koList);
      
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

  const handleAddMatch = async (e) => {
    e.preventDefault();
    if (!homeTeam || !awayTeam || homeTeam === awayTeam) {
      alert("المرجو اختيار فريقين مختلفين للمباراة!");
      return;
    }

    try {
      await addDoc(collection(db, "matches"), {
        home: homeTeam,
        away: awayTeam,
        journee: phase1Tab,
        homeScore: null,
        awayScore: null,
        status: 'قيد الانتظار'
      });
      setHomeTeam('');
      setAwayTeam('');
      fetchData();
      alert("تمت إضافة المباراة بنجاح إلى الجولة!");
    } catch (err) {
      console.error("خطأ في إضافة المباراة:", err);
    }
  };

  const handleDeleteMatch = async (matchId) => {
    if (window.confirm("⚠️ هل أنت متأكد من حذف هذه المباراة؟")) {
      try {
        await deleteDoc(doc(db, "matches", matchId));
        await recalculateAllStats();
        fetchData();
        alert("تم حذف المباراة بنجاح وتحديث الترتيب!");
      } catch (err) {
        console.error("خطأ في حذف المباراة:", err);
      }
    }
  };

  const recalculateAllStats = async () => {
    try {
      const teamsSnapshot = await getDocs(collection(db, "teams"));
      const allTeams = teamsSnapshot.docs.map(d => ({ id: d.id, ...d.data() }));

      const matchesSnapshot = await getDocs(collection(db, "matches"));
      const allMatches = matchesSnapshot.docs.map(d => ({ id: d.id, ...d.data() }));

      const batch = writeBatch(db);
      const statsMap = {};

      allTeams.forEach(t => {
        statsMap[t.name.trim()] = {
          id: t.id,
          p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, pts: 0
        };
      });

      allMatches.forEach(m => {
        if (m.status === 'انتهت' && m.homeScore !== null && m.awayScore !== null && m.homeScore !== undefined && m.awayScore !== undefined) {
          const hName = m.home?.trim();
          const aName = m.away?.trim();
          const hS = Number(m.homeScore);
          const aS = Number(m.awayScore);

          if (statsMap[hName]) {
            statsMap[hName].p += 1;
            statsMap[hName].gf += hS;
            statsMap[hName].ga += aS;
            if (hS > aS) { statsMap[hName].w += 1; statsMap[hName].pts += 3; }
            else if (hS === aS) { statsMap[hName].d += 1; statsMap[hName].pts += 1; }
            else { statsMap[hName].l += 1; }
          }

          if (statsMap[aName]) {
            statsMap[aName].p += 1;
            statsMap[aName].gf += aS;
            statsMap[aName].ga += hS;
            if (aS > hS) { statsMap[aName].w += 1; statsMap[aName].pts += 3; }
            else if (aS === hS) { statsMap[aName].d += 1; statsMap[aName].pts += 1; }
            else { statsMap[aName].l += 1; }
          }
        }
      });

      for (const tName in statsMap) {
        const s = statsMap[tName];
        const tRef = doc(db, "teams", s.id);
        batch.update(tRef, {
          p: s.p, w: s.w, d: s.d, l: s.l, gf: s.gf, ga: s.ga, pts: s.pts
        });
      }

      await batch.commit();
    } catch (e) {
      console.error("خطأ في إعادة الحساب:", e);
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

      await recalculateAllStats();
      await fetchData();
      alert("تم تعديل وحفظ النتيجة وتحديث الترتيب أوتوماتيكياً بنجاح! 🏆");
    } catch (error) {
      console.error("خطأ في تحديث النتيجة:", error);
    }
  };

  const startEditingTeam = (team) => {
    setEditingTeamId(team.id);
    setEditName(team.name || '');
    setEditGroup(team.group || 'المجموعة أ');
    setEditPts(team.pts || 0);
    setEditP(team.p || 0);
    setEditGf(team.gf || 0);
    setEditGa(team.ga || 0);
  };

  const saveTeamChanges = async (id) => {
    try {
      const teamRef = doc(db, "teams", id);
      await updateDoc(teamRef, {
        name: editName,
        group: editGroup,
        pts: Number(editPts),
        p: Number(editP),
        gf: Number(editGf),
        ga: Number(editGa)
      });
      setEditingTeamId(null);
      fetchData();
      alert('تم تحديث بيانات الفريق بنجاح!');
    } catch (error) {
      console.error("خطأ في تحديث الفريق:", error);
    }
  };

  // توليد ربع النهائي أوتوماتيكياً مع حساب أفضل الثوالث عند الحاجة
  const generateKnockoutStage = async () => {
    try {
      const activeGroups = [...new Set(teams.map(t => t.group))].filter(Boolean);
      if (activeGroups.length === 0) {
        alert("لا توجد فرق مسجلة لتوليد الأدوار الإقصائية!");
        return;
      }

      const groupStandings = {};
      activeGroups.forEach(g => {
        const gTeams = teams.filter(t => t.group === g);
        groupStandings[g] = sortGroupTeams([...gTeams]);
      });

      let qualifiedTeams = [];

      // أخذ المتصدر والوصيف من كل مجموعة
      activeGroups.forEach(g => {
        const sorted = groupStandings[g];
        if (sorted[0]) qualifiedTeams.push({ team: sorted[0].name, group: g, rank: 1 });
        if (sorted[1]) qualifiedTeams.push({ team: sorted[1].name, group: g, rank: 2 });
      });

      // إذا كانت البطولة بـ 3 مجموعات (6 فرق متأهلة)، نضيف أفضل 2 ثوالث لتكتمل 8 فرق لربع النهائي
      if (qualifiedTeams.length < 8) {
        let thirdPlaces = [];
        activeGroups.forEach(g => {
          const sorted = groupStandings[g];
          if (sorted[2]) {
            thirdPlaces.push({
              team: sorted[2].name,
              group: g,
              rank: 3,
              pts: Number(sorted[2].pts) || 0,
              gd: (Number(sorted[2].gf) || 0) - (Number(sorted[2].ga) || 0),
              gf: Number(sorted[2].gf) || 0
            });
          }
        });

        // ترتيب أفضل الثوالث حسب النقاط ثم فارق الأهداف ثم الأهداف له
        thirdPlaces.sort((a, b) => {
          if (b.pts !== a.pts) return b.pts - a.pts;
          if (b.gd !== a.gd) return b.gd - a.gd;
          return b.gf - a.gf;
        });

        const needed = 8 - qualifiedTeams.length;
        for (let i = 0; i < needed && i < thirdPlaces.length; i++) {
          qualifiedTeams.push(thirdPlaces[i]);
        }
      }

      if (qualifiedTeams.length < 4) {
        alert("عدد الفرق المتأهلة غير كافٍ!");
        return;
      }

      const defaultQuarts = [
        { id: 'q1', phase: 'Quarts de finale', index: 0, home: qualifiedTeams[0]?.team || '', away: qualifiedTeams[7]?.team || qualifiedTeams[3]?.team || '', homeScore: null, awayScore: null },
        { id: 'q2', phase: 'Quarts de finale', index: 1, home: qualifiedTeams[1]?.team || '', away: qualifiedTeams[6]?.team || qualifiedTeams[2]?.team || '', homeScore: null, awayScore: null },
        { id: 'q3', phase: 'Quarts de finale', index: 2, home: qualifiedTeams[2]?.team || '', away: qualifiedTeams[5]?.team || qualifiedTeams[1]?.team || '', homeScore: null, awayScore: null },
        { id: 'q4', phase: 'Quarts de finale', index: 3, home: qualifiedTeams[3]?.team || '', away: qualifiedTeams[4]?.team || qualifiedTeams[0]?.team || '', homeScore: null, awayScore: null }
      ];

      const batch = writeBatch(db);
      for (const q of defaultQuarts) {
        const ref = doc(db, "knockout_matches", q.id);
        batch.set(ref, q);
      }
      await batch.commit();
      await fetchData();
      alert("✨ تم توليد مباريات ربع النهائي أوتوماتيكياً بنجاح (مع احتساب أفضل الثوالث تلقائياً)! يمكنك تعديل أي فريق يدوياً.");
    } catch (err) {
      console.error("خطأ في التوليد:", err);
    }
  };

  const updateKnockoutTeam = async (matchId, field, value) => {
    try {
      const ref = doc(db, "knockout_matches", matchId);
      await updateDoc(ref, { [field]: value });
      fetchData();
    } catch (err) {
      console.error("خطأ في تحديث الفريق الإقصائي:", err);
    }
  };

  const handleResetTournament = async () => {
    if (window.confirm("⚠️ هل أنت متأكد من مسح جميع بيانات هذه البطولة نهائياً؟")) {
      try {
        const batch = writeBatch(db);
        teams.forEach(t => batch.delete(doc(db, "teams", t.id)));
        matches.forEach(m => batch.delete(doc(db, "matches", m.id)));
        knockoutMatches.forEach(k => batch.delete(doc(db, "knockout_matches", k.id)));
        await batch.commit();
        localStorage.clear();
        setTeams([]);
        setMatches([]);
        setKnockoutMatches([]);
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

  const groupNames = ['المجموعة أ', 'المجموعة ب', 'المجموعة ج', 'المجموعة د'];

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
          
          {role === 'admin' && (
            <>
              <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#94a3b8', margin: '15px 0 10px 0', borderBottom: '1px solid #334155', paddingBottom: '5px' }}>
                لوحة تحكم المشرف (Admin Controls)
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

              <div 
                onClick={() => setCurrentView('participants')}
                style={{ background: '#1e293b', padding: '15px 20px', borderRadius: '10px', marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '15px', cursor: 'pointer', border: '1px solid #334155' }}
              >
                <div style={{ background: '#0f172a', color: '#38bdf8', width: '40px', height: '40px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>👥</div>
                <div>
                  <div style={{ fontWeight: 'bold', fontSize: '14px' }}>PARTICIPANTS</div>
                  <div style={{ fontSize: '12px', color: '#94a3b8' }}>إضافة وتعديل الفرق وشعاراتها من الهاتف</div>
                </div>
              </div>
            </>
          )}

          <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#94a3b8', margin: '15px 0 10px 0', borderBottom: '1px solid #334155', paddingBottom: '5px' }}>
            Phase 1 (دور المجموعات والجولات)
          </div>

          {tournamentSystem !== 'knockout_only' && (
            <>
              <div 
                onClick={() => setCurrentView('phase1_points')}
                style={{ background: '#1e293b', padding: '15px 20px', borderRadius: '10px', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '15px', cursor: 'pointer', border: '1px solid #334155' }}
              >
                <div style={{ background: '#0f172a', color: '#38bdf8', width: '40px', height: '40px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: 'bold' }}>03</div>
                <div>
                  <div style={{ fontWeight: 'bold', fontSize: '14px' }}>POINTS (المباريات والتعديل)</div>
                  <div style={{ fontSize: '12px', color: '#94a3b8' }}>تعديل، حذف، وبرمجة مباريات الجولات</div>
                </div>
              </div>

              <div 
                onClick={() => setCurrentView('phase1_classement')}
                style={{ background: '#1e293b', padding: '15px 20px', borderRadius: '10px', marginBottom: '25px', display: 'flex', alignItems: 'center', gap: '15px', cursor: 'pointer', border: '1px solid #334155' }}
              >
                <div style={{ background: '#0f172a', color: '#38bdf8', width: '40px', height: '40px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px' }}>📊</div>
                <div>
                  <div style={{ fontWeight: 'bold', fontSize: '14px' }}>CLASSEMENT</div>
                  <div style={{ fontSize: '12px', color: '#94a3b8' }}>ترتيب المجموعات وتعديل النقاط والأسماء</div>
                </div>
              </div>
            </>
          )}

          <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#94a3b8', margin: '20px 0 10px 0', borderBottom: '1px solid #334155', paddingBottom: '5px' }}>
            Phase 2 (الأدوار الإقصائية والقرعة)
          </div>

          <div 
            onClick={() => setCurrentView('phase2')}
            style={{ background: '#1e293b', padding: '15px 20px', borderRadius: '10px', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '15px', cursor: 'pointer', border: '1px solid #334155' }}
          >
            <div style={{ background: '#0f172a', color: '#38bdf8', width: '40px', height: '40px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: 'bold' }}>03</div>
            <div>
              <div style={{ fontWeight: 'bold', fontSize: '14px' }}>مسار البطولة (Quarts, Demis, Finale)</div>
              <div style={{ fontSize: '12px', color: '#94a3b8' }}>توليد ربع النهائي أوتوماتيكياً (مع أفضل الثوالث) وتغيير الفرق يدوياً</div>
            </div>
          </div>

        </div>
      )}

      {currentView === 'infos' && role === 'admin' && (
        <div style={{ maxWidth: '600px', margin: '20px auto', padding: '0 15px' }}>
          <div style={{ background: '#1e293b', padding: '20px', borderRadius: '12px', border: '1px solid #334155' }}>
            <h2 style={{ fontSize: '16px', color: '#38bdf8', marginBottom: '15px' }}>إعدادات ونظام البطولة</h2>
            
            <div style={{ marginBottom: '15px' }}>
              <label style={{ fontSize: '13px', display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>اسم البطولة:</label>
              <input 
                type="text" 
                value={tournamentName} 
                onChange={(e) => setTournamentName(e.target.value)}
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
                style={{ width: '100%', padding: '10px', borderRadius: '8px', background: '#0f172a', border: '1px solid #334155', color: '#fff' }}
              >
                <option value="single">مباراة واحدة (Match unique)</option>
                <option value="aller_retour">ذهاب وإياب (Aller-Retour)</option>
              </select>
            </div>

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
                  <button onClick={async () => { await deleteDoc(doc(db, "teams", t.id)); await recalculateAllStats(); fetchData(); }} style={{ background: '#ef4444', color: '#fff', border: 'none', padding: '4px 8px', borderRadius: '4px', fontSize: '12px', cursor: 'pointer' }}>حذف</button>
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
            
            {role === 'admin' && (
              <form onSubmit={handleAddMatch} style={{ background: '#1e293b', padding: '15px', borderRadius: '10px', marginBottom: '20px', border: '1px solid #334155' }}>
                <h3 style={{ fontSize: '13px', color: '#34d399', marginBottom: '10px' }}>➕ برمجة مباراة جديدة في {phase1Tab}</h3>
                <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
                  <select value={homeTeam} onChange={(e) => setHomeTeam(e.target.value)} style={{ flex: 1, padding: '8px', background: '#0f172a', color: '#fff', border: '1px solid #334155', borderRadius: '6px' }}>
                    <option value="">اختر الفريق المضيف</option>
                    {teams.map(t => <option key={t.id} value={t.name}>{t.name} ({t.group})</option>)}
                  </select>
                  <select value={awayTeam} onChange={(e) => setAwayTeam(e.target.value)} style={{ flex: 1, padding: '8px', background: '#0f172a', color: '#fff', border: '1px solid #334155', borderRadius: '6px' }}>
                    <option value="">اختر الفريق الضيف</option>
                    {teams.map(t => <option key={t.id} value={t.name}>{t.name} ({t.group})</option>)}
                  </select>
                </div>
                <button type="submit" style={{ width: '100%', background: '#0284c7', color: '#fff', border: 'none', padding: '8px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>إضافة المباراة للجولة</button>
              </form>
            )}

            {matches.filter(m => m.journee === phase1Tab).length === 0 ? (
              <div style={{ background: '#1e293b', padding: '20px', borderRadius: '10px', textAlign: 'center', color: '#94a3b8' }}>
                لا توجد مباريات مبرمجة في {phase1Tab} حالياً. قم برمجتها من أعلى.
              </div>
            ) : (
              matches.filter(m => m.journee === phase1Tab).map((match) => (
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
                        <>
                          <button 
                            onClick={() => {
                              const h = document.getElementById(`h-${match.id}`).value;
                              const a = document.getElementById(`a-${match.id}`).value;
                              handleUpdateScore(match, h, a);
                            }}
                            style={{ background: '#10b981', border: 'none', padding: '6px 10px', borderRadius: '4px', cursor: 'pointer', color: '#fff', fontWeight: 'bold', fontSize: '12px' }}
                          >
                            تعديل وحفظ
                          </button>
                          <button 
                            onClick={() => handleDeleteMatch(match.id)}
                            style={{ background: '#ef4444', border: 'none', padding: '6px 8px', borderRadius: '4px', cursor: 'pointer', color: '#fff', fontWeight: 'bold', fontSize: '12px' }}
                          >
                            حذف
                          </button>
                        </>
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
          {teams.length === 0 ? (
            <div style={{ background: '#1e293b', padding: '30px', borderRadius: '12px', textAlign: 'center', color: '#94a3b8', border: '1px solid #334155' }}>
              لا توجد فرق مسجلة في البطولة حالياً لعرض الترتيب. قم بإضافة الفرق أولاً من قسم المشاركين.
            </div>
          ) : (
            groupNames.map(group => {
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
                        {role === 'admin' && <th>تعديل</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {sortedTeams.map(t => {
                        const goalDiff = (Number(t.gf) || 0) - (Number(t.ga) || 0);
                        const diffColor = goalDiff > 0 ? '#4ade80' : goalDiff < 0 ? '#f87171' : '#fff';
                        const isEditing = editingTeamId === t.id;

                        return (
                          <tr key={t.id} style={{ textAlign: 'center', borderBottom: '1px solid #334155' }}>
                            <td style={{ padding: '8px', textAlign: 'right', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <img src={t.logo || 'https://via.placeholder.com/40'} alt="" style={{ width: '22px', height: '22px', borderRadius: '50%', objectFit: 'cover' }} />
                              {isEditing ? (
                                <input 
                                  type="text" 
                                  value={editName} 
                                  onChange={(e) => setEditName(e.target.value)} 
                                  style={{ width: '90px', background: '#0f172a', color: '#fff', border: '1px solid #38bdf8', padding: '2px' }} 
                                />
                              ) : t.name}
                            </td>
                            <td>
                              {isEditing ? (
                                <input 
                                  type="number" 
                                  value={editP} 
                                  onChange={(e) => setEditP(e.target.value)} 
                                  style={{ width: '35px', background: '#0f172a', color: '#fff', textAlign: 'center' }} 
                                />
                              ) : (t.p || 0)}
                            </td>
                            <td style={{ color: diffColor }}>
                              {goalDiff > 0 ? '+' + goalDiff : goalDiff}
                            </td>
                            <td style={{ fontWeight: 'bold', color: '#38bdf8' }}>
                              {isEditing ? (
                                <input 
                                  type="number" 
                                  value={editPts} 
                                  onChange={(e) => setEditPts(e.target.value)} 
                                  style={{ width: '40px', background: '#0f172a', color: '#fff', textAlign: 'center' }} 
                                />
                              ) : (t.pts || 0)}
                            </td>
                            {role === 'admin' && (
                              <td>
                                {isEditing ? (
                                  <div style={{ display: 'flex', gap: '4px', justifyContent: 'center' }}>
                                    <button onClick={() => saveTeamChanges(t.id)} style={{ background: '#10b981', color: '#fff', border: 'none', padding: '3px 6px', borderRadius: '4px', fontSize: '11px', cursor: 'pointer' }}>حفظ</button>
                                    <button onClick={() => setEditingTeamId(null)} style={{ background: '#64748b', color: '#fff', border: 'none', padding: '3px 6px', borderRadius: '4px', fontSize: '11px', cursor: 'pointer' }}>إلغاء</button>
                                  </div>
                                ) : (
                                  <button onClick={() => startEditingTeam(t)} style={{ background: '#0284c7', color: '#fff', border: 'none', padding: '3px 8px', borderRadius: '4px', fontSize: '11px', cursor: 'pointer' }}>تعديل</button>
                                )}
                              </td>
                            )}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              );
            })
          )}
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
                {role === 'admin' && (
                  <button 
                    onClick={generateKnockoutStage}
                    style={{ width: '100%', background: '#10b981', color: '#fff', border: 'none', padding: '12px', borderRadius: '8px', fontWeight: 'bold', marginBottom: '15px', cursor: 'pointer' }}
                  >
                    ⚡ توليد مباريات ربع النهائي أوتوماتيكياً (مع أفضل الثوالث)
                  </button>
                )}

                {knockoutMatches.filter(m => m.phase === 'Quarts de finale').length === 0 ? (
                  <div style={{ background: '#1e293b', padding: '20px', borderRadius: '10px', textAlign: 'center', color: '#94a3b8' }}>
                    لم يتم توليد مباريات ربع النهائي بعد. اضغط على الزر الأخضر أعلاه (للمشرف) لتوليدها وتوزيع الفرق أوتوماتيكياً.
                  </div>
                ) : (
                  knockoutMatches.filter(m => m.phase === 'Quarts de finale').map((m) => (
                    <div key={m.id} style={{ background: '#1e293b', borderRadius: '10px', padding: '15px', marginBottom: '12px', border: '1px solid #334155', textAlign: 'center' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        {role === 'admin' ? (
                          <select 
                            value={m.home} 
                            onChange={(e) => updateKnockoutTeam(m.id, 'home', e.target.value)}
                            style={{ flex: 1, padding: '5px', background: '#0f172a', color: '#fff', border: '1px solid #334155', borderRadius: '4px' }}
                          >
                            <option value="">اختر الفريق</option>
                            {teams.map(t => <option key={t.id} value={t.name}>{t.name}</option>)}
                          </select>
                        ) : (
                          <span style={{ flex: 1, fontWeight: 'bold' }}>{m.home || 'تحديد لاحقاً'}</span>
                        )}

                        <div style={{ padding: '5px 15px', background: '#0f172a', borderRadius: '6px', fontWeight: 'bold', color: '#38bdf8', margin: '0 8px' }}>- : -</div>

                        {role === 'admin' ? (
                          <select 
                            value={m.away} 
                            onChange={(e) => updateKnockoutTeam(m.id, 'away', e.target.value)}
                            style={{ flex: 1, padding: '5px', background: '#0f172a', color: '#fff', border: '1px solid #334155', borderRadius: '4px' }}
                          >
                            <option value="">اختر الفريق</option>
                            {teams.map(t => <option key={t.id} value={t.name}>{t.name}</option>)}
                          </select>
                        ) : (
                          <span style={{ flex: 1, fontWeight: 'bold' }}>{m.away || 'تحديد لاحقاً'}</span>
                        )}
                      </div>
                      <div style={{ fontSize: '11px', color: '#34d399' }}>✨ ربع نهائي منظم (يمكنك تعديل أي فريق يدوياً عبر القائمة)</div>
                    </div>
                  ))
                )}
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