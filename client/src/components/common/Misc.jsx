export function Loading({ text = "Loading..." }) {
  return (
    <div className="text-center text-muted py-4">
      <div className="spinner-border spinner-border-sm me-2" role="status" />
      {text}
    </div>
  );
}

export function ErrorNote({ error }) {
  return error ? <div className="alert alert-danger py-2">{error}</div> : null;
}

export function Empty({ children = "Nothing here yet." }) {
  return <p className="text-muted text-center py-4 mb-0">{children}</p>;
}

export function StatCard({ title, value, sub, tone = "primary" }) {
  return (
    <div className="card shadow-sm h-100">
      <div className="card-body">
        <div className="text-muted small">{title}</div>
        <div className={`fs-3 fw-bold text-${tone}`}>{value}</div>
        {sub && <div className="small text-muted">{sub}</div>}
      </div>
    </div>
  );
}

export function Stars({ value = 0, count }) {
  const full = Math.round(value);
  return (
    <span title={`${value} out of 5`}>
      <span className="star">{"★".repeat(full)}</span>
      <span className="text-muted">{"★".repeat(5 - full)}</span>
      {count !== undefined && <small className="text-muted ms-1">({count})</small>}
    </span>
  );
}

// Generic modal shell controlled by the parent.
export function Modal({ title, onClose, children, footer, size = "" }) {
  return (
    <div className="modal d-block" style={{ background: "rgba(0,0,0,.5)" }} role="dialog" aria-modal="true">
      <div className={`modal-dialog modal-dialog-centered modal-dialog-scrollable ${size}`}>
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">{title}</h5>
            <button type="button" className="btn-close" onClick={onClose} aria-label="Close" />
          </div>
          <div className="modal-body">{children}</div>
          {footer && <div className="modal-footer">{footer}</div>}
        </div>
      </div>
    </div>
  );
}

export function Tabs({ tabs, active, onChange }) {
  return (
    <ul className="nav nav-pills mb-4 tab-scroll pb-1">
      {tabs.map(([key, text]) => (
        <li className="nav-item" key={key}>
          <button className={`nav-link ${active === key ? "active" : ""}`} onClick={() => onChange(key)}>
            {text}
          </button>
        </li>
      ))}
    </ul>
  );
}
