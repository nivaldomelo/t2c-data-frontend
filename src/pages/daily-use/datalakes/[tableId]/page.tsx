import { Navigate, useParams } from "react-router-dom";
export default function Page() {
  const { tableId } = useParams();
  return <Navigate to={`/datalakes/${encodeURIComponent(tableId ?? "")}`} replace />;
}
