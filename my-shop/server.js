require('dotenv').config();
const express = require('express');
const path = require('path');
const cors = require('cors');
const db = require('./db');

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Статические файлы из папки public
app.use(express.static('public'));

// ───────── Авторизация админки (HTTP Basic Auth) ─────────
const ADMIN_USER = 'admin';
const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';

if (!process.env.ADMIN_PASSWORD) {
  console.warn('⚠️  ADMIN_PASSWORD не задан — используется дефолтный пароль admin123');
}

// Защищает /admin, просмотр заказов (GET /api/orders) и запись товаров (POST/DELETE /api/products).
// GET /api/products и POST /api/orders (оформление с витрины) остаются публичными.
function requireAuth(req, res, next) {
  const adminPage = req.path === '/admin' || req.path.startsWith('/admin/');
  const ordersRead = req.path.startsWith('/api/orders') && req.method === 'GET';
  const productsWrite =
    req.path.startsWith('/api/products') &&
    (req.method === 'POST' || req.method === 'DELETE');

  if (!(adminPage || ordersRead || productsWrite)) return next();

  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');
  const valid =
    scheme === 'Basic' &&
    Buffer.from(token || '', 'base64').toString('utf8') ===
      `${ADMIN_USER}:${adminPassword}`;

  if (valid) return next();

  res.setHeader('WWW-Authenticate', 'Basic realm="Admin"');
  return res.status(401).send('Unauthorized');
}

app.use(requireAuth);

// Роуты
app.get('/api/products', (req, res) => {
  const products = db.prepare('SELECT * FROM products').all();
  res.json(products);
});

app.get('/api/products/:id', (req, res) => {
  const product = db
    .prepare('SELECT * FROM products WHERE id = ?')
    .get(req.params.id);
  if (!product) {
    return res.status(404).json({ error: 'Товар не найден' });
  }
  res.json(product);
});

// Добавление товара
app.post('/api/products', (req, res) => {
  const { title, price, description = '', image = '', sizes = null } = req.body;

  if (!title || typeof title !== 'string' || !title.trim()) {
    return res.status(400).json({ error: 'Название товара обязательно' });
  }
  const numPrice = Number(price);
  if (!Number.isFinite(numPrice) || numPrice < 0) {
    return res.status(400).json({ error: 'Цена должна быть числом не меньше 0' });
  }

  const sizesJson = sizes == null || sizes === ''
    ? null
    : typeof sizes === 'string' ? sizes : JSON.stringify(sizes);

  const result = db
    .prepare('INSERT INTO products (title, price, image, description, sizes) VALUES (?, ?, ?, ?, ?)')
    .run(title.trim(), Math.round(numPrice), image, description, sizesJson);

  res.json({ success: true, productId: result.lastInsertRowid });
});

// Удаление товара
app.delete('/api/products/:id', (req, res) => {
  const result = db.prepare('DELETE FROM products WHERE id = ?').run(req.params.id);
  if (result.changes === 0) {
    return res.status(404).json({ error: 'Товар не найден' });
  }
  res.json({ success: true });
});

// Сохранение заказа
app.post('/api/orders', (req, res) => {
  const { customer_name, items, total } = req.body;

  if (!customer_name || !items || total == null) {
    return res.status(400).json({ error: 'Не хватает данных заказа' });
  }

  // items приходит массивом — храним как JSON-строку
  const itemsJson = typeof items === 'string' ? items : JSON.stringify(items);

  const result = db
    .prepare('INSERT INTO orders (customer_name, items, total) VALUES (?, ?, ?)')
    .run(customer_name, itemsJson, total);

  res.json({ success: true, orderId: result.lastInsertRowid });
});

// Админка
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// Все заказы (сначала новые)
app.get('/api/orders', (req, res) => {
  const orders = db
    .prepare('SELECT * FROM orders ORDER BY created_at DESC, id DESC')
    .all();
  res.json(orders);
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});