import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, addDoc, doc, updateDoc, deleteDoc, getDoc, setDoc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyCOMsddUqKS5_z3tArY2i-D6sK2kp64j04",
  authDomain: "footpro-c8971.firebaseapp.com",
  projectId: "footpro-c8971",
  storageBucket: "footpro-c8971.firebasestorage.app",
  messagingSenderId: "138177969965",
  appId: "1:138177969965:web:870e657dd58f6837171da4",
  measurementId: "G-NCW64TYQ99"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export default function FootballTournamentApp() {
  const [teams, setTeams] = useState([]);
  const [matches, setMatches] = useState([]);
  const [activeTab, setActiveTab] = useState('standings');
  
  const [userRole, setUserRole] = useState(null);
  const [enteredCode, setEnteredCode] = useState('');

  const [adminCode, setAdminCode] = useState('1234');
  const [participantCode, setParticipantCode] = useState('7777');

  const [newAdminCode, setNewAdminCode] = useState('');
  const [newPartCode, setNewPartCode] = useState('');

  const [announcement, setAnnouncement] = useState('مرحباً بالجميع في دوري الحي الرسمي 🏆 - ترقبوا أقوى المباريات والقمم الكروية!');

  const [newTeamName, setNewTeamName] = useState('');
  const [newTeamLogo, setNewTeamLogo] = useState('');
  const [newTeamGroup, setNewTeamGroup] = useState('المجموعة أ');

  const [homeTeam, setHomeTeam] = useState('');
  const [awayTeam, setAwayTeam] = useState('');
  const [matchStage, setMatchStage] = useState('مجموعات');

  useEffect(() => {
    fetchData();
    fetchSettings();
  }, []);

  const fetchData = async () => {
    try {
      const teamsSnap = await getDocs(collection(db, "teams"));
      setTeams(teamsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));

      const matchesSnap = await getDocs(collection(db, "matches"));
      setMatches(matchesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch (error) {
      console.error("خطأ في جلب البيانات:", error);
    }
  };

  const fetchSettings = async () => {
    try {
      const settingsDoc = await getDoc(doc(db, "settings", "tournament_config"));
      if (settingsDoc.exists()) {
        const data = settingsDoc.data();
        if (data.adminCode) setAdminCode(data.adminCode);
        if (data.participantCode) setParticipantCode(data.participantCode);
        if (data.announcement) setAnnouncement(data.announcement);
      }
    } catch (error) {
      console.error("خطأ في جلب الإعدادات:", error);
    }
  };

  const handleSaveSettings = async () => {
    try {
      const updatedAdmin = newAdminCode.trim() !== '' ? newAdminCode.trim() : adminCode;
      const updatedPart = newPartCode.trim() !== '' ? newPartCode.trim() : participantCode;

      await setDoc(doc(db, "settings", "tournament_config"), {
        adminCode: updatedAdmin,
        participantCode: updatedPart,
        announcement: announcement
      }, { merge: false });

      setAdminCode(updatedAdmin);
      setParticipantCode(updatedPart);
      setNewAdminCode('');
      setNewPartCode('');
      alert("تم تحديث الإعدادات بنجاح!");
    } catch (error) {
      console.error("خطأ في الحفظ:", error);
      alert("حدث خطأ أثناء الحفظ.");
    }
  };

  const handleCodeLogin = (e) => {
    e.preventDefault();
    const code = enteredCode.trim();
    if (code === adminCode.trim()) {
      setUserRole('admin');
      setEnteredCode('');
    } else if (code === participantCode.trim()) {
      setUserRole('participant');
      setEnteredCode('');
    } else {
      alert("الرمز غير صحيح! تأكد من الرقم السري.");
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

  const handleAddTeam = async () => {
    if (!newTeamName.trim()) {
      alert("المرجو كتابة اسم الفريق!");
      return;
    }
    try {
      await addDoc(collection(db, "teams"), {
        name: newTeamName.trim(),
        logo: newTeamLogo || "https://img.icons8.com/color/96/shield.png",
        group: newTeamGroup,
        p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, pts: 0
      });
      setNewTeamName('');
      setNewTeamLogo('');
      fetchData();
      alert("تمت إضافة الفريق بنجاح!");
    } catch (error) {
      console.error("خطأ:", error);
    }
  };

  const handleAddMatch = async (e) => {
    e.preventDefault();
    if (!homeTeam || !awayTeam || homeTeam === awayTeam) {
      alert("المرجو اختيار فريقين مختلفين!");
      return;
    }
    try {
      await addDoc(collection(db, "matches"), {
        home: homeTeam,
        away: awayTeam,
        stage: matchStage,
        homeScore: '',
        awayScore: '',
        status: 'مقبلة'
      });
      setHomeTeam('');
      setAwayTeam('');
      fetchData();
      alert("تمت برمجة اللقاء بنجاح!");
    } catch (error) {
      console.error("خطأ في إضافة المباريات:", error);
    }
  };

  const handleChangeStatus = async (matchId, newStatus) => {
    try {
      const matchRef = doc(db, "matches", matchId);
      await updateDoc(matchRef, { status: newStatus });
      fetchData();
    } catch (error) {
      console.error("خطأ في تحديث الحالة:", error);
    }
  };

  // تعديل إحصائيات الفريق مباشرة من جدول الترتيب
  const handleUpdateTeamStats = async (teamId, p, w, d, l, gf, ga, pts) => {
    try {
      const teamRef = doc(db, "teams", teamId);
      await updateDoc(teamRef, {
        p: parseInt(p) || 0,
        w: parseInt(w) || 0,
        d: parseInt(d) || 0,
        l: parseInt(l) || 0,
        gf: parseInt(gf) || 0,
        ga: parseInt(ga) || 0,
        pts: parseInt(pts) || 0
      });
      fetchData();
      alert("تم تحديث إحصائيات الفريق بنجاح!");
    } catch (error) {
      console.error("خطأ في تحديث الفريق:", error);
    }
  };

  const handleUpdateScore = async (match, hScore, aScore) => {
    if (hScore === '' || aScore === '' || isNaN(hScore) || isNaN(aScore)) {
      alert("المرجو إدخال أرقام صحيحة للنتيجة!");
      return;
    }
    const hs = parseInt(hScore);
    const as = parseInt(aScore);

    try {
      const matchRef = doc(db, "matches", match.id);
      await updateDoc(matchRef, {
        homeScore: hs,
        awayScore: as,
        status: 'انتهت'
      });
      fetchData();
      alert("تم تسجيل النتيجة بنجاح!");
    } catch (error) {
      console.error("خطأ في تحديث النتيجة:", error);
    }
  };

  const handleDeleteMatch = async (id) => {
    if (window.confirm("هل أنت متأكد من حذف هذه المباراة؟")) {
      try {
        await deleteDoc(doc(db, "matches", id));
        fetchData();
      } catch (error) {
        console.error("خطأ في الحذف:", error);
      }
    }
  };

  const handleDeleteTeam = async (id) => {
    if (window.confirm("هل أنت متأكد من حذف هذا الفريق؟")) {
      await deleteDoc(doc(db, "teams", id));
      fetchData();
    }
  };

  const groups = teams.reduce((acc, team) => {
    const g = team.group || 'المجموعة أ';
    if (!acc[g]) acc[g] = [];
    acc[g].push(team);
    return acc;
  }, {});

  const getTeamLogo = (teamName) => {
    const found = teams.find(t => t.name === teamName);
    return found ? found.logo : "https://img.icons8.com/color/96/shield.png";
  };

  if (userRole === null) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center items-center p-4 font-sans" dir="rtl">
        <div className="bg-slate-900 border border-slate-800 p-8 rounded-2xl max-w-md w-full shadow-2xl space-y-6 text-center">
          <div>
            <h1 className="text-2xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400">
              دوري الحي لكرة القدم 🏆
            </h1>
            <p className="text-slate-400 text-xs mt-2">المرجو إدخال رمز الدخول للمتابعة</p>
          </div>
          <form onSubmit={handleCodeLogin} className="space-y-4">
            <input
              type="password"
              placeholder="أدخل رمز الدخول هنا..."
              value={enteredCode}
              onChange={(e) => setEnteredCode(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-slate-200 text-center tracking-widest text-lg focus:outline-none focus:border-emerald-500"
              autoFocus
            />
            <button type="submit" className="w-full bg-emerald-500 text-slate-950 font-bold py-3 rounded-xl text-sm hover:bg-emerald-400 transition cursor-pointer shadow-lg">
              🔓 دخول للبطولة
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-8 font-sans" dir="rtl">
      
      <div className="max-w-4xl mx-auto mb-4 bg-amber-500/10 border border-amber-500/30 text-amber-300 px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-3 overflow-hidden shadow-md">
        <span className="bg-amber-500 text-slate-950 px-2 py-0.5 rounded font-bold uppercase tracking-wider text-[10px]">تنبيه هام 📢</span>
        <div className="whitespace-nowrap overflow-x-auto scrollbar-none">
          {announcement}
        </div>
      </div>

      <header className="max-w-4xl mx-auto text-center mb-8">
        <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400">
          دوري الحي لكرة القدم 🏆
        </h1>
        <p className="text-slate-400 text-sm mt-2">منصة البطولة الرسمية - متابعة حية لجميع النتائج</p>
      </header>

      <div className="max-w-4xl mx-auto flex flex-col md:flex-row justify-between items-center gap-3 mb-6">
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setActiveTab('standings')}
            className={`px-4 py-2 rounded-xl font-medium transition-all cursor-pointer ${activeTab === 'standings' ? 'bg-emerald-500 text-slate-950 shadow-lg' : 'bg-slate-900 text-slate-400'}`}
          >
            📊 ترتيب المجموعات
          </button>
          <button
            onClick={() => setActiveTab('matches')}
            className={`px-4 py-2 rounded-xl font-medium transition-all cursor-pointer ${activeTab === 'matches' ? 'bg-emerald-500 text-slate-950 shadow-lg' : 'bg-slate-900 text-slate-400'}`}
          >
            ⚽ جدول المباريات والنتائج
          </button>
          <button
            onClick={() => setActiveTab('participant_news')}
            className={`px-4 py-2 rounded-xl font-medium transition-all cursor-pointer ${activeTab === 'participant_news' ? 'bg-cyan-500 text-slate-950 shadow-lg' : 'bg-slate-900 text-slate-400'}`}
          >
            📢 مساحة النتائج والمواجهات
          </button>
        </div>

        <div className="flex gap-2 items-center">
          <span className="text-xs bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-800 text-emerald-400">
            {userRole === 'admin' ? '👑 مسجل كـمشرف' : '🛡️ مسجل كـمشارك'}
          </span>
          <button
            onClick={() => setUserRole(null)}
            className="px-3 py-1.5 bg-rose-950/60 text-rose-400 rounded-xl text-xs border border-rose-900 transition cursor-pointer"
          >
            قفل الصفحة
          </button>
        </div>
      </div>

      <main className="max-w-4xl mx-auto bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-2xl p-4 md:p-6 shadow-2xl">
        
        {userRole === 'admin' && (
          <div className="mb-8 p-5 bg-slate-950/95 rounded-xl border border-cyan-900/50 space-y-6 shadow-lg">
            <h3 className="text-lg font-bold text-cyan-400">⚙️ لوحة تحكم المشرف وإعدادات الأكواد</h3>
            
            <div className="bg-slate-900/80 p-4 rounded-xl border border-slate-800 space-y-3">
              <h4 className="text-sm font-bold text-amber-400 mb-2">🔐 تغيير رموز الدخول وشريط التنبيهات</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-center">
                <input
                  type="text"
                  placeholder="رمز المشرف الجديد..."
                  value={newAdminCode}
                  onChange={(e) => setNewAdminCode(e.target.value)}
                  className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 text-sm"
                />
                <input
                  type="text"
                  placeholder="رمز المشاركين الجديد..."
                  value={newPartCode}
                  onChange={(e) => setNewPartCode(e.target.value)}
                  className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 text-sm"
                />
                <button 
                  type="button" 
                  onClick={handleSaveSettings} 
                  className="bg-amber-500 text-slate-950 font-bold px-4 py-2 rounded-lg text-sm hover:bg-amber-400 transition cursor-pointer"
                >
                  حفظ التغييرات
                </button>
              </div>
              <div className="pt-2">
                <label className="text-xs text-slate-400 block mb-1">نص شريط التنبيهات في أعلى الموقع:</label>
                <input
                  type="text"
                  value={announcement}
                  onChange={(e) => setAnnouncement(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 text-sm"
                />
              </div>
            </div>

            <div className="bg-slate-900/80 p-4 rounded-xl border border-slate-800">
              <h4 className="text-sm font-bold text-emerald-400 mb-3">إضافة فريق جديد مع اختيار الشعار من الجهاز</h4>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-center">
                <input
                  type="text"
                  placeholder="اسم الفريق..."
                  value={newTeamName}
                  onChange={(e) => setNewTeamName(e.target.value)}
                  className="bg-slate-950 border border-slate-700 rounded-lg px-4 py-2 text-slate-200 text-sm focus:outline-none focus:border-emerald-500"
                />
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-slate-400">اختر شعار الفريق:</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="text-xs text-slate-400 file:mr-4 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-emerald-500 file:text-slate-950 hover:file:bg-emerald-400 cursor-pointer"
                  />
                </div>
                <select
                  value={newTeamGroup}
                  onChange={(e) => setNewTeamGroup(e.target.value)}
                  className="bg-slate-950 border border-slate-700 rounded-lg px-4 py-2 text-slate-200 text-sm focus:outline-none"
                >
                  <option value="المجموعة أ">المجموعة أ</option>
                  <option value="المجموعة ب">المجموعة ب</option>
                  <option value="المجموعة ج">المجموعة ج</option>
                  <option value="المجموعة د">المجموعة د</option>
                </select>
                <button 
                  type="button" 
                  onClick={handleAddTeam} 
                  className="bg-emerald-500 text-slate-950 font-bold px-5 py-2 rounded-lg text-sm hover:bg-emerald-400 transition cursor-pointer shadow-md"
                >
                  ➕ إضافة الفريق
                </button>
              </div>
            </div>

            <form onSubmit={handleAddMatch} className="bg-slate-900/80 p-4 rounded-xl border border-slate-800 space-y-3">
              <h4 className="text-sm font-bold text-cyan-400 mb-2">برمجة لقاء جديد</h4>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-center">
                <select
                  value={homeTeam}
                  onChange={(e) => setHomeTeam(e.target.value)}
                  className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 text-sm"
                >
                  <option value="">الفريق المضيف</option>
                  {teams.map(t => <option key={t.id} value={t.name}>{t.name}</option>)}
                </select>
                <select
                  value={awayTeam}
                  onChange={(e) => setAwayTeam(e.target.value)}
                  className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 text-sm"
                >
                  <option value="">الفريق الضيف</option>
                  {teams.map(t => <option key={t.id} value={t.name}>{t.name}</option>)}
                </select>
                <select
                  value={matchStage}
                  onChange={(e) => setMatchStage(e.target.value)}
                  className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 text-sm"
                >
                  <option value="مجموعات">دور المجموعات</option>
                  <option value="ربع النهائي">ربع النهائي</option>
                  <option value="نصف النهائي">نصف النهائي</option>
                  <option value="النهائي">النهائي 🏆</option>
                </select>
                <button type="submit" className="bg-cyan-500 text-slate-950 font-bold px-4 py-2 rounded-lg text-sm hover:bg-cyan-400 transition cursor-pointer">
                  برمجة اللقاء
                </button>
              </div>
            </form>
          </div>
        )}

        {activeTab === 'standings' ? (
          <div className="space-y-8">
            <h2 className="text-xl font-bold text-emerald-400">ترتيب المجموعات (يمكن للمشرف التعديل المباشر للأرقام)</h2>
            {Object.keys(groups).length === 0 ? (
              <p className="text-slate-500 text-center py-6">لا توجد فرق مضافة حالياً.</p>
            ) : (
              Object.keys(groups).map((groupName) => {
                const sortedGroupTeams = [...groups[groupName]].sort((a, b) => {
                  if (b.pts !== a.pts) return b.pts - a.pts;
                  return ((b.gf || 0) - (b.ga || 0)) - ((a.gf || 0) - (a.ga || 0));
                });

                return (
                  <div key={groupName} className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 shadow-md">
                    <h3 className="text-lg font-bold text-cyan-300 mb-3">{groupName}</h3>
                    <div className="overflow-x-auto">
                      <table className="w-full text-right border-collapse">
                        <thead>
                          <tr className="border-b border-slate-800 text-slate-400 text-xs">
                            <th className="py-2 px-2">#</th>
                            <th className="py-2 px-4">الفريق</th>
                            <th className="py-2 px-2 text-center">لعب</th>
                            <th className="py-2 px-2 text-center">فاز</th>
                            <th className="py-2 px-2 text-center">تعادل</th>
                            <th className="py-2 px-2 text-center">خسر</th>
                            <th className="py-2 px-2 text-center">له/عليه (أهداف)</th>
                            <th className="py-2 px-3 text-center">النقاط</th>
                            <th className="py-2 px-2 text-center">إدارة</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/40 text-sm">
                          {sortedGroupTeams.map((team, idx) => (
                            <tr key={team.id} className="hover:bg-slate-800/30">
                              <td className="py-2 px-2 text-slate-500 font-bold">{idx + 1}</td>
                              <td className="py-2 px-4 font-semibold text-slate-200 flex items-center gap-2">
                                <img src={team.logo} alt={team.name} className="w-6 h-6 object-contain rounded-full bg-slate-900 p-0.5 border border-slate-700" />
                                {team.name}
                              </td>

                              {userRole === 'admin' ? (
                                <>
                                  <td className="py-2 px-1 text-center">
                                    <input type="number" defaultValue={team.p || 0} onChange={(e) => team.tempP = e.target.value} className="w-10 bg-slate-900 border border-slate-700 text-center rounded text-cyan-300 py-0.5 text-xs" />
                                  </td>
                                  <td className="py-2 px-1 text-center">
                                    <input type="number" defaultValue={team.w || 0} onChange={(e) => team.tempW = e.target.value} className="w-10 bg-slate-900 border border-slate-700 text-center rounded text-emerald-400 py-0.5 text-xs" />
                                  </td>
                                  <td className="py-2 px-1 text-center">
                                    <input type="number" defaultValue={team.d || 0} onChange={(e) => team.tempD = e.target.value} className="w-10 bg-slate-900 border border-slate-700 text-center rounded text-amber-400 py-0.5 text-xs" />
                                  </td>
                                  <td className="py-2 px-1 text-center">
                                    <input type="number" defaultValue={team.l || 0} onChange={(e) => team.tempL = e.target.value} className="w-10 bg-slate-900 border border-slate-700 text-center rounded text-rose-400 py-0.5 text-xs" />
                                  </td>
                                  <td className="py-2 px-1 text-center">
                                    <div className="flex items-center justify-center gap-1">
                                      <input type="number" defaultValue={team.gf || 0} onChange={(e) => team.tempGf = e.target.value} className="w-9 bg-slate-900 border border-slate-700 text-center rounded text-slate-200 py-0.5 text-xs" title="له" />
                                      <span>/</span>
                                      <input type="number" defaultValue={team.ga || 0} onChange={(e) => team.tempGa = e.target.value} className="w-9 bg-slate-900 border border-slate-700 text-center rounded text-slate-200 py-0.5 text-xs" title="عليه" />
                                    </div>
                                  </td>
                                  <td className="py-2 px-1 text-center">
                                    <input type="number" defaultValue={team.pts || 0} onChange={(e) => team.tempPts = e.target.value} className="w-12 bg-slate-900 border border-slate-700 text-center rounded text-emerald-400 font-bold py-0.5 text-xs" />
                                  </td>
                                  <td className="py-2 px-2 text-center flex items-center justify-center gap-1">
                                    <button 
                                      onClick={() => handleUpdateTeamStats(
                                        team.id,
                                        team.tempP ?? team.p,
                                        team.tempW ?? team.w,
                                        team.tempD ?? team.d,
                                        team.tempL ?? team.l,
                                        team.tempGf ?? team.gf,
                                        team.tempGa ?? team.ga,
                                        team.tempPts ?? team.pts
                                      )}
                                      className="bg-emerald-500 text-slate-950 px-2 py-1 rounded text-[10px] font-bold hover:bg-emerald-400 cursor-pointer"
                                    >
                                      حفظ
                                    </button>
                                    <button onClick={() => handleDeleteTeam(team.id)} className="text-rose-400 hover:text-rose-300 text-[10px] bg-rose-950/50 px-2 py-1 rounded cursor-pointer">حذف</button>
                                  </td>
                                </>
                              ) : (
                                <>
                                  <td className="py-2 px-2 text-center">{team.p || 0}</td>
                                  <td className="py-2 px-2 text-center text-emerald-400">{team.w || 0}</td>
                                  <td className="py-2 px-2 text-center text-amber-400">{team.d || 0}</td>
                                  <td className="py-2 px-2 text-center text-rose-400">{team.l || 0}</td>
                                  <td className="py-2 px-2 text-center font-mono">
                                    {(team.gf || 0) - (team.ga || 0) > 0 ? `+${(team.gf || 0) - (team.ga || 0)}` : (team.gf || 0) - (team.ga || 0)}
                                  </td>
                                  <td className="py-2 px-3 text-center font-bold text-emerald-400 text-base">{team.pts || 0}</td>
                                  <td></td>
                                </>
                              )}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        ) : activeTab === 'matches' ? (
          <div>
            <h2 className="text-xl font-bold mb-4 text-emerald-400">جدول المباريات وإدارة النتائج والحالات</h2>
            {matches.length === 0 ? (
              <p className="text-slate-500 text-center py-6">لا توجد مباريات مبرمجة حالياً.</p>
            ) : (
              <div className="space-y-4">
                {matches.map((match) => {
                  return (
                    <div key={match.id} className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 flex flex-col md:flex-row items-center justify-between gap-4 shadow-md">
                      <div className="flex items-center gap-2">
                        <span className="bg-emerald-950 text-emerald-400 text-xs px-2.5 py-1 rounded-full font-bold">{match.stage}</span>
                      </div>
                      
                      <div className="flex items-center justify-center gap-3 w-full md:w-auto">
                        <div className="flex items-center gap-2 justify-end w-32">
                          <span className="font-semibold text-slate-200 text-right truncate">{match.home}</span>
                          <img src={getTeamLogo(match.home)} alt="" className="w-6 h-6 object-contain rounded-full bg-slate-900 p-0.5 border border-slate-700" />
                        </div>
                        
                        {userRole === 'admin' ? (
                          <div className="flex items-center gap-1">
                            <input 
                              type="number" 
                              defaultValue={match.homeScore} 
                              onChange={(e) => match.tempHome = e.target.value}
                              className="w-10 bg-slate-900 border border-slate-700 text-center rounded text-cyan-300 font-mono py-1" 
                            />
                            <span>-</span>
                            <input 
                              type="number" 
                              defaultValue={match.awayScore} 
                              onChange={(e) => match.tempAway = e.target.value}
                              className="w-10 bg-slate-900 border border-slate-700 text-center rounded text-cyan-300 font-mono py-1" 
                            />
                            <button 
                              onClick={() => handleUpdateScore(match, match.tempHome ?? match.homeScore, match.tempAway ?? match.awayScore)}
                              className="bg-emerald-500 text-slate-950 px-2 py-1 rounded text-xs font-bold hover:bg-emerald-400 cursor-pointer"
                            >
                              حفظ
                            </button>
                          </div>
                        ) : (
                          <span className="bg-slate-900 border border-slate-700 px-4 py-1 rounded-full text-sm font-mono tracking-wider text-cyan-300 font-bold">
                            {match.status === 'انتهت' ? `${match.homeScore} - ${match.awayScore}` : match.status}
                          </span>
                        )}

                        <div className="flex items-center gap-2 justify-start w-32">
                          <img src={getTeamLogo(match.away)} alt="" className="w-6 h-6 object-contain rounded-full bg-slate-900 p-0.5 border border-slate-700" />
                          <span className="font-semibold text-slate-200 text-left truncate">{match.away}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {userRole === 'admin' && (
                          <select 
                            value={match.status}
                            onChange={(e) => handleChangeStatus(match.id, e.target.value)}
                            className="bg-slate-900 border border-slate-700 text-xs text-slate-300 rounded px-2 py-1 focus:outline-none"
                          >
                            <option value="مقبلة">مقبلة ⏳</option>
                            <option value="انتهت">انتهت ✅</option>
                            <option value="مؤجلة">مؤجلة ⏱️</option>
                            <option value="ملغاة">ملغاة ❌</option>
                          </select>
                        )}
                        <span className={`text-xs px-2 py-1 rounded font-bold ${match.status === 'مؤجلة' ? 'bg-amber-950 text-amber-400' : match.status === 'ملغاة' ? 'bg-rose-950 text-rose-400' : 'text-slate-400'}`}>
                          {match.status}
                        </span>
                        {userRole === 'admin' && (
                          <button onClick={() => handleDeleteMatch(match.id)} className="bg-rose-950 text-rose-400 px-2 py-1 rounded text-xs hover:bg-rose-900 cursor-pointer">حذف</button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            <h2 className="text-xl font-bold text-cyan-400">📢 مساحة متابعة نتائج ومواجهات المشاركين</h2>
            <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-5 space-y-4">
              <p className="text-sm text-slate-300">
                مرحباً بك! هنا يمكنك الاطلاع على ملخصات آخر المباريات والنتائج وحالة المواجهات:
              </p>
              
              <div className="space-y-3 pt-2">
                {matches.length === 0 ? (
                  <p className="text-slate-500 text-sm italic">لم تنتهِ أي مباراة بعد. ستظهر النتائج فور تسجيلها من طرف المشرف.</p>
                ) : (
                  matches.map(m => (
                    <div key={m.id} className="bg-slate-900 border border-slate-800 p-3.5 rounded-xl flex flex-col md:flex-row justify-between items-center gap-3 text-sm">
                      <div className="flex items-center gap-2">
                        <img src={getTeamLogo(m.home)} alt="" className="w-6 h-6 object-contain rounded-full bg-slate-950 p-0.5 border border-slate-800" />
                        <span className="font-bold text-emerald-400">{m.home}</span>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <span className="bg-slate-950 border border-slate-800 px-4 py-1 rounded-lg font-mono text-cyan-300 font-bold tracking-widest text-base">
                          {m.status === 'انتهت' ? `${m.homeScore} - ${m.awayScore}` : m.status}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="font-bold text-rose-400">{m.away}</span>
                        <img src={getTeamLogo(m.away)} alt="" className="w-6 h-6 object-contain rounded-full bg-slate-950 p-0.5 border border-slate-800" />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}