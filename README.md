# GOLDEN HAIR SALON

אתר לניהול תורים במספרת גברים ולמכירת מוצרים הקשורים לשיער.

- **client** – צד הלקוח: React + Vite + Tailwind CSS
- **server** – צד השרת: Node.js + Express, מסד נתונים MongoDB

## הרצה

### שרת

```
cd server
npm install
```

יוצרים קובץ `.env` לפי `.env.example` וממלאים בו את כתובת מסד הנתונים ואת `JWT_SECRET`.

```
npm run seed    # יוצר מנהל ראשי, שני ספרים ומוצרים לחנות
npm run dev     # השרת עולה בפורט 5000
```

### לקוח

```
cd client
npm install
npm run dev     # האתר עולה בכתובת http://localhost:3000
```

### בדיקות

```
cd server
npm test
```
