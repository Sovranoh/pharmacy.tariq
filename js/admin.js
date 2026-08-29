const STORAGE_KEYS = {
  products: "pharmacy_products",
  orders: "pharmacy_orders",
};
const ADMIN_CODE = "112233";
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
let orders = []; // تم تعديلها لتعتمد على جلب البيانات من الـ Firebase مباشرة وتتجنب التصفير
let productsUnsubscribe;
let ordersUnsubscribe;

function getData(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key)) || fallback;
  } catch {
    return fallback;
  }
}
function save(key, data) {
  localStorage.setItem(key, JSON.stringify(data));
}
function formatDate(value) {
  return new Date(value).toLocaleString("ar-JO", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}
function escapeHtml(value) {
  return String(value ?? "").replace(
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
function loadProducts() {
  if (productsUnsubscribe) productsUnsubscribe();
  productsUnsubscribe = pharmacyDb
    .collection("products")
    .orderBy("name")
    .onSnapshot(async (snapshot) => {
      if (snapshot.empty) {
        const batch = pharmacyDb.batch();
        defaultProducts.forEach((product) => {
          const reference = pharmacyDb.collection("products").doc(product.id);
          batch.set(reference, product);
        });
        await batch.commit();
        return;
      }
      products = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      renderProducts();
      updateStats();
    }, (error) => console.error("تعذر تحميل المنتجات من Firebase:", error));
}

function loadOrders() {
  if (ordersUnsubscribe) ordersUnsubscribe();
  ordersUnsubscribe = pharmacyDb
    .collection("orders")
    .orderBy("createdAt", "desc")
    .onSnapshot((snapshot) => {
      orders = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      renderOrders();
      updateStats();
    }, (error) => console.error("تعذر تحميل الطلبات من Firebase:", error));
}

function renderProducts() {
  document.getElementById("productsTable").innerHTML =
    products
      .map(
        (p) =>
          `<tr><td><div class="product-cell"><img class="table-image" src="${escapeHtml(p.image)}" alt=""><span>${escapeHtml(p.name)}</span></div></td><td>${escapeHtml(p.category)}</td><td><b>${Number(p.price).toFixed(2)} د.ع</b></td><td><span class="status ${p.status === "متوفر" ? "available" : "unavailable"}">${escapeHtml(p.status)}</span></td><td><button class="action-button" data-edit="${p.id}">تعديل</button><button class="action-button delete" data-delete="${p.id}">حذف</button></td></tr>`,
      )
      .join("") || '<tr><td colspan="5">لا توجد منتجات بعد.</td></tr>';
}

function renderOrders() {
  const list = document.getElementById("ordersList");
  const summaryEl = document.getElementById("ordersSummary");
  if (summaryEl) summaryEl.textContent = `${orders.length} طلب`;
  
  if (!list) return;
  list.innerHTML =
    orders
      .map(
        (order) =>
          `<article class="order-card"><div class="order-card-header"><div><strong>${escapeHtml(order.customerName)}</strong><span class="order-time"> · ${formatDate(order.createdAt)}</span></div><select class="status-select" data-status="${order.id}"><option ${order.status === "جديد" ? "selected" : ""}>جديد</option><option ${order.status === "قيد التجهيز" ? "selected" : ""}>قيد التجهيز</option><option ${order.status === "تم التجهيز" ? "selected" : ""}>تم التجهيز</option><option ${order.status === "تم التوصيل" ? "selected" : ""}>تم التوصيل</option><option ${order.status === "ملغي" ? "selected" : ""}>ملغي</option></select></div><div class="order-products">${(order.items || []).map((i) => `${escapeHtml(i.name)} × ${i.quantity}`).join("، ")}</div><div class="order-details"><span>الهاتف: <b>${escapeHtml(order.phone)}</b></span><span>العنوان: <b>${escapeHtml(order.address)}</b></span><span>المجموع: <b>${Number(order.total).toFixed(2)} د.ع</b></span>${order.notes ? `<span>ملاحظات: <b>${escapeHtml(order.notes)}</b></span>` : ""}</div></article>`,
      )
      .join("") || '<div class="empty-state">لا توجد طلبات حتى الآن.</div>';
}

function updateStats() {
  const statProducts = document.getElementById("statProducts");
  const statOrders = document.getElementById("statOrders");
  const statNewOrders = document.getElementById("statNewOrders");
  const sideOrderCount = document.getElementById("sideOrderCount");
  const statSales = document.getElementById("statSales");
  const recentOrders = document.getElementById("recentOrders");
  const statCompletedOrders = document.getElementById("statCompletedOrders");

  if (statProducts) statProducts.textContent = products.length;
  if (statOrders) statOrders.textContent = orders.length;
  if (statNewOrders) statNewOrders.textContent = orders.filter((o) => o.status === "جديد").length;
  if (sideOrderCount) sideOrderCount.textContent = orders.filter((o) => o.status === "جديد").length;
  
  if (statSales) {
    statSales.textContent = orders
      .reduce((sum, o) => sum + Number(o.total || 0), 0)
      .toFixed(2);
  }

  if (recentOrders) {
    recentOrders.innerHTML =
      orders
        .slice(0, 4)
        .map(
          (o) =>
            `<div class="order-details"><span><b>${escapeHtml(o.customerName)}</b><br>${escapeHtml(o.items?.[0]?.name || "")}</span><span>المجموع<br><b>${Number(o.total).toFixed(2)} د.ع</b></span><span class="status ${o.status === "جديد" ? "new" : o.status === "ملغي" ? "cancelled" : "done"}">${escapeHtml(o.status)}</span></div>`,
        )
        .join("") ||
      '<p style="color:#788783;font-size:12px">لا توجد طلبات حديثة.</p>';
  }

  if (statCompletedOrders) {
    statCompletedOrders.textContent = orders.filter((o) => o.status === "تم التوصيل").length;
  }
}

async function addProduct(event) {
  event.preventDefault();
  const form = new FormData(event.target);
  const existingProduct = products.find(
    (product) => product.id === form.get("productId"),
  );
  const data = {
    id: form.get("productId") || `p${Date.now()}`,
    name: form.get("name"),
    price: Number(form.get("price")),
    description: form.get("description"),
    image: form.get("image") || "",
    category: form.get("category"),
    status: form.get("status"),
    soldCount: Number(existingProduct?.soldCount || 0),
  };
  try {
    await pharmacyDb.collection("products").doc(data.id).set(data);
  } catch (error) {
    console.error("تعذر حفظ المنتج في Firebase:", error);
    alert("تعذر حفظ المنتج حالياً. حاول مرة أخرى.");
    return;
  }
  closeModal();
}

function editProduct(id) {
  const product = products.find((p) => p.id === id);
  if (!product) return;
  const form = document.getElementById("productForm");
  Object.entries(product).forEach(([key, value]) => {
    if (form.elements[key]) form.elements[key].value = value;
  });
  document.getElementById("modalTitle").textContent = "تعديل المنتج";
  openModal();
}

async function deleteProduct(id) {
  const product = products.find((p) => p.id === id);
  if (!product || !confirm("هل أنت متأكد من حذف هذا المنتج؟")) return;
  try {
    await pharmacyDb.collection("products").doc(id).delete();
  } catch (error) {
    console.error("تعذر حذف المنتج من Firebase:", error);
    alert("تعذر حذف المنتج حالياً. حاول مرة أخرى.");
  }
}

async function updateOrderStatus(id, status) {
  try {
    const orderReference = pharmacyDb.collection("orders").doc(id);
    
    await pharmacyDb.runTransaction(async (transaction) => {
      // 1. مرحلة القراءة (Reads) أولاً بالكامل
      const orderSnapshot = await transaction.get(orderReference);
      if (!orderSnapshot.exists) return;
      const order = orderSnapshot.data();

      const productReads = [];
      if (status === "تم التوصيل" && order.status !== "تم التوصيل" && !order.inventoryApplied) {
        for (const item of order.items || []) {
          const productReference = pharmacyDb.collection("products").doc(item.id);
          productReads.push({
            ref: productReference,
            quantity: Number(item.quantity || 0),
            snap: await transaction.get(productReference)
          });
        }
      }

      // 2. مرحلة الكتابة (Writes) بعد اكتمال كل القراءات
      if (status === "تم التوصيل" && order.status !== "تم التوصيل" && !order.inventoryApplied) {
        for (const prod of productReads) {
          if (prod.snap.exists) {
            const soldCount = Number(prod.snap.data().soldCount || 0);
            transaction.update(prod.ref, {
              soldCount: soldCount + prod.quantity,
            });
          }
        }
        transaction.update(orderReference, {
          status,
          inventoryApplied: true,
        });
      } else {
        transaction.update(orderReference, { status });
      }
    });
    console.log("تم تحديث حالة الطلب بنجاح");
  } catch (error) {
    console.error("تعذر تحديث حالة الطلب في Firebase:", error);
    alert("تعذر تحديث حالة الطلب حالياً. حاول مرة أخرى.");
  }
}

function openModal() {
  const modal = document.getElementById("modalBackdrop");
  modal.classList.remove("hidden");
  modal.style.display = "grid";
}
function closeModal() {
  const modal = document.getElementById("modalBackdrop");
  modal.classList.add("hidden");
  modal.style.display = "none";
  document.getElementById("productForm").reset();
  document.querySelector("[name=productId]").value = "";
  document.getElementById("modalTitle").textContent = "إضافة منتج";
}
function showView(name) {
  document
    .querySelectorAll(".view")
    .forEach((v) => v.classList.toggle("active", v.id === `${name}View`));
  document
    .querySelectorAll(".side-link[data-view]")
    .forEach((b) => b.classList.toggle("active", b.dataset.view === name));
  document.getElementById("viewTitle").textContent = {
    overview: "نظرة عامة",
    products: "إدارة المنتجات",
    orders: "إدارة الطلبات",
  }[name];
  if (name === "products") loadProducts();
  if (name === "orders") loadOrders();
}
function startDashboard() {
  document.getElementById("loginScreen").classList.add("hidden");
  const dashboard = document.getElementById("dashboard");
  dashboard.classList.remove("hidden");
  dashboard.style.display = "flex";
  loadProducts();
  loadOrders();
}

document.addEventListener("DOMContentLoaded", () => {
  if (sessionStorage.getItem("admin_logged_in") === "true") {
    startDashboard();
  }
  document.getElementById("loginForm").addEventListener("submit", (e) => {
    e.preventDefault();
    if (document.getElementById("adminCode").value === ADMIN_CODE) {
      sessionStorage.setItem("admin_logged_in", "true");
      startDashboard();
    } else document.getElementById("loginError").classList.add("show");
  });
  document.getElementById("logoutButton").addEventListener("click", () => {
    sessionStorage.removeItem("admin_logged_in");
    location.reload();
  });
  document
    .querySelectorAll(".side-link[data-view], [data-goto]")
    .forEach((button) =>
      button.addEventListener("click", () =>
        showView(button.dataset.view || button.dataset.goto),
      ),
    );
  document
    .getElementById("addProductButton")
    .addEventListener("click", openModal);
  document.getElementById("closeModal").addEventListener("click", closeModal);
  document.getElementById("modalBackdrop").addEventListener("click", (e) => {
    if (e.target.id === "modalBackdrop") closeModal();
  });
  document.getElementById("productForm").addEventListener("submit", addProduct);
  document.getElementById("productsTable").addEventListener("click", (e) => {
    if (e.target.dataset.edit) editProduct(e.target.dataset.edit);
    if (e.target.dataset.delete) deleteProduct(e.target.dataset.delete);
  });
  document.getElementById("ordersList").addEventListener("change", (e) => {
    if (e.target.dataset.status)
      updateOrderStatus(e.target.dataset.status, e.target.value);
  });
});