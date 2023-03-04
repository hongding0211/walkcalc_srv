/**
 * @param {Egg.Application} app - egg application
 */
module.exports = ({ router, controller }) => {
  router.post('/group/create', controller.group.create)
  router.post('/group/join', controller.group.join)
  router.delete('/group', controller.group.dismiss)
  router.post('/group/addTempUser', controller.group.addTempUser)
  router.post('/group/invite', controller.group.invite)
}
