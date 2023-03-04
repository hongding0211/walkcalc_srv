const BaseController = require('./base')
const { wrap } = require('../utlis/token')
const short = require('short-uuid')

class UserController extends BaseController {
  async login() {
    this.ctx.validate(
      {
        type: { type: 'enum', values: this.config.loginType },
        ticket: { type: 'string' },
      },
      this.ctx.query
    )

    const { type, ticket } = this.ctx.query

    try {
      let tokenData, userData, uuid, _id

      switch (type) {
        case 'sso':
          tokenData = await this.ctx.service.oauth.sso.login(ticket)
          break
        case 'wx':
          break
        default:
          break
      }

      const { uid, authToken } = tokenData

      const found = await this.ctx.service.user.findBySourceUid(uid)

      if (found.length < 1) {
        uuid = short.uuid()

        switch (type) {
          case 'sso': {
            const d = await this.ctx.service.oauth.sso.getUserData(authToken)
            userData = {
              uuid,
              name: d.name,
              source: type,
              source_uid: uid,
              avatar: d.avatar,
              debt: 0,
            }
            break
          }
          case 'wx':
            break
          default:
            break
        }

        const insert = await this.ctx.service.user.add(userData)
        _id = insert[0]._id
      } else {
        _id = found[0]._id
      }

      const wrappedToken = wrap({
        _id,
      })

      this.success({
        token: wrappedToken,
      })
    } catch {
      this.error('Invalid ticket')
    }
  }

  async info() {
    const found = await this.ctx.service.user.findById(this.ctx.token._id)
    if (found.length < 1) {
      this.error('User not exists.')
    }
    this.success(found[0])
  }

  async infos() {
    this.ctx.validate(
      {
        uuids: { type: 'array' },
      },
      this.ctx.request.body
    )

    const { uuids } = this.ctx.request.body
    const found = await this.ctx.service.user.findByUuids(uuids)
    this.success(found)
  }

  async search() {
    this.ctx.validate(
      {
        name: { type: 'string' },
      },
      this.ctx.request.query
    )

    const { name } = this.ctx.request.query
    const found = await this.ctx.service.user.findByName(name)
    this.success(found)
  }

  async myDebt() {
    const found = await this.ctx.service.user.myDebt()
    if (found.length > 0) {
      this.success({
        debt: found[0].debt,
      })
    } else {
      this.error('Query failed')
    }
  }
}

module.exports = UserController
