// ============================================================
// Витрина магазина: рендер товаров из БД + корзина.
// Карточки рендерятся классами лендинга (.card, .card__ph,
// .price, .comp, .btn--gold) и обрастают 3D-эффектами лендинга.
// ============================================================

// Корзина в localStorage: [{ id, title, price, image, size, qty }]
let cart = JSON.parse(localStorage.getItem('cart')) || [];

// Элементы DOM
const grid = document.getElementById('products-grid');
const cartCount = document.getElementById('cart-count');
const cartOverlay = document.getElementById('cart-overlay');
const cartItems = document.getElementById('cart-items');
const cartTotal = document.getElementById('cart-total');
const cartClose = document.getElementById('cart-close');
const checkoutBtn = document.getElementById('checkout-btn');

const money = (n) => new Intl.NumberFormat('ru-RU').format(n) + ' ₽';

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

// Разбирает остатки {"42":1,"44":2,...} в массив для чипов
function parseSizes(raw) {
  if (!raw) return [];
  try {
    const obj = typeof raw === 'string' ? JSON.parse(raw) : raw;
    if (!obj || typeof obj !== 'object') return [];
    return Object.entries(obj)
      .map(([size, left]) => ({ size: +size, left: +left || 0 }))
      .sort((a, b) => a.size - b.size);
  } catch {
    return [];
  }
}

// ---- Рендер карточек в стиле лендинга ----
function renderProducts(products) {
  if (!products.length) {
    grid.innerHTML =
      '<p class="text-gray-500 col-span-full" style="text-align:center;padding:40px 0">Товары скоро появятся</p>';
    return;
  }

  grid.innerHTML = products
    .map((product, i) => {
      const price = new Intl.NumberFormat('ru-RU').format(product.price);
      const sizes = parseSizes(product.sizes);
      const available = sizes.filter((s) => s.left > 0);
      const firstSize = (available[0] || sizes[0] || {}).size || null;

      // Чипы размеров: есть остаток — обычный, нет — «oos» (пошив 7–10 дней)
      const chips = sizes.length
        ? `
        <div class="buy__sizes" role="group" aria-label="Размер: ${product.title}">
          ${sizes
            .map(
              (s) =>
                `<button class="chip${s.left ? '' : ' oos'}" type="button" aria-pressed="false" data-size="${s.size}"
                   title="${s.left ? 'в наличии ' + s.left + ' шт.' : 'нет в наличии — пошив 7–10 дней'}">${s.size}</button>`
            )
            .join('')}
        </div>`
        : '';

      return `
      <article class="card reveal" style="--d:0">
        <div class="ph card__ph" data-file="${product.image}"><span class="big-mono">РТ</span>
          <img src="${product.image}" alt="${product.title}" width="750" height="1000" loading="lazy"
               onerror="this.remove()">
          ${sizes.length ? `<span class="card__tag">${sizes.filter((s) => s.left > 0).map((s) => s.size).join(' · ')}</span>` : ''}
        </div>
        <h3>${product.title}</h3><span class="price">${price}</span>
        <p class="comp">${product.description}</p>
        <div class="buy">
          ${sizes.length ? '<span class="buy__lbl">Размер</span>' + chips : '<span class="buy__lbl" style="color:var(--muted);font-size:12px">Размеры уточним после заказа</span>'}
          <button class="btn btn--gold add-to-cart" type="button"
                  data-id="${product.id}" data-title="${product.title}" data-price="${product.price}"
                  data-image="${product.image}" data-size="${firstSize}">В корзину</button>
        </div>
      </article>`;
    })
    .join('');

  // Премиум-эффекты лендинга для динамических карточек:
  // спотлайт + 3D-наклон + линза зума на картинке (как у статичных .card)
  const R = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Карточки с .reveal, добавленные динамически, не попадают в IntersectionObserver
  // лендинга (он создан при загрузке). Если их не показать — останутся opacity:0.
  // Подключаем их к observer'у заново: показываем сразу и добавляем в коллекцию card-эффектов.
  const revealObserver =
    window.__rtReveal ||
    (window.__rtReveal = new IntersectionObserver(
      (es) =>
        es.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add('in');
            e.target.classList.remove('reveal');
          }
        }),
      { threshold: 0.15, rootMargin: '0px 0px -8% 0px' }
    ));

  if (matchMedia('(pointer:fine)').matches) {
    const T = 7;
    grid.querySelectorAll('.card').forEach((c) => {
      c.addEventListener('pointermove', (e) => {
        const r = c.getBoundingClientRect(),
          px = e.clientX - r.left,
          py = e.clientY - r.top;
        const nx = px / r.width - 0.5,
          ny = py / r.height - 0.5;
        c.style.setProperty('--mx', px + 'px');
        c.style.setProperty('--my', py + 'px');
        c.classList.add('live');
        if (!R) {
          c.style.setProperty('--ry', (nx * T).toFixed(2) + 'deg');
          c.style.setProperty('--rx', (-ny * T).toFixed(2) + 'deg');
        }
        const ph = c.querySelector('.card__ph');
        if (ph) {
          const pr = ph.getBoundingClientRect();
          ph.style.setProperty('--ox', ((e.clientX - pr.left) / pr.width * 100).toFixed(1) + '%');
          ph.style.setProperty('--oy', ((e.clientY - pr.top) / pr.height * 100).toFixed(1) + '%');
        }
        c.style.setProperty('--z', '1.16');
      });
      c.addEventListener('pointerleave', () => {
        c.classList.remove('live');
        c.style.setProperty('--rx', '0deg');
        c.style.setProperty('--ry', '0deg');
        c.style.setProperty('--z', '1');
      });
    });
  }

  // Показываем карточки: подключаем к reveal-наблюдателю (см. верх renderProducts)
  grid.querySelectorAll('.card').forEach((c) => revealObserver.observe(c));
}

// Добавление товара в корзину (по делегированию событий)
grid.addEventListener('click', (e) => {
  const btn = e.target.closest('.add-to-cart');
  const chip = e.target.closest('.chip');
  if (chip) {
    // Выбор размера: подсвечиваем активный чип
    const box = chip.closest('.buy__sizes');
    box.querySelectorAll('.chip').forEach((c) => c.setAttribute('aria-pressed', String(c === chip)));
    const card = chip.closest('.card');
    const addBtn = card.querySelector('.add-to-cart');
    if (addBtn) addBtn.dataset.size = chip.dataset.size;
    return;
  }
  if (!btn) return;

  const size = btn.dataset.size || null;
  const product = {
    id: +btn.dataset.id,
    title: btn.dataset.title,
    price: +btn.dataset.price,
    image: btn.dataset.image,
    size
  };

  // Объединяем дубликаты (по id+size): если уже есть — увеличиваем qty
  const existing = cart.find((item) => item.id === product.id && item.size === product.size);
  if (existing) {
    existing.qty = (existing.qty || 1) + 1;
  } else {
    cart.push({ ...product, qty: 1 });
  }

  localStorage.setItem('cart', JSON.stringify(cart));
  updateCartCount();
  btn.textContent = 'Добавлено ✓';
  setTimeout(() => (btn.textContent = 'В корзину'), 1000);
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
    const price = money(item.price);
    const qty = item.qty || 1;
    const lineTotal = money(item.price * qty);
    const sizeInfo = item.size ? `<span class="cart-size">Размер ${item.size}</span>` : '';
    return `
      <div class="flex items-center gap-4">
        <img src="${item.image}" alt="${item.title}"
             class="w-16 h-16 object-cover rounded-lg shrink-0">
        <div class="flex-1 min-w-0">
          <p class="font-medium truncate">${item.title} × ${qty} шт.</p>
          <p class="text-sm text-gray-500">${sizeInfo} ${price} / шт. — ${lineTotal}</p>
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
  cartTotal.textContent = money(total);
}

// Оформление заказа
checkoutBtn.addEventListener('click', async () => {
  // Если корзина пуста — не даём оформить
  if (!cart.length) return;

  const customer_name = prompt('Введите ваше имя:');
  if (!customer_name) return; // имя не введено — прерываем

  try {
    // Строки заказа: Название (размер) — N шт. — сумма ₽
    const orderLines = cart
      .map(
        (item) =>
          `${item.title}${item.size ? `, размер ${item.size}` : ''} — ${item.qty || 1} шт. — ${money(
            item.price * (item.qty || 1)
          )}`
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
  cartCount.hidden = !cart.length;
}

// Плавный скролл к каталогу
document.getElementById('catalog-btn').addEventListener('click', (e) => {
  e.preventDefault();
  document.getElementById('collection').scrollIntoView({ behavior: 'smooth' });
});

// Старт
updateCartCount();
loadProducts();