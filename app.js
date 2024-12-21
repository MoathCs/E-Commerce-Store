const express = require("express");
const app = express();
const port = 3000;
const mongoose = require("mongoose");
app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));
const User = require("./models/userSchema");
const Product = require("./models/productSchema");
const Order = require("./models/ordersSchema");

const jwt = require("jsonwebtoken");
app.set("view engine", "ejs");
var methodOverride = require("method-override");
app.use(methodOverride("_method"));
const session = require('express-session');
const bcrypt = require("bcrypt");
const { render } = require("ejs");

app.use(session({
    secret: 'your_secret_key',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false }  // Set secure: true if using HTTPS in production
  }));
  

// connection code to DB
mongoose
  .connect("mongodb://127.0.0.1:27017/Store")
  .then(() => {
    app.listen(port, () => {
      console.log(`http://localhost:3000/`);
    });
  })
  .catch((err) => {
    console.log(err);
  });
  
/* _________________________________________________________________________________________*/

app.get('/logout', (req, res) => {
    if (req.session) {
      // Destroy the session to log the user out
      req.session.destroy((err) => {
        if (err) {
          return res.status(500).send('Failed to logout');
        }
        // Clear the session cookie
        res.clearCookie('connect.sid');
        // Redirect to the login page after logging out
        res.redirect('/');
      });
    } else {
      // If there is no session, just redirect to login
      res.redirect('/');
    }
  });
  

app.get("/", (req, res) => {
    res.render("user/login" )
  });
  
app.get("/register", (req, res) => {
  
    res.render("user/register" )
  });

  
app.post("/user/register", (req, res) => {
  const { fullName, email, password, confirm_password } = req.body;

  // Check if all fields are filled
  if (!fullName || !email || !password || !confirm_password) {
    return res.status(400).send("All fields are required.");
  }

  // Check if passwords match
  if (password !== confirm_password) {
    return res.status(400).send("Passwords do not match.");
  }

  // Hash the password
  bcrypt.hash(password, 10)
    .then(hashedPassword => {
      // Create the user in the database
      User.create({
        fullName,
        email,
        password: hashedPassword
      })
        .then(() => {
          res.redirect("/"); // Redirect to login page after successful registration
        })
        .catch(err => {
          console.log(err);
          res.status(500).send("There was an error during registration.");
        });
    })
    .catch(err => {
      console.log(err);
      res.status(500).send("Error hashing the password.");
    });
});

app.post("/user/login", async (req, res) => {
    const { email, password } = req.body;
  
    try {
      // Find the user by email
      const user = await User.findOne({ email });
  
      // If user does not exist
      if (!user) {
        return res.status(400).send("Invalid credentials");
      }
  
      // Compare password with the stored hashed password
      const isMatch = await user.comparePassword(password);
  
      if (isMatch) {

        req.session.userId = user._id;  // Store user ID in session
        req.session.userName = user.fullName;  // Store user ID in session

  
        // Generate JWT (JSON Web Token)
        const token = jwt.sign(
          { id: user._id, email: user.email, isAdmin: user.isAdmin }, // Include isAdmin in the payload
          "your_secret_key",
          { expiresIn: "1h" }
        );
  
        // Check if the user is an admin
        if (user.isAdmin) {
          res.redirect("/admin/adminDashpord" )
        } else {

            res.redirect("/product" )
        }
      } else {
        res.status(400).send("Invalid credentials");
      }
    } catch (err) {
      console.log(err);
      res.status(500).send("Error during login");
    }
  });


/*___________________________USER________________________________________*/ 

// app.get("/product" , (req , res) =>{
//     const userName = req.session.userName;
//     Product.find() 
//     .then((products) => {
//       res.render("user/product", { products , userName });
//     })
//     .catch((err) => {
//       console.error(err);
//       res.status(500).send("Error fetching products");
//     });
// });


app.get("/product", (req, res) => {
  const userName = req.session.userName;
  const message = req.query.message || null; // Retrieve message from query parameters
  const messageType = req.query.messageType || null; // Retrieve messageType from query parameters

  Product.find()
    .then((products) => {
      res.render("user/product", { products, userName, message, messageType });
    })
    .catch((err) => {
      console.error(err);
      res.status(500).send("Error fetching products");
    });
});


// app.get("/user/viewCart", async (req, res) => {
//   const userId = req.session.userId; // Assuming you store the logged-in user's ID in the session

//   try {
//     // Find all orders for the logged-in user
//     const orders = await Order.find({ userId }).populate("productId");

//     // Render the viewCart template and pass the user's orders
//     res.render("user/viewCart", { orders });
//   } catch (err) {
//     console.error(err);
//     res.status(500).send("Error fetching orders");
//   }
// });


app.get("/user/viewCart", async (req, res) => {
  const userId = req.session.userId; // Assuming the logged-in user's ID is in the session

  if (!userId) {
    return res.redirect("/"); // Redirect to login if no user is logged in
  }

  try {
    // Find all orders for the logged-in user
    const orders = await Order.find({ user: userId })
      .populate({
        path: 'products.product', // Populate the `product` field inside `products` array
        model: 'Product', // Specify the Product model to populate product details
      });

    // Render the viewCart template and pass the user's orders
    res.render("user/viewCart", { orders });
  } catch (err) {
    console.error('Error fetching orders:', err);
    res.status(500).send("Error fetching orders");
  }
});


// app.post("/user/addToCart/:id", async (req, res) => {
//   const userId = req.session.userId; // Logged-in user's ID
//   const productId = req.params.id; // Product ID from the route
//   const quantity = parseInt(req.body.quantity); // Quantity from the request body

//   try {
//     // Find the product in the database
//     const product = await Product.findById(productId);
//     if (!product) {
//       // return res.status(404).send("Product not found");
//       return res.redirect(`/product/${productId}?message=Product not found&messageType=error`);

//     }

//     // Check if the product is in stock
//     if (product.stock < quantity) {
//       // return res.status(400).send("Sorry, the quantity you selected exceeds the available stock.");
//       return res.redirect(`/product/${productId}?message=Sorry, the quantity exceeds the available stock.&messageType=error`);

//     }

//     // Reduce the stock by the quantity added to the cart
//     product.stock -= quantity;
//     await product.save(); // Save the updated product stock

//     // Find an existing pending order for the user
//     let order = await Order.findOne({ user: userId, orderStatus: "pending" });

//     // If no pending order exists, create a new order
//     if (!order) {
//       order = new Order({
//         user: userId,
//         products: [{
//           product: productId,
//           quantity: quantity,
//           price: product.price
//         }],
//         totalAmount: product.price * quantity,
//         paymentMethod: "credit_card", // You can replace this with dynamic value
//         orderStatus: "pending"
//       });
//     } else {
//       // If an order exists, check if the product is already in the cart
//       const existingProductIndex = order.products.findIndex(item => item.product.toString() === productId.toString());
      
//       if (existingProductIndex >= 0) {
//         // Product already in the cart, update quantity and totalAmount
//         const newQuantity = order.products[existingProductIndex].quantity + quantity;
        
//         // Check if the total quantity exceeds stock
//         if (newQuantity > product.stock) {
//           // return res.status(400).send("Sorry, the quantity you selected exceeds the available stock44.");
//           return res.redirect(`/product/${productId}?message=Sorry, the quantity exceeds the available stock.&messageType=error`);

//         }
        
//         order.products[existingProductIndex].quantity = newQuantity;
//         order.products[existingProductIndex].price = product.price;
//       } else {
//         // Add new product to the order
//         if (quantity > product.stock) {
//           // return res.status(400).send("Sorry, the quantity you selected exceeds the available stock55");
//           return res.redirect(`/product/${productId}?message=Sorry, the quantity exceeds the available stock.&messageType=error`);
//         }

//         order.products.push({
//           product: productId,
//           quantity: quantity,
//           price: product.price
//         });
//       }
      
//       // Recalculate the total amount
//       order.totalAmount = order.products.reduce((total, item) => total + (item.quantity * item.price), 0);
//     }

//     // Save the order (either new or updated)
//     await order.save();

//     // Redirect the user back to the product page or cart
//     res.redirect("/product");
//   } catch (err) {
//     console.error(err);
//     res.status(500).send("Error adding product to cart");
//   }
// });

// app.post("/user/addToCart/:id", async (req, res) => {
//   const userId = req.session.userId; // Logged-in user's ID
//   const productId = req.params.id; // Product ID from the route
//   const quantity = parseInt(req.body.quantity); // Quantity from the request body

//   try {
//     // Find the product in the database
//     const product = await Product.findById(productId);
//     if (!product) {
//       return res.redirect(`/product?message=Product not found&messageType=error`);
//     }

//     // Check if the product is in stock
//     if (product.stock < quantity) {
//       return res.redirect(`/product?message=Sorry, the quantity exceeds available stock.&messageType=error`);
//     }

//     // Find an existing pending order for the user
//     let order = await Order.findOne({ user: userId, orderStatus: "pending" });

//     if (!order) {
//       // Create a new order if no pending order exists
//       order = new Order({
//         user: userId,
//         products: [{
//           product: productId,
//           quantity: quantity,
//           price: product.price,
//         }],
//         totalAmount: product.price * quantity,
//         paymentMethod: "credit_card", // Replace with dynamic value if needed
//         orderStatus: "pending",
//       });
//     } else {
//       // Check if the product is already in the cart
//       const existingProductIndex = order.products.findIndex(item => item.product.toString() === productId);

//       if (existingProductIndex >= 0) {
//         // Update quantity if the product is already in the cart
//         const existingProduct = order.products[existingProductIndex];
//         const newQuantity = existingProduct.quantity + quantity;

//         if (newQuantity > product.stock) {
//           return res.redirect(`/product?message=Sorry, the quantity exceeds available stock.&messageType=error`);
//         }

//         // Update the product's quantity in the cart
//         existingProduct.quantity = newQuantity;
//       } else {
//         // Add new product to the cart
//         order.products.push({
//           product: productId,
//           quantity: quantity,
//           price: product.price,
//         });
//       }

//       // Recalculate the total amount
//       order.totalAmount = order.products.reduce(
//         (total, item) => total + item.quantity * item.price,
//         0
//       );
//     }

//     // Save the order (either new or updated)
//     await order.save();

//     // Reduce product stock only after successfully adding to the cart
//     product.stock -= quantity;
//     await product.save();

//     // Redirect to the product page with a success message
//     res.redirect(`/product?message=Product added to cart successfully&messageType=success`);
//   } catch (err) {
//     console.error(err);
//     res.redirect(`/product?message=An error occurred while adding to cart&messageType=error`);
//   }
// });


app.post("/user/addToCart/:id", async (req, res) => {
  const userId = req.session.userId;
  const productId = req.params.id;
  const requestedQuantity = parseInt(req.body.quantity); // Quantity requested by the user

  try {
    const product = await Product.findById(productId);
    if (!product) {
      return res.redirect(`/product?message=Product not found.&messageType=error`);
    }

    console.log(`Product Stock Before: ${product.stock}`);
    console.log(`Quantity Requested: ${requestedQuantity}`);

    // Check if the requested quantity is greater than the available stock
    if (requestedQuantity > product.stock) {
      return res.redirect(`/product?message=Sorry, the quantity exceeds available stock.&messageType=error`);
    }

    let order = await Order.findOne({ user: userId, orderStatus: "pending" });
    if (!order) {
      // If no pending order exists, create a new order
      order = new Order({
        user: userId,
        products: [{
          product: productId,
          quantity: requestedQuantity, // Use the requested quantity here
          price: product.price,
        }],
        totalAmount: product.price * requestedQuantity, // Use requestedQuantity here
        orderStatus: "pending",
      });
    } else {
      // If the order exists, find if the product is already in the cart
      const existingProductIndex = order.products.findIndex(
        (item) => item.product.toString() === productId.toString()
      );

      const existingQuantity = existingProductIndex >= 0
        ? order.products[existingProductIndex].quantity
        : 0;

      const totalQuantity = existingQuantity + requestedQuantity; // Total quantity after adding the new request

      // Check if the total quantity exceeds available stock
      if (requestedQuantity > product.stock) {
        return res.redirect(`/product?message=Sorry, the quantity exceeds available stock.&messageType=error`);
      }

      if (existingProductIndex >= 0) {
        // If the product is already in the order, update the quantity
        order.products[existingProductIndex].quantity = totalQuantity; // Update total quantity
      } else {
        // If the product is not in the order, add it
        order.products.push({
          product: productId,
          quantity: requestedQuantity, // Use requested quantity here
          price: product.price,
        });
      }
    }

    // Update the product stock and save the product
    product.stock -= requestedQuantity; // Subtract the requested quantity from the stock
    await product.save();

    // Recalculate the total amount for the order
    order.totalAmount = order.products.reduce(
      (total, item) => total + (item.quantity * item.price), 
      0
    );
    await order.save();

    // Redirect to the product page with a success message
    res.redirect(`/product?message=Product added to cart successfully.&messageType=success`);
  } catch (err) {
    console.error(err);
    res.redirect(`/product?message=An error occurred while adding to cart.&messageType=error`);
  }
});


app.get('/user/viewOrder/:orderId/:itemId', async (req, res) => {
  const userId = req.session.userId; // Ensure user is logged in
  const { orderId, itemId } = req.params;

  try {
    // Fetch the order by ID
    const order = await Order.findOne({ _id: orderId, user: userId }).populate('products.product');

    if (!order) {
      return res.status(404).send('Order not found or does not belong to the user.');
    }

    // Find the specific product in the order
    const productItem = order.products.find((item) => item._id.toString() === itemId);

    if (!productItem) {
      return res.status(404).send('Product not found in this order.');
    }

    // Render the product details page with product and order data
    res.render('user/viewOrder', { productItem, order });
  } catch (error) {
    console.error('Error fetching order:', error);
    res.status(500).send('Internal Server Error');
  }
});


app.delete("/user/removeProduct/:orderId/:itemId", (req, res) => {
  const { orderId, itemId } = req.params;

  Order.findOneAndUpdate(
    { _id: orderId }, // Find the order by ID
    { $pull: { products: { _id: itemId } } }, // Pull (remove) the product with the specific itemId
    { new: true } // Return the updated order
  )
    .then((updatedOrder) => {
      // If no products remain in the order, you might want to remove the order entirely
      if (updatedOrder.products.length === 0) {
        updatedOrder.remove()
          .then(() => {
            res.redirect("/user/viewCart"); // Redirect to a cart or order overview page
          })
          .catch((err) => {
            console.log(err);
            res.status(500).send("Error removing the order.");
          });
      } else {
        res.redirect(`/user/viewCart`); // Redirect to the updated order view
      }
    })
    .catch((err) => {
      console.log(err);
      res.status(500).send("Error removing the product.");
    });
});

app.put("/user/updateQuantity/:orderId/:productId", async (req, res) => {
  const { orderId, productId } = req.params; // Get orderId and productId from URL params

  try {
    // Find the order in the database
    let order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).send("Order not found.");
    }

    // Find the product in the order using the productId from the request params
    const productIndex = order.products.findIndex(item => item.id.toString() === productId.toString());
    console.log("Product Index:", productIndex);
    console.log("Product ID:", productId);

    if (productIndex === -1) {
      return res.status(404).send("Product not found in order.");
    }

    const productItem = order.products[productIndex]; // Access the product item in the order
    console.log('Found product in order:', productItem);

    // Decrease the product quantity by 1
    if (productItem.quantity > 1) {
      order.products[productIndex].quantity -= 1; // Decrement quantity by 1
    } else {
      // If quantity is 1 or less, remove the product from the order
      order.products.splice(productIndex, 1);
    }

    // Recalculate the totalAmount
    order.totalAmount = order.products.reduce(
      (total, item) => total + (item.quantity * item.price),
      0
    );

    // Save the updated order
    await order.save();

    // Optionally, update the product stock if needed:
    const product = await Product.findById(productItem.product); // Use productItem.product to get the correct product ID
    console.log("product" , product)
    if (product) {
      product.stock += 1; // Increase product stock by 1
      await product.save();
    }

    // Redirect back to the cart page or product page
    res.redirect("/user/viewCart"); // Make sure this path exists in your routing
  } catch (err) {
    console.error(err);
    res.status(500).send("Error updating quantity.");
  }
});


app.get("/contact" , (req ,res) =>{
  res.render("user/contact")
});


/* ______________________ADMIN_____________________________________________ */ 



app.get("/admin/adminDashpord", async(req, res) => {
  const userCount = await User.countDocuments({isAdmin : false});
  const proCount = await Product.countDocuments({});
  res.render("admin/adminDashpord" , {userCount , proCount})
});

app.get("/admin/productManagement", (req, res) => {
  Product.find()
    .then((products) => {
      res.render("admin/productManagement", { products });
    })
    .catch((err) => {
      console.error(err);
      res.status(500).send("Error fetching products");
    });
});


app.get('/admin/editProduct/:id', (req, res) => {
  Product.findById(req.params.id)
    .then((product) => {
      res.render("admin/editProduct", {product});
    })
    .catch((err) => {
      console.log(err);
    });
});

app.put("/admin/editProduct/:id", (req, res) => {
  Product.updateOne({ _id: req.params.id }, req.body)
    .then(() => {
     res.redirect("/admin/productManagement");
    })
    .catch((err) => {
      console.log(err);
    });
});

app.delete("/admin/editProduct/:id", (req, res) => {
  Product.findByIdAndDelete(req.params.id)
    .then(() => {
      res.redirect("/admin/productManagement");
    })
    .catch((err) => {
      console.log(err);
    });
});


app.get("/admin/addProduct" , (req , res) =>{
  res.render("admin/addProduct")
})

app.post("/admin/addProduct", (req, res) => {
  Product
  .create(req.body)
    .then(() => {
      res.redirect("/admin/productManagement");
    })
    .catch((err) => {
      console.log(err);
    });
});



app.get("/admin/userManagement", (req, res) => {
  User.find({ isAdmin: false })
  .then((result) => {
    res.render("admin/userManagement" ,  { arr: result });
  })
  .catch((err) => {
    console.log(err);
  });
});

app.get("/admin/viewUser/:id", (req, res) => {
  User.findById(req.params.id)
    .then((result) => {
      res.render("admin/viewUser", { obj: result });
    })
    .catch((err) => {
      console.log(err);
    });
});

app.get("/admin/editUser/:id", (req, res) => {
  User.findById(req.params.id)
    .then((result) => {
      res.render("admin/editUser", { arr: result });
    })
    .catch((err) => {
      console.log(err);
    });
});

app.delete("/admin/editUser/:id", (req, res) => {
  User.findByIdAndDelete(req.params.id)
    .then(() => {
      res.redirect("/admin/userManagement");
    })
    .catch((err) => {
      console.log(err);
    });
});

app.put("/admin/editUser/:id", (req, res) => {
   User.updateOne({ _id: req.params.id }, req.body)
     .then(() => {
      res.redirect("/admin/userManagement");
     })
     .catch((err) => {
       console.log(err);
     });
});
///////////////////////
  


