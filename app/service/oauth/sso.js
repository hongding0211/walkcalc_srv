const Service = require('egg').Service

class SSOService extends Service {
  /**
   * @param {string} ticket SSO ticket
   */
  async login(ticket) {
    const ssoConfig = this.config.sso

    const res = await this.ctx.curl(ssoConfig.api.validate.path, {
      method: ssoConfig.api.validate.method,
      contentType: 'json',
      data: {
        ticket,
      },
      dataType: 'json',
    })

    if (res.data.success === false) {
      throw new Error(res.data.msg)
    }

    const { authToken } = res.data.data

    const jwtBodyMatcher = authToken.match(/^[\w-]+\.([\w-]+)\.[\w-]+$/)

    if (!jwtBodyMatcher?.length || jwtBodyMatcher.length < 2) {
      this.ctx.throw(403, 'Invalid token.')
    }

    const tokenBody = JSON.parse(atob(jwtBodyMatcher[1]))

    return {
      authToken,
      uid: tokenBody.uid,
    }
  }

  async getUserData(authToken) {
    const ssoConfig = this.config.sso

    const res = await this.ctx.curl(ssoConfig.api.getUserInfo.path, {
      method: ssoConfig.api.getUserInfo.method,
      data: {
        authToken,
      },
      dataType: 'json',
    })

    if (res.data.success === false) {
      throw new Error(res.data.msg)
    }

    return res.data.data
  }
}

module.exports = SSOService
