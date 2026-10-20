
const express = require("express");
const path = require("path");
const db = require("./server/db");

const app = express();
const PORT = 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

app.get("/api/health", (req, res) => {
  res.json({
    message: "Himalayan Bites server is running!"
  });
});

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

  const connection = await db.getConnection();

  try {
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
        "SELECT id, name, price FROM menu_items WHERE id = ? AND is_available = 1",
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
  } catch (error) {
    await connection.rollback();

    console.error("Order error:", error.message);

    res.status(400).json({
      error: error.message || "Unable to place your order."
    });
  } finally {
    connection.release();
  }
});

app.listen(PORT, () => {
  console.log(
    `Himalayan Bites is running at http://localhost:${PORT}`
  );
});
