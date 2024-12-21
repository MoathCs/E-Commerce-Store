const mongoose = require("mongoose");
const Schema = mongoose.Schema;

// Define the Product schema
const productSchema = new Schema(
  {
    name: {
      type: String,
      required: true, // Product name is mandatory
      trim: true, // Removes unnecessary whitespace
    },
    description: {
      type: String,
      required: true, // Description is mandatory
      trim: true, // Removes unnecessary whitespace
    },
    price: {
      type: mongoose.Types.Decimal128, // High-precision decimal for pricing
      required: true, // Price is mandatory
      min: 0, // Ensure price cannot be negative
    },
    stock: {
      type: Number,
      required: true, // Stock quantity is mandatory
      min: 0, // Ensure stock cannot be negative
    },
    category: {
      type: String,
      required: true, // Category is mandatory
      trim: true, // Removes unnecessary whitespace
    },
    image: {
      type: String, // URL to the product image
      required: true, // Image is mandatory
      validate: {
        validator: function (v) {
          return /^(https?:\/\/.*\.(?:png|jpg|jpeg|gif|webp))$/.test(v); // Validates image URL
        },
        message: "Please provide a valid image URL (e.g., https://example.com/image.jpg)",
      },
    },
  },
  { timestamps: true } // Automatically manage createdAt and updatedAt
);

// Create a Product model
const Product = mongoose.model("Product", productSchema);

module.exports = Product;
