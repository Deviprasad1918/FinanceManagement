// Serializes Mongoose docs the way the frontend expects: `id` instead of `_id`, no `__v`/password.
const toJSONOptions = {
  virtuals: true,
  versionKey: false,
  transform: (doc, ret) => {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.password;
    return ret;
  }
};

module.exports = toJSONOptions;
