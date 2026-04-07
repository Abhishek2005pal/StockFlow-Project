const mongoose = require("mongoose");

const inventorySchema = new mongoose.Schema(
  {
    product_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
      index: true
    },
    warehouse_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Warehouse",
      required: true,
      index: true
    },
    quantity: { type: Number, required: true, min: 0 },
    last_sale_date: { type: Date }
  },
  { timestamps: true }
);

inventorySchema.index({ product_id: 1, warehouse_id: 1 }, { unique: true });

module.exports = mongoose.model("Inventory", inventorySchema);
