# Clone — [JIC] Mapa de Alocação

Clone standalone da landing page <https://lp.brunoom.com/jic_mapaalocacao/>.

O site original é uma página WordPress/Elementor cujo conteúdo é uma única
ferramenta HTML/CSS/JS ("Mapa de Alocação"). Este clone reproduz a ferramenta
sem WordPress, sem Elementor e sem os scripts de otimização/rastreamento.

## Estrutura

```
jic-mapaalocacao/
├── index.html          # página completa
├── assets/
│   ├── style.css       # fontes + estilos da ferramenta
│   ├── app.js          # lógica dos 4 passos, cálculo e resultado
│   ├── fonts/          # Anton e Inter (woff2 + woff)
│   └── img/            # favicons
├── _source/
│   └── original.html   # snapshot original (referência local, não publicado)
└── README.md
```

## Publicação

Site publicado no GitHub Pages:

<https://tenentedoexercitodeproplayersemjogos.github.io/jic-mapaalocacao/>

O deploy é feito a partir da branch `main` (raiz do repositório), com
`.nojekyll` para servir os arquivos estáticos sem processamento do Jekyll.

## Deploy no Cloudflare Pages (via GitHub)

O repositório também está pronto para o Cloudflare Pages:

- **Production branch:** `main`
- **Build command:** `bash cloudflare-build.sh`
- **Build output directory:** `dist`
- **Root directory:** deixar vazio

O script `cloudflare-build.sh` gera `dist/` com `index.html`, `assets/` e
`_headers`, sem publicar README, `.gitignore` ou arquivos de desenvolvimento.

## Deploy no Cloudflare Workers (via GitHub)

O Cloudflare atualmente recomenda Workers para projetos novos. O repositório
já tem `wrangler.jsonc` apontando para `dist/`:

- **Production branch:** `main`
- **Build command:** `bash cloudflare-build.sh`
- **Deploy command:** `npx wrangler deploy`
- **Root directory:** deixar vazio
- **Nome do Worker:** `jic-mapaalocacao` (igual ao `name` do `wrangler.jsonc`)

O build gera `dist/`; o Wrangler publica os arquivos estáticos. Requests para
arquivos estáticos são gratuitos e ilimitados no plano free.

## Como rodar

```bash
cd jic-mapaalocacao
python3 -m http.server 8000
```

Abra <http://localhost:8000>. Também funciona abrindo `index.html` direto no
navegador, mas um servidor local evita restrições de fonte/clipboard.

## O que foi preservado

- Layout, cores, tipografia e textos originais.
- Os 4 passos (reserva, momento, carteira, concentração) e o resultado.
- Cálculos de desvio, nível de concentração, alertas e plano dos 6 aportes.
- Tarja de exclusividade da JIC.
- Botão "Copiar meu resultado".
- CTA para `https://bit.ly/SDI_formraiox`.
- Fontes e favicons servidos localmente.

## O que foi removido/adaptado

- WordPress, Elementor, WP Rocket e todos os scripts de terceiros.
- Telemetria para o Supabase do site original (`SUPABASE_URL`/`SUPABASE_KEY`
  vazios em `assets/app.js`; a função `track()` virou no-op).
- `disable-devtool`, bloqueio de clique direito/arrastar e rastreador de UTMs.
- Contador de prazo e a frase "Uso gratuito encerra em..." removidos: a
  ferramenta agora tem uso ilimitado, sem expiração.

## Personalização rápida

- **Texto da tarja:** `index.html`, bloco `.tarja-jic`.
- **Link do CTA:** `index.html`, href do botão `.btn`.
- **Cores/tamanhos:** variáveis no topo de `assets/style.css` (`#mapa-alocacao`).

## Observação

O conteúdo é material educacional do site original. Este clone é apenas uma
cópia técnica para estudo/desenvolvimento; marcas, textos e identidade visual
pertencem aos seus respectivos donos.
