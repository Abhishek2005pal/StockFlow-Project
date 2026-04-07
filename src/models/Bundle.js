const mongoose = require("mongoose");

const bundleSchema = new mongoose.Schema(
  {
    bundle_product_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
      index: true
    },
    component_product_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
      index: true
    },
    quantity: { type: Number, required: true, min: 1 }
  },
  { timestamps: true }
);

bundleSchema.index({ bundle_product_id: 1, component_product_id: 1 }, { unique: true });

module.exports = mongoose.model("Bundle", bundleSchema);
