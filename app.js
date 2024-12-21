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
    cookie: { secure: false }
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
      req.session.destroy((err) => {
        if (err) {
          return res.status(500).send('Failed to logout');
        }
        res.clearCookie('connect.sid');
        res.redirect('/');
      });
    } else {
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
          res.redirect("/");
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
      const user = await User.findOne({ email });
  
      if (!user) {
        return res.status(400).send("Invalid credentials");
      }
  
      const isMatch = await user.comparePassword(password);
  
      if (isMatch) {

        req.session.userId = user._id;  
        req.session.userName = user.fullName; 

  
        // Generate JWT (JSON Web Token)
        const token = jwt.sign(
          { id: user._id, email: user.email, isAdmin: user.isAdmin },
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



app.get("/product", (req, res) => {
  const userName = req.session.userName;
  const message = req.query.message || null; 
  const messageType = req.query.messageType || null; 

  Product.find()
    .then((products) => {
      res.render("user/product", { products, userName, message, messageType });
    })
    .catch((err) => {
      console.error(err);
      res.status(500).send("Error fetching products");
    });
});


app.get("/user/viewCart", async (req, res) => {
  const userId = req.session.userId; 

  if (!userId) {
    return res.redirect("/");
  }

  try {
    const orders = await Order.find({ user: userId })
      .populate({
        path: 'products.product', 
        model: 'Product',
      });

    res.render("user/viewCart", { orders });
  } catch (err) {
    console.error('Error fetching orders:', err);
    res.status(500).send("Error fetching orders");
  }
});


app.post("/user/addToCart/:id", async (req, res) => {
  const userId = req.session.userId;
  const productId = req.params.id;
  const requestedQuantity = parseInt(req.body.quantity); 

  try {
    const product = await Product.findById(productId);
    if (!product) {
      return res.redirect(`/product?message=Product not found.&messageType=error`);
    }

    console.log(`Product Stock Before: ${product.stock}`);
    console.log(`Quantity Requested: ${requestedQuantity}`);

    if (requestedQuantity > product.stock) {
      return res.redirect(`/product?message=Sorry, the quantity exceeds available stock.&messageType=error`);
    }

    let order = await Order.findOne({ user: userId, orderStatus: "pending" });
    if (!order) {
      order = new Order({
        user: userId,
        products: [{
          product: productId,
          quantity: requestedQuantity,
          price: product.price,
        }],
        totalAmount: product.price * requestedQuantity,
        orderStatus: "pending",
      });
    } else {
      const existingProductIndex = order.products.findIndex(
        (item) => item.product.toString() === productId.toString()
      );

      const existingQuantity = existingProductIndex >= 0
        ? order.products[existingProductIndex].quantity
        : 0;

      const totalQuantity = existingQuantity + requestedQuantity;

      if (requestedQuantity > product.stock) {
        return res.redirect(`/product?message=Sorry, the quantity exceeds available stock.&messageType=error`);
      }

      if (existingProductIndex >= 0) {
        order.products[existingProductIndex].quantity = totalQuantity; // Update total quantity
      } else {
        order.products.push({
          product: productId,
          quantity: requestedQuantity, 
          price: product.price,
        });
      }
    }

    product.stock -= requestedQuantity; 
    await product.save();

    order.totalAmount = order.products.reduce(
      (total, item) => total + (item.quantity * item.price), 
      0
    );
    await order.save();

    res.redirect(`/product?message=Product added to cart successfully.&messageType=success`);
  } catch (err) {
    console.error(err);
    res.redirect(`/product?message=An error occurred while adding to cart.&messageType=error`);
  }
});


app.get('/user/viewOrder/:orderId/:itemId', async (req, res) => {
  const userId = req.session.userId;
  const { orderId, itemId } = req.params;

  try {
    const order = await Order.findOne({ _id: orderId, user: userId }).populate('products.product');

    if (!order) {
      return res.status(404).send('Order not found or does not belong to the user.');
    }

    const productItem = order.products.find((item) => item._id.toString() === itemId);

    if (!productItem) {
      return res.status(404).send('Product not found in this order.');
    }

    res.render('user/viewOrder', { productItem, order });
  } catch (error) {
    console.error('Error fetching order:', error);
    res.status(500).send('Internal Server Error');
  }
});


app.delete("/user/removeProduct/:orderId/:itemId", (req, res) => {
  const { orderId, itemId } = req.params;

  Order.findOneAndUpdate(
    { _id: orderId }, 
    { $pull: { products: { _id: itemId } } }, 
    { new: true } 
  )
    .then((updatedOrder) => {
      if (updatedOrder.products.length === 0) {
        updatedOrder.remove()
          .then(() => {
            res.redirect("/user/viewCart"); 
          })
          .catch((err) => {
            console.log(err);
            res.status(500).send("Error removing the order.");
          });
      } else {
        res.redirect(`/user/viewCart`); 
      }
    })
    .catch((err) => {
      console.log(err);
      res.status(500).send("Error removing the product.");
    });
});

app.put("/user/updateQuantity/:orderId/:productId", async (req, res) => {
  const { orderId, productId } = req.params; 

  try {
    let order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).send("Order not found.");
    }

    const productIndex = order.products.findIndex(item => item.id.toString() === productId.toString());
    console.log("Product Index:", productIndex);
    console.log("Product ID:", productId);

    if (productIndex === -1) {
      return res.status(404).send("Product not found in order.");
    }

    const productItem = order.products[productIndex];
    console.log('Found product in order:', productItem);

    if (productItem.quantity > 1) {
      order.products[productIndex].quantity -= 1; 
    } else {
      order.products.splice(productIndex, 1);
    }

    order.totalAmount = order.products.reduce(
      (total, item) => total + (item.quantity * item.price),
      0
    );

    await order.save();

    const product = await Product.findById(productItem.product); 
    console.log("product" , product)
    if (product) {
      product.stock += 1; 
      await product.save();
    }

    res.redirect("/user/viewCart"); 
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
  


