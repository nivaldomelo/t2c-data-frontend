import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ATTENTION_ICONS, AttentionCard, formatPercent, formatValue, MiniBarList, ProgressRow, SectionTitle, TableList } from "@/features/dashboard/components/shared";
import type { DashboardSummary } from "@/features/dashboard/types";

type DashboardCoverageAttentionSectionProps = {
  summary: DashboardSummary;
};

export function DashboardCoverageAttentionSection({ summary }: DashboardCoverageAttentionSectionProps) {
  const sourceDistribution = summary.sources.distribution.items;

  return (
    <>
      <div className="grid gap-4 xl:grid-cols-[1fr_1fr_1fr]">
        <Card className="border-border/80 bg-surface shadow-card">
          <CardHeader>
            <SectionTitle
              eyebrow="Fontes"
              title="Distribuição por tecnologia"
              description="Onde estão os ativos e quais engines concentram maior volume do catálogo."
            />
          </CardHeader>
          <CardContent>
            <MiniBarList engineIcons items={summary.sources.by_engine} />
          </CardContent>
        </Card>

        <Card className="border-border/80 bg-surface shadow-card">
          <CardHeader>
            <SectionTitle
              eyebrow="Fontes de dados"
              title="Fontes com maior volume"
              description="Ranking das fontes com mais ativos navegáveis hoje no sistema."
            />
          </CardHeader>
          <CardContent>
            <MiniBarList items={summary.sources.by_datasource} />
          </CardContent>
        </Card>

        <Card className="border-border/80 bg-surface shadow-card">
          <CardHeader>
            <SectionTitle
              eyebrow="Cobertura"
              title="Menor cobertura de governança"
              description="Fontes que precisam de foco para responsável, tags, termos e dicionário."
            />
          </CardHeader>
          <CardContent className="space-y-3">
            {!summary.sources.lowest_governance.length ? (
              <p className="text-sm text-muted">Sem dados suficientes para ranquear as fontes.</p>
            ) : (
              summary.sources.lowest_governance.map((item) => (
                <div key={item.key} className="rounded-2xl border border-border/80 bg-bg-subtle/80 px-4 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="truncate text-sm font-medium text-text">{item.label}</p>
                    <span className="text-sm font-semibold text-text">{formatPercent(item.value)}</span>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/80 bg-surface shadow-card">
        <CardHeader>
          <SectionTitle
            eyebrow="Fontes"
            title="Distribuição por fonte"
            description="Inclui todas as fontes monitoradas, inclusive as que ainda não têm tabelas inventariadas."
          />
        </CardHeader>
        <CardContent>
          {!sourceDistribution.length ? (
            <p className="text-sm text-muted">Sem fontes cadastradas para detalhar a distribuição.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full border-separate border-spacing-0 text-sm">
                <thead>
                  <tr className="text-left text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">
                    <th className="border-b border-border px-4 py-3">Fonte</th>
                    <th className="border-b border-border px-4 py-3">Schemas</th>
                    <th className="border-b border-border px-4 py-3">Tabelas</th>
                    <th className="border-b border-border px-4 py-3">Atendidas</th>
                    <th className="border-b border-border px-4 py-3">Certificadas</th>
                    <th className="border-b border-border px-4 py-3">Pendentes</th>
                    <th className="border-b border-border px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {sourceDistribution.map((item) => (
                    <tr className="align-top hover:bg-bg-subtle/70" key={item.datasource_id}>
                      <td className="border-b border-border px-4 py-4">
                        <div className="min-w-0">
                          <p className="truncate font-medium text-text">{item.datasource_name}</p>
                          <p className="mt-1 text-xs text-muted">
                            {item.engine_label}
                            {item.database_name ? ` · ${item.database_name}` : ""}
                            {!item.is_active ? " · inativa" : ""}
                          </p>
                        </div>
                      </td>
                      <td className="border-b border-border px-4 py-4 font-medium text-text">{formatValue(item.schema_count)}</td>
                      <td className="border-b border-border px-4 py-4 font-medium text-text">{formatValue(item.table_count)}</td>
                      <td className="border-b border-border px-4 py-4 font-medium text-text">{formatValue(item.served_tables)}</td>
                      <td className="border-b border-border px-4 py-4 font-medium text-text">{formatValue(item.certified_tables)}</td>
                      <td className="border-b border-border px-4 py-4 font-medium text-text">{formatValue(item.pending_tables)}</td>
                      <td className="border-b border-border px-4 py-4">
                        <Badge tone={item.status_tone as "neutral" | "accent" | "success" | "warning" | "danger"}>{item.status_label}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div className="mt-4 flex flex-wrap gap-2 text-xs text-muted">
            <span>{formatValue(summary.sources.distribution.total_sources)} fontes monitoradas</span>
            <span>·</span>
            <span>{formatValue(summary.sources.distribution.total_schemas)} schemas distintos</span>
            <span>·</span>
            <span>{formatValue(summary.sources.distribution.total_tables)} tabelas catalogadas</span>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card className="border-border/80 bg-surface shadow-card">
          <CardHeader>
            <SectionTitle
              eyebrow="Documentação"
              title="Cobertura de documentação e semântica"
              description="Nível de descrição, dicionário, tags e termos associados para manter o catálogo realmente útil."
            />
          </CardHeader>
          <CardContent className="space-y-4">
            {summary.documentation.coverage.map((item) => (
              <ProgressRow item={item} key={item.key} />
            ))}
            <div className="rounded-2xl border border-warning-200 bg-warning-50/80 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-warning-700">Gap de documentação</p>
              <p className="mt-3 text-3xl font-semibold tracking-tight text-text">{summary.documentation.undocumented_tables}</p>
              <p className="mt-1 text-sm text-text-body">Ativos ainda sem descrição mínima na tabela.</p>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-4">
          <TableList
            title="Ativos mais completos"
            subtitle="Melhores combinações de descrição, dicionário, tags e termos para servir de referência interna."
            items={summary.documentation.most_complete}
            empty="Ainda não há ativos bem documentados o suficiente para destacar."
          />
          <TableList
            title="Ativos com menor cobertura"
            subtitle="Onde a semântica está mais fraca e o catálogo ainda não entrega contexto suficiente."
            items={summary.documentation.least_complete}
            empty="Não há lacunas relevantes para destacar agora."
          />
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold tracking-tight text-text">Filas de atenção priorizadas</h3>
          <p className="mt-1 text-sm text-text-body">Uma visão prática do backlog mais importante para governança, confiabilidade e operação.</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <AttentionCard title="DQ score crítico" items={summary.attention.low_dq} icon={ATTENTION_ICONS.low_dq} helper="Ativos com score abaixo do mínimo esperado." />
          <AttentionCard title="Sem responsável" items={summary.attention.no_owner} icon={ATTENTION_ICONS.no_owner} helper="Responsabilidade indefinida para ativos que já estão no catálogo." />
          <AttentionCard title="Sem dicionário" items={summary.attention.no_dictionary} icon={ATTENTION_ICONS.no_dictionary} helper="Campos ainda sem descrição suficiente para consumo seguro." />
          <AttentionCard title="Elegíveis não certificados" items={summary.attention.eligible_not_certified} icon={ATTENTION_ICONS.eligible_not_certified} helper="Ativos prontos para decisão de certificação." />
          <AttentionCard title="Incidente crítico aberto" items={summary.attention.critical_incidents} icon={ATTENTION_ICONS.critical_incidents} helper="Ativos com severidade máxima exigindo resposta rápida." />
          <AttentionCard title="Reprovadas" items={summary.attention.rejected} icon={ATTENTION_ICONS.rejected} helper="Ativos reprovados que seguem precisando de plano de ação." />
          <AttentionCard title="Restritas / sensíveis" items={summary.attention.restricted} icon={ATTENTION_ICONS.restricted} helper="Ativos marcados como sensíveis para olhar com mais rigor." />
        </div>
      </div>
    </>
  );
}
