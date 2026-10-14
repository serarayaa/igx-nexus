import { Badge, Button, ErrorState, LoadingState } from "@igx-nexus/ui";
import { softwareErrorMessages, type SoftwareReader } from "./software-client";
import { useSoftware } from "./use-software";
import { SoftwareInventory } from "./SoftwareInventory";
import "./software-experience.css";
function LiveSoftware({ assetId, reader }: { assetId: string; reader?: SoftwareReader }) {
  const { state, retry } = useSoftware(assetId, reader);
  if (state.status === "loading") return <LoadingState title="Cargando sistema y software" description="Consultando instalaciones observadas mediante NEXUS API." />;
  if (state.status === "error") {
    const error = softwareErrorMessages[state.kind];
    return <ErrorState title={error.title} description={error.detail} {...(error.retry ? { action: <Button onPress={retry}>Reintentar sistema y software</Button> } : {})} />;
  }
  return <SoftwareInventory key={state.inventory.assetId} inventory={state.inventory} />;
}
export function SoftwareExperience({ assetId, mode, reader }: { assetId: string; mode: "live" | "demo"; reader?: SoftwareReader }) {
  return <section className="nexus-asset-panel nexus-software" aria-labelledby="software-heading"><header className="nexus-software-heading"><div><span className="nexus-software-kicker">ASSET 360 · ENTORNO TÉCNICO</span><h2 id="software-heading" data-asset-section-heading="software">Sistema y software</h2><p>Sistemas operativos e instalaciones de software dentro de la cobertura disponible.</p></div><Badge>Software / OS V2</Badge></header>
    {mode === "demo" ? <div className="nexus-software-message"><h3>Sistema y software disponible en Live</h3><p>Esta ficha Demo no consulta inventario corporativo. Se requiere una fuente Live configurada y acceso NEXUS autorizado.</p></div> : <LiveSoftware key={assetId} assetId={assetId} {...(reader ? { reader } : {})} />}
  </section>;
}
