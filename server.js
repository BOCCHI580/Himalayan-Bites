
const express = require("express");
const path = require("path");
const db = require("./server/db");
const session = require("express-session");
const bcrypt = require("bcrypt");
const app = express();
const PORT = 3000;

app.use(express.json());

app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 1000
    }
  })
);

app.use(express.static(path.join(__dirname, "public"), {
  index: false
}));
// Homepage
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});
// Admin login
app.post("/api/admin/login", async (req, res) => {
  const { username, password } = req.body;

  if (
    typeof username !== "string" ||
    typeof password !== "string" ||
   !process.env.ADMIN_USERNAME ||
   !process.env.ADMIN_PASSWORD_HASH
  ) {
    return res.status(400).json({
      error: "Please provide valid login details."
    });
  }

  const usernameMatches =
  username === process.env.ADMIN_USERNAME;

const passwordMatches =
  typeof password === "string" &&
  typeof process.env.ADMIN_PASSWORD_HASH === "string" &&
  await bcrypt.compare(
    password,
    process.env.ADMIN_PASSWORD_HASH
  );

  if (!usernameMatches || !passwordMatches) {
    return res.status(401).json({
      error: "Incorrect username or password."
    });
  }
req.session.regenerate((error) => {
  if (error) {
    console.error("Session regeneration error:", error.message);

    return res.status(500).json({
      error: "Unable to create a secure session."
    });
  }

  req.session.isAdmin = true;

 req.session.save((saveError) => {
  if (saveError) {
    console.error("Session save error:", saveError.message);

    return res.status(500).json({
      error: "Unable to save admin session."
    });
  }

  return res.json({
    message: "Admin login successful."
  });
});
});
});


// Admin logout
app.post("/api/admin/logout", (req, res) => {
  req.session.destroy((error) => {
    if (error) {
      return res.status(500).json({
        error: "Unable to log out."
      });
    }

    res.clearCookie("connect.sid");
    return res.json({ message: "Logged out successfully." });
  });
});
function requireAdmin(req, res, next) {
  if (req.session && req.session.isAdmin) {
    return next();
  }

  return res.status(401).json({
    error: "Unauthorized. Please log in as admin."
  });
}
// Show the admin login page
app.get("/admin/login", (req, res) => {
  if (req.session && req.session.isAdmin) {
    return res.redirect("/admin");
  }

  res.sendFile(path.join(__dirname, "admin", "login.html"));
});

// Protect the admin dashboard
// Protect the admin dashboard

// Protect the admin dashboard

// Protect the admin dashboard
app.get(["/admin", "/admin/"], requireAdmin, (req, res) => {
  res.sendFile(path.join(__dirname, "admin", "index.html"));
});




const allowedStatuses = [
  "pending",
  "accepted",
  "preparing",
  "ready",
  "out_for_delivery",
  "delivered",
  "cancelled"
];

// Update an order's status
app.patch("/api/orders/:id/status", requireAdmin, async (req, res) => {
  const orderId = Number(req.params.id);
  const { status } = req.body;

  if (!Number.isInteger(orderId) || orderId < 1) {
    return res.status(400).json({ error: "Invalid order ID." });
  }

  if (!allowedStatuses.includes(status)) {
    return res.status(400).json({ error: "Invalid order status." });
  }

  try {
    const [result] = await db.execute(
      "UPDATE orders SET status = ? WHERE id = ?",
      [status, orderId]
    );

    if (result.affectedRows === 0) {
      const [rows] = await db.execute(
        "SELECT id FROM orders WHERE id = ?",
        [orderId]
      );

      if (rows.length === 0) {
        return res.status(404).json({ error: "Order not found." });
      }
    }

    res.json({
      message: "Order status updated successfully.",
      orderId,
      status
    });
  } catch (error) {
    console.error("Update status error:", error.message);
    res.status(500).json({
      error: "Unable to update order status."
    });
  }
});

// Get the latest 100 orders
app.get("/api/orders", requireAdmin, async (req, res) => {
  try {
    const [orders] = await db.execute(
      `SELECT id, customer_name, phone, order_type,
              delivery_address, total_amount, status, created_at
       FROM orders
       ORDER BY id DESC
       LIMIT 100`
    );

    res.json(orders);
  } catch (error) {
    console.error("Fetch orders error:", error.message);

    res.status(500).json({
      error: "Unable to fetch orders."
    });
  }
});

// Place a new order
app.post("/api/orders", async (req, res) => {
  const { customerName, items, address } = req.body;

  if (
    !customerName ||
    !address ||
    !Array.isArray(items) ||
    items.length === 0
  ) {
    return res.status(400).json({
      error: "Please provide customer name, items, and address."
    });
  }

  let connection;

  try {
    connection = await db.getConnection();
    await connection.beginTransaction();

    let totalAmount = 0;
    const orderItems = [];

    for (const item of items) {
      const menuItemId = Number(item.id);
      const quantity = Number(item.quantity);

      if (
        !Number.isInteger(menuItemId) ||
        menuItemId < 1 ||
        !Number.isInteger(quantity) ||
        quantity < 1
      ) {
        throw new Error("Invalid menu item or quantity.");
      }

      const [menuRows] = await connection.execute(
        `SELECT id, name, price
         FROM menu_items
         WHERE id = ? AND is_available = 1`,
        [menuItemId]
      );

      if (menuRows.length === 0) {
        throw new Error("A selected menu item is unavailable.");
      }

      const menuItem = menuRows[0];
      const price = Number(menuItem.price);

      totalAmount += price * quantity;

      orderItems.push({
        id: menuItem.id,
        name: menuItem.name,
        price,
        quantity
      });
    }

    const [orderResult] = await connection.execute(
      `INSERT INTO orders
       (customer_name, phone, order_type, delivery_address, total_amount)
       VALUES (?, ?, 'delivery', ?, ?)`,
      [
        String(customerName).trim(),
        String(req.body.phone || "").trim(),
        String(address).trim(),
        totalAmount.toFixed(2)
      ]
    );

    for (const item of orderItems) {
      await connection.execute(
        `INSERT INTO order_items
         (order_id, menu_item_id, item_name, unit_price, quantity)
         VALUES (?, ?, ?, ?, ?)`,
        [
          orderResult.insertId,
          item.id,
          item.name,
          item.price.toFixed(2),
          item.quantity
        ]
      );
    }

    await connection.commit();

    res.status(201).json({
      message: "Order placed successfully!",
      orderId: orderResult.insertId,
      totalAmount: Number(totalAmount.toFixed(2))
    });
  }
    catch (error) {
    if (connection) {
      await connection.rollback();
    }

    console.error("Order error:", error);
    console.error("Order error details:", error.sqlMessage || error.message);


    res.status(400).json({
      error: error.message || "Unable to place your order."
    });
  } finally {
    if (connection) {
      connection.release();
    }
  }
});

app.listen(PORT, () => {
  console.log(
    `Himalayan Bites is running at http://localhost:${PORT}`
  );
});
