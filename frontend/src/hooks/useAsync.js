import { useEffect, useState } from "react";

/**
 * Lightweight async data hook with a minimum visible loading duration so
 * loading states are perceivable rather than a flash.
 */
export function useAsync(fn, deps = []) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    const t0 = Date.now();
    Promise.resolve()
      .then(fn)
      .then((d) => {
        const wait = Math.max(0, 250 - (Date.now() - t0));
        setTimeout(() => {
          if (!active) return;
          setData(d);
          setLoading(false);
        }, wait);
      })
      .catch((err) => {
        if (!active) return;
        setError(err?.message || "Something went wrong. Please try again.");
        setLoading(false);
      });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { data, loading, error };
}
