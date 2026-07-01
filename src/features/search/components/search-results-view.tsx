import { Link } from "@/lib/next-shims";
import { Filter, Loader2, Search as SearchIcon, Sparkles } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { ContextualJourneyCard } from "@/components/navigation/contextual-journey-card";
import { TagBadgeList } from "@/components/tags/tag-badges";
import { apiRequest } from "@/lib/client-api";
import { cn } from "@/lib/cn";
import { slugifyText } from "@/lib/slugify";
import { GlobalSearchBox } from "@/features/search/components/global-search-box";
import type { SearchAppliedFilters, SearchAvailableFilters, SearchResultItem, SearchResultsResponse } from "@/features/search/types";

type Props = {
  draftQuery: string;
  onDraftQueryChange: (value: string) => void;
  onSearch: (value: string) => void;
  payload: SearchResultsResponse | null;
  loading: boolean;
  error: string;
  filters: SearchAppliedFilters;
  onFilterChange: (key: keyof SearchAppliedFilters, value: string) => void;
  onClearFilters: () => void;
};

function normalize(text: string) {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function highlightText(text: string | null | undefined, query: string): React.ReactNode {
  if (!text) return null;
  const safeQuery = query.trim();
  if (safeQuery.length < 2) return text;
  const normalizedText = normalize(text);
  const normalizedQuery = normalize(safeQuery);
  const index = normalizedText.indexOf(normalizedQuery);
  if (index < 0) return text;
  const end = index + safeQuery.length;
  return (
    <>
      {text.slice(0, index)}
      <mark className="rounded bg-brand-100 px-0.5 text-text">{text.slice(index, end)}</mark>
      {text.slice(end)}
    </>
  );
}

function badgeTone(tone: string): "neutral" | "accent" | "success" | "warning" {
  if (tone === "success") return "success";
  if (tone === "accent") return "accent";
  if (tone === "warning" || tone === "danger") return "warning";
  return "neutral";
}

function certificationTone(status?: string | null): "neutral" | "accent" | "success" | "warning" {
  if (status === "certified") return "success";
  if (status === "eligible") return "accent";
  if (status === "revalidation_pending") return "warning";
  return "neutral";
}

function ResultCard({ item, query }: { item: SearchResultItem; query: string }) {
  const incidentsUrl = item.metadata.incidents_target_url;
  const dqUrl = item.metadata.dq_target_url;
  return (
    <div className="rounded-3xl border border-border/80 bg-surface p-5 shadow-card transition-all duration-200 ease-out hover:-translate-y-0.5 hover:border-border-strong hover:shadow-lg">
      <Link
        className="block"
        href={item.target_url}
        onClick={() => {
          void apiRequest("/v1/search/track-click", {
            method: "POST",
            body: JSON.stringify({
              entity_type: item.entity_type,
              entity_id: item.entity_id,
              query,
              target_url: item.target_url,
            }),
          }).catch(() => undefined);
        }}
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="neutral">{item.category}</Badge>
              <Badge tone="accent">{item.match_reason}</Badge>
              {item.badges.slice(0, 2).map((badge) => (
                <Badge key={`${item.entity_type}-${item.entity_id}-${badge.label}`} tone={badgeTone(badge.tone)}>{badge.label}</Badge>
              ))}
              {item.metadata.governance_score != null ? (
                <Badge tone={badgeTone(item.metadata.governance_tone || "neutral")}>
                  Governança {item.metadata.governance_score} pts
                </Badge>
              ) : null}
              {item.metadata.certification_status ? (
                <Badge tone={certificationTone(item.metadata.certification_status)}>
                  {item.metadata.certification_status === "certified"
                    ? "Certificada"
                    : item.metadata.certification_status === "eligible"
                      ? "Elegível"
                      : item.metadata.certification_status === "revalidation_pending"
                        ? "Pendente de revalidação"
                        : item.metadata.certification_status}
                </Badge>
              ) : null}
              {item.metadata.readiness_score != null ? (
                <Badge tone={item.metadata.readiness_score >= 80 ? "success" : item.metadata.readiness_score >= 50 ? "accent" : "neutral"}>
                  Prontidão {item.metadata.readiness_score}%
                </Badge>
              ) : null}
              {item.metadata.active_dq_violation ? <Badge tone="warning">DQ ativa</Badge> : null}
            </div>
            <h3 className="mt-3 text-lg font-semibold text-text">{highlightText(item.title, query)}</h3>
            {item.subtitle ? <p className="mt-1 text-sm text-text-body">{highlightText(item.subtitle, query)}</p> : null}
            {item.description ? <p className="mt-3 line-clamp-2 text-sm leading-6 text-text-body">{highlightText(item.description, query)}</p> : null}
            {item.context_path ? <p className="mt-3 text-xs text-muted">{highlightText(item.context_path, query)}</p> : null}
            {item.metadata.tags?.length ? <TagBadgeList className="mt-3" maxVisible={3} tags={item.metadata.tags} /> : null}
            <div className="mt-4 flex flex-wrap gap-2">
              <Badge tone="neutral">{item.metadata.popularity_count || 0} clique(s)</Badge>
              {item.metadata.alias_count ? <Badge tone="accent">{item.metadata.alias_count} alias(es)</Badge> : null}
              {item.metadata.owner_defined ? <Badge tone="success">Owner definido</Badge> : null}
              {item.metadata.description_complete ? <Badge tone="accent">Descrição completa</Badge> : null}
            </div>
          </div>
          <div className="shrink-0 text-right">
            <p className="text-xs uppercase tracking-[0.16em] text-muted">Relevância</p>
            <p className="mt-1 text-xl font-semibold text-text">{item.relevance_score}</p>
          </div>
        </div>
      </Link>
      <div className="mt-4 flex flex-wrap gap-2 border-t border-border/60 pt-4">
        <Link className="rounded-full border border-border/80 bg-bg-subtle/80 px-3 py-1 text-xs font-medium text-text-body transition hover:border-border-strong hover:bg-surface" href={item.target_url}>
          Abrir detalhe
        </Link>
        {incidentsUrl ? (
          <Link className="rounded-full border border-warning-200 bg-warning-50 px-3 py-1 text-xs font-medium text-warning-700 transition hover:bg-surface" href={incidentsUrl}>
            Ver incidentes do ativo
          </Link>
        ) : null}
      {dqUrl ? (
          <Link className="rounded-full border border-brand-200 bg-brand-50 px-3 py-1 text-xs font-medium text-brand-700 transition hover:bg-surface" href={dqUrl}>
            Abrir Data Quality
          </Link>
        ) : null}
        {item.metadata.domain ? (
          <Link
            className="rounded-full border border-border bg-bg-subtle px-3 py-1 text-xs font-medium text-text-body transition hover:border-border-strong hover:bg-surface"
            href={`/governance/domains/${slugifyText(item.metadata.domain)}`}
          >
            Abrir domínio
          </Link>
        ) : null}
      </div>
    </div>
  );
}

function SearchPageSkeleton() {
  return (
    <div className="space-y-5">
      <Skeleton className="h-36 w-full" />
      <div className="grid gap-3 lg:grid-cols-4 md:grid-cols-2">
        {Array.from({ length: 8 }).map((_, index) => (
          <Skeleton className="h-24 w-full" key={index} />
        ))}
      </div>
      <Skeleton className="h-[420px] w-full" />
    </div>
  );
}

function FilterSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: Array<{ value: string; label: string }>;
  onChange: (value: string) => void;
}) {
  return (
    <label className="space-y-1.5 text-sm text-text-body">
      <span className="block text-xs font-semibold uppercase tracking-[0.16em] text-muted">{label}</span>
      <Select onChange={(event) => onChange(event.target.value)} value={value}>
        <option value="">Todos</option>
        {options.map((option) => (
          <option key={`${label}-${option.value}`} value={option.value}>
            {option.label}
          </option>
        ))}
      </Select>
    </label>
  );
}

export function SearchResultsView({
  draftQuery,
  onDraftQueryChange,
  onSearch,
  payload,
  loading,
  error,
  filters,
  onFilterChange,
  onClearFilters,
}: Props) {
  const minQueryLength = payload?.min_query_length ?? 2;
  const query = payload?.query ?? draftQuery;
  const availableFilters: SearchAvailableFilters = payload?.available_filters ?? {
    types: [],
    sources: [],
    databases: [],
    schemas: [],
          domains: [],
          owners: [],
          classifications: [],
          certification: [],
          incidents: [],
          governance_maturity: [],
        };
  const hasActiveFilters = Object.values(filters).some((value) => (value || "").trim() !== "");

  return (
    <div className="space-y-6 pb-6">
      <Card className="border-border/80 bg-[linear-gradient(135deg,#ffffff_0%,#f8fafc_55%,#eef6ff_100%)] shadow-card">
        <CardContent className="space-y-6 p-6">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-brand-200 bg-surface px-3 py-1 text-xs font-medium text-brand-700">
              <Sparkles className="h-3.5 w-3.5" />
              Busca inteligente
            </div>
            <div>
              <h2 className="text-3xl font-semibold tracking-tight text-text">A busca é a porta de entrada da plataforma</h2>
              <p className="mt-2 max-w-4xl text-sm leading-7 text-text-body">
                Pesquise tabelas, colunas, termos de glossário, tags, owners, classificações e fontes em uma experiência única, com relevância, contexto e atalhos rápidos.
              </p>
            </div>
          </div>

          <GlobalSearchBox
            autoFocus
            onSearch={onSearch}
            onValueChange={onDraftQueryChange}
            value={draftQuery}
          />
        </CardContent>
      </Card>

      <ContextualJourneyCard
        description="Use a busca como ponto de partida e siga para o módulo correto sem precisar memorizar a rota exata."
        links={[
          { description: "Abrir o detalhe técnico do ativo e navegar por abas, owners, tags e lineage.", href: "/explorer", label: "Explorer", tone: "accent" },
          { description: "Analisar risco, cobertura e prioridades executivas por domínio.", href: "/dashboard", label: "Dashboard executivo", tone: "neutral" },
          { description: "Revisar regras, profiling e sinais de qualidade antes de agir.", href: "/data-quality", label: "Data Quality", tone: "success" },
          { description: "Abrir a fila de tratamento de incidentes e trilhas de decisão.", href: "/incidents", label: "Incidentes", tone: "warning" },
          { description: "Entender dependências, upstream, downstream e impacto de mudança.", href: "/lineage", label: "Linhagem", tone: "accent" },
          { description: "Priorizar ingestão, cobertura operacional e exceções do fluxo.", href: "/ops/ingestion", label: "Operações", tone: "neutral" },
        ]}
        title="Jornada recomendada"
      />

      <Card className="border-border/80 bg-surface shadow-card">
        <CardContent className="space-y-5 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-600">Refino de busca</p>
              <h3 className="mt-1 text-lg font-semibold text-text">Filtros globais</h3>
              <p className="mt-1 text-sm text-text-body">Combine tipo, fonte, owner, classificação e status para afinar a relevância.</p>
            </div>
            <div className="flex items-center gap-2">
              <Badge tone="neutral">{payload?.total ?? 0} resultado(s)</Badge>
              {payload ? <Badge tone="accent">{payload.took_ms} ms</Badge> : null}
              <Button onClick={onClearFilters} type="button" variant="outline">Limpar filtros</Button>
            </div>
          </div>

          <div className="grid gap-3 lg:grid-cols-4 md:grid-cols-2">
            <FilterSelect label="Tipo" onChange={(value) => onFilterChange("result_type", value)} options={availableFilters.types} value={filters.result_type || ""} />
            <FilterSelect label="Fonte" onChange={(value) => onFilterChange("source", value)} options={availableFilters.sources} value={filters.source || ""} />
            <FilterSelect label="Banco" onChange={(value) => onFilterChange("database", value)} options={availableFilters.databases} value={filters.database || ""} />
            <FilterSelect label="Schema" onChange={(value) => onFilterChange("schema", value)} options={availableFilters.schemas} value={filters.schema || ""} />
            <FilterSelect label="Domínio" onChange={(value) => onFilterChange("domain", value)} options={availableFilters.domains} value={filters.domain || ""} />
            <FilterSelect label="Owner" onChange={(value) => onFilterChange("owner", value)} options={availableFilters.owners} value={filters.owner || ""} />
            <FilterSelect label="Classificação" onChange={(value) => onFilterChange("classification", value)} options={availableFilters.classifications} value={filters.classification || ""} />
            <FilterSelect label="Certificação" onChange={(value) => onFilterChange("certification", value)} options={availableFilters.certification} value={filters.certification || ""} />
            <FilterSelect label="Incidentes" onChange={(value) => onFilterChange("incidents", value)} options={availableFilters.incidents} value={filters.incidents || ""} />
            <FilterSelect label="Maturidade" onChange={(value) => onFilterChange("governance_maturity", value)} options={availableFilters.governance_maturity} value={filters.governance_maturity || ""} />
          </div>
        </CardContent>
      </Card>

      {loading ? <SearchPageSkeleton /> : null}

      {!loading && error ? (
        <Card className="border-danger-200 bg-danger-50">
          <CardContent className="flex items-center gap-3 p-5 text-sm text-danger-700">
            <Loader2 className="h-4 w-4" />
            {error}
          </CardContent>
        </Card>
      ) : null}

      {!loading && !error && draftQuery.trim().length < minQueryLength ? (
        <EmptyState
          title="Comece pela sua pergunta ou termo de negócio"
          description={`Digite pelo menos ${minQueryLength} caracteres para buscar por ativos, owners, termos, colunas, classificações e contexto relacionado.`}
        />
      ) : null}

      {!loading && !error && draftQuery.trim().length >= minQueryLength && payload && payload.total === 0 ? (
        <EmptyState
          title="Nenhum resultado encontrado para sua busca"
          description="Tente um termo mais amplo, remova filtros ou pesquise por nome técnico, termo de negócio, owner ou classificação."
        />
      ) : null}

      {!loading && !error && payload && payload.total > 0 ? (
        <div className="space-y-6">
          <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-5">
            <Card className="border-border/80 bg-surface shadow-card"><CardContent className="p-4"><p className="text-xs uppercase tracking-[0.16em] text-muted">Busca</p><p className="mt-2 text-lg font-semibold text-text">{query}</p><p className="mt-1 text-sm text-text-body">Consulta global atual</p></CardContent></Card>
            <Card className="border-border/80 bg-surface shadow-card"><CardContent className="p-4"><p className="text-xs uppercase tracking-[0.16em] text-muted">Resultados</p><p className="mt-2 text-2xl font-semibold text-text">{payload.total}</p><p className="mt-1 text-sm text-text-body">Itens ordenados por relevância</p></CardContent></Card>
            <Card className="border-border/80 bg-surface shadow-card"><CardContent className="p-4"><p className="text-xs uppercase tracking-[0.16em] text-muted">Grupos</p><p className="mt-2 text-2xl font-semibold text-text">{payload.groups.length}</p><p className="mt-1 text-sm text-text-body">Categorias ativas na resposta</p></CardContent></Card>
            <Card className="border-border/80 bg-surface shadow-card"><CardContent className="p-4"><p className="text-xs uppercase tracking-[0.16em] text-muted">Tempo</p><p className="mt-2 text-2xl font-semibold text-text">{payload.took_ms}ms</p><p className="mt-1 text-sm text-text-body">Tempo de resposta atual</p></CardContent></Card>
            <Card className="border-border/80 bg-surface shadow-card"><CardContent className="p-4"><p className="text-xs uppercase tracking-[0.16em] text-muted">Filtros</p><p className="mt-2 text-lg font-semibold text-text">{hasActiveFilters ? "Ativos" : "Sem filtros"}</p><p className="mt-1 text-sm text-text-body">Refino complementar à relevância</p></CardContent></Card>
          </div>

          {payload.groups.map((group) => (
            <Card className="border-border/80 bg-surface shadow-card" key={group.key}>
              <CardContent className="space-y-4 p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-600">Grupo de resultado</p>
                    <h3 className="mt-1 text-lg font-semibold text-text">{group.label}</h3>
                    <p className="mt-1 text-sm text-text-body">{group.total} item(ns) ordenados por relevância.</p>
                  </div>
                  <Badge tone="neutral">{group.total}</Badge>
                </div>
                <div className="grid gap-4 xl:grid-cols-2">
                  {group.items.map((item) => (
                    <ResultCard item={item} key={`${item.entity_type}-${item.entity_id}`} query={query} />
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : null}
    </div>
  );
}
