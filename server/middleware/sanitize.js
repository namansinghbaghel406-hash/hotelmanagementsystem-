// Removes MongoDB operator injection ({"$gt": ""}) and dotted keys from user input.
const clean = (value) => {
  if (Array.isArray(value)) return value.map(clean);
  if (value && typeof value === "object") {
    for (const key of Object.keys(value)) {
      if (key.startsWith("$") || key.includes(".")) delete value[key];
      else value[key] = clean(value[key]);
    }
  }
  return value;
};

module.exports = (req, res, next) => {
  if (req.body) clean(req.body);
  if (req.query) clean(req.query);
  if (req.params) clean(req.params);
  next();
};
