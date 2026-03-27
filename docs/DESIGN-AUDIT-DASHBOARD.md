# Design Audit: ARS Correa Dashboard

> Comprehensive inventory of all visual patterns extracted from the dashboard components.
> Date: 2026-03-26

---

## 1. Page Layout (Index.tsx)

```
Container:     w-full max-w-7xl mx-auto pb-8 space-y-6
Header:        text-3xl font-bold ("Dashboard")
Tab bar:       grid w-full max-w-lg grid-cols-3
Tab content:   space-y-6 mt-6
Chart grids:   grid grid-cols-1 lg:grid-cols-2 gap-6  (Commercial)
               grid grid-cols-1 lg:grid-cols-3 gap-6  (Financial, Projects)
```

Section spacing between all top-level elements: `space-y-6` (1.5rem / 24px).

---

## 2. KPI Cards

### 2A. Pattern "Commercial" (CommercialKPIs.tsx) -- CANONICAL

This is the most refined and consistent KPI pattern, also reused by ProjectsKPIs.

| Property | Value |
|---|---|
| Component | `<Card>` with `hover:shadow-md transition-shadow` |
| Inner | `<CardContent className="p-4">` |
| Grid | `grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4` (5 cards) |
| Icon wrapper | `p-1.5 rounded-md ${bgColor}` (square with rounded corners) |
| Icon size | `h-4 w-4` |
| Label | `text-xs text-muted-foreground font-medium` |
| Value | `text-xl font-bold text-foreground` |
| Layout | Icon + label in a `flex items-center gap-2 mb-2` row, then value below |

Color assignments:
```
blue-600   / bg-blue-50     -- FileText    (Propostas em Aberto)
emerald-600 / bg-emerald-50 -- TrendingUp  (Propostas no Periodo)
amber-600  / bg-amber-50    -- DollarSign  (Valor Total em Aberto)
purple-600 / bg-purple-50   -- Target      (Taxa de Conversao)
rose-600   / bg-rose-50     -- Receipt     (Ticket Medio)
```

### 2B. Pattern "Projects" (ProjectsKPIs.tsx) -- IDENTICAL to Commercial

Same structure as Commercial KPIs. Only differences:

| Property | Value |
|---|---|
| Grid | `grid-cols-2 md:grid-cols-4 gap-4` (4 cards) |
| Colors | blue-600/blue-50, red-600/red-50, green-600/green-50, orange-600/orange-50 |

### 2C. Pattern "Financial v1" (FinancialKPIs.tsx) -- DIFFERENT LAYOUT

| Property | Value |
|---|---|
| Component | `<Card className="bg-white">` |
| Inner | `<CardContent className="p-4">` |
| Grid | `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4` (6 cards) |
| Icon wrapper | `p-2 rounded-full ${bgColor}` (**circle**, not square) |
| Icon size | `h-5 w-5` (larger than Commercial) |
| Label | `text-sm font-medium text-muted-foreground` (larger than Commercial) |
| Value | `text-2xl font-bold mt-1` (larger than Commercial) |
| Subtitle | `text-xs text-muted-foreground mt-1` |
| Layout | Title + value on left, icon floated to top-right (`flex items-start justify-between`) |

Color assignments (note: uses `-100` bg instead of `-50`):
```
blue-600   / bg-blue-100    -- DollarSign     (Valores em Aberto)
green-600  / bg-green-100   -- TrendingUp     (Recebido no Periodo)
purple-600 / bg-purple-100  -- Clock          (Previsao 30 dias)
red-600    / bg-red-100     -- AlertTriangle  (Parcelas Vencidas)
amber-600  / bg-amber-100   -- Percent        (Comissao Prevista)
emerald-600/ bg-emerald-100 -- Percent        (Comissao Recebida)
```

### 2D. Pattern "Financial v2" (FinancialKPIsV2.tsx) -- SHADCN DEFAULT

| Property | Value |
|---|---|
| Component | `<Card>` (no extra classes) |
| Header | `<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">` |
| Title | `<CardTitle className="text-sm font-medium">` |
| Icon | `h-4 w-4 ${color}` -- NO background wrapper, icon sits alone top-right |
| Value | `text-2xl font-bold ${color}` -- value is colored (dynamic) |
| Subtitle | `text-xs text-muted-foreground mt-1` |
| Grid | `gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6` (6 cards) |

This uses the standard shadcn CardHeader/CardContent split pattern.

### INCONSISTENCIES FOUND IN KPI CARDS

| Issue | Commercial/Projects | Financial v1 | Financial v2 |
|---|---|---|---|
| Icon background shape | `rounded-md` (square) | `rounded-full` (circle) | none |
| Icon size | `h-4 w-4` | `h-5 w-5` | `h-4 w-4` |
| Bg intensity | `-50` | `-100` | none |
| Value size | `text-xl` | `text-2xl` | `text-2xl` |
| Label size | `text-xs` | `text-sm` | `text-sm` |
| Card hover | `hover:shadow-md transition-shadow` | none | none |
| Value color | `text-foreground` (static) | `text-foreground` (static) | dynamic per-card |
| Layout | icon-left, stacked | icon-right, stacked | icon-right (shadcn) |

---

## 3. Chart Card Container

### 3A. "Refined" Pattern (ProposalsFunnel, ProposalsAging) -- BEST QUALITY

```tsx
<Card className="shadow-sm border-slate-100">
  <CardHeader className="pb-2">
    <div className="flex items-center gap-2">
      <div className="p-2 bg-blue-50 rounded-lg">
        <Icon className="h-5 w-5 text-blue-500" />
      </div>
      <CardTitle className="text-lg font-medium text-slate-700">Title</CardTitle>
    </div>
  </CardHeader>
  <CardContent>
    <ResponsiveContainer width="100%" height={320}>
      ...
    </ResponsiveContainer>
  </CardContent>
</Card>
```

Key traits:
- Card: `shadow-sm border-slate-100`
- Icon: wrapped in `p-2 bg-blue-50 rounded-lg` background
- Title: `text-lg font-medium text-slate-700`
- Empty state: `h-[300px] flex items-center justify-center text-slate-400 bg-slate-50/50 rounded-xl border border-dashed border-slate-200`

### 3B. "Basic" Pattern (CashFlow, OverdueAging, RevenueCost, ProfitMargin, Tables)

```tsx
<Card>
  <CardHeader className="pb-2">
    <div className="flex items-center gap-2">
      <Icon className="h-5 w-5 text-muted-foreground" />
      <CardTitle className="text-lg font-medium">Title</CardTitle>
    </div>
  </CardHeader>
  <CardContent>
    ...
  </CardContent>
</Card>
```

Key traits:
- Card: no extra classes (default border + shadow)
- Icon: NO background wrapper, just `h-5 w-5 text-muted-foreground`
- Title: `text-lg font-medium` (no explicit color)
- Empty state: inconsistent (some use `text-muted-foreground`, others use `text-slate-400`)

### 3C. "Table Enhanced" Pattern (OldestProposalsTable)

```tsx
<Card className="shadow-none border border-slate-100 bg-white">
  <CardHeader className="pb-4 pt-6 px-6">
    <div className="flex items-center gap-3">       <!-- gap-3, not gap-2 -->
      <div className="p-2 bg-red-50 rounded-xl">    <!-- rounded-xl, not rounded-lg -->
        <AlertCircle className="h-5 w-5 text-red-400" />
      </div>
      <div>
        <CardTitle className="text-base font-semibold text-slate-800">Title</CardTitle>
        <p className="text-xs text-slate-400 mt-1">Subtitle</p>
      </div>
    </div>
  </CardHeader>
```

Unique: has subtitle under the card title, uses `shadow-none`, `rounded-xl` on icon bg.

### INCONSISTENCIES FOUND IN CHART CONTAINERS

| Property | Refined (Funnel/Aging) | Basic (Cash/Overdue/etc.) | OldestProposals |
|---|---|---|---|
| Card shadow | `shadow-sm` | default | `shadow-none` |
| Card border | `border-slate-100` | default | `border border-slate-100` |
| Icon bg | `p-2 bg-blue-50 rounded-lg` | none | `p-2 bg-red-50 rounded-xl` |
| Icon color | `text-blue-500` | `text-muted-foreground` | `text-red-400` |
| Title color | `text-slate-700` | inherit | `text-slate-800` |
| Title weight | `font-medium` | `font-medium` | `font-semibold` |
| Gap | `gap-2` | `gap-2` | `gap-3` |

---

## 4. Recharts Configuration

### 4A. CartesianGrid

Two patterns in use:

```tsx
// Pattern A: Explicit color (Refined charts)
<CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />

// Pattern B: CSS class (Basic charts)
<CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
```

`strokeDasharray="3 3"` is consistent across ALL charts.
`vertical={false}` is only used in ProposalsAgingChart.

### 4B. Axis Styling

Consistent across all charts:
```tsx
<XAxis
  dataKey="..."
  fontSize={12}
  tickLine={false}
  axisLine={false}
  tick={{ fill: "#64748B" }}  // Only in Refined charts; Basic charts omit fill
/>
<YAxis
  fontSize={12}
  tickLine={false}
  axisLine={false}
  tickFormatter={formatCurrency}  // When applicable
/>
```

### 4C. Tooltip Styling

**Pattern A -- Refined (ProposalsFunnel, ProposalsAging, RevenueCost, ProfitMargin)**
```tsx
// Custom content renderer with glassmorphism:
<div className="bg-white/95 backdrop-blur-sm p-3 border border-slate-100 shadow-xl rounded-xl text-sm">
  <div className="font-semibold text-slate-700 mb-1">{title}</div>
  // Color dot + value rows
</div>
```

**Pattern B -- Basic (CashFlow, OverdueAging)**
```tsx
// Recharts built-in tooltip with contentStyle:
<Tooltip
  formatter={(value: number) => formatCurrency(value)}
  labelStyle={{ color: "hsl(var(--foreground))" }}
  contentStyle={{
    backgroundColor: "hsl(var(--background))",
    border: "1px solid hsl(var(--border))",
    borderRadius: "8px"
  }}
/>
```

### 4D. Legend

```tsx
// Pattern A -- Bottom (ProposalsFunnel donut)
<Legend verticalAlign="bottom" height={36} iconType="circle" iconSize={8}
  formatter={(value) => <span className="text-slate-500 text-xs ml-1">{value}</span>}
/>

// Pattern B -- Top (ProposalsAging stacked bar)
<Legend verticalAlign="top" height={40} iconType="circle" iconSize={8}
  wrapperStyle={{ paddingBottom: "20px" }}
  formatter={(value) => <span className="text-slate-500 text-xs font-medium ml-1">{value}</span>}
/>

// Pattern C -- Default (CashFlow, RevenueCost)
<Legend />   // No customization
```

### 4E. ResponsiveContainer Heights

| Chart | Height |
|---|---|
| ProposalsFunnel (Donut) | `320` |
| ProposalsAgingChart (Stacked Bar) | `320` |
| CashFlowChart (Area) | `300` |
| OverdueAgingChart (Bar) | `300` |
| RevenueCostChart (Bar) | `300` |
| ProfitMarginChart (Horizontal Bar) | `Math.max(300, data.length * 40)` (dynamic) |

### 4F. Bar Styling

```tsx
// Rounded top corners (standard vertical bars):
radius={[4, 4, 0, 0]}

// Rounded right corners (horizontal bar - ProfitMargin):
radius={[0, 4, 4, 0]}

// Fully rounded (stacked bar "pills" - ProposalsAging):
radius={[4, 4, 4, 4]}
stroke="#fff" strokeWidth={2}   // White separator between stacks
style={{ filter: "url(#barShadow)" }}
```

### 4G. Area Chart Gradients (CashFlowChart)

```tsx
<linearGradient id="colorPrevisto" x1="0" y1="0" x2="0" y2="1">
  <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3} />
  <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
</linearGradient>
<linearGradient id="colorRecebido" x1="0" y1="0" x2="0" y2="1">
  <stop offset="5%" stopColor="#22C55E" stopOpacity={0.3} />
  <stop offset="95%" stopColor="#22C55E" stopOpacity={0} />
</linearGradient>

<Area stroke="#3B82F6" strokeWidth={2} fill="url(#colorPrevisto)" />
<Area stroke="#22C55E" strokeWidth={2} fill="url(#colorRecebido)" />
```

### 4H. Donut Chart Config (ProposalsFunnel)

```tsx
<Pie
  innerRadius={60}
  outerRadius={90}
  paddingAngle={4}
  cornerRadius={6}
  stroke="none"
/>
// Active state: scale(1.05) + shadow filter + white stroke
```

---

## 5. Color Palette -- Complete Inventory

### 5A. Chart Stage Colors (Commercial tab -- shared by Funnel and Aging)

```
#93C5FD  -- Soft Blue       (Proposta em aberto inicial)
#A5B4FC  -- Soft Indigo     (Visita agendada)
#C084FC  -- Soft Purple     (Visita realizada)
#67E8F9  -- Soft Cyan       (Proposta enviada)
#FCD34D  -- Soft Amber      (Reuniao marcada para entrega)
#38BDF8  -- Sky Blue        (Proposta em aberto)
#FCA5A5  -- Soft Red        (Proposta recusada)
#86EFAC  -- Soft Green      (Proposta aprovada)
#CBD5E1  -- Soft Slate      (Sem etapa / fallback)
```

### 5B. Overdue Aging Colors (Heat scale, green to red)

```
#22C55E  -- Green-500       (0-7 dias)
#F59E0B  -- Amber-500       (8-15 dias)
#F97316  -- Orange-500      (16-30 dias)
#EF4444  -- Red-500         (31-60 dias)
#DC2626  -- Red-600         (60+ dias)
```

### 5C. CashFlow Chart Colors

```
#3B82F6  -- Blue-500        (Previsto)
#22C55E  -- Green-500       (Recebido)
```

### 5D. RevenueCost Chart Colors (with gradients)

```
#93C5FD  -- Blue-300        (Receita -- gradient top to 0.6 opacity)
#FCA5A5  -- Red-300         (Custo -- gradient top to 0.6 opacity)
```

### 5E. ProfitMargin Chart Colors (conditional)

```
#86EFAC  -- Green-300       (margem >= 0)
#FCA5A5  -- Red-300         (margem < 0)
```

### 5F. KPI Icon Colors (Tailwind classes)

```
text-blue-600      (most common primary)
text-emerald-600   (positive/growth)
text-green-600     (positive)
text-amber-600     (warning/pending)
text-purple-600    (forecast/conversion)
text-rose-600      (ticket medio)
text-red-600       (critical/negative)
text-orange-600    (cost)
```

### 5G. UI Surface Colors

```
text-muted-foreground       -- Labels, secondary text
text-foreground             -- Primary values
text-slate-700              -- Chart card titles (Refined)
text-slate-500              -- Legend text, axis ticks (#64748B)
text-slate-400              -- Placeholders, subtitles
bg-slate-50                 -- Tooltip cursor highlight (#F1F5F9)
border-slate-100            -- Card borders (Refined)
stroke: #E2E8F0             -- CartesianGrid (Refined) = slate-200
```

---

## 6. Tables

### 6A. Component Library

All tables use Shadcn UI `<Table>`, `<TableHeader>`, `<TableBody>`, `<TableRow>`, `<TableHead>`, `<TableCell>`.

### 6B. CriticalProjectsTable (Standard)

| Property | Value |
|---|---|
| Header | Default shadcn styling |
| Row hover | `cursor-pointer hover:bg-muted/50 transition-colors` |
| Row click | Navigates to `/obras/{id}/relatorio` |
| Badge | `variant="destructive"` for >30 days, custom `bg-amber-50 text-amber-700` for <=30 |
| Cell: name | `font-medium` |

### 6C. NextPaymentsTable (Standard)

| Property | Value |
|---|---|
| Header | Default shadcn styling |
| Row hover | Default (no custom hover) |
| Cell: contract | `font-medium` |
| Cell: client/desc | `max-w-[150px] truncate` |
| Cell: saldo | `text-right font-medium text-amber-600` |
| Wrapper | `overflow-x-auto` for horizontal scroll |

### 6D. OldestProposalsTable (Enhanced -- Heat Map)

| Property | Value |
|---|---|
| Header row | `hover:bg-transparent border-none` |
| Header text | `text-xs font-semibold text-slate-400 uppercase tracking-wider` |
| Row styling | Dynamic color based on `daysOpen` (heat map gradient) |
| Row corners | `rounded-lg border` with inline `boxShadow: "0 1px 2px rgba(0,0,0,0.02)"` |
| Badge | Custom colored per aging bracket, `variant="outline"` with `border-0 font-semibold shadow-none backdrop-blur-sm` |
| Cell: value | `font-semibold opacity-90` |

Heat map color scale (rows):
```
0-3 days:   bg-emerald-50   hover:bg-emerald-100   text-emerald-900
4-6 days:   bg-lime-50      hover:bg-lime-100      text-lime-900
7-9 days:   bg-yellow-50    hover:bg-yellow-100     text-yellow-900
10-12 days: bg-amber-50     hover:bg-amber-100      text-amber-900
13-15 days: bg-orange-50    hover:bg-orange-100      text-orange-900
16-18 days: bg-red-50       hover:bg-red-100         text-red-900
19+ days:   bg-rose-100     hover:bg-rose-200        text-rose-950 font-medium
```

---

## 7. Grid Spanning

Charts that span multiple columns in `lg:grid-cols-3` grids:

| Component | Span |
|---|---|
| CashFlowChart | `col-span-1 lg:col-span-2` |
| RevenueCostChart | `lg:col-span-2` |
| ProfitMarginChart | `col-span-1` (default) |
| OverdueAgingChart | `col-span-1` (default) |

In `lg:grid-cols-2` grids (Commercial tab):
- ProposalsFunnel and ProposalsAging are each `col-span-1`.

---

## 8. Loading States

| Component Type | Skeleton Pattern |
|---|---|
| KPI Cards (Commercial/Projects) | `<Skeleton className="h-4 w-24 mb-2" />` + `<Skeleton className="h-8 w-20" />` |
| KPI Cards (Financial v2) | `<div className="h-8 bg-muted rounded animate-pulse" />` (custom, not Skeleton) |
| Charts (Refined) | `<Skeleton className="h-[300px] w-full rounded-xl" />` |
| Charts (Basic) | `<Skeleton className="h-[300px] w-full" />` (no rounded-xl) |
| Tables (Standard) | `<Skeleton className="h-48 w-full" />` or `<Skeleton className="h-10 w-full" />` x5 |
| Tables (OldestProposals) | `<Skeleton className="h-12 w-full rounded-lg" />` x5 |

---

## 9. Empty States

| Component | Pattern |
|---|---|
| ProposalsFunnel | Centered text in `h-[300px] bg-slate-50/50 rounded-xl border border-dashed border-slate-200` |
| ProposalsAging | Same as Funnel |
| OldestProposals | Icon + text in `h-[200px] bg-slate-50/50 rounded-xl border border-dashed border-slate-200` |
| NextPayments | `text-center py-8 text-muted-foreground` (minimal) |
| CriticalProjects | `h-48 flex items-center justify-center text-muted-foreground text-sm` |
| ProfitMargin | `h-[300px] flex items-center justify-center text-muted-foreground text-sm` |
| CashFlow | `h-[300px] flex items-center justify-center text-muted-foreground` |

---

## 10. Recommended Canonical Patterns (for Design System)

Based on the audit, these are the highest-quality patterns that should be standardized:

### KPI Card -- Use Commercial Pattern
- Icon: `p-1.5 rounded-md bg-{color}-50` with `h-4 w-4 text-{color}-600`
- Label: `text-xs text-muted-foreground font-medium`
- Value: `text-xl font-bold text-foreground`
- Card: `hover:shadow-md transition-shadow`
- Inner: `<CardContent className="p-4">`

### Chart Container -- Use Refined Pattern
- Card: `shadow-sm border-slate-100`
- Icon: `p-2 bg-{color}-50 rounded-lg` with `h-5 w-5 text-{color}-500`
- Title: `text-lg font-medium text-slate-700`
- Empty: `h-[300px] bg-slate-50/50 rounded-xl border border-dashed border-slate-200`

### Recharts Base Config
- CartesianGrid: `strokeDasharray="3 3" vertical={false} stroke="#E2E8F0"`
- Axes: `fontSize={12} tickLine={false} axisLine={false} tick={{ fill: "#64748B" }}`
- Tooltip: Custom glassmorphism `bg-white/95 backdrop-blur-sm p-3 border border-slate-100 shadow-xl rounded-xl`
- Legend: `iconType="circle" iconSize={8}` with `text-slate-500 text-xs`
- Bar radius: `[4, 4, 0, 0]` (vertical), `[0, 4, 4, 0]` (horizontal)
- ResponsiveContainer height: `300` (standard), `320` (with legend)

### Table
- Use Shadcn Table components
- Row hover: `hover:bg-muted/50 transition-colors`
- Clickable rows: add `cursor-pointer`
- Enhanced header: `text-xs font-semibold text-slate-400 uppercase tracking-wider`
