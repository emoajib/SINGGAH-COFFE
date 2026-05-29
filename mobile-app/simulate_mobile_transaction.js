const http = require('http');

// Configuration
const BASE_URL = 'http://localhost:8080/api';
const COLORS = {
    reset: "\x1b[0m",
    green: "\x1b[32m",
    blue: "\x1b[34m",
    red: "\x1b[31m",
    yellow: "\x1b[33m",
    cyan: "\x1b[36m"
};

// Helper: HTTP Request
function request(method, path, body = null, token = null) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'localhost',
            port: 8080,
            path: '/api' + path,
            method: method,
            headers: {
                'Content-Type': 'application/json',
            }
        };

        if (token) {
            options.headers['Authorization'] = `Bearer ${token}`;
        }

        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const json = data ? JSON.parse(data) : {};
                    resolve({ status: res.statusCode, data: json });
                } catch (e) {
                    resolve({ status: res.statusCode, data: data });
                }
            });
        });

        req.on('error', (e) => reject(e));
        if (body) req.write(JSON.stringify(body));
        req.end();
    });
}

// Prettify logs
const log = (step, msg) => console.log(`${COLORS.cyan}[${step}]${COLORS.reset} ${msg}`);
const success = (msg) => console.log(`${COLORS.green}  ✓ ${msg}${COLORS.reset}`);
const info = (msg) => console.log(`${COLORS.blue}  ℹ ${msg}${COLORS.reset}`);
const error = (msg) => console.log(`${COLORS.red}  ✗ ${msg}${COLORS.reset}`);

async function main() {
    console.log(`${COLORS.yellow}=== MOBILE APP LOGIC SIMULATION ====${COLORS.reset}\n`);

    try {
        // 1. Register Owner
        log("SETUP", "Registering Owner...");
        let res = await request('POST', '/auth/register', {
            name: "Owner User", email: "owner@test.com", password: "password123", role: "owner"
        });
        if (res.status === 201 || res.data.error === "User already exists") success("Owner Ready");
        else throw new Error("Failed to register owner: " + JSON.stringify(res.data));

        // 2. Login Owner (to setup Inventory)
        log("AUTH", "Logging in as Owner...");
        res = await request('POST', '/auth/login', { email: "owner@test.com", password: "password123" });
        const ownerToken = res.data.token;
        success("Owner Logged In");

        // 3. Create Ingredient (Coffee Beans)
        log("INVENTORY", "Creating Ingredient: Coffee Beans...");
        res = await request('POST', '/ingredients', {
            name: "Arabica Beans " + Date.now(), unit: "gr", min_stock: 1000, cost_per_unit: 100, current_stock: 5000
        }, ownerToken);
        if (res.status !== 201) throw new Error("Failed to create ingredient");
        const ingredientId = res.data.ID; // Ensure models.Ingredient returns ID in JSON (GORM default)
        success(`Ingredient Created (ID: ${ingredientId}, Stock: 5000gr)`);

        // 4. Create Product (Latte)
        log("MENU", "Creating Product: Iced Latte...");
        const recipe = [{ ingredient_id: ingredientId, quantity: 20 }]; // Uses 20gr per cup
        res = await request('POST', '/products', {
            name: "Iced Latte " + Date.now(),
            category: "Coffee",
            price: 25000,
            stock: 100,
            sku: "LATTE-001",
            description: "Best Latte",
            recipe: recipe
        }, ownerToken);

        // Check if product creation was successful
        if (res.status !== 201) throw new Error("Failed to create product: " + JSON.stringify(res.data));
        const productId = res.data.ID;
        success(`Product Created (ID: ${productId}, Price: 25000) - Linked to Ingredient ${ingredientId}`);

        // ==========================================
        // MOBILE APP FLOW STARTS HERE
        // ==========================================
        console.log(`\n${COLORS.yellow}--- CASHIER TABLET SESSION ---${COLORS.reset}`);

        // 5. Register Cashier
        log("MOBILE", "Registering Cashier Device...");
        res = await request('POST', '/auth/register', {
            name: "Cashier Budi", email: "cashier@test.com", password: "password123", role: "cashier"
        });
        if (res.status === 201 || res.data.error === "User already exists") success("Cashier Account Ready");

        // 6. Login Cashier
        log("MOBILE", "Login Screen: Authenticating...");
        res = await request('POST', '/auth/login', { email: "cashier@test.com", password: "password123" });
        if (res.status !== 200) throw new Error("Login failed");
        const mobileToken = res.data.token;
        const cashierName = res.data.user.name;
        success(`Logged in as: ${cashierName}`);

        // 7. Get Products (Grid View)
        log("MOBILE", "Dashboard: Fetching Product Grid...");
        res = await request('GET', '/products', null, mobileToken);
        const products = res.data;
        info(`Fetched ${products.length} products`);
        const targetProduct = products.find(p => p.ID === productId);
        if (targetProduct) success(`Found Target Product: ${targetProduct.name}`);
        else throw new Error("Target product not found in grid");

        // 8. Add to Cart & Checkout
        log("MOBILE", "POS: Adding to Cart & Checkout...");
        const orderPayload = {
            order_number: "MOB-" + Date.now(),
            payment_method: "cash",
            cashier_name: cashierName,
            items: [{ product_id: productId, quantity: 2 }] // Buy 2 Cups (Should deduct 40gr beans)
        };

        res = await request('POST', '/orders', orderPayload, mobileToken);
        if (res.status === 201) {
            success("Transaction Successful!");
            info("Order Number: " + orderPayload.order_number);
        } else {
            throw new Error("Transaction Failed: " + JSON.stringify(res.data));
        }

        // 9. Verify Stock Deduction (Back to Owner)
        console.log(`\n${COLORS.yellow}--- AUDIT (BACKEND CHECK) ---${COLORS.reset}`);
        log("AUDIT", "Checking Ingredient Stock...");
        res = await request('GET', '/ingredients', null, ownerToken);
        const updatedIng = res.data.find(i => i.ID === ingredientId);

        const expectedStock = 5000 - (20 * 2); // 5000 - 40 = 4960
        if (updatedIng.current_stock === expectedStock) {
            success(`Stock Verified! Initial: 5000 -> Current: ${updatedIng.current_stock}`);
            console.log(`\n${COLORS.green}✅ SYSTEM INTEGRATION TEST PASSED${COLORS.reset}`);
        } else {
            error(`Stock Mismatch. Expected ${expectedStock}, got ${updatedIng.current_stock}`);
        }

    } catch (e) {
        console.log(`\n${COLORS.red}❌ SIMULATION FAILED${COLORS.reset}`);
        console.error(e);
    }
}

// Wait for server to be likely up or just run
// We assume execution happens after user triggers it, but we can add a small delay/retry logic if needed
// For now, simple run.
setTimeout(main, 2000); 
