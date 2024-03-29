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
    const f = await this.ctx.service.group.my()
    for (const group of f) {
      for (let i = 0; i < group.membersInfo.length; i++) {
        group.membersInfo[i].debt = group.members.find(
          (e) => e.id.toString() === group.membersInfo[i]._id.toString()
        ).debt
        delete group.membersInfo[i]._id
      }
      delete group.members
    }
    this.success(f)
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

    for (const group of f) {
      for (let i = 0; i < group.membersInfo.length; i++) {
        group.membersInfo[i].debt = group.members.find(
          (e) => e.id.toString() === group.membersInfo[i]._id.toString()
        ).debt
        group.membersInfo[i].cost = group.members.find(
          (e) => e.id.toString() === group.membersInfo[i]._id.toString()
        ).cost
        delete group.membersInfo[i]._id
      }
      delete group.members
    }

    if (f.length < 1) {
      this.error('Query failed')
      return
    }
    this.success(f[0])
  }

  async archive() {
    this.ctx.validate(
      {
        id: { type: 'string' },
      },
      this.ctx.request.body
    )

    const { id } = this.ctx.request.body

    const res = await this.ctx.service.group.toggleArchive(id, true)

    if (res.nModified) {
      this.success({
        id,
      })
    } else {
      this.error('Archive failed.')
    }
  }

  async unarchive() {
    this.ctx.validate(
      {
        id: { type: 'string' },
      },
      this.ctx.request.body
    )

    const { id } = this.ctx.request.body

    const res = await this.ctx.service.group.toggleArchive(id, false)

    if (res.nModified) {
      this.success({
        id,
      })
    } else {
      this.error('Unarchive failed.')
    }
  }

  async changeName() {
    this.ctx.validate(
      {
        id: { type: 'string' },
        name: { type: 'string' },
      },
      this.ctx.request.body
    )

    const { id, name } = this.ctx.request.body

    if (!name) {
      this.error('Invalid group name')
    }

    const res = await this.ctx.service.group.changeName(id, name)

    if (res.nModified) {
      this.success({
        id,
        name,
      })
    } else {
      this.error('Change failed.')
    }
  }
}

module.exports = GroupController
