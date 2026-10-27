export default function Pagination({ page, pages, onChange }) {
  if (!pages || pages <= 1) return null;

  // Show a window of up to 5 page numbers around the current page.
  const start = Math.max(1, Math.min(page - 2, pages - 4));
  const nums = [];
  for (let p = start; p <= Math.min(pages, start + 4); p += 1) nums.push(p);

  return (
    <nav aria-label="Pagination" className="mt-3">
      <ul className="pagination pagination-sm justify-content-center mb-0">
        <li className={`page-item ${page === 1 ? "disabled" : ""}`}>
          <button className="page-link" onClick={() => onChange(page - 1)}>Prev</button>
        </li>
        {nums.map((p) => (
          <li key={p} className={`page-item ${p === page ? "active" : ""}`}>
            <button className="page-link" onClick={() => onChange(p)}>{p}</button>
          </li>
        ))}
        <li className={`page-item ${page === pages ? "disabled" : ""}`}>
          <button className="page-link" onClick={() => onChange(page + 1)}>Next</button>
        </li>
      </ul>
    </nav>
  );
}
