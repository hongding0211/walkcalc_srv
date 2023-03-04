/**
 * @param {Egg.Application} app - egg application
 */
module.exports = ({ router, middleware, controller }) => {
  router.post('/record', controller.record.add)
  router.post('/record/drop', controller.record.drop)
  router.get('/record', middleware.pagination(), controller.record.my)
}