/* Shims de compatibilidade Next.js -> React Router, para o porte do SPA.
   Mantém a API que o código do app já usa (<Link href>, useRouter().push, usePathname,
   useSearchParams retornando URLSearchParams, useParams) sobre o react-router-dom. */
import { forwardRef, lazy, Suspense, type ComponentType } from "react";
import {
  Link as RRLink,
  useLocation,
  useNavigate,
  useParams as useRRParams,
  useSearchParams as useRRSearchParams,
} from "react-router-dom";

type AnyProps = Record<string, unknown>;

export const Link = forwardRef<HTMLAnchorElement, { href: string } & AnyProps>(function Link(
  { href, prefetch: _prefetch, ...rest },
  ref,
) {
  return <RRLink ref={ref} to={href} {...(rest as AnyProps)} />;
});

export function Image({ src, alt, ...rest }: { src?: unknown; alt?: string } & AnyProps) {
  const source = typeof src === "string" ? src : "";
  return <img src={source} alt={alt ?? ""} {...(rest as AnyProps)} />;
}

export function useRouter() {
  const navigate = useNavigate();
  // 2º arg (ex.: { scroll: false }) do Next é aceito e ignorado.
  return {
    push: (url: string, _options?: unknown) => navigate(url),
    replace: (url: string, _options?: unknown) => navigate(url, { replace: true }),
    back: () => navigate(-1),
    forward: () => navigate(1),
    refresh: () => {},
    prefetch: (_url?: string) => {},
  };
}

export function usePathname(): string {
  return useLocation().pathname;
}

export type ReadonlyURLSearchParams = URLSearchParams;

export function useSearchParams(): URLSearchParams {
  const [params] = useRRSearchParams();
  return params;
}

export function useParams<T extends Record<string, string | string[] | undefined> = Record<string, string>>(): T {
  return useRRParams() as unknown as T;
}

// next/dynamic -> React.lazy + Suspense. Normaliza loaders que retornam o componente
// diretamente (padrão comum no app: () => import(...).then(m => m.X)).
export function dynamic<P = AnyProps>(
  loader: () => Promise<ComponentType<P> | { default: ComponentType<P> }>,
  options?: { loading?: ComponentType; ssr?: boolean },
): ComponentType<P> {
  const Lazy = lazy(async () => {
    const mod = await loader();
    return "default" in (mod as { default?: ComponentType<P> })
      ? (mod as { default: ComponentType<P> })
      : { default: mod as ComponentType<P> };
  });
  const Loading = options?.loading;
  return function DynamicComponent(props: P) {
    const LazyAny = Lazy as unknown as ComponentType<AnyProps>;
    return (
      <Suspense fallback={Loading ? <Loading /> : null}>
        <LazyAny {...(props as AnyProps)} />
      </Suspense>
    );
  };
}
