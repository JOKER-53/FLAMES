import { Link } from "react-router-dom";
import { useAccount } from "../hooks/useAccount";

export function AccountLink() {
  const { user } = useAccount();
  return <Link to="/account" className="account-link" title={user ? `Account: ${user.name}` : "Sign in to save your progress"}>{user ? user.name : "Sign in / save progress"}</Link>;
}
