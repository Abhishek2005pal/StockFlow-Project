require("dotenv").config();
const mongoose = require("mongoose");

const Company = require("./models/Company");
const Warehouse = require("./models/Warehouse");
const Supplier = require("./models/Supplier");
const Product = require("./models/Product");
const Inventory = require("./models/Inventory");
const InventoryLog = require("./models/InventoryLog");

async function seed() {
  if (!process.env.MONGO_URI) {
    throw new Error("MONGO_URI is not set");
  }

  await mongoose.connect(process.env.MONGO_URI);

  await Promise.all([
    InventoryLog.deleteMany({}),
    Inventory.deleteMany({}),
    Product.deleteMany({}),
    Supplier.deleteMany({}),
    Warehouse.deleteMany({}),
    Company.deleteMany({})
  ]);

  const company = await Company.create({
    name: "StockFlow Demo Co",
    email: "ops@stockflow-demo.example",
    phone: "+1-555-0100",
    address: "123 Market St"
  });

  const warehouse = await Warehouse.create({
    name: "Main Warehouse",
    location: "New York",
    company_id: company._id
  });

  const supplier = await Supplier.create({
    name: "Acme Supply",
    contact_email: "orders@acme.example",
    phone: "+1-555-0111",
    company_id: company._id
  });

  const product = await Product.create({
    name: "Widget A",
    sku: "WID-A-001",
    price: 19.99,
    product_type: "standard",
    low_stock_threshold: 15,
    supplier_id: supplier._id,
    company_id: company._id,
    is_bundle: false
  });

  const inventory = await Inventory.create({
    product_id: product._id,
    warehouse_id: warehouse._id,
    quantity: 120,
    last_sale_date: new Date()
  });

  await InventoryLog.create({
    product_id: product._id,
    warehouse_id: warehouse._id,
    change_type: "restock",
    quantity_change: 120,
    previous_quantity: 0,
    new_quantity: 120,
    note: "Initial stock"
  });

  console.log("Seed data created");
  console.log({
    company_id: company._id.toString(),
    warehouse_id: warehouse._id.toString(),
    supplier_id: supplier._id.toString(),
    product_id: product._id.toString(),
    inventory_id: inventory._id.toString()
  });

  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
