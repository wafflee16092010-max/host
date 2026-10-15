// Корзина в localStorage
let cart = JSON.parse(localStorage.getItem('cart')) || [];

// Элементы DOM
const grid = document.getElementById('products-grid');
const cartCount = document.getElementById('cart-count');
const cartOverlay = document.getElementById('cart-overlay');
const cartItems = document.getElementById('cart-items');
const cartTotal = document.getElementById('cart-total');
const cartClose = document.getElementById('cart-close');
const checkoutBtn = document.getElementById('checkout-btn');

// Обновляем счётчик на старте
updateCartCount();

// Загрузка товаров с сервера
async function loadProducts() {
  try {
    const res = await fetch('/api/products');
    if (!res.ok) throw new Error('Ошибка загрузки');
    const products = await res.json();
    renderProducts(products);
  } catch (err) {
    console.error(err);
    grid.innerHTML = '<p class="text-gray-500">Товары скоро появятся</p>';
  }
}

// Рендер карточек
function renderProducts(products) {
  if (!products.length) {
    grid.innerHTML = '<p class="text-gray-500">Товары скоро появятся</p>';
    return;
  }

  grid.innerHTML = products.map((product) => {
    const price = new Intl.NumberFormat('ru-RU').format(product.price);
    return `
      <div class="bg-white rounded-xl shadow-sm hover:shadow-md transition overflow-hidden flex flex-col">
        <img src="${product.image}" alt="${product.title}" loading="lazy"
             class="w-full h-64 object-cover">
        <div class="p-4 flex flex-col flex-1">
          <h3 class="font-semibold text-lg mb-1">${product.title}</h3>
          <p class="text-sm text-gray-500 mb-4 flex-1">${product.description}</p>
          <div class="flex items-center justify-between mt-auto">
            <span class="text-xl font-bold text-gray-900">${price} ₽</span>
            <button data-id="${product.id}" data-title="${product.title}"
                    data-price="${product.price}" data-image="${product.image}"
                    class="add-to-cart bg-blue-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-blue-700 transition">
              В корзину
            </button>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

// Добавление товара в корзину (по делегированию событий)
grid.addEventListener('click', (e) => {
  const btn = e.target.closest('.add-to-cart');
  if (!btn) return;

  const product = {
    id: +btn.dataset.id,
    title: btn.dataset.title,
    price: +btn.dataset.price,
    image: btn.dataset.image
  };

  // Объединяем дубликаты: если товар уже в корзине — увеличиваем количество
  const existing = cart.find((item) => item.id === product.id);
  if (existing) {
    existing.qty = (existing.qty || 1) + 1;
  } else {
    cart.push({ ...product, qty: 1 });
  }

  localStorage.setItem('cart', JSON.stringify(cart));
  updateCartCount();
  btn.textContent = 'Добавлено ✓';
  btn.classList.add('bg-green-600');
  setTimeout(() => {
    btn.textContent = 'В корзину';
    btn.classList.remove('bg-green-600');
  }, 1000);
});

// ---------- Корзина: модальное окно ----------

// Открытие модалки (иконка корзины в шапке)
document.getElementById('cart-btn').addEventListener('click', () => {
  renderCart();
  cartOverlay.classList.remove('hidden');
});

// Закрытие по крестику
cartClose.addEventListener('click', closeCart);

// Закрытие по клику вне панели (на затемнённый фон)
cartOverlay.addEventListener('click', (e) => {
  if (e.target === cartOverlay) closeCart();
});

// Закрытие по Esc
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeCart();
});

function closeCart() {
  cartOverlay.classList.add('hidden');
}

// Рендер товаров внутри корзины
function renderCart() {
  if (!cart.length) {
    cartItems.innerHTML = '<p class="text-gray-500 text-center py-10">Корзина пуста</p>';
    cartTotal.textContent = '0 ₽';
    return;
  }

  cartItems.innerHTML = cart.map((item, index) => {
    const price = new Intl.NumberFormat('ru-RU').format(item.price);
    const qty = item.qty || 1;
    const lineTotal = new Intl.NumberFormat('ru-RU').format(item.price * qty);
    return `
      <div class="flex items-center gap-4">
        <img src="${item.image}" alt="${item.title}"
             class="w-16 h-16 object-cover rounded-lg shrink-0">
        <div class="flex-1 min-w-0">
          <p class="font-medium truncate">${item.title} × ${qty} шт.</p>
          <p class="text-sm text-gray-500">${price} ₽ / шт. — ${lineTotal} ₽</p>
        </div>
        <button data-index="${index}" class="remove-item text-red-500 hover:text-red-700 transition shrink-0" aria-label="Удалить">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/>
          </svg>
        </button>
      </div>
    `;
  }).join('');

  updateCartTotal();
}

// Удаление товара (по делегированию событий)
cartItems.addEventListener('click', (e) => {
  const btn = e.target.closest('.remove-item');
  if (!btn) return;

  cart.splice(+btn.dataset.index, 1);
  localStorage.setItem('cart', JSON.stringify(cart));
  updateCartCount();
  renderCart();
});

// Подсчёт итоговой суммы (с учётом количества)
function updateCartTotal() {
  const total = cart.reduce((sum, item) => sum + item.price * (item.qty || 1), 0);
  cartTotal.textContent = new Intl.NumberFormat('ru-RU').format(total) + ' ₽';
}

// Оформление заказа
checkoutBtn.addEventListener('click', async () => {
  // Если корзина пуста — не даём оформить
  if (!cart.length) return;

  const customer_name = prompt('Введите ваше имя:');
  if (!customer_name) return; // имя не введено — прерываем

  try {
    // Строки заказа в формате: Название — N шт. — сумма ₽
    const orderLines = cart
      .map(
        (item) =>
          `${item.title} — ${item.qty || 1} шт. — ${new Intl.NumberFormat('ru-RU').format(
            item.price * (item.qty || 1)
          )} ₽`
      )
      .join('\n');

    const res = await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customer_name,
        items: cart,
        total: cart.reduce((sum, item) => sum + item.price * (item.qty || 1), 0)
      })
    });

    if (!res.ok) throw new Error('Ошибка сервера');

    const data = await res.json();

    // Успех: очищаем корзину, закрываем модалку, показываем сообщение
    alert(`Спасибо, ${customer_name}! Ваш заказ №${data.orderId} принят.\n\n${orderLines}`);
    cart = [];
    localStorage.setItem('cart', JSON.stringify(cart));
    updateCartCount();
    closeCart();
  } catch (err) {
    console.error(err);
    alert('Ошибка оформления заказа. Попробуйте еще раз.');
  }
});

// Счётчик в шапке (суммарное количество штук)
function updateCartCount() {
  cartCount.textContent = cart.reduce((sum, item) => sum + (item.qty || 1), 0);
}

// Плавный скролл к каталогу
document.getElementById('catalog-btn').addEventListener('click', (e) => {
  e.preventDefault();
  document.getElementById('catalog').scrollIntoView({ behavior: 'smooth' });
});

// Старт
loadProducts();