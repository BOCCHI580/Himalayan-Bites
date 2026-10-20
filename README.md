# Himalayan Bites 🍜🏔️

A restaurant website project featuring a food menu, shopping cart, checkout page, and a Node.js backend connected to MySQL.

## ✨ Features

- Browse the restaurant website and menu
- Add food items to a shopping cart
- Proceed to checkout and submit an order
- Store orders and order items in MySQL
- Backend API built with Express
- Responsive website structure with HTML, CSS, and JavaScript

## 🛠️ Technologies Used

- **Frontend:** HTML, CSS, JavaScript
- **Backend:** Node.js, Express.js
- **Database:** MySQL
- **Database driver:** mysql2
- **Environment configuration:** dotenv
- **Version control:** Git and GitHub

## 📁 Project Structure

```text
himalayan-bites/
├── public/
│   ├── css/
│   ├── images/
│   ├── js/
│   ├── index.html
│   ├── menu.html
│   ├── cart.html
│   ├── checkout.html
│   └── orders.html
├── server/
│   └── db.js
├── .gitignore
├── package.json
├── package-lock.json
├── server.js
└── README.md
```

## ⚙️ Run Locally

### Prerequisites

- Node.js and npm
- MySQL Server
- Git (optional, for cloning the repository)

### 1. Clone the repository

```bash
git clone https://github.com/BOCCHI580/Himalayan-Bites.git
cd Himalayan-Bites
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

Create a `.env` file in the project root:

```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=himalayan_bites_db
```

Replace `your_mysql_password` with your own local MySQL password. **Never commit your real `.env` file to GitHub.**

### 4. Set up the database

Create a MySQL database named `himalayan_bites_db` and create the required tables: `menu_items`, `orders`, `order_items`, and `table_bookings`.

Add your own menu items to the `menu_items` table before testing orders.

### 5. Start the server

```bash
npm start
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## 🔌 API Endpoint

- `GET /api/health` — checks whether the server is running
- `POST /api/orders` — submits a delivery order

## 🚧 Future Improvements

- Restaurant table booking
- Order history and status tracking
- Improved validation and error handling
- Online deployment
- Screenshots and a live demo link

## 👨‍💻 Project Purpose

Built as a personal and college portfolio project to practise frontend development, backend APIs, database integration, and version control.

---

**Note:** This project currently runs locally. Online ordering requires the server and database to be hosted before it can accept orders from public visitors.
