import { useAuth } from "@/lib/auth";

const links = [
  ["Resumo", "/"],
  ["Explorer", "/explorer"],
  ["Fontes de dados", "/datasources"],
  ["Busca", "/search"],
  ["Tags", "/tags"],
  ["Glossário", "/glossary"],
  ["Linhagem", "/lineage"],
  ["Auditoria", "/audit"],
] as const;

export function Header() {
  const auth = useAuth();

  function logout(): void {
    void auth.logout();
  }

  return (
    <header className="border-b bg-surface">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-3 p-4 text-sm">
        <strong className="mr-2 text-base">T2C Data</strong>
        {links.map(([label, href]) => (
          <a className="text-text-body hover:text-orange-600" href={href} key={href}>
            {label}
          </a>
        ))}
        <button
          className="ml-auto rounded border border-border-strong px-2 py-1 text-text-body hover:bg-bg-subtle"
          onClick={logout}
          type="button"
        >
          Sair
        </button>
      </div>
    </header>
  );
}
