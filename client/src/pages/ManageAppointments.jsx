import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api";

const STATUS = { booked: "נקבע", cancelled: "בוטל", done: "הושלם" };

export default function ManageAppointments() {
  const [list, setList] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const navigate = useNavigate();

  useEffect(() => {
    api.get("/admin/appointments").then((res) => {
      setList(res.data);
      setLoaded(true);
    });
  }, []);

  const shown = list
    .filter((a) =>
      a.clientName.toLowerCase().includes(search.trim().toLowerCase()) ||
      a.barberName.toLowerCase().includes(search.trim().toLowerCase())
    )
    .filter((a) => statusFilter === "all" || a.status === statusFilter);

  return (
    <div className="min-h-screen p-6 max-w-5xl mx-auto">
      <button onClick={() => navigate("/")} className="mb-4 text-blue-600 underline">
        חזרה לדף הבית
      </button>
      <h1 className="text-2xl font-bold mb-6">ניהול תורים כולל</h1>

      {loaded && list.length === 0 && (
        <div className="bg-yellow-100 text-yellow-800 p-3 rounded">אין תורים קיימים במערכת</div>
      )}

      {list.length > 0 && (
        <div className="bg-white p-4 rounded shadow mb-4 flex flex-wrap gap-3 items-center">
          <input type="text" placeholder="חיפוש לפי שם לקוח או ספר"
                 value={search} onChange={(e) => setSearch(e.target.value)}
                 className="border rounded p-2 flex-1 min-w-[180px]" />

          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="border rounded p-2">
            <option value="all">כל הסטטוסים</option>
            {Object.keys(STATUS).map((s) => <option key={s} value={s}>{STATUS[s]}</option>)}
          </select>
        </div>
      )}

      {list.length > 0 && shown.length === 0 && (
        <p className="text-gray-600 mb-3">לא נמצאו תורים מתאימים</p>
      )}

      {shown.length > 0 && (
        <table className="bg-white rounded shadow w-full text-right">
          <thead>
            <tr className="bg-yellow-100">
              <th className="p-2">תאריך</th>
              <th className="p-2">שעה</th>
              <th className="p-2">לקוח</th>
              <th className="p-2">ספר</th>
              <th className="p-2">סטטוס</th>
            </tr>
          </thead>
          <tbody>
            {shown.map((a) => (
              <tr key={a.id} className="border-t">
                <td className="p-2">{a.date}</td>
                <td className="p-2">{a.time}</td>
                <td className="p-2">{a.clientName}</td>
                <td className="p-2">{a.barberName}</td>
                <td className="p-2">{STATUS[a.status]}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
