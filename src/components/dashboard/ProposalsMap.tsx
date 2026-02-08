import { useMemo, useState } from "react";
import { APIProvider, Map, AdvancedMarker, InfoWindow } from "@vis.gl/react-google-maps";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { MapPin } from "lucide-react";
import { useGeocoding, type ProposalLocation } from "@/hooks/use-geocoding";

const GOOGLE_MAPS_API_KEY = "AIzaSyBEZQ3dPHqho8u6nfKSVWlAVIXzG7Yawck";

// Belo Horizonte center coordinates
const BELO_HORIZONTE_CENTER = { lat: -19.9167, lng: -43.9345 };
const DEFAULT_ZOOM = 12;

// Stage colors
const STAGE_COLORS: Record<string, string> = {
  "em aberto": "#3B82F6", // Blue
  "em análise": "#F59E0B", // Yellow/Amber
  "fechada": "#22C55E", // Green
  "perdida": "#EF4444", // Red
};

const DEFAULT_COLOR = "#6B7280"; // Gray

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

function MapContent({ proposals }: { proposals: ProposalLocation[] }) {
  const [hoveredProposal, setHoveredProposal] = useState<ProposalLocation | null>(null);

  const proposalsWithCoords = useMemo(
    () => proposals.filter((p) => p.lat !== undefined && p.lng !== undefined),
    [proposals]
  );

  // Sempre centralizar em Belo Horizonte
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
      {proposalsWithCoords.map((proposal) => (
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
                boxShadow: `0 4px 14px -2px ${getStageColor(proposal.stageName)}80, 0 2px 6px -1px rgba(0,0,0,0.3)`
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

      {hoveredProposal && hoveredProposal.lat && hoveredProposal.lng && (
        <InfoWindow
          position={{ lat: hoveredProposal.lat, lng: hoveredProposal.lng }}
          pixelOffset={[0, -30]}
          headerDisabled
        >
          <div className="p-2 min-w-[200px]">
            <div className="font-semibold text-gray-900 mb-1">
              {hoveredProposal.number || "Sem número"}
            </div>
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
                <div className="text-xs text-gray-500 mt-1 pt-1 border-t">
                  {hoveredProposal.address}
                </div>
              )}
            </div>
          </div>
        </InfoWindow>
      )}
    </Map>
  );
}

function MapLegend() {
  const stages = [
    { name: "Em aberto", color: STAGE_COLORS["em aberto"] },
    { name: "Em análise", color: STAGE_COLORS["em análise"] },
    { name: "Fechada", color: STAGE_COLORS["fechada"] },
    { name: "Perdida", color: STAGE_COLORS["perdida"] },
  ];

  return (
    <div className="flex flex-wrap gap-4 mt-3 justify-center">
      {stages.map((stage) => (
        <div key={stage.name} className="flex items-center gap-1.5">
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: stage.color }}
          />
          <span className="text-xs text-muted-foreground">{stage.name}</span>
        </div>
      ))}
    </div>
  );
}

export function ProposalsMap({ data, isLoading }: ProposalsMapProps) {
  const { geocodedProposals, isGeocoding, progress } = useGeocoding(data);

  const geocodedCount = geocodedProposals.filter(
    (p) => p.lat !== undefined && p.lng !== undefined
  ).length;

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
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-medium flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Mapa de Propostas
          </CardTitle>
          <div className="text-sm text-muted-foreground">
            {isGeocoding ? (
              <span>Carregando localizações... ({progress.geocoded}/{progress.total})</span>
            ) : (
              <span>{geocodedCount} de {data.length} propostas mapeadas</span>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="w-full h-[400px] rounded-lg overflow-hidden border">
          <APIProvider apiKey={GOOGLE_MAPS_API_KEY}>
            <MapContent proposals={geocodedProposals} />
          </APIProvider>
        </div>
        <MapLegend />
      </CardContent>
    </Card>
  );
}
