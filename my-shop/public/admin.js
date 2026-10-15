// Админка: загрузка и рендер заказов
const ordersBody = document.getElementById('orders-body');
const emptyMsg = document.getElementById('empty-msg');

// Элементы блока товаров
const form = document.getElementById('add-product-form');
const formMsg = document.getElementById('product-form-msg');
const productsBody = document.getElementById('products-body');
const productsEmpty = document.getElementById('products-empty');

async function loadOrders() {
  try {
    const res = await fetch('/api/orders');
    if (!res.ok) throw new Error('Ошибка загрузки');
    const orders = await res.json();
    renderOrders(orders);
  } catch (err) {
    console.error(err);
    ordersBody.innerHTML =
      '<tr><td colspan="5" class="px-4 py-10 text-center text-gray-500">Не удалось загрузить заказы</td></tr>';
  }
}

// Парсим JSON-строку с товарами и возвращаем названия через запятую
function formatItems(items) {
  try {
    const parsed = typeof items === 'string' ? JSON.parse(items) : items;
    if (!Array.isArray(parsed)) return String(parsed ?? '');
    return parsed.map((item) => item.title || item.name || 'Товар').join(', ');
  } catch {
    return String(items ?? '');
  }
}

function formatDate(date) {
  return new Date(date).toLocaleString('ru-RU');
}

function renderOrders(orders) {
  if (!orders.length) {
    emptyMsg.classList.remove('hidden');
    return;
  }

  ordersBody.innerHTML = orders
    .map(
      (order) => `
      <tr class="border-b border-gray-100 hover:bg-gray-50">
        <td class="px-4 py-3 font-medium">${order.id}</td>
        <td class="px-4 py-3">${order.customer_name}</td>
        <td class="px-4 py-3">${formatItems(order.items)}</td>
        <td class="px-4 py-3">${new Intl.NumberFormat('ru-RU').format(order.total)} ₽</td>
        <td class="px-4 py-3 text-gray-500">${formatDate(order.created_at)}</td>
      </tr>
    `
    )
    .join('');
}

// ---------- Товары ----------

// Загрузка и рендер списка товаров
async function loadProducts() {
  try {
    const res = await fetch('/api/products');
    if (!res.ok) throw new Error('Ошибка загрузки');
    const products = await res.json();
    renderProducts(products);
  } catch (err) {
    console.error(err);
    productsBody.innerHTML =
      '<tr><td colspan="4" class="px-4 py-10 text-center text-gray-500">Не удалось загрузить товары</td></tr>';
  }
}

function renderProducts(products) {
  if (!products.length) {
    productsBody.innerHTML = '';
    productsEmpty.classList.remove('hidden');
    return;
  }

  productsEmpty.classList.add('hidden');
  productsBody.innerHTML = products
    .map(
      (product) => `
      <tr class="border-b border-gray-100 hover:bg-gray-50">
        <td class="px-4 py-3 font-medium">${product.id}</td>
        <td class="px-4 py-3">${product.title}</td>
        <td class="px-4 py-3">${new Intl.NumberFormat('ru-RU').format(product.price)} ₽</td>
        <td class="px-4 py-3">
          <button data-id="${product.id}" data-title="${product.title}"
                  class="delete-product bg-red-500 text-white text-xs font-medium px-3 py-1.5 rounded-lg hover:bg-red-600 transition">
            Удалить
          </button>
        </td>
      </tr>
    `
    )
    .join('');
}

// Вспомогательная функция: показать сообщение под формой
function showFormMsg(text, isError = true) {
  formMsg.textContent = text;
  formMsg.classList.remove('hidden', 'text-green-600');
  formMsg.classList.add(isError ? 'text-red-600' : 'text-green-600');
}

// Отправка формы добавления товара
form.addEventListener('submit', async (e) => {
  e.preventDefault();

  const title = document.getElementById('product-title').value.trim();
  const price = document.getElementById('product-price').value;
  const image = document.getElementById('product-image').value.trim();
  const description = document.getElementById('product-description').value.trim();

  try {
    const res = await fetch('/api/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, price, image, description })
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || 'Ошибка добавления товара');
    }

    // Успех: очищаем форму, показываем сообщение, обновляем список
    form.reset();
    showFormMsg('Товар добавлен!', false);
    setTimeout(() => formMsg.classList.add('hidden'), 3000);
    loadProducts();
  } catch (err) {
    console.error(err);
    showFormMsg(err.message);
  }
});

// Удаление товара (по делегированию событий)
productsBody.addEventListener('click', async (e) => {
  const btn = e.target.closest('.delete-product');
  if (!btn) return;

  if (!confirm(`Удалить товар «${btn.dataset.title}»?`)) return;

  try {
    const res = await fetch(`/api/products/${btn.dataset.id}`, {
      method: 'DELETE'
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || 'Ошибка удаления');
    }

    loadProducts();
  } catch (err) {
    console.error(err);
    alert(err.message);
  }
});

// Старт
loadOrders();
loadProducts();