import { useParams } from "react-router-dom";

import { DataLakeTableDetailPage } from "@/features/integrations/components/data-lake-table-detail";

export default function DataLakeTableDetailRoute() {
  const { connectionId, tableId } = useParams();
  return (
    <DataLakeTableDetailPage
      connectionId={Number.parseInt(connectionId ?? "", 10)}
      tableId={Number.parseInt(tableId ?? "", 10)}
    />
  );
}
