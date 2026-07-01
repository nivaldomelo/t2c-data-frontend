# UI Components (Clean Light Theme)

Base visual tokens are stored in `/Users/nivasmelo/Documents/projetos/catalogo/frontend/design-system`.
This app now consumes:

- Tailwind preset: `/Users/nivasmelo/Documents/projetos/catalogo/frontend/design-system/tailwind-preset/index.ts`
- Theme CSS variables: `/Users/nivasmelo/Documents/projetos/catalogo/frontend/design-system/styles/theme.css`

Base components live in `/Users/nivasmelo/Documents/projetos/catalogo/frontend/src/components/ui`.

## Button

```tsx
import { Button } from "@/components/ui/button";

<Button>Salvar</Button>
<Button variant="outline">Cancelar</Button>
<Button variant="ghost">Voltar</Button>
<Button variant="danger">Excluir</Button>
```

- `default`: CTA de confiança com gradiente em azul profundo / teal executivo
- `outline`: branco com borda cinza fria e hover suave
- `ghost`: texto discreto com hover sutil

## Card

```tsx
import { Card, CardHeader, CardContent } from "@/components/ui/card";

<Card>
  <CardHeader>Título</CardHeader>
  <CardContent>Conteúdo</CardContent>
</Card>
```

- Borda suave (`border-border`)
- Sombra moderada (`shadow-card`)
- Espaçamento generoso para leitura executiva

## Input / Select / Textarea

```tsx
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

<Input placeholder="Pesquisar..." />
<Select defaultValue="">
  <option value="">Selecione</option>
</Select>
<Textarea placeholder="Observações..." />
```

- Fundo branco
- Borda cinza clara
- Focus ring em `brand` com contraste acessível

## Badge

```tsx
import { Badge } from "@/components/ui/badge";

<Badge tone="accent">Spark</Badge>
<Badge tone="neutral">Rascunho</Badge>
<Badge tone="success">Sucesso</Badge>
<Badge tone="warning">Atenção</Badge>
```

- `accent`: teal / trust
- `neutral`: cinza suave
- `success` / `warning` / `danger`: estados sem exagero visual
