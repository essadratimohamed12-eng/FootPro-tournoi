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
  const [teams, setTeams] = useState([]);
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);

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

      const homeTeamObj = teams.find(t => t.name.trim() === match.home.trim());
      const awayTeamObj = teams.find(t => t.name.trim() === match.away.trim());

      if (homeTeamObj && awayTeamObj) {
        let homeWin = hs > as ? 1 : 0;
        let homeDraw = hs === as ? 1 : 0;
        let homeLoss = hs < as ? 1 : 0;
        let homePts = homeWin * 3 + homeDraw * 1;

        let awayWin = as > hs ? 1 : 0;
        let awayDraw = hs === as ? 1 : 0;
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
      alert("تم تسجيل النتيجة وتحديث الترتيب أوتوماتيكياً بنجاح! 🏆");
    } catch (error) {
      console.error("خطأ في تحديث النتيجة:", error);
      alert("حدث خطأ أثناء حفظ النتيجة.");
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

  if (loading) {
    return <div style={{ color: '#fff', textAlign: 'center', marginTop: '50px' }}>جاري تحميل البيانات...</div>;
  }

  return (
    <div style={{ padding: '20px', color: '#fff', backgroundColor: '#0b0f19', minHeight: '100vh', fontFamily: 'Cairo, sans-serif' }}>
      <h1 style={{ textAlign: 'center', marginBottom: '30px' }}>إدارة بطولات كرة القدم - FootPro</h1>
      
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        <h2>المباريات</h2>
        {matches.map((match) => (
          <div key={match.id} style={{ background: '#1e293b', padding: '15px', marginBottom: '10px', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>{match.home}</span>
            <div>
              <input 
                type="number" 
                defaultValue={match.homeScore ?? ''} 
                id={`h-${match.id}`} 
                style={{ width: '40px', textAlign: 'center', marginRight: '5px' }} 
              />
              -
              <input 
                type="number" 
                defaultValue={match.awayScore ?? ''} 
                id={`a-${match.id}`} 
                style={{ width: '40px', textAlign: 'center', marginLeft: '5px' }} 
              />
              <button 
                onClick={() => {
                  const h = document.getElementById(`h-${match.id}`).value;
                  const a = document.getElementById(`a-${match.id}`).value;
                  handleUpdateScore(match, h, a);
                }}
                style={{ marginLeft: '10px', background: '#06b6d4', border: 'none', padding: '5px 10px', borderRadius: '4px', cursor: 'pointer', color: '#fff' }}
              >
                حفظ
              </button>
            </div>
            <span>{match.away}</span>
            <button 
              onClick={() => handleDeleteMatch(match.id)}
              style={{ background: '#ef4444', border: 'none', padding: '5px 8px', borderRadius: '4px', color: '#fff', cursor: 'pointer' }}
            >
              حذف
            </button>
          </div>
        ))}

        <h2 style={{ marginTop: '40px' }}>ترتيب المجموعات</h2>
        <table style={{ width: '100%', borderCollapse: 'collapse', background: '#1e293b', borderRadius: '8px', overflow: 'hidden' }}>
          <thead>
            <tr style={{ background: '#334155', textAlign: 'center' }}>
              <th style={{ padding: '10px' }}>الفريق</th>
              <th>لعب</th>
              <th>فاز</th>
              <th>تعادل</th>
              <th>خسر</th>
              <th>له</th>
              <th>عليه</th>
              <th>النقاط</th>
            </tr>
          </thead>
          <tbody>
            {teams.sort((a, b) => (b.pts || 0) - (a.pts || 0)).map((team) => (
              <tr key={team.id} style={{ textAlign: 'center', borderBottom: '1px solid #334155' }}>
                <td style={{ padding: '10px', textAlign: 'right' }}>{team.name}</td>
                <td>{team.p || 0}</td>
                <td>{team.w || 0}</td>
                <td>{team.d || 0}</td>
                <td>{team.l || 0}</td>
                <td>{team.gf || 0}</td>
                <td>{team.ga || 0}</td>
                <td style={{ fontWeight: 'bold', color: '#38bdf8' }}>{team.pts || 0}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}