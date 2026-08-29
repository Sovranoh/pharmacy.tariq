const STORAGE_KEYS = {
  products: "pharmacy_products",
  cart: "pharmacy_cart",
  orders: "pharmacy_orders",
};
const defaultProducts = [
  {
    id: "p1",
    name: "فيتامين سي 1000",
    description: "دعم يومي للمناعة والطاقة.",
    price: 8.5,
    category: "فيتامينات",
    status: "متوفر",
    image:
      "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=600&q=80",
  },
  {
    id: "p2",
    name: "مرطب البشرة اليومي",
    description: "ترطيب عميق لبشرة ناعمة ومنتعشة.",
    price: 12,
    category: "عناية",
    status: "متوفر",
    image:
      "https://images.unsplash.com/photo-1556229010-6c3f2c9ca5f8?w=600&q=80",
  },
  {
    id: "p3",
    name: "مسكن الألم السريع",
    description: "راحة فعالة من الصداع وآلام الجسم.",
    price: 3.75,
    category: "أدوية",
    status: "متوفر",
    image:
      "https://images.unsplash.com/photo-1471864190281-a93a3070b6de?w=600&q=80",
  },
  {
    id: "p4",
    name: "أوميغا 3",
    description: "زيت سمك نقي لصحة القلب والدماغ.",
    price: 15.25,
    category: "فيتامينات",
    status: "متوفر",
    image:
      "https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?w=600&q=80",
  },
];
let products = getData(STORAGE_KEYS.products, defaultProducts);
let cart = getData(STORAGE_KEYS.cart, []);
let selectedCategory = "الكل";
let productsUnsubscribe;
function getData(key, fallback) {
  try {
    const data = JSON.parse(localStorage.getItem(key));
    return data || fallback;
  } catch {
    return fallback;
  }
}
function save(key, data) {
  localStorage.setItem(key, JSON.stringify(data));
}
function loadProducts() {
  productsUnsubscribe = pharmacyDb
    .collection("products")
    .orderBy("name")
    .onSnapshot(
      (snapshot) => {
        products = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
        displayProducts();
      },
      (error) => {
        console.error("تعذر تحميل المنتجات من Firebase:", error);
        products = getData(STORAGE_KEYS.products, defaultProducts);
        displayProducts();
      },
    );
}
function displayProducts() {
  const grid = document.getElementById("productsGrid");
  const query = document
    .getElementById("productSearch")
    .value.trim()
    .toLowerCase();
  const shown = products.filter(
    (p) =>
      (selectedCategory === "الكل" || p.category === selectedCategory) &&
      (!query || `${p.name} ${p.description}`.toLowerCase().includes(query)),
  );
  document
    .getElementById("emptyProducts")
    .classList.toggle("hidden", shown.length > 0);
  grid.innerHTML = shown
    .map(
      (p, index) =>
          `<article class="product-card" style="animation-delay:${index * 60}ms"><div class="product-image">${p.image ? `<img src="${escapeAttribute(p.image)}" alt="${escapeAttribute(p.name)}" onerror="this.style.display='none';this.nextElementSibling.style.display='block'">` : ""}<span class="fallback" style="${p.image ? "display:none" : ""}">✚</span></div><div class="product-info"><span class="product-category">${escapeHtml(p.category)}</span><h3>${escapeHtml(p.name)}</h3><p>${escapeHtml(p.description)}</p>${Number(p.soldCount) > 0 ? `<small class="sold-count">تم بيع ${Number(p.soldCount)} قطعة</small>` : ""}<div class="product-bottom"><strong class="price">${Number(p.price).toFixed(2)} د.ع</strong><button class="add-button" data-add="${p.id}" ${p.status === "غير متوفر" ? "disabled" : ""}>${p.status === "غير متوفر" ? "غير متوفر" : "+ أضف للطلب"}</button></div></div></article>`,
    )
    .join("");
}
function addToCart(id) {
  const product = products.find((p) => p.id === id);
  if (!product || product.status === "غير متوفر") return;
  const item = cart.find((i) => i.id === id);
  item ? item.quantity++ : cart.push({ id, quantity: 1 });
  save(STORAGE_KEYS.cart, cart);
  renderCart();
  openCart();
}
function removeFromCart(id) {
  cart = cart.filter((i) => i.id !== id);
  save(STORAGE_KEYS.cart, cart);
  renderCart();
}
function updateCart(id, change) {
  const item = cart.find((i) => i.id === id);
  if (!item) return;
  item.quantity += change;
  if (item.quantity < 1) removeFromCart(id);
  else {
    save(STORAGE_KEYS.cart, cart);
    renderCart();
  }
}
function renderCart() {
  const items = document.getElementById("cartItems");
  const total = cart.reduce((sum, item) => {
    const p = products.find((product) => product.id === item.id);
    return sum + (p ? p.price * item.quantity : 0);
  }, 0);
  document.getElementById("cartCount").textContent = cart.reduce(
    (sum, i) => sum + i.quantity,
    0,
  );
  document.getElementById("cartTotal").textContent = `${total.toFixed(2)} د.ع`;
  document
    .getElementById("cartEmpty")
    .classList.toggle("hidden", cart.length > 0);
  document
    .getElementById("checkout")
    .classList.toggle("hidden", cart.length === 0);
  items.innerHTML = cart
    .map((item) => {
      const p = products.find((product) => product.id === item.id);
      if (!p) return "";
      return `<div class="cart-item"><img class="cart-thumb" src="${escapeAttribute(p.image)}" alt=""><div class="cart-item-main"><h3>${escapeHtml(p.name)}</h3><span class="price">${(p.price * item.quantity).toFixed(2)} د.ع</span><div class="quantity"><button data-minus="${p.id}">−</button><span>${item.quantity}</span><button data-plus="${p.id}">+</button><button class="remove" data-remove="${p.id}">حذف</button></div></div></div>`;
    })
    .join("");
}
async function submitOrder(event) {
  event.preventDefault();
  if (!cart.length) return;
  const form = new FormData(event.target);
  const order = {
    id: `ORD-${Date.now().toString().slice(-6)}`,
    customerName: form.get("customerName"),
    phone: form.get("phone"),
    address: form.get("address"),
    notes: form.get("notes"),
    items: cart.map((item) => {
      const p = products.find((product) => product.id === item.id);
      return {
        id: p.id,
        name: p.name,
        price: p.price,
        quantity: item.quantity,
      };
    }),
    total: cart.reduce((sum, item) => {
      const p = products.find((product) => product.id === item.id);
      return sum + p.price * item.quantity;
    }, 0),
    status: "جديد",
    createdAt: new Date().toISOString(),
  };
  try {
    await pharmacyDb.collection("orders").doc(order.id).set(order);
  } catch (error) {
    console.error("تعذر إرسال الطلب إلى Firebase:", error);
    alert("تعذر إرسال الطلب حالياً. حاول مرة أخرى.");
    return;
  }
  cart = [];
  save(STORAGE_KEYS.cart, cart);
  document.getElementById("orderForm").reset();
  document.getElementById("checkout").classList.add("hidden");
  document.getElementById("cartItems").innerHTML = "";
  document.getElementById("cartEmpty").classList.add("hidden");
  document.getElementById("orderSuccess").classList.remove("hidden");
  renderCart();
}
function openCart() {
  document.getElementById("cartDrawer").classList.add("open");
  document.getElementById("drawerBackdrop").classList.add("open");
  document.body.style.overflow = "hidden";
}
function closeCart() {
  document.getElementById("cartDrawer").classList.remove("open");
  document.getElementById("drawerBackdrop").classList.remove("open");
  document.body.style.overflow = "";
}
function escapeHtml(value) {
  return String(value).replace(
    /[&<>"']/g,
    (char) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;",
      })[char],
  );
}
function escapeAttribute(value) {
  return escapeHtml(value);
}
document.addEventListener("DOMContentLoaded", () => {
  loadProducts();
  renderCart();
  document.getElementById("productsGrid").addEventListener("click", (e) => {
    const button = e.target.closest("[data-add]");
    if (button) addToCart(button.dataset.add);
  });
  document.getElementById("cartItems").addEventListener("click", (e) => {
    const button = e.target.closest("button");
    if (!button) return;
    if (button.dataset.plus) updateCart(button.dataset.plus, 1);
    if (button.dataset.minus) updateCart(button.dataset.minus, -1);
    if (button.dataset.remove) removeFromCart(button.dataset.remove);
  });
  document.getElementById("categoryFilters").addEventListener("click", (e) => {
    if (!e.target.matches(".filter")) return;
    selectedCategory = e.target.dataset.category;
    document
      .querySelectorAll(".filter")
      .forEach((b) => b.classList.toggle("active", b === e.target));
    displayProducts();
  });
  document
    .getElementById("productSearch")
    .addEventListener("input", displayProducts);
  document.getElementById("cartButton").addEventListener("click", openCart);
  document.getElementById("closeCart").addEventListener("click", closeCart);
  document
    .getElementById("drawerBackdrop")
    .addEventListener("click", closeCart);
  document.getElementById("orderForm").addEventListener("submit", submitOrder);
  document.getElementById("continueShopping").addEventListener("click", () => {
    document.getElementById("orderSuccess").classList.add("hidden");
    closeCart();
  });
});
