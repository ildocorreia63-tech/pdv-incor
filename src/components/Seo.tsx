import { Helmet } from "react-helmet-async";

const SITE_URL = "https://pdv1980burguer.lovable.app";

export interface SeoProps {
  /** Título da página — manter abaixo de 60 caracteres. */
  title: string;
  /** Meta description — manter entre 50 e 160 caracteres. */
  description: string;
  /** Caminho da rota, ex.: "/cardapio". Usado em canonical e og:url. */
  path: string;
  /** Impede indexação de rotas internas/privadas. */
  noindex?: boolean;
  /** Bloco JSON-LD opcional (schema.org). */
  jsonLd?: Record<string, unknown>;
}

/**
 * Metadados por rota. Substitui as tags estáticas de index.html para
 * crawlers que executam JavaScript (Googlebot). Redes sociais que não
 * executam JS continuam lendo o fallback do index.html.
 */
export const Seo = ({ title, description, path, noindex, jsonLd }: SeoProps) => {
  const url = `${SITE_URL}${path}`;

  return (
    <Helmet>
      <title>{title}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={url} />
      {noindex ? <meta name="robots" content="noindex, nofollow" /> : null}
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={url} />
      <meta property="og:type" content="website" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      {jsonLd ? (
        <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
      ) : null}
    </Helmet>
  );
};
