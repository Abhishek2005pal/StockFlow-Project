# StockFlow

StockFlow is a B2B Inventory Management System REST API built for multi-warehouse inventory tracking, supplier visibility, and low-stock alerting.

## Tech Stack
- Node.js
- Express.js
- MongoDB with Mongoose
- Joi for validation
- dotenv for configuration
- nodemon for development

## Project Structure
stockflow/
├── src/
│   ├── models/
│   │   ├── Company.js
│   │   ├── Warehouse.js
│   │   ├── Product.js
│   │   ├── Inventory.js
│   │   ├── InventoryLog.js
│   │   ├── Supplier.js
│   │   └── Bundle.js
│   ├── routes/
│   │   ├── products.js
│   │   ├── sales.js
│   │   └── alerts.js
│   ├── middleware/
│   │   └── errorHandler.js
│   └── app.js
├── part1_review.md
├── schema.md
├── seed.js
├── .env.example
├── package.json
└── README.md

## Case Study Documents
- [`part1_review.md`](./part1_review.md) — Detailed bug analysis
  of the original buggy Python Flask code, with explanation of
  each issue and the corrected Node.js implementation.
- [`schema.md`](./schema.md) — Full MongoDB schema design,
  collection relationships, index decisions, and product team
  questions.

## Local Setup
```bash
# 1. Clone the repository
git clone https://github.com/Abhishek2005pal/StockFlow-Project.git
cd StockFlow-Project

# 2. Install dependencies
npm install

# 3. Configure environment
cp .env.example .env
# Open .env and update MONGO_URI if needed

# 4. Run the server
npm run dev        # development with nodemon
npm start          # production

# 5. Optional: seed demo data
npm run seed
```

## Environment Variables
- `MONGO_URI`: MongoDB connection string
- `PORT`: HTTP port (default 3000)

## API Endpoints

### Create Product
- Method: POST
- URL: `/api/products`

Request body:
```json
{
  "name": "Widget A",
  "sku": "WID-A-001",
  "price": 19.99,
  "warehouse_id": "64f1a2b9a1b2c3d4e5f60789",
  "initial_quantity": 120,
  "supplier_id": "64f1a2b9a1b2c3d4e5f60710",
  "product_type": "standard",
  "low_stock_threshold": 15
}
```

Success response (201):
```json
{
  "message": "Product created successfully",
  "product_id": "64f1a2b9a1b2c3d4e5f60711",
  "inventory_id": "64f1a2b9a1b2c3d4e5f60712"
}
```

Error responses:
- 400: validation error
- 404: warehouse not found
- 409: SKU already exists
- 500: server error

### Low Stock Alerts
- Method: GET
- URL: `/api/companies/:company_id/alerts/low-stock`

Success response (200):
```json
{
  "alerts": [
    {
      "product_id": "64f1a2b9a1b2c3d4e5f60711",
      "product_name": "Widget A",
      "sku": "WID-A-001",
      "warehouse_id": "64f1a2b9a1b2c3d4e5f60789",
      "warehouse_name": "Main Warehouse",
      "current_stock": 5,
      "threshold": 15,
      "days_until_stockout": 12,
      "supplier": {
        "id": "64f1a2b9a1b2c3d4e5f60710",
        "name": "Acme Supply",
        "contact_email": "orders@acme.example"
      }
    }
  ],
  "total_alerts": 1
}
```

Empty response (200):
```json
{
  "alerts": [],
  "total_alerts": 0
}
```

### Record Sale
- Method: POST
- URL: `/api/products/:product_id/sales`

Request body:
```json
{
  "warehouse_id": "64f1a2b9a1b2c3d4e5f60789",
  "quantity_sold": 5,
  "note": "Customer order"
}
```

Success response (200):
```json
{
  "message": "Sale recorded",
  "inventory_id": "64f1a2b9a1b2c3d4e5f60712",
  "current_quantity": 45
}
```

## Assumptions
- SKU uniqueness is global across companies.
- Sales are recorded in inventory logs with `change_type: "sale"` and positive `quantity_change`.
- Low-stock alerts are evaluated per warehouse (not aggregated across all warehouses).
- Bundle stock management is handled outside this API and stored as a separate collection.

## Edge Cases Considered
- Invalid ObjectId formats for product, warehouse, and company.
- Duplicate SKU attempts return 409 conflicts.
- Missing warehouse or inventory returns 404.
- Negative or zero quantities rejected by validation.
- Insufficient stock on sale returns 400.
- Alerts exclude items with no recent sales activity.
- Zero sales over 30 days yields null `days_until_stockout`.
- Transactions protect against partial writes on create/sale.

## Approach Notes
- All inputs are validated with Joi before DB work.
- Writes that touch multiple collections use MongoDB transactions.
- Low-stock alerts are computed with a single aggregation pipeline to avoid N+1 queries.
- Error handling is centralized in a global middleware with safe responses.
