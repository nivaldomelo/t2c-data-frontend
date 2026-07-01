import { useEffect, useMemo, useState } from "react";
import { PencilLine, Save, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { apiRequest } from "@/lib/client-api";
import { cn } from "@/lib/cn";

type TableDescriptionCardProps = {
  tableId: number;
  descriptionManual: string | null;
  descriptionSource: string | null;
  canEdit: boolean;
  title?: string;
  compact?: boolean;
  onSaved?: (descriptionManual: string | null) => void;
};

type TableDescriptionPatchResult = {
  description_manual: string | null;
  description_source: string | null;
  updated_at?: string;
};

function normalizeText(value: string | null | undefined) {
  return (value ?? "").trim();
}

export function TableDescriptionCard({
  tableId,
  descriptionManual,
  descriptionSource,
  canEdit,
  title = "Descrição da tabela",
  compact = false,
  onSaved,
}: TableDescriptionCardProps) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const effectiveDescription = useMemo(
    () => normalizeText(descriptionManual) || normalizeText(descriptionSource) || "",
    [descriptionManual, descriptionSource],
  );

  useEffect(() => {
    setDraft(normalizeText(descriptionManual));
  }, [descriptionManual, tableId]);

  useEffect(() => {
    if (!editing) {
      setDraft(normalizeText(descriptionManual));
    }
  }, [editing, descriptionManual]);

  async function saveDescription() {
    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      const payload = await apiRequest<TableDescriptionPatchResult>(`/v1/tables/${tableId}`, {
        method: "PATCH",
        body: JSON.stringify({
          description_manual: normalizeText(draft) || null,
        }),
      });
      const nextDescription = payload.description_manual ?? null;
      setEditing(false);
      setDraft(nextDescription || "");
      setNotice(nextDescription ? "Descrição da tabela salva com sucesso." : "Descrição da tabela removida com sucesso.");
      onSaved?.(nextDescription);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível salvar a descrição da tabela.");
    } finally {
      setSaving(false);
    }
  }

  const shellClassName = compact ? "border-border bg-surface shadow-[0_10px_30px_rgba(15,23,42,0.04)]" : "border-border bg-bg-subtle/70 shadow-[0_12px_36px_rgba(15,23,42,0.05)]";

  return (
    <Card className={cn(shellClassName)}>
      <CardHeader className={compact ? "px-4 py-3" : "px-5 py-4"}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-600">{title}</p>
            <p className={cn("mt-2 text-sm leading-6 text-text-body", compact && "text-xs leading-5")}>
              {effectiveDescription || "Ainda não existe uma descrição consolidada para esta tabela."}
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            {descriptionManual ? <Badge tone="success">Manual</Badge> : descriptionSource ? <Badge tone="neutral">Origem</Badge> : <Badge tone="warning">Pendente</Badge>}
            {canEdit ? (
              editing ? (
                <>
                  <Button disabled={saving} onClick={() => setEditing(false)} size="sm" variant="outline">
                    <X className="mr-2 h-4 w-4" />
                    Cancelar
                  </Button>
                  <Button disabled={saving} onClick={() => void saveDescription()} size="sm">
                    <Save className="mr-2 h-4 w-4" />
                    {saving ? "Salvando..." : "Salvar"}
                  </Button>
                </>
              ) : (
                <Button onClick={() => setEditing(true)} size="sm" variant="outline">
                  <PencilLine className="mr-2 h-4 w-4" />
                  Editar
                </Button>
              )
            ) : null}
          </div>
        </div>
      </CardHeader>
      <CardContent className={cn("space-y-3", compact ? "px-4 pb-4 pt-0" : "px-5 pb-5 pt-0")}>
        {editing ? (
          <div className="space-y-3">
            <Textarea
              className="min-h-[120px]"
              onChange={(event) => setDraft(event.target.value)}
              placeholder="Descreva o significado funcional desta tabela."
              value={draft}
            />
            <p className="text-xs leading-5 text-muted">
              Esta descrição será salva no nível da tabela e usada como contexto na governança, no Explorer e no Dicionário de Dados.
            </p>
          </div>
        ) : null}

        {descriptionSource && descriptionManual && normalizeText(descriptionSource) !== normalizeText(descriptionManual) ? (
          <div className="rounded-2xl border border-border bg-surface px-4 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-600">Descrição de origem</p>
            <p className={cn("mt-2 text-sm leading-6 text-text-body", compact && "text-xs leading-5")}>{descriptionSource}</p>
          </div>
        ) : null}

        {notice ? <div className="rounded-2xl border border-success-200 bg-success-50 px-4 py-3 text-sm text-success-700">{notice}</div> : null}
        {error ? <div className="rounded-2xl border border-danger-200 bg-danger-50 px-4 py-3 text-sm text-danger-700">{error}</div> : null}
      </CardContent>
    </Card>
  );
}
