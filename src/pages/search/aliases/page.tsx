import { AliasManagementView } from "@/features/search/components/alias-management-view";
import { useAuth } from "@/lib/auth";

export default function SearchAliasesPage() {
  const auth = useAuth();
  const canEdit = auth.canAction("write", "other");

  return <AliasManagementView canEdit={canEdit} />;
}
