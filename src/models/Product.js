const mongoose = require("mongoose");

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    sku: { type: String, required: true, unique: true, trim: true },
    price: {
      type: mongoose.Schema.Types.Decimal128,
      required: true,
      min: 0,
      validate: {
        validator: (value) => {
          if (value === null || value === undefined) {
            return false;
          }
          return Number(value.toString()) >= 0;
        },
        message: "Price must be greater than or equal to 0"
      }
    },
    product_type: {
      type: String,
      enum: ["standard", "bundle", "perishable", "electronic"],
      default: "standard"
    },
    low_stock_threshold: { type: Number, default: 10, min: 0 },
    supplier_id: { type: mongoose.Schema.Types.ObjectId, ref: "Supplier" },
    company_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      index: true
    },
    is_bundle: { type: Boolean, default: false }
  },
  { timestamps: true }
);

productSchema.index({ company_id: 1, product_type: 1 });

module.exports = mongoose.model("Product", productSchema);
