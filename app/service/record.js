const Service = require('egg').Service

class RecordService extends Service {
  async add(payload) {
    const { _id } = this.ctx.token
    const userId = new this.app.mongoose.Types.ObjectId(_id)

    const { groupId, forWhom, paid } = payload
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

    const forWhomIds = await this.ctx.model.User.find(
      {
        uuid: {
          $in: forWhom,
        },
      },
      {
        _id: 1,
        uuid: 1,
      }
    )

    const tempUserUuids = (
      await this.ctx.model.Group.find({
        id: groupId,
      })
    )[0].tempUsers

    const avg = paid / forWhom.length

    // update last modified time
    await this.ctx.model.Group.updateOne(
      {
        id: groupId,
      },
      {
        modifiedAt: Date.now(),
      }
    )

    // update debt for each people
    for (const cur of forWhomIds) {
      const debt = cur._id.toString() === userId.toString() ? paid - avg : -avg
      await this.ctx.model.Group.updateOne(
        {
          id: groupId,
        },
        {
          $inc: { 'members.$[elem].debt': debt },
        },
        {
          arrayFilters: [
            {
              'elem.id': cur._id,
            },
          ],
        }
      )
      await this.ctx.model.User.updateOne(
        {
          _id: cur._id,
        },
        {
          $inc: { debt },
        }
      )
    }
    // update debt for temp users
    for (const cur of tempUserUuids) {
      const debt =
        cur?._id?.toString() === userId.toString() ? paid - avg : -avg
      await this.ctx.model.Group.updateOne(
        {
          id: groupId,
        },
        {
          $inc: { 'tempUsers.$[elem].debt': debt },
        },
        {
          arrayFilters: [
            {
              'elem.uuid': cur.uuid,
            },
          ],
        }
      )
    }

    // insert record
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

    const record = await this.ctx.model.Group.aggregate([
      {
        $match: {
          id: groupId,
        },
      },
      {
        $project: {
          records: 1,
        },
      },
      {
        $unwind: '$records',
      },
      {
        $match: {
          'records.recordId': recordId,
        },
      },
    ])

    if (record.length < 1) {
      throw new Error('Record not exists')
    }

    const { forWhom, paid } = record[0].records

    const forWhomIds = await this.ctx.model.User.find(
      {
        uuid: {
          $in: forWhom,
        },
      },
      {
        _id: 1,
        uuid: 1,
      }
    )

    const tempUserUuids = (
      await this.ctx.model.Group.find({
        id: groupId,
      })
    )[0].tempUsers

    const avg = paid / forWhom.length

    // update debt for each person
    for (const cur of forWhomIds) {
      const debt = -(cur._id.toString() === userId.toString()
        ? paid - avg
        : -avg)
      await this.ctx.model.Group.updateOne(
        {
          id: groupId,
        },
        {
          $inc: { 'members.$[elem].debt': debt },
        },
        {
          arrayFilters: [
            {
              'elem.id': cur._id,
            },
          ],
        }
      )
      await this.ctx.model.User.updateOne(
        {
          _id: cur._id,
        },
        {
          $inc: { debt },
        }
      )
    }
    // update debt for temp users
    for (const cur of tempUserUuids) {
      const debt = -(cur?._id?.toString() === userId.toString()
        ? paid - avg
        : -avg)
      await this.ctx.model.Group.updateOne(
        {
          id: groupId,
        },
        {
          $inc: { 'tempUsers.$[elem].debt': debt },
        },
        {
          arrayFilters: [
            {
              'elem.uuid': cur.uuid,
            },
          ],
        }
      )
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
          localField: 'members.id',
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
