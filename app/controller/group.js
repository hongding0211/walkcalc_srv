const BaseController = require('./base')
const short = require('short-uuid')

class GroupController extends BaseController {
  async create() {
    this.ctx.validate(
      {
        name: { type: 'string' },
      },
      this.ctx.request.body
    )

    const { name } = this.ctx.request.body

    const c = await this.ctx.service.group.create(name)
    this.success({
      groupId: c[0].id,
    })
  }

  async join() {
    this.ctx.validate(
      {
        id: { type: 'string' },
      },
      this.ctx.request.body
    )

    const { id } = this.ctx.request.body

    try {
      const update = await this.ctx.service.group.join(id)
      if (update.nModified === 1) {
        this.success({
          groupId: id,
        })
      } else {
        this.error('Join failed.')
      }
    } catch (e) {
      this.error(e.message)
    }
  }

  async dismiss() {
    this.ctx.validate(
      {
        id: { type: 'string' },
      },
      this.ctx.query
    )

    const { id } = this.ctx.query

    try {
      const del = await this.ctx.service.group.dismiss(id)
      if (del.deletedCount < 1) {
        this.error('Dismiss failed')
        return
      }
      this.success({
        groupId: id,
      })
    } catch (e) {
      this.error('Dismiss failed.')
    }
  }

  async addTempUser() {
    this.ctx.validate(
      {
        id: { type: 'string' },
        name: { type: 'string' },
      },
      this.ctx.request.body
    )

    const { id, name } = this.ctx.request.body
    const uuid = short.uuid()

    try {
      const update = await this.ctx.service.group.addTempUser(id, uuid, name)
      if (update.nModified === 1) {
        this.success({
          uuid,
          name,
        })
      } else {
        this.error('Add failed.')
      }
    } catch (e) {
      this.error(e.message)
    }
  }

  async invite() {
    this.ctx.validate(
      {
        id: { type: 'string' },
        members: { type: 'array' },
      },
      this.ctx.request.body
    )

    const { id, members } = this.ctx.request.body

    try {
      const update = await this.ctx.service.group.invite(id, members)
      if (update.nModified === 1) {
        this.success({
          id,
          members,
        })
      } else {
        this.error('Invite failed.')
      }
    } catch (e) {
      this.error(e.message)
    }
  }

  async my() {
    this.success(await this.ctx.service.group.my())
  }

  async getById() {
    this.ctx.validate(
      {
        id: { type: 'string' },
      },
      this.ctx.query
    )

    const { id } = this.ctx.query

    const f = await this.ctx.service.group.getById(id)

    if (f.length < 1) {
      this.error('Query failed')
      return
    }
    this.success(f[0])
  }
}

module.exports = GroupController
