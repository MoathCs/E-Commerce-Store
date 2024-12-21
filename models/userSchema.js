const mongoose = require("mongoose");
const Schema = mongoose.Schema;



const bcrypt = require("bcrypt");


// Define the schema
const userSchema = new Schema(
  {
    fullName: {
      type: String,
      required: true, // Ensure the full name is mandatory
      trim: true, // Remove unnecessary whitespace
    },
    email: {
      type: String,
      required: true, // Ensure the email is mandatory
      unique: true, // Ensure each email is unique
      trim: true, // Remove unnecessary whitespace
      match: [
        /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
        "Please enter a valid email address", // Validation for email format
      ],
    },
    password: {
      type: String,
      required: true, // Ensure the password is mandatory
      minlength: 6, // Ensure the password has a minimum length
    },
    isAdmin: {
      type: Boolean,
      enum: [0 , 1 ], // Define allowed roles
      default: 0,        // Default role is "user"
    },

  },
  { timestamps: true } // Automatically manage createdAt and updatedAt timestamps
);



// Method to compare the password during login
userSchema.methods.comparePassword = function (password) {
  return bcrypt.compare(password, this.password); // Compare hashed password with the entered password
};


// Create a model based on the schema
const User = mongoose.model("User", userSchema);

// Export the model
module.exports = User;
