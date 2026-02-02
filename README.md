# bikastore-api

# 🚀 BIKA STORE API  
Backend service for MLBB & PUBG top-up system.  
Handles **Web Orders → MongoDB → Telegram Bot → Admin Confirmation → User Result**.

Frontend Website: https://bikastore-web.onrender.com  
API Server: https://bikastore-api.onrender.com  

---

## 🧩 Features

### ✔ MLBB & PUBG Orders from Website  
- MLBB → ID + Server ID  
- PUBG → Character ID  
- Package + Price  
- Auto orderId generation  
- Order saved to MongoDB

### ✔ Payment Slip Upload (Web → Bot Admin)  
- Upload slip via website  
- File stored in `/uploads/payments/`  
- Telegram admin receives slip + order details  
- Order becomes `PENDING_CONFIRM`

### ✔ Admin Confirmation (From Bot or Web)  
- Approve → user receives “Order Completed”  
- Reject → user receives “Your order was rejected”

### ✔ Reviews System (1–5 Stars)  
- Users can submit rating + review text  
- Website can load the latest reviews

### ✔ Telegram Bot Bridge  
API communicates with Telegram Bot using Bot Token  
- Forward order to bot  
- Forward slip to bot  
- Update user after admin approval

---

# 📁 Project Structure
