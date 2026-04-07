# Part 1 Review: Bug Analysis and Corrected Node.js Version

## Bugs in the Original Flask Endpoint
1. No input validation: accepts malformed data (missing fields, invalid types, negative quantities).
2. No error handling: any database error or missing key crashes the request.
3. Two separate commits: product could be created without inventory on failure, causing data inconsistency.
4. No SKU uniqueness check: allows duplicates and breaks catalog integrity.
5. KeyError on missing fields: `data['name']` and others crash if absent.
6. No HTTP status codes: clients cannot distinguish success from failure correctly.
7. No warehouse existence check: inventory could reference a non-existent warehouse.
8. Price has no type validation: strings or negative values can be stored.
9. No authentication/authorization: any caller can create inventory.
10. No validation on `initial_quantity`: negative inventory can be created.
11. No audit trail: no inventory log for the initial restock.
12. No transaction rollback: partial writes remain in DB after exceptions.

## Production Impact
- Data integrity issues (orphaned inventory, duplicate SKUs, negative stock).
- Unclear client behavior due to missing HTTP status codes.
- Increased operational risk from crashes on bad input.
- Lack of traceability without inventory logs.

## Corrected Node.js Version (Transactional)
```javascript
const express = require("express");
const mongoose = require("mongoose");
const Joi = require("joi");

const Product = require("./models/Product");
const Warehouse = require("./models/Warehouse");
const Inventory = require("./models/Inventory");
const InventoryLog = require("./models/InventoryLog");

const router = express.Router();
const objectIdPattern = /^[0-9a-fA-F]{24}$/;

const schema = Joi.object({
  name: Joi.string().trim().required(),
  sku: Joi.string().trim().required(),
  price: Joi.number().positive().required(),
  warehouse_id: Joi.string().pattern(objectIdPattern).required(),
  initial_quantity: Joi.number().min(0).required(),
  supplier_id: Joi.string().pattern(objectIdPattern).optional(),
  product_type: Joi.string()
    .valid("standard", "bundle", "perishable", "electronic")
    .optional(),
  low_stock_threshold: Joi.number().min(0).optional()
});

router.post("/api/products", async (req, res, next) => {
  const { error, value } = schema.validate(req.body, {
    abortEarly: false,
    stripUnknown: true
  });

  if (error) {
    error.statusCode = 400;
    return next(error);
  }

  try {
    const existingSku = await Product.findOne({ sku: value.sku }).lean();
    if (existingSku) {
      const conflict = new Error("SKU already exists");
      conflict.statusCode = 409;
      return next(conflict);
    }

    const warehouse = await Warehouse.findById(value.warehouse_id).lean();
    if (!warehouse) {
      const notFound = new Error("Warehouse not found");
      notFound.statusCode = 404;
      return next(notFound);
    }

    const session = await mongoose.startSession();
    let createdProduct;
    let createdInventory;

    try {
      await session.withTransaction(async () => {
        const productResult = await Product.create(
          [
            {
              name: value.name,
              sku: value.sku,
              price: value.price,
              product_type: value.product_type,
              low_stock_threshold: value.low_stock_threshold,
              supplier_id: value.supplier_id,
              company_id: warehouse.company_id,
              is_bundle: value.product_type === "bundle"
            }
          ],
          { session }
        );

        createdProduct = productResult[0];

        const inventoryResult = await Inventory.create(
          [
            {
              product_id: createdProduct._id,
              warehouse_id: value.warehouse_id,
              quantity: value.initial_quantity,
              last_sale_date: null
            }
          ],
          { session }
        );

        createdInventory = inventoryResult[0];

        await InventoryLog.create(
          [
            {
              product_id: createdProduct._id,
              warehouse_id: value.warehouse_id,
              change_type: "restock",
              quantity_change: value.initial_quantity,
              previous_quantity: 0,
              new_quantity: value.initial_quantity,
              note: "Initial stock"
            }
          ],
          { session }
        );
      });
    } catch (transactionError) {
      await session.abortTransaction();
      session.endSession();
      throw transactionError;
    }

    session.endSession();

    return res.status(201).json({
      message: "Product created successfully",
      product_id: createdProduct._id,
      inventory_id: createdInventory._id
    });
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
```
