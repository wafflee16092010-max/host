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

// Удаляем старые тестовые товары (если они ещё в БД), чтобы подменить их реальными
db.exec(
  "DELETE FROM products WHERE title IN ('Футболка','Джинсы','Куртка','Кроссовки','Худи','Кепка')"
);

// Проверяем, пустая ли таблица, и при первом запуске заполняем реальными товарами
const count = db.prepare('SELECT COUNT(*) AS cnt FROM products').get().cnt;
if (count === 0) {
  const insert = db.prepare(
    'INSERT INTO products (title, price, image, description) VALUES (@title, @price, @image, @description)'
  );

  const seed = [
    {
      title: 'Платье «Милан»',
      price: 6900,
      image: 'https://placehold.co/600x800/2a1a10/e6c87a?text=Милан',
      description: '60% лён, 40% вискоза. Длина 124 см, рукав ¾, потайная молния.'
    },
    {
      title: 'Рубашка «Тиволи»',
      price: 4200,
      image: 'https://placehold.co/600x800/2a1a10/e6c87a?text=Тиволи',
      description: '100% хлопок, поплин 120 г/м². Oversize, удлинённая спинка.'
    },
    {
      title: 'Юбка «Кассель»',
      price: 3800,
      image: 'https://placehold.co/600x800/2a1a10/e6c87a?text=Кассель',
      description: '70% шерсть, 30% вискоза. Миди, пояс на резинке сзади.'
    },
    {
      title: 'Брюки «Палермо»',
      price: 5400,
      image: 'https://placehold.co/600x800/2a1a10/e6c87a?text=Палермо',
      description: '55% лён, 45% вискоза. Строгий пояс, два кармана, длина 100 см.'
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