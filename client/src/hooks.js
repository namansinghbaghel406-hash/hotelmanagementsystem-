import { useCallback, useEffect, useState } from "react";
import api, { errMsg } from "./api";

// GET helper: refetches when url/params change. reload(true) refreshes without the loading flash.
export function useFetch(url, params) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const key = JSON.stringify(params || {});

  const load = useCallback(
    async (silent = false) => {
      if (!url) return;
      if (silent !== true) setLoading(true);
      try {
        const res = await api.get(url, { params: JSON.parse(key) });
        setData(res.data);
        setError("");
      } catch (e) {
        setError(errMsg(e));
      } finally {
        setLoading(false);
      }
    },
    [url, key]
  );

  useEffect(() => {
    load();
  }, [load]);

  return { data, loading, error, reload: load };
}

// Removes empty values so they are not sent as ?type=&minPrice=
export const clean = (obj) => Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== "" && v !== undefined && v !== null));
