const BaseController = require('./base')
const shajs = require('sha.js')

class RecordController extends BaseController {
  async add() {
    this.ctx.validate(
      {
        groupId: { type: 'string' },
        paid: { type: 'number' },
        forWhom: { type: 'array' },
        type: { type: 'string' },
        text: { type: 'string' },
        long: { type: 'string' },
        lat: { type: 'string' },
      },
      this.ctx.request.body
    )

    const recordId = shajs('sha256')
      .update(`${this.ctx.request.body.groupId}${Date.now()}`)
      .digest('hex')

    try {
      const update = await this.ctx.service.record.add({
        ...this.ctx.request.body,
        recordId,
      })
      if (update.nModified > 0) {
        this.success({
          ...this.ctx.request.body,
          recordId,
        })
      } else {
        this.error('Add failed.')
      }
    } catch (e) {
      this.error(e.message)
    }
  }

  async drop() {
    this.ctx.validate(
      {
        groupId: { type: 'string' },
        recordId: { type: 'string' },
      },
      this.ctx.request.body
    )

    const { groupId, recordId } = this.ctx.request.body

    try {
      const update = await this.ctx.service.record.drop(groupId, recordId)
      if (update.nModified > 0) {
        this.success({
          groupId,
          recordId,
        })
      } else {
        this.error('Drop failed.')
      }
    } catch (e) {
      this.error(e.message)
    }
  }

  async my() {
    this.success(await this.ctx.service.record.my())
  }
}

module.exports = RecordController
