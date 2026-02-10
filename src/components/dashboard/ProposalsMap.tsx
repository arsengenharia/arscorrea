import { useMemo, useState, useEffect } from "react";
import { APIProvider, Map, AdvancedMarker, InfoWindow, useMap } from "@vis.gl/react-google-maps";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
// Checkbox removido visualmente em favor de botões estilo "Chip" para design mais limpo
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { MapPin, Flame, Filter, Layers } from "lucide-react";
import { useGeocoding, type ProposalLocation } from "@/hooks/use-geocoding";
import { cn } from "@/lib/utils"; // Assumindo que você tem o utilitário cn, caso não, use string template padrão

const GOOGLE_MAPS_API_KEY = "AIzaSyBEZQ3dPHqho8u6nfKSVWlAVIXzG7Yawck";

// Belo Horizonte center coordinates
const BELO_HORIZONTE_CENTER = { lat: -19.9167, lng: -43.9345 };
const DEFAULT_ZOOM = 12;

// Stage definitions with colors
const STAGES = [
  { key: "proposta em aberto (inicial)", name: "Proposta em aberto (inicial)", color: "#3B82F6" },
  { key: "visita agendada", name: "Visita agendada", color: "#6366F1" },
  { key: "visita realizada", name: "Visita realizada", color: "#A855F7" },
  { key: "proposta enviada", name: "Proposta enviada", color: "#06B6D4" },
  { key: "reunião marcada para entrega", name: "Reunião marcada para entrega", color: "#F59E0B" },
  { key: "proposta em aberto", name: "Proposta em aberto", color: "#0EA5E9" },
  { key: "proposta recusada", name: "Proposta recusada", color: "#EF4444" },
  { key: "proposta aprovada", name: "Proposta aprovada", color: "#22C55E" },
] as const;

const STAGE_COLORS: Record<string, string> = Object.fromEntries(STAGES.map((s) => [s.key, s.color]));

const DEFAULT_COLOR = "#6B7280";

function getStageColor(stageName: string | undefined): string {
  if (!stageName) return DEFAULT_COLOR;
  const normalized = stageName.toLowerCase().trim();
  return STAGE_COLORS[normalized] || DEFAULT_COLOR;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

interface ProposalsMapProps {
  data: ProposalLocation[];
  isLoading: boolean;
}

interface MapContentProps {
  proposals: ProposalLocation[];
  showHeatmap: boolean;
}

// Heatmap component using Google Maps visualization library
function HeatmapLayer({ proposals }: { proposals: ProposalLocation[] }) {
  const map = useMap();

  useEffect(() => {
    if (!map || proposals.length === 0) return;

    // Load the visualization library
    const loadHeatmap = async () => {
      // @ts-ignore - google.maps.visualization might not be typed
      if (!google.maps.visualization) {
        await google.maps.importLibrary("visualization");
      }

      const heatmapData = proposals
        .filter((p) => p.lat !== undefined && p.lng !== undefined)
        .map((p) => ({
          location: new google.maps.LatLng(p.lat!, p.lng!),
          weight: (p.total || 10000) / 10000, // Weight by proposal value
        }));

      // @ts-ignore
      const heatmap = new google.maps.visualization.HeatmapLayer({
        data: heatmapData,
        map: map,
        radius: 50,
        opacity: 0.7,
        gradient: [
          "rgba(0, 255, 255, 0)",
          "rgba(0, 255, 255, 1)",
          "rgba(0, 191, 255, 1)",
          "rgba(0, 127, 255, 1)",
          "rgba(0, 63, 255, 1)",
          "rgba(0, 0, 255, 1)",
          "rgba(0, 0, 223, 1)",
          "rgba(0, 0, 191, 1)",
          "rgba(0, 0, 159, 1)",
          "rgba(0, 0, 127, 1)",
          "rgba(63, 0, 91, 1)",
          "rgba(127, 0, 63, 1)",
          "rgba(191, 0, 31, 1)",
          "rgba(255, 0, 0, 1)",
        ],
      });

      return () => {
        heatmap.setMap(null);
      };
    };

    const cleanup = loadHeatmap();

    return () => {
      cleanup.then((fn) => fn?.());
    };
  }, [map, proposals]);

  return null;
}

function MapContent({ proposals, showHeatmap }: MapContentProps) {
  const [hoveredProposal, setHoveredProposal] = useState<ProposalLocation | null>(null);

  const proposalsWithCoords = useMemo(
    () => proposals.filter((p) => p.lat !== undefined && p.lng !== undefined),
    [proposals],
  );

  const center = BELO_HORIZONTE_CENTER;

  return (
    <Map
      defaultCenter={center}
      defaultZoom={DEFAULT_ZOOM}
      mapId="proposals-map"
      gestureHandling="greedy"
      disableDefaultUI={false}
      className="w-full h-full rounded-lg"
    >
      {showHeatmap && <HeatmapLayer proposals={proposalsWithCoords} />}

      {!showHeatmap &&
        proposalsWithCoords.map((proposal) => (
          <AdvancedMarker
            key={proposal.id}
            position={{ lat: proposal.lat!, lng: proposal.lng! }}
            onMouseEnter={() => setHoveredProposal(proposal)}
            onMouseLeave={() => setHoveredProposal(null)}
          >
            <div className="relative group cursor-pointer">
              {/* Pulse animation ring */}
              <div
                className="absolute inset-0 w-10 h-10 rounded-full opacity-30 animate-ping"
                style={{ backgroundColor: getStageColor(proposal.stageName) }}
              />
              {/* Main pin */}
              <div
                className="relative w-10 h-10 rounded-full border-3 border-white shadow-xl flex items-center justify-center transition-all duration-200 group-hover:scale-125 group-hover:shadow-2xl"
                style={{
                  backgroundColor: getStageColor(proposal.stageName),
                  boxShadow: `0 4px 14px -2px ${getStageColor(proposal.stageName)}80, 0 2px 6px -1px rgba(0,0,0,0.3)`,
                }}
              >
                <MapPin className="w-5 h-5 text-white drop-shadow-sm" />
              </div>
              {/* Bottom pointer */}
              <div
                className="absolute left-1/2 -translate-x-1/2 -bottom-1 w-0 h-0 border-l-[6px] border-r-[6px] border-t-[8px] border-l-transparent border-r-transparent"
                style={{ borderTopColor: getStageColor(proposal.stageName) }}
              />
            </div>
          </AdvancedMarker>
        ))}

      {!showHeatmap && hoveredProposal && hoveredProposal.lat && hoveredProposal.lng && (
        <InfoWindow
          position={{ lat: hoveredProposal.lat, lng: hoveredProposal.lng }}
          pixelOffset={[0, -30]}
          headerDisabled
        >
          <div className="p-2 min-w-[200px]">
            <div className="font-semibold text-gray-900 mb-1">{hoveredProposal.number || "Sem número"}</div>
            <div className="text-sm text-gray-600 space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-medium">Cliente:</span>
                <span>{hoveredProposal.clientName || "-"}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-medium">Valor:</span>
                <span>{formatCurrency(hoveredProposal.total || 0)}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-medium">Status:</span>
                <span
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium text-white"
                  style={{ backgroundColor: getStageColor(hoveredProposal.stageName) }}
                >
                  {hoveredProposal.stageName || "Sem status"}
                </span>
              </div>
              {hoveredProposal.address && (
                <div className="text-xs text-gray-500 mt-1 pt-1 border-t">{hoveredProposal.address}</div>
              )}
            </div>
          </div>
        </InfoWindow>
      )}
    </Map>
  );
}

interface MapFiltersProps {
  selectedStages: Set<string>;
  onStageToggle: (stageKey: string) => void;
  showHeatmap: boolean;
  onHeatmapToggle: (checked: boolean) => void;
}

function MapFilters({ selectedStages, onStageToggle, showHeatmap, onHeatmapToggle }: MapFiltersProps) {
  return (
    <div className="flex flex-col gap-4 mb-4">
      {/* Top Bar: Title/Context + View Toggle */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <Filter className="h-4 w-4" />
          <span>Filtrar etapas ativas</span>
        </div>

        {/* Heatmap Toggle with cleaner styling */}
        <div className="flex items-center gap-3 bg-slate-50 px-3 py-1.5 rounded-full border border-slate-100">
          <Label
            htmlFor="heatmap-toggle"
            className={`text-xs font-medium cursor-pointer transition-colors ${showHeatmap ? "text-slate-400" : "text-slate-700"}`}
          >
            Pinos
          </Label>
          <Switch
            id="heatmap-toggle"
            checked={showHeatmap}
            onCheckedChange={onHeatmapToggle}
            className="scale-75 data-[state=checked]:bg-orange-500"
          />
          <Label
            htmlFor="heatmap-toggle"
            className={`flex items-center gap-1 text-xs font-medium cursor-pointer transition-colors ${showHeatmap ? "text-orange-600" : "text-slate-400"}`}
          >
            <Flame className="h-3 w-3" />
            Mapa de Calor
          </Label>
        </div>
      </div>

      {/* Chips/Pills Container - Substitui os Checkboxes tradicionais */}
      <div className="flex flex-wrap gap-2">
        {STAGES.map((stage) => {
          const isSelected = selectedStages.has(stage.key);
          return (
            <button
              key={stage.key}
              onClick={() => onStageToggle(stage.key)}
              className={`
                group relative flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 border
                ${
                  isSelected ? "bg-white shadow-sm" : "bg-slate-50 border-transparent text-slate-400 hover:bg-slate-100"
                }
              `}
              style={{
                borderColor: isSelected ? stage.color : "transparent",
                color: isSelected ? "#334155" : "", // Slate-700 when active
              }}
            >
              {/* Dot Indicator */}
              <span
                className={`w-2 h-2 rounded-full transition-all ${isSelected ? "scale-100" : "scale-75 opacity-50 grayscale"}`}
                style={{ backgroundColor: stage.color }}
              />
              {stage.name}

              {/* Check icon placeholder removed for cleaner look, relying on color/border state */}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function MapLegend({ showHeatmap }: { showHeatmap: boolean }) {
  if (showHeatmap) {
    return (
      <div className="flex flex-col items-center gap-2 mt-4 pt-4 border-t border-slate-50">
        <div className="flex items-center justify-between w-full max-w-xs text-xs text-slate-400 font-medium uppercase tracking-wide">
          <span>Menor Volume</span>
          <span>Maior Volume</span>
        </div>
        <div className="h-2 w-full max-w-xs rounded-full bg-gradient-to-r from-cyan-400 via-blue-600 to-red-500 shadow-inner opacity-80" />
      </div>
    );
  }

  // Grid Layout for cleaner legend
  return (
    <div className="mt-4 pt-4 border-t border-slate-50">
      <div className="flex items-center gap-2 mb-3 text-xs text-slate-400 font-medium uppercase tracking-wider">
        <Layers className="h-3 w-3" />
        Legenda
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-2">
        {STAGES.map((stage) => (
          <div key={stage.name} className="flex items-center gap-2">
            <div
              className="w-2.5 h-2.5 rounded-full shadow-sm flex-shrink-0"
              style={{ backgroundColor: stage.color }}
            />
            <span className="text-xs text-slate-600 truncate">{stage.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ProposalsMap({ data, isLoading }: ProposalsMapProps) {
  const { geocodedProposals, isGeocoding, progress } = useGeocoding(data);

  // Filter state - all stages selected by default
  const [selectedStages, setSelectedStages] = useState<Set<string>>(new Set(STAGES.map((s) => s.key)));

  // Heatmap toggle state
  const [showHeatmap, setShowHeatmap] = useState(false);

  const handleStageToggle = (stageKey: string) => {
    setSelectedStages((prev) => {
      const next = new Set(prev);
      if (next.has(stageKey)) {
        next.delete(stageKey);
      } else {
        next.add(stageKey);
      }
      return next;
    });
  };

  // Filter proposals by selected stages
  const filteredProposals = useMemo(() => {
    return geocodedProposals.filter((p) => {
      const stageName = p.stageName?.toLowerCase().trim() || "";
      return selectedStages.has(stageName) || (!stageName && selectedStages.size === STAGES.length);
    });
  }, [geocodedProposals, selectedStages]);

  const geocodedCount = filteredProposals.filter((p) => p.lat !== undefined && p.lng !== undefined).length;

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-medium flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Mapa de Propostas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="w-full h-[400px] rounded-lg" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-sm border-slate-100">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-blue-50 rounded-lg">
              <MapPin className="h-5 w-5 text-blue-500" />
            </div>
            <CardTitle className="text-lg font-medium text-slate-700">Mapa de Propostas</CardTitle>
          </div>
          <div className="text-sm text-slate-500 bg-slate-50 px-3 py-1 rounded-full border border-slate-100">
            {isGeocoding ? (
              <span className="animate-pulse">
                Carregando... ({progress.geocoded}/{progress.total})
              </span>
            ) : (
              <span>
                <span className="font-semibold text-slate-700">{geocodedCount}</span> de {data.length} visíveis
              </span>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <MapFilters
          selectedStages={selectedStages}
          onStageToggle={handleStageToggle}
          showHeatmap={showHeatmap}
          onHeatmapToggle={setShowHeatmap}
        />
        <div className="w-full h-[450px] rounded-xl overflow-hidden border border-slate-100 shadow-inner relative">
          <APIProvider apiKey={GOOGLE_MAPS_API_KEY}>
            <MapContent proposals={filteredProposals} showHeatmap={showHeatmap} />
          </APIProvider>
        </div>
        <MapLegend showHeatmap={showHeatmap} />
      </CardContent>
    </Card>
  );
}
