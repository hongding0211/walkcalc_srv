module.exports = () => {
  return async function pagination(ctx, next) {
    ctx.validate(
      {
        page: { type: 'string', required: false, default: '1' },
        size: { type: 'string', required: false, default: '10' },
      },
      ctx.query
    )

    const page = +ctx.query.page
    const size = +ctx.query.size

    ctx.pagination = {
      page,
      size,
      total: 0,
    }

    await next()

    if (ctx.body.success) {
      ctx.body.pagination = ctx.pagination
    }
  }
}
