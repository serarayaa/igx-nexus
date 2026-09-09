import { useEffect, useState } from "react";
import { Badge, Button, EmptyState, ErrorState, LoadingState, PageHeader } from "@igx-nexus/ui";
import type { Asset, InventoryProvider, InventorySnapshot } from "./asset-model";
import { demoProvider } from "./demo-provider";

type LoadState =
  | { status: "loading" }
  | { status: "error" }
  | { status: "ready"; snapshot: InventorySnapshot };

export function Asset360({
  assetId,
  provider = demoProvider,
}: {
  assetId: string;
  provider?: InventoryProvider;
}) {
  const [state, setState] = useState<LoadState>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setState({ status: "loading" });

    Promise.resolve()
      .then(() => {
        controller.signal.throwIfAborted();
        return provider(controller.signal);
      })
      .then((snapshot) => {
        if (!controller.signal.aborted) {
          setState({ status: "ready", snapshot });
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setState({ status: "error" });
        }
      });

    return () => controller.abort();
  }, [provider, attempt, assetId]);

  if (state.status === "loading") {
    return (
      <LoadingState
        title="Cargando detalle del activo"
        description="Preparando la ficha Asset 360 de demostración."
      />
    );
  }

  if (state.status === "error") {
    return (
      <ErrorState
        title="No se pudo cargar el activo"
        description="Vuelve a intentar. No se mostrarán detalles técnicos del error."
        action={<Button onPress={() => setAttempt((value) => value + 1)}>Reintentar</Button>}
      />
    );
  }

  if (state.snapshot.assets.length === 0) {
    return (
      <EmptyState
        title="El inventario está vacío"
        description="No hay activos disponibles en este escenario de demostración."
        action={<a href="#assets">Volver al inventario</a>}
      />
    );
  }

  const asset: Asset | undefined = state.snapshot.assets.find((candidate) => candidate.id === assetId);

  if (!asset) {
    return (
      <EmptyState
        title="Activo no encontrado"
        description={`No existe un activo con el identificador ${assetId} en este inventario.`}
        action={<a href="#assets">Volver al inventario</a>}
      />
    );
  }

  return (
    <div className="nexus-asset-360">
      <nav aria-label="Breadcrumb">
        <ol>
          <li><a href="#overview">Panel principal</a></li>
          <li><a href="#assets">Activos</a></li>
          <li aria-current="page">{asset.name}</li>
        </ol>
      </nav>

      <PageHeader
        title={asset.name}
        eyebrow="ASSET 360 · INNERGEX CHILE"
        description={`Identidad NEXUS ${asset.id}`}
        meta={<Badge>{asset.domain}</Badge>}
      />

      <p>
        Esta ficha utiliza exclusivamente el dataset sintético del provider demo.
        No representa sincronización real con GLPI, Intune, Entra ni Defender.
      </p>
    </div>
  );
}
