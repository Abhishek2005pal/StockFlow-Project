# StockFlow Schema Documentation

## 1. Collections and Fields

### companies
- name (String, required, unique)
- email (String, required)
- phone (String)
- address (String)
- createdAt, updatedAt (Date, timestamps)

### warehouses
- name (String, required)
- location (String)
- company_id (ObjectId -> companies, required)
- createdAt, updatedAt (Date, timestamps)

### suppliers
- name (String, required)
- contact_email (String, required)
- phone (String)
- company_id (ObjectId -> companies)
- createdAt, updatedAt (Date, timestamps)

### products
- name (String, required)
- sku (String, required, unique)
- price (Decimal128, required, min 0)
- product_type (String, enum: standard, bundle, perishable, electronic)
- low_stock_threshold (Number, default 10)
- supplier_id (ObjectId -> suppliers)
- company_id (ObjectId -> companies, required)
- is_bundle (Boolean, default false)
- createdAt, updatedAt (Date, timestamps)

### inventories
- product_id (ObjectId -> products, required)
- warehouse_id (ObjectId -> warehouses, required)
- quantity (Number, required, min 0)
- last_sale_date (Date)
- createdAt, updatedAt (Date, timestamps)

### inventorylogs
- product_id (ObjectId -> products, required)
- warehouse_id (ObjectId -> warehouses, required)
- change_type (String, enum: sale, restock, adjustment, transfer)
- quantity_change (Number, required)
- previous_quantity (Number)
- new_quantity (Number)
- note (String)
- createdAt, updatedAt (Date, timestamps)

### bundles
- bundle_product_id (ObjectId -> products, required)
- component_product_id (ObjectId -> products, required)
- quantity (Number, required, min 1)
- createdAt, updatedAt (Date, timestamps)

## 2. Why MongoDB Over SQL
- Flexible schema for evolving inventory attributes and product variants.
- High write throughput for inventory logs and audit trails.
- Natural document references for multi-tenant data (company-specific) without complex joins.
- Aggregation pipeline handles cross-collection reporting with fewer read round-trips.
- Horizontal scaling and sharding are simpler for log-heavy workloads.

## 3. Indexes and Rationale
- companies.name unique: prevents duplicate tenants and supports fast lookups.
- warehouses.company_id: fast warehouse filtering by company.
- suppliers.company_id: fast supplier filtering by company.
- products.sku unique: enforces SKU uniqueness globally.
- products.company_id + product_type: supports company-scoped filtering and analytics.
- inventories.product_id + warehouse_id unique: enforces one inventory row per product per warehouse.
- inventorylogs.product_id + warehouse_id + change_type + createdAt: accelerates sales-rate aggregation.
- bundles.bundle_product_id + component_product_id unique: prevents duplicate components in a bundle.

## 4. Relationships and Handling
- Company -> Warehouse, Supplier, Product are one-to-many via ObjectId references.
- Product -> Inventory is one-to-many across warehouses.
- Inventory -> InventoryLog is one-to-many for audit trail entries.
- Product -> Supplier is optional to allow internal or unmanaged sourcing.
- Bundle links a bundle product to multiple component products using a join collection.
- References are resolved with Mongoose `populate` for simple reads and `$lookup` for analytics.

## 5. Product Team Questions (Edge Cases)
1. Are SKUs unique globally or only per company?
2. Should low stock alerts aggregate stock across warehouses or alert per warehouse?
3. How should bundle stock be computed (derived from components vs direct stock)?
4. What is the expected sign for `quantity_change` on sales (negative or positive)?
5. Do we need to track lot/batch numbers and expiration dates for perishables?
6. Should supplier information be mandatory for certain product types?
7. How should transfers between warehouses affect `last_sale_date`?
8. Are partial shipments and backorders tracked in inventory?
9. Should prices support multiple currencies or price lists?
10. What is the policy for deleting products that still have inventory logs?
