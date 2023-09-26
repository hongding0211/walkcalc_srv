/**
 * @param {Egg.Application} app - egg application
 */
module.exports = ({ router, middleware, controller }) => {
  router.post('/record', controller.record.add)
  router.post('/record/drop', controller.record.drop)
  router.post('/record/update', controller.record.update)
  router.get('/record', controller.record.getById)
  router.get(
    '/record/group',
    middleware.pagination(),
    controller.record.getByGroupId
  )
}
