export type DocLink = {
  label: string;
  href: string;
};

export type DocField = {
  name: string;
  description: string;
};

export type DocSection = {
  id: string;
  title: string;
  body?: string;
  bullets?: string[];
  tips?: string[];
  fields?: DocField[];
  links?: DocLink[];
  variant?: "default" | "tip" | "warning";
  defaultOpen?: boolean;
};

export type DocContent = {
  id: string;
  title: string;
  routePath?: string;
  intro?: string;
  sections: DocSection[];
};
