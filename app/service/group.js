const Service = require('egg').Service

class GroupService extends Service {
  async create(name) {
    const { _id } = this.ctx.token
    const userId = new this.app.mongoose.Types.ObjectId(_id)

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
        owner: userId,
        name,
        records: [],
        members: [
          {
            id: userId,
            debt: 0,
          },
        ],
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
            $elemMatch: { id: { $eq: userId } },
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
          members: {
            id: userId,
            debt: 0,
          },
        },
      }
    )
  }

  async dismiss(groupId) {
    const { _id } = this.ctx.token
    const userId = new this.app.mongoose.Types.ObjectId(_id)

    const f = await this.ctx.model.Group.find({
      id: groupId,
      owner: userId,
    })

    if (f.length < 1) {
      throw new Error('You do not own this group')
    }

    const members = f[0].members

    for (const m of members) {
      await this.ctx.model.User.updateOne(
        {
          _id: m.id,
        },
        {
          $inc: {
            debt: -m.debt,
          },
        }
      )
    }

    return this.ctx.model.Group.deleteOne({
      id: groupId,
      owner: userId,
    })
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
            debt: 0,
          },
        },
      }
    )
  }

  async invite(groupId, members) {
    const memberAlreadyInGroup = (
      await this.ctx.model.Group.find(
        {
          id: groupId,
        },
        {
          'members.id': 1,
        }
      )
    )[0].members.map((e) => new this.app.mongoose.Types.ObjectId(e.id))

    const f = await this.ctx.model.User.find(
      {
        uuid: { $in: members },
        _id: {
          $nin: memberAlreadyInGroup,
        },
      },
      {
        _id: 1,
      }
    )
    const membersIds = f.map((e) => e._id)

    return this.ctx.model.Group.updateOne(
      {
        id: groupId,
      },
      {
        $push: {
          members: membersIds.map((m) => ({
            id: m._id,
            debt: 0,
          })),
        },
      }
    )
  }

  async my() {
    const { _id } = this.ctx.token
    const userId = new this.app.mongoose.Types.ObjectId(_id)

    const { page, size } = this.ctx.pagination

    this.ctx.pagination.total = await this.ctx.model.Group.find({
      $or: [
        {
          owner: userId,
        },
        {
          members: {
            $elemMatch: {
              id: userId,
            },
          },
        },
      ],
    }).countDocuments({})

    return this.ctx.model.Group.aggregate([
      {
        $match: {
          $or: [
            {
              owner: userId,
            },
            {
              members: {
                $elemMatch: {
                  id: userId,
                },
              },
            },
          ],
        },
      },
      {
        $project: {
          _id: 0,
          owner: 0,
          __v: 0,
          records: 0,
        },
      },
      {
        $lookup: {
          from: 'users',
          localField: 'members.id',
          foreignField: '_id',
          as: 'membersInfo',
        },
      },
      {
        $project: {
          members: 0,
          membersInfo: {
            _id: 0,
            source: 0,
            source_uid: 0,
            __v: 0,
          },
        },
      },
    ])
      .sort({ modifiedAt: -1 })
      .skip((page - 1) * size)
      .limit(size)
  }

  async getById(groupId) {
    const { _id } = this.ctx.token
    const userId = new this.app.mongoose.Types.ObjectId(_id)

    return this.ctx.model.Group.aggregate([
      {
        $match: {
          $and: [
            {
              id: groupId,
            },
            {
              $or: [
                {
                  owner: userId,
                },
                {
                  members: {
                    $elemMatch: {
                      id: userId,
                    },
                  },
                },
              ],
            },
          ],
        },
      },
      {
        $project: {
          _id: 0,
          owner: 0,
          __v: 0,
          records: 0,
        },
      },
      {
        $lookup: {
          from: 'users',
          localField: 'members.id',
          foreignField: '_id',
          as: 'membersInfo',
        },
      },
      {
        $project: {
          members: 0,
          membersInfo: {
            _id: 0,
            source: 0,
            source_uid: 0,
            __v: 0,
          },
        },
      },
    ])
  }
}

module.exports = GroupService
