import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api";

const EMPTY = { name: "", description: "", price: "", stock: "", image: "" };
const DELIVERY = { pickup: "איסוף עצמי", delivery: "משלוח" };

export default function ManageShop() {
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [editId, setEditId] = useState(null);
  const [pending, setPending] = useState(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [productSearch, setProductSearch] = useState("");
  const [orderSearch, setOrderSearch] = useState("");
  const navigate = useNavigate();

  function loadAll() {
    api.get("/shop/products").then((res) => setProducts(res.data));
    api.get("/shop/orders").then((res) => { setOrders(res.data); setLoaded(true); });
  }
  useEffect(loadAll, []);

  const shownProducts = products.filter((p) =>
    p.name.toLowerCase().includes(productSearch.trim().toLowerCase())
  );

  const shownOrders = orders.filter((o) =>
    o.orderNumber.includes(orderSearch.trim()) ||
    o.clientName.toLowerCase().includes(orderSearch.trim().toLowerCase())
  );

  function change(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  function startEdit(p) {
    setEditId(p._id);
    setForm({ name: p.name, description: p.description, price: p.price, stock: p.stock, image: p.image });
    setMessage(""); setError("");
  }

  function cancelEdit() {
    setEditId(null);
    setForm(EMPTY);
  }

  function submit(e) {
    e.preventDefault();
    setMessage(""); setError("");
    setPending({ type: editId ? "update" : "add" });
  }

  async function confirm() {
    try {
      let res;
      if (pending.type === "add") {
        res = await api.post("/shop/products", form);
      } else if (pending.type === "update") {
        res = await api.put("/shop/products/" + editId, form);
      } else {
        res = await api.delete("/shop/products/" + pending.product._id);
      }
      setMessage(res.data.message);
      cancelEdit();
      loadAll();
    } catch (err) {
      setError(err.response?.data?.message || "שגיאה בעדכון החנות");
    }
    setPending(null);
  }

  return (
    <div className="min-h-screen p-6 max-w-5xl mx-auto">
      <button onClick={() => navigate("/")} className="mb-4 text-blue-600 underline">
        חזרה לדף הבית
      </button>
      <h1 className="text-2xl font-bold mb-6">ניהול החנות וההזמנות</h1>

      {message && <div className="bg-green-100 text-green-700 p-2 rounded mb-3">{message}</div>}
      {error && <div className="bg-red-100 text-red-700 p-2 rounded mb-3">{error}</div>}

      <div className="bg-white p-6 rounded shadow max-w-lg mb-8">
        <h2 className="font-bold mb-3">{editId ? "עדכון מוצר" : "הוספת מוצר חדש"}</h2>
        <form onSubmit={submit}>
          <label className="block mb-1">שם המוצר</label>
          <input name="name" value={form.name} onChange={change} className="w-full border rounded p-2 mb-3" />

          <label className="block mb-1">תיאור</label>
          <input name="description" value={form.description} onChange={change} className="w-full border rounded p-2 mb-3" />

          <label className="block mb-1">מחיר</label>
          <input type="number" name="price" value={form.price} onChange={change} className="w-full border rounded p-2 mb-3" />

          <label className="block mb-1">כמות במלאי</label>
          <input type="number" name="stock" value={form.stock} onChange={change} className="w-full border rounded p-2 mb-3" />

          <label className="block mb-1">קישור לתמונה</label>
          <input name="image" value={form.image} onChange={change} className="w-full border rounded p-2 mb-4" />

          <button type="submit" className="bg-yellow-600 text-white px-4 py-2 rounded ml-2">שמירה</button>
          {editId && <button type="button" onClick={cancelEdit} className="border px-4 py-2 rounded">ביטול</button>}
        </form>
      </div>

      <h2 className="font-bold mb-3">מוצרי החנות</h2>
      <input type="text" placeholder="חיפוש מוצר לפי שם"
             value={productSearch} onChange={(e) => setProductSearch(e.target.value)}
             className="border rounded p-2 mb-3 w-full max-w-sm" />
      {products.length > 0 && shownProducts.length === 0 && (
        <p className="text-gray-600 mb-3">לא נמצאו מוצרים מתאימים</p>
      )}
      <table className="bg-white rounded shadow w-full text-right mb-8">
        <thead>
          <tr className="bg-yellow-100">
            <th className="p-2">שם</th>
            <th className="p-2">מחיר</th>
            <th className="p-2">מלאי</th>
            <th className="p-2">פעולות</th>
          </tr>
        </thead>
        <tbody>
          {shownProducts.map((p) => (
            <tr key={p._id} className="border-t">
              <td className="p-2">{p.name}</td>
              <td className="p-2">{p.price} ש"ח</td>
              <td className="p-2">{p.stock}</td>
              <td className="p-2">
                <button onClick={() => startEdit(p)} className="text-blue-600 underline ml-3">עדכון</button>
                <button onClick={() => setPending({ type: "delete", product: p })} className="text-red-600 underline">
                  מחיקה
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2 className="font-bold mb-3">הזמנות</h2>
      {loaded && orders.length === 0 ? (
        <div className="bg-yellow-100 text-yellow-800 p-3 rounded">אין הזמנות קיימות במערכת</div>
      ) : (
        <>
        <input type="text" placeholder="חיפוש לפי מספר הזמנה או שם לקוח"
               value={orderSearch} onChange={(e) => setOrderSearch(e.target.value)}
               className="border rounded p-2 mb-3 w-full max-w-sm" />
        {orders.length > 0 && shownOrders.length === 0 && (
          <p className="text-gray-600 mb-3">לא נמצאו הזמנות מתאימות</p>
        )}
        <table className="bg-white rounded shadow w-full text-right">
          <thead>
            <tr className="bg-yellow-100">
              <th className="p-2">מספר הזמנה</th>
              <th className="p-2">לקוח</th>
              <th className="p-2">מוצרים</th>
              <th className="p-2">אופן קבלה</th>
              <th className="p-2">סכום</th>
            </tr>
          </thead>
          <tbody>
            {shownOrders.map((o) => (
              <tr key={o.id} className="border-t">
                <td className="p-2">{o.orderNumber}</td>
                <td className="p-2">{o.clientName}</td>
                <td className="p-2">{o.items.map((i) => i.name + " x" + i.quantity).join(", ")}</td>
                <td className="p-2">{DELIVERY[o.deliveryType]}</td>
                <td className="p-2">{o.totalPrice} ש"ח</td>
              </tr>
            ))}
          </tbody>
        </table>
        </>
      )}

      {pending && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center">
          <div className="bg-white p-6 rounded shadow max-w-sm text-center">
            <p className="mb-4">
              {pending.type === "add" && "להוסיף את המוצר לחנות?"}
              {pending.type === "update" && "לשמור את העדכון למוצר?"}
              {pending.type === "delete" && "למחוק את המוצר " + pending.product.name + " מהחנות?"}
            </p>
            <button onClick={confirm} className="bg-yellow-600 text-white px-4 py-1 rounded ml-2">כן</button>
            <button onClick={() => setPending(null)} className="border px-4 py-1 rounded">לא</button>
          </div>
        </div>
      )}
    </div>
  );
}
