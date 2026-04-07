const express = require("express");
const mongoose = require("mongoose");

const Company = require("../models/Company");
const Inventory = require("../models/Inventory");

const router = express.Router();

const objectIdPattern = /^[0-9a-fA-F]{24}$/;

function createHttpError(statusCode, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

router.get("/:company_id/alerts/low-stock", async (req, res, next) => {
  const { company_id } = req.params;

  if (!objectIdPattern.test(company_id)) {
    return next(createHttpError(400, "Invalid company_id"));
  }

  try {
    const company = await Company.findById(company_id).lean();
    if (!company) {
      return next(createHttpError(404, "Company not found"));
    }

    const companyObjectId = new mongoose.Types.ObjectId(company_id);
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const alerts = await Inventory.aggregate([
      { $match: { last_sale_date: { $gte: thirtyDaysAgo } } },
      {
        $lookup: {
          from: "products",
          localField: "product_id",
          foreignField: "_id",
          as: "product"
        }
      },
      { $unwind: "$product" },
      {
        $lookup: {
          from: "warehouses",
          localField: "warehouse_id",
          foreignField: "_id",
          as: "warehouse"
        }
      },
      { $unwind: "$warehouse" },
      { $match: { "warehouse.company_id": companyObjectId } },
      {
        $match: {
          $expr: { $lt: ["$quantity", "$product.low_stock_threshold"] }
        }
      },
      {
        $lookup: {
          from: "suppliers",
          localField: "product.supplier_id",
          foreignField: "_id",
          as: "supplier"
        }
      },
      { $unwind: { path: "$supplier", preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: "inventorylogs",
          let: { productId: "$product_id", warehouseId: "$warehouse_id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$product_id", "$$productId"] },
                    { $eq: ["$warehouse_id", "$$warehouseId"] },
                    { $eq: ["$change_type", "sale"] },
                    { $gte: ["$createdAt", thirtyDaysAgo] }
                  ]
                }
              }
            },
            {
              $group: {
                _id: null,
                total_sold: { $sum: { $abs: "$quantity_change" } }
              }
            }
          ],
          as: "sales"
        }
      },
      {
        $addFields: {
          total_sold: { $ifNull: [{ $arrayElemAt: ["$sales.total_sold", 0] }, 0] }
        }
      },
      { $addFields: { average_daily_sales: { $divide: ["$total_sold", 30] } } },
      {
        $addFields: {
          days_until_stockout: {
            $cond: [
              { $gt: ["$average_daily_sales", 0] },
              { $divide: ["$quantity", "$average_daily_sales"] },
              null
            ]
          }
        }
      },
      {
        $project: {
          _id: 0,
          product_id: "$product._id",
          product_name: "$product.name",
          sku: "$product.sku",
          warehouse_id: "$warehouse._id",
          warehouse_name: "$warehouse.name",
          current_stock: "$quantity",
          threshold: "$product.low_stock_threshold",
          days_until_stockout: 1,
          supplier: {
            id: { $ifNull: ["$supplier._id", null] },
            name: { $ifNull: ["$supplier.name", null] },
            contact_email: { $ifNull: ["$supplier.contact_email", null] }
          }
        }
      }
    ]);

    return res.json({ alerts, total_alerts: alerts.length });
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
