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
  const { title, price, description = '', image = '' } = req.body;

  if (!title || typeof title !== 'string' || !title.trim()) {
    return res.status(400).json({ error: 'Название товара обязательно' });
  }
  const numPrice = Number(price);
  if (!Number.isFinite(numPrice) || numPrice < 0) {
    return res.status(400).json({ error: 'Цена должна быть числом не меньше 0' });
  }

  const result = db
    .prepare('INSERT INTO products (title, price, image, description) VALUES (?, ?, ?, ?)')
    .run(title.trim(), Math.round(numPrice), image, description);

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