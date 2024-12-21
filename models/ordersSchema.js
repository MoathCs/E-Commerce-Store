const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// Define the Order schema
const orderSchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User', // Reference to the User model
      required: true, // User is required to place an order
    },
    products: [{
      product: {
        type: Schema.Types.ObjectId,
        ref: 'Product', // Reference to the Product model
        required: true, // Product is required
      },
      quantity: {
        type: Number,
        required: true, // Quantity of the product ordered
        min: 1, // Ensure quantity cannot be less than 1
      },
      price: {
        type: mongoose.Types.Decimal128,
        required: true, // Price is required for each product
        min: 0, // Ensure price is not negative
      }
    }],
    totalAmount: {
      type: mongoose.Types.Decimal128,
      required: true, // Total amount for the entire order
      min: 0, // Ensure total amount is not negative
    },
    paymentStatus: {
      type: String,
      enum: ['pending', 'completed', 'failed'], // Possible statuses for payment
      default: 'pending', // Default payment status is pending
    },
    paymentMethod: {
      type: String,
      enum: ['credit_card', 'paypal', 'cash_on_delivery'], // Payment methods supported
      required: true, // Payment method is required
    },
    orderStatus: {
      type: String,
      enum: ['pending', 'shipped', 'delivered', 'cancelled'], // Possible order statuses
      default: 'pending', // Default order status is pending
    },
    orderDate: {
      type: Date,
      default: Date.now, // Default order date is the current date
    },
    shippingDate: {
      type: Date, // Date when the order was shipped
    },
    deliveryDate: {
      type: Date, // Date when the order was delivered
    },
    trackingNumber: {
      type: String, // Optional tracking number for the shipment
    }
  },
  { timestamps: true } // Automatically manage createdAt and updatedAt timestamps
);

// Create an Order model based on the schema
const Order = mongoose.model('Order', orderSchema);

// Export the model
module.exports = Order;
