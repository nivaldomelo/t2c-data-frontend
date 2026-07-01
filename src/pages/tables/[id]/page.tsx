import { Navigate, useParams } from "react-router-dom";
export default function Page() {
  const { id } = useParams();
  return <Navigate to={`/explorer?tableId=${encodeURIComponent(id ?? "")}`} replace />;
}
