const {firestore} = require('firebase-admin')

/**
 * @typedef OptionsAddData
 * @template T
 * @property {string} path
 * @property {T} value
 * @property {string} [timestamp] - add timestamp when the document is created
 * @property {boolean} [merge] - Changes the behavior of a set() call to only replace the values specified in its data argument.
 * Fields omitted from the set() call remain untouched.
 * @property {boolean} [update] - To update the data. Less priority than delete
 * @property {boolean} [delete] - To delete the data. Has highest priority
 */

/**
 * @typedef AndQuery
 * @type {Array}
 * @template T
 * @property {string} 0 - The path to compare
 * @property {string} 1 - The operation string '<' | '<=' | '==' | '>=' | '>' | 'array-contains' | 'in' | 'array-contains-any'.
 * @property {T} 2 - The value for comparison
 */

/**
 * @typedef OptionsGetData
 * @template T
 * @property {string} path
 * @property {number} [limit]
 * @property {AndQuery[]} [andQueries]
 * @property {{field: string, direction: OrderByDirection}} [orderBy]
 * @property [startAt]
 * @property [startAfter]
 */

/**
 *
 * @param options {OptionsAddData}
 * @param {boolean | string} addId=true - if true the function adds [id] field automatically if document_id is not provided
 * if string is passed then value[stringValue] will be added if document_id is not provided
 * @return {Promise<T>}
 */
exports.addData = async function (options, addId = true) {
  const paths = options.path.split('/')

  // document id must be provided to delete the document
  if (paths.length % 2 === 1 && (options.delete || options.update)) throw new Error("Document id must be provided to delete or update the document")

  // get the deepest referenced collection and document
  const [collection, document] = findCollectionDocument(paths)

  try {
    let d

    // if the document id is provided
    if (paths.length % 2 === 0) d = document
    else d = collection.doc()

    if (addId) _addId(options, d.id, addId)
    if (options.delete) await d.delete()
    else if (options.update) await d.update(options.value)
    else {
      if (options.timestamp) options.value[options.timestamp] = firestore.FieldValue.serverTimestamp()
      await d.set(options.value, {
        merge: options.merge || false
      })
    }

    return options.value
  } catch (e) {
    throw e
  }
}

/**
 * Get data with and queries supported by firestore
 * @template T
 * @param options {OptionsGetData}
 * @return {Promise<[]>} - return array of data
 */
exports.getData = async function (options) {
  console.log("getData", options)
  console.log("getData", options.andQueries)
  const paths = options.path.split('/')
  const isDocIdProvided = !(paths.length % 2)

  if (options.andQueries && isDocIdProvided) throw new Error("And queries can not run on document")

  /** @type FirebaseFirestore.CollectionReference */
  let [collection, document] = findCollectionDocument(paths)

  if (isDocIdProvided) {
    const data = (await document.get()).data()
    return data ? [data] : []
  }

  /** @type FirebaseFirestore.Query */
  let query = collection
  if (options.andQueries && options.andQueries.length !== 0) query = queriedCollection(collection, options.andQueries)

  if (options.orderBy) query = _orderByQuery(query, options.orderBy)
  if (options.startAt) query = _startArQuery(query, options.startAt)
  if (options.startAfter) query = _startAfterQuery(query, options.startAfter)
  if (options.limit) query = query.limit(options.limit)

  return (await query.get()).docs.map(d => d.data())
}

/**
 * Returns the deepest referenced collection and document extracted from [paths]
 * @param {string[]} paths
 * @return {(FirebaseFirestore.CollectionReference<FirebaseFirestore.DocumentData>|CollectionReference<DocumentData>|DocumentReference<T>)[]}
 */
function findCollectionDocument(paths) {
  let collection = firestore().collection(paths[0])
  /** @type DocumentReference<T> */
  let document;

  for (let i = 1, len = paths.length; i < len; i++) {
    if (i % 2 === 1) document = collection.doc(paths[i])
    else collection = document.collection(paths[i])
  }

  return [collection, document]
}

/**
 * @param {FirebaseFirestore.Query} collection
 * @param {AndQuery[]} andQueries
 * @return {FirebaseFirestore.Query}
 */
function queriedCollection(collection, andQueries) {
  andQueries.forEach(q => collection = collection.where(q[0], q[1], q[2]))
  return collection
}

/**
 * Helper function to set id
 * @helper
 * @param options {OptionsAddData}
 * @param {string} docId
 * @param {string} [idString] - Custom id. if provided `options.value[id] = document.id` else `options.value.id = document.id`
 * @return {void}
 */
function _addId(options, docId, idString) {
  if (!options.value || options.value.id) return
  if (idString !== true) options.value[idString] = docId
  else options.value.id = docId
}

/**
 * @param {FirebaseFirestore.Query} query
 * @param {{field: string, direction: OrderByDirection}} orderBy
 * @return {FirebaseFirestore.Query}
 * @private
 */
function _orderByQuery(query, orderBy) {
  if (orderBy.direction) return query.orderBy(orderBy.field, orderBy.direction)
  else return query.orderBy(orderBy.field)
}

/**
 * @param {FirebaseFirestore.Query} query
 * @param value
 * @return {FirebaseFirestore.Query}
 * @private
 */
function _startArQuery(query, value) {
  return query.startAt(value)
}

/**
 * @param {FirebaseFirestore.Query} query
 * @param value
 * @return {FirebaseFirestore.Query}
 * @private
 */
function _startAfterQuery(query, value) {
  return query.startAfter(value)
}

