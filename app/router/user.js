/**
 * @param {Egg.Application} app - egg application
 */
module.exports = ({ router, controller }) => {
  router.get('/user/login', controller.user.login)
  router.get('/user/info', controller.user.info)
  router.post('/user/infos', controller.user.infos)
  router.get('/user/search', controller.user.search)
}
