const BaseController = require('./base')
const short = require('short-uuid')

class GroupController extends BaseController {
  async create() {
    this.ctx.validate(
      {
        members: { type: 'array', required: false },
      },
      this.ctx.request.body
    )

    const members = this.ctx.request.body.members || []

    const c = await this.ctx.service.group.create(members)
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

    const del = await this.ctx.service.group.dismiss(id)
    if (del.deletedCount > 0) {
      this.success({
        groupId: id,
      })
    } else {
      this.error('Dismiss failed.')
    }
  }

  async clear() {
    this.ctx.validate(
      {
        id: { type: 'string' },
      },
      this.ctx.request.body
    )

    const { id } = this.ctx.request.body

    try {
      const update = await this.ctx.service.group.clear(id)
      if (update.n === 1) {
        this.success({
          groupId: id,
        })
      } else {
        this.error('Clear failed.')
      }
    } catch (e) {
      this.error(e.message)
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
}

module.exports = GroupController
