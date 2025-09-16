import { useRef } from "react";
export default function useDebounce(cb, wait = 300) {
  const t = useRef(null);
  return (val) => {
    clearTimeout(t.current);
    t.current = setTimeout(() => cb(val), wait);
  };
}
