const Service = require('egg').Service

class GroupService extends Service {
  async create(name) {
    const { _id } = this.ctx.token

    const c = await this.ctx.model.Group.find({}, { id: 1 })
      .sort({ _id: -1 })
      .limit(-1)

    let nextIdNumber
    if (c.length < 1) {
      nextIdNumber = 40960 // 0xA000
    } else {
      nextIdNumber = parseInt(c[0].id, 16) + 1
    }

    const nextId = nextIdNumber.toString(16).toUpperCase()

    return await this.ctx.model.Group.insertMany([
      {
        id: nextId,
        owner: _id,
        name,
        records: [],
        createdAt: Date.now(),
        modifiedAt: Date.now(),
        tempUsers: [],
      },
    ])
  }

  async join(groupId) {
    const { _id } = this.ctx.token
    const userId = new this.app.mongoose.Types.ObjectId(_id)

    if (
      (
        await this.ctx.model.Group.find({
          id: groupId,
        })
      ).length < 1
    ) {
      throw new Error('Group not exists.')
    }

    if (
      (
        await this.ctx.model.Group.find({
          id: groupId,
          members: {
            $elemMatch: { $eq: userId },
          },
        })
      ).length > 0
    ) {
      throw new Error('User already in this group.')
    }

    if (
      (
        await this.ctx.model.Group.find({
          id: groupId,
          owner: userId,
        })
      ).length > 0
    ) {
      throw new Error('You are already the group owner.')
    }

    return this.ctx.model.Group.updateOne(
      {
        id: groupId,
      },
      {
        $push: {
          members: userId,
        },
      }
    )
  }

  async dismiss(groupId) {
    const { _id } = this.ctx.token
    const userId = new this.app.mongoose.Types.ObjectId(_id)

    return this.ctx.model.Group.deleteOne({
      id: groupId,
      owner: userId,
    })
  }

  async clear(groupId) {
    const { _id } = this.ctx.token
    const userId = new this.app.mongoose.Types.ObjectId(_id)

    if (
      (
        await this.ctx.model.Group.find({
          id: groupId,
          owner: userId,
        })
      ).length < 1
    ) {
      throw new Error('You do not own this group')
    }

    return this.ctx.model.Group.updateOne(
      {
        id: groupId,
        owner: userId,
      },
      {
        $set: { records: [] },
      }
    )
  }

  async addTempUser(groupId, uuid, userName) {
    const { _id } = this.ctx.token
    const userId = new this.app.mongoose.Types.ObjectId(_id)

    if (
      (
        await this.ctx.model.Group.find({
          id: groupId,
          owner: userId,
        })
      ).length < 1
    ) {
      throw new Error('You do not own this group')
    }

    if (
      (
        await this.ctx.model.Group.find({
          id: groupId,
          tempUsers: {
            $elemMatch: { name: userName },
          },
        })
      ).length > 0
    ) {
      throw new Error('Name exists.')
    }

    return this.ctx.model.Group.updateOne(
      {
        id: groupId,
      },
      {
        $push: {
          tempUsers: {
            uuid,
            name: userName,
          },
        },
      }
    )
  }
}

module.exports = GroupService
