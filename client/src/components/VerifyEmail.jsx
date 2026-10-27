import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import Navbar from "./common/Navbar";
import { Loading } from "./common/Misc";
import api, { errMsg } from "../api";

export default function VerifyEmail() {
  const { token } = useParams();
  const [state, setState] = useState({ loading: true, ok: false, msg: "" });

  useEffect(() => {
    api
      .get(`/auth/verify/${token}`)
      .then((r) => setState({ loading: false, ok: true, msg: r.data.msg }))
      .catch((e) => setState({ loading: false, ok: false, msg: errMsg(e) }));
  }, [token]);

  return (
    <>
      <Navbar />
      <div className="container py-5 text-center" style={{ maxWidth: 480 }}>
        {state.loading ? <Loading text="Verifying..." /> : (
          <div className={`alert alert-${state.ok ? "success" : "danger"}`}>
            <p className="mb-2">{state.msg}</p>
            <Link to="/login" className="btn btn-primary btn-sm">Go to login</Link>
          </div>
        )}
      </div>
    </>
  );
}
