/**
 * @param {Egg.Application} app - egg application
 */
module.exports = ({ router, middleware, controller }) => {
  router.post('/group/create', controller.group.create)
  router.post('/group/join', controller.group.join)
  router.delete('/group', controller.group.dismiss)
  router.post('/group/addTempUser', controller.group.addTempUser)
  router.post('/group/invite', controller.group.invite)
  router.get('/group/my', middleware.pagination(), controller.group.my)
  router.get('/group', controller.group.getById)
}
