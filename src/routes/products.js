const express = require("express");
const mongoose = require("mongoose");
const Joi = require("joi");

const Product = require("../models/Product");
const Warehouse = require("../models/Warehouse");
const Inventory = require("../models/Inventory");
const InventoryLog = require("../models/InventoryLog");

const router = express.Router();

const objectIdPattern = /^[0-9a-fA-F]{24}$/;

const createProductSchema = Joi.object({
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

const recordSaleSchema = Joi.object({
  warehouse_id: Joi.string().pattern(objectIdPattern).required(),
  quantity_sold: Joi.number().positive().required(),
  note: Joi.string().trim().allow("").optional()
});

function createHttpError(statusCode, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

router.post("/", async (req, res, next) => {
  const { error, value } = createProductSchema.validate(req.body, {
    abortEarly: false,
    stripUnknown: true
  });

  if (error) {
    const message = error.details.map((detail) => detail.message).join(", ");
    return next(createHttpError(400, message));
  }

  const {
    name,
    sku,
    price,
    warehouse_id,
    initial_quantity,
    supplier_id,
    product_type,
    low_stock_threshold
  } = value;

  try {
    const existingSku = await Product.findOne({ sku }).lean();
    if (existingSku) {
      return next(createHttpError(409, "SKU already exists"));
    }

    const warehouse = await Warehouse.findById(warehouse_id).lean();
    if (!warehouse) {
      return next(createHttpError(404, "Warehouse not found"));
    }

    const session = await mongoose.startSession();
    let createdProduct;
    let createdInventory;

    try {
      await session.withTransaction(async () => {
        const productResult = await Product.create(
          [
            {
              name,
              sku,
              price,
              product_type,
              low_stock_threshold,
              supplier_id,
              company_id: warehouse.company_id,
              is_bundle: product_type === "bundle"
            }
          ],
          { session }
        );

        createdProduct = productResult[0];

        const inventoryResult = await Inventory.create(
          [
            {
              product_id: createdProduct._id,
              warehouse_id,
              quantity: initial_quantity,
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
              warehouse_id,
              change_type: "restock",
              quantity_change: initial_quantity,
              previous_quantity: 0,
              new_quantity: initial_quantity,
              note: "Initial stock"
            }
          ],
          { session }
        );
      });
    } catch (transactionError) {
      await session.abortTransaction();
      session.endSession();
      return next(transactionError);
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

router.post("/:product_id/sales", async (req, res, next) => {
  const { product_id } = req.params;

  if (!objectIdPattern.test(product_id)) {
    return next(createHttpError(400, "Invalid product_id"));
  }

  const { error, value } = recordSaleSchema.validate(req.body, {
    abortEarly: false,
    stripUnknown: true
  });

  if (error) {
    const message = error.details.map((detail) => detail.message).join(", ");
    return next(createHttpError(400, message));
  }

  const { warehouse_id, quantity_sold, note } = value;

  try {
    const session = await mongoose.startSession();
    let updatedInventory;

    try {
      await session.withTransaction(async () => {
        const inventory = await Inventory.findOne({
          product_id,
          warehouse_id
        }).session(session);

        if (!inventory) {
          throw createHttpError(404, "Inventory not found");
        }

        if (inventory.quantity < quantity_sold) {
          throw createHttpError(400, "Insufficient stock");
        }

        const previousQuantity = inventory.quantity;
        const newQuantity = previousQuantity - quantity_sold;

        inventory.quantity = newQuantity;
        inventory.last_sale_date = new Date();
        updatedInventory = await inventory.save({ session });

        await InventoryLog.create(
          [
            {
              product_id,
              warehouse_id,
              change_type: "sale",
              quantity_change: -quantity_sold,
              previous_quantity: previousQuantity,
              new_quantity: newQuantity,
              note: note || "Sale"
            }
          ],
          { session }
        );
      });
    } catch (transactionError) {
      await session.abortTransaction();
      session.endSession();
      return next(transactionError);
    }

    session.endSession();

    return res.json({
      message: "Sale recorded",
      inventory_id: updatedInventory._id,
      current_quantity: updatedInventory.quantity
    });
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
