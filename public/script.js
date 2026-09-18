// 1. Universal Notification Handlers
function showLoginAlert(message, type = 'error') {
    const banner = document.getElementById('loginAlert');
    const msgText = document.getElementById('alertMessage');
    if (!banner || !msgText) return;
    
    msgText.innerText = message;
    banner.className = 'alert-banner ' + (type === 'info' ? 'info-state' : 'error-state');
    banner.classList.remove('hidden');
}

function showToastNotification(message) {
    const popup = document.getElementById('error-popup');
    if (!popup) return;
    popup.innerText = message;
    popup.classList.add('show');
    setTimeout(() => { popup.classList.remove('show'); }, 3500);
}

// 2. Fetch and Render Live Inventory
async function loadInventory() {
    const token = localStorage.getItem('pharmacy_token');
    const tbody = document.getElementById('inventoryBody');
    if (!token || !tbody) return;

    try {
        const response = await fetch('/api/products', {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();

        if (data.success) {
            tbody.innerHTML = ''; // Clear old rows
            data.products.forEach(product => {
                const row = document.createElement('tr');
                row.style.borderBottom = '1px solid #eee';
                row.innerHTML = `
                    <td style="padding: 8px; font-weight: bold;">${product.id}</td>
                    <td style="padding: 8px;">${product.name}</td>
                    <td style="padding: 8px;">$${product.unit_price}</td>
                    <td style="padding: 8px; color: ${product.current_stock_level < 10 ? 'red' : 'green'}; font-weight: bold;">
                        ${product.current_stock_level}
                    </td>
                `;
                tbody.appendChild(row);
            });
        }
    } catch (error) {
        console.error('Failed to load inventory:', error);
    }
}

// 3. UI Routing Engine Based on Roles
function renderDashboard() {
    const token = localStorage.getItem('pharmacy_token');
    const role = localStorage.getItem('pharmacy_role');
    
    if (!token) return;

    document.getElementById('loginSection').classList.add('hidden');
    document.getElementById('inventorySection').classList.remove('hidden'); // Show inventory feed
    
    if (role === 'admin') {
        document.getElementById('salesSection').classList.remove('hidden');
        document.getElementById('auditSection').classList.remove('hidden');
    } else if (role === 'staff') {
        document.getElementById('salesSection').classList.remove('hidden');
        document.getElementById('auditSection').classList.add('hidden');
    }
    
    loadInventory(); // Populate table fields instantly
}

window.onload = () => {
    const token = localStorage.getItem('pharmacy_token');
    if (!token) {
        document.getElementById('loginSection').classList.remove('hidden');
        document.getElementById('salesSection').classList.add('hidden');
        document.getElementById('auditSection').classList.add('hidden');
        document.getElementById('inventorySection').classList.add('hidden');
    } else {
        renderDashboard();
    }
};

// LOGIN CONTROLLER
document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('loginUser').value;
    const password = document.getElementById('loginPass').value;

    try {
        const response = await fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        const data = await response.json();

        if (data.success) {
            localStorage.setItem('pharmacy_token', data.token);
            localStorage.setItem('pharmacy_role', data.user.role);
            const banner = document.getElementById('loginAlert');
            if(banner) banner.classList.add('hidden');
            renderDashboard();
        } else {
            showLoginAlert(data.message, 'error');
        }
    } catch (error) { 
        console.error('Login Failed:', error); 
        showLoginAlert('Server connection failed.', 'error');
    }
});

// POINT OF SALE CONTROLLER
document.getElementById('salesForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const product_id = document.getElementById('sellProductId').value;
    const quantity = document.getElementById('sellQuantity').value;
    const token = localStorage.getItem('pharmacy_token');

    try {
        const response = await fetch('/api/sell', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}` 
            },
            body: JSON.stringify({ product_id, quantity })
        });

        if (response.status === 401 || response.status === 403) {
            logout();
            showLoginAlert('Session invalid or expired. Re-authenticate.', 'error');
            return;
        }

        const data = await response.json();
        showToastNotification(data.message);
        
        if (data.success) {
            document.getElementById('sellProductId').value = '';
            document.getElementById('sellQuantity').value = '';
            loadInventory(); // Instantly update frontend numbers down inside the feed card
        }
    } catch (error) { console.error('Sale Failed:', error); }
});

// AUDIT CONTROLLER
document.getElementById('auditForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const product_id = document.getElementById('productId').value;
    const physical_count = document.getElementById('physicalCount').value;
    const token = localStorage.getItem('pharmacy_token');

    try {
        const response = await fetch('/api/audit', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ product_id, physical_count })
        });

        if (response.status === 401 || response.status === 403) {
            logout();
            showLoginAlert('Session invalid or expired. Re-authenticate.', 'error');
            return;
        }

        const data = await response.json();

        if (data.success) {
            const resultBox = document.getElementById('auditResult');
            resultBox.style.display = 'block';
            document.getElementById('expectedStock').innerText = data.data.expected;
            document.getElementById('actualCount').innerText = data.data.actual;
            document.getElementById('leakageAmount').innerText = data.data.leakage;

            if (data.data.leakage > 0) {
                resultBox.className = 'result-box leak';
                document.getElementById('statusText').innerText = '🚨 WARNING: Stock Discrepancy';
            } else {
                resultBox.className = 'result-box safe';
                document.getElementById('statusText').innerText = '✅ Stock is Accurate';
            }
        } else { 
            showToastNotification('Access Denied: ' + data.message); 
        }
    } catch (error) { console.error('Audit Failed:', error); }
});

// SYSTEM RESET (LOGOUT)
function logout() {
    localStorage.removeItem('pharmacy_token');
    localStorage.removeItem('pharmacy_role');
    document.getElementById('salesSection').classList.add('hidden');
    document.getElementById('auditSection').classList.add('hidden');
    document.getElementById('inventorySection').classList.add('hidden');
    document.getElementById('loginSection').classList.remove('hidden');
    document.getElementById('auditResult').style.display = 'none';

    showLoginAlert('Logged out successfully.', 'info');
}