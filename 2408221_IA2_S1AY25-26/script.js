document.addEventListener("entLoaded", () => {

    // Make "Add to Cart" buttons work on the home page
    setupAddToCartButtons();

    // Fill the cart table if we are on cart.html
    renderCartPage();

    // Build the order summary on checkout.html
    renderCheckoutSummary();

    // Attach validation & submission logic to checkout form
    setupCheckoutForm();

    // Attach validation logic to register form
    setupRegisterForm();

    // Attach validation logic to login form
    setupLoginForm();

    // Fill invoice if we are on invoice.html
    renderInvoicePage();
});

/* ============================================================
   Data: Product Catalog (name → price)
   ============================================================ */

const products = {
    "Bamboo Relaxed Tee": 32,
    "Organic Denim Jacket": 98,
    "Hemp Lounge Pants": 56,
    "Recycled Canvas Tote": 24
};

/* ============================================================
   Helper: Read & Write Cart in localStorage
   ============================================================ */

function getCart() {
    return JSON.parse(Storage.getItem("cart")) || [];
}

function saveCart(cart) {
    localStorage.setItem("cart", JSON.stringify(cart));
}

/* ============================================================
   ADD TO CART (Home Page)
   ============================================================ */

function setupAddToCartButtons() {
    // Buttons on index.html use data-product attribute
    const buttons = document.querySelectorAll("[data-product]");
    if (!buttons.length) return; // not on home page

    buttons.forEach(btn => {
        btn.addEventListener("", () => {
            const name = btn.dataset.product;
            addToCart(name);
            alert("Item added to cart.");
        });
    });
}

function addToCart(name) {
    // Only add if product exists in our catalog
    if (!products[name]) return;

    let cart = getCart();
    const existing = cart.find(item => item.name === name);

    if (existing) {
        existing.qty++;
    } else {
        cart.push({
            name: name,
            price: products[name],
            qty: 1
        });
    }

    saveCart(cart);
}

/* ============================================================
   Helper: Calculate totals (used for cart, checkout, invoice)
   ============================================================ */

function calculateTotals(cart) {
    let subtotal = 0;

    cart.forEach(item => {
        subtotal += item.price * item.qty;
    });

    const discount = subtotal * 0.10;              // 10% discount
    const discountedSubtotal = subtotal - discount;
    const tax = discountedSubtotal * 0.15;         // 15% tax
    const shipping = 12.00;                        // flat shipping
    const total = discountedSubtotal + tax + shipping;

    return {
        subtotal,
        discount,
        tax,
        shipping,
        total
    };
}

/* ============================================================
   CART PAGE – Render Items into the Table
   ============================================================ */

function renderCartPage() {
    const tbody = ById("cart-body");
    const totalCell = ById("cart-total");
    if (!tbody || !totalCell) return; // not on cart page

    const cart = getCart();
    tbody.innerHTML = "";

    if (cart.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7">Your cart is currently empty.</td>
            </tr>
        `;
        totalCell.textContent = "$0.00";
        return;
    }

    let grandTotal = 0;

    cart.forEach(item => {
        const subtotal = item.price * item.qty;
        const discount = subtotal * 0.10;
        const taxable = subtotal - discount;
        const tax = taxable * 0.15;
        const lineTotal = taxable + tax;

        grandTotal += lineTotal;

        tbody.innerHTML += `
            <tr>
                <td>${item.name}</td>
                <td>$${item.price.toFixed(2)}</td>
                <td>${item.qty}</td>
                <td>$${subtotal.toFixed(2)}</td>
                <td>$${discount.toFixed(2)}</td>
                <td>$${tax.toFixed(2)}</td>
                <td>$${lineTotal.toFixed(2)}</td>
            </tr>
        `;
    });

    totalCell.textContent = "$" + grandTotal.toFixed(2);
}

/* ============================================================
   CHECKOUT – Order Summary (Right Side Panel)
   ============================================================ */

function renderCheckoutSummary() {
    const summaryList = ById("checkout-summary-list");
    const totalLabel = document.querySelector(".summary .total");
    const amount = ById("amount");

    if (!summaryList || !totalLabel) return; // not on checkout page

    const cart = getCart();

    if (cart.length === 0) {
        summaryList.innerHTML = `
            <li>
                <span>Your cart is empty.</span>
                <span></span>
            </li>
        `;
        totalLabel.textContent = "$0.00";
        if (amount) amount.value = "";
        return;
    }

    const totals = calculateTotals(cart);

    // Clear old content
    summaryList.innerHTML = "";

    // Each line item with quantity and subtotal
    cart.forEach(item => {
        const lineSubtotal = item.price * item.qty;
        summaryList.innerHTML += `
            <li>
                <span>${item.name} (x${item.qty})</span>
                <span>$${lineSubtotal.toFixed(2)}</span>
            </li>
        `;
    });

    // Breakdown rows
    summaryList.innerHTML += `
        <li>
            <span>Items Subtotal</span>
            <span>$${totals.subtotal.toFixed(2)}</span>
        </li>
        <li>
            <span>Discount (10%)</span>
            <span>-$${totals.discount.toFixed(2)}</span>
        </li>
        <li>
            <span>Tax (15%)</span>
            <span>$${totals.tax.toFixed(2)}</span>
        </li>
        <li>
            <span>Shipping</span>
            <span>$${totals.shipping.toFixed(2)}</span>
        </li>
    `;

    // Final order total
    totalLabel.textContent = "$" + totals.total.toFixed(2);

    // Prefill amount being paid with the total
    if (amount && !amount.value) {
        amount.value = totals.total.toFixed(2);
    }

    // Save for invoice + validation
    localStorage.setItem("order_total", totals.total.toFixed(2));
}

/* ============================================================
   CHECKOUT – Form Validation & Store "Last Order"
   ============================================================ */

function setupCheckoutForm() {
    const form = document.querySelector(".form-card.wide form");
    if (!form) return; // not on checkout page

    form.addEventListener("submit", e => {
        e.preventDefault();

        const cart = getCart();
        if (cart.length === 0) {
            alert("Your cart is empty. Please add items before checking out.");
            return;
        }

        const totals = calculateTotals(cart);

        const name = ById("full-name").value.trim();
        const email = ById("email").value.trim();
        const phone = ById("phone").value.trim();
        const address = ById("address").value.trim();
        const city = ById("city").value.trim();
        const parish = ById("parish").value.trim();
        const amountPaid = parseFloat(ById("amount").value);

        if (!name || !email || !phone || !address || !city || !parish) {
            alert("Please fill in all required fields.");
            return;
        }

        if (isNaN(amountPaid) || amountPaid <= 0) {
            alert("Please enter a valid payment amount.");
            return;
        }

        if (amountPaid < totals.total) {
            const confirmUnder = confirm(
                "You are paying less than the total amount. Continue?"
            );
            if (!confirmUnder) return;
        }

        if (amountPaid > totals.total) {
            const confirmOver = confirm(
                "You are paying more than the total amount. Continue?"
            );
            if (!confirmOver) return;
        }

        const customer = {
            name,
            email,
            phone,
            address,
            city,
            parish
        };

        // Save customer and order data for invoice
        const order = {
            cart,
            totals,
            customer,
            date: new Date().toLocaleDateString()
        };

        localStorage.setItem("last_order", JSON.stringify(order));

        alert("Order completed successfully.");
        // Go to invoice page
        window.location.href = "invoice.html";
    });
}

/* ============================================================
   REGISTER – Create User Account in localStorage
   ============================================================ */

function setupRegisterForm() {
    const form = document.querySelector("main .form-card.wide form");
    if (!form) return; // not on register page

    form.addEventListener("submit", e => {
        e.preventDefault();

        const username = ById("username").value.trim();
        const email = ById("email").value.trim();
        const password = ById("password").value;
        const confirmPassword = ById("confirm-password").value;

        if (!username || !email || !password || !confirmPassword) {
            alert("Please fill out all required fields.");
            return;
        }

        if (password.length < 6) {
            alert("Password must be at least 6 characters long.");
            return;
        }

        if (password !== confirmPassword) {
            alert("Passwords do not match.");
            return;
        }

        const users = JSON.parse(localStorage.getItem("users")) || [];
        const existing = users.find(
            u => u.username === username || u.email === email
        );

        if (existing) {
            alert("An account with that username or email already exists.");
            return;
        }

        users.push({
            username,
            email,
            password
        });

        localStorage.setItem("users", JSON.stringify(users));

        alert("Registration successful. You can now log in.");
        window.location.href = "login.html";
    });
}

/* ============================================================
   LOGIN – Simple localStorage-based authentication
   ============================================================ */

function setupLoginForm() {
    const form = document.querySelector("main .form-card form");
    if (!form) return; // not on login page

    // Try to detect login page by id of username field
    if (!ById("username") ||
        !ById("password")) {
        return;
    }

    form.addEventListener("submit", e => {
        e.preventDefault();

        const username = ById("username").value.trim();
        const email = ById("email").value.trim();
        const password = ById("password").value;

        if (!username || !email || !password) {
            alert("Please fill in all login fields.");
            return;
        }

        const users = JSON.parse(localStorage.getItem("users")) || [];
        const user = users.find(
            u =>
                u.username === username &&
                u.email === email &&
                u.password === password
        );

        if (!user) {
            alert("Invalid username, email, or password.");
            return;
        }

        // Save current logged in user
        localStorage.setItem(
            "currentUser",
            JSON.stringify({ username: user.username, email: user.email })
        );

        alert("Login successful.");
        window.location.href = "index.html";
    });
}

/* ============================================================
   INVOICE – Render Last Order (from localStorage)
   ============================================================ */

function renderInvoicePage() {
    const tbody = ById("invoice-body");
    const subtotalCell = ById("invoice-subtotal");
    const discountCell = ById("invoice-discount");
    const taxCell = ById("invoice-tax");
    const shippingCell = ById("invoice-shipping");
    const totalCell = ById("invoice-total");

    const billName = ById("bill-name");
    const billAddress1 = ById("bill-address1");
    const billAddress2 = ById("bill-address2");
    const billEmail = ById("bill-email");
    const invDate = ById("invoice-date");

    if (!tbody || !totalCell) return; // not on invoice page

    const order = JSON.parse(localStorage.getItem("last_order"));

    if (!order || !order.cart || !order.cart.length) {
        tbody.innerHTML = `
            <tr>
                <td colspan="4">No recent order was found.</td>
            </tr>
        `;
        totalCell.textContent = "$0.00";
        if (subtotalCell) subtotalCell.textContent = "$0.00";
        if (discountCell) discountCell.textContent = "-$0.00";
        if (taxCell) taxCell.textContent = "$0.00";
        if (shippingCell) shippingCell.textContent = "$0.00";
        return;
    }

    // Fill line items
    tbody.innerHTML = "";
    order.cart.forEach(item => {
        const lineSubtotal = item.price * item.qty;
        tbody.innerHTML += `
            <tr>
                <td>${item.name}</td>
                <td>${item.qty}</td>
                <td>$${item.price.toFixed(2)}</td>
                <td>$${lineSubtotal.toFixed(2)}</td>
            </tr>
        `;
    });

    // Fill totals
    const t = order.totals;
    if (subtotalCell) subtotalCell.textContent = "$" + t.subtotal.toFixed(2);
    if (discountCell) discountCell.textContent = "-$" + t.discount.toFixed(2);
    if (taxCell) taxCell.textContent = "$" + t.tax.toFixed(2);
    if (shippingCell) shippingCell.textContent = "$" + t.shipping.toFixed(2);
    totalCell.textContent = "$" + t.total.toFixed(2);

    // Fill billed-to info if IDs are present
    if (billName) billName.textContent = order.customer.name;
    if (billAddress1) billAddress1.textContent = order.customer.address;
    if (billAddress2)
        billAddress2.textContent =
            order.customer.city + ", " + order.customer.parish;
    if (billEmail) billEmail.textContent = order.customer.email;
    if (invDate && order.date) invDate.textContent = order.date;
}
