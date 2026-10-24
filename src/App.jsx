import React, { useState, useEffect } from 'react';
import { 
  collection, 
  getDocs, 
  getDoc,
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc,
  setDoc,
  writeBatch
} from 'firebase/firestore';
import { db } from './firebase';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, errorInfo) {
    console.error("Caught error:", error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ background: '#0b0f19', color: '#f87171', padding: '40px', textAlign: 'center', fontFamily: 'Cairo', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#1e293b', padding: '30px', borderRadius: '12px', border: '1px solid #334155', maxWidth: '400px' }}>
            <h2 style={{ fontSize: '18px', marginBottom: '10px', color: '#f87171' }}>⚠️ تنبيه نظام الحماية</h2>
            <p style={{ color: '#94a3b8', fontSize: '13px', marginBottom: '20px' }}>تم رصد خطأ بسيط في الواجهة وتم منعه من إيقاف التطبيق.</p>
            <button 
              onClick={() => window.location.reload()} 
              style={{ background: '#0284c7', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px' }}
            >
              إعادة تحميل الصفحة 🔄
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

function MainApp() {
  const [role, setRole] = useState(null);
  
  const [adminPassword, setAdminPassword] = useState('admin123');
  const [viewerPassword, setViewerPassword] = useState('viewer123');
  
  const [adminInput, setAdminInput] = useState('');
  const [viewerInput, setViewerInput] = useState('');
  const [newAdminPass, setNewAdminPass] = useState('');
  const [newViewerPass, setNewViewerPass] = useState('');

  const [tournamentName, setTournamentName] = useState('PES AND ALSTOM');
  const [tournamentSystem, setTournamentSystem] = useState('groups_knockout'); 
  const [matchLegs, setMatchLegs] = useState('single'); 

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
      const settingsDoc = await getDoc(doc(db, "settings", "tournament_config"));
      if (settingsDoc.exists()) {
        const data = settingsDoc.data();
        if (data.adminPassword) setAdminPassword(data.adminPassword);
        if (data.viewerPassword) setViewerPassword(data.viewerPassword);
        if (data.tournamentName) setTournamentName(data.tournamentName);
        if (data.tournamentSystem) setTournamentSystem(data.tournamentSystem);
        if (data.matchLegs) setMatchLegs(data.matchLegs);
      }

      const teamsSnapshot = await getDocs(collection(db, "teams"));
      const teamsList = teamsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setTeams(teamsList || []);

      const matchesSnapshot = await getDocs(collection(db, "matches"));
      const matchesList = matchesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setMatches(matchesList || []);

      const koSnapshot = await getDocs(collection(db, "knockout_matches"));
      const koList = koSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setKnockoutMatches(koList || []);
      
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

  const handleUpdateSettings = async (newAdmin, newViewer, newName, newSys, newLegs) => {
    try {
      const configRef = doc(db, "settings", "tournament_config");
      await setDoc(configRef, {
        adminPassword: newAdmin ?? adminPassword,
        viewerPassword: newViewer ?? viewerPassword,
        tournamentName: newName ?? tournamentName,
        tournamentSystem: newSys ?? tournamentSystem,
        matchLegs: newLegs ?? matchLegs
      }, { merge: true });
      fetchData();
      alert("تم حفظ الإعدادات وتحديثها للجميع بنجاح! ⚙️");
    } catch (err) {
      console.error("خطأ في حفظ الإعدادات:", err);
    }
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

      (allTeams || []).forEach(t => {
        if (t && t.name) {
          statsMap[t.name.trim()] = {
            id: t.id,
            p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, pts: 0
          };
        }
      });

      (allMatches || []).forEach(m => {
        if (m && m.status === 'انتهت' && m.homeScore !== null && m.awayScore !== null && m.homeScore !== undefined && m.awayScore !== undefined) {
          const hName = m.home?.trim();
          const aName = m.away?.trim();
          const hS = Number(m.homeScore) || 0;
          const aS = Number(m.awayScore) || 0;

          if (hName && statsMap[hName]) {
            statsMap[hName].p += 1;
            statsMap[hName].gf += hS;
            statsMap[hName].ga += aS;
            if (hS > aS) { statsMap[hName].w += 1; statsMap[hName].pts += 3; }
            else if (hS === aS) { statsMap[hName].d += 1; statsMap[hName].pts += 1; }
            else { statsMap[hName].l += 1; }
          }

          if (aName && statsMap[aName]) {
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
        if (s && s.id) {
          const tRef = doc(db, "teams", s.id);
          batch.update(tRef, {
            p: s.p, w: s.w, d: s.d, l: s.l, gf: s.gf, ga: s.ga, pts: s.pts
          });
        }
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
    if (!team) return;
    setEditingTeamId(team.id);
    setEditName(team.name || '');
    setEditGroup(team.group || 'عام');
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
        pts: Number(editPts) || 0,
        p: Number(editP) || 0,
        gf: Number(editGf) || 0,
        ga: Number(editGa) || 0
      });
      setEditingTeamId(null);
      fetchData();
      alert('تم تحديث بيانات الفريق بنجاح!');
    } catch (error) {
      console.error("خطأ في تحديث الفريق:", error);
    }
  };

  const sortGroupTeams = (groupTeams) => {
    if (!Array.isArray(groupTeams)) return [];
    return groupTeams.sort((a, b) => {
      const ptsA = Number(a?.pts) || 0;
      const ptsB = Number(b?.pts) || 0;
      if (ptsB !== ptsA) return ptsB - ptsA;

      const directMatch = (matches || []).find(m => 
        m && ((m.home === a?.name && m.away === b?.name) || 
        (m.home === b?.name && m.away === a?.name))
      );
      if (directMatch && directMatch.homeScore !== null && directMatch.awayScore !== null && directMatch.homeScore !== undefined && directMatch.awayScore !== undefined) {
        const aIsHome = directMatch.home === a?.name;
        const scoreA = aIsHome ? Number(directMatch.homeScore) : Number(directMatch.awayScore);
        const scoreB = aIsHome ? Number(directMatch.awayScore) : Number(directMatch.homeScore);
        if (scoreA !== scoreB) return scoreB - scoreA;
      }

      const gdA = (Number(a?.gf) || 0) - (Number(a?.ga) || 0);
      const gdB = (Number(b?.gf) || 0) - (Number(b?.ga) || 0);
      if (gdB !== gdA) return gdB - gdA;

      return (Number(b?.gf) || 0) - (Number(a?.gf) || 0);
    });
  };

  // توليد الأدوار الإقصائية (سواء بنظام المجموعات، أو النظام الموحد ucl_league، أو إقصائية فقط)
  const generateKnockoutStage = async () => {
    try {
      let qualifiedTeams = [];

      if (tournamentSystem === 'knockout_only') {
        qualifiedTeams = (teams || []).map(t => ({ team: t.name, group: 'عام', rank: 1 }));
      } else if (tournamentSystem === 'ucl_league') {
        // نظام دوري الأبطال الجديد: جدول موحد لجميع الفرق، ويتاهل الأوائل (مثلاً الـ 8 الاوائل أو النصف)
        const sortedAll = sortGroupTeams([...teams]);
        const targetCount = sortedAll.length >= 16 ? 8 : (sortedAll.length >= 8 ? 4 : 2);
        qualifiedTeams = sortedAll.slice(0, targetCount).map((t, idx) => ({ team: t.name, group: 'الدوري الموحد', rank: idx + 1 }));
      } else {
        const activeGroups = [...new Set((teams || []).map(t => t?.group))].filter(Boolean);
        if (activeGroups.length === 0) {
          alert("لا توجد فرق مسجلة لتوليد الأدوار الإقصائية!");
          return;
        }

        const groupStandings = {};
        activeGroups.forEach(g => {
          const gTeams = (teams || []).filter(t => t?.group === g);
          groupStandings[g] = sortGroupTeams([...gTeams]);
        });

        activeGroups.forEach(g => {
          const sorted = groupStandings[g] || [];
          if (sorted[0]) qualifiedTeams.push({ team: sorted[0].name, group: g, rank: 1 });
          if (sorted[1]) qualifiedTeams.push({ team: sorted[1].name, group: g, rank: 2 });
        });

        if (qualifiedTeams.length < 8) {
          let thirdPlaces = [];
          activeGroups.forEach(g => {
            const sorted = groupStandings[g] || [];
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
      }

      if (qualifiedTeams.length < 2) {
        alert("عدد الفرق غير كافٍ لتوليد مباريات إقصائية!");
        return;
      }

      let defaultRound = [];
      let firstRoundPhase = 'Quarts de finale';

      if (qualifiedTeams.length <= 4) {
        firstRoundPhase = 'Demi-finales';
        defaultRound = [
          { id: 'd1', phase: 'Demi-finales', index: 0, home: qualifiedTeams[0]?.team || '', away: qualifiedTeams[3]?.team || '', homeScoreAller: null, awayScoreAller: null, homeScoreRetour: null, awayScoreRetour: null },
          { id: 'd2', phase: 'Demi-finales', index: 1, home: qualifiedTeams[1]?.team || '', away: qualifiedTeams[2]?.team || '', homeScoreAller: null, awayScoreAller: null, homeScoreRetour: null, awayScoreRetour: null }
        ];
      } else {
        defaultRound = [
          { id: 'q1', phase: 'Quarts de finale', index: 0, home: qualifiedTeams[0]?.team || '', away: qualifiedTeams[7]?.team || qualifiedTeams[3]?.team || '', homeScoreAller: null, awayScoreAller: null, homeScoreRetour: null, awayScoreRetour: null },
          { id: 'q2', phase: 'Quarts de finale', index: 1, home: qualifiedTeams[1]?.team || '', away: qualifiedTeams[6]?.team || qualifiedTeams[2]?.team || '', homeScoreAller: null, awayScoreAller: null, homeScoreRetour: null, awayScoreRetour: null },
          { id: 'q3', phase: 'Quarts de finale', index: 2, home: qualifiedTeams[2]?.team || '', away: qualifiedTeams[5]?.team || qualifiedTeams[1]?.team || '', homeScoreAller: null, awayScoreAller: null, homeScoreRetour: null, awayScoreRetour: null },
          { id: 'q4', phase: 'Quarts de finale', index: 3, home: qualifiedTeams[3]?.team || '', away: qualifiedTeams[4]?.team || qualifiedTeams[0]?.team || '', homeScoreAller: null, awayScoreAller: null, homeScoreRetour: null, awayScoreRetour: null }
        ];
      }

      const defaultDemis = [
        { id: 'd1', phase: 'Demi-finales', index: 0, home: '', away: '', homeScoreAller: null, awayScoreAller: null, homeScoreRetour: null, awayScoreRetour: null },
        { id: 'd2', phase: 'Demi-finales', index: 1, home: '', away: '', homeScoreAller: null, awayScoreAller: null, homeScoreRetour: null, awayScoreRetour: null }
      ];

      const defaultFinale = [
        { id: 'f1', phase: 'Finale', index: 0, home: '', away: '', homeScoreAller: null, awayScoreAller: null, homeScoreRetour: null, awayScoreRetour: null }
      ];

      const batch = writeBatch(db);
      [...defaultRound, ...defaultDemis, ...defaultFinale].forEach(item => {
        const ref = doc(db, "knockout_matches", item.id);
        batch.set(ref, item);
      });

      await batch.commit();
      await fetchData();
      alert("✨ تم توليد الأدوار الإقصائية أوتوماتيكياً بنجاح!");
    } catch (err) {
      console.error("خطأ في التوليد:", err);
    }
  };

  const updateKnockoutTeam = async (matchId, field, value) => {
    try {
      const ref = doc(db, "knockout_matches", matchId);
      await setDoc(ref, { [field]: value }, { merge: true });
      fetchData();
    } catch (err) {
      console.error("خطأ في تحديث الفريق الإقصائي:", err);
    }
  };

  const updateKnockoutScore = async (matchId, hAller, aAller, hRetour, aRetour) => {
    const ha = parseInt(hAller) || 0;
    const aa = parseInt(aAller) || 0;
    const hr = matchLegs === 'aller_retour' ? (parseInt(hRetour) || 0) : 0;
    const ar = matchLegs === 'aller_retour' ? (parseInt(aRetour) || 0) : 0;

    try {
      const ref = doc(db, "knockout_matches", matchId);
      await setDoc(ref, {
        homeScoreAller: ha,
        awayScoreAller: aa,
        homeScoreRetour: hr,
        awayScoreRetour: ar
      }, { merge: true });

      const koSnapshot = await getDocs(collection(db, "knockout_matches"));
      const currentKo = koSnapshot.docs.map(d => ({ id: d.id, ...d.data() }));

      const winnerOf = (id) => {
        const m = currentKo.find(item => item.id === id);
        if (!m) return '';
        
        let curHa = (m.id === matchId) ? ha : (m.homeScoreAller ?? 0);
        let curAa = (m.id === matchId) ? aa : (m.awayScoreAller ?? 0);
        let curHr = (m.id === matchId) ? hr : (m.homeScoreRetour ?? 0);
        let curAr = (m.id === matchId) ? ar : (m.awayScoreRetour ?? 0);

        let totalHome = curHa;
        let totalAway = curAa;
        if (matchLegs === 'aller_retour') {
          totalHome = curHa + curAr;
          totalAway = curAa + curHr;
        }

        if (totalHome === totalAway) {
          return m.home;
        }
        return totalHome > totalAway ? m.home : m.away;
      };

      if (['q1', 'q2', 'q3', 'q4'].includes(matchId)) {
        const q1Win = winnerOf('q1');
        const q2Win = winnerOf('q2');
        const q3Win = winnerOf('q3');
        const q4Win = winnerOf('q4');

        await setDoc(doc(db, "knockout_matches", 'd1'), { 
          id: 'd1', phase: 'Demi-finales', index: 0,
          home: q1Win || currentKo.find(m => m.id === 'd1')?.home || '', 
          away: q2Win || currentKo.find(m => m.id === 'd1')?.away || '' 
        }, { merge: true });

        await setDoc(doc(db, "knockout_matches", 'd2'), { 
          id: 'd2', phase: 'Demi-finales', index: 1,
          home: q3Win || currentKo.find(m => m.id === 'd2')?.home || '', 
          away: q4Win || currentKo.find(m => m.id === 'd2')?.away || '' 
        }, { merge: true });
      }

      if (['d1', 'd2'].includes(matchId)) {
        const d1Win = winnerOf('d1');
        const d2Win = winnerOf('d2');

        await setDoc(doc(db, "knockout_matches", 'f1'), { 
          id: 'f1', phase: 'Finale', index: 0,
          home: d1Win || currentKo.find(m => m.id === 'f1')?.home || '', 
          away: d2Win || currentKo.find(m => m.id === 'f1')?.away || '' 
        }, { merge: true });
      }

      await fetchData();
      alert("تم حفظ النتيجة وتأهل الفريق الفائز إلى الدور الموالي أوتوماتيكياً! 🏆");
    } catch (err) {
      console.error("خطأ في حفظ النتيجة:", err);
      alert("حدث خطأ أثناء حفظ النتيجة.");
    }
  };

  const handleResetTournament = async () => {
    if (window.confirm("⚠️ هل أنت متأكد من مسح جميع بيانات هذه البطولة نهائياً؟")) {
      try {
        const batch = writeBatch(db);
        (teams || []).forEach(t => batch.delete(doc(db, "teams", t.id)));
        (matches || []).forEach(m => batch.delete(doc(db, "matches", m.id)));
        (knockoutMatches || []).forEach(k => batch.delete(doc(db, "knockout_matches", k.id)));
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
  const uniqueGroups = [...new Set((teams || []).map(t => t?.group))].filter(Boolean);
  const displayGroups = uniqueGroups.length > 0 ? uniqueGroups : ['المجموعة أ', 'المجموعة ب', 'المجموعة ج', 'المجموعة د'];

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
                  <div style={{ fontSize: '12px', color: '#94a3b8' }}>إعدادات ونظام البطولة (دوري، مجموعات، إقصائيات)</div>
                </div>
              </div>

              <div 
                onClick={() => setCurrentView('participants')}
                style={{ background: '#1e293b', padding: '15px 20px', borderRadius: '10px', marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '15px', cursor: 'pointer', border: '1px solid #334155' }}
              >
                <div style={{ background: '#0f172a', color: '#38bdf8', width: '40px', height: '40px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>👥</div>
                <div>
                  <div style={{ fontWeight: 'bold', fontSize: '14px' }}>PARTICIPANTS</div>
                  <div style={{ fontSize: '12px', color: '#94a3b8' }}>إضافة وتعديل الفرق وشعاراتها</div>
                </div>
              </div>
            </>
          )}

          {tournamentSystem !== 'knockout_only' && tournamentSystem !== 'ucl_league' && (
            <>
              <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#94a3b8', margin: '15px 0 10px 0', borderBottom: '1px solid #334155', paddingBottom: '5px' }}>
                Phase 1 (دور المجموعات والجولات)
              </div>

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

          {tournamentSystem === 'ucl_league' && (
            <>
              <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#94a3b8', margin: '15px 0 10px 0', borderBottom: '1px solid #334155', paddingBottom: '5px' }}>
                مرحلة الدوري الموحد (League Phase)
              </div>

              <div 
                onClick={() => setCurrentView('phase1_points')}
                style={{ background: '#1e293b', padding: '15px 20px', borderRadius: '10px', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '15px', cursor: 'pointer', border: '1px solid #334155' }}
              >
                <div style={{ background: '#0f172a', color: '#38bdf8', width: '40px', height: '40px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: 'bold' }}>⚽</div>
                <div>
                  <div style={{ fontWeight: 'bold', fontSize: '14px' }}>مباريات الدوري</div>
                  <div style={{ fontSize: '12px', color: '#94a3b8' }}>برمجة وإدخال نتائج المباريات</div>
                </div>
              </div>

              <div 
                onClick={() => setCurrentView('phase1_classement')}
                style={{ background: '#1e293b', padding: '15px 20px', borderRadius: '10px', marginBottom: '25px', display: 'flex', alignItems: 'center', gap: '15px', cursor: 'pointer', border: '1px solid #334155' }}
              >
                <div style={{ background: '#0f172a', color: '#38bdf8', width: '40px', height: '40px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px' }}>📊</div>
                <div>
                  <div style={{ fontWeight: 'bold', fontSize: '14px' }}>جدول الترتيب الموحد</div>
                  <div style={{ fontSize: '12px', color: '#94a3b8' }}>ترتيب جميع الفرق في جدول واحد لتأهل الأوائل</div>
                </div>
              </div>
            </>
          )}

          <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#94a3b8', margin: '20px 0 10px 0', borderBottom: '1px solid #334155', paddingBottom: '5px' }}>
            {tournamentSystem === 'knockout_only' ? 'مباريات البطولة الإقصائية' : 'Phase 2 (الأدوار الإقصائية والقرعة)'}
          </div>

          <div 
            onClick={() => setCurrentView('phase2')}
            style={{ background: '#1e293b', padding: '15px 20px', borderRadius: '10px', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '15px', cursor: 'pointer', border: '1px solid #334155' }}
          >
            <div style={{ background: '#0f172a', color: '#38bdf8', width: '40px', height: '40px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: 'bold' }}>03</div>
            <div>
              <div style={{ fontWeight: 'bold', fontSize: '14px' }}>مسار البطولة (Quarts, Demis, Finale)</div>
              <div style={{ fontSize: '12px', color: '#94a3b8' }}>مباريات خروج المغلوب بنظام (ذهاب وإياب أو مباراة واحدة) وترحيل الفائزين أوتوماتيكياً</div>
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
                onChange={(e) => setTournamentSystem(e.target.value)}
                style={{ width: '100%', padding: '10px', borderRadius: '8px', background: '#0f172a', border: '1px solid #334155', color: '#fff' }}
              >
                <option value="groups_knockout">دور المجموعات ثم أدوار إقصائية</option>
                <option value="ucl_league">نظام دوري أبطال أوروبا الجديد (دوري موحد + إقصائيات)</option>
                <option value="league">دوري عادي (مجموعات فقط)</option>
                <option value="knockout_only">أدوار إقصائية فقط (بدون مجموعات)</option>
              </select>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ fontSize: '13px', display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>نظام المباريات:</label>
              <select 
                value={matchLegs}
                onChange={(e) => setMatchLegs(e.target.value)}
                style={{ width: '100%', padding: '10px', borderRadius: '8px', background: '#0f172a', border: '1px solid #334155', color: '#fff' }}
              >
                <option value="single">مباراة واحدة (Match unique)</option>
                <option value="aller_retour">ذهاب وإياب (Aller-Retour)</option>
              </select>
            </div>

            <div style={{ borderTop: '1px solid #334155', paddingTop: '15px', marginTop: '15px' }}>
              <h3 style={{ fontSize: '14px', marginBottom: '12px', color: '#34d399' }}>تغيير كلمات السر (تحديث عام للجميع)</h3>
              <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
                <input type="password" placeholder="مرور المشرف الجديد" value={newAdminPass} onChange={(e) => setNewAdminPass(e.target.value)} style={{ flex: 1, padding: '8px', borderRadius: '6px', background: '#0f172a', border: '1px solid #334155', color: '#fff' }} />
              </div>
              <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
                <input type="password" placeholder="مرور المشاهد الجديد" value={newViewerPass} onChange={(e) => setNewViewerPass(e.target.value)} style={{ flex: 1, padding: '8px', borderRadius: '6px', background: '#0f172a', border: '1px solid #334155', color: '#fff' }} />
              </div>
              <button 
                onClick={() => handleUpdateSettings(newAdminPass || adminPassword, newViewerPass || viewerPassword, tournamentName, tournamentSystem, matchLegs)} 
                style={{ width: '100%', background: '#0284c7', color: '#fff', border: 'none', padding: '10px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}
              >
                حفظ الإعدادات وكلمات السر للجميع 💾
              </button>
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
                group: (tournamentSystem === 'knockout_only' || tournamentSystem === 'ucl_league') ? 'عام' : newTeamGroup, 
                logo: newTeamLogo || 'https://via.placeholder.com/40', 
                p:0, w:0, d:0, l:0, gf:0, ga:0, pts:0 
              });
              setNewTeamName('');
              setNewTeamLogo('');
              fetchData();
            }} style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
              <div style={{ display: 'flex', gap: '10px' }}>
                <input type="text" placeholder="اسم الفريق..." value={newTeamName} onChange={(e) => setNewTeamName(e.target.value)} style={{ flex: 2, padding: '8px', borderRadius: '6px', background: '#0f172a', border: '1px solid #334155', color: '#fff' }} />
                {tournamentSystem !== 'knockout_only' && tournamentSystem !== 'ucl_league' && (
                  <select value={newTeamGroup} onChange={(e) => setNewTeamGroup(e.target.value)} style={{ flex: 1, padding: '8px', borderRadius: '6px', background: '#0f172a', border: '1px solid #334155', color: '#fff' }}>
                    {groupNames.slice(0, 4).map(g => <option key={g} value={g}>{g}</option>)}
                  </select>
                )}
              </div>
              <div>
                <label style={{ fontSize: '12px', color: '#94a3b8', display: 'block', marginBottom: '5px' }}>اختر شعار الفريق من الهاتف:</label>
                <input type="file" accept="image/*" onChange={handleImageUpload} style={{ width: '100%', padding: '6px', borderRadius: '6px', background: '#0f172a', border: '1px solid #334155', color: '#fff' }} />
              </div>
              <button type="submit" style={{ background: '#0284c7', color: '#fff', border: 'none', padding: '10px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>إضافة الفريق</button>
            </form>
            <div>
              {(teams || []).map(t => (
                <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px', borderBottom: '1px solid #334155', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <img src={t.logo || 'https://via.placeholder.com/40'} alt="" style={{ width: '30px', height: '30px', borderRadius: '50%', objectFit: 'cover', border: '1px solid #334155' }} />
                    <span style={{ fontWeight: 'bold' }}>{t.name} {tournamentSystem !== 'knockout_only' && tournamentSystem !== 'ucl_league' && <span style={{ fontSize: '11px', color: '#94a3b8' }}>({t.group})</span>}</span>
                  </div>
                  <button onClick={async () => { await deleteDoc(doc(db, "teams", t.id)); await recalculateAllStats(); fetchData(); }} style={{ background: '#ef4444', color: '#fff', border: 'none', padding: '4px 8px', borderRadius: '4px', fontSize: '12px', cursor: 'pointer' }}>حذف</button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {currentView === 'phase1_points' && tournamentSystem !== 'knockout_only' && (
        <div style={{ maxWidth: '600px', margin: '0 auto' }}>
          {tournamentSystem !== 'ucl_league' && (
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
          )}

          <div style={{ padding: '15px' }}>
            <div style={{ fontWeight: 'bold', fontSize: '15px', margin: '10px 0', color: '#38bdf8' }}>{tournamentSystem === 'ucl_league' ? 'مباريات الدوري الموحد' : `مباريات ${phase1Tab}`}</div>
            
            {role === 'admin' && (
              <form onSubmit={handleAddMatch} style={{ background: '#1e293b', padding: '15px', borderRadius: '10px', marginBottom: '20px', border: '1px solid #334155' }}>
                <h3 style={{ fontSize: '13px', color: '#34d399', marginBottom: '10px' }}>➕ برمجة مباراة جديدة</h3>
                <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
                  <select value={homeTeam} onChange={(e) => setHomeTeam(e.target.value)} style={{ flex: 1, padding: '8px', background: '#0f172a', color: '#fff', border: '1px solid #334155', borderRadius: '6px' }}>
                    <option value="">الفريق المضيف</option>
                    {(teams || []).map(t => <option key={t.id} value={t.name}>{t.name}</option>)}
                  </select>
                  <select value={awayTeam} onChange={(e) => setAwayTeam(e.target.value)} style={{ flex: 1, padding: '8px', background: '#0f172a', color: '#fff', border: '1px solid #334155', borderRadius: '6px' }}>
                    <option value="">الفريق الضيف</option>
                    {(teams || []).map(t => <option key={t.id} value={t.name}>{t.name}</option>)}
                  </select>
                </div>
                <button type="submit" style={{ width: '100%', background: '#0284c7', color: '#fff', border: 'none', padding: '8px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>إضافة المباراة</button>
              </form>
            )}

            {(matches || []).filter(m => tournamentSystem === 'ucl_league' || (m && m.journee === phase1Tab)).length === 0 ? (
              <div style={{ background: '#1e293b', padding: '20px', borderRadius: '10px', textAlign: 'center', color: '#94a3b8' }}>
                لا توجد مباريات مبرمجة حالياً.
              </div>
            ) : (
              (matches || []).filter(m => tournamentSystem === 'ucl_league' || (m && m.journee === phase1Tab)).map((match) => (
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
                            حفظ
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
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {currentView === 'phase1_classement' && tournamentSystem !== 'knockout_only' && (
        <div style={{ maxWidth: '600px', margin: '20px auto', padding: '0 15px' }}>
          {(teams || []).length === 0 ? (
            <div style={{ background: '#1e293b', padding: '30px', borderRadius: '12px', textAlign: 'center', color: '#94a3b8', border: '1px solid #334155' }}>
              لا توجد فرق مسجلة في البطولة حالياً لعرض الترتيب.
            </div>
          ) : tournamentSystem === 'ucl_league' ? (
            // عرض جدول الترتيب الموحد لنظام دوري الأبطال الجديد
            <div style={{ background: '#1e293b', padding: '15px', borderRadius: '12px', marginBottom: '20px', border: '1px solid #334155' }}>
              <h3 style={{ fontSize: '15px', color: '#38bdf8', marginBottom: '10px', borderBottom: '1px solid #334155', paddingBottom: '5px' }}>جدول الترتيب الموحد (League Phase)</h3>
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
                  {sortGroupTeams([...teams]).map((t, index) => {
                    const goalDiff = (Number(t.gf) || 0) - (Number(t.ga) || 0);
                    const isEditing = editingTeamId === t.id;
                    return (
                      <tr key={t.id} style={{ textAlign: 'center', borderBottom: '1px solid #334155', background: index < 8 ? 'rgba(16, 185, 129, 0.1)' : 'transparent' }}>
                        <td style={{ padding: '8px', textAlign: 'right', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '11px', color: '#94a3b8' }}>{index + 1}.</span>
                          <img src={t.logo || 'https://via.placeholder.com/40'} alt="" style={{ width: '22px', height: '22px', borderRadius: '50%', objectFit: 'cover' }} />
                          {isEditing ? <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)} style={{ width: '90px', background: '#0f172a', color: '#fff' }} /> : t.name}
                        </td>
                        <td>{isEditing ? <input type="number" value={editP} onChange={(e) => setEditP(e.target.value)} style={{ width: '35px', background: '#0f172a', color: '#fff', textAlign: 'center' }} /> : (t.p || 0)}</td>
                        <td style={{ color: goalDiff > 0 ? '#4ade80' : goalDiff < 0 ? '#f87171' : '#fff' }}>{goalDiff > 0 ? '+' + goalDiff : goalDiff}</td>
                        <td style={{ fontWeight: 'bold', color: '#38bdf8' }}>{isEditing ? <input type="number" value={editPts} onChange={(e) => setEditPts(e.target.value)} style={{ width: '40px', background: '#0f172a', color: '#fff', textAlign: 'center' }} /> : (t.pts || 0)}</td>
                        {role === 'admin' && (
                          <td>
                            {isEditing ? (
                              <button onClick={() => saveTeamChanges(t.id)} style={{ background: '#10b981', color: '#fff', border: 'none', padding: '3px 6px', borderRadius: '4px', fontSize: '11px' }}>حفظ</button>
                            ) : (
                              <button onClick={() => startEditingTeam(t)} style={{ background: '#0284c7', color: '#fff', border: 'none', padding: '3px 8px', borderRadius: '4px', fontSize: '11px' }}>تعديل</button>
                            )}
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            displayGroups.map(group => {
              const groupTeams = (teams || []).filter(t => t && t.group === group);
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
                        const isEditing = editingTeamId === t.id;

                        return (
                          <tr key={t.id} style={{ textAlign: 'center', borderBottom: '1px solid #334155' }}>
                            <td style={{ padding: '8px', textAlign: 'right', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <img src={t.logo || 'https://via.placeholder.com/40'} alt="" style={{ width: '22px', height: '22px', borderRadius: '50%', objectFit: 'cover' }} />
                              {isEditing ? <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)} style={{ width: '90px', background: '#0f172a', color: '#fff' }} /> : t.name}
                            </td>
                            <td>{isEditing ? <input type="number" value={editP} onChange={(e) => setEditP(e.target.value)} style={{ width: '35px', background: '#0f172a', color: '#fff', textAlign: 'center' }} /> : (t.p || 0)}</td>
                            <td style={{ color: goalDiff > 0 ? '#4ade80' : goalDiff < 0 ? '#f87171' : '#fff' }}>{goalDiff > 0 ? '+' + goalDiff : goalDiff}</td>
                            <td style={{ fontWeight: 'bold', color: '#38bdf8' }}>{isEditing ? <input type="number" value={editPts} onChange={(e) => setEditPts(e.target.value)} style={{ width: '40px', background: '#0f172a', color: '#fff', textAlign: 'center' }} /> : (t.pts || 0)}</td>
                            {role === 'admin' && (
                              <td>
                                {isEditing ? (
                                  <button onClick={() => saveTeamChanges(t.id)} style={{ background: '#10b981', color: '#fff', border: 'none', padding: '3px 6px', borderRadius: '4px', fontSize: '11px' }}>حفظ</button>
                                ) : (
                                  <button onClick={() => startEditingTeam(t)} style={{ background: '#0284c7', color: '#fff', border: 'none', padding: '3px 8px', borderRadius: '4px', fontSize: '11px' }}>تعديل</button>
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
                    ⚡ توليد مباريات الأدوار الإقصائية أوتوماتيكياً
                  </button>
                )}

                {(knockoutMatches || []).filter(m => m && m.phase === 'Quarts de finale').length === 0 ? (
                  <div style={{ background: '#1e293b', padding: '20px', borderRadius: '10px', textAlign: 'center', color: '#94a3b8' }}>
                    لم يتم توليد الأدوار الإقصائية بعد. اضغط على الزر الأخضر أعلاه.
                  </div>
                ) : (
                  (knockoutMatches || []).filter(m => m && m.phase === 'Quarts de finale').map((m) => (
                    <div key={m.id} style={{ background: '#1e293b', borderRadius: '10px', padding: '15px', marginBottom: '12px', border: '1px solid #334155', textAlign: 'center' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', gap: '5px' }}>
                        {role === 'admin' ? (
                          <select 
                            value={m.home || ''} 
                            onChange={(e) => updateKnockoutTeam(m.id, 'home', e.target.value)}
                            style={{ flex: 1, padding: '5px', background: '#0f172a', color: '#fff', border: '1px solid #334155', borderRadius: '4px', fontSize: '12px' }}
                          >
                            <option value="">اختر الفريق</option>
                            {(teams || []).map(t => <option key={t.id} value={t.name}>{t.name}</option>)}
                          </select>
                        ) : (
                          <span style={{ flex: 1, fontWeight: 'bold' }}>{m.home || 'تحديد لاحقاً'}</span>
                        )}

                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            {matchLegs === 'aller_retour' && <span style={{ fontSize: '10px', color: '#38bdf8' }}>الذهاب:</span>}
                            <input type="number" defaultValue={m.homeScoreAller ?? ''} id={`ko-ha-${m.id}`} disabled={role !== 'admin'} style={{ width: '35px', textAlign: 'center', padding: '4px', background: '#0f172a', color: '#fff', border: '1px solid #334155', borderRadius: '4px' }} />
                            <span>-</span>
                            <input type="number" defaultValue={m.awayScoreAller ?? ''} id={`ko-aa-${m.id}`} disabled={role !== 'admin'} style={{ width: '35px', textAlign: 'center', padding: '4px', background: '#0f172a', color: '#fff', border: '1px solid #334155', borderRadius: '4px' }} />
                          </div>

                          {matchLegs === 'aller_retour' && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <span style={{ fontSize: '10px', color: '#34d399' }}>الإياب:</span>
                              <input type="number" defaultValue={m.homeScoreRetour ?? ''} id={`ko-hr-${m.id}`} disabled={role !== 'admin'} style={{ width: '35px', textAlign: 'center', padding: '4px', background: '#0f172a', color: '#fff', border: '1px solid #334155', borderRadius: '4px' }} />
                              <span>-</span>
                              <input type="number" defaultValue={m.awayScoreRetour ?? ''} id={`ko-ar-${m.id}`} disabled={role !== 'admin'} style={{ width: '35px', textAlign: 'center', padding: '4px', background: '#0f172a', color: '#fff', border: '1px solid #334155', borderRadius: '4px' }} />
                            </div>
                          )}

                          {role === 'admin' && (
                            <button 
                              onClick={() => {
                                const ha = document.getElementById(`ko-ha-${m.id}`).value;
                                const aa = document.getElementById(`ko-aa-${m.id}`).value;
                                const hr = matchLegs === 'aller_retour' ? document.getElementById(`ko-hr-${m.id}`).value : 0;
                                const ar = matchLegs === 'aller_retour' ? document.getElementById(`ko-ar-${m.id}`).value : 0;
                                updateKnockoutScore(m.id, ha, aa, hr, ar);
                              }}
                              style={{ background: '#10b981', border: 'none', padding: '4px 12px', borderRadius: '4px', cursor: 'pointer', color: '#fff', fontWeight: 'bold', fontSize: '11px', marginTop: '4px' }}
                            >
                              حفظ 💾
                            </button>
                          )}
                        </div>

                        {role === 'admin' ? (
                          <select 
                            value={m.away || ''} 
                            onChange={(e) => updateKnockoutTeam(m.id, 'away', e.target.value)}
                            style={{ flex: 1, padding: '5px', background: '#0f172a', color: '#fff', border: '1px solid #334155', borderRadius: '4px', fontSize: '12px' }}
                          >
                            <option value="">اختر الفريق</option>
                            {(teams || []).map(t => <option key={t.id} value={t.name}>{t.name}</option>)}
                          </select>
                        ) : (
                          <span style={{ flex: 1, fontWeight: 'bold' }}>{m.away || 'تحديد لاحقاً'}</span>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </>
            )}

            {phase2Tab === 'Demi-finales' && (
              <>
                {(knockoutMatches || []).filter(m => m && m.phase === 'Demi-finales').length === 0 ? (
                  <div style={{ background: '#1e293b', padding: '20px', borderRadius: '10px', textAlign: 'center', color: '#94a3b8' }}>
                    لم يتم توليد مباريات نصف النهائي بعد. قم بحفظ نتائج الدور السابق أولاً.
                  </div>
                ) : (
                  (knockoutMatches || []).filter(m => m && m.phase === 'Demi-finales').map((m) => (
                    <div key={m.id} style={{ background: '#1e293b', borderRadius: '10px', padding: '15px', marginBottom: '12px', border: '1px solid #334155', textAlign: 'center' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', gap: '5px' }}>
                        {role === 'admin' ? (
                          <select 
                            value={m.home || ''} 
                            onChange={(e) => updateKnockoutTeam(m.id, 'home', e.target.value)}
                            style={{ flex: 1, padding: '5px', background: '#0f172a', color: '#fff', border: '1px solid #334155', borderRadius: '4px', fontSize: '12px' }}
                          >
                            <option value="">اختر الفريق</option>
                            {(teams || []).map(t => <option key={t.id} value={t.name}>{t.name}</option>)}
                          </select>
                        ) : (
                          <span style={{ flex: 1, fontWeight: 'bold' }}>{m.home || 'تحديد لاحقاً'}</span>
                        )}

                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            {matchLegs === 'aller_retour' && <span style={{ fontSize: '10px', color: '#38bdf8' }}>الذهاب:</span>}
                            <input type="number" defaultValue={m.homeScoreAller ?? ''} id={`ko-ha-${m.id}`} disabled={role !== 'admin'} style={{ width: '35px', textAlign: 'center', padding: '4px', background: '#0f172a', color: '#fff', border: '1px solid #334155', borderRadius: '4px' }} />
                            <span>-</span>
                            <input type="number" defaultValue={m.awayScoreAller ?? ''} id={`ko-aa-${m.id}`} disabled={role !== 'admin'} style={{ width: '35px', textAlign: 'center', padding: '4px', background: '#0f172a', color: '#fff', border: '1px solid #334155', borderRadius: '4px' }} />
                          </div>

                          {matchLegs === 'aller_retour' && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <span style={{ fontSize: '10px', color: '#34d399' }}>الإياب:</span>
                              <input type="number" defaultValue={m.homeScoreRetour ?? ''} id={`ko-hr-${m.id}`} disabled={role !== 'admin'} style={{ width: '35px', textAlign: 'center', padding: '4px', background: '#0f172a', color: '#fff', border: '1px solid #334155', borderRadius: '4px' }} />
                              <span>-</span>
                              <input type="number" defaultValue={m.awayScoreRetour ?? ''} id={`ko-ar-${m.id}`} disabled={role !== 'admin'} style={{ width: '35px', textAlign: 'center', padding: '4px', background: '#0f172a', color: '#fff', border: '1px solid #334155', borderRadius: '4px' }} />
                            </div>
                          )}

                          {role === 'admin' && (
                            <button 
                              onClick={() => {
                                const ha = document.getElementById(`ko-ha-${m.id}`).value;
                                const aa = document.getElementById(`ko-aa-${m.id}`).value;
                                const hr = matchLegs === 'aller_retour' ? document.getElementById(`ko-hr-${m.id}`).value : 0;
                                const ar = matchLegs === 'aller_retour' ? document.getElementById(`ko-ar-${m.id}`).value : 0;
                                updateKnockoutScore(m.id, ha, aa, hr, ar);
                              }}
                              style={{ background: '#10b981', border: 'none', padding: '4px 12px', borderRadius: '4px', cursor: 'pointer', color: '#fff', fontWeight: 'bold', fontSize: '11px', marginTop: '4px' }}
                            >
                              حفظ 💾
                            </button>
                          )}
                        </div>

                        {role === 'admin' ? (
                          <select 
                            value={m.away || ''} 
                            onChange={(e) => updateKnockoutTeam(m.id, 'away', e.target.value)}
                            style={{ flex: 1, padding: '5px', background: '#0f172a', color: '#fff', border: '1px solid #334155', borderRadius: '4px', fontSize: '12px' }}
                          >
                            <option value="">اختر الفريق</option>
                            {(teams || []).map(t => <option key={t.id} value={t.name}>{t.name}</option>)}
                          </select>
                        ) : (
                          <span style={{ flex: 1, fontWeight: 'bold' }}>{m.away || 'تحديد لاحقاً'}</span>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </>
            )}

            {phase2Tab === 'Finale' && (
              <>
                {(knockoutMatches || []).filter(m => m && m.phase === 'Finale').length === 0 ? (
                  <div style={{ background: '#1e293b', padding: '20px', borderRadius: '10px', textAlign: 'center', color: '#94a3b8' }}>
                    لم يتم تفعيل المباراة النهائية بعد.
                  </div>
                ) : (
                  (knockoutMatches || []).filter(m => m && m.phase === 'Finale').map((m) => (
                    <div key={m.id} style={{ background: '#1e293b', borderRadius: '10px', padding: '20px', textAlign: 'center', border: '1px solid #334155' }}>
                      <div style={{ fontSize: '12px', color: '#38bdf8', marginBottom: '10px', fontWeight: 'bold' }}>المباراة النهائية الكبرى 🏆</div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', gap: '10px' }}>
                        {role === 'admin' ? (
                          <select 
                            value={m.home || ''} 
                            onChange={(e) => updateKnockoutTeam(m.id, 'home', e.target.value)}
                            style={{ flex: 1, padding: '8px', background: '#0f172a', color: '#fff', border: '1px solid #334155', borderRadius: '6px', fontSize: '13px', fontWeight: 'bold' }}
                          >
                            <option value="">اختر طرف النهائي 1</option>
                            {(teams || []).map(t => <option key={t.id} value={t.name}>{t.name}</option>)}
                          </select>
                        ) : (
                          <span style={{ flex: 1, fontWeight: 'bold', fontSize: '15px' }}>{m.home || 'تحديد لاحقاً'}</span>
                        )}

                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            {matchLegs === 'aller_retour' && <span style={{ fontSize: '10px', color: '#38bdf8' }}>الذهاب:</span>}
                            <input type="number" defaultValue={m.homeScoreAller ?? ''} id={`ko-ha-${m.id}`} disabled={role !== 'admin'} style={{ width: '40px', textAlign: 'center', padding: '6px', background: '#0f172a', color: '#fff', border: '1px solid #334155', borderRadius: '6px' }} />
                            <span>-</span>
                            <input type="number" defaultValue={m.awayScoreAller ?? ''} id={`ko-aa-${m.id}`} disabled={role !== 'admin'} style={{ width: '40px', textAlign: 'center', padding: '6px', background: '#0f172a', color: '#fff', border: '1px solid #334155', borderRadius: '6px' }} />
                          </div>

                          {matchLegs === 'aller_retour' && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <span style={{ fontSize: '10px', color: '#34d399' }}>الإياب:</span>
                              <input type="number" defaultValue={m.homeScoreRetour ?? ''} id={`ko-hr-${m.id}`} disabled={role !== 'admin'} style={{ width: '40px', textAlign: 'center', padding: '6px', background: '#0f172a', color: '#fff', border: '1px solid #334155', borderRadius: '6px' }} />
                              <span>-</span>
                              <input type="number" defaultValue={m.awayScoreRetour ?? ''} id={`ko-ar-${m.id}`} disabled={role !== 'admin'} style={{ width: '40px', textAlign: 'center', padding: '6px', background: '#0f172a', color: '#fff', border: '1px solid #334155', borderRadius: '6px' }} />
                            </div>
                          )}

                          {role === 'admin' && (
                            <button 
                              onClick={() => {
                                const ha = document.getElementById(`ko-ha-${m.id}`).value;
                                const aa = document.getElementById(`ko-aa-${m.id}`).value;
                                const hr = matchLegs === 'aller_retour' ? document.getElementById(`ko-hr-${m.id}`).value : 0;
                                const ar = matchLegs === 'aller_retour' ? document.getElementById(`ko-ar-${m.id}`).value : 0;
                                updateKnockoutScore(m.id, ha, aa, hr, ar);
                              }}
                              style={{ background: '#10b981', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', color: '#fff', fontWeight: 'bold', fontSize: '12px', marginTop: '4px' }}
                            >
                              حفظ 💾
                            </button>
                          )}
                        </div>

                        {role === 'admin' ? (
                          <select 
                            value={m.away || ''} 
                            onChange={(e) => updateKnockoutTeam(m.id, 'away', e.target.value)}
                            style={{ flex: 1, padding: '8px', background: '#0f172a', color: '#fff', border: '1px solid #334155', borderRadius: '6px', fontSize: '13px', fontWeight: 'bold' }}
                          >
                            <option value="">اختر طرف النهائي 2</option>
                            {(teams || []).map(t => <option key={t.id} value={t.name}>{t.name}</option>)}
                          </select>
                        ) : (
                          <span style={{ flex: 1, fontWeight: 'bold', fontSize: '15px' }}>{m.away || 'تحديد لاحقاً'}</span>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </>
            )}
          </div>
        </div>
      )}

    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <MainApp />
    </ErrorBoundary>
  );
}