// Importing necessary modules
const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const path = require('path');

// Creating the Express app
const app = express();

mongoose.connect('mongodb://localhost:27017/products', function (err) {
    if (err) {
        console.log(err);
    } else {
        console.log('Successfully connected to the database');
    }
});

// Defining the product schema
const productSchema = new mongoose.Schema({
    createdAt: {
        type: Date,
        default: Date.now
    },
    name: {type: String, required: true, match: /^[a-zA-Z0-9 ]{1,80}$/},
    description: {type: String, match: /^[\x00-\x7F]*$/},
    price: {
        type: Number,
        required: true,
        validate: {
            validator: function (v) {
                return /^[0-9]+(\.[0-9]{1,2})?$/.test(v);
            },
            message: props => `${props.value} is not a valid price!`
        }
    },
    image: {type: String},
    Id: {type: String, required: true}
});

productSchema.pre('save', function (next) {
    if (!this.image) {
        this.image = path.join(__dirname, '..', 'public', 'default-image.jpg');
    }
    next();
});

// Creating the Product model
const Product = mongoose.model('Product', productSchema);

// Using body-parser to parse incoming request bodies
app.use(bodyParser.json());

// Endpoint to retrieve all products as a list with name, price, and picture
app.get('/products', (req, res) => {
    Product.find({}).select('-_id name Id image price createdAt').exec((err, products) => {
        if (err) {
            res.status(500).send(err);
        } else {
            res.status(200).json(products);
        }
    });
});

// Endpoint to retrieve all products whose name begins with a given input
app.get('/products/name/:name', (req, res) => {
    const name = req.params.name;
    Product.find({name: new RegExp('^' + name, 'i')}).select('-_id name Id image price createdAt').exec((err, products) => {
        if (err) {
            res.status(500).send(err);
        } else {
            res.status(200).json(products);
        }
    });
});

// Endpoint to retrieve one product by its identifier (ID) with all product information
app.get('/products/id/:id', (req, res) => {
    Product.findOne({Id: req.params.id}).select('-_id name Id image price createdAt').exec((err, product) => {
        if (err) {
            res.status(500).send(err);
        } else if (!product) {
            res.status(404).send('Product not found');
        } else {
            res.status(200).json(product);
        }
    });
});

// Endpoint to delete one product by its identifier (ID)
app.delete('/products/:id', (req, res) => {
    const id = req.params.id;
    Product.findOneAndRemove({Id: id}).select('-_id name Id image price createdAt').exec((err, product) => {
        if (err) {
            res.status(500).send(err);
        } else if (!product) {
            res.status(404).send('Product not found');
        } else {
            res.status(200).json(product);
        }
    });
});

// Endpoint to modify any attribute beside id and createdAt
app.patch('/products/:id', (req, res) => {
    Product.findById(req.params.id, (err, product) => {
        if (err) {
            res.status(500).send(err);
        } else if (!product) {
            res.status(404).send('Product not found');
        } else {
            // Checking if the name attribute is being modified
            if (req.body.name && req.body.name !== product.name) {
                // Checking if there is already a product with the new name
                Product.findOne({name: req.body.name}, (err, existingProduct) => {
                    if (err) {
                        res.status(500).send(err);
                    } else if (!existingProduct) {
                        // If there is no existing product with the new name, update the product's name
                        product.name = req.body.name;
                    } else {
                        // If there is an existing product with the new name, find the next available name suffix
                        let suffix = 1;
                        Product.find({name: new RegExp('^' + req.body.name + ' NEW [0-9]+$', 'i')}, (err, existingProductsWithSuffix) => {
                            if (err) {
                                res.status(500).send(err);
                            } else {
                                while (existingProductsWithSuffix.find(p => p.name === req.body.name + ' NEW ' + suffix)) {
                                    suffix++;
                                }
                                product.name = req.body.name + ' NEW ' + suffix;
                            }
                        });
                    }
                });
            }
            // Updating the other attributes
            for (const key in req.body) {
                if (key !== 'name' && key !== 'createdAt' && key !== 'id' && product[key]) {
                    product[key] = req.body[key];
                }
            }
            // Saving the modified product
            product.save((err, updatedProduct) => {
                if (err) {
                    res.status(500).send(err);
                } else {
                    res.status(200).json(updatedProduct);
                }
            });
        }
    });
});

// Endpoint to create a new product

app.post('/products', (req, res) => {
    let product = new Product(req.body);
    let newName;
    let newCount = 0;

    // 1. Check if the name already exists in the database
    Product.findOne({name: product.name}, (err, existingProduct) => {
        if (err) {
            res.status(500).send(err);
        } else if (existingProduct) {
            // 2. If the name already exists, check for similar names with a "NEW" suffix
            Product.find({name: new RegExp(product.name + ' NEW [0-9]+', 'i')}, (err, similarProducts) => {
                if (err) {
                    res.status(500).send(err);
                } else {
                    // 3. If similar names with a "NEW" suffix exist, calculate the highest suffix number
                    similarProducts.forEach(p => {
                        let count = p.name.match(/NEW ([0-9]+)/i)[1];
                        if (count > newCount) {
                            newCount = count;
                        }
                    });
                    newCount++;
                    newName = `${product.name} NEW ${newCount}`;
                    // 4. Assign the new name to the product
                    product.name = newName;
                }
                // 5. Save the new product in the database
                product.save((err, product) => {
                    if (err) {
                        res.status(500).send(err);
                    } else {
                        res.status(201).json(product);
                    }
                });
            });
        } else {
            // 5. Save the new product in the database
            product.save((err, product) => {
                if (err) {
                    res.status(500).send(err);
                } else {
                    res.status(201).json(product);
                }
            });
        }
    });
});

app.delete('/products', (req, res) => {
    Product.remove({}, (err) => {
        if (err) {
            res.status(500).send(err);
        } else {
            res.status(204).send();
        }
    });
});

app.listen(3000, () => {
    console.log("Server is listening on port 3000");
});
