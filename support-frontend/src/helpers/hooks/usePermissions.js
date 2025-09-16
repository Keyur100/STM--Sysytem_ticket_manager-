import { useSelector } from "react-redux";

export default function usePermissions() {
  const auth = useSelector((s) => s.auth);

  const hasPermission = (perm) => {
    if (!perm) return true;
    const perms = auth?.user?.roles?.permissions || [];
    if (perms.includes("*")) return true;
    return perms.includes(perm);
  };

  return { hasPermission };
}
