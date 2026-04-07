require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");

const productsRouter = require("./routes/products");
const alertsRouter = require("./routes/alerts");
const errorHandler = require("./middleware/errorHandler");

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

app.get("/", (req, res) => {
  res.json({
    status: "ok",
    service: "StockFlow API"
  });
});

app.use("/api/products", productsRouter);
app.use("/api/companies", alertsRouter);

app.use(errorHandler);

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("MongoDB connected");
    app.listen(port, () => {
      console.log(`Server running on port ${port}`);
    });
  })
  .catch((err) => {
    console.error("MongoDB connection failed", err);
    process.exit(1);
  });
