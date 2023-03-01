const Service = require('egg').Service

class RecordService extends Service {
  async add(payload) {
    const { _id } = this.ctx.token
    const userId = new this.app.mongoose.Types.ObjectId(_id)

    const { groupId } = payload
    delete payload.groupId

    if (
      (
        await this.ctx.model.Group.find({
          id: groupId,
          $or: [
            {
              owner: userId,
            },
            {
              members: { $elemMatch: { $eq: userId } },
            },
          ],
        })
      ).length < 1
    ) {
      throw new Error('You are not in the group.')
    }

    let uuid = await this.ctx.model.User.find({
      _id: userId,
    })
    if (uuid.length < 1) {
      throw new Error('User not exists')
    }
    uuid = uuid[0].uuid

    const len = (
      await this.ctx.model.Group.aggregate([
        {
          $match: { id: groupId },
        },
        {
          $project: {
            total: { $size: '$records' },
          },
        },
      ])
    )[0].total

    if (len >= 500) {
      throw new Error('Reach group record limits.')
    }

    await this.ctx.model.Group.updateOne(
      {
        id: groupId,
      },
      {
        modifiedAt: Date.now(),
      }
    )

    return this.ctx.model.Group.updateOne(
      {
        id: groupId,
      },
      {
        $push: {
          records: {
            who: uuid,
            ...payload,
            createdAt: Date.now(),
            modifiedAt: Date.now(),
          },
        },
      }
    )
  }

  async drop(groupId, recordId) {
    const { _id } = this.ctx.token
    const userId = new this.app.mongoose.Types.ObjectId(_id)

    if (
      (
        await this.ctx.model.Group.find({
          id: groupId,
          $or: [
            {
              owner: userId,
            },
            {
              members: { $elemMatch: { $eq: userId } },
            },
          ],
        })
      ).length < 1
    ) {
      throw new Error('You are not in the group.')
    }

    await this.ctx.model.Group.updateOne(
      {
        id: groupId,
      },
      {
        modifiedAt: Date.now(),
      }
    )

    return this.ctx.model.Group.updateOne(
      {
        id: groupId,
      },
      {
        $pull: {
          records: {
            recordId,
          },
        },
      }
    )
  }

  async update(payload) {
    const { _id } = this.ctx.token
    const userId = new this.app.mongoose.Types.ObjectId(_id)

    const { groupId, recordId } = payload
    delete payload.groupId

    if (
      (
        await this.ctx.model.Group.find({
          id: groupId,
          $or: [
            {
              owner: userId,
            },
            {
              members: { $elemMatch: { $eq: userId } },
            },
          ],
        })
      ).length < 1
    ) {
      throw new Error('You are not in the group.')
    }

    await this.ctx.model.Group.updateOne(
      {
        id: groupId,
      },
      {
        modifiedAt: Date.now(),
      }
    )

    return this.ctx.model.Group.updateOne(
      {
        id: groupId,
        records: {
          $elemMatch: {
            recordId,
          },
        },
      },
      {
        $set: { 'records.$': payload },
      }
    )
  }

  async my() {
    const { _id } = this.ctx.token
    const userId = new this.app.mongoose.Types.ObjectId(_id)

    const c = this.ctx.model.Group.find({
      $or: [
        {
          owner: userId,
        },
        {
          members: {
            $elemMatch: {
              $eq: userId,
            },
          },
        },
      ],
    })

    this.ctx.pagination.total = await c.countDocuments({})

    const { page, size } = this.ctx.pagination

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
                  $eq: userId,
                },
              },
            },
          ],
        },
      },
      {
        $lookup: {
          from: 'users',
          localField: 'members',
          foreignField: '_id',
          as: 'membersInfo',
        },
      },
      {
        $project: {
          _id: 0,
          __v: 0,
          members: 0,
        },
      },
      {
        $project: {
          membersInfo: {
            _id: 0,
            source: 0,
            source_uid: 0,
            __v: 0,
          },
        },
      },
      {
        $lookup: {
          from: 'users',
          localField: 'owner',
          foreignField: '_id',
          as: 'ownerInfo',
        },
      },
      {
        $unwind: {
          path: '$ownerInfo',
        },
      },
      {
        $project: {
          owner: 0,
          ownerInfo: {
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
}

module.exports = RecordService
