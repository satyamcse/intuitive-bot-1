const {entitiesClient, tagEntityPath, updateEntity} = require('./')

/**
 * @param {string[]} tags
 * @return {Promise<void>}
 */
async function updateTag (tags) {
  return _getTagEntity()
    .then((responses) => {
      /** @type EntityType*/
      const entity = responses[0]
      if (!entity) throw new Error("Entity not found")
      return entity
    })
    .then((tagEntity) => {
      const synonyms = tags.map(tag => [tag])
      return updateEntity(tagEntity, tags, synonyms)
    })
    .catch((e) => {
      console.error(JSON.stringify(e))
    })
}

/**
 * @return {Promise<EntityType[]>}
 * @private
 */
async function _getTagEntity() {
  return entitiesClient
    .getEntityType({
      name: tagEntityPath
    })
}

module.exports = {updateTag}
