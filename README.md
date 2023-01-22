# Products API

This is a simple REST API for a product catalog built with Node.js, Express, and MongoDB.

## Requirements

- Node.js
- MongoDB
- Express
- Body-parser
- Mongoose
- path

## Installation

1. Clone the repository
   git clone https://github.com/yourusername/products-api.git
2. Install the dependencies
   npm install
3. Start the MongoDB server
   mongod
4. Start the Node.js server
   npm start

## Endpoints

- `GET /products`: Retrieves all products as a list with name, price, and picture.
- `GET /products/name/:name`: Retrieves all products whose name begins with a given input.
- `GET /products/id/:id`: Retrieves one product by its identifier (ID) with all product information.
- `DELETE /products/:id`: Deletes one product by its identifier (ID).
- `PATCH /products/:id`: Modifies any attribute beside id and createdAt.

## Note

Make sure to change the MongoDB URI in the `index.js` file to your local MongoDB instance.
   
