const paginate = (q, { defaultLimit = 10, max = 100 } = {}) => {
  const page = Math.max(1, parseInt(q.page, 10) || 1);
  const limit = Math.min(max, Math.max(1, parseInt(q.limit, 10) || defaultLimit));
  return { page, limit, skip: (page - 1) * limit };
};

const pageResult = (items, total, page, limit) => ({
  items,
  total,
  page,
  pages: Math.max(1, Math.ceil(total / limit)),
});

module.exports = { paginate, pageResult };
