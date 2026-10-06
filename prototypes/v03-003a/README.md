# V03-003A · isolated experience laboratory

No production entrypoint imports these files. No new dependencies, sources or backend. All entities, sites, software versions and relationships are synthetic concept fixtures.

From repository root (existing dependencies installed):

```powershell
node node_modules/vite/bin/vite.js --host 127.0.0.1 --port 3023 --strictPort
```

Open http://127.0.0.1:3023/prototypes/v03-003a/ .

Choose Global / IT Universe / OT Universe. IT→Software opens a FUTURE concept; OT→Site Demo A opens logical Facility concept. Map exposes shared topology; select node→Asset360→return. Selection and root have independent actions. Use2.5D or2D/semantic; toggle theme/density.

Journeys are explicit: choose Recorrido IT/OT, then press Siguiente paso four times. Global→domain→endpoint orsite→map orPLC→Asset360. No autoplay. Native URL helpers are imported from unchanged V03-008 source. Software and Facility scene are transient presentation, not new production routes. Refresh and Back/Forward restore canonical investigation, not every concept view.

Capture/checks (server3023 running):

```powershell
node prototypes/v03-003a/capture.mjs
```

Standalone synthetic renderer benchmark (serves only benchmark on3024; no Vite required):

```powershell
node prototypes/v03-003a/benchmark.mjs
```

Do not run capture and benchmark concurrently. Results are renderer microbenchmarks without labels/layout/picking or React, no proof of corporate/mobile hardware performance.

Review: ../../docs/product/evidence/v03-003a/review.md .
