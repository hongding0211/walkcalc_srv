/**
 * @param {Egg.Application} app - egg application
 */
module.exports = ({ router, controller }) => {
  router.get('/user/login', controller.user.login)
  router.get('/user/info', controller.user.info)
  router.patch('/user/info', controller.user.patchInfo)
  router.post('/user/infos', controller.user.infos)
  router.get('/user/search', controller.user.search)
  router.get('/user/myDebt', controller.user.myDebt)
  router.post('/user/meta', controller.user.meta)
  router.get('/user/refreshToken', controller.user.refreshToken)
}
