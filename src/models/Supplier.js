const mongoose = require("mongoose");

const supplierSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    contact_email: { type: String, required: true, trim: true, lowercase: true },
    phone: { type: String, trim: true },
    company_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      index: true
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Supplier", supplierSchema);
