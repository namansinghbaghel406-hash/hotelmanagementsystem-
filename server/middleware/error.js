const { logAction } = require("../utils/log");

exports.notFound = (req, res) => res.status(404).json({ msg: "Route not found" });

// eslint-disable-next-line no-unused-vars
exports.errorHandler = (err, req, res, next) => {
  let status = err.status || 500;
  let msg = err.message || "Internal server error";

  if (err.name === "ValidationError") {
    status = 400;
    msg = Object.values(err.errors).map((e) => e.message).join(", ");
  } else if (err.name === "CastError") {
    status = 400;
    msg = `Invalid ${err.path}`;
  } else if (err.code === 11000) {
    status = 409;
    msg = `Already exists: ${Object.keys(err.keyValue || {}).join(", ")}`;
  } else if (err.name === "MulterError") {
    status = 400;
  } else if (err.type === "entity.parse.failed") {
    status = 400;
    msg = "Invalid JSON body";
  }

  if (status >= 500) {
    console.error(err);
    logAction(req, "server_error", "", null, `${req.method} ${req.originalUrl}: ${err.message}`, "error");
    msg = "Internal server error";
  }
  res.status(status).json({ msg });
};
