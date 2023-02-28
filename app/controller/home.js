const BaseController = require('./base')

class HomeController extends BaseController {
  async index() {
    this.success({
      msg: 'hello world',
    })
  }
}

module.exports = HomeController
