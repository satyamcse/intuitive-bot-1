const {getData} = require('./api')

/**
 * @typedef Product
 * @type object
 * @property {string} product_id
 */

/**
 *
 * @param {string | string[]} products - Array of product ids of products to fetched. Can be single product id.
 * @return {Product | Product[]}
 */
async function getProducts(products) {
  // if single product id is give
  if (typeof products === 'string') {
    let products = await _createGetProductRequest(products)
    return products[0]
  } else {
    let promises = products.map(id => _createGetProductRequest(id))
    return await Promise.all(promises)
  }
}


async function setCart() {
}

/**
 *
 * @param {string} sessionId
 * @return {Promise<{product_id: string, quantity: number}[]>}
 */
async function getCart(sessionId) {
  return await getData({
    path: `sessions/${sessionId}/cart`
  })
}

/**
 * Create request to retrieve [Product] by its `product_id`
 * @template Data
 * @param {string} id
 * @return {Promise<Data[]>}
 * @private
 */
function _createGetProductRequest(id) {
  return getData({
    path: "products",
    andQueries: [
      ["product_id", "==", id]
    ]
  })
}

export { getProducts, setCart, getCart }
