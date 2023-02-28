const { unwrap } = require('../utlis/token')

module.exports = () => {
  return async function auth(ctx, next) {
    const token = ctx.cookies.get('token') || ctx.request.query?.token

    if (token == null) {
      ctx.throw(401, 'Token is required.')
    }

    try {
      const unwrappedToken = unwrap(token)

      if (!unwrappedToken) {
        ctx.throw(403, 'Invalid token.')
      }

      // 将 token 挂载到 ctx 上
      ctx.token = unwrappedToken
    } catch {
      ctx.throw(403, 'Invalid token.')
    }

    await next()
  }
}
