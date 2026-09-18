const express = require('express');
const mysql = require('mysql2/promise');
const path = require('path');
const cors = require('cors');
const port = process.env.PORT || 5000;
const bcrypt = require('bcrypt');
const jwt =require('jsonwebtoken');
const secretKey = process.env.SECRET_KEY; 
const app = express();


app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

const db = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'pharmacy_db'
});
const verifyToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];    

    if(!authHeader){
        return res.status(401).json({success:false,message:"Token missing"});
    }

    try{
        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token,secretKey);
        req.user = decoded;
        next();
    }
    catch (error) {
        console.error("TOKEN VERIFICATION ERROR:", error);
        return res.status(401).json({success:false,message:"Invalid or expired token"});
    }
};
async function testConnection() {
    try {
        const connection = await db.getConnection();
        console.log('MySQL connected successfully');
        connection.release();
    } catch (err) {
        console.error("Critical Database Connection Error:", err.message);
    }
}
testConnection();
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});
app.post('/api/sell', verifyToken, async (req, res) => {
    const { product_id, quantity } = req.body;
    const user_id = req.user.userId;
    try {
        const [product] = await db.query(
            'SELECT unit_price, current_stock_level FROM product WHERE id=?', 
            [product_id]
        );

        if (product.length === 0) {
            return res.status(404).json({ success: false, message: "Product ID not found in database" });
        }

        if (product[0].current_stock_level < quantity) {
            return res.status(400).json({ success: false, message: "Insufficient stock available" });
        }

        const total_price = product[0].unit_price * quantity;

        await db.query(
            'INSERT INTO sales (product_id, quantity_sold, total_price, sold_by_user_id) VALUES (?,?,?,?)',
            [product_id, quantity, total_price, user_id]
        );

        await db.query(
            'UPDATE product SET current_stock_level = current_stock_level - ? WHERE id=?',
            [quantity, product_id]
        );

        res.json({ success: true, message: "Sale recorded successfully" });
    }
    catch (error) {
        console.error("SELL ROUTE ERROR:", error); 
        res.status(500).json({ 
            success: false, 
            message: "Database error during sale", 
            error: error.message 
        });
    }
});

app.post('/api/audit',verifyToken, async (req, res) => {
    if(req.user.role !== 'admin'){
        return res.status(403).json({success:false,
            message:"Access denied: Admins only"});
        }
    const { product_id, physical_count } = req.body;
    try {
        const [product] = await db.query(
            'SELECT current_stock_level FROM product WHERE id=?', 
            [product_id]
        );

        if (product.length === 0) {
            return res.status(404).json({ success: false, message: "Product not found" });
        }

        const expected_stock = product[0].current_stock_level;
        const leakage = expected_stock - physical_count;

        if (leakage !== 0) {
            console.log(`❗Leakage of ${leakage} detected for product ID ${product_id}`);
        }

        res.json({ 
            success: true, 
            message: "Audit completed", 
            data: {
                expected: expected_stock,
                actual: physical_count,
                leakage: leakage
            }
        });
    }      
    catch (error) {
        console.error("AUDIT ROUTE ERROR:", error);
        res.status(500).json({ 
            success: false, 
            message: "Database error during audit", 
            error: error.message 
        });
    }
});
app.post('/api/register', async (req, res) => {
    const {username,password,role} = req.body;
    try{
        if(!username || !password || !role){
            return res.status(400).json({success:false,message:"All fields are required"});
        }
        const saltRounds = 10;
        const hashedPassword=await bcrypt.hash(password,saltRounds);

        await db.query(
            'INSERT INTO users (username,password_hash,role) VALUES (?,?,?)',[username,hashedPassword,role || 'staff']
        );
        res.json({success:true,message:"User registered successfully"});

    } catch (error) {
        console.error("REGISTER ROUTE ERROR:", error);
        
        if(error.code=== "ER_DUP_ENTRY"){
            return res.status(400).json({success:false,message:"Username already exists"});
        }
        res.status(500).json({success:false,message:"Database error during registration",error:error.message});
    }
});
app.post('/api/login', async (req, res) => {
    const {username,password} = req.body;               
    try{
        const [users] = await db.query(
            'SELECT * FROM users WHERE username=?',[username]
        );
        if(users.length===0){
            return res.status(401).json({success:false,message:"Invalid username or password"});
        }
        const hashedPassword=users[0].password_hash;
        const isMatch =await bcrypt.compare(password,hashedPassword);
        if(isMatch){
            const token = jwt.sign({userId:users[0].id,username:users[0].username,role:users[0].role},secretKey,{expiresIn:'1h'});
            res.json({success:true,
                message:"Login successful",
                token:token,
                user:{
                    id:users[0].id,
                    username:users[0].username,
                    role:users[0].role
                }});

        } else {
            res.status(401).json({success:false,message:"Invalid username or password"});
        }   
    } catch (error) {
        console.error("LOGIN ROUTE ERROR:", error);
        res.status(500).json({success:false,message:"Database error during login",error:error.message});
    }

});
app.get('/api/products', verifyToken, async (req, res) => {
    try {
        const [products] = await db.query('SELECT id, name, unit_price, current_stock_level FROM product');
        res.json({ success: true, data: products });
    } catch (error) {
        console.error("PRODUCTS ROUTE ERROR:", error);
        res.status(500).json({ success: false, message: "Database error while fetching products", error: error.message });
    }
});

app.listen(port, () => {
    console.log(`Pharmacy_server running on http://localhost:${port}`);
});