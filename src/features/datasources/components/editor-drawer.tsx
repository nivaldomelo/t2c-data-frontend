import { CheckCircle2, CircleAlert, Eye, Loader2 } from "lucide-react";

import { DatabaseTechLogo } from "@/components/database-tech-logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  DATASOURCE_GROUP_META,
  DATASOURCE_OPTIONS_BY_GROUP,
  type DataSourceField,
  type DataSourceTypeId,
  getDataSourceOption,
} from "@/lib/datasource-types";
import { useModalDismiss } from "@/lib/use-modal-dismiss";

function TypeCard({
  selected,
  onClick,
  title,
  subtitle,
  icon,
  helperText,
  enabled,
}: {
  selected: boolean;
  onClick: () => void;
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  helperText?: string;
  enabled: boolean;
}) {
  return (
    <button
      aria-pressed={selected}
      className={[
        "group w-full rounded-2xl border p-4 text-left transition-all duration-200 ease-out",
        enabled ? "cursor-pointer" : "cursor-not-allowed opacity-80",
        selected
          ? "border-brand-300 bg-brand-50/80 shadow-sm ring-1 ring-brand-100"
          : "border-border/80 bg-surface hover:border-border-strong hover:shadow-sm",
      ].join(" ")}
      onClick={onClick}
      type="button"
    >
          <div className="flex items-start justify-between gap-3">
        {icon}
        <div className="flex items-center gap-2">
          {helperText ? (
            <span className="rounded-full bg-bg-subtle px-2.5 py-1 text-[11px] font-medium text-muted">{helperText}</span>
          ) : null}
          {selected ? <span className="rounded-full bg-brand-100 px-2.5 py-1 text-[11px] font-medium text-brand-700">Selecionado</span> : null}
        </div>
      </div>
      <div className="mt-4 space-y-1">
        <div className="text-sm font-semibold text-text">{title}</div>
        <div className="text-sm leading-5 text-text-body">{subtitle}</div>
      </div>
    </button>
  );
}

type DatasourceEditorDrawerProps = {
  open: boolean;
  formMode: "create" | "edit";
  step: "type" | "form";
  isLoadingDetail: boolean;
  isSaving: boolean;
  isDeleting: boolean;
  selectedTypeId: DataSourceTypeId;
  selectedTypeIsSupported: boolean;
  selectedOption: ReturnType<typeof getDataSourceOption>;
  name: string;
  includeSchemasText: string;
  excludeSchemasText: string;
  includedSchemas: string[];
  excludedSchemas: string[];
  isActive: boolean;
  formError: string;
  testState: "idle" | "loading" | "done";
  testMessage: string;
  availableSchemas: string[];
  schemaFallbackSuggestion: string;
  onClose: () => void;
  onStepChange: (step: "type" | "form") => void;
  onTypeSelect: (type: DataSourceTypeId) => void;
  onNameChange: (value: string) => void;
  onIncludeSchemasChange: (value: string) => void;
  onExcludeSchemasChange: (value: string) => void;
  onToggleIncludedSchema: (schema: string, checked: boolean) => void;
  onToggleExcludedSchema: (schema: string, checked: boolean) => void;
  onSelectAllSchemas: () => void;
  onClearSchemaSelection: () => void;
  onUseDefaultSchemaFallback: () => void;
  onIsActiveChange: (value: boolean) => void;
  onTestConnection: () => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  renderField: (field: DataSourceField, section: "connection" | "secret") => React.ReactNode;
};

export function DatasourceEditorDrawer({
  open,
  formMode,
  step,
  isLoadingDetail,
  isSaving,
  isDeleting,
  selectedTypeId,
  selectedTypeIsSupported,
  selectedOption,
  name,
  includeSchemasText,
  excludeSchemasText,
  includedSchemas,
  excludedSchemas,
  isActive,
  formError,
  testState,
  testMessage,
  availableSchemas,
  schemaFallbackSuggestion,
  onClose,
  onStepChange,
  onTypeSelect,
  onNameChange,
  onIncludeSchemasChange,
  onExcludeSchemasChange,
  onToggleIncludedSchema,
  onToggleExcludedSchema,
  onSelectAllSchemas,
  onClearSchemaSelection,
  onUseDefaultSchemaFallback,
  onIsActiveChange,
  onTestConnection,
  onSubmit,
  renderField,
}: DatasourceEditorDrawerProps) {
  useModalDismiss({ open, onClose });
  if (!open) return null;
  const missingIncludedSchemas = includedSchemas.filter((schema) => !availableSchemas.includes(schema));
  const missingExcludedSchemas = excludedSchemas.filter((schema) => !availableSchemas.includes(schema));
  const cataloguedSchemas = includedSchemas.filter((schema) => !excludedSchemas.includes(schema));

  return (
    <div
      aria-modal="true"
      className="fixed inset-0 z-50 bg-slate-950/45 p-3 backdrop-blur-md"
      role="dialog"
    >
      <div className="ml-auto h-full w-full max-w-[56rem] overflow-y-auto rounded-[28px] border border-border/80 bg-surface shadow-card">
        <div className="flex items-center justify-between border-b border-border/70 bg-[linear-gradient(135deg,#ffffff_0%,#f8fafc_58%,#eef6ff_100%)] px-6 py-5">
          <div>
            <h3 className="text-lg font-semibold tracking-[-0.01em] text-text">{formMode === "edit" ? "Editar fonte de dados" : "Nova fonte de dados"}</h3>
            <p className="text-xs text-muted">
              {formMode === "edit" ? "Atualize os dados de conexão e catalogação" : `Etapa ${step === "type" ? "1" : "2"} de 2`}
            </p>
          </div>
          <Button onClick={onClose} variant="ghost">
            Fechar
          </Button>
        </div>

        <div className="space-y-6 p-6">
          {step === "type" && formMode === "create" ? (
            <div className="space-y-6">
              <div className="rounded-3xl border border-border/80 bg-bg-subtle/80 p-5 shadow-sm">
                <div className="max-w-2xl space-y-2">
                  <p className="text-sm font-medium text-text">Escolha a tecnologia da fonte</p>
                  <p className="text-sm leading-6 text-text-body">
                    Os conectores abaixo já podem ser cadastrados, testados e preparados para descoberta de metadados. As opções priorizadas aparecem primeiro para acelerar o fluxo operacional.
                  </p>
                </div>
              </div>

              <div className="space-y-6">
                {(["primary", "more"] as const).map((groupKey) => {
                  const group = DATASOURCE_GROUP_META[groupKey];
                  const options = DATASOURCE_OPTIONS_BY_GROUP[groupKey];
                  return (
                    <section className="space-y-3" key={groupKey}>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-semibold text-text">{group.title}</h4>
                        {groupKey === "primary" ? <span className="rounded-full bg-brand-50 px-2.5 py-1 text-[11px] font-medium text-brand-800">Prioridade</span> : null}
                        </div>
                        <p className="text-sm text-muted">{group.description}</p>
                      </div>
                      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                        {options.map((option) => (
                          <TypeCard
                            enabled={option.enabled}
                            helperText={option.helperText}
                            icon={<DatabaseTechLogo engine={option.id} variant="card" />}
                            key={option.id}
                            onClick={() => onTypeSelect(option.id)}
                            selected={selectedTypeId === option.id}
                            subtitle={option.description}
                            title={option.label}
                          />
                        ))}
                      </div>
                    </section>
                  );
                })}
              </div>

                  <div className="flex flex-col gap-3 rounded-2xl border border-border/80 bg-surface p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-1">
                  <div className="text-sm font-medium text-text">{selectedOption?.label ?? "Selecione uma fonte"}</div>
                  <div className="text-sm text-muted">
                    {selectedTypeIsSupported
                      ? "Este conector já está habilitado no backend atual com teste real de conexão."
                      : "Este slot continua reservado para expansão futura do catálogo."}
                  </div>
                </div>
                <Button disabled={!selectedTypeIsSupported} onClick={() => onStepChange("form")}>
                  Continuar
                </Button>
              </div>
            </div>
          ) : (
            <form className="space-y-5" onSubmit={onSubmit}>
              {isLoadingDetail ? (
                <div className="flex min-h-[240px] items-center justify-center">
                  <Loader2 className="h-6 w-6 animate-spin text-muted" />
                </div>
              ) : (
                <>
                  <div className="rounded-2xl border border-border/80 bg-bg-subtle/80 p-4 shadow-sm">
                    <div className="flex items-start gap-3">
                      <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-border/80 bg-surface text-text-body">
                        <DatabaseTechLogo engine={selectedTypeId} variant="card" />
                      </span>
                      <div className="space-y-1">
                        <div className="text-sm font-semibold text-text">{selectedOption?.label ?? selectedTypeId}</div>
                        <div className="text-sm text-muted">{selectedOption?.description ?? "Configure os dados de conexão desta fonte de dados."}</div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium" htmlFor="ds-name">Nome da fonte de dados</label>
                    <Input id="ds-name" onChange={(e) => onNameChange(e.target.value)} placeholder="analytics_pg" required value={name} />
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium">Tipo</label>
                    <Input disabled value={selectedOption?.label ?? selectedTypeId} />
                    <p className="mt-1 text-xs text-muted">
                      {formMode === "create" ? "Altere voltando para a etapa 1." : "O tipo pode ser alterado criando uma nova fonte de dados."}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    {selectedOption?.connectionFields.map((field) => renderField(field, "connection"))}
                  </div>

                  {selectedOption?.secretFields.length ? (
                    <div className="space-y-3 rounded-2xl border border-border/80 bg-surface p-4 shadow-sm">
                      <div>
                        <h4 className="text-sm font-semibold text-text">Credenciais</h4>
                        <p className="text-xs text-muted">Os segredos são enviados apenas para teste ou atualização e não retornam crus para a interface.</p>
                      </div>
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        {selectedOption.secretFields.map((field) => renderField(field, "secret"))}
                      </div>
                    </div>
                  ) : null}

                  {selectedTypeId === "postgres" ? (
                    <div className="space-y-4 rounded-2xl border border-border/80 bg-bg-subtle/70 p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="space-y-1">
                          <h4 className="text-sm font-semibold text-text">Schemas detectados</h4>
                          <p className="text-xs text-muted">
                            Selecione quais schemas entram no scan. A exclusão sempre prevalece sobre a inclusão.
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Button onClick={onSelectAllSchemas} size="sm" type="button" variant="outline">
                            Selecionar todos
                          </Button>
                          <Button onClick={onClearSchemaSelection} size="sm" type="button" variant="ghost">
                            Limpar seleção
                          </Button>
                        </div>
                      </div>

                      <div className="grid gap-3 md:grid-cols-2">
                        {availableSchemas.length ? (
                          availableSchemas.map((schemaName) => {
                            const included = includedSchemas.includes(schemaName);
                            const excluded = excludedSchemas.includes(schemaName);
                            return (
                              <div
                                className={[
                                  "rounded-2xl border px-4 py-3 shadow-sm",
                                  excluded ? "border-danger-200 bg-danger-50/70" : included ? "border-success-200 bg-success-50/70" : "border-border/80 bg-surface",
                                ].join(" ")}
                                key={schemaName}
                              >
                                <div className="flex items-start justify-between gap-3">
                                  <div className="space-y-1">
                                    <div className="flex flex-wrap items-center gap-2">
                                      <p className="text-sm font-medium text-text">{schemaName}</p>
                                      <span className="rounded-full bg-bg-subtle px-2.5 py-1 text-[11px] font-medium text-muted">detectado</span>
                                      {included ? <span className="rounded-full bg-success-100 px-2.5 py-1 text-[11px] font-medium text-success-700">incluído</span> : null}
                                      {excluded ? <span className="rounded-full bg-danger-100 px-2.5 py-1 text-[11px] font-medium text-danger-700">excluído</span> : null}
                                    </div>
                                    <p className="text-xs text-muted">
                                      {excluded
                                        ? "Este schema não será catalogado."
                                        : included
                                          ? "Este schema entrará no scan."
                                          : "Schema detectado, mas não incluído no scan."}
                                    </p>
                                  </div>
                                  <div className="flex flex-col items-end gap-2">
                                    <label className="flex items-center gap-2 text-xs text-text-body">
                                      <input checked={included} onChange={(e) => onToggleIncludedSchema(schemaName, e.target.checked)} type="checkbox" />
                                      Incluir
                                    </label>
                                    <label className="flex items-center gap-2 text-xs text-text-body">
                                      <input checked={excluded} onChange={(e) => onToggleExcludedSchema(schemaName, e.target.checked)} type="checkbox" />
                                      Excluir
                                    </label>
                                  </div>
                                </div>
                              </div>
                            );
                          })
                        ) : (
                          <div className="rounded-2xl border border-dashed border-border-strong bg-surface px-4 py-5 text-sm text-muted md:col-span-2">
                            {schemaFallbackSuggestion ? (
                              <div className="space-y-3">
                                <p>
                                  Nenhum schema foi detectado automaticamente. Você pode usar o schema padrão informado, se ele estiver correto para esta fonte.
                                </p>
                                <div className="flex flex-wrap gap-2">
                                  <Button onClick={onUseDefaultSchemaFallback} size="sm" type="button" variant="outline">
                                    Usar schema padrão: {schemaFallbackSuggestion}
                                  </Button>
                                  <Button onClick={onTestConnection} size="sm" type="button" variant="ghost">
                                    Retestar conexão
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              <div className="space-y-3">
                                <p>
                                  Nenhum schema detectado ainda. Clique em <span className="font-medium text-text-body">Retestar conexão</span> para carregar a lista.
                                </p>
                                <Button onClick={onTestConnection} size="sm" type="button" variant="outline">
                                  Retestar conexão
                                </Button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="rounded-2xl border border-border/80 bg-surface px-4 py-3">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <p className="text-sm font-medium text-text">Resumo do scan</p>
                            <p className="text-xs text-muted">
                              {includedSchemas.length > 0
                                ? `${cataloguedSchemas.length} schemas serão catalogados`
                                : schemaFallbackSuggestion
                                  ? "Nenhum schema foi selecionado ainda. Você pode usar o schema padrão informado."
                                  : "Selecione ao menos um schema para catalogação."}
                            </p>
                          </div>
                          <div className="flex flex-wrap gap-2 text-xs text-muted">
                            <span className="rounded-full bg-bg-subtle px-2.5 py-1">Detectados: {availableSchemas.length}</span>
                            <span className="rounded-full bg-success-100 px-2.5 py-1 text-success-700">Incluídos: {includedSchemas.length}</span>
                            <span className="rounded-full bg-danger-100 px-2.5 py-1 text-danger-700">Excluídos: {excludedSchemas.length}</span>
                          </div>
                        </div>
                      </div>

                      {missingIncludedSchemas.length || missingExcludedSchemas.length ? (
                        <div className="rounded-2xl border border-warning-200 bg-warning-50/70 px-4 py-3">
                          <p className="text-sm font-medium text-warning-700">Schemas salvos indisponíveis</p>
                          <p className="mt-1 text-xs text-warning-700">
                            Alguns schemas salvos não aparecem mais na conexão atual. Eles ficam marcados como indisponíveis até a próxima validação.
                          </p>
                          <div className="mt-3 flex flex-wrap gap-2">
                            {missingIncludedSchemas.map((schemaName) => (
                              <span className="rounded-full bg-surface px-3 py-1 text-xs font-medium text-warning-700" key={`missing-included-${schemaName}`}>
                                {schemaName} (incluído, indisponível)
                              </span>
                            ))}
                            {missingExcludedSchemas.map((schemaName) => (
                              <span className="rounded-full bg-surface px-3 py-1 text-xs font-medium text-warning-700" key={`missing-excluded-${schemaName}`}>
                                {schemaName} (excluído, indisponível)
                              </span>
                            ))}
                          </div>
                        </div>
                      ) : null}
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div>
                        <label className="mb-1 block text-sm font-medium" htmlFor="include-schemas">Schemas incluídos</label>
                        <Input
                          id="include-schemas"
                          onChange={(e) => onIncludeSchemasChange(e.target.value)}
                          placeholder="gold, silver, public"
                          value={includeSchemasText}
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-sm font-medium" htmlFor="exclude-schemas">Schemas excluídos</label>
                        <Input
                          id="exclude-schemas"
                          onChange={(e) => onExcludeSchemasChange(e.target.value)}
                          placeholder="tmp, backup"
                          value={excludeSchemasText}
                        />
                      </div>
                    </div>
                  )}

                  <label className="flex items-center gap-2 text-sm">
                    <input checked={isActive} onChange={(e) => onIsActiveChange(e.target.checked)} type="checkbox" />
                    <span>Fonte de dados ativa</span>
                  </label>

                  <div className="flex items-center gap-2">
                    <Button onClick={() => void onTestConnection()} type="button" variant="outline">
                      {testState === "loading" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Eye className="mr-2 h-4 w-4" />}
                      {formMode === "edit" ? "Retestar conexão" : "Testar conexão"}
                    </Button>
                    {formMode === "create" ? (
                      <Button onClick={() => onStepChange("type")} type="button" variant="ghost">Voltar</Button>
                    ) : null}
                  </div>

                  {formError ? (
                  <p className="flex items-center gap-1 text-sm text-danger-600"><CircleAlert className="h-4 w-4" /> {formError}</p>
                  ) : null}
                  {testMessage ? (
                    <p className="flex items-start gap-1 text-sm text-text-body">
                      {testMessage.toLowerCase().includes("sucesso") || testMessage.toLowerCase().includes("success") ? (
                        <CheckCircle2 className="h-4 w-4 text-success-600" />
                      ) : (
                        <CircleAlert className="h-4 w-4 text-warning-600" />
                      )}
                      <span>{testMessage}</span>
                    </p>
                  ) : null}

                  {availableSchemas.length > 0 ? (
                    <div className="rounded-2xl border border-border/80 bg-bg-subtle/70 p-3">
                      <div className="flex items-center justify-between gap-3">
                        <h4 className="text-sm font-medium">
                          {selectedTypeId === "mongodb" ? "Databases detectados" : "Schemas detectados"}
                        </h4>
                        <span className="text-xs text-muted">{availableSchemas.length} encontrados</span>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-2">
                          {availableSchemas.map((schemaName) => (
                            <span className="rounded-full border border-border/80 bg-bg-subtle/80 px-3 py-1 text-xs text-text-body" key={schemaName}>
                              {schemaName}
                            </span>
                          ))}
                      </div>
                    </div>
                  ) : null}

                  <Button disabled={isSaving || isDeleting} type="submit">
                    {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    {formMode === "edit" ? "Salvar alterações" : "Salvar fonte de dados"}
                  </Button>
                </>
              )}
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
