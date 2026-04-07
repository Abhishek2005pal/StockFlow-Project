const mongoose = require("mongoose");

const inventoryLogSchema = new mongoose.Schema(
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
    change_type: {
      type: String,
      enum: ["sale", "restock", "adjustment", "transfer"],
      required: true
    },
    quantity_change: { type: Number, required: true },
    previous_quantity: { type: Number },
    new_quantity: { type: Number },
    note: { type: String, trim: true }
  },
  { timestamps: true }
);

inventoryLogSchema.index({ product_id: 1, warehouse_id: 1, change_type: 1, createdAt: -1 });

module.exports = mongoose.model("InventoryLog", inventoryLogSchema);
