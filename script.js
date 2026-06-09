const STORAGE_KEYS = {
  products: "ubeShopProducts",
  cart: "ubeShopCart",
  orders: "ubeShopOrders",
  posts: "ubeShopForumPosts",
  username: "ubeShopUsername",
  adminLoggedIn: "ubeShopAdminLoggedIn",
  priceRegion: "ubeShopPriceRegion"
};

const sampleProducts = [
  {
    id: 1,
    name: "UBE Plush Toy",
    price: 571.18,
    currency: "PHP",
    description: "A cute and soft official UBE plush toy.",
    stock: 10,
    image: "assets/images/merch/ube-plush.svg"
  },
  {
    id: 2,
    name: "UBE Shirt",
    price: 450.00,
    currency: "PHP",
    description: "A comfortable shirt with official UBE artwork.",
    stock: 15,
    image: "assets/images/merch/ube-shirt.svg"
  },
  {
    id: 3,
    name: "UBE Sticker Pack",
    price: 120.00,
    currency: "PHP",
    description: "A cute sticker pack for laptops, phones, and notebooks.",
    stock: 25,
    image: "assets/images/merch/ube-stickers.svg"
  },
  {
    id: 4,
    name: "UBE Keychain",
    price: 2.43,
    currency: "USD",
    regionalPrices: {
      philippines: 2.43,
      nearbyAsia: 3.64,
      overseas: 4.87
    },
    description: "A cute official UBE keychain for bags, keys, and fan collections.",
    stock: 30,
    image: "assets/images/merch/UBE_KEYCHAIN.png"
  }
];

const priceRegions = [
  {
    id: "philippines",
    label: "Philippines",
    shortLabel: "PH",
    description: "Ships within the Philippines"
  },
  {
    id: "nearbyAsia",
    label: "Nearby Asia",
    shortLabel: "Asia",
    description: "Nearby parts of Asia"
  },
  {
    id: "overseas",
    label: "Overseas / Rest of World",
    shortLabel: "Overseas",
    description: "All other parts of the world"
  }
];

const orderStatuses = [
  "Pending",
  "Confirmed",
  "Preparing",
  "Shipped",
  "Delivered",
  "Cancelled"
];

document.addEventListener("DOMContentLoaded", () => {
  initializeStorage();
  setupRegionSelectors();
  setupCartDrawer();
  updateCartUI();

  const page = document.body.dataset.page;

  if (page === "home") {
    renderHomeProducts();
    setupProductModal();
  }

  if (page === "checkout") {
    setupCheckoutPage();
  }

  if (page === "forum") {
    setupForumPage();
  }

  if (page === "admin") {
    setupAdminPage();
  }
});

function initializeStorage() {
  if (!localStorage.getItem(STORAGE_KEYS.products)) {
    saveProducts(sampleProducts);
  } else {
    syncStarterProducts();
  }

  if (!localStorage.getItem(STORAGE_KEYS.cart)) {
    saveCart([]);
  }

  if (!localStorage.getItem(STORAGE_KEYS.orders)) {
    saveOrders([]);
  }

  if (!localStorage.getItem(STORAGE_KEYS.posts)) {
    savePosts([
      {
        id: Date.now(),
        username: "UBE Mod",
        message: "Welcome to the UBE community board. Share your favorite merch ideas here!",
        createdAt: new Date().toISOString()
      }
    ]);
  }
}

function syncStarterProducts() {
  const products = getProducts();
  let changed = false;

  sampleProducts.forEach(starterProduct => {
    const existingProduct = products.find(product => Number(product.id) === Number(starterProduct.id));
    if (!existingProduct) {
      products.push(starterProduct);
      changed = true;
    }
  });

  products.forEach(product => {
    const starterProduct = sampleProducts.find(sample => Number(sample.id) === Number(product.id));

    if (!starterProduct) {
      return;
    }

    if (String(product.image).includes("via.placeholder.com")) {
      product.image = starterProduct.image;
      changed = true;
    }

    if (!product.currency && starterProduct.currency) {
      product.currency = starterProduct.currency;
      changed = true;
    }

    if (starterProduct.regionalPrices && !product.regionalPrices) {
      product.regionalPrices = starterProduct.regionalPrices;
      product.price = starterProduct.price;
      product.currency = starterProduct.currency;
      changed = true;
    }
  });

  if (changed) {
    saveProducts(products);
  }
}

function readStorage(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key)) || fallback;
  } catch (error) {
    return fallback;
  }
}

function saveStorage(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function getProducts() {
  return readStorage(STORAGE_KEYS.products, []);
}

function saveProducts(products) {
  saveStorage(STORAGE_KEYS.products, products);
  // Later: sync product updates with Google Sheets here
}

function getCart() {
  return readStorage(STORAGE_KEYS.cart, []);
}

function saveCart(cart) {
  saveStorage(STORAGE_KEYS.cart, cart);
}

function getOrders() {
  return readStorage(STORAGE_KEYS.orders, []);
}

function saveOrders(orders) {
  saveStorage(STORAGE_KEYS.orders, orders);
  // Later: send updated order records to Google Sheets here
}

function getPosts() {
  return readStorage(STORAGE_KEYS.posts, []);
}

function savePosts(posts) {
  saveStorage(STORAGE_KEYS.posts, posts);
  // Later: sync forum posts with Google Sheets here
}

function money(amount) {
  return `PHP ${Number(amount || 0).toFixed(2)}`;
}

function formatMoney(amount, currency = "PHP") {
  return `${currency} ${Number(amount || 0).toFixed(2)}`;
}

function getSelectedRegion() {
  const savedRegion = localStorage.getItem(STORAGE_KEYS.priceRegion);
  const isValidRegion = priceRegions.some(region => region.id === savedRegion);
  return isValidRegion ? savedRegion : "philippines";
}

function saveSelectedRegion(regionId) {
  const isValidRegion = priceRegions.some(region => region.id === regionId);
  localStorage.setItem(STORAGE_KEYS.priceRegion, isValidRegion ? regionId : "philippines");
}

function getRegionLabel(regionId = getSelectedRegion()) {
  const region = priceRegions.find(item => item.id === regionId);
  return region ? region.label : priceRegions[0].label;
}

function setupRegionSelectors() {
  document.querySelectorAll("[data-price-region]").forEach(select => {
    select.innerHTML = priceRegions.map(region => `
      <option value="${region.id}">${region.label}</option>
    `).join("");
    select.value = getSelectedRegion();
    select.addEventListener("change", () => {
      saveSelectedRegion(select.value);
      syncRegionSelectorValues();
      renderHomeProducts();
      updateCartUI();
      if (document.body.dataset.page === "checkout") {
        renderCheckoutItems();
      }
      if (document.body.dataset.page === "admin") {
        renderAdminProducts();
        renderDashboardSummary();
      }
    });
  });
}

function syncRegionSelectorValues() {
  const selectedRegion = getSelectedRegion();
  document.querySelectorAll("[data-price-region]").forEach(select => {
    select.value = selectedRegion;
  });
}

function hasRegionalPricing(product) {
  return Boolean(product && product.regionalPrices);
}

function getProductPricing(product, regionId = getSelectedRegion()) {
  if (hasRegionalPricing(product)) {
    const fallbackRegion = priceRegions[0].id;
    const amount = product.regionalPrices[regionId] ?? product.regionalPrices[fallbackRegion] ?? product.price;
    return {
      amount: Number(amount || 0),
      currency: product.currency || "USD",
      regionId
    };
  }

  return {
    amount: Number(product.price || 0),
    currency: product.currency || "PHP",
    regionId: null
  };
}

function formatProductPrice(product, regionId = getSelectedRegion()) {
  const pricing = getProductPricing(product, regionId);
  return formatMoney(pricing.amount, pricing.currency);
}

function getProductPriceNote(product) {
  if (!hasRegionalPricing(product)) {
    return "";
  }

  const currency = product.currency || "USD";
  return priceRegions.map(region => {
    const amount = product.regionalPrices[region.id];
    return `${region.shortLabel}: ${formatMoney(amount, currency)}`;
  }).join(" | ");
}

function getProductPriceNoteHTML(product) {
  const note = getProductPriceNote(product);
  return note ? `<p class="price-note">${note}</p>` : "";
}

function getProductRegionBadge(product) {
  return hasRegionalPricing(product) ? `<span class="region-badge">${getRegionLabel()} price</span>` : "";
}

function getCartSubtotalBreakdown(regionId = getSelectedRegion()) {
  return getCart().reduce((totals, item) => {
    const product = findProduct(item.productId);
    if (!product) {
      return totals;
    }

    const pricing = getProductPricing(product, regionId);
    totals[pricing.currency] = (totals[pricing.currency] || 0) + pricing.amount * item.quantity;
    return totals;
  }, {});
}

function formatSubtotalBreakdown(totals) {
  const currencies = Object.keys(totals);
  if (currencies.length === 0) {
    return formatMoney(0, "PHP");
  }

  return currencies.map(currency => formatMoney(totals[currency], currency)).join(" + ");
}

function formatCartSubtotal(regionId = getSelectedRegion()) {
  return formatSubtotalBreakdown(getCartSubtotalBreakdown(regionId));
}

function getOrderSubtotalBreakdown(order) {
  if (order.subtotalBreakdown) {
    return order.subtotalBreakdown;
  }

  if (order.subtotal && typeof order.subtotal === "object") {
    return order.subtotal;
  }

  const currency = order.subtotalCurrency || "PHP";
  return { [currency]: Number(order.subtotal || 0) };
}

function formatOrderSubtotal(order) {
  if (order.subtotalText) {
    return order.subtotalText;
  }

  return formatSubtotalBreakdown(getOrderSubtotalBreakdown(order));
}

function getTotalSalesBreakdown(orders) {
  return orders
    .filter(order => order.status !== "Cancelled")
    .reduce((totals, order) => {
      const breakdown = getOrderSubtotalBreakdown(order);
      Object.keys(breakdown).forEach(currency => {
        totals[currency] = (totals[currency] || 0) + Number(breakdown[currency] || 0);
      });
      return totals;
    }, {});
}

function formatDateTime(dateString) {
  return new Date(dateString).toLocaleString([], {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function findProduct(productId) {
  return getProducts().find(product => Number(product.id) === Number(productId));
}

function getCartCount() {
  return getCart().reduce((total, item) => total + item.quantity, 0);
}

function getCartSubtotal() {
  return getCartSubtotalBreakdown();
}

function isSoldOut(product) {
  return !product || Number(product.stock) <= 0 || product.soldOut;
}

function stockLabel(product) {
  if (isSoldOut(product)) {
    return "Sold out";
  }

  return `${product.stock} in stock`;
}

function addToCart(productId, quantity = 1) {
  const product = findProduct(productId);

  if (isSoldOut(product)) {
    alert("This item is sold out.");
    return;
  }

  const cart = getCart();
  const existingItem = cart.find(item => Number(item.productId) === Number(productId));
  const currentQuantity = existingItem ? existingItem.quantity : 0;
  const nextQuantity = Math.min(currentQuantity + Number(quantity), Number(product.stock));

  if (existingItem) {
    existingItem.quantity = nextQuantity;
  } else {
    cart.push({ productId: Number(productId), quantity: nextQuantity });
  }

  saveCart(cart);
  updateCartUI();
  openCartDrawer();
}

function updateCartQuantity(productId, quantity) {
  const product = findProduct(productId);
  const cart = getCart();
  const item = cart.find(cartItem => Number(cartItem.productId) === Number(productId));

  if (!item || !product) {
    return;
  }

  item.quantity = Math.max(1, Math.min(Number(quantity), Number(product.stock)));
  saveCart(cart);
  updateCartUI();
  if (document.body.dataset.page === "checkout") {
    renderCheckoutItems();
  }
}

function removeFromCart(productId) {
  const cart = getCart().filter(item => Number(item.productId) !== Number(productId));
  saveCart(cart);
  updateCartUI();
  if (document.body.dataset.page === "checkout") {
    renderCheckoutItems();
  }
}

function renderHomeProducts() {
  const container = document.querySelector("[data-product-list]");
  if (!container) {
    return;
  }

  const products = getProducts();
  container.innerHTML = products.map(product => `
    <article class="product-card">
      <img src="${product.image}" alt="${product.name}">
      <div class="product-card-body">
        <div class="product-title-row">
          <h3>${product.name}</h3>
          <span class="price">${formatProductPrice(product)}</span>
        </div>
        ${getProductRegionBadge(product)}
        <p>${product.description}</p>
        ${getProductPriceNoteHTML(product)}
        <span class="stock-pill ${isSoldOut(product) ? "sold-out" : ""}">${stockLabel(product)}</span>
        <div class="product-actions">
          <button class="primary-button" type="button" data-add-cart="${product.id}" ${isSoldOut(product) ? "disabled" : ""}>Add to Cart</button>
          <button class="secondary-button" type="button" data-view-details="${product.id}">View Details</button>
        </div>
      </div>
    </article>
  `).join("");

  container.querySelectorAll("[data-add-cart]").forEach(button => {
    button.addEventListener("click", () => addToCart(button.dataset.addCart, 1));
  });

  container.querySelectorAll("[data-view-details]").forEach(button => {
    button.addEventListener("click", () => openProductModal(button.dataset.viewDetails));
  });
}

function setupProductModal() {
  const modal = document.querySelector("[data-product-modal]");
  const closeButton = document.querySelector("[data-modal-close]");

  if (!modal || !closeButton) {
    return;
  }

  closeButton.addEventListener("click", closeProductModal);
  modal.addEventListener("click", event => {
    if (event.target === modal) {
      closeProductModal();
    }
  });
}

function openProductModal(productId) {
  const product = findProduct(productId);
  const modal = document.querySelector("[data-product-modal]");
  const content = document.querySelector("[data-modal-content]");

  if (!product || !modal || !content) {
    return;
  }

  content.innerHTML = `
    <div class="modal-product-layout">
      <img src="${product.image}" alt="${product.name}">
      <div>
        <p class="eyebrow">Merch Details</p>
        <h2 id="modal-product-name">${product.name}</h2>
        <p class="price">${formatProductPrice(product)}</p>
        ${getProductPriceNoteHTML(product)}
        <p>${product.description} Made for cozy streams, fan meetups, desk setups, and everyday UBE pride.</p>
        <p><strong>Available stock:</strong> ${stockLabel(product)}</p>
        <div class="modal-actions">
          <div class="quantity-control" data-modal-quantity>
            <button type="button" data-detail-minus>-</button>
            <span data-detail-quantity>1</span>
            <button type="button" data-detail-plus>+</button>
          </div>
          <button class="primary-button" type="button" data-detail-add ${isSoldOut(product) ? "disabled" : ""}>Add to Cart</button>
        </div>
      </div>
    </div>
  `;

  let quantity = 1;
  const quantityLabel = content.querySelector("[data-detail-quantity]");
  content.querySelector("[data-detail-minus]").addEventListener("click", () => {
    quantity = Math.max(1, quantity - 1);
    quantityLabel.textContent = quantity;
  });
  content.querySelector("[data-detail-plus]").addEventListener("click", () => {
    quantity = Math.min(Number(product.stock), quantity + 1);
    quantityLabel.textContent = quantity;
  });
  content.querySelector("[data-detail-add]").addEventListener("click", () => addToCart(product.id, quantity));

  modal.hidden = false;
}

function closeProductModal() {
  const modal = document.querySelector("[data-product-modal]");
  if (modal) {
    modal.hidden = true;
  }
}

function setupCartDrawer() {
  document.querySelectorAll("[data-cart-open]").forEach(button => {
    button.addEventListener("click", openCartDrawer);
  });

  document.querySelectorAll("[data-cart-close]").forEach(button => {
    button.addEventListener("click", closeCartDrawer);
  });

  document.querySelectorAll("[data-cart-drawer]").forEach(drawer => {
    drawer.addEventListener("click", event => {
      if (event.target === drawer) {
        closeCartDrawer();
      }
    });
  });
}

function openCartDrawer() {
  document.querySelectorAll("[data-cart-drawer]").forEach(drawer => {
    drawer.classList.add("open");
  });
  document.body.classList.add("drawer-open");
}

function closeCartDrawer() {
  document.querySelectorAll("[data-cart-drawer]").forEach(drawer => {
    drawer.classList.remove("open");
  });
  document.body.classList.remove("drawer-open");
}

function updateCartUI() {
  document.querySelectorAll("[data-cart-count]").forEach(count => {
    count.textContent = getCartCount();
  });

  document.querySelectorAll("[data-cart-subtotal]").forEach(total => {
    total.textContent = formatCartSubtotal();
  });

  renderCartItems();
  renderCartSuggestions();
}

function renderCartItems() {
  document.querySelectorAll("[data-cart-items]").forEach(container => {
    const cart = getCart();

    if (cart.length === 0) {
      container.innerHTML = `<p class="empty-state">Your cart is empty.</p>`;
      return;
    }

    container.innerHTML = cart.map(item => {
      const product = findProduct(item.productId);
      if (!product) {
        return "";
      }

      return `
        <article class="cart-item">
          <img src="${product.image}" alt="${product.name}">
          <div>
            <h3>${product.name}</h3>
            <p class="price">${formatProductPrice(product)}</p>
            ${getProductRegionBadge(product)}
            <div class="cart-line-actions">
              <div class="quantity-control">
                <button type="button" data-cart-minus="${product.id}">-</button>
                <span>${item.quantity}</span>
                <button type="button" data-cart-plus="${product.id}">+</button>
              </div>
              <button class="remove-button" type="button" data-remove-cart="${product.id}">Remove</button>
            </div>
          </div>
        </article>
      `;
    }).join("");

    bindCartLineButtons(container);
  });
}

function renderCartSuggestions() {
  document.querySelectorAll("[data-cart-suggestions]").forEach(container => {
    const cartIds = getCart().map(item => Number(item.productId));
    const suggestions = getProducts()
      .filter(product => !cartIds.includes(Number(product.id)) && !isSoldOut(product))
      .slice(0, 3);

    if (suggestions.length === 0) {
      container.innerHTML = `<p class="empty-state">More merch ideas coming soon.</p>`;
      return;
    }

    container.innerHTML = suggestions.map(product => `
      <article class="suggestion-item">
        <img src="${product.image}" alt="${product.name}">
        <div>
          <h4>${product.name}</h4>
          <p class="price">${formatProductPrice(product)}</p>
        </div>
        <button class="mini-button" type="button" data-add-cart="${product.id}">Add</button>
      </article>
    `).join("");

    container.querySelectorAll("[data-add-cart]").forEach(button => {
      button.addEventListener("click", () => addToCart(button.dataset.addCart, 1));
    });
  });
}

function bindCartLineButtons(container) {
  container.querySelectorAll("[data-cart-minus]").forEach(button => {
    button.addEventListener("click", () => {
      const item = getCart().find(cartItem => Number(cartItem.productId) === Number(button.dataset.cartMinus));
      if (item && item.quantity > 1) {
        updateCartQuantity(button.dataset.cartMinus, item.quantity - 1);
      }
    });
  });

  container.querySelectorAll("[data-cart-plus]").forEach(button => {
    button.addEventListener("click", () => {
      const item = getCart().find(cartItem => Number(cartItem.productId) === Number(button.dataset.cartPlus));
      if (item) {
        updateCartQuantity(button.dataset.cartPlus, item.quantity + 1);
      }
    });
  });

  container.querySelectorAll("[data-remove-cart]").forEach(button => {
    button.addEventListener("click", () => removeFromCart(button.dataset.removeCart));
  });
}

function setupCheckoutPage() {
  renderCheckoutItems();

  const showFormButton = document.querySelector("[data-show-order-form]");
  const orderPanel = document.querySelector("[data-order-panel]");
  const orderForm = document.querySelector("[data-order-form]");

  if (showFormButton && orderPanel) {
    showFormButton.addEventListener("click", () => {
      if (getCart().length === 0) {
        alert("Please add items to your cart before checking out.");
        return;
      }
      orderPanel.hidden = false;
      orderPanel.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  if (orderForm) {
    orderForm.addEventListener("submit", submitOrder);
  }
}

function renderCheckoutItems() {
  const container = document.querySelector("[data-checkout-items]");
  const subtotal = document.querySelector("[data-checkout-subtotal]");

  if (!container) {
    return;
  }

  const cart = getCart();
  subtotal.textContent = formatCartSubtotal();

  if (cart.length === 0) {
    container.innerHTML = `<p class="empty-state">Your checkout is empty. Add merch from the shop first.</p>`;
    return;
  }

  container.innerHTML = cart.map(item => {
    const product = findProduct(item.productId);
    if (!product) {
      return "";
    }
    const pricing = getProductPricing(product);
    const lineTotal = pricing.amount * item.quantity;

    return `
      <article class="checkout-card">
        <img src="${product.image}" alt="${product.name}">
        <div>
          <h3>${product.name}</h3>
          <p>${formatMoney(pricing.amount, pricing.currency)} each</p>
          ${getProductRegionBadge(product)}
          <div class="quantity-control">
            <button type="button" data-cart-minus="${product.id}">-</button>
            <span>${item.quantity}</span>
            <button type="button" data-cart-plus="${product.id}">+</button>
          </div>
        </div>
        <div>
          <p class="price">${formatMoney(lineTotal, pricing.currency)}</p>
          <button class="remove-button" type="button" data-remove-cart="${product.id}">Remove</button>
        </div>
      </article>
    `;
  }).join("");

  bindCartLineButtons(container);
}

async function submitOrder(event) {
  event.preventDefault();

  const cart = getCart();
  if (cart.length === 0) {
    alert("Your cart is empty.");
    return;
  }

  const form = event.currentTarget;
  const submitButton = form.querySelector ? form.querySelector('button[type="submit"]') : null;
  if (submitButton) {
    submitButton.disabled = true;
  }

  const formData = new FormData(form);
  const email = formData.get("email").trim();
  const deliveryRegion = formData.get("deliveryRegion") || getSelectedRegion();
  saveSelectedRegion(deliveryRegion);
  syncRegionSelectorValues();
  const orderedProducts = cart.map(item => {
    const product = findProduct(item.productId);
    const pricing = getProductPricing(product, deliveryRegion);
    return {
      id: product.id,
      name: product.name,
      price: pricing.amount,
      unitPrice: pricing.amount,
      currency: pricing.currency,
      pricingRegion: hasRegionalPricing(product) ? deliveryRegion : null,
      pricingRegionLabel: hasRegionalPricing(product) ? getRegionLabel(deliveryRegion) : null,
      image: product.image,
      quantity: item.quantity,
      total: pricing.amount * item.quantity
    };
  });
  const subtotalBreakdown = getCartSubtotalBreakdown(deliveryRegion);

  const order = {
    id: `UBE-${Date.now()}`,
    customerName: formData.get("name").trim(),
    phone: formData.get("phone").trim(),
    email,
    deliveryRegion,
    deliveryRegionLabel: getRegionLabel(deliveryRegion),
    deliveryAddress: formData.get("address").trim(),
    notes: formData.get("notes").trim(),
    products: orderedProducts,
    subtotal: subtotalBreakdown,
    subtotalBreakdown,
    subtotalText: formatSubtotalBreakdown(subtotalBreakdown),
    createdAt: new Date().toISOString(),
    status: "Pending",
    sheetSyncStatus: "Not synced yet"
  };

  try {
    order.sheetSyncStatus = await sendOrderToGoogleSheets(order);
    order.sheetSyncError = "";
  } catch (error) {
    order.sheetSyncStatus = "Pending sheet sync";
    order.sheetSyncError = error.message || "Google Sheets sync failed.";
    console.error("Google Sheets sync failed:", error);
  }

  const orders = getOrders();
  orders.unshift(order);
  saveOrders(orders);

  saveCart([]);
  updateCartUI();
  renderCheckoutItems();
  form.reset();
  form.hidden = true;

  const message = document.querySelector("[data-order-message]");
  if (message) {
    message.textContent = `Thank you for your order! Please wait for confirmation and details in your email: ${email}.`;
    message.hidden = false;
  }

  if (submitButton) {
    submitButton.disabled = false;
  }
}

async function sendOrderToGoogleSheets(order) {
  if (typeof window === "undefined" || window.location.protocol === "file:") {
    return "Local only";
  }

  const response = await fetch("/api/orders", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ order })
  });
  const data = await response.json().catch(() => ({}));

  if (!response.ok || !data.ok) {
    throw new Error(data.error || "Unable to sync order with Google Sheets.");
  }

  return data.sheetStatus || "Synced";
}

async function syncOrderStatusToGoogleSheets(orderId, status) {
  if (typeof window === "undefined" || window.location.protocol === "file:") {
    return "Local only";
  }

  const response = await fetch("/api/orders", {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ orderId, status })
  });
  const data = await response.json().catch(() => ({}));

  if (!response.ok || !data.ok) {
    throw new Error(data.error || "Unable to sync order status with Google Sheets.");
  }

  return data.sheetStatus || "Synced";
}

function setupForumPage() {
  renderForumLoginState();
  renderForumPosts();

  const loginForm = document.querySelector("[data-login-form]");
  const postForm = document.querySelector("[data-post-form]");
  const logoutButton = document.querySelector("[data-logout-button]");

  if (loginForm) {
    loginForm.addEventListener("submit", event => {
      event.preventDefault();
      const username = new FormData(loginForm).get("username").trim();
      if (!username) {
        return;
      }
      localStorage.setItem(STORAGE_KEYS.username, username);
      loginForm.reset();
      renderForumLoginState();
    });
  }

  if (logoutButton) {
    logoutButton.addEventListener("click", () => {
      localStorage.removeItem(STORAGE_KEYS.username);
      renderForumLoginState();
    });
  }

  if (postForm) {
    postForm.addEventListener("submit", event => {
      event.preventDefault();
      const username = localStorage.getItem(STORAGE_KEYS.username);
      const notice = document.querySelector("[data-forum-login-notice]");

      if (!username) {
        notice.hidden = false;
        notice.textContent = "Please log in to post a message.";
        return;
      }

      const message = new FormData(postForm).get("message").trim();
      if (!message) {
        return;
      }

      const posts = getPosts();
      posts.unshift({
        id: Date.now(),
        username,
        message,
        createdAt: new Date().toISOString()
      });
      savePosts(posts);
      postForm.reset();
      notice.hidden = true;
      renderForumPosts();
    });
  }
}

function renderForumLoginState() {
  const username = localStorage.getItem(STORAGE_KEYS.username);
  const loginPanel = document.querySelector("[data-login-panel]");
  const logoutButton = document.querySelector("[data-logout-button]");
  const notice = document.querySelector("[data-forum-login-notice]");

  if (loginPanel) {
    loginPanel.hidden = Boolean(username);
  }

  if (logoutButton) {
    logoutButton.hidden = !username;
    logoutButton.textContent = username ? `Log out ${username}` : "Log out";
  }

  if (notice) {
    notice.hidden = true;
    notice.textContent = "";
  }
}

function renderForumPosts() {
  const container = document.querySelector("[data-forum-posts]");
  if (!container) {
    return;
  }

  const posts = getPosts();

  if (posts.length === 0) {
    container.innerHTML = `<p class="empty-state">No messages yet.</p>`;
    return;
  }

  container.innerHTML = posts.map(post => `
    <article class="forum-post">
      <div class="forum-post-meta">
        ${post.username}
        <span>${formatDateTime(post.createdAt)}</span>
      </div>
      <div class="forum-post-content">${escapeHTML(post.message)}</div>
    </article>
  `).join("");
}

function setupAdminPage() {
  renderAdminState();

  const loginForm = document.querySelector("[data-admin-login-form]");
  const logoutButton = document.querySelector("[data-admin-logout]");
  const productForm = document.querySelector("[data-product-form]");
  const clearProductFormButton = document.querySelector("[data-clear-product-form]");
  const orderSearch = document.querySelector("[data-order-search]");

  if (loginForm) {
    loginForm.addEventListener("submit", event => {
      event.preventDefault();
      const data = new FormData(loginForm);
      const username = data.get("username").trim();
      const password = data.get("password").trim();
      const message = document.querySelector("[data-admin-login-message]");

      if (username === "admin" && password === "admin123") {
        localStorage.setItem(STORAGE_KEYS.adminLoggedIn, "true");
        loginForm.reset();
        renderAdminState();
      } else if (message) {
        message.textContent = "Invalid admin login.";
        message.hidden = false;
      }
    });
  }

  if (logoutButton) {
    logoutButton.addEventListener("click", () => {
      localStorage.removeItem(STORAGE_KEYS.adminLoggedIn);
      renderAdminState();
    });
  }

  if (productForm) {
    productForm.addEventListener("submit", saveAdminProduct);
  }

  if (clearProductFormButton) {
    clearProductFormButton.addEventListener("click", clearProductForm);
  }

  if (orderSearch) {
    orderSearch.addEventListener("input", () => renderAdminOrders(orderSearch.value));
  }
}

function renderAdminState() {
  const isLoggedIn = localStorage.getItem(STORAGE_KEYS.adminLoggedIn) === "true";
  const loginPanel = document.querySelector("[data-admin-login-panel]");
  const dashboard = document.querySelector("[data-admin-dashboard]");

  if (loginPanel) {
    loginPanel.hidden = isLoggedIn;
  }

  if (dashboard) {
    dashboard.hidden = !isLoggedIn;
  }

  if (isLoggedIn) {
    renderDashboardSummary();
    renderAdminProducts();
    renderAdminOrders();
    renderAdminForumPosts();
  }
}

function renderDashboardSummary() {
  const container = document.querySelector("[data-dashboard-summary]");
  if (!container) {
    return;
  }

  const products = getProducts();
  const orders = getOrders();
  const pendingOrders = orders.filter(order => order.status === "Pending").length;
  const totalSales = getTotalSalesBreakdown(orders);
  const lowStock = products.filter(product => Number(product.stock) > 0 && Number(product.stock) <= 5).length;
  const soldOut = products.filter(product => isSoldOut(product)).length;

  const cards = [
    ["Total products", products.length],
    ["Total orders", orders.length],
    ["Pending orders", pendingOrders],
    ["Total sales", formatSubtotalBreakdown(totalSales)],
    ["Low stock items", lowStock],
    ["Sold out products", soldOut]
  ];

  container.innerHTML = cards.map(([label, value]) => `
    <article class="summary-card">
      <span>${label}</span>
      <strong>${value}</strong>
    </article>
  `).join("");
}

function renderAdminProducts() {
  const container = document.querySelector("[data-admin-products]");
  if (!container) {
    return;
  }

  const products = getProducts();

  if (products.length === 0) {
    container.innerHTML = `<tr><td colspan="5">No products yet.</td></tr>`;
    return;
  }

  container.innerHTML = products.map(product => `
    <tr>
      <td>
        <div class="table-product">
          <img src="${product.image}" alt="${product.name}">
          <div>
            <strong>${product.name}</strong>
            <p>${product.description}</p>
          </div>
        </div>
      </td>
      <td>
        <strong>${formatProductPrice(product)}</strong>
        ${getProductPriceNoteHTML(product)}
      </td>
      <td>${product.stock}</td>
      <td>${stockLabel(product)}</td>
      <td>
        <div class="table-actions">
          <button class="mini-button" type="button" data-edit-product="${product.id}">Edit</button>
          <button class="mini-button" type="button" data-toggle-soldout="${product.id}">
            ${isSoldOut(product) ? "Restock" : "Sold out"}
          </button>
          <button class="danger-button" type="button" data-delete-product="${product.id}">Delete</button>
        </div>
      </td>
    </tr>
  `).join("");

  container.querySelectorAll("[data-edit-product]").forEach(button => {
    button.addEventListener("click", () => fillProductForm(button.dataset.editProduct));
  });

  container.querySelectorAll("[data-toggle-soldout]").forEach(button => {
    button.addEventListener("click", () => toggleSoldOut(button.dataset.toggleSoldout));
  });

  container.querySelectorAll("[data-delete-product]").forEach(button => {
    button.addEventListener("click", () => deleteProduct(button.dataset.deleteProduct));
  });
}

function saveAdminProduct(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const data = new FormData(form);
  const products = getProducts();
  const id = data.get("id") ? Number(data.get("id")) : Date.now();
  const existing = products.find(product => Number(product.id) === id);
  const stock = Number(data.get("stock"));
  const currency = (data.get("currency") || "PHP").trim().toUpperCase();
  const regionalPriceValues = {
    philippines: data.get("pricePhilippines"),
    nearbyAsia: data.get("priceNearbyAsia"),
    overseas: data.get("priceOverseas")
  };
  const hasRegionalPrices = Object.values(regionalPriceValues).every(value => value !== null && value !== "");
  const regionalPrices = {
    philippines: Number(regionalPriceValues.philippines),
    nearbyAsia: Number(regionalPriceValues.nearbyAsia),
    overseas: Number(regionalPriceValues.overseas)
  };
  const savedProduct = {
    id,
    name: data.get("name").trim(),
    image: data.get("image").trim(),
    price: hasRegionalPrices ? regionalPrices.philippines : Number(data.get("price")),
    currency,
    stock,
    description: data.get("description").trim(),
    soldOut: stock <= 0
  };

  if (hasRegionalPrices) {
    savedProduct.regionalPrices = regionalPrices;
  }

  if (existing) {
    Object.assign(existing, savedProduct);
    if (!hasRegionalPrices) {
      delete existing.regionalPrices;
    }
  } else {
    products.unshift(savedProduct);
  }

  saveProducts(products);
  clearProductForm();
  renderAdminProducts();
  renderDashboardSummary();
}

function fillProductForm(productId) {
  const product = findProduct(productId);
  const form = document.querySelector("[data-product-form]");
  if (!product || !form) {
    return;
  }

  form.elements.id.value = product.id;
  form.elements.name.value = product.name;
  form.elements.image.value = product.image;
  form.elements.price.value = product.price;
  form.elements.currency.value = product.currency || "PHP";
  form.elements.stock.value = product.stock;
  form.elements.description.value = product.description;
  form.elements.pricePhilippines.value = product.regionalPrices ? product.regionalPrices.philippines : "";
  form.elements.priceNearbyAsia.value = product.regionalPrices ? product.regionalPrices.nearbyAsia : "";
  form.elements.priceOverseas.value = product.regionalPrices ? product.regionalPrices.overseas : "";
  form.scrollIntoView({ behavior: "smooth", block: "center" });
}

function clearProductForm() {
  const form = document.querySelector("[data-product-form]");
  if (form) {
    form.reset();
    form.elements.id.value = "";
    form.elements.currency.value = "PHP";
  }
}

function toggleSoldOut(productId) {
  const products = getProducts();
  const product = products.find(item => Number(item.id) === Number(productId));

  if (!product) {
    return;
  }

  if (isSoldOut(product)) {
    product.soldOut = false;
    if (Number(product.stock) <= 0) {
      product.stock = 1;
    }
  } else {
    product.soldOut = true;
  }

  saveProducts(products);
  renderAdminProducts();
  renderDashboardSummary();
}

function deleteProduct(productId) {
  const products = getProducts().filter(product => Number(product.id) !== Number(productId));
  const cart = getCart().filter(item => Number(item.productId) !== Number(productId));
  saveProducts(products);
  saveCart(cart);
  renderAdminProducts();
  renderDashboardSummary();
  updateCartUI();
}

function renderAdminOrders(searchTerm = "") {
  const container = document.querySelector("[data-admin-orders]");
  if (!container) {
    return;
  }

  const query = searchTerm.trim().toLowerCase();
  const orders = getOrders().filter(order => {
    const searchable = `${order.id} ${order.customerName} ${order.email}`.toLowerCase();
    return searchable.includes(query);
  });

  if (orders.length === 0) {
    container.innerHTML = `<tr><td colspan="5">No orders found.</td></tr>`;
    return;
  }

  container.innerHTML = orders.map(order => `
    <tr>
      <td>
        <strong>${order.id}</strong>
        <p>${formatDateTime(order.createdAt)}</p>
        <p><strong>Sheet:</strong> ${order.sheetSyncStatus || "Local order"}</p>
      </td>
      <td>
        <strong>${order.customerName}</strong>
        <p>${order.email}</p>
        <p>${order.phone}</p>
        <p><strong>Region:</strong> ${order.deliveryRegionLabel || (order.deliveryRegion ? getRegionLabel(order.deliveryRegion) : "Not recorded")}</p>
        <p>${order.deliveryAddress}</p>
      </td>
      <td>
        ${order.products.map(product => `
          <p>${product.name} x ${product.quantity} (${formatMoney(product.total, product.currency || "PHP")})${product.pricingRegionLabel ? ` - ${product.pricingRegionLabel}` : ""}</p>
        `).join("")}
      </td>
      <td>${formatOrderSubtotal(order)}</td>
      <td>
        <select data-order-status="${order.id}">
          ${orderStatuses.map(status => `
            <option value="${status}" ${status === order.status ? "selected" : ""}>${status}</option>
          `).join("")}
        </select>
      </td>
    </tr>
  `).join("");

  container.querySelectorAll("[data-order-status]").forEach(select => {
    select.addEventListener("change", () => updateOrderStatus(select.dataset.orderStatus, select.value));
  });
}

async function updateOrderStatus(orderId, status) {
  const orders = getOrders();
  const order = orders.find(item => item.id === orderId);

  if (!order) {
    return;
  }

  order.status = status;
  order.sheetSyncStatus = "Status pending sheet sync";
  saveOrders(orders);
  renderDashboardSummary();

  try {
    order.sheetSyncStatus = await syncOrderStatusToGoogleSheets(orderId, status);
    order.sheetSyncError = "";
  } catch (error) {
    order.sheetSyncStatus = "Pending sheet sync";
    order.sheetSyncError = error.message || "Google Sheets status sync failed.";
    console.error("Google Sheets status sync failed:", error);
  }

  saveOrders(orders);
  renderAdminOrders(document.querySelector("[data-order-search]")?.value || "");
  renderDashboardSummary();
}

function renderAdminForumPosts() {
  const container = document.querySelector("[data-admin-forum-posts]");
  if (!container) {
    return;
  }

  const posts = getPosts();

  if (posts.length === 0) {
    container.innerHTML = `<p class="empty-state">No forum messages yet.</p>`;
    return;
  }

  container.innerHTML = posts.map(post => `
    <article class="admin-forum-item">
      <div>
        <strong>${post.username}</strong>
        <p>${formatDateTime(post.createdAt)}</p>
        <p>${escapeHTML(post.message)}</p>
      </div>
      <button class="danger-button" type="button" data-delete-post="${post.id}">Delete</button>
    </article>
  `).join("");

  container.querySelectorAll("[data-delete-post]").forEach(button => {
    button.addEventListener("click", () => deleteForumPost(button.dataset.deletePost));
  });
}

function deleteForumPost(postId) {
  const posts = getPosts().filter(post => Number(post.id) !== Number(postId));
  savePosts(posts);
  renderAdminForumPosts();
}

function escapeHTML(value) {
  const div = document.createElement("div");
  div.textContent = value;
  return div.innerHTML;
}
