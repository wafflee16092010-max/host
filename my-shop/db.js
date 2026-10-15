const Database = require('better-sqlite3');
const path = require('path');

// Путь к файлу БД (создаётся автоматически, если его нет)
const db = new Database(path.join(__dirname, 'database.db'));

// Включаем внешние ключи, повышаем надёжность
db.pragma('journal_mode = WAL');

// Создаём таблицу products, если её ещё нет
db.exec(`
  CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    price INTEGER NOT NULL,
    image TEXT,
    description TEXT
  );
`);

// Проверяем, пустая ли таблица, и при первом запуске заполняем тестовыми товарами
const count = db.prepare('SELECT COUNT(*) AS cnt FROM products').get().cnt;
if (count === 0) {
  const insert = db.prepare(
    'INSERT INTO products (title, price, image, description) VALUES (@title, @price, @image, @description)'
  );

  const seed = [
    {
      title: 'Футболка',
      price: 1500,
      image: 'https://placehold.co/400x400?text=Футболка',
      description: 'Базовая хлопковая футболка, дышит и не теряет форму.'
    },
    {
      title: 'Джинсы',
      price: 3500,
      image: 'https://placehold.co/400x400?text=Джинсы',
      description: 'Классические джинсы из плотного денима.'
    },
    {
      title: 'Куртка',
      price: 7000,
      image: 'https://placehold.co/400x400?text=Куртка',
      description: 'Лёгкая куртка на подкладке для прохладной погоды.'
    },
    {
      title: 'Кроссовки',
      price: 5000,
      image: 'https://placehold.co/400x400?text=Кроссовки',
      description: 'Удобные кроссовки на каждый день.'
    },
    {
      title: 'Худи',
      price: 2500,
      image: 'https://placehold.co/400x400?text=Худи',
      description: 'Тёплое худи из мягкого футера.'
    },
    {
      title: 'Кепка',
      price: 900,
      image: 'https://placehold.co/400x400?text=Кепка',
      description: 'Кепка с регулируемым размером. Защитит от солнца.'
    }
  ];

  const insertMany = db.transaction((items) => {
    for (const item of items) insert.run(item);
  });
  insertMany(seed);
}

// Создаём таблицу orders, если её ещё нет
db.exec(`
  CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_name TEXT,
    items TEXT,
    total INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

// Экспортируем объект базы данных
module.exports = db;