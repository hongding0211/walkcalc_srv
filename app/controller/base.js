const { Controller } = require('egg')
class BaseController extends Controller {
  #success = false
  #data = undefined
  #msg = undefined

  /**
   *
   * @param {Record<string, any>} data Success data
   */
  success(data) {
    this.#data = data
    this.#success = true
    this.#setBody()
  }

  /**
   *
   * @param {string} msg Error message
   */
  error(msg) {
    this.#msg = msg
    this.#success = false
    this.#setBody()
  }

  #setBody() {
    this.ctx.body = {
      success: this.#success,
      data: this.#data,
      msg: this.#msg,
    }
  }
}
module.exports = BaseController
